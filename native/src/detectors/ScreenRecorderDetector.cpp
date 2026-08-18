#include "../../include/detectors/ScreenRecorderDetector.h"
#include "../../include/platform/ProcessScanner.h"
#include "../../include/platform/Platform.h"
#include <string>
#include <vector>
#include <utility>

std::vector<ThreatRecord> ScreenRecorderDetector::Scan() {
    std::vector<ThreatRecord> threats;

    // Cross-platform screen recording software
    const std::vector<std::pair<std::string, std::string>> recorders = {
        // Windows
        { "obs64.exe", "OBS Studio (64-bit)" },
        { "obs32.exe", "OBS Studio (32-bit)" },
        { "obs.exe", "OBS Studio" },
        { "bdcam.exe", "Bandicam Screen Recorder" },
        { "fraps.exe", "Fraps Capture Tool" },
        { "camtasiastudio.exe", "Camtasia Studio Recorder" },
        { "camrecorder.exe", "TechSmith Camtasia Recorder" },
        { "action.exe", "Mirillis Action! Screen Recorder" },
        { "sharex.exe", "ShareX Auto-Capture" },
        { "xsplit.core.exe", "XSplit Broadcaster" },

        // Linux
        { "obs", "OBS Studio" },
        { "simplescreenrecorder", "SimpleScreenRecorder" },
        { "recordmydesktop", "RecordMyDesktop" },
        { "kazam", "Kazam Screen Recorder" },
        { "vokoscreen", "VokoscreenNG" },
        { "peek", "Peek GIF Recorder" },
        { "ffmpeg", "FFmpeg Screen Capture" },

        // macOS
        { "OBS", "OBS Studio" },
        { "ScreenFlow", "ScreenFlow Recorder" },
        { "Camtasia", "Camtasia Screen Recorder" },
        { "QuickTime Player", "QuickTime Screen Recording" },
        { "SnagIt", "TechSmith SnagIt" }
    };

    for (const auto& item : recorders) {
        ProcessInfo found;
        if (ProcessScanner::FindProcess(item.first, found)) {
            ThreatRecord t;
            t.pid = found.pid;
            t.title = item.second;
            t.path = found.path.empty() ? found.name : found.path;
            t.type = "UNAUTHORIZED_SCREEN_RECORDER";
            t.severity = "HIGH";
            t.details = "Candidate has an active screen recording or streaming application running (" + item.first + ").";
            threats.push_back(t);
        }
    }

    return threats;
}
