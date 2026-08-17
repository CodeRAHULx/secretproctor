import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { api } from '../services/api';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

const initialChecks = [
  ['Display affinity', 'Clean', 'ok'],
  ['Tab focus', 'Focused', 'ok'],
  ['Clipboard', 'Normal', 'ok']
];

const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export function useMeeting() {
  const [identity, setIdentity] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  
  // Multi-participant Room & Signaling State
  const [waitingForAdmission, setWaitingForAdmission] = useState(false);
  const [deniedAdmission, setDeniedAdmission] = useState(false);
  const [knockRequests, setKnockRequests] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [messages, setMessages] = useState([]);
  
  // Proctor & Media State
  const [threats, setThreats] = useState([]);
  const [checks, setChecks] = useState(initialChecks);
  const [logs, setLogs] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const [media, setMedia] = useState({ mic: true, cam: true, share: false });
  const [stream, setStream] = useState(null);

  // Unique tab ID for every open tab or window
  const tabClientId = useRef(`tab_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`).current;
  const localStreamRef = useRef(null);
  const peerConnections = useRef(new Map()); // peerId -> RTCPeerConnection
  const candidateQueues = useRef(new Map()); // peerId -> Array of ICE candidates
  const currentRoomId = useRef('');
  const roomSseRef = useRef(null);
  const threatKey = useRef('');
  const initialRoomChecked = useRef(false);

  const addLog = (message, level = 'system') => {
    setLogs(old => [...old, { id: crypto.randomUUID(), at: now(), message, level }]);
  };

  const trust = threats.length ? 35 : 100;
  
  const initials = useMemo(() => {
    const name = identity?.name || session?.participantName || '?';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }, [identity, session]);

  // Check authenticated Google identity on load
  useEffect(() => {
    let active = true;
    api.currentUser()
      .then(data => {
        if (active) {
          if (data.authenticated && data.user) {
            setIdentity(data.user);
          } else {
            setIdentity(null);
          }
        }
      })
      .catch(() => {
        if (active) setIdentity(null);
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });
    return () => { active = false; };
  }, []);

  // WebRTC Peer Connection Factory with ICE Candidate Buffering
  const createPeerConnection = useCallback((remotePeerId, isInitiator) => {
    if (peerConnections.current.has(remotePeerId)) {
      try {
        peerConnections.current.get(remotePeerId).close();
      } catch {}
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnections.current.set(remotePeerId, pc);
    candidateQueues.current.set(remotePeerId, []);

    // Add local media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Exchange ICE Candidates
    pc.onicecandidate = event => {
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

    // Receive Remote Media Stream
    pc.ontrack = event => {
      const remoteStream = event.streams[0] || new MediaStream([event.track]);
      setRemoteStreams(prev => ({
        ...prev,
        [remotePeerId]: remoteStream
      }));
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        setRemoteStreams(prev => {
          const copy = { ...prev };
          delete copy[remotePeerId];
          return copy;
        });
      }
    };

    // If initiator, create and send SDP Offer
    if (isInitiator) {
      pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
        .then(offer => pc.setLocalDescription(offer))
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
  }, [tabClientId]);

  // Handle incoming WebRTC signals
  const handleIncomingSignal = useCallback(async (signal) => {
    const { from, type, data } = signal;
    if (!from || from === tabClientId) return;

    if (type === 'offer') {
      const pc = createPeerConnection(from, false);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data));
        
        // Process any buffered ICE candidates
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
          // Process any buffered candidates
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
        // Buffer candidate until remote description is set
        const queue = candidateQueues.current.get(from) || [];
        queue.push(data);
        candidateQueues.current.set(from, queue);
      }
    }
  }, [createPeerConnection, tabClientId]);

  // Connect to Room SSE Stream
  const connectRoomEvents = useCallback((roomId, userId) => {
    if (roomSseRef.current) {
      roomSseRef.current.close();
    }

    const sse = new EventSource(`/api/room/events?roomId=${encodeURIComponent(roomId)}&userId=${encodeURIComponent(userId)}`);
    roomSseRef.current = sse;

    sse.onmessage = event => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'room_snapshot') {
          setParticipants(data.participants || []);
          setKnockRequests(data.knockQueue || []);
          setMessages(data.messages || []);
        } else if (data.type === 'knock_request') {
          setKnockRequests(data.knockQueue || []);
        } else if (data.type === 'knock_response') {
          if (data.guestId === userId) {
            if (data.status === 'admitted') {
              setWaitingForAdmission(false);
              joinByCode(roomId);
            } else if (data.status === 'denied') {
              setWaitingForAdmission(false);
              setDeniedAdmission(true);
            }
          }
        } else if (data.type === 'participant_joined') {
          setParticipants(data.participants || []);
          // Existing peers initiate WebRTC offer to the newly joined peer
          if (data.participant && data.participant.id !== userId) {
            addLog(`${data.participant.name} joined the call.`);
            createPeerConnection(data.participant.id, true);
          }
        } else if (data.type === 'participant_left') {
          setParticipants(data.participants || []);
          if (peerConnections.current.has(data.userId)) {
            peerConnections.current.get(data.userId).close();
            peerConnections.current.delete(data.userId);
          }
          setRemoteStreams(prev => {
            const copy = { ...prev };
            delete copy[data.userId];
            return copy;
          });
          addLog('A participant left the call.');
        } else if (data.type === 'webrtc_signal') {
          handleIncomingSignal(data.signal);
        } else if (data.type === 'chat_message') {
          setMessages(prev => [...prev, data.message]);
        }
      } catch {}
    };

    return sse;
  }, [createPeerConnection, handleIncomingSignal]);

  // Join or Start a Meeting by Code
  const joinByCode = async (code) => {
    if (!code || !code.trim()) return;
    setError('');
    setJoining(true);
    setDeniedAdmission(false);

    try {
      const cleanCode = code.trim().toLowerCase().replace(/^https?:\/\/[^\/]+\//, '').replace(/[^a-z0-9-]/g, '');
      currentRoomId.current = cleanCode;
      
      const userPayload = {
        id: tabClientId,
        name: identity?.name || 'Participant',
        email: identity?.email || '',
        picture: identity?.picture || ''
      };

      // Acquire Camera & Microphone
      let userStream = null;
      try {
        userStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = userStream;
        setStream(userStream);
      } catch {
        addLog('Camera or microphone permission not granted.', 'warn');
      }

      // Join Room
      const res = await api.joinRoom({ roomId: cleanCode, user: userPayload });

      if (res.status === 'waiting_for_host') {
        setWaitingForAdmission(true);
        connectRoomEvents(cleanCode, tabClientId);
        return;
      }

      if (res.status === 'denied') {
        setDeniedAdmission(true);
        return;
      }

      // Successfully Joined
      setWaitingForAdmission(false);
      setSession({
        sessionId: cleanCode,
        title: 'Live Video Meeting',
        role: res.role || 'candidate',
        participantName: userPayload.name,
        authProvider: identity ? `Google Account (${identity.email})` : 'Guest'
      });
      setElapsed(0);
      setLogs([]);
      setThreats([]);
      setChecks(initialChecks);
      addLog('Meeting joined. Proctoring watchdog active.');

      // Update URL
      if (window.history && window.history.pushState) {
        window.history.pushState({}, '', `/?room=${cleanCode}`);
      }

      // Connect SSE signaling stream
      connectRoomEvents(cleanCode, tabClientId);

    } catch (err) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  };

  const startInstantMeeting = async () => {
    setError('');
    setJoining(true);
    try {
      const created = await api.createMeeting({
        title: `${identity?.name || 'User'}'s Meeting`,
        candidateName: identity?.name || 'Participant'
      });
      await joinByCode(created.session.sessionId);
    } catch (err) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  };

  const createMeetingForLater = async () => {
    setError('');
    try {
      const created = await api.createMeeting({
        title: `${identity?.name || 'User'}'s Meeting`,
        candidateName: identity?.name || 'Participant'
      });
      return created.session.sessionId;
    } catch (err) {
      setError(err.message);
      return null;
    }
  };

  // Host Action: Admit or Deny a Knocking Guest
  const admitGuest = async (guestId, action = 'admit') => {
    try {
      await api.admitGuest({ roomId: currentRoomId.current, guestId, action });
      setKnockRequests(prev => prev.filter(k => k.id !== guestId));
    } catch {}
  };

  // In-Call Live Chat
  const sendChatMessage = async (text) => {
    if (!text || !text.trim() || !session) return;
    try {
      await api.sendChat({
        roomId: session.sessionId,
        message: {
          senderId: tabClientId,
          senderName: identity?.name || session.participantName || 'Me',
          senderPicture: identity?.picture || '',
          text: text.trim()
        }
      });
    } catch {}
  };

  // Leave Meeting
  const leaveMeeting = async () => {
    if (window.confirm('Leave this meeting?')) {
      if (currentRoomId.current) {
        api.leaveRoom({ roomId: currentRoomId.current, userId: tabClientId }).catch(() => {});
      }

      // Close all peer connections
      peerConnections.current.forEach(pc => {
        try { pc.close(); } catch {}
      });
      peerConnections.current.clear();
      candidateQueues.current.clear();
      setRemoteStreams({});

      // Close local streams
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
        setStream(null);
      }

      if (roomSseRef.current) {
        roomSseRef.current.close();
        roomSseRef.current = null;
      }

      setSession(null);
      setWaitingForAdmission(false);
      setDeniedAdmission(false);
      setKnockRequests([]);
      setParticipants([]);
      setMessages([]);

      if (window.history && window.history.pushState) {
        window.history.pushState({}, '', '/');
      }
    }
  };

  // Auto-join from URL parameter once identity loads
  useEffect(() => {
    if (!identity || initialRoomChecked.current || session) return;
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room') || params.get('code');
    if (roomParam) {
      initialRoomChecked.current = true;
      joinByCode(roomParam);
    }
  }, [identity, session]);

  // Background Proctor Watchdog Stream
  useEffect(() => {
    if (!session) return;
    const timer = setInterval(() => setElapsed(v => v + 1), 1000);
    const source = new EventSource('/api/telemetry/stream');

    source.onmessage = event => {
      try {
        const data = JSON.parse(event.data);
        const detected = data.threats || [];
        const key = detected.map(item => item.hwnd || item.pid).join(',');
        setThreats(detected);
        setChecks(old =>
          old.map((check, index) =>
            index === 0
              ? [check[0], data.hasThreat ? 'Detected' : 'Clean', data.hasThreat ? 'fail' : 'ok']
              : check
          )
        );
        if (key && key !== threatKey.current && detected[0]) {
          addLog(`Threat detected: ${detected[0].title || detected[0].path || 'Stealth window'}`, 'alert');
        }
        threatKey.current = key;
      } catch {}
    };

    return () => {
      clearInterval(timer);
      source.close();
    };
  }, [session]);

  // Tab focus & paste protection
  useEffect(() => {
    if (!session) return;
    const focus = () => {
      const lost = document.hidden;
      setChecks(old => old.map((check, i) => i === 1 ? [check[0], lost ? 'Lost' : 'Focused', lost ? 'fail' : 'ok'] : check));
      if (lost) addLog('Tab focus lost.', 'warn');
    };
    const paste = event => {
      const text = event.clipboardData?.getData('text') || '';
      if (text.length > 30) {
        setChecks(old => old.map((check, i) => i === 2 ? [check[0], 'Bulk paste', 'fail'] : check));
        addLog(`Large paste detected (${text.length} characters).`, 'warn');
      }
    };
    document.addEventListener('visibilitychange', focus);
    document.addEventListener('paste', paste);
    return () => {
      document.removeEventListener('visibilitychange', focus);
      document.removeEventListener('paste', paste);
    };
  }, [session]);

  const googleSignIn = async () => {
    try {
      const status = await api.googleStatus();
      if (status.enabled) window.location.assign('/api/auth/google');
      else setError('Google sign-in is not configured on this server.');
    } catch {
      setError('Google sign-in is currently unavailable.');
    }
  };

  const logout = async () => {
    try { await api.logout(); } catch {}
    setIdentity(null);
    setSession(null);
    window.location.href = '/';
  };

  const toggleMedia = kind => {
    if (!localStreamRef.current) return;
    const active = !media[kind];
    setMedia(old => ({ ...old, [kind]: active }));
    (kind === 'mic' ? localStreamRef.current.getAudioTracks() : localStreamRef.current.getVideoTracks()).forEach(t => {
      t.enabled = active;
    });
  };

  const toggleShare = async () => {
    if (media.share) {
      return setMedia(old => ({ ...old, share: false }));
    }
    try {
      const share = await navigator.mediaDevices.getDisplayMedia({ video: true });
      share.getVideoTracks()[0].onended = () => setMedia(old => ({ ...old, share: false }));
      setMedia(old => ({ ...old, share: true }));
      addLog('Screen sharing active.');
    } catch {}
  };

  const killActiveThreat = async (pid, hwnd) => {
    try {
      await api.killThreat({ pid, hwnd });
      setThreats(old => old.filter(t => t.pid !== pid));
      addLog(`Threat PID ${pid} terminated by host.`, 'system');
    } catch (err) {
      addLog(`Failed to terminate threat: ${err.message}`, 'warn');
    }
  };

  const exportAudit = async () => {
    if (!session) return;
    const payload = {
      sessionId: session.sessionId,
      participant: session.participantName,
      role: session.role,
      authProvider: session.authProvider,
      timestamp: new Date().toISOString(),
      finalTrustScore: `${trust}%`,
      activeThreatsDetected: threats,
      incidentLogs: logs,
      participantsCount: participants.length
    };
    await api.saveAudit(payload).catch(() => {});
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `securemeet-audit-${session.sessionId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addLog('Audit report exported.');
  };

  return {
    identity,
    authLoading,
    session,
    joining,
    error,
    setError,
    waitingForAdmission,
    deniedAdmission,
    knockRequests,
    participants,
    remoteStreams,
    messages,
    threats,
    checks,
    logs,
    setLogs,
    elapsed,
    media,
    stream,
    initials,
    trust,
    googleSignIn,
    logout,
    startInstantMeeting,
    createMeetingForLater,
    joinByCode,
    leaveMeeting,
    toggleMedia,
    toggleShare,
    admitGuest,
    sendChatMessage,
    killActiveThreat,
    exportAudit
  };
}
