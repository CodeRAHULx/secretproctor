import { useState, useRef, useCallback } from 'react';
import { api } from '../services/api';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' }
  ]
};

export function useWebRTC(currentRoomId, tabClientId, localStreamRef) {
  const [remoteStreams, setRemoteStreams] = useState({});
  const peerConnections = useRef(new Map()); // peerId -> RTCPeerConnection
  const candidateQueues = useRef(new Map()); // peerId -> ICE candidate[]

  const removeRemoteStream = useCallback((peerId) => {
    setRemoteStreams((prev) => {
      if (!(peerId in prev)) return prev;
      const copy = { ...prev };
      delete copy[peerId];
      return copy;
    });
  }, []);

  const createPeerConnection = useCallback((remotePeerId, isInitiator) => {
    // Close any existing stale connection to this peer
    if (peerConnections.current.has(remotePeerId)) {
      try { peerConnections.current.get(remotePeerId).close(); } catch {}
      peerConnections.current.delete(remotePeerId);
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnections.current.set(remotePeerId, pc);
    candidateQueues.current.set(remotePeerId, []);

    // Add all local tracks (audio + video)
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Send ICE candidates to remote peer via signaling server
    pc.onicecandidate = (event) => {
      if (event.candidate && currentRoomId.current) {
        api.sendSignal({
          roomId: currentRoomId.current,
          signal: {
            from: tabClientId,
            to: remotePeerId,
            type: 'ice-candidate',
            data: event.candidate
          }
        }).catch(() => {});
      }
    };

    // Receive remote tracks
    pc.ontrack = (event) => {
      const stream = event.streams[0] || new MediaStream([event.track]);
      setRemoteStreams((prev) => ({ ...prev, [remotePeerId]: stream }));
    };

    // Handle disconnection
    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        removeRemoteStream(remotePeerId);
      }
    };

    // Initiator sends the offer; responder waits for an offer
    if (isInitiator) {
      pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          api.sendSignal({
            roomId: currentRoomId.current,
            signal: {
              from: tabClientId,
              to: remotePeerId,
              type: 'offer',
              data: pc.localDescription
            }
          }).catch(() => {});
        })
        .catch(() => {});
    }

    return pc;
  }, [currentRoomId, tabClientId, localStreamRef, removeRemoteStream]);

  const handleIncomingSignal = useCallback(async (signal) => {
    const { from, type, data } = signal;
    if (!from || from === tabClientId) return;

    if (type === 'offer') {
      // Create a PC in responder mode
      const pc = createPeerConnection(from, false);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data));

        // Flush any queued ICE candidates
        const queue = candidateQueues.current.get(from) || [];
        for (const cand of queue) {
          try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch {}
        }
        candidateQueues.current.set(from, []);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await api.sendSignal({
          roomId: currentRoomId.current,
          signal: { from: tabClientId, to: from, type: 'answer', data: answer }
        });
      } catch (err) {
        console.warn('[WebRTC] offer handling failed', err);
      }

    } else if (type === 'answer') {
      const pc = peerConnections.current.get(from);
      if (pc && pc.signalingState !== 'stable') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data));
          const queue = candidateQueues.current.get(from) || [];
          for (const cand of queue) {
            try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch {}
          }
          candidateQueues.current.set(from, []);
        } catch (err) {
          console.warn('[WebRTC] answer handling failed', err);
        }
      }

    } else if (type === 'ice-candidate') {
      const pc = peerConnections.current.get(from);
      if (pc && pc.remoteDescription) {
        try { await pc.addIceCandidate(new RTCIceCandidate(data)); } catch {}
      } else {
        // Queue until remote description is set
        const queue = candidateQueues.current.get(from) || [];
        queue.push(data);
        candidateQueues.current.set(from, queue);
      }
    }
  }, [createPeerConnection, currentRoomId, tabClientId]);

  const closeAllConnections = useCallback(() => {
    peerConnections.current.forEach((pc) => {
      try { pc.close(); } catch {}
    });
    peerConnections.current.clear();
    candidateQueues.current.clear();
    setRemoteStreams({});
  }, []);

  return {
    remoteStreams,
    peerConnections,
    createPeerConnection,
    handleIncomingSignal,
    closeAllConnections,
    removeRemoteStream
  };
}
