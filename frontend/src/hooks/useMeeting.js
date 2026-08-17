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
  
  // Multi-participant Room State
  const [waitingForAdmission, setWaitingForAdmission] = useState(false);
  const [deniedAdmission, setDeniedAdmission] = useState(false);
  const [knockRequests, setKnockRequests] = useState([]);
  const [participants, setParticipants] = useState([]);

  // Per-tab unique client ID
  const tabClientId = useRef(`tab_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`).current;
  const currentRoomId = useRef('');
  const roomSseRef = useRef(null);
  const initialRoomChecked = useRef(false);

  // Sub-hooks
  const auth = useAuth();
  
  const [runtimeLogs, setRuntimeLogs] = useState([]);
  const addLog = useCallback((message, level = 'system') => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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

  // Connect to Room SSE Stream
  const connectRoomEvents = useCallback((roomId, userId) => {
    if (roomSseRef.current) {
      roomSseRef.current.close();
    }

    const sse = new EventSource(`/api/room/events?roomId=${encodeURIComponent(roomId)}&userId=${encodeURIComponent(userId)}`);
    roomSseRef.current = sse;

    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'room_snapshot') {
          setParticipants(data.participants || []);
          setKnockRequests(data.knockQueue || []);
          chatHook.setMessages(data.messages || []);
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
          if (data.participant && data.participant.id !== userId) {
            addLog(`${data.participant.name} joined the call.`, 'info');
            rtcHook.createPeerConnection(data.participant.id, true);
          }
        } else if (data.type === 'participant_left') {
          setParticipants(data.participants || []);
          if (rtcHook.peerConnections.current.has(data.userId)) {
            rtcHook.peerConnections.current.get(data.userId).close();
            rtcHook.peerConnections.current.delete(data.userId);
          }
          addLog('A participant left the call.', 'info');
        } else if (data.type === 'webrtc_signal') {
          rtcHook.handleIncomingSignal(data.signal);
        } else if (data.type === 'chat_message') {
          chatHook.addMessage(data.message);
        }
      } catch {}
    };

    return sse;
  }, [rtcHook, chatHook, addLog]);

  // Join or Start a Meeting by Code
  const joinByCode = useCallback(async (code) => {
    if (!code || !code.trim()) return;
    setError('');
    setJoining(true);
    setDeniedAdmission(false);

    try {
      const cleanCode = code.trim().toLowerCase().replace(/^https?:\/\/[^\/]+\//, '').replace(/[^a-z0-9-]/g, '');
      currentRoomId.current = cleanCode;

      const fingerprint = await generateBrowserFingerprint();

      const userPayload = {
        id: tabClientId,
        name: auth.identity?.name || 'Participant',
        email: auth.identity?.email || '',
        picture: auth.identity?.picture || '',
        fingerprint
      };

      // Start local media stream
      await mediaHook.startMedia();

      // Request to Join Room
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
        authProvider: auth.identity ? `Google Account (${auth.identity.email})` : 'Guest'
      });
      telemetryHook.setElapsed(0);
      addLog('Meeting joined. Proctoring watchdog active.', 'system');

      if (window.history && window.history.pushState) {
        window.history.pushState({}, '', `/?room=${cleanCode}`);
      }

      connectRoomEvents(cleanCode, tabClientId);
    } catch (err) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  }, [tabClientId, auth.identity, mediaHook, connectRoomEvents, telemetryHook, addLog]);

  const startInstantMeeting = useCallback(async () => {
    setError('');
    setJoining(true);
    try {
      const created = await api.createMeeting({
        title: `${auth.identity?.name || 'User'}'s Meeting`,
        candidateName: auth.identity?.name || 'Participant'
      });
      await joinByCode(created.session.sessionId);
    } catch (err) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  }, [auth.identity, joinByCode]);

  const createMeetingForLater = useCallback(async () => {
    setError('');
    try {
      const created = await api.createMeeting({
        title: `${auth.identity?.name || 'User'}'s Meeting`,
        candidateName: auth.identity?.name || 'Participant'
      });
      return created.session.sessionId;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [auth.identity]);

  const admitGuest = useCallback(async (guestId, action = 'admit') => {
    try {
      await api.admitGuest({ roomId: currentRoomId.current, guestId, action });
      setKnockRequests((prev) => prev.filter((k) => k.id !== guestId));
    } catch {}
  }, []);

  const leaveMeeting = useCallback(async () => {
    if (window.confirm('Leave this meeting?')) {
      if (currentRoomId.current) {
        api.leaveRoom({ roomId: currentRoomId.current, userId: tabClientId }).catch(() => {});
      }

      rtcHook.closeAllConnections();
      mediaHook.stopMedia();

      if (roomSseRef.current) {
        roomSseRef.current.close();
        roomSseRef.current = null;
      }

      setSession(null);
      setWaitingForAdmission(false);
      setDeniedAdmission(false);
      setKnockRequests([]);
      setParticipants([]);
      chatHook.clearMessages();

      if (window.history && window.history.pushState) {
        window.history.pushState({}, '', '/');
      }
    }
  }, [tabClientId, rtcHook, mediaHook, chatHook]);

  // Auto-join from URL parameter once identity loads
  useEffect(() => {
    if (!auth.identity || initialRoomChecked.current || session) return;
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room') || params.get('code');
    if (roomParam) {
      initialRoomChecked.current = true;
      joinByCode(roomParam);
    }
  }, [auth.identity, session, joinByCode]);

  return {
    // Auth
    identity: auth.identity,
    authLoading: auth.authLoading,
    googleSignIn: auth.googleSignIn,
    logout: auth.logout,

    // Session & Entry
    session,
    joining,
    error,
    setError,
    waitingForAdmission,
    deniedAdmission,
    knockRequests,
    participants,
    initials,
    tabClientId,

    // Media
    media: mediaHook.media,
    stream: mediaHook.stream,
    screenStream: mediaHook.screenStream,
    toggleMedia: mediaHook.toggleMedia,
    toggleShare: mediaHook.toggleShare,

    // WebRTC
    remoteStreams: rtcHook.remoteStreams,

    // Chat
    messages: chatHook.messages,
    sendChatMessage: chatHook.sendChatMessage,
    toggleTranslateMessage: chatHook.toggleTranslateMessage,
    translatedMap: chatHook.translatedMap,
    translating: chatHook.translating,

    // Telemetry & Proctor
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
