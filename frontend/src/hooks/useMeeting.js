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

  // ═══════════════════════════════════════════════════════════════════════════
  // IDENTITY MODEL (CRITICAL)
  // ═══════════════════════════════════════════════════════════════════════════
  // userId = PERSISTENT user identity (Google OAuth ID or guest localStorage ID)
  //          This MUST remain the same across browser refreshes
  //          Used for: host identification, participant identity
  //
  // tabClientId = EPHEMERAL connection identity (session-scoped random UUID)
  //               Regenerated on every page load/refresh
  //               Used for: WebRTC peer connection tracking, SSE connection ID
  // ═══════════════════════════════════════════════════════════════════════════

  // PERSISTENT User ID (survives refresh)
  const userId = useMemo(() => {
    if (auth.identity?.id) {
      // Authenticated: use Google OAuth sub (persistent across sessions)
      return auth.identity.id;
    }

    // Guest: use localStorage-persisted UUID (persistent per browser)
    let guestId = localStorage.getItem('securemeet_guest_id');
    if (!guestId) {
      guestId = `guest_${crypto.randomUUID()}`;
      localStorage.setItem('securemeet_guest_id', guestId);
    }
    return guestId;
  }, [auth.identity]);

  // EPHEMERAL Tab/Connection ID (new on every page load)
  const tabClientId = useMemo(() => {
    // Always generate a NEW connection ID on page load
    // Do NOT persist in sessionStorage (sessionStorage clears on refresh in some browsers)
    const connId = `conn_${crypto.randomUUID()}`;
    console.log('[Identity] Generated new connection ID:', connId, 'for userId:', userId);
    return connId;
  }, [userId]);

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
  const chatHook = useChat(currentRoomId, tabClientId, auth.identity);
  const rtcHook = useWebRTC(currentRoomId, tabClientId, mediaHook.localStreamRef);
  const telemetryHook = useTelemetry(session, addLog);
  const aiHook = useAI(session?.sessionId);

  // Server Authoritative Host Determination
  // Host is determined by PERSISTENT userId, not ephemeral tabClientId
  const isHost = useMemo(() => {
    return Boolean(serverHostId && serverHostId === userId);
  }, [serverHostId, userId]);

  // Unified Authoritative Participant Model
  // Single source of truth across UI
  const participants = useMemo(() => {
    const list = [];
    const localUser = auth.identity;
    const localRole = isHost ? 'host' : 'participant';

    // 1. Local Participant (use tabClientId for WebRTC peer tracking)
    list.push({
      id: tabClientId,           // WebRTC peer ID (for connection tracking)
      userId: userId,             // Persistent user identity
      name: localUser?.name || session?.participantName || (isHost ? 'Host' : 'Participant'),
      email: localUser?.email || '',
      picture: localUser?.picture || '',
      role: localRole,
      status: session ? 'CONNECTED' : (waitingForAdmission ? 'WAITING' : 'CONNECTING'),
      audioEnabled: Boolean(mediaHook.media.mic),
      videoEnabled: Boolean(mediaHook.media.cam),
      screenSharing: Boolean(screenShareOwner === userId),
      stream: mediaHook.stream,
      isLocal: true
    });

    // 2. Remote Participants (from Server Authority)
    serverParticipants.forEach((sp) => {
      if (sp.userId === userId) return; // Skip self (match by userId)

      // Use connectionId for WebRTC stream lookup
      const remoteStream = rtcHook.remoteStreams[sp.connectionId] || null;
      const isRemoteHost = Boolean(serverHostId && serverHostId === sp.userId);

      list.push({
        id: sp.connectionId,       // WebRTC peer ID
        userId: sp.userId,          // Persistent user identity
        name: sp.name || 'Participant',
        email: sp.email || '',
        picture: sp.picture || '',
        role: isRemoteHost ? 'host' : 'participant',
        status: sp.status || 'CONNECTED',
        audioEnabled: sp.audioEnabled !== false,
        videoEnabled: sp.videoEnabled !== false,
        screenSharing: Boolean(screenShareOwner === sp.userId),
        stream: remoteStream,
        isLocal: false
      });
    });

    return list;
  }, [
    tabClientId,
    userId,
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

    console.log('[SSE] Received event:', data.type, data);

    switch (data.type) {
      case 'room_snapshot': {
        setServerParticipants(data.participants || []);
        setKnockRequests((data.knockQueue || []).filter((k) => k.status === 'WAITING' || k.status === 'pending'));
        chatHookRef.current.setMessages(data.messages || []);
        if (data.hostId) setServerHostId(data.hostId);
        setScreenShareOwner(data.screenShareOwner || null);
        console.log('[SSE] Room snapshot received. Host:', data.hostId, 'Participants:', data.participants?.length);
        break;
      }

      case 'participant_joined': {
        setServerParticipants(data.participants || []);
        if (data.hostId) setServerHostId(data.hostId);

        const np = data.participant;
        if (!np) break;

        console.log('[SSE] Participant joined:', np.userId, 'connectionId:', np.connectionId);

        // Match by connectionId for WebRTC (not userId, as one user can have multiple tabs)
        if (np.connectionId !== tabClientId) {
          addLogRef.current(`${np.name} joined the call.`, 'info');

          // EXISTING PEER INITIATES WebRTC OFFER TO NEW JOINER
          // Use connectionId for WebRTC peer tracking
          rtcHookRef.current.createPeerConnection(np.connectionId, true);
        }
        break;
      }

      case 'participant_reconnected': {
        setServerParticipants(data.participants || []);
        if (data.hostId) setServerHostId(data.hostId);

        const rp = data.participant;
        if (!rp) break;

        console.log('[SSE] Participant reconnected:', rp.userId, 'connectionId:', rp.connectionId);

        if (rp.connectionId !== tabClientId) {
          addLogRef.current(`${rp.name} reconnected.`, 'info');

          // Re-establish WebRTC connection
          rtcHookRef.current.createPeerConnection(rp.connectionId, true);
        }
        break;
      }

      case 'participant_left': {
        const leftConnectionId = data.connectionId;
        setServerParticipants(data.participants || []);
        if (data.hostId) setServerHostId(data.hostId);

        console.log('[SSE] Participant left. connectionId:', leftConnectionId);

        rtcHookRef.current.closePeerConnection(leftConnectionId);
        setScreenShareOwner((prev) => (prev === data.userId ? null : prev));
        addLogRef.current('A participant left the call.', 'info');
        break;
      }

      case 'participant_updated': {
        setServerParticipants(data.participants || []);
        break;
      }

      case 'knock_request':
      case 'knock_queue_update': {
        console.log('[SSE] Knock queue update:', data.knockQueue?.length, 'requests');
        setKnockRequests((data.knockQueue || []).filter((k) => k.status === 'WAITING' || k.status === 'pending'));
        break;
      }

      case 'knock_response': {
        // Match by userId (persistent identity)
        if (data.guestUserId !== userId) break;

        console.log('[SSE] Knock response for me:', data.status);

        if (data.status === 'admitted') {
          // GUEST IS ADMITTED! Now complete join on server
          setWaitingForAdmission(false);

          api.joinRoom({
            roomId: currentRoomId.current,
            user: {
              userId: userId,
              connectionId: tabClientId,
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
        console.log('[SSE] Screen share started by userId:', data.ownerUserId);
        setScreenShareOwner(data.ownerUserId);
        if (data.ownerUserId !== userId) {
          addLogRef.current(`${data.ownerName || 'A participant'} started screen sharing.`, 'info');
        }
        break;
      }

      case 'screen_share_stopped': {
        console.log('[SSE] Screen share stopped by userId:', data.ownerUserId);
        setScreenShareOwner((prev) => (prev === data.ownerUserId ? null : prev));
        if (data.ownerUserId !== userId) {
          addLogRef.current('Screen sharing ended.', 'info');
        }
        break;
      }

      case 'meeting_ended': {
        console.log('[SSE] Meeting ended by host');
        addLogRef.current('The host has ended this meeting.', 'warn');
        // Force leave
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
        break;
      }

      default: break;
    }
  }, [tabClientId, userId, auth.identity]);

  const onSSEMessageRef = useRef(onSSEMessage);
  useEffect(() => { onSSEMessageRef.current = onSSEMessage; }, [onSSEMessage]);

  const connectRoomSSE = useCallback((roomId, userIdParam, connectionIdParam) => {
    if (sseConnected.current) return;

    if (roomSseRef.current) {
      roomSseRef.current.close();
      roomSseRef.current = null;
    }

    // SSE connection identified by connectionId (ephemeral)
    // But userId sent for host identification
    const sse = new EventSource(
      `/api/room/events?roomId=${encodeURIComponent(roomId)}&userId=${encodeURIComponent(userIdParam)}&connectionId=${encodeURIComponent(connectionIdParam)}`
    );
    roomSseRef.current = sse;
    sseConnected.current = true;

    console.log('[SSE] Connecting to room:', roomId, 'userId:', userIdParam, 'connectionId:', connectionIdParam);

    sse.onmessage = (event) => {
      onSSEMessageRef.current(event.data);
    };

    sse.onerror = (err) => {
      console.error('[SSE] Connection error:', err);
      // Will auto-reconnect
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
        userId: userId,                    // PERSISTENT user identity
        connectionId: tabClientId,         // EPHEMERAL connection identity
        name: auth.identity?.name || 'Participant',
        email: auth.identity?.email || '',
        picture: auth.identity?.picture || '',
        fingerprint
      };

      console.log('[Join] Attempting to join room:', cleanCode, 'as userId:', userId, 'connectionId:', tabClientId);

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

      // Check saved host token in localStorage (use userId as key for persistence)
      const savedHostToken = localStorage.getItem(`sec_host_${cleanCode}_${userId}`);

      console.log('[Join] Host token found:', !!savedHostToken);

      const res = await api.joinRoom({
        roomId: cleanCode,
        user: userPayload,
        hostToken: savedHostToken
      });

      console.log('[Join] Server response:', res.status, 'role:', res.role);

      if (res.status === 'waiting_for_host') {
        setWaitingForAdmission(true);
        connectRoomSSE(cleanCode, userId, tabClientId);
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
        connectRoomSSE(cleanCode, userId, tabClientId);
        finalizeJoin(cleanCode, sess);
      }
    } catch (err) {
      console.error('[Join] Error:', err);
      setError(err.message || 'Failed to join meeting.');
    } finally {
      setJoining(false);
    }
  }, [userId, tabClientId, auth.identity, mediaHook, connectRoomSSE, finalizeJoin]);

  // ─── Create & Start Instant Meeting ──────────────────────────────────────
  const startInstantMeeting = useCallback(async () => {
    setError('');
    setJoining(true);
    try {
      console.log('[Create] Creating instant meeting for userId:', userId);

      const created = await api.createMeeting({
        title: `${auth.identity?.name || 'User'}'s Meeting`,
        candidateName: auth.identity?.name || 'Participant',
        creatorUserId: userId  // Use persistent userId as creator
      });

      const { sessionId, hostToken } = created.session;
      if (hostToken) {
        // Store host token with userId in key for persistence across sessions
        localStorage.setItem(`sec_host_${sessionId}_${userId}`, hostToken);
        console.log('[Create] Host token saved for userId:', userId);
      }

      await joinByCode(sessionId);
    } catch (err) {
      console.error('[Create] Error:', err);
      setError(err.message || 'Failed to create meeting.');
    } finally {
      setJoining(false);
    }
  }, [auth.identity, userId, joinByCode]);

  // ─── Create Meeting Link for Later ───────────────────────────────────────
  const createMeetingForLater = useCallback(async () => {
    setError('');
    try {
      const created = await api.createMeeting({
        title: `${auth.identity?.name || 'User'}'s Meeting`,
        candidateName: auth.identity?.name || 'Participant',
        creatorUserId: userId
      });

      const { sessionId, hostToken } = created.session;
      if (hostToken) {
        localStorage.setItem(`sec_host_${sessionId}_${userId}`, hostToken);
      }

      return sessionId;
    } catch (err) {
      setError(err.message || 'Failed to create meeting.');
      return null;
    }
  }, [auth.identity, userId]);

  // ─── Host Admits / Denies Guest ──────────────────────────────────────────
  const admitGuest = useCallback(async (guestUserId, action = 'admit') => {
    if (!isHost) {
      addLog('Only the host can admit participants.', 'warn');
      return;
    }
    try {
      console.log('[Admit] Host admitting/denying guestUserId:', guestUserId, 'action:', action);
      await api.admitGuest({ roomId: currentRoomId.current, guestUserId, action });
      setKnockRequests((prev) => prev.filter((k) => k.userId !== guestUserId));
    } catch (err) {
      console.error('[Admit] Error:', err);
    }
  }, [isHost, addLog]);

  // ─── Screen Sharing Handling ─────────────────────────────────────────────
  const toggleShare = useCallback(async () => {
    const wasSharing = mediaHook.media.share;
    const isNowSharing = await mediaHook.toggleShare();

    const roomId = currentRoomId.current;
    if (!roomId) return;

    if (!wasSharing && isNowSharing) {
      console.log('[ScreenShare] Starting screen share for userId:', userId);

      // Notify server of screen share (use userId for screen share ownership)
      try {
        await api.screenShare({ roomId, userId: userId, isSharing: true });
        console.log('[ScreenShare] Server notified of screen share start');
      } catch (err) {
        console.error('[ScreenShare] Failed to notify server:', err);
      }

      // Replace video track across all WebRTC connections
      const screenTrack = mediaHook.screenStreamRef?.current?.getVideoTracks()[0];
      if (screenTrack) {
        console.log('[ScreenShare] Screen track obtained:', screenTrack.id, 'readyState:', screenTrack.readyState);
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
            await api.screenShare({ roomId, userId: userId, isSharing: false });
            console.log('[ScreenShare] Server notified of screen share stop');
          } catch {}

          const camTrack = mediaHook.localStreamRef.current?.getVideoTracks()[0] || null;
          console.log('[ScreenShare] Restoring camera track:', camTrack ? camTrack.id : 'null');
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
        await api.screenShare({ roomId, userId: userId, isSharing: false });
        console.log('[ScreenShare] Server notified of screen share stop');
      } catch {}

      const camTrack = mediaHook.localStreamRef.current?.getVideoTracks()[0] || null;
      console.log('[ScreenShare] Restoring camera track');
      await rtcHook.replaceVideoTrack(camTrack);
      addLog('Screen sharing stopped.', 'info');
    }
  }, [mediaHook, rtcHook, userId, addLog]);

  // ─── Leave Meeting ───────────────────────────────────────────────────────
  const leaveMeeting = useCallback(async () => {
    // Host has special leave behavior
    if (isHost && participants.length > 1) {
      // Host with other participants - show options modal
      // This will be handled by the UI component
      return { requiresHostAction: true };
    }

    // Regular participant or host alone
    if (!window.confirm('Leave this meeting?')) return;

    console.log('[Leave] Leaving meeting. userId:', userId, 'connectionId:', tabClientId);

    if (currentRoomId.current) {
      api.leaveRoom({
        roomId: currentRoomId.current,
        userId: userId,
        connectionId: tabClientId
      }).catch(() => {});
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
  }, [isHost, participants.length, userId, tabClientId, rtcHook, mediaHook, chatHook]);

  // ─── End Meeting (Host only) ─────────────────────────────────────────────
  const endMeeting = useCallback(async () => {
    if (!isHost) return;

    if (!window.confirm('End this meeting for everyone?')) return;

    console.log('[EndMeeting] Host ending meeting');

    try {
      await api.endMeeting({ roomId: currentRoomId.current, hostUserId: userId });
    } catch (err) {
      console.error('[EndMeeting] Error:', err);
    }

    // Then leave locally
    await leaveMeeting();
  }, [isHost, userId, leaveMeeting]);

  // ─── Transfer Host ───────────────────────────────────────────────────────
  const transferHost = useCallback(async (newHostUserId) => {
    if (!isHost) return;

    console.log('[TransferHost] Transferring host to userId:', newHostUserId);

    try {
      await api.transferHost({
        roomId: currentRoomId.current,
        currentHostUserId: userId,
        newHostUserId
      });

      // Then leave
      await leaveMeeting();
    } catch (err) {
      console.error('[TransferHost] Error:', err);
    }
  }, [isHost, userId, leaveMeeting]);

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
          userId: userId,
          connectionId: tabClientId,
          ...updates
        }).catch(() => {});
      }
    }, [mediaHook, userId, tabClientId]),
    toggleShare,

    // Screen Share State
    screenShareOwner,
    amSharing: Boolean(screenShareOwner === userId),

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
    endMeeting,
    transferHost,
    admitGuest
  };
}
