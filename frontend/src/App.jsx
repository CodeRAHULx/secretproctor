import { useState } from 'react';
import { useMeeting } from './hooks/useMeeting';
import { LandingPage } from './components/home/LandingPage';
import { SignInScreen } from './components/auth/SignInScreen';
import { HomeScreen } from './components/home/HomeScreen';
import { MeetingWorkspace } from './components/meeting/MeetingWorkspace';

export default function App() {
  const meeting = useMeeting();
  const [showAuth, setShowAuth] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);

  if (meeting.authLoading) {
    return (
      <div className="meet-loading-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  // Not authenticated - show landing page
  if (!meeting.identity) {
    if (showAuth) {
      return <SignInScreen meeting={meeting} onBack={() => setShowAuth(false)} />;
    }

    return (
      <LandingPage
        onStartMeeting={() => setShowAuth(true)}
        onJoinMeeting={() => setShowAuth(true)}
        onSignIn={() => setShowAuth(true)}
      />
    );
  }

  // Waiting for host to admit
  if (meeting.waitingForAdmission) {
    return (
      <div className="waiting-room-screen">
        <div className="waiting-room-card">
          <div className="waiting-spinner" />
          <h2>Asking to be let in...</h2>
          <p>You'll join the call when the host lets you in.</p>
          <button className="btn-cancel-waiting" onClick={meeting.leaveMeeting}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Denied by host
  if (meeting.deniedAdmission) {
    return (
      <div className="waiting-room-screen">
        <div className="waiting-room-card">
          <div className="denied-icon">🚫</div>
          <h2>You can't join this call</h2>
          <p>The meeting host has denied your request to join.</p>
          <button className="btn-cancel-waiting" onClick={meeting.leaveMeeting}>
            Return to home screen
          </button>
        </div>
      </div>
    );
  }

  // Active Meeting
  if (meeting.session) {
    return <MeetingWorkspace meeting={meeting} />;
  }

  // Home Screen
  return <HomeScreen meeting={meeting} />;
}
