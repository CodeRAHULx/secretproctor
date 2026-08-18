import { useState, useRef, useCallback } from 'react';
import { api } from '../services/api';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // TURN servers for restrictive NAT/firewall environments
    // TODO: Replace with your own TURN server credentials
    // Free TURN servers (replace in production):
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ]
};

export function useWebRTC(currentRoomId, clientId, localStreamRef) {
  const [remoteStreams, setRemoteStreams] = useState({});
  const peerConnections = useRef(new Map()); // peerId -> RTCPeerConnection
  const candidateQueues = useRef(new Map()); // peerId -> RTCIceCandidate[]

  const removeRemoteStream = useCallback((peerId) => {
    setRemoteStreams((prev) => {
      if (!(peerId in prev)) return prev;
      const copy = { ...prev };
      delete copy[peerId];
      return copy;
    });
  }, []);

  const closePeerConnection = useCallback((peerId) => {
    if (peerConnections.current.has(peerId)) {
      try {
        peerConnections.current.get(peerId).close();
      } catch {}
      peerConnections.current.delete(peerId);
    }
    candidateQueues.current.delete(peerId);
    removeRemoteStream(peerId);
  }, [removeRemoteStream]);

  const createPeerConnection = useCallback((remotePeerId, isInitiator = false) => {
    if (!remotePeerId || remotePeerId === clientId) return null;

    console.log('[WebRTC] Creating peer connection to', remotePeerId, 'isInitiator:', isInitiator);

    // If existing active connection, close and recreate cleanly
    if (peerConnections.current.has(remotePeerId)) {
      console.log('[WebRTC] Closing existing connection to', remotePeerId);
      try {
        peerConnections.current.get(remotePeerId).close();
      } catch {}
      peerConnections.current.delete(remotePeerId);
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnections.current.set(remotePeerId, pc);
    candidateQueues.current.set(remotePeerId, []);

    // 1. Add all active local media tracks (Audio + Video)
    if (localStreamRef.current) {
      const tracks = localStreamRef.current.getTracks();
      console.log('[WebRTC] Adding', tracks.length, 'local tracks to peer connection:', tracks.map(t => `${t.kind} (${t.label})`).join(', '));
      tracks.forEach((track) => {
        try {
          pc.addTrack(track, localStreamRef.current);
        } catch (err) {
          console.error('[WebRTC] Failed to add track:', err);
        }
      });
    } else {
      console.warn('[WebRTC] No local stream available to add tracks');
    }

    // 2. Handle ICE Candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && currentRoomId.current) {
        console.log('[WebRTC] Sending ICE candidate to', remotePeerId);
        api.sendSignal({
          roomId: currentRoomId.current,
          signal: {
            from: clientId,
            to: remotePeerId,
            type: 'ice-candidate',
            data: event.candidate
          }
        }).catch((err) => {
          console.error('[WebRTC] Failed to send ICE candidate:', err);
        });
      }
    };

    // 3. Receive Remote MediaStream
    pc.ontrack = (event) => {
      console.log('[WebRTC] Received track from', remotePeerId, 'kind:', event.track.kind, 'readyState:', event.track.readyState);

      // Use the stream provided by the browser or create a new one
      let stream = event.streams[0];
      if (!stream) {
        stream = new MediaStream([event.track]);
      }

      setRemoteStreams((prev) => {
        // Always create a NEW MediaStream object to trigger React re-renders
        // This is critical when tracks are replaced (camera -> screen)
        const existingStream = prev[remotePeerId];

        if (existingStream && event.track.kind === 'video') {
          // Video track replaced - create new stream with new video + existing audio
          const audioTracks = existingStream.getAudioTracks();
          const newStream = new MediaStream([event.track, ...audioTracks]);
          console.log('[WebRTC] Video track replaced for', remotePeerId);
          return { ...prev, [remotePeerId]: newStream };
        } else if (existingStream && event.track.kind === 'audio') {
          // Audio track added/replaced - create new stream with new audio + existing video
          const videoTracks = existingStream.getVideoTracks();
          const newStream = new MediaStream([...videoTracks, event.track]);
          console.log('[WebRTC] Audio track replaced for', remotePeerId);
          return { ...prev, [remotePeerId]: newStream };
        } else {
          // First track or no existing stream
          console.log('[WebRTC] Initial track for', remotePeerId);
          return { ...prev, [remotePeerId]: stream };
        }
      });
    };

    // 4. Handle Connection State Changes
    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state for', remotePeerId, ':', pc.connectionState);
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        console.warn('[WebRTC] Removing remote stream for', remotePeerId, 'due to connection state:', pc.connectionState);
        removeRemoteStream(remotePeerId);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE connection state for', remotePeerId, ':', pc.iceConnectionState);
    };

    pc.onsignalingstatechange = () => {
      console.log('[WebRTC] Signaling state for', remotePeerId, ':', pc.signalingState);
    };

    // 5. If Initiator, create & send SDP Offer
    if (isInitiator) {
      console.log('[WebRTC] Creating offer for', remotePeerId);
      pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
        .then((offer) => {
          console.log('[WebRTC] Setting local description for', remotePeerId);
          return pc.setLocalDescription(offer);
        })
        .then(() => {
          if (currentRoomId.current) {
            console.log('[WebRTC] Sending offer to', remotePeerId);
            api.sendSignal({
              roomId: currentRoomId.current,
              signal: {
                from: clientId,
                to: remotePeerId,
                type: 'offer',
                data: pc.localDescription
              }
            }).catch((err) => {
              console.error('[WebRTC] Failed to send offer:', err);
            });
          }
        })
        .catch((err) => {
          console.error('[WebRTC] Create offer failed for', remotePeerId, ':', err);
        });
    }

    return pc;
  }, [currentRoomId, clientId, localStreamRef, removeRemoteStream]);

  const handleIncomingSignal = useCallback(async (signal) => {
    const { from, type, data } = signal || {};
    if (!from || from === clientId) return;

    console.log('[WebRTC] Received signal from', from, 'type:', type);

    if (type === 'offer') {
      console.log('[WebRTC] Processing offer from', from);
      // Create responder peer connection
      const pc = createPeerConnection(from, false);
      if (!pc) return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data));
        console.log('[WebRTC] Remote description set for', from);

        // Flush any queued ICE candidates for this peer
        const queue = candidateQueues.current.get(from) || [];
        console.log('[WebRTC] Flushing', queue.length, 'queued ICE candidates for', from);
        for (const cand of queue) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch (err) {
            console.error('[WebRTC] Failed to add queued ICE candidate:', err);
          }
        }
        candidateQueues.current.set(from, []);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log('[WebRTC] Sending answer to', from);

        if (currentRoomId.current) {
          await api.sendSignal({
            roomId: currentRoomId.current,
            signal: {
              from: clientId,
              to: from,
              type: 'answer',
              data: answer
            }
          });
        }
      } catch (err) {
        console.error('[WebRTC] Error handling incoming offer from', from, ':', err);
      }
    } else if (type === 'answer') {
      console.log('[WebRTC] Processing answer from', from);
      const pc = peerConnections.current.get(from);
      if (pc && pc.signalingState !== 'stable') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data));
          console.log('[WebRTC] Answer processed for', from);

          // Flush queued candidates
          const queue = candidateQueues.current.get(from) || [];
          console.log('[WebRTC] Flushing', queue.length, 'queued ICE candidates for', from);
          for (const cand of queue) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (err) {
              console.error('[WebRTC] Failed to add queued ICE candidate:', err);
            }
          }
          candidateQueues.current.set(from, []);
        } catch (err) {
          console.error('[WebRTC] Error handling incoming answer from', from, ':', err);
        }
      } else {
        console.warn('[WebRTC] Received answer but connection not in correct state. State:', pc?.signalingState);
      }
    } else if (type === 'ice-candidate') {
      const pc = peerConnections.current.get(from);
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data));
          console.log('[WebRTC] ICE candidate added for', from);
        } catch (err) {
          console.error('[WebRTC] Failed to add ICE candidate:', err);
        }
      } else {
        const queue = candidateQueues.current.get(from) || [];
        queue.push(data);
        candidateQueues.current.set(from, queue);
        console.log('[WebRTC] ICE candidate queued for', from, 'Queue size:', queue.length);
      }
    }
  }, [createPeerConnection, currentRoomId, clientId]);

  /**
   * Seamlessly hot-swap video tracks (camera <-> screen share) across all active peer connections
   */
  const replaceVideoTrack = useCallback(async (newTrack) => {
    console.log('[WebRTC] Replacing video track across', peerConnections.current.size, 'peer connections');
    console.log('[WebRTC] New track:', newTrack ? `${newTrack.kind} (${newTrack.label})` : 'null');

    const promises = [];
    peerConnections.current.forEach((pc, peerId) => {
      try {
        const senders = pc.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === 'video');

        if (videoSender) {
          console.log('[WebRTC] Replacing video track for peer:', peerId);
          promises.push(
            videoSender.replaceTrack(newTrack).then(() => {
              console.log('[WebRTC] Successfully replaced video track for peer:', peerId);
            }).catch((err) => {
              console.error('[WebRTC] Failed to replace track for peer:', peerId, err);
            })
          );
        } else {
          console.warn('[WebRTC] No video sender found for peer:', peerId);
        }
      } catch (err) {
        console.error('[WebRTC] Error accessing senders for peer:', peerId, err);
      }
    });

    await Promise.all(promises);
    console.log('[WebRTC] Video track replacement complete');
  }, []);

  const closeAllConnections = useCallback(() => {
    peerConnections.current.forEach((pc) => {
      try {
        pc.close();
      } catch {}
    });
    peerConnections.current.clear();
    candidateQueues.current.clear();
    setRemoteStreams({});
  }, []);

  return {
    remoteStreams,
    peerConnections,
    createPeerConnection,
    closePeerConnection,
    handleIncomingSignal,
    replaceVideoTrack,
    closeAllConnections,
    removeRemoteStream
  };
}
