import React from 'react';
import { VideoTile } from './VideoTile';
import { WaitingTile } from './WaitingTile';
import { ScreenShareView } from './ScreenShareView';

export function VideoGrid({
  meeting,
  onCopyLink,
  linkCopied
}) {
  const remotePeerIds = Object.keys(meeting.remoteStreams || {});
  const hasRemotePeers = remotePeerIds.length > 0;
  const threat = meeting.threats[0];

  // If local or remote screen share is active, render ScreenShareView
  if (meeting.screenStream) {
    return (
      <ScreenShareView
        screenStream={meeting.screenStream}
        presenterName={meeting.session?.participantName || 'You'}
        meeting={meeting}
      />
    );
  }

  return (
    <div className={`video-grid ${hasRemotePeers ? 'multi-peer' : ''}`}>
      {/* Local Video Tile */}
      <VideoTile
        name={meeting.session?.participantName || meeting.identity?.name || 'You'}
        initials={meeting.initials}
        picture={meeting.identity?.picture}
        stream={meeting.stream}
        muted={!meeting.media.mic}
        camOff={!meeting.media.cam}
        threatened={Boolean(threat)}
        isLocal={true}
      />

      {/* Remote WebRTC Peer Tiles */}
      {hasRemotePeers ? (
        remotePeerIds.map((peerId) => {
          const participant = meeting.participants.find((p) => p.id === peerId);
          const peerName = participant?.name || 'Participant';
          const peerInitials = peerName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
          const peerStream = meeting.remoteStreams[peerId];
          return (
            <VideoTile
              key={peerId}
              name={peerName}
              initials={peerInitials}
              picture={participant?.picture}
              stream={peerStream}
              muted={false}
              camOff={!peerStream || peerStream.getVideoTracks().every((t) => !t.enabled)}
              threatened={false}
              isLocal={false}
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
