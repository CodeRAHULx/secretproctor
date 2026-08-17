import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';

const initialChecks = [
  ['Display affinity', 'Clean', 'ok'],
  ['Tab focus', 'Focused', 'ok'],
  ['Clipboard', 'Normal', 'ok']
];

export function useTelemetry(session, addLog) {
  const [threats, setThreats] = useState([]);
  const [checks, setChecks] = useState(initialChecks);
  const [logs, setLogs] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const threatKey = useRef('');

  const trust = threats.length ? 35 : 100;

  // SSE Watchdog Telemetry Stream
  useEffect(() => {
    if (!session) return;
    const timer = setInterval(() => setElapsed((v) => v + 1), 1000);
    const source = new EventSource('/api/telemetry/stream');

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const detected = data.threats || [];
        const key = detected.map((item) => item.hwnd || item.pid).join(',');
        setThreats(detected);
        setChecks((old) =>
          old.map((check, index) =>
            index === 0
              ? [check[0], data.hasThreat ? 'Detected' : 'Clean', data.hasThreat ? 'fail' : 'ok']
              : check
          )
        );
        if (key && key !== threatKey.current && detected[0]) {
          addLog?.(`Threat detected: ${detected[0].title || detected[0].path || 'Stealth window'}`, 'alert');
        }
        threatKey.current = key;
      } catch {}
    };

    return () => {
      clearInterval(timer);
      source.close();
    };
  }, [session, addLog]);

  // Tab focus & paste protection
  useEffect(() => {
    if (!session) return;
    const focus = () => {
      const lost = document.hidden;
      setChecks((old) => old.map((check, i) => (i === 1 ? [check[0], lost ? 'Lost' : 'Focused', lost ? 'fail' : 'ok'] : check)));
      if (lost) addLog?.('Tab focus lost.', 'warn');
    };
    const paste = (event) => {
      const text = event.clipboardData?.getData('text') || '';
      if (text.length > 30) {
        setChecks((old) => old.map((check, i) => (i === 2 ? [check[0], 'Bulk paste', 'fail'] : check)));
        addLog?.(`Large paste detected (${text.length} characters).`, 'warn');
      }
    };
    document.addEventListener('visibilitychange', focus);
    document.addEventListener('paste', paste);
    return () => {
      document.removeEventListener('visibilitychange', focus);
      document.removeEventListener('paste', paste);
    };
  }, [session, addLog]);

  const killActiveThreat = useCallback(async (pid, hwnd) => {
    try {
      await api.killThreat({ pid, hwnd });
      setThreats((old) => old.filter((t) => t.pid !== pid));
      addLog?.(`Threat PID ${pid} terminated by host.`, 'system');
    } catch (err) {
      addLog?.(`Failed to terminate threat: ${err.message}`, 'warn');
    }
  }, [addLog]);

  const exportAudit = useCallback(async (extraData = {}) => {
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
      ...extraData
    };
    await api.saveAudit(payload).catch(() => {});
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `securemeet-audit-${session.sessionId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addLog?.('Audit report exported.', 'info');
  }, [session, trust, threats, logs, addLog]);

  return {
    threats,
    checks,
    logs,
    setLogs,
    elapsed,
    setElapsed,
    trust,
    killActiveThreat,
    exportAudit
  };
}
