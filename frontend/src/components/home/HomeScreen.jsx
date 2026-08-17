import { useState, useEffect, useRef } from 'react';

const carouselSlides = [
  {
    title: "Get a link you can share",
    desc: "Click New meeting to get a link you can send to people you want to meet with.",
    icon: "🔗"
  },
  {
    title: "Background Proctor & Watchdog",
    desc: "Silently monitors display affinity (WDA_EXCLUDEFROMCAPTURE) and tab integrity.",
    icon: "🛡️"
  },
  {
    title: "Your meeting is protected",
    desc: "Enterprise integrity monitoring ensures tamper-proof technical evaluations.",
    icon: "🔒"
  }
];

export function HomeScreen({ meeting }) {
  const { identity, logout, startInstantMeeting, createMeetingForLater, joinByCode, joining, error, setError } = meeting;
  const [meetingInput, setMeetingInput] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [newMeetingDropdown, setNewMeetingDropdown] = useState(false);
  const [createdSession, setCreatedSession] = useState(null);
  const [copied, setCopied] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [timeStr, setTimeStr] = useState('');
  const menuRef = useRef(null);
  const dropdownRef = useRef(null);

  // Live clock and date
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const date = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
      setTimeStr(`${time} • ${date}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setNewMeetingDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleJoin = (e) => {
    e?.preventDefault();
    if (!meetingInput.trim()) return;
    joinByCode(meetingInput.trim());
  };

  const handleCreateLater = async () => {
    setNewMeetingDropdown(false);
    setError('');
    const code = await createMeetingForLater();
    if (code) {
      const url = `${window.location.origin}/?room=${code}`;
      setCreatedSession({ code, url });
      setCopied(false);
    }
  };

  const handleInstant = () => {
    setNewMeetingDropdown(false);
    startInstantMeeting();
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="meet-home">
      {/* Top App Bar */}
      <header className="meet-appbar">
        <div className="meet-appbar-left">
          <div className="meet-logo">
            <span className="meet-logo-text">Google Meet</span>
          </div>
        </div>

        <div className="meet-appbar-right">
          <span className="meet-clock">{timeStr}</span>

          {/* User Account Avatar & Dropdown */}
          <div className="account-menu-wrapper" ref={menuRef}>
            <button
              className="user-avatar-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              title={`${identity?.name || 'Account'} (${identity?.email || ''})`}
            >
              {identity?.picture ? (
                <img src={identity.picture} alt={identity.name} className="user-avatar-img" />
              ) : (
                <div className="user-avatar-initial">
                  {(identity?.name || identity?.email || 'U')[0].toUpperCase()}
                </div>
              )}
            </button>

            {menuOpen && (
              <div className="account-dropdown">
                <div className="account-dropdown-header">
                  {identity?.picture ? (
                    <img src={identity.picture} alt={identity.name} className="account-img-large" />
                  ) : (
                    <div className="account-initial-large">
                      {(identity?.name || identity?.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="account-info">
                    <div className="account-name">{identity?.name || 'User'}</div>
                    <div className="account-email">{identity?.email || ''}</div>
                  </div>
                </div>

                <div className="account-dropdown-divider" />

                <div className="account-shield-status">
                  <span className="shield-dot" />
                  <span>Proctoring Watchdog Ready</span>
                </div>

                <div className="account-dropdown-divider" />

                <button className="account-signout-btn" onClick={logout}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                  </svg>
                  <span>Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Home Content */}
      <main className="meet-main-grid">
        {/* Left Column */}
        <section className="meet-hero-left">
          <h1 className="meet-hero-title">
            Video calls and meetings for everyone
          </h1>
          <p className="meet-hero-desc">
            Connect, collaborate, and conduct secure technical evaluations from anywhere.
          </p>

          {error && <div className="meet-error-banner">{error}</div>}

          {/* Action Row */}
          <div className="meet-actions-row">
            <div className="new-meeting-container" ref={dropdownRef}>
              <button
                className="btn-new-meeting"
                onClick={() => setNewMeetingDropdown(!newMeetingDropdown)}
                disabled={joining}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                </svg>
                <span>New meeting</span>
              </button>

              {newMeetingDropdown && (
                <div className="new-meeting-dropdown">
                  <button className="dropdown-item" onClick={handleCreateLater}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                      <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
                    </svg>
                    <div>
                      <div className="item-title">Create a meeting for later</div>
                      <div className="item-desc">Generate a join code and shareable link</div>
                    </div>
                  </button>

                  <button className="dropdown-item" onClick={handleInstant}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                    <div>
                      <div className="item-title">Start an instant meeting</div>
                      <div className="item-desc">Join immediately with background proctoring</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Code / Link input & Join button */}
            <form className="meet-join-form" onSubmit={handleJoin}>
              <div className="meet-input-wrapper">
                <svg className="keyboard-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z"/>
                </svg>
                <input
                  type="text"
                  className="meet-code-input"
                  placeholder="Enter a code or link"
                  value={meetingInput}
                  onChange={(e) => setMeetingInput(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className={`btn-join ${meetingInput.trim().length >= 3 ? 'active' : ''}`}
                disabled={meetingInput.trim().length < 3 || joining}
              >
                {joining ? 'Joining...' : 'Join'}
              </button>
            </form>
          </div>

          {/* Dedicated Section: Generated Meeting Details (when created for later) */}
          {createdSession && (
            <div className="created-meeting-section">
              <div className="created-meeting-header">
                <span className="created-badge">✓ Meeting Created</span>
                <button className="btn-close-created" onClick={() => setCreatedSession(null)}>×</button>
              </div>

              <div className="created-code-row">
                <div className="code-display">
                  <span className="code-label">Meeting Code:</span>
                  <strong className="code-value">{createdSession.code}</strong>
                </div>

                <button
                  className="btn-copy-code"
                  onClick={() => copyToClipboard(createdSession.url || createdSession.code)}
                >
                  {copied ? '✓ Copied' : 'Copy link'}
                </button>
              </div>

              <p className="created-link-preview">{createdSession.url}</p>

              <div className="created-actions">
                <button
                  className="btn-join-created"
                  onClick={() => joinByCode(createdSession.code)}
                >
                  Join meeting now
                </button>
              </div>
            </div>
          )}

          <div className="meet-divider-line" />

          <div className="meet-info-link">
            <span>Background display-affinity proctor watchdog is active for all sessions.</span>
          </div>
        </section>

        {/* Right Column - Visual Carousel */}
        <section className="meet-hero-right">
          <div className="carousel-card">
            <div className="carousel-illustration">
              <div className="illustration-circle">
                <span className="carousel-icon-large">{carouselSlides[slideIndex].icon}</span>
              </div>
            </div>

            <h3 className="carousel-title">{carouselSlides[slideIndex].title}</h3>
            <p className="carousel-desc">{carouselSlides[slideIndex].desc}</p>

            <div className="carousel-controls">
              <button
                className="carousel-arrow"
                onClick={() => setSlideIndex((slideIndex - 1 + carouselSlides.length) % carouselSlides.length)}
                aria-label="Previous slide"
              >
                ‹
              </button>

              <div className="carousel-dots">
                {carouselSlides.map((_, i) => (
                  <span
                    key={i}
                    className={`carousel-dot ${i === slideIndex ? 'active' : ''}`}
                    onClick={() => setSlideIndex(i)}
                  />
                ))}
              </div>

              <button
                className="carousel-arrow"
                onClick={() => setSlideIndex((slideIndex + 1) % carouselSlides.length)}
                aria-label="Next slide"
              >
                ›
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
