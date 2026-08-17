import React from 'react';

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
