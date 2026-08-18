import React, { useState, useEffect, useRef } from 'react';
import {
  Link,
  Video,
  Shield,
  Plus,
  LogOut,
  Keyboard,
  X,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check
} from 'lucide-react';

const carouselSlides = [
  {
    title: "Get a link you can share",
    desc: "Click New meeting to get a link you can send to people you want to meet with.",
    icon: Link
  },
  {
    title: "Background Proctor & Watchdog",
    desc: "Silently monitors display affinity (WDA_EXCLUDEFROMCAPTURE) and tab integrity.",
    icon: Shield
  },
  {
    title: "Your meeting is protected",
    desc: "Enterprise integrity monitoring ensures tamper-proof technical evaluations.",
    icon: Video
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

  const CurrentSlideIcon = carouselSlides[slideIndex].icon;

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
                  <LogOut size={16} strokeWidth={2} />
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
                <Video size={18} strokeWidth={2} />
                <span>New meeting</span>
              </button>

              {newMeetingDropdown && (
                <div className="new-meeting-dropdown">
                  <button className="dropdown-item" onClick={handleCreateLater}>
                    <Link size={18} strokeWidth={2} />
                    <div>
                      <div className="item-title">Create a meeting for later</div>
                      <div className="item-desc">Generate a join code and shareable link</div>
                    </div>
                  </button>

                  <button className="dropdown-item" onClick={handleInstant}>
                    <Plus size={18} strokeWidth={2} />
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
                <Keyboard size={18} strokeWidth={2} className="keyboard-icon" />
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
                <span className="created-badge">
                  <Check size={14} strokeWidth={2.5} style={{ marginRight: '4px' }} />
                  Meeting Created
                </span>
                <button className="btn-close-created" onClick={() => setCreatedSession(null)} aria-label="Close">
                  <X size={16} strokeWidth={2} />
                </button>
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
                  {copied ? (
                    <>
                      <Check size={14} strokeWidth={2.5} />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} strokeWidth={2} />
                      <span>Copy link</span>
                    </>
                  )}
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
                <CurrentSlideIcon size={56} strokeWidth={1.5} className="carousel-icon-large" />
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
                <ChevronLeft size={20} strokeWidth={2} />
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
                <ChevronRight size={20} strokeWidth={2} />
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
