import React from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MessageSquare,
  LayoutDashboard,
  Shield,
  PhoneOff,
  Sparkles
} from 'lucide-react';

export function MeetingDock({
  meeting,
  activeSidebar,
  onToggleSidebar
}) {
  // getDisplayMedia is not supported on iOS Safari or Android Chrome
  const canScreenShare = Boolean(navigator.mediaDevices?.getDisplayMedia);
  return (
    <footer className="meet-dock">
      <div className="dock-left">
        <span className="dock-user-info">
          {meeting.session?.participantName}
        </span>
      </div>

      <div className="dock-center">
        {/* Microphone */}
        <button
          className={`dock-btn ${!meeting.media.mic ? 'danger' : ''}`}
          onClick={() => meeting.toggleMedia('mic')}
          title={meeting.media.mic ? 'Turn off microphone' : 'Turn on microphone'}
          aria-label={meeting.media.mic ? 'Mute microphone' : 'Unmute microphone'}
        >
          {meeting.media.mic ? (
            <Mic size={20} strokeWidth={2} />
          ) : (
            <MicOff size={20} strokeWidth={2} />
          )}
        </button>

        {/* Camera */}
        <button
          className={`dock-btn ${!meeting.media.cam ? 'danger' : ''}`}
          onClick={() => meeting.toggleMedia('cam')}
          title={meeting.media.cam ? 'Turn off camera' : 'Turn on camera'}
          aria-label={meeting.media.cam ? 'Turn off camera' : 'Turn on camera'}
        >
          {meeting.media.cam ? (
            <Video size={20} strokeWidth={2} />
          ) : (
            <VideoOff size={20} strokeWidth={2} />
          )}
        </button>

        {/* Present Screen Share — hidden on mobile where it's unsupported */}
        {canScreenShare && (
          <button
            className={`dock-btn ${meeting.amSharing ? 'active' : ''}`}
            onClick={meeting.toggleShare}
            title={meeting.amSharing ? 'Stop presenting' : 'Present now'}
            aria-label="Present screen"
          >
            <MonitorUp size={20} strokeWidth={2} />
          </button>
        )}

        {/* Live Chat */}
        <button
          className={`dock-btn ${activeSidebar === 'chat' ? 'active' : ''}`}
          onClick={() => onToggleSidebar('chat')}
          title="In-call messages"
          aria-label="Chat messages"
        >
          <MessageSquare size={20} strokeWidth={2} />
          {meeting.messages.length > 0 && activeSidebar !== 'chat' && (
            <span className="dock-badge">
              {meeting.messages.length > 9 ? '9+' : meeting.messages.length}
            </span>
          )}
        </button>

        {/* Host Dashboard */}
        <button
          className={`dock-btn ${activeSidebar === 'host' ? 'active' : ''}`}
          onClick={() => onToggleSidebar('host')}
          title="Host Proctor Dashboard"
          aria-label="Host controls"
        >
          <LayoutDashboard size={20} strokeWidth={2} />
        </button>

        {/* Proctor Shield */}
        <button
          className={`dock-btn ${activeSidebar === 'guard' ? 'active' : ''}`}
          onClick={() => onToggleSidebar('guard')}
          title="Proctor Watchdog Panel"
          aria-label="Security watchdog"
        >
          <Shield size={20} strokeWidth={2} />
        </button>

        {/* End Call */}
        <button
          className="dock-btn end-call"
          onClick={meeting.leaveMeeting}
          title="Leave call"
          aria-label="Leave meeting"
        >
          <PhoneOff size={20} strokeWidth={2} />
        </button>
      </div>

      <div className="dock-right">
        {meeting.aiConfigured && (
          <button
            className="dock-icon-btn ai-memo-dock-btn"
            onClick={() => { meeting.generateMemo(); onToggleSidebar('chat'); }}
            title="Generate AI Meeting Memo"
            aria-label="Generate AI Memo"
          >
            <Sparkles size={18} strokeWidth={2} />
          </button>
        )}
      </div>
    </footer>
  );
}
