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

  // Participant Admission State (WAITING -> ADMITTED -> CONNECTING -> CONNECTED -> LEFT)
  const [waitingForAdmission, setWaitingForAdmission] = useState(false);
  const [deniedAdmission, setDeniedAdmission] = useState(false);
  const [knockRequests, setKnockRequests] = useState([]);

  // Server Authoritative Meeting State
  const [serverParticipants, setServerParticipants] = useState([]);
  const [serverHostId, setServerHostId] = useState(null);
  const [screenShareOwner, setScreenShareOwner] = useState(null);

  const auth = useAuth();

  // Stable CONNECTION identity: unique per browser tab/session
  // Separate from user account ID to support multiple tabs from same account
  const clientId = useMemo(() => {
    let tabId = sessionStorage.getItem('securemeet_tab_id');
    if (!tabId) {
      // Use crypto.randomUUID() for collision-resistant unique ID
      tabId = `tab_${crypto.randomUUID()}`;
      sessionStorage.setItem('securemeet_tab_id', tabId);
    }
    return tabId;
  }, []);

  const currentRoomId = useRef('');
  const roomSseRef = useRef(null);
  const sseConnected = useRef(false);
  const initialRoomChecked = useRef(false);

  const [runtimeLogs, setRuntimeLogs] = useState([]);
  const addLog = useCallback((message, level = 'system') => {
    const timeStr = new Date().toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    setRuntimeLogs((old) => [...old, { id: crypto.randomUUID(), at: timeStr, message, level }]);
  }, []);

  const mediaHook = useMedia(addLog);
  const chatHook = useChat(currentRoomId, clientId, auth.identity);
  const rtcHook = useWebRTC(currentRoomId, clientId, mediaHook.localStreamRef);
  const telemetryHook = useTelemetry(session, addLog);
  const aiHook = useAI(session?.sessionId);

  // Server Authoritative Host Determination
  const isHost = useMemo(() => {
    return Boolean(serverHostId && serverHostId === clientId);
  }, [serverHostId, clientId]);

  // Unified Authoritative Participant Model
  // Single source of truth across UI
  const participants = useMemo(() => {
    const list = [];
    const localUser = auth.identity;
    const localRole = isHost ? 'host' : 'participant';

    // 1. Local Participant
    list.push({
      id: clientId,
      name: localUser?.name || session?.participantName || (isHost ? 'Host' : 'Participant'),
      email: localUser?.email || '',
      picture: localUser?.picture || '',
      role: localRole,
      status: session ? 'CONNECTED' : (waitingForAdmission ? 'WAITING' : 'CONNECTING'),
      audioEnabled: Boolean(mediaHook.media.mic),
      videoEnabled: Boolean(mediaHook.media.cam),
      screenSharing: Boolean(screenShareOwner === clientId),
      stream: mediaHook.stream,
      isLocal: true
    });

    // 2. Remote Participants (from Server Authority)
    serverParticipants.forEach((sp) => {
      if (sp.id === clientId) return; // Skip self

      const remoteStream = rtcHook.remoteStreams[sp.id] || null;
      const isRemoteHost = Boolean(serverHostId && serverHostId === sp.id);

      list.push({
        id: sp.id,
        name: sp.name || 'Participant',
        email: sp.email || '',
        picture: sp.picture || '',
        role: isRemoteHost ? 'host' : 'participant',
        status: sp.status || 'CONNECTED',
        audioEnabled: sp.audioEnabled !== false,
        videoEnabled: sp.videoEnabled !== false,
        screenSharing: Boolean(screenShareOwner === sp.id),
        stream: remoteStream,
        isLocal: false
      });
    });

    return list;
  }, [
    clientId,
    auth.identity,
    session,
    isHost,
    waitingForAdmission,
    mediaHook.media,
    mediaHook.stream,
    screenShareOwner,
    serverParticipants,
    serverHostId,
    rtcHook.remoteStreams
  ]);

  const initials = useMemo(() => {
    const name = auth.identity?.name || session?.participantName || '?';
    return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  }, [auth.identity, session]);

  // Stable references for SSE events
  const rtcHookRef = useRef(rtcHook);
  const chatHookRef = useRef(chatHook);
  const addLogRef = useRef(addLog);
  useEffect(() => { rtcHookRef.current = rtcHook; }, [rtcHook]);
  useEffect(() => { chatHookRef.current = chatHook; }, [chatHook]);
  useEffect(() => { addLogRef.current = addLog; }, [addLog]);

  const finalizeJoin = useCallback((roomId, pendingSession) => {
    setSession(pendingSession);
    setWaitingForAdmission(false);
    setDeniedAdmission(false);
    telemetryHook.setElapsed(0);
    addLog('Meeting joined. Proctoring watchdog active.', 'system');

    if (window.history?.pushState) {
      window.history.pushState({}, '', `/?room=${roomId}`);
    }
  }, [telemetryHook, addLog]);

  const finalizeJoinRef = useRef(finalizeJoin);
  useEffect(() => { finalizeJoinRef.current = finalizeJoin; }, [finalizeJoin]);

  const pendingSessionRef = useRef(null);

  // ─── SSE Event Handler ──────────────────────────────────────────────────
  const onSSEMessage = useCallback((rawData) => {
    let data;
    try { data = JSON.parse(rawData); } catch { return; }

    switch (data.type) {
      case 'room_snapshot': {
        setServerParticipants(data.participants || []);
        setKnockRequests((data.knockQueue || []).filter((k) => k.status === 'WAITING' || k.status === 'pending'));
        chatHookRef.current.setMessages(data.messages || []);
        if (data.hostId) setServerHostId(data.hostId);
        setScreenShareOwner(data.screenShareOwner || null);
        break;
      }

      case 'participant_joined': {
        setServerParticipants(data.participants || []);
        if (data.hostId) setServerHostId(data.hostId);

        const np = data.participant;
        if (!np) break;

        if (np.id !== clientId) {
          addLogRef.current(`${np.name} joined the call.`, 'info');

          // EXISTING PEER INITIATES WebRTC OFFER TO NEW JOINER
          rtcHookRef.current.createPeerConnection(np.id, true);
        }
        break;
      }

      case 'participant_reconnected': {
        setServerParticipants(data.participants || []);
        if (data.hostId) setServerHostId(data.hostId);

        const rp = data.participant;
        if (!rp) break;

        if (rp.id !== clientId) {
          addLogRef.current(`${rp.name} reconnected.`, 'info');

          // Re-establish WebRTC connection
          rtcHookRef.current.createPeerConnection(rp.id, true);
        }
        break;
      }

      case 'participant_left': {
        const leftId = data.userId;
        setServerParticipants(data.participants || []);
        if (data.hostId) setServerHostId(data.hostId);

        rtcHookRef.current.closePeerConnection(leftId);
        setScreenShareOwner((prev) => (prev === leftId ? null : prev));
        addLogRef.current('A participant left the call.', 'info');
        break;
      }

      case 'participant_updated': {
        setServerParticipants(data.participants || []);
        break;
      }

      case 'knock_request':
      case 'knock_queue_update': {
        setKnockRequests((data.knockQueue || []).filter((k) => k.status === 'WAITING' || k.status === 'pending'));
        break;
      }

      case 'knock_response': {
        if (data.guestId !== clientId) break;

        if (data.status === 'admitted') {
          // GUEST IS ADMITTED! Now complete join on server
          setWaitingForAdmission(false);

          api.joinRoom({
            roomId: currentRoomId.current,
            user: {
              id: clientId,
              name: auth.identity?.name || pendingSessionRef.current?.participantName || 'Participant',
              email: auth.identity?.email || '',
              picture: auth.identity?.picture || ''
            }
          }).then((res) => {
            if (res.status === 'joined') {
              if (res.hostId) setServerHostId(res.hostId);
              const sess = {
                sessionId: currentRoomId.current,
                title: 'Live Video Meeting',
                role: res.role || 'participant',
                participantName: auth.identity?.name || pendingSessionRef.current?.participantName || 'Participant',
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
        if (data.ownerId !== clientId) {
          addLogRef.current(`${data.ownerName || 'A participant'} started screen sharing.`, 'info');
        }
        break;
      }

      case 'screen_share_stopped': {
        setScreenShareOwner((prev) => (prev === data.ownerId ? null : prev));
        if (data.ownerId !== clientId) {
          addLogRef.current('Screen sharing ended.', 'info');
        }
        break;
      }

      default: break;
    }
  }, [clientId, auth.identity]);

  const onSSEMessageRef = useRef(onSSEMessage);
  useEffect(() => { onSSEMessageRef.current = onSSEMessage; }, [onSSEMessage]);

  const connectRoomSSE = useCallback((roomId, userId) => {
    if (sseConnected.current) return;

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
  }, []);

  // ─── Join by Room Code ───────────────────────────────────────────────────
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
        id: clientId,
        name: auth.identity?.name || 'Participant',
        email: auth.identity?.email || '',
        picture: auth.identity?.picture || '',
        fingerprint
      };

      // Start local webcam & mic
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

      // Check saved host token in sessionStorage if creator
      const savedHostToken = sessionStorage.getItem(`sec_host_${cleanCode}`);

      const res = await api.joinRoom({
        roomId: cleanCode,
        user: userPayload,
        hostToken: savedHostToken
      });

      if (res.status === 'waiting_for_host') {
        setWaitingForAdmission(true);
        connectRoomSSE(cleanCode, clientId);
        return;
      }

      if (res.status === 'denied') {
        setDeniedAdmission(true);
        return;
      }

      if (res.status === 'joined') {
        if (res.hostId) setServerHostId(res.hostId);
        const sess = {
          ...pendingSession,
          role: res.role || 'participant'
        };
        connectRoomSSE(cleanCode, clientId);
        finalizeJoin(cleanCode, sess);
      }
    } catch (err) {
      setError(err.message || 'Failed to join meeting.');
    } finally {
      setJoining(false);
    }
  }, [clientId, auth.identity, mediaHook, connectRoomSSE, finalizeJoin]);

  // ─── Create & Start Instant Meeting ──────────────────────────────────────
  const startInstantMeeting = useCallback(async () => {
    setError('');
    setJoining(true);
    try {
      const created = await api.createMeeting({
        title: `${auth.identity?.name || 'User'}'s Meeting`,
        candidateName: auth.identity?.name || 'Participant',
        creatorId: clientId
      });

      const { sessionId, hostToken } = created.session;
      if (hostToken) {
        sessionStorage.setItem(`sec_host_${sessionId}`, hostToken);
      }

      await joinByCode(sessionId);
    } catch (err) {
      setError(err.message || 'Failed to create meeting.');
    } finally {
      setJoining(false);
    }
  }, [auth.identity, clientId, joinByCode]);

  // ─── Create Meeting Link for Later ───────────────────────────────────────
  const createMeetingForLater = useCallback(async () => {
    setError('');
    try {
      const created = await api.createMeeting({
        title: `${auth.identity?.name || 'User'}'s Meeting`,
        candidateName: auth.identity?.name || 'Participant',
        creatorId: clientId
      });

      const { sessionId, hostToken } = created.session;
      if (hostToken) {
        sessionStorage.setItem(`sec_host_${sessionId}`, hostToken);
      }

      return sessionId;
    } catch (err) {
      setError(err.message || 'Failed to create meeting.');
      return null;
    }
  }, [auth.identity, clientId]);

  // ─── Host Admits / Denies Guest ──────────────────────────────────────────
  const admitGuest = useCallback(async (guestId, action = 'admit') => {
    if (!isHost) {
      addLog('Only the host can admit participants.', 'warn');
      return;
    }
    try {
      await api.admitGuest({ roomId: currentRoomId.current, guestId, action });
      setKnockRequests((prev) => prev.filter((k) => k.id !== guestId));
    } catch {}
  }, [isHost, addLog]);

  // ─── Screen Sharing Handling ─────────────────────────────────────────────
  const toggleShare = useCallback(async () => {
    const wasSharing = mediaHook.media.share;
    const isNowSharing = await mediaHook.toggleShare();

    const roomId = currentRoomId.current;
    if (!roomId) return;

    if (!wasSharing && isNowSharing) {
      console.log('[ScreenShare] Starting screen share');

      // Notify server of screen share
      try {
        await api.screenShare({ roomId, userId: clientId, isSharing: true });
        console.log('[ScreenShare] Server notified of screen share start');
      } catch (err) {
        console.error('[ScreenShare] Failed to notify server:', err);
      }

      // Replace video track across all WebRTC connections
      const screenTrack = mediaHook.screenStreamRef?.current?.getVideoTracks()[0];
      if (screenTrack) {
        console.log('[ScreenShare] Replacing video track with screen track across all peers');
        await rtcHook.replaceVideoTrack(screenTrack);
        addLog('Screen sharing started.', 'info');

        // When user stops via browser floating bar
        screenTrack.onended = async () => {
          console.log('[ScreenShare] Browser stopped screen share');
          if (mediaHook.screenStreamRef.current) {
            mediaHook.screenStreamRef.current.getTracks().forEach((t) => t.stop());
            mediaHook.screenStreamRef.current = null;
          }

          // Update media state properly
          mediaHook.media.share = false;

          try {
            await api.screenShare({ roomId, userId: clientId, isSharing: false });
            console.log('[ScreenShare] Server notified of screen share stop');
          } catch {}

          const camTrack = mediaHook.localStreamRef.current?.getVideoTracks()[0] || null;
          console.log('[ScreenShare] Restoring camera track');
          await rtcHook.replaceVideoTrack(camTrack);
          addLog('Screen sharing ended.', 'info');
        };
      } else {
        console.error('[ScreenShare] No screen track found!');
      }
    } else {
      // Stopped sharing
      console.log('[ScreenShare] Stopping screen share');
      try {
        await api.screenShare({ roomId, userId: clientId, isSharing: false });
        console.log('[ScreenShare] Server notified of screen share stop');
      } catch {}

      const camTrack = mediaHook.localStreamRef.current?.getVideoTracks()[0] || null;
      console.log('[ScreenShare] Restoring camera track');
      await rtcHook.replaceVideoTrack(camTrack);
      addLog('Screen sharing stopped.', 'info');
    }
  }, [mediaHook, rtcHook, clientId, addLog]);

  // ─── Leave Meeting ───────────────────────────────────────────────────────
  const leaveMeeting = useCallback(async () => {
    if (!window.confirm('Leave this meeting?')) return;

    if (currentRoomId.current) {
      api.leaveRoom({ roomId: currentRoomId.current, userId: clientId }).catch(() => {});
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
    setServerParticipants([]);
    setServerHostId(null);
    setScreenShareOwner(null);
    chatHook.clearMessages();
    currentRoomId.current = '';
    initialRoomChecked.current = false;
    pendingSessionRef.current = null;

    if (window.history?.pushState) {
      window.history.pushState({}, '', '/');
    }
  }, [clientId, rtcHook, mediaHook, chatHook]);

  // Auto-join from URL parameter ?room=xxx
  useEffect(() => {
    if (!auth.identity || initialRoomChecked.current || session || waitingForAdmission) return;
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room') || params.get('code');
    if (roomParam) {
      initialRoomChecked.current = true;
      joinByCode(roomParam);
    }
  }, [auth.identity, session, waitingForAdmission, joinByCode]);

  return {
    // Auth & Identity
    identity: auth.identity,
    authLoading: auth.authLoading,
    googleSignIn: auth.googleSignIn,
    logout: auth.logout,

    // Authoritative Session & Participant Model
    session,
    joining,
    error,
    setError,
    waitingForAdmission,
    deniedAdmission,
    knockRequests,
    participants,
    serverParticipants,
    isHost,
    serverHostId,
    initials,
    tabClientId: clientId,

    // Media Controls & Streams
    media: mediaHook.media,
    stream: mediaHook.stream,
    screenStream: mediaHook.screenStream,
    screenStreamRef: mediaHook.screenStreamRef,
    toggleMedia: useCallback((kind) => {
      mediaHook.toggleMedia(kind);

      // Broadcast media state to server so remote participants see mute icons
      if (currentRoomId.current && (kind === 'mic' || kind === 'cam')) {
        const updates = kind === 'mic'
          ? { audioEnabled: !mediaHook.media.mic }
          : { videoEnabled: !mediaHook.media.cam };

        api.updateMediaState({
          roomId: currentRoomId.current,
          userId: clientId,
          ...updates
        }).catch(() => {});
      }
    }, [mediaHook, clientId]),
    toggleShare,

    // Screen Share State
    screenShareOwner,
    amSharing: Boolean(screenShareOwner === clientId),

    // WebRTC
    remoteStreams: rtcHook.remoteStreams,

    // Chat
    messages: chatHook.messages,
    sendChatMessage: chatHook.sendChatMessage,
    toggleTranslateMessage: chatHook.toggleTranslateMessage,
    translatedMap: chatHook.translatedMap,
    translating: chatHook.translating,

    // Telemetry & Proctoring Watchdog
    threats: telemetryHook.threats,
    checks: telemetryHook.checks,
    logs: [...runtimeLogs, ...telemetryHook.logs],
    elapsed: telemetryHook.elapsed,
    trust: telemetryHook.trust,
    killActiveThreat: telemetryHook.killActiveThreat,
    exportAudit: () => telemetryHook.exportAudit({ participantsCount: participants.length }),

    // AI Capabilities
    myLanguage: aiHook.myLanguage,
    setMyLanguage: aiHook.setMyLanguage,
    translateEnabled: aiHook.translateEnabled,
    setTranslateEnabled: aiHook.setTranslateEnabled,
    aiMemo: aiHook.aiMemo,
    setAiMemo: aiHook.setAiMemo,
    memoLoading: aiHook.memoLoading,
    generateMemo: () => aiHook.generateMemo(chatHook.messages),
    aiConfigured: aiHook.aiConfigured,

    // Meeting Operations
    startInstantMeeting,
    createMeetingForLater,
    joinByCode,
    leaveMeeting,
    admitGuest
  };
}
