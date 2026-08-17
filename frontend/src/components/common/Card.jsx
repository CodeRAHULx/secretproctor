import React from 'react';

export function Card({
  children,
  className = '',
  title = null,
  subtitle = null,
  action = null,
  ...props
}) {
  return (
    <div className={`c-card ${className}`} {...props}>
      {(title || action) && (
        <div className="c-card-header">
          <div>
            {title && <h3 className="c-card-title">{title}</h3>}
            {subtitle && <p className="c-card-subtitle">{subtitle}</p>}
          </div>
          {action && <div className="c-card-action">{action}</div>}
        </div>
      )}
      <div className="c-card-body">{children}</div>
    </div>
  );
}
