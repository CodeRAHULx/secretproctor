import { useMeeting } from './hooks/useMeeting';
import { JoinScreen } from './components/join/JoinScreen';
import { MeetingWorkspace } from './components/meeting/MeetingWorkspace';

export default function App() {
  const meeting = useMeeting();

  return (
    <div className="app-container">
      {!meeting.session ? (
        <JoinScreen meeting={meeting} />
      ) : (
        <MeetingWorkspace meeting={meeting} />
      )}
    </div>
  );
}
