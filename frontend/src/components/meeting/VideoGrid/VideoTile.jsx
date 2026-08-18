import React, { useRef, useEffect } from 'react';
import { Avatar } from '../../common/Avatar';
import { Mic, MicOff, Star, AlertTriangle } from 'lucide-react';

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
  status = 'CONNECTED',
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
      {/* Active Video Stream */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`tile-video ${hasVideo ? 'visible' : 'hidden'}`}
      />

      {/* Avatar Display when Camera is Inactive */}
      {!hasVideo && (
        <div className="avatar-center-wrapper">
          <Avatar
            src={picture}
            name={name}
            size={size === 'small' ? 'md' : 'xl'}
            status={threatened ? 'threat' : (status === 'CONNECTED' ? 'online' : 'away')}
          />
          <div className="tile-avatar-label">
            {name}{isLocal && ' (You)'}
          </div>
        </div>
      )}

      {/* Status Connecting Banner */}
      {status === 'CONNECTING' && (
        <div className="connecting-overlay">
          <span className="connecting-spinner" />
          <span>Connecting...</span>
        </div>
      )}

      {/* Footer Info Overlay */}
      <footer className="tile-footer">
        <span className="tile-name">
          {name}{isLocal && ' (You)'}
          {isHost && (
            <span className="host-badge" title="Meeting Host">
              <Star size={14} strokeWidth={2} fill="currentColor" />
            </span>
          )}
        </span>
        <span className={`tile-mic-badge ${muted ? 'off' : 'on'}`} title={muted ? 'Microphone muted' : 'Microphone active'}>
          {muted ? <MicOff size={16} /> : <Mic size={16} />}
        </span>
      </footer>

      {/* Threat Alert Ribbon */}
      {threatened && (
        <div className="threat-banner">
          <AlertTriangle size={16} />
          <span>Proctor Threat Detected</span>
        </div>
      )}
    </article>
  );
}
