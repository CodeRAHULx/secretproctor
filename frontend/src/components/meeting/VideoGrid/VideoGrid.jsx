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
    const shareStream = amSharing
      ? meeting.screenStream
      : (meeting.remoteStreams?.[screenShareOwner] || sharerParticipant?.stream);

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

      {/* When waiting alone in room */}
      {remoteParticipants.length === 0 && (
        <WaitingTile
          sessionId={meeting.session?.sessionId}
          onCopyLink={onCopyLink}
          linkCopied={linkCopied}
          aiConfigured={meeting.aiConfigured}
        />
      )}
    </div>
  );
}
