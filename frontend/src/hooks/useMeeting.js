import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api';

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
  
  const [threats, setThreats] = useState([]);
  const [checks, setChecks] = useState(initialChecks);
  const [logs, setLogs] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const [media, setMedia] = useState({ mic: true, cam: true, share: false });
  const [stream, setStream] = useState(null);
  const threatKey = useRef('');
  const initialRoomChecked = useRef(false);

  const addLog = (message, level = 'system') => {
    setLogs(old => [...old, { id: crypto.randomUUID(), at: now(), message, level }]);
  };

  const trust = threats.length ? 35 : 100;
  
  const initials = useMemo(() => {
    const name = identity?.name || session?.participantName || '?';
    return name
      .split(' ')
      .map(w => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [identity, session]);

  // Check current authenticated Google identity
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

  // Auto-join if URL contains ?room= or ?code= parameter once user is authenticated
  useEffect(() => {
    if (!identity || initialRoomChecked.current || session) return;
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room') || params.get('code');
    if (roomParam) {
      initialRoomChecked.current = true;
      joinByCode(roomParam);
    }
  }, [identity, session]);

  // Watchdog SSE stream during active meeting
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

  // Tab focus & clipboard anti-cheat listeners
  useEffect(() => {
    if (!session) return;
    const focus = () => {
      const lost = document.hidden;
      setChecks(old =>
        old.map((check, index) =>
          index === 1 ? [check[0], lost ? 'Lost' : 'Focused', lost ? 'fail' : 'ok'] : check
        )
      );
      if (lost) addLog('Tab focus lost.', 'warn');
    };

    const paste = event => {
      const text = event.clipboardData?.getData('text') || '';
      if (text.length > 30) {
        setChecks(old =>
          old.map((check, index) =>
            index === 2 ? [check[0], 'Bulk paste', 'fail'] : check
          )
        );
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

  // Cleanup media tracks when stream ends
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const googleSignIn = async () => {
    try {
      const status = await api.googleStatus();
      if (status.enabled) {
        window.location.assign('/api/auth/google');
      } else {
        setError('Google sign-in is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
      }
    } catch {
      setError('Google sign-in service is currently unreachable.');
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {}
    setIdentity(null);
    setSession(null);
    window.location.href = '/';
  };

  const joinSessionData = async (sessionData) => {
    setSession(sessionData);
    setElapsed(0);
    setLogs([]);
    setThreats([]);
    setChecks(initialChecks);
    addLog('Joined session. AI integrity monitoring is active.');

    // Update browser URL to include meeting room ID
    if (window.history && window.history.pushState) {
      window.history.pushState({}, '', `/?room=${sessionData.sessionId}`);
    }

    try {
      const userStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(userStream);
    } catch {
      addLog('Camera or microphone permission was not granted.', 'warn');
    }
  };

  const startInstantMeeting = async () => {
    setError('');
    setJoining(true);
    try {
      const created = await api.createMeeting({
        title: `${identity?.name || 'User'}'s Instant Meeting`,
        candidateName: identity?.name || 'Participant'
      });
      const joined = await api.joinMeeting({
        sessionId: created.session.sessionId,
        participantName: identity?.name || 'Participant',
        role: 'candidate'
      });
      await joinSessionData({
        ...joined,
        authProvider: identity ? `Google Workspace (${identity.email})` : 'Meeting Access'
      });
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

  const joinByCode = async (code) => {
    if (!code || !code.trim()) return;
    setError('');
    setJoining(true);
    try {
      const joined = await api.joinMeeting({
        sessionId: code.trim(),
        participantName: identity?.name || 'Participant',
        role: 'candidate'
      });
      await joinSessionData({
        ...joined,
        authProvider: identity ? `Google Workspace (${identity.email})` : 'Meeting Access'
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  };

  const leaveMeeting = () => {
    if (window.confirm('Are you sure you want to leave this meeting?')) {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      setSession(null);
      setThreats([]);
      if (window.history && window.history.pushState) {
        window.history.pushState({}, '', '/');
      }
    }
  };

  const toggleMedia = kind => {
    if (!stream) return;
    const active = !media[kind];
    setMedia(old => ({ ...old, [kind]: active }));
    (kind === 'mic' ? stream.getAudioTracks() : stream.getVideoTracks()).forEach(track => {
      track.enabled = active;
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
      addLog('Screen sharing started.');
    } catch {}
  };

  const killActiveThreat = async (pid, hwnd) => {
    try {
      await api.killThreat({ pid, hwnd });
      setThreats(old => old.filter(t => t.pid !== pid));
      addLog(`Threat PID ${pid} terminated by host.`, 'system');
    } catch (err) {
      addLog(`Failed to terminate threat PID ${pid}: ${err.message}`, 'warn');
    }
  };

  const exportAudit = async () => {
    if (!session) return;
    const payload = {
      sessionTitle: session.title,
      sessionId: session.sessionId,
      candidate: session.participantName,
      role: session.role,
      authentication: session.authProvider,
      timestamp: new Date().toISOString(),
      finalTrustScore: `${trust}%`,
      activeThreatsDetected: threats,
      incidentLogs: logs
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
    killActiveThreat,
    exportAudit
  };
}
