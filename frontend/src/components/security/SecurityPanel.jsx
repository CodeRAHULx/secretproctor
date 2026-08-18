import React from 'react';
import {
  X,
  Zap,
  Check,
  AlertCircle,
  FileText,
  Download,
  Shield,
  Clock,
  Info
} from 'lucide-react';

function DetectionTab({ threat, checks, onKillThreat }) {
  return (
    <div className="guard-body">
      <section className={`status-card ${threat ? 'danger-card' : ''}`}>
        <div className="status-header">
          <span className={`status-pulse ${threat ? 'pulse-red' : 'pulse-green'}`} />
          <b>{threat ? 'Hidden Window (Evasion) Detected' : 'Display Feed Verified Clean'}</b>
        </div>
        <span>{threat ? 'Process using WDA_EXCLUDEFROMCAPTURE to evade capture.' : 'Continuous display affinity scanner active (1000ms polling).'}</span>
      </section>

      {threat && (
        <section className="incident">
          <div className="incident-badge">CRITICAL EVASION SIGNAL</div>
          <h3>{threat.path?.split('\\').pop() || 'Stealth Process'}</h3>
          <dl>
            <dt>PID</dt>
            <dd><code>{threat.pid}</code></dd>
            <dt>Window</dt>
            <dd>{threat.title || 'Untitled / Hidden Window'}</dd>
            <dt>Affinity</dt>
            <dd><code>{threat.flag || threat.affinity || 'WDA_EXCLUDEFROMCAPTURE'}</code></dd>
            <dt>Path</dt>
            <dd className="incident-path">{threat.path || 'Unknown location'}</dd>
          </dl>

          <button
            className="btn-terminate-threat"
            onClick={() => onKillThreat(threat.pid, threat.hwnd)}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Zap size={14} strokeWidth={2} />
            <span>Terminate Cheat Process</span>
          </button>
        </section>
      )}

      <h4>Client Integrity Signals</h4>
      <div className="checks-list">
        {checks.map(([name, value, state]) => (
          <div className={`check-item ${state}`} key={name}>
            <span className="check-icon">
              {state === 'ok' ? (
                <Check size={14} strokeWidth={2.5} />
              ) : (
                <AlertCircle size={14} strokeWidth={2.5} />
              )}
            </span>
            <span className="check-name">{name}</span>
            <strong className="check-val">{value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityTab({ logs, clear, exportAudit }) {
  return (
    <div className="guard-body activity">
      <div className="activity-head">
        <div>
          <h4>Event Timeline</h4>
          <small>Continuous tamper & integrity logs</small>
        </div>
        {logs.length > 0 && <button className="btn-clear-logs" onClick={clear}>Clear</button>}
      </div>

      <div className="logs-container">
        {logs.length ? (
          logs.map(item => (
            <div className={`log-entry ${item.level}`} key={item.id}>
              <time>{item.at}</time>
              <span>{item.message}</span>
            </div>
          ))
        ) : (
          <p className="empty-logs">No security incidents logged in this session.</p>
        )}
      </div>

      <button
        className="btn-export-audit"
        onClick={exportAudit}
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
      >
        <Download size={14} strokeWidth={2} />
        <span>Export Forensic Audit Report (JSON)</span>
      </button>
    </div>
  );
}

function SessionTab({ meeting }) {
  return (
    <div className="guard-body summary">
      <div className="summary-card">
        <span>Active User</span>
        <b>{meeting.session.participantName}</b>
        <small>{meeting.session.participantEmail || 'Authenticated Session'}</small>
      </div>

      <div className="summary-card">
        <span>Meeting Code</span>
        <b><code>{meeting.session.sessionId}</code></b>
      </div>

      <div className="summary-card">
        <span>Security Layer</span>
        <b>Native Win32 Display Affinity Hook</b>
        <small>Real-time protection against invisible overlay windows.</small>
      </div>
    </div>
  );
}

export function SecurityPanel({ tab, setTab, threat, meeting, onClose }) {
  const tabs = [
    ['detection', 'Shield'],
    ['activity', `Timeline (${meeting.logs.length})`],
    ['session', 'Details']
  ];

  return (
    <aside className="guard-panel">
      <header className="guard-header">
        <div>
          <p className="guard-eyebrow">INTEGRITY SHIELD</p>
          <h2 className="guard-title">Session Guard</h2>
        </div>
        <button onClick={onClose} className="btn-close-guard" aria-label="Close panel">
          <X size={18} strokeWidth={2} />
        </button>
      </header>

      <nav className="guard-nav">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            className={`guard-tab-btn ${tab === key ? 'active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      {tab === 'detection' && (
        <DetectionTab
          threat={threat}
          checks={meeting.checks}
          onKillThreat={meeting.killActiveThreat}
        />
      )}

      {tab === 'activity' && (
        <ActivityTab
          logs={meeting.logs}
          clear={() => meeting.setLogs([])}
          exportAudit={meeting.exportAudit}
        />
      )}

      {tab === 'session' && (
        <SessionTab meeting={meeting} />
      )}
    </aside>
  );
}
