import React, { useState } from 'react';
import { VideoTile } from './VideoTile';
import { WaitingTile } from './WaitingTile';
import { ScreenShareView } from './ScreenShareView';

export function VideoGrid({ meeting, onCopyLink, linkCopied }) {
  const { participants, screenShareOwner, amSharing } = meeting;
  const threat = meeting.threats?.[0];
  const [pinnedId, setPinnedId] = useState(null);

  const remoteParticipants = participants.filter((p) => !p.isLocal);

  // 1. Screen Share Mode takes top priority
  if (screenShareOwner) {
    const sharerParticipant = participants.find((p) => p.userId === screenShareOwner);
    const presenterName = amSharing ? 'You' : (sharerParticipant?.name || 'Presenter');

    const shareStream = amSharing
      ? meeting.screenStream
      : (sharerParticipant?.stream || null);

    return (
      <ScreenShareView
        screenStream={shareStream}
        presenterName={presenterName}
        isLocal={amSharing}
        meeting={meeting}
      />
    );
  }

  // 2. Spotlight / Pinned Mode (Google Meet Style Focus)
  const pinnedParticipant = participants.find((p) => p.id === pinnedId || p.userId === pinnedId);

  if (pinnedParticipant && participants.length > 1) {
    const otherParticipants = participants.filter((p) => p.id !== pinnedParticipant.id && p.userId !== pinnedParticipant.userId);

    const pinnedInitials = (pinnedParticipant.name || '?')
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return (
      <div className="spotlight-stage-layout">
        {/* Main Featured Participant Stage */}
        <section className="spotlight-main-display">
          <VideoTile
            key={pinnedParticipant.id}
            name={pinnedParticipant.name}
            initials={pinnedInitials}
            picture={pinnedParticipant.picture}
            stream={pinnedParticipant.stream}
            muted={!pinnedParticipant.audioEnabled}
            camOff={!pinnedParticipant.videoEnabled}
            threatened={pinnedParticipant.isLocal && Boolean(threat)}
            isLocal={pinnedParticipant.isLocal}
            isHost={pinnedParticipant.role === 'host'}
            status={pinnedParticipant.status}
            isPinned={true}
            canPin={true}
            onPin={() => setPinnedId(null)}
            size="main"
          />
        </section>

        {/* Bottom Thumbnail Strip — Click any to swap into main stage */}
        <aside className="spotlight-thumbnail-strip">
          {otherParticipants.map((p) => {
            const initials = (p.name || '?')
              .split(' ')
              .map((w) => w[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();

            return (
              <div
                key={p.id}
                className="spotlight-thumb-wrapper"
                onClick={() => setPinnedId(p.id)}
                title={`Focus on ${p.name}`}
              >
                <VideoTile
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
                  isPinned={false}
                  canPin={true}
                  onPin={() => setPinnedId(p.id)}
                  size="small"
                />
              </div>
            );
          })}
        </aside>
      </div>
    );
  }

  // 3. Normal Adaptive Grid Mode
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
              isPinned={false}
              canPin={totalCount > 1}
              onPin={() => setPinnedId(p.id)}
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
