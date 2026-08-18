import React from 'react';
import { VideoTile } from './VideoTile';
import { WaitingTile } from './WaitingTile';
import { ScreenShareView } from './ScreenShareView';

export function VideoGrid({ meeting, onCopyLink, linkCopied }) {
  const { participants, screenShareOwner, tabClientId, amSharing } = meeting;
  const threat = meeting.threats?.[0];

  const remoteParticipants = participants.filter((p) => !p.isLocal);
  const localParticipant = participants.find((p) => p.isLocal) || {
    name: meeting.session?.participantName || 'You',
    initials: meeting.initials,
    stream: meeting.stream,
    audioEnabled: meeting.media?.mic,
    videoEnabled: meeting.media?.cam,
    role: meeting.isHost ? 'host' : 'participant',
    isLocal: true
  };

  // Screen share view active when presenter exists
  if (screenShareOwner) {
    const sharerParticipant = participants.find((p) => p.id === screenShareOwner);
    const presenterName = amSharing ? 'You' : (sharerParticipant?.name || 'Presenter');

    // Get the actual screen share stream - DO NOT fall back to camera stream
    const shareStream = amSharing
      ? meeting.screenStream
      : meeting.remoteStreams?.[screenShareOwner];

    return (
      <ScreenShareView
        screenStream={shareStream}
        presenterName={presenterName}
        isLocal={amSharing}
        meeting={meeting}
      />
    );
  }

  // Normal Grid Mode
  const totalCount = participants.length;
  let layoutClass = 'video-grid layout-solo';
  if (totalCount === 2) {
    layoutClass = 'video-grid layout-duo';
  } else if (totalCount >= 3) {
    layoutClass = `video-grid layout-multi count-${totalCount}`;
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div className={layoutClass}>
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
            />
          );
        })}
      </div>

      {/* When waiting alone in room - overlay at bottom center */}
      {remoteParticipants.length === 0 && (
        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          maxWidth: '500px',
          width: '90%'
        }}>
          <WaitingTile
            sessionId={meeting.session?.sessionId}
            onCopyLink={onCopyLink}
            linkCopied={linkCopied}
            aiConfigured={meeting.aiConfigured}
          />
        </div>
      )}
    </div>
  );
}
