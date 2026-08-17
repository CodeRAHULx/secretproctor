import React from 'react';
import { Button } from '../../common/Button';

const formatElapsed = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export function MeetingTopbar({
  sessionId,
  elapsed,
  threat,
  trust,
  aiConfigured,
  onCopyLink,
  linkCopied,
  onToggleGuard,
  onToggleHostDashboard
}) {
  return (
    <header className="meet-workspace-topbar">
      <div className="topbar-left">
        <div className="workspace-meeting-info">
          <span className="workspace-code">{sessionId}</span>
          <Button variant="ghost" size="sm" onClick={onCopyLink} className="btn-copy-topbar">
            {linkCopied ? '✓ Copied' : 'Copy link'}
          </Button>
        </div>
      </div>

      <div className="topbar-center">
        <div className="workspace-timer">{formatElapsed(elapsed)}</div>
      </div>

      <div className="topbar-right">
        {aiConfigured && (
          <span className="ai-badge" title="Gemini AI & Real-time translation active">
            ✨ AI Active
          </span>
        )}

        <button
          className="btn-host-dashboard-top"
          onClick={onToggleHostDashboard}
          title="Open Host Proctor Dashboard"
        >
          📊 Dashboard
        </button>

        <button
          className={`proctor-tool-badge ${threat ? 'threat-active' : 'normal'}`}
          onClick={onToggleGuard}
          title="Click to view watchdog telemetry"
        >
          <span className="proctor-status-dot" />
          <span>{threat ? 'Threat Detected' : 'Proctor Active'}</span>
          <strong>{trust}%</strong>
        </button>
      </div>
    </header>
  );
}
