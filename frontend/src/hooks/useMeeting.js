import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from './useAuth';
import { useMedia } from './useMedia';
import { useWebRTC } from './useWebRTC';
import { useChat } from './useChat';
import { useTelemetry } from './useTelemetry';
import { useAI, SUPPORTED_LANGUAGES } from './useAI';
import { generateBrowserFingerprint } from '../services/fingerprint';

export { SUPPORTED_LANGUAGES };

export function useMeeting() {
  const [session, setSession] = useState(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const [waitingForAdmission, setWaitingForAdmission] = useState(false);
  const [deniedAdmission, setDeniedAdmission] = useState(false);
  const [knockRequests, setKnockRequests] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [serverHostId, setServerHostId] = useState(null);
  const [screenShareOwner, setScreenShareOwner] = useState(null);

  // Stable per-tab client ID
  const tabClientId = useRef(
    `tab_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`
  ).current;

  const currentRoomId = useRef('');
  const roomSseRef = useRef(null);
  const sseConnected = useRef(false);
  const initialRoomChecked = useRef(false);

  const auth = useAuth();

  const [runtimeLogs, setRuntimeLogs] = useState([]);
  const addLog = useCallback((message, level = 'system') => {
    const timeStr = new Date().toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    setRuntimeLogs((old) => [...old, { id: crypto.randomUUID(), at: timeStr, message, level }]);
  }, []);

  const mediaHook = useMedia(addLog);
  const rtcHook = useWebRTC(currentRoomId, tabClientId, mediaHook.localStreamRef);
  const chatHook = useChat(currentRoomId, tabClientId, auth.identity);
  const telemetryHook = useTelemetry(session, addLog);
  const aiHook = useAI(session?.sessionId);

  const initials = useMemo(() => {
    const name = auth.identity?.name || session?.participantName || '?';
    return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  }, [auth.identity, session]);

  const isHost = useMemo(
    () => Boolean(serverHostId && serverHostId === tabClientId),
    [serverHostId, tabClientId]
  );

  // ─── Refs for stable access inside SSE closures ───────────────────────────
  const rtcHookRef = useRef(rtcHook);
  const chatHookRef = useRef(chatHook);
  const addLogRef = useRef(addLog);
  useEffect(() => { rtcHookRef.current = rtcHook; }, [rtcHook]);
  useEffect(() => { chatHookRef.current = chatHook; }, [chatHook]);
  useEffect(() => { addLogRef.current = addLog; }, [addLog]);

  // ─── Finalize join — set session state ───────────────────────────────────
  const finalizeJoin = useCallback((roomId, pendingSession) => {
    setSession(pendingSession);
    telemetryHook.setElapsed(0);
    addLog('Meeting joined. Proctoring active.', 'system');
    if (window.history?.pushState) {
      window.history.pushState({}, '', `/?room=${roomId}`);
    }
  }, [telemetryHook, addLog]);

  // Store in ref so SSE handler (knock_response) can call it without stale closure
  const finalizeJoinRef = useRef(finalizeJoin);
  useEffect(() => { finalizeJoinRef.current = finalizeJoin; }, [finalizeJoin]);

  // pendingSession ref is set right before SSE is opened
  const pendingSessionRef = useRef(null);

  // ─── SSE event dispatcher ─────────────────────────────────────────────────
  // Written with setState-updater-functions so it never depends on stale state
  const onSSEMessage = useCallback((rawData) => {
    let data;
    try { data = JSON.parse(rawData); } catch { return; }

    switch (data.type) {

      case 'room_snapshot': {
        setParticipants(data.participants || []);
        setKnockRequests((data.knockQueue || []).filter((k) => k.status === 'pending'));
        chatHookRef.current.setMessages(data.messages || []);
        setServerHostId(data.hostId || null);
        setScreenShareOwner(data.screenShareOwner || null);

        // NEW JOINER: send offer to every existing participant
        (data.participants || []).forEach((p) => {
          if (p.id !== tabClientId) {
            rtcHookRef.current.createPeerConnection(p.id, true);
          }
        });
        break;
      }

      case 'participant_joined': {
        setParticipants(data.participants || []);
        if (data.hostId) setServerHostId(data.hostId);
        const np = data.participant;
        if (!np || np.id === tabClientId) break;
        addLogRef.current(`${np.name} joined the call.`, 'info');
        // Existing participants: only create PC if we don't already have one.
        // The new joiner sends us an offer; we just need a connection ready to answer.
        if (!rtcHookRef.current.peerConnections.current.has(np.id)) {
          rtcHookRef.current.createPeerConnection(np.id, false);
        }
        break;
      }

      case 'participant_left': {
        const leftId = data.userId;
        setParticipants(data.participants || []);
        if (rtcHookRef.current.peerConnections.current.has(leftId)) {
          try { rtcHookRef.current.peerConnections.current.get(leftId).close(); } catch {}
          rtcHookRef.current.peerConnections.current.delete(leftId);
        }
        rtcHookRef.current.removeRemoteStream(leftId);
        setScreenShareOwner((prev) => (prev === leftId ? null : prev));
        addLogRef.current('A participant left the call.', 'info');
        break;
      }

      case 'host_changed': {
        setServerHostId(data.newHostId || null);
        setParticipants(data.participants || []);
        break;
      }

      case 'knock_request':
      case 'knock_queue_update': {
        setKnockRequests((data.knockQueue || []).filter((k) => k.status === 'pending'));
        break;
      }

      case 'knock_response': {
        if (data.guestId !== tabClientId) break;
        if (data.status === 'admitted') {
          setWaitingForAdmission(false);
          // Now call joinRoom again to move from knockQueue → participants
          // The joinRoom response will be 'joined'; then we finalize
          api.joinRoom({
            roomId: currentRoomId.current,
            user: {
              id: tabClientId,
              name: pendingSessionRef.current?.participantName || 'Participant',
              email: auth.identity?.email || '',
              picture: auth.identity?.picture || ''
            }
          }).then((res) => {
            if (res.status === 'joined') {
              const sess = {
                sessionId: currentRoomId.current,
                title: 'Live Video Meeting',
                role: res.role || 'participant',
                participantName: pendingSessionRef.current?.participantName || auth.identity?.name || 'Participant',
                authProvider: auth.identity ? `Google (${auth.identity.email})` : 'Guest'
              };
              finalizeJoinRef.current(currentRoomId.current, sess);
            }
          }).catch(() => {});
        } else if (data.status === 'denied') {
          setWaitingForAdmission(false);
          setDeniedAdmission(true);
        }
        break;
      }

      case 'webrtc_signal': {
        rtcHookRef.current.handleIncomingSignal(data.signal);
        break;
      }

      case 'chat_message': {
        chatHookRef.current.addMessage(data.message);
        break;
      }

      case 'screen_share_started': {
        setScreenShareOwner(data.ownerId);
        if (data.ownerId !== tabClientId) {
          addLogRef.current(`${data.ownerName || 'A participant'} is sharing their screen.`, 'info');
        }
        break;
      }

      case 'screen_share_stopped': {
        setScreenShareOwner((prev) => (prev === data.ownerId ? null : prev));
        if (data.ownerId !== tabClientId) {
          addLogRef.current('Screen sharing ended.', 'info');
        }
        break;
      }

      default: break;
    }
  }, [tabClientId, auth.identity]);

  // Ref to the handler so SSE onmessage always calls the latest version
  const onSSEMessageRef = useRef(onSSEMessage);
  useEffect(() => { onSSEMessageRef.current = onSSEMessage; }, [onSSEMessage]);

  // ─── SSE connection ───────────────────────────────────────────────────────
  const connectRoomSSE = useCallback((roomId, userId) => {
    if (sseConnected.current) return; // Already connected

    if (roomSseRef.current) {
      roomSseRef.current.close();
      roomSseRef.current = null;
    }

    const sse = new EventSource(
      `/api/room/events?roomId=${encodeURIComponent(roomId)}&userId=${encodeURIComponent(userId)}`
    );
    roomSseRef.current = sse;
    sseConnected.current = true;

    sse.onmessage = (event) => {
      onSSEMessageRef.current(event.data);
    };

    sse.onerror = () => {
      // Browser auto-retries EventSource — don't interfere
    };
  }, []);

  // ─── Join by room code ────────────────────────────────────────────────────
  const joinByCode = useCallback(async (code) => {
    if (!code?.trim()) return;
    setError('');
    setJoining(true);
    setDeniedAdmission(false);

    try {
      const cleanCode = code.trim().toLowerCase()
        .replace(/^https?:\/\/[^/]+\//, '')
        .replace(/[?#].*$/, '')
        .replace(/[^a-z0-9-]/g, '');

      currentRoomId.current = cleanCode;

      const fingerprint = await generateBrowserFingerprint().catch(() => '');

      const userPayload = {
        id: tabClientId,
        name: auth.identity?.name || 'Participant',
        email: auth.identity?.email || '',
        picture: auth.identity?.picture || '',
        fingerprint
      };

      // Ensure local media is active
      if (!mediaHook.localStreamRef.current) {
        await mediaHook.startMedia();
      }

      const pendingSession = {
        sessionId: cleanCode,
        title: 'Live Video Meeting',
        role: 'participant',
        participantName: userPayload.name,
        authProvider: auth.identity ? `Google (${auth.identity.email})` : 'Guest'
      };
      pendingSessionRef.current = pendingSession;

      const res = await api.joinRoom({ roomId: cleanCode, user: userPayload });

      if (res.status === 'waiting_for_host') {
        setWaitingForAdmission(true);
        connectRoomSSE(cleanCode, tabClientId); // Open SSE to receive knock_response
        return;
      }

      if (res.status === 'denied') {
        setDeniedAdmission(true);
        return;
      }

      if (res.status === 'joined') {
        const sess = {
          ...pendingSession,
          role: res.role || 'participant'
        };
        connectRoomSSE(cleanCode, tabClientId); // SSE snapshot triggers WebRTC setup
        finalizeJoin(cleanCode, sess);
      }
    } catch (err) {
      setError(err.message || 'Failed to join meeting.');
    } finally {
      setJoining(false);
    }
  }, [tabClientId, auth.identity, mediaHook, connectRoomSSE, finalizeJoin]);

  // ─── Create & start instant meeting ──────────────────────────────────────
  const startInstantMeeting = useCallback(async () => {
    setError('');
    setJoining(true);
    try {
      const created = await api.createMeeting({
        title: `${auth.identity?.name || 'User'}'s Meeting`,
        candidateName: auth.identity?.name || 'Participant',
        creatorId: tabClientId
      });
      await joinByCode(created.session.sessionId);
    } catch (err) {
      setError(err.message || 'Failed to create meeting.');
    } finally {
      setJoining(false);
    }
  }, [auth.identity, tabClientId, joinByCode]);

  // ─── Create meeting link for later ───────────────────────────────────────
  const createMeetingForLater = useCallback(async () => {
    setError('');
    try {
      const created = await api.createMeeting({
        title: `${auth.identity?.name || 'User'}'s Meeting`,
        candidateName: auth.identity?.name || 'Participant',
        creatorId: tabClientId
      });
      return created.session.sessionId;
    } catch (err) {
      setError(err.message || 'Failed to create meeting.');
      return null;
    }
  }, [auth.identity, tabClientId]);

  // ─── Admit / deny a knock (host only) ────────────────────────────────────
  const admitGuest = useCallback(async (guestId, action = 'admit') => {
    try {
      await api.admitGuest({ roomId: currentRoomId.current, guestId, action });
      // Optimistic update — server also sends knock_queue_update
      setKnockRequests((prev) => prev.filter((k) => k.id !== guestId));
    } catch {}
  }, []);

  // ─── Screen share ─────────────────────────────────────────────────────────
  const toggleShare = useCallback(async () => {
    const wasSharing = mediaHook.media.share;
    const started = await mediaHook.toggleShare();

    const roomId = currentRoomId.current;
    if (!roomId) return;

    if (!wasSharing && started) {
      // Notify server → broadcasts screen_share_started to all
      try { await api.screenShare({ roomId, userId: tabClientId, isSharing: true }); } catch {}

      // Replace video track in all peer connections with screen track
      setTimeout(() => {
        const screenTrack = mediaHook.screenStreamRef?.current?.getVideoTracks()[0];
        if (!screenTrack) return;
        rtcHook.peerConnections.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack).catch(() => {});
        });
      }, 150);

      // Also notify when native browser "Stop" button is clicked
      const screenTrack = mediaHook.screenStreamRef?.current?.getVideoTracks()[0];
      if (screenTrack) {
        screenTrack.onended = async () => {
          try { await api.screenShare({ roomId, userId: tabClientId, isSharing: false }); } catch {}
          // Restore camera
          setTimeout(() => {
            const camTrack = mediaHook.localStreamRef.current?.getVideoTracks()[0];
            if (!camTrack) return;
            rtcHook.peerConnections.current.forEach((pc) => {
              const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
              if (sender) sender.replaceTrack(camTrack).catch(() => {});
            });
          }, 150);
        };
      }
    } else {
      // Stopped sharing — notify server
      try { await api.screenShare({ roomId, userId: tabClientId, isSharing: false }); } catch {}

      // Restore camera track
      setTimeout(() => {
        const camTrack = mediaHook.localStreamRef.current?.getVideoTracks()[0];
        if (!camTrack) return;
        rtcHook.peerConnections.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(camTrack).catch(() => {});
        });
      }, 150);
    }
  }, [mediaHook, rtcHook, tabClientId]);

  // ─── Leave meeting ────────────────────────────────────────────────────────
  const leaveMeeting = useCallback(async () => {
    if (!window.confirm('Leave this meeting?')) return;

    if (currentRoomId.current) {
      api.leaveRoom({ roomId: currentRoomId.current, userId: tabClientId }).catch(() => {});
    }

    rtcHook.closeAllConnections();
    mediaHook.stopMedia();

    if (roomSseRef.current) {
      roomSseRef.current.close();
      roomSseRef.current = null;
    }
    sseConnected.current = false;

    setSession(null);
    setWaitingForAdmission(false);
    setDeniedAdmission(false);
    setKnockRequests([]);
    setParticipants([]);
    setServerHostId(null);
    setScreenShareOwner(null);
    chatHook.clearMessages();
    currentRoomId.current = '';
    initialRoomChecked.current = false;
    pendingSessionRef.current = null;

    if (window.history?.pushState) {
      window.history.pushState({}, '', '/');
    }
  }, [tabClientId, rtcHook, mediaHook, chatHook]);

  // ─── Auto-join from URL ───────────────────────────────────────────────────
  useEffect(() => {
    if (!auth.identity || initialRoomChecked.current || session || waitingForAdmission) return;
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room') || params.get('code');
    if (roomParam) {
      initialRoomChecked.current = true;
      joinByCode(roomParam);
    }
  }, [auth.identity, session, waitingForAdmission, joinByCode]);

  // ─── Public interface ─────────────────────────────────────────────────────
  return {
    // Auth
    identity: auth.identity,
    authLoading: auth.authLoading,
    googleSignIn: auth.googleSignIn,
    logout: auth.logout,

    // Session & entry state
    session,
    joining,
    error,
    setError,
    waitingForAdmission,
    deniedAdmission,
    knockRequests,
    participants,
    isHost,
    serverHostId,
    initials,
    tabClientId,

    // Media
    media: mediaHook.media,
    stream: mediaHook.stream,
    screenStream: mediaHook.screenStream,
    screenStreamRef: mediaHook.screenStreamRef,
    toggleMedia: mediaHook.toggleMedia,
    toggleShare,

    // Screen share (server-authoritative)
    screenShareOwner,
    amSharing: screenShareOwner === tabClientId,

    // WebRTC
    remoteStreams: rtcHook.remoteStreams,

    // Chat
    messages: chatHook.messages,
    sendChatMessage: chatHook.sendChatMessage,
    toggleTranslateMessage: chatHook.toggleTranslateMessage,
    translatedMap: chatHook.translatedMap,
    translating: chatHook.translating,

    // Telemetry & proctor
    threats: telemetryHook.threats,
    checks: telemetryHook.checks,
    logs: [...runtimeLogs, ...telemetryHook.logs],
    elapsed: telemetryHook.elapsed,
    trust: telemetryHook.trust,
    killActiveThreat: telemetryHook.killActiveThreat,
    exportAudit: () => telemetryHook.exportAudit({ participantsCount: participants.length }),

    // AI
    myLanguage: aiHook.myLanguage,
    setMyLanguage: aiHook.setMyLanguage,
    translateEnabled: aiHook.translateEnabled,
    setTranslateEnabled: aiHook.setTranslateEnabled,
    aiMemo: aiHook.aiMemo,
    setAiMemo: aiHook.setAiMemo,
    memoLoading: aiHook.memoLoading,
    generateMemo: () => aiHook.generateMemo(chatHook.messages),
    aiConfigured: aiHook.aiConfigured,

    // Actions
    startInstantMeeting,
    createMeetingForLater,
    joinByCode,
    leaveMeeting,
    admitGuest
  };
}
