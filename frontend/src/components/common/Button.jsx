import React from 'react';

export function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon'
  size = 'md',        // 'sm' | 'md' | 'lg'
  disabled = false,
  loading = false,
  onClick,
  className = '',
  type = 'button',
  title = '',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      title={title}
      className={`c-btn c-btn-${variant} c-btn-${size} ${loading ? 'c-btn-loading' : ''} ${className}`}
      {...props}
    >
      {loading ? <span className="c-btn-spinner" /> : children}
    </button>
  );
}
