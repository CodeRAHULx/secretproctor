import React from 'react';
import { Button } from '../common/Button';
import { Video, Bot, Shield, MessageSquare, BarChart3, Zap } from 'lucide-react';

export function LandingPage({ onStartMeeting, onJoinMeeting, onSignIn }) {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-container">
          <div className="landing-logo">
            <div className="logo-mark">SM</div>
            <span className="logo-text">SecureMeet</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onSignIn}>
            Sign In
          </Button>
        </div>
      </header>

      <main className="landing-main">
        <div className="landing-container">
          <section className="hero-section">
            <h1 className="hero-title">
              Secure video meetings with AI-powered understanding
            </h1>
            <p className="hero-subtitle">
              Professional video conferencing with real-time AI assistance, automated meeting summaries,
              and advanced security monitoring for interviews, exams, and sensitive discussions.
            </p>
            <div className="hero-actions">
              <Button variant="primary" size="lg" onClick={onStartMeeting}>
                Start a meeting
              </Button>
              <Button variant="secondary" size="lg" onClick={onJoinMeeting}>
                Join with code
              </Button>
            </div>
          </section>

          <section className="features-section">
            <div className="feature-grid">
              <div className="feature-card">
                <div className="feature-icon">
                  <Video size={32} strokeWidth={1.5} />
                </div>
                <h3>HD Video Conferencing</h3>
                <p>Crystal-clear video and audio with adaptive quality, screen sharing, and real-time collaboration.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <Bot size={32} strokeWidth={1.5} />
                </div>
                <h3>AI Meeting Assistant</h3>
                <p>Automatic transcription, real-time translation, intelligent summaries, and contextual insights during calls.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <Shield size={32} strokeWidth={1.5} />
                </div>
                <h3>Security & Proctoring</h3>
                <p>Advanced monitoring for online exams and interviews with threat detection, audit logs, and compliance reporting.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <MessageSquare size={32} strokeWidth={1.5} />
                </div>
                <h3>Live Translation</h3>
                <p>Break language barriers with real-time message translation supporting 15+ languages.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <BarChart3 size={32} strokeWidth={1.5} />
                </div>
                <h3>Meeting Analytics</h3>
                <p>Detailed session reports, participant engagement metrics, and exportable audit trails.</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <Zap size={32} strokeWidth={1.5} />
                </div>
                <h3>Instant Access</h3>
                <p>No downloads required. Start or join meetings instantly from any modern browser.</p>
              </div>
            </div>
          </section>

          <section className="use-cases-section">
            <h2>Built for professionals</h2>
            <div className="use-case-list">
              <div className="use-case-item">
                <strong>Remote Interviews</strong>
                <span>Conduct professional interviews with recording, AI notes, and candidate assessment tools.</span>
              </div>
              <div className="use-case-item">
                <strong>Online Exams</strong>
                <span>Secure proctored testing with real-time monitoring, threat detection, and compliance logging.</span>
              </div>
              <div className="use-case-item">
                <strong>Team Meetings</strong>
                <span>Collaborate with teammates using HD video, screen sharing, and AI-generated meeting summaries.</span>
              </div>
              <div className="use-case-item">
                <strong>Client Calls</strong>
                <span>Professional client communication with translation, transcription, and automatic follow-up notes.</span>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="landing-footer">
        <div className="landing-container">
          <p>&copy; 2026 SecureMeet. Professional video conferencing with AI.</p>
        </div>
      </footer>
    </div>
  );
}
