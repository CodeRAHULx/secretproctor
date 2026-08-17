import { useState, useEffect, useRef } from 'react';

const carouselSlides = [
  {
    title: "Get a link you can share",
    desc: "Click New meeting to get a link you can send to people you want to meet with.",
    icon: "🔗"
  },
  {
    title: "AI & Display-Affinity Shielded",
    desc: "Background watchdog detects stealth windows (WDA_EXCLUDEFROMCAPTURE) in real-time.",
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
  const [createdModal, setCreatedModal] = useState(null);
  const [copied, setCopied] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [timeStr, setTimeStr] = useState('');
  const menuRef = useRef(null);
  const dropdownRef = useRef(null);

  // Live clock and date formatted like Google Meet (e.g. 10:30 AM • Mon, Aug 17)
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
    const code = await createMeetingForLater();
    if (code) {
      const url = `${window.location.origin}/?room=${code}`;
      setCreatedModal({ code, url });
      setCopied(false);
    }
  };

  const handleInstant = () => {
    setNewMeetingDropdown(false);
    startInstantMeeting();
  };

  const copyToClipboard = () => {
    if (!createdModal) return;
    navigator.clipboard.writeText(createdModal.url || createdModal.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="meet-home">
      {/* Google Meet Top App Bar */}
      <header className="meet-appbar">
        <div className="meet-appbar-left">
          <div className="meet-logo">
            <svg className="meet-logo-svg" viewBox="0 0 88 72" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M48 36L64 24V48L48 36Z" fill="#00AC47"/>
              <path d="M0 16C0 7.16344 7.16344 0 16 0H48V56C48 64.8366 40.8366 72 32 72H0V16Z" fill="#00832D"/>
              <path d="M0 16C0 7.16344 7.16344 0 16 0H48V20H0V16Z" fill="#2684FC"/>
              <path d="M0 20H48V52H0V20Z" fill="#0066DA"/>
              <path d="M0 52H48V72H16C7.16344 72 0 64.8366 0 56V52Z" fill="#00AC47"/>
              <path d="M48 20L68 5C70.6667 3 74 4.9 74 8.2V63.8C74 67.1 70.6667 69 68 67L48 52V20Z" fill="#FFBA00"/>
            </svg>
            <span className="meet-logo-text">Google Meet</span>
          </div>
        </div>

        <div className="meet-appbar-right">
          <span className="meet-clock">{timeStr}</span>

          <div className="meet-icon-btn" title="Support & Information">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"/>
            </svg>
          </div>

          <div className="meet-icon-btn" title="Settings">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
          </div>

          {/* User Account Avatar & Dropdown */}
          <div className="account-menu-wrapper" ref={menuRef}>
            <button
              className="user-avatar-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              title={`${identity?.name || 'Google Account'} (${identity?.email || ''})`}
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
                    <div className="account-name">{identity?.name || 'Google User'}</div>
                    <div className="account-email">{identity?.email || ''}</div>
                  </div>
                </div>

                <div className="account-dropdown-divider" />

                <div className="account-shield-status">
                  <span className="shield-dot" />
                  <span>SecureMeet Enterprise Active</span>
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
        {/* Left Column - Action Controls */}
        <section className="meet-hero-left">
          <h1 className="meet-hero-title">
            Video calls and meetings for everyone
          </h1>
          <p className="meet-hero-desc">
            Connect, collaborate, and conduct integrity-shielded technical evaluations from anywhere.
          </p>

          {error && <div className="meet-error-banner">{error}</div>}

          <div className="meet-actions-row">
            {/* New Meeting Dropdown */}
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
                      <div className="item-desc">Get a link you can share with participants</div>
                    </div>
                  </button>

                  <button className="dropdown-item" onClick={handleInstant}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                    <div>
                      <div className="item-title">Start an instant meeting</div>
                      <div className="item-desc">Join immediately with watchdog protection</div>
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

          <div className="meet-divider-line" />

          <div className="meet-info-link">
            <a href="#features" onClick={(e) => { e.preventDefault(); setSlideIndex(1); }}>
              Learn more
            </a>
            <span> about SecureMeet AI display shielding and proctoring features</span>
          </div>
        </section>

        {/* Right Column - Google Meet Visual Carousel */}
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

      {/* Modal: Create meeting for later */}
      {createdModal && (
        <div className="meet-modal-backdrop" onClick={() => setCreatedModal(null)}>
          <div className="meet-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Here's the link to your meeting</h2>
              <button className="modal-close-btn" onClick={() => setCreatedModal(null)}>×</button>
            </div>

            <p className="modal-text">
              Copy this link and send it to people you want to meet with. Be sure to save it so you can use it later, too.
            </p>

            <div className="modal-copy-box">
              <span className="modal-link-text">{createdModal.url || createdModal.code}</span>
              <button className="btn-copy" onClick={copyToClipboard} title="Copy meeting link">
                {copied ? (
                  <span className="copied-tag">✓ Copied</span>
                ) : (
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                  </svg>
                )}
              </button>
            </div>

            <div className="modal-actions">
              <button
                className="btn-join-modal"
                onClick={() => {
                  const code = createdModal.code;
                  setCreatedModal(null);
                  joinByCode(code);
                }}
              >
                Join now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
