# SecureMeet Bug Analysis & Fix Plan

## Architecture Overview

### Current Identity Model
1. **Google User ID** (`auth.identity.id`) - Google OAuth sub
2. **Tab Client ID** (`clientId`) - Random UUID per browser tab (sessionStorage)
3. **Socket Connection** - SSE listener per tab
4. **Room Host ID** (`room.hostId`) - Currently set to tabClientId
5. **Creator ID** (`room.creatorId`) - Set during meeting creation
6. **Host Token** - Saved in sessionStorage for host verification

## ROOT CAUSE ANALYSIS

### BUG 1: Host sometimes does not receive admission requests

**Root Cause:**
- SSE listeners are registered per `userId` (line 386 meetingRoomService.js)
- When broadcasting knock requests, it broadcasts to ALL listeners in the room
- But the host's userId is the tabClientId, not a persistent user identity
- If the host has multiple tabs or reconnects, there's no guarantee the knock goes to the RIGHT connection

**The Problem:**
```javascript
// meetingRoomService.js line 200
this._broadcast(room.roomId, {
  type: 'knock_request',
  knock: knockRecord,
  knockQueue: this._knockList(room)
});
```

This broadcasts to ALL SSE connections in the room, but if the host hasn't established their SSE connection yet, OR if they're using a different tab, they won't receive it.

**Fix Required:**
- Need to broadcast knock_request ONLY to the host's active SSE connection(s)
- Track which SSE connections belong to the host
- Use room.hostId to filter and send directly to host connections

---

### BUG 2: Host refresh becomes a new participant

**Root Cause:**
The system confuses THREE different concepts:

1. **User Identity** (Google OAuth ID) - PERSISTENT across sessions
2. **Tab/Connection Identity** (tabClientId) - EPHEMERAL per tab
3. **Host Identity** (room.hostId) - Should be PERSISTENT, but is currently set to tabClientId

**The Critical Error:**
```javascript
// useMeeting.js line 32-39
const clientId = useMemo(() => {
  let tabId = sessionStorage.getItem('securemeet_tab_id');
  if (!tabId) {
    tabId = `tab_${crypto.randomUUID()}`;
    sessionStorage.setItem('securemeet_tab_id', tabId);
  }
  return tabId;
}, []);
```

This creates a NEW random ID on EVERY refresh because `sessionStorage` is cleared.

**What Happens:**
1. Host creates meeting with `clientId = tab_abc123`
2. `room.hostId = tab_abc123`
3. Host refreshes browser
4. NEW `clientId = tab_xyz789` is generated
5. Host tries to join with `clientId = tab_xyz789`
6. Server checks: `room.hostId === userId` → `tab_abc123 === tab_xyz789` → FALSE
7. Host is treated as a NEW participant and added to knock queue

**Fix Required:**
- Use GOOGLE USER ID as the persistent host identifier
- Keep tabClientId for WebRTC peer connection tracking only
- Separate concerns: userId (persistent) vs connectionId (ephemeral)

---

### BUG 3: Host leave behavior is incorrect

**Root Cause:**
```javascript
// useMeeting.js line 510
const leaveMeeting = useCallback(async () => {
  if (!window.confirm('Leave this meeting?')) return;
  // ... just leaves like any participant
```

No special host logic. No transfer. No end meeting option.

**Fix Required:**
- Detect if leaver is host
- Show modal with options:
  - Transfer host to another participant
  - End meeting for everyone
  - Cancel
- Implement host transfer logic on backend
- Implement end meeting logic (kick all participants)

---

### BUG 4: Screen sharing is black for remote participants

**Root Cause Investigation Needed:**

The architecture uses `replaceTrack()` which should work:
```javascript
// useWebRTC.js line 266
const replaceVideoTrack = useCallback(async (newTrack) => {
  const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
  if (videoSender) {
    await videoSender.replaceTrack(newTrack);
  }
```

**Potential Issues:**
1. Screen track might not be properly obtained from getDisplayMedia()
2. replaceTrack() might be failing silently
3. Remote ontrack handler might not be updating the video element correctly
4. The screen MediaStreamTrack might be in wrong state

**Testing Required:**
- Add extensive logging at each step
- Verify screen track has readyState === 'live'
- Verify replaceTrack() actually executes without errors
- Verify remote peer receives the track
- Verify remote video element srcObject is updated

---

## FIX IMPLEMENTATION PLAN

### Phase 1: Fix Identity Model (Fixes BUG 2)
1. Introduce `userId` separate from `tabClientId`
2. Use Google OAuth ID as persistent userId
3. Guest users get persistent userId from localStorage
4. Use userId for host identity
5. Use tabClientId only for WebRTC peer tracking

### Phase 2: Fix Admission Flow (Fixes BUG 1)
1. Track SSE listener ownership (userId → connectionId mapping)
2. Broadcast knock_request ONLY to host's connections
3. Handle host reconnection properly
4. Restore pending knocks when host reconnects

### Phase 3: Fix Host Leave (Fixes BUG 3)
1. Add host leave modal
2. Implement transfer host API
3. Implement end meeting API
4. Update frontend UI

### Phase 4: Fix Screen Share (Fixes BUG 4)
1. Add comprehensive logging
2. Test actual screen share flow
3. Identify exact failure point
4. Fix the issue

---

## PROPOSED ARCHITECTURE

### Identity Model
```
User {
  userId: string           // Persistent: Google sub OR localStorage guest ID
  name: string
  email: string
  picture: string
}

Connection {
  connectionId: string     // Ephemeral: tab session ID
  userId: string           // Links to User
  socketId: SSE listener   // Current connection
}

Room {
  roomId: string
  hostUserId: string       // PERSISTENT host identity (Google ID)
  creatorUserId: string
  hostToken: string
  participants: Map<userId, Participant>
  knockQueue: Map<userId, KnockRequest>
}

Participant {
  userId: string           // Persistent identity
  connectionId: string     // Current tab/session
  name, email, picture
  role: 'host' | 'participant'
  peerConnections: Map<connectionId, RTCPeerConnection>
}
```

### Join Flow
```
1. Browser loads → check auth → get userId
2. If Google authenticated: userId = Google sub
3. If guest: userId = localStorage persistent ID
4. Generate new tabClientId (connectionId) for this session
5. Send JOIN with { userId, connectionId, hostToken? }
6. Server checks: is this userId the hostUserId?
7. If yes → role = 'host', skip knock queue
8. If no → check knock queue or add to it
```

