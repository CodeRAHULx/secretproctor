import React, { useState } from 'react';
import { MeetingTopbar } from './Topbar/MeetingTopbar';
import { VideoGrid } from './VideoGrid/VideoGrid';
import { ChatPanel } from './Chat/ChatPanel';
import { HostDashboard } from './Host/HostDashboard';
import { SecurityPanel } from '../security/SecurityPanel';
import { MeetingDock } from './Dock/MeetingDock';
import { Button } from '../common/Button';

export function MeetingWorkspace({ meeting }) {
  const [activeSidebar, setActiveSidebar] = useState(null); // 'guard' | 'chat' | 'host' | null
  const [guardTab, setGuardTab] = useState('detection');
  const [linkCopied, setLinkCopied] = useState(false);

  const threat = meeting.threats[0];

  const copyRoomLink = () => {
    const url = `${window.location.origin}/?room=${meeting.session?.sessionId}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 3000);
  };

  const handleToggleSidebar = (sidebarName) => {
    setActiveSidebar((prev) => (prev === sidebarName ? null : sidebarName));
  };

  return (
    <main className="workspace">
      {/* Top Header Bar */}
      <MeetingTopbar
        sessionId={meeting.session?.sessionId}
        elapsed={meeting.elapsed}
        threat={threat}
        trust={meeting.trust}
        aiConfigured={meeting.aiConfigured}
        onCopyLink={copyRoomLink}
        linkCopied={linkCopied}
        onToggleGuard={() => {
          handleToggleSidebar('guard');
          setGuardTab('detection');
        }}
        onToggleHostDashboard={() => handleToggleSidebar('host')}
      />

      {/* Main Workspace Stage & Sidebars */}
      <section className="workspace-content">
        <div className="stage-area">
          <VideoGrid
            meeting={meeting}
            onCopyLink={copyRoomLink}
            linkCopied={linkCopied}
          />
        </div>

        {/* Sidebar: Live Chat */}
        {activeSidebar === 'chat' && (
          <ChatPanel
            meeting={meeting}
            onClose={() => setActiveSidebar(null)}
          />
        )}

        {/* Sidebar: Host Proctor Dashboard */}
        {activeSidebar === 'host' && (
          <HostDashboard
            meeting={meeting}
            onClose={() => setActiveSidebar(null)}
          />
        )}

        {/* Sidebar: Proctor Watchdog Guard */}
        {activeSidebar === 'guard' && (
          <SecurityPanel
            tab={guardTab}
            setTab={setGuardTab}
            threat={threat}
            meeting={meeting}
            onClose={() => setActiveSidebar(null)}
          />
        )}
      </section>

      {/* Floating Admission Toast — host only */}
      {meeting.isHost && meeting.knockRequests.length > 0 && (
        <div className="admission-toast-container">
          {meeting.knockRequests.map((guest) => (
            <div className="admission-toast" key={guest.userId}>
              <div className="guest-info">
                {guest.picture ? (
                  <img src={guest.picture} alt={guest.name} className="guest-img" />
                ) : (
                  <div className="guest-initial">{(guest.name || 'G')[0].toUpperCase()}</div>
                )}
                <div>
                  <div className="guest-name">{guest.name}</div>
                  <div className="guest-email">wants to join this call</div>
                </div>
              </div>
              <div className="admission-actions">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => meeting.admitGuest(guest.userId, 'deny')}
                >
                  Deny
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => meeting.admitGuest(guest.userId, 'admit')}
                >
                  Admit
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Floating Control Dock */}
      <MeetingDock
        meeting={meeting}
        activeSidebar={activeSidebar}
        onToggleSidebar={handleToggleSidebar}
      />
    </main>
  );
}
