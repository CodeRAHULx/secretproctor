import { useMeeting } from './hooks/useMeeting';
import { SignInScreen } from './components/auth/SignInScreen';
import { HomeScreen } from './components/home/HomeScreen';
import { MeetingWorkspace } from './components/meeting/MeetingWorkspace';

export default function App() {
  const meeting = useMeeting();

  if (meeting.authLoading) {
    return (
      <div className="meet-loading-screen">
        <svg className="meet-logo-pulse" viewBox="0 0 88 72" width="64" height="52" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M48 36L64 24V48L48 36Z" fill="#00AC47"/>
          <path d="M0 16C0 7.16344 7.16344 0 16 0H48V56C48 64.8366 40.8366 72 32 72H0V16Z" fill="#00832D"/>
          <path d="M0 16C0 7.16344 7.16344 0 16 0H48V20H0V16Z" fill="#2684FC"/>
          <path d="M0 20H48V52H0V20Z" fill="#0066DA"/>
          <path d="M0 52H48V72H16C7.16344 72 0 64.8366 0 56V52Z" fill="#00AC47"/>
          <path d="M48 20L68 5C70.6667 3 74 4.9 74 8.2V63.8C74 67.1 70.6667 69 68 67L48 52V20Z" fill="#FFBA00"/>
        </svg>
        <div className="loading-spinner" />
      </div>
    );
  }

  // If not authenticated with Google -> Sign In Screen
  if (!meeting.identity) {
    return <SignInScreen meeting={meeting} />;
  }

  // If authenticated and in meeting -> Meeting Workspace
  if (meeting.session) {
    return <MeetingWorkspace meeting={meeting} />;
  }

  // If authenticated and not in meeting -> Google Meet Home Screen
  return <HomeScreen meeting={meeting} />;
}
