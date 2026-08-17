import { useState, useRef, useCallback } from 'react';
import { api } from '../services/api';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

export function useWebRTC(currentRoomId, tabClientId, localStreamRef) {
  const [remoteStreams, setRemoteStreams] = useState({});
  const peerConnections = useRef(new Map()); // peerId -> RTCPeerConnection
  const candidateQueues = useRef(new Map()); // peerId -> Array of ICE candidates

  const createPeerConnection = useCallback((remotePeerId, isInitiator) => {
    if (peerConnections.current.has(remotePeerId)) {
      try {
        peerConnections.current.get(remotePeerId).close();
      } catch {}
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnections.current.set(remotePeerId, pc);
    candidateQueues.current.set(remotePeerId, []);

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Exchange ICE Candidates
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

    // Track remote streams
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0] || new MediaStream([event.track]);
      setRemoteStreams((prev) => ({
        ...prev,
        [remotePeerId]: remoteStream
      }));
    };

    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        setRemoteStreams((prev) => {
          const copy = { ...prev };
          delete copy[remotePeerId];
          return copy;
        });
      }
    };

    // If initiator, send SDP offer
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
  }, [currentRoomId, tabClientId, localStreamRef]);

  const handleIncomingSignal = useCallback(async (signal) => {
    const { from, type, data } = signal;
    if (!from || from === tabClientId) return;

    if (type === 'offer') {
      const pc = createPeerConnection(from, false);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data));
        const queue = candidateQueues.current.get(from) || [];
        for (const cand of queue) {
          try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch {}
        }
        candidateQueues.current.set(from, []);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await api.sendSignal({
          roomId: currentRoomId.current,
          signal: {
            from: tabClientId,
            to: from,
            type: 'answer',
            data: answer
          }
        });
      } catch {}
    } else if (type === 'answer') {
      const pc = peerConnections.current.get(from);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data));
          const queue = candidateQueues.current.get(from) || [];
          for (const cand of queue) {
            try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch {}
          }
          candidateQueues.current.set(from, []);
        } catch {}
      }
    } else if (type === 'ice-candidate') {
      const pc = peerConnections.current.get(from);
      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data));
        } catch {}
      } else {
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
    closeAllConnections
  };
}
