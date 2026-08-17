export function SignInScreen({ meeting }) {
  const { googleSignIn, error } = meeting;

  return (
    <div className="signin-container">
      <div className="signin-card">
        <div className="meet-brand-center">
          <svg className="meet-logo-svg" viewBox="0 0 88 72" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M48 36L64 24V48L48 36Z" fill="#00AC47"/>
            <path d="M0 16C0 7.16344 7.16344 0 16 0H48V56C48 64.8366 40.8366 72 32 72H0V16Z" fill="#00832D"/>
            <path d="M0 16C0 7.16344 7.16344 0 16 0H48V20H0V16Z" fill="#2684FC"/>
            <path d="M0 20H48V52H0V20Z" fill="#0066DA"/>
            <path d="M0 52H48V72H16C7.16344 72 0 64.8366 0 56V52Z" fill="#00AC47"/>
            <path d="M48 20L68 5C70.6667 3 74 4.9 74 8.2V63.8C74 67.1 70.6667 69 68 67L48 52V20Z" fill="#FFBA00"/>
          </svg>
          <span className="brand-text">SecureMeet</span>
        </div>

        <h1 className="signin-title">Sign in</h1>
        <p className="signin-subtitle">to continue to SecureMeet Workspace</p>

        {error && <div className="signin-error">{error}</div>}

        <button className="google-signin-btn" onClick={googleSignIn} type="button">
          <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="signin-features">
          <div className="feature-pill">🛡️ Native Display Affinity Watchdog</div>
          <div className="feature-pill">⚡ Real-time Anti-Cheat Forensics</div>
          <div className="feature-pill">🔒 Encrypted WebRTC Conferencing</div>
        </div>

        <p className="signin-footer">
          Protected by SecureMeet Enterprise Integrity Guard.
        </p>
      </div>
    </div>
  );
}
