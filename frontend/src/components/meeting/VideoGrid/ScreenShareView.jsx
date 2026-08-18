import React, { useRef, useEffect } from 'react';
import { VideoTile } from './VideoTile';
import { MonitorUp } from 'lucide-react';

export function ScreenShareView({ screenStream, presenterName = 'Presenter', isLocal = false, meeting }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && screenStream) {
      videoRef.current.srcObject = screenStream;
      const tracks = screenStream.getTracks();
      console.log('[ScreenShareView]', presenterName, '- Screen stream assigned. Tracks:', tracks.map(t => `${t.kind} (enabled: ${t.enabled}, readyState: ${t.readyState}, label: ${t.label})`).join(', '));
    } else if (videoRef.current && !screenStream) {
      console.warn('[ScreenShareView]', presenterName, '- No screen stream available!');
      videoRef.current.srcObject = null;
    }
  }, [screenStream, presenterName]);

  const { participants, threats } = meeting;
  const threat = threats?.[0];

  return (
    <div className="screenshare-stage-layout">
      {/* 1. Large Main Screen Share Viewport */}
      <section className="screenshare-main-display">
        <div className="screenshare-video-wrapper">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal}
            className="screenshare-video-el"
          />
          <div className="screenshare-presenter-label">
            <MonitorUp size={16} strokeWidth={2} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
            <span>{isLocal ? 'You are presenting to everyone' : `${presenterName} is presenting`}</span>
          </div>
        </div>
      </section>

      {/* 2. Participant Thumbnail Strip */}
      <aside className="screenshare-thumbnail-strip">
        {participants.map((p) => {
          const initials = (p.name || '?')
            .split(' ')
            .map((w) => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();

          return (
            <VideoTile
              key={p.id}
              name={p.name}
              initials={initials}
              picture={p.picture}
              stream={p.stream}
              muted={!p.audioEnabled}
              camOff={!p.videoEnabled}
              threatened={p.isLocal && Boolean(threat)}
              isLocal={p.isLocal}
              isHost={p.role === 'host'}
              status={p.status}
              size="small"
            />
          );
        })}
      </aside>
    </div>
  );
}
