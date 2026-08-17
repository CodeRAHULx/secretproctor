import { useMeeting } from './hooks/useMeeting';
import { SignInScreen } from './components/auth/SignInScreen';
import { HomeScreen } from './components/home/HomeScreen';
import { MeetingWorkspace } from './components/meeting/MeetingWorkspace';

export default function App() {
  const meeting = useMeeting();

  if (meeting.authLoading) {
    return (
      <div className="meet-loading-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  // Not authenticated with Google
  if (!meeting.identity) {
    return <SignInScreen meeting={meeting} />;
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
