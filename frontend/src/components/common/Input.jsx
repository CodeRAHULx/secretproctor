import React from 'react';

export function Input({
  value,
  onChange,
  placeholder = '',
  type = 'text',
  icon = null,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <div className={`c-input-wrapper ${icon ? 'has-icon' : ''} ${className}`}>
      {icon && <span className="c-input-icon">{icon}</span>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="c-input"
        {...props}
      />
    </div>
  );
}
