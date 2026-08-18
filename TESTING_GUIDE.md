# SECUREMEET - TESTING GUIDE

## Quick Start

### 1. Start Backend
```bash
cd D:/learning/SecureMeet
node backend/server.js
```

You should see:
```
=============================================================
  🛡️  SecureMeet: Enterprise MVC Proctoring Platform        
  🚀 Server Running: http://localhost:3000   
  📡 Native Watchdog: Active (Polling 1000ms) 
=============================================================
```

### 2. Open Frontend
Open browser: `http://localhost:3000`

---

## Test Scenarios

### Test 1: Basic Meeting Flow (5 min)
1. Click "Start Meeting"
2. Copy meeting link from topbar
3. Open incognito window, paste link
4. Host should see admission notification
5. Click "Admit"
6. Both should see each other's video ✅

### Test 2: Screen Sharing (2 min)
1. Continue from Test 1
2. Host clicks "Share Screen" button
3. Select window to share
4. Participant should see host's screen (not black) ✅
5. Host clicks "Stop Sharing"
6. Both see camera feeds again ✅

### Test 3: Host Refresh (1 min)
1. Continue from Test 2
2. Host refreshes browser (F5)
3. Host should rejoin as host (not waiting) ✅
4. Participant remains connected ✅

### Test 4: Multi-Tab Block (1 min)
1. Browser 1: Join as User A
2. Browser 2: Try joining as User A
3. Should show error message ✅

### Test 5: Multiple Participants (5 min)
1. Host creates meeting
2. Open 2-3 incognito/different browser windows
3. All join with same link
4. Host admits each
5. All should see each other ✅

---

## Expected Results

✅ **Works:** Meeting creation, admission, video/audio, screen share, host controls  
⚠️ **Limited:** 5-10 participants max (mesh architecture)  
❌ **Doesn't Work:** 10+ participants (need SFU)

---

## Troubleshooting

### "Waiting for admission" never resolves
- **Fixed!** Admission keys now use `userId` correctly

### Remote screen share shows black screen
- **Fixed!** Now uses correct participant lookup

### WebRTC connection fails
- **Fixed!** TURN servers added
- If still fails: Check firewall/antivirus

### "Meeting already open in another tab"
- **Working as intended** - Close other tab first

### Host sees "Waiting for admission" after refresh
- Check browser console for errors
- Verify localStorage has `sec_host_*` token

---

## Browser Support

✅ **Chrome/Edge** - Full support  
✅ **Firefox** - Full support  
⚠️ **Safari** - May need permissions dialog  
❌ **IE** - Not supported

---

## Network Requirements

- **Upload:** 1.5 Mbps per participant (for 720p)
- **Download:** 1.5 Mbps per remote participant
- **Ports:** 3000 (HTTP), STUN/TURN ports

For 5 participants:
- Upload: ~6 Mbps
- Download: ~6 Mbps

---

## Known Limitations

1. **Scalability:** 5-10 participants max (mesh architecture)
2. **HTTPS:** Uses HTTP locally (production needs HTTPS)
3. **State:** In-memory only (server restart = meetings lost)
4. **Detection:** Only runs on backend server machine

---

## Success Criteria

Before production:
- [ ] All 5 test scenarios pass
- [ ] Tested on different networks
- [ ] Tested mobile + desktop
- [ ] Tested 5 concurrent participants
- [ ] Backend deployed with HTTPS
- [ ] Production TURN server configured

---
