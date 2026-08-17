import React, { useRef, useEffect } from 'react';
import { Avatar } from '../../common/Avatar';

export function VideoTile({
  name,
  initials,
  picture,
  stream,
  muted = false,
  camOff = false,
  threatened = false,
  isLocal = false,
  isScreenShare = false,
  size = 'normal' // 'normal' | 'small'
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, camOff]);

  const showVideo = stream && !camOff;

  return (
    <article className={`video-tile ${threatened ? 'threatened' : ''} ${!showVideo ? 'cam-off' : ''} size-${size}`}>
      {showVideo ? (
        <video ref={videoRef} autoPlay playsInline muted={isLocal} className={isScreenShare ? 'screenshare-video' : ''} />
      ) : (
        <div className="avatar-center-wrapper">
          <Avatar src={picture} name={name} size={size === 'small' ? 'md' : 'xl'} status={threatened ? 'threat' : 'online'} />
          <div className="tile-avatar-label">{name}</div>
        </div>
      )}
      <footer className="tile-footer">
        <span className="tile-name">{name}{isLocal && ' (You)'}</span>
        <span className={`tile-mic-badge ${muted ? 'off' : 'on'}`}>
          {muted ? '🎤✗' : '🎤'}
        </span>
      </footer>
    </article>
  );
}
