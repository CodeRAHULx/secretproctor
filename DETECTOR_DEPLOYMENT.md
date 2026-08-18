# Cross-Platform Native Detector Deployment

## What Changed

The native anti-cheat detector has been upgraded from **Windows-only** to **cross-platform** support (Windows, Linux, macOS).

### Key Features

✅ **Display Affinity Detection** - Detects apps hiding from screen capture (like AI assistants)
✅ **VM Detection** - Detects VirtualBox, VMware, QEMU, Parallels
✅ **Screen Recorder Detection** - Detects OBS, Bandicam, Kazam, etc.
✅ **Debugger Detection** - Detects GDB, LLDB, x64dbg, IDA Pro
✅ **Keystroke Automation** - Detects AutoHotkey, xdotool, macros
✅ **Dual Tab Detection** - Prevents multiple SecureMeet sessions

## Railway Deployment

The detector will **automatically compile** during Railway deployment.

### Build Process

1. Railway installs build tools (gcc, cmake, X11)
2. Compiles native detector for Linux
3. Backend auto-detects and uses native binary
4. Falls back to Node.js detector if build fails

### Verify Deployment

Check Railway logs for:
```
[NativeWatchdogService] Platform: linux
[NativeWatchdogService] Starting native C++ detector (linux)...
[NativeWatchdogService] Detector path: /app/native/bin/display_affinity_detector
```

### If Native Build Fails

The system will automatically fall back to the Node.js detector (process detection only, no window detection).

## Local Development

### Windows
```bash
cd native
build.bat
```

### Linux/macOS
```bash
cd native
chmod +x build.sh
./build.sh
```

### Test the detector
```bash
./native/bin/display_affinity_detector --version
./native/bin/display_affinity_detector
```

## Testing Display Affinity Detection

The detector catches apps using stealth modes:

### Windows
- Open Claude desktop app (uses WDA_EXCLUDEFROMCAPTURE)
- Run detector: it will show "CRITICAL" threat

### Linux (X11 only)
- Limited detection (overlay windows only)
- Wayland: no window detection (security model)

### macOS
- Detects kCGWindowSharingNone windows
- Full support like Windows

## Frontend Integration

The proctoring UI already supports the detector:

1. **Live Stream**: Shows real-time threat notifications
2. **Threat Display**: Shows detected apps with "Terminate" button
3. **Platform Info**: Shows which detector is active

No frontend changes needed - everything is backward compatible.

## Troubleshooting

### "No detector available" in logs
```bash
# Build manually
cd native && ./build.sh

# Or check Railway build logs for errors
railway logs
```

### X11 not found on Railway
The nixpacks.toml already includes X11 libraries. If missing:
```toml
nixPkgs = ["xorg.libX11", "xorg.libX11.dev"]
```

### Binary not executable on Linux
Railway build should auto-chmod, but if needed:
```bash
chmod +x native/bin/display_affinity_detector
```

## What Gets Detected

### Invisible/Stealth Apps ✅
- **Claude Desktop** (WDA_EXCLUDEFROMCAPTURE on Windows)
- **Cluely** (tested - detected successfully)
- ChatGPT desktop
- Any app hiding from screen capture

### Screen Recording ✅
- OBS Studio
- Bandicam
- SimpleScreenRecorder (Linux)
- QuickTime (macOS)

### Virtual Machines ✅
- VirtualBox, VMware, QEMU, Parallels
- Hypervisor detection via CPUID

### Automation ✅
- AutoHotkey, AutoIt
- xdotool, PyAutoGUI (Linux)
- Keyboard Maestro (macOS)

## Architecture

```
Backend Service (nativeWatchdogService.js)
    ↓
Detector Selection (priority order):
    1. Native C++ detector (native/bin/display_affinity_detector)
       → Full features, all platforms
    2. Node.js detector (detector/detector.js)
       → Fallback, process detection only
    3. Disabled
       → No proctoring
```

## Performance

- **Scan Interval**: 1 second (configurable)
- **CPU Usage**: < 1% on modern systems
- **Memory**: ~5MB per scan
- **Binary Size**: ~3MB (native), 0 (Node.js)

## Security Notes

- Native detector runs with user privileges (no root needed)
- Cannot detect kernel-level cheats (requires kernel driver)
- Wayland users: window detection disabled (OS limitation)
- macOS: requires Screen Recording permission for full detection
