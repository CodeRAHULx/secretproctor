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
  isHost = false,
  isScreenShare = false,
  size = 'normal' // 'normal' | 'small'
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
    }
  }, [stream]);

  const hasVideo = stream && !camOff && stream.getVideoTracks().length > 0;

  return (
    <article
      className={[
        'video-tile',
        threatened ? 'threatened' : '',
        !hasVideo ? 'cam-off' : '',
        `size-${size}`,
        isLocal ? 'is-local' : '',
        isScreenShare ? 'is-screenshare' : ''
      ].filter(Boolean).join(' ')}
    >
      {/* Video element — always mounted, hidden when cam is off */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`tile-video ${hasVideo ? 'visible' : 'hidden'}`}
      />

      {/* Avatar fallback when camera is off */}
      {!hasVideo && (
        <div className="avatar-center-wrapper">
          <Avatar
            src={picture}
            name={name}
            size={size === 'small' ? 'md' : 'xl'}
            status={threatened ? 'threat' : 'online'}
          />
          <div className="tile-avatar-label">{name}{isLocal && ' (You)'}</div>
        </div>
      )}

      {/* Footer overlay */}
      <footer className="tile-footer">
        <span className="tile-name">
          {name}{isLocal && ' (You)'}
          {isHost && <span className="host-badge" title="Host"> ⭐</span>}
        </span>
        <span className={`tile-mic-badge ${muted ? 'off' : 'on'}`}>
          {muted ? '🎤✗' : '🎤'}
        </span>
      </footer>

      {/* Threat indicator */}
      {threatened && (
        <div className="threat-banner">⚠ Security Alert</div>
      )}
    </article>
  );
}
