import React, { useRef, useEffect } from 'react';
import { VideoTile } from './VideoTile';

export function ScreenShareView({ screenStream, presenterName = 'Presenter', isLocal, meeting }) {
  const screenVideoRef = useRef(null);

  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  const remotePeerIds = Object.keys(meeting.remoteStreams || {});

  return (
    <div className="screenshare-stage-layout">
      {/* Large presenter area */}
      <div className="screenshare-main-display">
        <div className="screenshare-video-wrapper">
          <video
            ref={screenVideoRef}
            autoPlay
            playsInline
            muted={isLocal}
            className="screenshare-video-el"
          />
          <div className="screenshare-presenter-label">
            {isLocal ? '📤 You are presenting' : `🖥️ ${presenterName}'s screen`}
          </div>
        </div>
      </div>

      {/* Participant thumbnail strip */}
      <div className="screenshare-thumbnail-strip">
        {/* Local self thumbnail */}
        <VideoTile
          name={meeting.session?.participantName || 'You'}
          initials={meeting.initials}
          picture={meeting.identity?.picture}
          stream={meeting.stream}
          muted={!meeting.media?.mic}
          camOff={!meeting.media?.cam}
          threatened={meeting.threats?.length > 0}
          isLocal={true}
          isHost={meeting.isHost}
          size="small"
        />

        {/* Remote participants */}
        {remotePeerIds.map((peerId) => {
          // Skip the screen-share owner's cam tile — their screen is in the main view
          if (!isLocal && peerId === meeting.screenShareOwner) return null;
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
              size="small"
            />
          );
        })}
      </div>
    </div>
  );
}
