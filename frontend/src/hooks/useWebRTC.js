import { useState, useRef, useCallback } from 'react';
import { api } from '../services/api';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
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

    // If existing active connection, close and recreate cleanly
    if (peerConnections.current.has(remotePeerId)) {
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
      localStreamRef.current.getTracks().forEach((track) => {
        try {
          pc.addTrack(track, localStreamRef.current);
        } catch {}
      });
    }

    // 2. Handle ICE Candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && currentRoomId.current) {
        api.sendSignal({
          roomId: currentRoomId.current,
          signal: {
            from: clientId,
            to: remotePeerId,
            type: 'ice-candidate',
            data: event.candidate
          }
        }).catch(() => {});
      }
    };

    // 3. Receive Remote MediaStream
    pc.ontrack = (event) => {
      const stream = event.streams[0] || new MediaStream([event.track]);
      setRemoteStreams((prev) => ({
        ...prev,
        [remotePeerId]: stream
      }));
    };

    // 4. Handle Disconnection State Changes
    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        removeRemoteStream(remotePeerId);
      }
    };

    // 5. If Initiator, create & send SDP Offer
    if (isInitiator) {
      pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          if (currentRoomId.current) {
            api.sendSignal({
              roomId: currentRoomId.current,
              signal: {
                from: clientId,
                to: remotePeerId,
                type: 'offer',
                data: pc.localDescription
              }
            }).catch(() => {});
          }
        })
        .catch((err) => {
          console.warn('[WebRTC] Create offer failed:', err);
        });
    }

    return pc;
  }, [currentRoomId, clientId, localStreamRef, removeRemoteStream]);

  const handleIncomingSignal = useCallback(async (signal) => {
    const { from, type, data } = signal || {};
    if (!from || from === clientId) return;

    if (type === 'offer') {
      // Create responder peer connection
      const pc = createPeerConnection(from, false);
      if (!pc) return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data));

        // Flush any queued ICE candidates for this peer
        const queue = candidateQueues.current.get(from) || [];
        for (const cand of queue) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch {}
        }
        candidateQueues.current.set(from, []);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

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
        console.warn('[WebRTC] Error handling incoming offer:', err);
      }
    } else if (type === 'answer') {
      const pc = peerConnections.current.get(from);
      if (pc && pc.signalingState !== 'stable') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data));

          // Flush queued candidates
          const queue = candidateQueues.current.get(from) || [];
          for (const cand of queue) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch {}
          }
          candidateQueues.current.set(from, []);
        } catch (err) {
          console.warn('[WebRTC] Error handling incoming answer:', err);
        }
      }
    } else if (type === 'ice-candidate') {
      const pc = peerConnections.current.get(from);
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data));
        } catch {}
      } else {
        const queue = candidateQueues.current.get(from) || [];
        queue.push(data);
        candidateQueues.current.set(from, queue);
      }
    }
  }, [createPeerConnection, currentRoomId, clientId]);

  /**
   * Seamlessly hot-swap video tracks (camera <-> screen share) across all active peer connections
   */
  const replaceVideoTrack = useCallback(async (newTrack) => {
    peerConnections.current.forEach((pc) => {
      try {
        const senders = pc.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === 'video') || senders.find((s) => !s.track);
        if (videoSender) {
          videoSender.replaceTrack(newTrack).catch(() => {});
        }
      } catch {}
    });
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
