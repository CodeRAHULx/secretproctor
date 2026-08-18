#include "../../include/detectors/DisplayAffinityDetector.h"
#include "../../include/platform/WindowScanner.h"
#include "../../include/platform/ProcessScanner.h"
#include "../../include/platform/Platform.h"
#include <vector>
#include <string>

std::vector<ThreatRecord> DisplayAffinityDetector::Scan() {
    std::vector<ThreatRecord> threats;

    if (!WindowScanner::SupportsAffinityDetection()) {
        // Platform doesn't support display affinity detection
        return threats;
    }

    auto suspiciousWindows = WindowScanner::GetWindowsWithDisplayAffinity();

    for (const auto& win : suspiciousWindows) {
        ThreatRecord rec;
        rec.pid = win.pid;
        rec.hwnd = win.handle;
        rec.title = win.title.empty() ? "(Untitled Stealth Window)" : win.title;
        rec.affinity = win.affinity;
        rec.type = "WDA_EXCLUDEFROMCAPTURE_STEALTH";
        rec.severity = "CRITICAL";

        // Get process path
        rec.path = ProcessScanner::GetProcessPath(win.pid);
        if (rec.path.empty()) {
            rec.path = win.className;
        }

        // Platform-specific details
        Platform::OS os = Platform::GetCurrentOS();
        switch (os) {
            case Platform::OS::Windows:
                rec.details = "Window configured with Win32 Display Affinity (WDA_EXCLUDEFROMCAPTURE) to evade screen capture/proctoring.";
                break;
            case Platform::OS::MacOS:
                rec.details = "Window configured with kCGWindowSharingNone to evade screen capture/proctoring.";
                break;
            case Platform::OS::Linux:
                rec.details = "Suspicious overlay window detected that may be evading screen capture (X11 topmost window).";
                break;
            default:
                rec.details = "Suspicious window configuration detected.";
        }

        threats.push_back(rec);
    }

    return threats;
}
