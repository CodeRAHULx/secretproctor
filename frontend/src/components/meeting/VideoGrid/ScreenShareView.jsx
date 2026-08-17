import React from 'react';
import { VideoTile } from './VideoTile';

export function ScreenShareView({
  screenStream,
  presenterName = 'Presenter',
  meeting
}) {
  const remotePeerIds = Object.keys(meeting.remoteStreams || {});

  return (
    <div className="screenshare-stage-layout">
      {/* Large 75% Presenter Screen Display */}
      <div className="screenshare-main-display">
        <VideoTile
          name={`${presenterName}'s Screen`}
          stream={screenStream}
          muted={true}
          camOff={false}
          isScreenShare={true}
          isLocal={false}
        />
      </div>

      {/* Participant Thumbnail Strip */}
      <div className="screenshare-thumbnail-strip">
        {/* Local Participant Thumbnail */}
        <VideoTile
          name={meeting.session?.participantName || 'You'}
          initials={meeting.initials}
          picture={meeting.identity?.picture}
          stream={meeting.stream}
          muted={!meeting.media.mic}
          camOff={!meeting.media.cam}
          threatened={meeting.threats.length > 0}
          isLocal={true}
          size="small"
        />

        {/* Remote Participants Thumbnails */}
        {remotePeerIds.map((peerId) => {
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
              size="small"
            />
          );
        })}
      </div>
    </div>
  );
}
