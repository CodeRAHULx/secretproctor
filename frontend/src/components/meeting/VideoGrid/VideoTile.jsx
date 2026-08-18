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
    if (!videoRef.current) return;
    if (stream && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
    } else if (!stream) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  // Show video only if: stream exists AND camera is not toggled off AND has a live video track
  const hasLiveVideoTrack = stream &&
    stream.getVideoTracks().length > 0 &&
    stream.getVideoTracks().some((t) => t.readyState === 'live' && t.enabled);

  // For remote participants camOff comes from server-broadcast state.
  // We also check actual track state as a fallback for when server update is missed.
  const showVideo = !camOff && hasLiveVideoTrack;

  return (
    <article
      className={[
        'video-tile',
        threatened ? 'threatened' : '',
        !showVideo ? 'cam-off' : '',
        `size-${size}`,
        isLocal ? 'is-local' : '',
        isScreenShare ? 'is-screenshare' : ''
      ].filter(Boolean).join(' ')}
    >
      {/* Active Video Stream — always mounted so srcObject assignment works */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        style={{
          display: showVideo ? 'block' : 'none',
          width: '100%',
          height: '100%',
          objectFit: isScreenShare ? 'contain' : 'cover',
          borderRadius: 'inherit'
        }}
      />

      {/* Avatar shown when camera is off or stream not available */}
      {!showVideo && (
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

      {/* Connecting overlay */}
      {status === 'CONNECTING' && (
        <div className="connecting-overlay">
          <span className="connecting-spinner" />
          <span>Connecting...</span>
        </div>
      )}

      {/* Footer name + mic badge */}
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

      {/* Threat ribbon */}
      {threatened && (
        <div className="threat-banner">
          <AlertTriangle size={16} />
          <span>Proctor Threat Detected</span>
        </div>
      )}
    </article>
  );
}
