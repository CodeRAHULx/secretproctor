# SecureMeet Native Detector Build Guide

## Overview
The native detector has been upgraded to support **Windows, Linux, and macOS** with full anti-cheat capabilities.

## Features by Platform

| Feature | Windows | Linux | macOS |
|---------|---------|-------|-------|
| **Display Affinity Detection** | ✅ Full (WDA_EXCLUDEFROMCAPTURE) | ⚠️ X11 overlay detection | ✅ CGWindowSharingState |
| **Process Detection** | ✅ Full | ✅ Full | ✅ Full |
| **VM Detection** | ✅ CPUID + processes | ✅ CPUID + /proc + DMI | ✅ CPUID + sysctl |
| **Screen Recorder** | ✅ Full | ✅ Full | ✅ Full |
| **Debugger Detection** | ✅ IsDebuggerPresent | ✅ ptrace + /proc | ✅ sysctl P_TRACED |
| **Keystroke Automation** | ✅ Full | ✅ Full | ✅ Full |
| **Dual Tab Detection** | ✅ Named mutex | ✅ File lock | ✅ File lock |

## Building on Different Platforms

### Windows

**Requirements:**
- Visual Studio 2019+ OR MinGW-w64
- CMake 3.15+

**Build:**
```batch
cd native
build.bat
```

Or with CMake:
```batch
cd native
mkdir build && cd build
cmake -G "MinGW Makefiles" ..
cmake --build . --config Release
```

**Output:** `native/bin/display_affinity_detector.exe`

### Linux

**Requirements:**
```bash
sudo apt-get update
sudo apt-get install -y build-essential cmake libx11-dev
```

**Build:**
```bash
cd native
chmod +x build.sh
./build.sh
```

Or with CMake:
```bash
cd native
mkdir build && cd build
cmake ..
cmake --build . --config Release
```

**Output:** `native/bin/display_affinity_detector`

### macOS

**Requirements:**
```bash
brew install cmake
```

**Build:**
```bash
cd native
chmod +x build.sh
./build.sh
```

**Output:** `native/bin/display_affinity_detector`

## Railway Deployment (Linux)

The native detector will be compiled automatically during Railway deployment.

**Build Process:**
1. Install build dependencies (see `nixpacks.toml`)
2. Compile native detector with CMake
3. Backend auto-detects the binary

**To test locally with Docker:**
```bash
docker build -t securemeet .
docker run -p 3000:3000 securemeet
```

## Testing the Detector

Run the detector manually:
```bash
# Show version and platform info
./native/bin/display_affinity_detector --version

# Run full scan (JSON output)
./native/bin/display_affinity_detector

# Kill a process by PID
./native/bin/display_affinity_detector --kill-pid 1234

# Show help
./native/bin/display_affinity_detector --help
```

**Expected JSON Output:**
```json
{
  "hasThreat": true,
  "threatCount": 2,
  "threats": [
    {
      "pid": 12345,
      "hwnd": "0x00012abc",
      "title": "Claude",
      "path": "/usr/bin/claude",
      "affinity": 17,
      "affinityHex": "0x11",
      "type": "WDA_EXCLUDEFROMCAPTURE_STEALTH",
      "severity": "CRITICAL",
      "details": "Window configured to evade screen capture/proctoring."
    }
  ]
}
```

## Platform-Specific Notes

### Windows
- **Full display affinity detection** using `GetWindowDisplayAffinity()`
- Detects windows with `WDA_EXCLUDEFROMCAPTURE` (0x11) flag
- Example: AI assistants like Claude, ChatGPT that hide from screen capture

### Linux
- **X11 only** - Wayland doesn't allow window enumeration (security model)
- Detects suspicious overlay windows with `_NET_WM_STATE_ABOVE`
- Limited compared to Windows but catches most cheating attempts
- Check environment: `echo $WAYLAND_DISPLAY` (if set, Wayland is active)

### macOS
- **Full support** using `CGWindowListCopyWindowInfo()`
- Detects `kCGWindowSharingNone` (windows excluded from screen capture)
- Uses CoreGraphics framework

## Troubleshooting

### Build fails on Linux
```bash
# Install missing dependencies
sudo apt-get install -y build-essential cmake libx11-dev

# Clean and rebuild
cd native
rm -rf build
./build.sh
```

### "X11 not found" warning on Linux
```bash
sudo apt-get install -y libx11-dev
```

### Permission denied on Linux/macOS
```bash
chmod +x native/bin/display_affinity_detector
```

### Binary not detected by backend
The backend auto-detects:
1. `native/bin/display_affinity_detector.exe` (Windows)
2. `native/bin/display_affinity_detector` (Linux/macOS)

Check logs:
```
[NativeWatchdogService] Platform: linux
[NativeWatchdogService] Detector type: native-cross-platform
```

## What Gets Detected

### AI Assistants
- ChatGPT desktop app
- Claude desktop app  
- GitHub Copilot
- Microsoft Copilot
- Cursor IDE
- Windsurf IDE

### Screen Recording
- OBS Studio
- Bandicam
- Fraps
- SimpleScreenRecorder (Linux)
- Kazam (Linux)

### Virtual Machines
- VirtualBox
- VMware
- QEMU/KVM
- Parallels (macOS)

### Debuggers
- x64dbg, OllyDbg, IDA Pro (Windows)
- GDB, LLDB (Linux/macOS)
- Cheat Engine

### Automation Tools
- AutoHotkey
- AutoIt
- xdotool (Linux)
- Keyboard Maestro (macOS)
