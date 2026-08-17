import React from 'react';

export function MeetingDock({
  meeting,
  activeSidebar,
  onToggleSidebar
}) {
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
        >
          {meeting.media.mic ? (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l4.07 4.07c-1.38.72-2.99 1.14-4.72 1.14-3.02-.43-5.42-2.78-5.91-5.78-.1-.6.39-1.14 1-1.14.49 0 .9.36.98.85C8.48 15.8 10.53 17.6 13 17.6c1.19 0 2.29-.44 3.14-1.17l3.59 3.59 1.27-1.27L4.27 3z" />
            </svg>
          )}
        </button>

        {/* Camera */}
        <button
          className={`dock-btn ${!meeting.media.cam ? 'danger' : ''}`}
          onClick={() => meeting.toggleMedia('cam')}
          title={meeting.media.cam ? 'Turn off camera' : 'Turn on camera'}
        >
          {meeting.media.cam ? (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
              <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.55-.18L19.73 21 21 19.73 3.27 2zM5 16V8h1.73l8 8H5z" />
            </svg>
          )}
        </button>

        {/* Present Screen Share */}
        <button
          className={`dock-btn ${meeting.amSharing ? 'active' : ''}`}
          onClick={meeting.toggleShare}
          title={meeting.amSharing ? 'Stop presenting' : 'Present now'}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.11-.9-2-2-2H4c-1.11 0-2 .89-2 2v10c0 1.1.89 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6zm5 8l3-3 3 3h-2v2h-2v-2H9z" />
          </svg>
        </button>

        {/* Live Chat */}
        <button
          className={`dock-btn ${activeSidebar === 'chat' ? 'active' : ''}`}
          onClick={() => onToggleSidebar('chat')}
          title="In-call messages"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
          </svg>
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
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
          </svg>
        </button>

        {/* Proctor Shield */}
        <button
          className={`dock-btn ${activeSidebar === 'guard' ? 'active' : ''}`}
          onClick={() => onToggleSidebar('guard')}
          title="Proctor Watchdog Panel"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
          </svg>
        </button>

        {/* End Call */}
        <button
          className="dock-btn end-call"
          onClick={meeting.leaveMeeting}
          title="Leave call"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
          </svg>
        </button>
      </div>

      <div className="dock-right">
        {meeting.aiConfigured && (
          <button
            className="dock-icon-btn ai-memo-dock-btn"
            onClick={() => { meeting.generateMemo(); onToggleSidebar('chat'); }}
            title="Generate AI Meeting Memo"
          >
            ✨
          </button>
        )}
      </div>
    </footer>
  );
}
