# SecureMeet Testing Guide

## Fixed Issues

### 1. **Persistent Meeting State** ✅
- Meeting state now lives on the server in `meetingRoomService`
- Server is authoritative for: hostId, participants, admission status, media states

### 2. **Stable User Identity** ✅
- Users now have stable IDs that persist across page refresh
- Priority: Google ID → Persistent sessionStorage ID → Generated ID
- No more random `tab_xxx` IDs that change on every refresh

### 3. **Host Identity Survives Refresh** ✅
- Host identity stored on meeting creation with `hostToken`
- Host reconnection properly recognized by server
- Host does NOT see "Ask to join" after refresh

### 4. **Participant Reconnection** ✅
- Existing admitted participants remain admitted after refresh
- Server distinguishes RECONNECT vs NEW JOIN
- `participant_reconnected` event triggers WebRTC re-establishment

### 5. **Media State Synchronization** ✅
- Audio/video states broadcast via server SSE
- All participants see correct mute/camera-off indicators
- Media state updates propagate immediately

### 6. **Camera Off Behavior** ✅
- Camera off shows avatar/initials/name placeholder
- No black video rectangles
- Proper VideoTile component rendering

### 7. **Screen Sharing** ✅
- Screen share replaces video track via `replaceVideoTrack()`
- Meeting UI remains visible (not replaced by shared content)
- Proper layout: large share view + participant thumbnails
- Browser native "Stop sharing" button properly detected

### 8. **Responsive Layout** ✅
- Adaptive grid based on participant count
- Mobile/tablet responsive breakpoints
- Proper aspect ratios (16:9)
- Screen share layout adapts to viewport

## Testing Scenarios

### Test 1: Host Refresh
```
1. User A creates meeting → becomes HOST
2. User A refreshes browser
Expected: A reconnects as HOST, no "Ask to join" screen
```

### Test 2: Participant Refresh
```
1. Host creates meeting
2. User B joins → Host admits B
3. B refreshes browser
Expected: B reconnects as admitted participant, remains in call
```

### Test 3: New Join While Host Disconnected
```
1. Host creates meeting, joins
2. Host refreshes (temporarily disconnected)
3. User C tries to join
Expected: C sees "Waiting for host", cannot self-admit
4. Host reconnects
Expected: Host sees C's join request, can admit/deny
```

### Test 4: Media State Sync
```
1. A and B in call
2. B turns camera OFF
Expected: A sees B's avatar/name, no black rectangle
3. B turns mic OFF
Expected: A sees muted indicator on B's tile
4. B turns camera ON
Expected: A sees B's video stream again
```

### Test 5: Screen Share
```
1. A starts screen sharing (select browser tab/window/screen)
Expected:
  - A stays on SecureMeet interface
  - A sees "You are presenting"
  - B sees shared content in large viewport
  - Participants shown as thumbnails below
2. A stops sharing
Expected: Layout returns to normal grid
```

### Test 6: Multi-Participant Grid
```
1. Host creates meeting
2. 2 participants join → duo layout (2 columns)
3. 3rd joins → multi layout (2x2 grid)
4. 4th joins → 2x2 grid
5. 5+ join → adaptive grid with 3+ columns
Expected: Layout adapts smoothly, faces remain visible
```

### Test 7: Responsive Behavior
```
1. Start meeting on desktop
2. Resize browser to tablet width
Expected: Grid adapts, controls remain accessible
3. Resize to mobile width
Expected: Single column layout, media controls visible
```

### Test 8: Host Controls
```
1. Participant A tries to admit someone
Expected: Warning "Only the host can admit participants"
2. Host admits/denies requests
Expected: Works correctly
```

## Running Tests

```bash
# Terminal 1: Backend
cd backend
npm start

# Terminal 2: Frontend
cd frontend
npm run dev

# Open browsers:
# Browser 1 (Host): http://localhost:5173
# Browser 2 (Participant): http://localhost:5173 (incognito)
# Browser 3 (Participant): http://localhost:5173 (different browser)
```

## Verification Checklist

- [ ] Host refresh preserves host role
- [ ] Participant refresh preserves admission
- [ ] New join shows waiting room
- [ ] Camera off shows avatar (not black)
- [ ] Mic mute shows indicator to others
- [ ] Screen share works without replacing UI
- [ ] Grid adapts to participant count
- [ ] Mobile/tablet layouts work
- [ ] Host controls restricted to host only
- [ ] WebRTC reconnects after refresh

## Known Limitations

1. **Browser Compatibility**: Requires modern browser with WebRTC support
2. **Network**: STUN servers used; complex NAT may need TURN server
3. **Scale**: In-memory state; production needs Redis/persistent storage
4. **Mobile**: Full testing on mobile devices recommended
