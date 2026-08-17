import React from 'react';

export function Avatar({
  src = null,
  name = 'User',
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  status = null, // 'online' | 'offline' | 'threat' | null
  className = ''
}) {
  const initials = (name || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={`c-avatar c-avatar-${size} ${className}`}>
      {src ? (
        <img src={src} alt={name} className="c-avatar-img" />
      ) : (
        <div className="c-avatar-initials">{initials}</div>
      )}
      {status && <span className={`c-avatar-status c-avatar-status-${status}`} />}
    </div>
  );
}

export function Badge({
  children,
  variant = 'info', // 'success' | 'danger' | 'warning' | 'info' | 'purple'
  dot = false,
  className = ''
}) {
  return (
    <span className={`c-badge c-badge-${variant} ${className}`}>
      {dot && <span className="c-badge-dot" />}
      {children}
    </span>
  );
}
