import React from 'react';
import { Card } from '../../common/Card';
import { Badge } from '../../common/Badge';
import { Button } from '../../common/Button';
import { Avatar } from '../../common/Avatar';
import {
  X,
  AlertTriangle,
  Zap,
  Users,
  ShieldCheck,
  Download,
  Activity,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export function HostDashboard({ meeting, onClose }) {
  const threatCount = meeting.threats.length;
  const participantCount = meeting.participants.length + 1; // remote + local

  return (
    <aside className="sidebar-drawer host-dashboard-drawer">
      <div className="sidebar-drawer-header">
        <div className="dashboard-title-box">
          <span className="dashboard-eyebrow">HOST PROCTOR COMMAND CENTER</span>
          <h2 className="sidebar-drawer-title">Live Evaluation Oversight</h2>
        </div>
        <button className="btn-close-drawer" onClick={onClose} aria-label="Close dashboard">
          <X size={18} strokeWidth={2} />
        </button>
      </div>

      <div className="host-dashboard-body">
        {/* Metrics Grid */}
        <div className="host-metrics-grid">
          <div className="metric-box">
            <span className="metric-label">TRUST SCORE</span>
            <strong className={`metric-value ${meeting.trust < 70 ? 'danger' : 'success'}`}>
              {meeting.trust}%
            </strong>
          </div>
          <div className="metric-box">
            <span className="metric-label">PARTICIPANTS</span>
            <strong className="metric-value">{participantCount}</strong>
          </div>
          <div className="metric-box">
            <span className="metric-label">ACTIVE THREATS</span>
            <strong className={`metric-value ${threatCount > 0 ? 'danger' : 'safe'}`}>
              {threatCount}
            </strong>
          </div>
          <div className="metric-box">
            <span className="metric-label">WATCHDOG</span>
            <strong className="metric-value success">Active</strong>
          </div>
        </div>

        {/* Active Threats Timeline */}
        {threatCount > 0 && (
          <div className="dashboard-section threats-section">
            <div className="section-head">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--gm-red)' }}>
                <AlertTriangle size={18} strokeWidth={2} />
                Active Cheat / Stealth Detections
              </h3>
              <Badge variant="danger">{threatCount} detected</Badge>
            </div>
            {meeting.threats.map((threat, idx) => (
              <div className="dashboard-threat-card" key={idx}>
                <div className="threat-card-top">
                  <span className="threat-title">{threat.title || 'Stealth Overlay Detected'}</span>
                  <Badge variant="danger">{threat.severity || 'CRITICAL'}</Badge>
                </div>
                <div className="threat-meta">
                  <span><strong>PID:</strong> {threat.pid}</span>
                  <span><strong>HWND:</strong> {threat.hwnd}</span>
                  <span><strong>Affinity:</strong> {threat.affinityHex || '0x11'}</span>
                </div>
                <p className="threat-desc">
                  {threat.details || 'Window using WDA_EXCLUDEFROMCAPTURE to hide content from screen sharing/recording.'}
                </p>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => meeting.killActiveThreat(threat.pid, threat.hwnd)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Zap size={14} strokeWidth={2} />
                  <span>Terminate Cheat Process</span>
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Participants Roster */}
        <div className="dashboard-section">
          <div className="section-head">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={18} strokeWidth={2} />
              Connected Participants
            </h3>
            <span className="section-count">{participantCount}</span>
          </div>

          <div className="participant-roster">
            {/* Host (Local) */}
            <div className="roster-item">
              <Avatar
                src={meeting.identity?.picture}
                name={meeting.session?.participantName || 'Host'}
                size="sm"
                status="online"
              />
              <div className="roster-info">
                <span className="roster-name">{meeting.session?.participantName || 'You'} (Host)</span>
                <span className="roster-email">{meeting.identity?.email || 'Local'}</span>
              </div>
              <Badge variant="purple">Host</Badge>
            </div>

            {/* Remote Participants */}
            {meeting.participants.map((p) => (
              <div className="roster-item" key={p.id}>
                <Avatar src={p.picture} name={p.name} size="sm" status="online" />
                <div className="roster-info">
                  <span className="roster-name">{p.name}</span>
                  <span className="roster-email">{p.email || 'Candidate'}</span>
                </div>
                <Badge variant={p.role === 'host' ? 'purple' : 'info'}>
                  {p.role || 'Candidate'}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Waiting for Admission */}
        {meeting.knockRequests.length > 0 && (
          <div className="dashboard-section">
            <div className="section-head">
              <h3>Waiting for Admission</h3>
              <Badge variant="warning">{meeting.knockRequests.length}</Badge>
            </div>
            <div className="knock-requests-list">
              {meeting.knockRequests.map((guest) => (
                <div className="knock-request-item" key={guest.id}>
                  <div className="guest-info">
                    <div className="guest-avatar">
                      {guest.picture ? (
                        <img src={guest.picture} alt={guest.name} />
                      ) : (
                        <div className="avatar-placeholder">{guest.name?.[0] || '?'}</div>
                      )}
                    </div>
                    <div className="guest-details">
                      <span className="guest-name">{guest.name}</span>
                      <span className="guest-timestamp">Waiting to join</span>
                    </div>
                  </div>
                  <div className="admit-actions">
                    <Button variant="danger" size="sm" onClick={() => meeting.admitGuest(guest.id, 'deny')}>Deny</Button>
                    <Button variant="primary" size="sm" onClick={() => meeting.admitGuest(guest.id, 'admit')}>Admit</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* System & Environmental Integrity Checks */}
        <div className="dashboard-section">
          <div className="section-head">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={18} strokeWidth={2} />
              Real-Time Integrity Checks
            </h3>
          </div>
          <div className="dashboard-checks-list">
            {meeting.checks.map(([name, status, state], idx) => (
              <div className={`dashboard-check-item state-${state}`} key={idx}>
                <span className="check-name">{name}</span>
                <span className="check-status-badge">{status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions Footer */}
        <div className="dashboard-actions-footer">
          <Button
            variant="secondary"
            onClick={meeting.exportAudit}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', width: '100%', justifyContent: 'center' }}
          >
            <Download size={16} strokeWidth={2} />
            <span>Export Forensic Audit Report (.JSON)</span>
          </Button>
        </div>
      </div>
    </aside>
  );
}
