import React from 'react';
import { VideoTile } from './VideoTile';
import { WaitingTile } from './WaitingTile';
import { ScreenShareView } from './ScreenShareView';

export function VideoGrid({ meeting, onCopyLink, linkCopied }) {
  const remotePeerIds = Object.keys(meeting.remoteStreams || {});
  const threat = meeting.threats?.[0];

  // Screen share logic — server-authoritative
  const { screenShareOwner, tabClientId, amSharing } = meeting;
  const someoneIsSharing = Boolean(screenShareOwner);
  const remoteSharerStream = screenShareOwner && screenShareOwner !== tabClientId
    ? meeting.remoteStreams?.[screenShareOwner]
    : null;

  // Show screen share layout when:
  // (a) we are sharing our own screen, OR
  // (b) a remote participant is sharing (and we received their stream)
  if (someoneIsSharing && (amSharing || remoteSharerStream)) {
    const shareStream = amSharing ? meeting.screenStream : remoteSharerStream;
    const sharerParticipant = amSharing
      ? { name: meeting.session?.participantName || 'You' }
      : meeting.participants?.find((p) => p.id === screenShareOwner);
    const presenterName = sharerParticipant?.name || 'Presenter';

    return (
      <ScreenShareView
        screenStream={shareStream}
        presenterName={presenterName}
        isLocal={amSharing}
        meeting={meeting}
      />
    );
  }

  const hasRemotePeers = remotePeerIds.length > 0;
  const gridClass = hasRemotePeers
    ? `video-grid multi-peer peers-${remotePeerIds.length + 1}`
    : 'video-grid solo';

  return (
    <div className={gridClass}>
      {/* Local video */}
      <VideoTile
        name={meeting.session?.participantName || meeting.identity?.name || 'You'}
        initials={meeting.initials}
        picture={meeting.identity?.picture}
        stream={meeting.stream}
        muted={!meeting.media?.mic}
        camOff={!meeting.media?.cam}
        threatened={Boolean(threat)}
        isLocal={true}
        isHost={meeting.isHost}
      />

      {/* Remote peers */}
      {hasRemotePeers ? (
        remotePeerIds.map((peerId) => {
          const participant = meeting.participants?.find((p) => p.id === peerId);
          const peerName = participant?.name || 'Participant';
          const peerInitials = peerName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
          const peerStream = meeting.remoteStreams[peerId];
          const camOff = !peerStream || peerStream.getVideoTracks().every((t) => !t.enabled);
          return (
            <VideoTile
              key={peerId}
              name={peerName}
              initials={peerInitials}
              picture={participant?.picture}
              stream={peerStream}
              muted={false}
              camOff={camOff}
              threatened={false}
              isLocal={false}
              isHost={participant?.role === 'host'}
            />
          );
        })
      ) : (
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
