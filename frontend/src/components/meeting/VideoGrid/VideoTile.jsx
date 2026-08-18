import React, { useRef, useEffect } from 'react';
import { Avatar } from '../../common/Avatar';
import { Mic, MicOff, Star, AlertTriangle, Pin, PinOff } from 'lucide-react';

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
  isPinned = false,
  canPin = true,
  onPin = null,
  onClick = null,
  status = 'CONNECTED',
  size = 'normal' // 'normal' | 'small' | 'main'
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
  const hasLiveVideoTrack = Boolean(
    stream &&
    stream.getVideoTracks().length > 0 &&
    stream.getVideoTracks().some((t) => t.readyState === 'live' && t.enabled)
  );

  // For remote participants camOff comes from server-broadcast state
  const showVideo = !camOff && hasLiveVideoTrack;

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    } else if (onPin) {
      onPin();
    }
  };

  return (
    <article
      onClick={handleClick}
      className={[
        'video-tile',
        threatened ? 'threatened' : '',
        !showVideo ? 'cam-off' : '',
        isPinned ? 'is-pinned' : '',
        `size-${size}`,
        isLocal ? 'is-local' : '',
        isScreenShare ? 'is-screenshare' : '',
        (onClick || onPin) ? 'is-clickable' : ''
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
            size={size === 'small' ? 'md' : (size === 'main' ? 'xl' : 'lg')}
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

      {/* Pin / Unpin Overlay Action Button */}
      {canPin && onPin && (
        <button
          className={`tile-pin-btn ${isPinned ? 'pinned' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onPin();
          }}
          title={isPinned ? 'Unpin from main' : 'Pin to main stage'}
          aria-label={isPinned ? 'Unpin participant' : 'Pin participant'}
        >
          {isPinned ? <PinOff size={16} strokeWidth={2} /> : <Pin size={16} strokeWidth={2} />}
        </button>
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
