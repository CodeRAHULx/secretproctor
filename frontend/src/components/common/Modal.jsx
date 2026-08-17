import React, { useEffect } from 'react';

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = '500px',
  className = ''
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="c-modal-overlay" onClick={onClose}>
      <div
        className={`c-modal-container ${className}`}
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="c-modal-header">
          <h3 className="c-modal-title">{title}</h3>
          <button className="c-modal-close" onClick={onClose} aria-label="Close modal">
            ×
          </button>
        </div>
        <div className="c-modal-content">{children}</div>
      </div>
    </div>
  );
}
