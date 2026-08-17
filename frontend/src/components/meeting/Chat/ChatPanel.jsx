import React, { useState, useRef, useEffect } from 'react';
import { SUPPORTED_LANGUAGES } from '../../../hooks/useAI';
import { Button } from '../../common/Button';
import { Input } from '../../common/Input';

export function ChatPanel({ meeting, onClose }) {
  const [text, setText] = useState('');
  const [memoOpen, setMemoOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [meeting.messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    meeting.sendChatMessage(text.trim());
    setText('');
    inputRef.current?.focus();
  };

  return (
    <aside className="sidebar-drawer chat-drawer">
      <div className="sidebar-drawer-header">
        <span className="sidebar-drawer-title">
          In-call messages {meeting.messages.length > 0 && <span className="msg-count">{meeting.messages.length}</span>}
        </span>
        <button className="btn-close-drawer" onClick={onClose} aria-label="Close chat">×</button>
      </div>

      <div className="chat-panel">
        {/* Top Controls & Language Selector */}
        <div className="chat-header">
          <div className="chat-header-top">
            <span className="chat-header-title">Live Chat</span>
            {meeting.aiConfigured && (
              <Button
                variant="primary"
                size="sm"
                className={`btn-ai-memo ${meeting.memoLoading ? 'loading' : ''}`}
                onClick={() => { meeting.generateMemo(); setMemoOpen(true); }}
                disabled={meeting.memoLoading}
              >
                {meeting.memoLoading ? '⏳ Generating...' : '✨ AI Memo'}
              </Button>
            )}
          </div>

          <div className="chat-translate-bar">
            <label className="translate-toggle">
              <input
                type="checkbox"
                checked={meeting.translateEnabled}
                onChange={(e) => meeting.setTranslateEnabled(e.target.checked)}
              />
              <span>🌐 Translate to:</span>
            </label>
            <select
              className="lang-select"
              value={meeting.myLanguage}
              onChange={(e) => meeting.setMyLanguage(e.target.value)}
              disabled={!meeting.translateEnabled}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>
          <p className="chat-subtext">Messages visible to everyone in this call.</p>
        </div>

        {/* AI Memo Accordion / Box */}
        {memoOpen && (
          <div className="ai-memo-panel">
            <div className="ai-memo-header">
              <span>✨ AI Meeting Memo & Action Items</span>
              <button onClick={() => { setMemoOpen(false); meeting.setAiMemo(null); }}>×</button>
            </div>
            <div className="ai-memo-body">
              {meeting.memoLoading && (
                <div className="ai-memo-loading">
                  <div className="ai-spinner" /> Summarizing call transcript with Gemini...
                </div>
              )}
              {meeting.aiMemo?.error && (
                <div className="ai-memo-error">{meeting.aiMemo.error}</div>
              )}
              {meeting.aiMemo?.memo && (
                <div className="ai-memo-content">
                  <pre className="ai-memo-text">{meeting.aiMemo.memo}</pre>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="btn-copy-memo"
                    onClick={() => navigator.clipboard.writeText(meeting.aiMemo.memo)}
                  >
                    Copy memo
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Message Stream */}
        <div className="chat-messages-list">
          {meeting.messages.length === 0 ? (
            <div className="empty-chat">
              <span>💬</span>
              <p>No messages yet. Send a message to start the conversation!</p>
              {meeting.aiConfigured && meeting.translateEnabled && (
                <p className="translate-hint">🌐 Messages will be translated to {meeting.myLanguage}</p>
              )}
            </div>
          ) : (
            meeting.messages.map((msg) => (
              <div className="chat-msg-item" key={msg.id}>
                <div className="chat-msg-header">
                  <span className="chat-sender">{msg.senderName}</span>
                  <time className="chat-time">{msg.timestamp}</time>
                  {meeting.aiConfigured && (
                    <button
                      className={`btn-translate-msg ${meeting.translatedMap[msg.id] ? 'active' : ''}`}
                      onClick={() => meeting.toggleTranslateMessage(msg, meeting.myLanguage)}
                      title={`Translate to ${meeting.myLanguage}`}
                      disabled={meeting.translating[msg.id]}
                    >
                      {meeting.translating[msg.id] ? '...' : '🌐'}
                    </button>
                  )}
                </div>
                <p className="chat-text">{msg.text}</p>
                {meeting.translatedMap[msg.id] && (
                  <div className="chat-translated">
                    <span className="translated-label">→ {meeting.myLanguage}</span>
                    <p className="translated-text">{meeting.translatedMap[msg.id]}</p>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Form */}
        <form className="chat-input-form" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className="chat-input"
            placeholder="Send a message to everyone"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            type="submit"
            className="btn-send-chat"
            disabled={!text.trim()}
            title="Send message"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </form>
      </div>
    </aside>
  );
}
