# 🛡️ SecureMeet: AI-Shielded Technical Interview & Anti-Cheat Platform

An enterprise-grade, MVC-structured WebRTC interview conferencing platform with integrated **C++ Display Affinity Watchdog (`WDA_EXCLUDEFROMCAPTURE`)**, real-time desktop screen sharing, and browser integrity telemetry.

---

## 📁 Architecture & MVC Directory Structure

```text
SecureMeet/
├── backend/                               # MVC Backend (Node.js)
│   ├── config/
│   │   └── config.js                      # Environment & path definitions
│   ├── controllers/
│   │   ├── telemetryController.js         # SSE stream & system health controller
│   │   ├── threatController.js            # Remediation & process kill controller
│   │   └── auditController.js             # Forensic log persistence controller
│   ├── models/
│   │   ├── ThreatModel.js                 # Threat entity & parsing model
│   │   └── SessionModel.js                # Session integrity & incident state model
│   ├── routes/
│   │   └── apiRoutes.js                   # API route dispatcher
│   ├── services/
│   │   └── nativeWatchdogService.js       # Background C++ scanner service
│   ├── package.json
│   └── server.js                          # Backend server entry point
│
├── frontend/                              # MVC Frontend (WebRTC + UI)
│   ├── public/
│   │   ├── css/
│   │   │   └── style.css                  # Google Meet dark-mode aesthetic
│   │   ├── js/
│   │   │   ├── models/
│   │   │   │   └── MeetingModel.js        # State, streams, logs, trust score
│   │   │   ├── views/
│   │   │   │   └── MeetingView.js         # DOM updates, video grid, HUD rendering
│   │   │   ├── controllers/
│   │   │   │   └── MeetingController.js   # WebRTC, SSE consumer, anti-cheat listeners
│   │   │   └── app.js                     # Frontend bootstrap entry point
│   │   └── index.html                     # Meeting room UI
│   └── package.json
│
├── native/                                # Native Windows C++ Engine
│   ├── src/
│   │   ├── display_affinity_detector.cpp  # Win32 WDA_EXCLUDEFROMCAPTURE detector
│   │   └── display_affinity_test.cpp      # Stealth window simulator
│   ├── bin/
│   │   ├── display_affinity_detector.exe  # Compiled detector binary
│   │   └── display_affinity_test.exe      # Compiled test binary
│   └── build.bat                          # Automated C++ build script
│
├── package.json                           # Root project manifest
├── README.md                              # Documentation
└── start.bat                              # One-click launcher
```

---

## 🚀 How to Run

### Option 1: Quick Launch (Windows)
Double-click `start.bat` or run:
```cmd
cd SecureMeet
start.bat
```

### Option 2: Manual Start
```cmd
cd SecureMeet
node backend/server.js
```

Then open your browser to:
👉 **`http://localhost:3000`**

---

## 🧪 How to Test Cheat Detection

1. Join the meeting on **`http://localhost:3000`** and click **"Share Screen"**.
2. Open a separate Command Prompt and run the stealth test window:
   ```cmd
   SecureMeet\native\bin\display_affinity_test.exe
   ```
3. **Observation**:
   - The green text window is visible on your screen, but **invisible** in the screen share capture feed.
   - **SecureMeet's Native Watchdog** instantly detects the stealth window, triggers a **Red Alert**, drops the candidate's Trust Score to 35%, and displays the PID, executable path, and window title.
4. Click **"⚡ Terminate Cheat Process"** on the dashboard to kill the stealth window directly from the web interface.
