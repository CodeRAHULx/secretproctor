#include "../../include/detectors/ScreenRecorderDetector.h"
#include "../../include/platform/ProcessScanner.h"

#include <string>
#include <vector>
#include <utility>

std::vector<ThreatRecord> ScreenRecorderDetector::Scan()
{
    std::vector<ThreatRecord> threats;

    // Known screen capture / recording applications.
    // Detecting the application does not prove that recording is currently active.
    const std::vector<std::pair<std::string, std::string>> recorders = {

        // Windows
        { "obs64",            "OBS Studio (64-bit)" },
        { "obs32",            "OBS Studio (32-bit)" },
        { "obs",              "OBS Studio" },
        { "bdcam",            "Bandicam Screen Recorder" },
        { "fraps",            "Fraps Capture Tool" },
        { "camtasiastudio",   "Camtasia Studio Recorder" },
        { "camrecorder",      "TechSmith Camtasia Recorder" },
        { "action",           "Mirillis Action! Screen Recorder" },
        { "sharex",           "ShareX Capture Tool" },
        { "xsplit.core",      "XSplit Broadcaster" },

        // Linux
        { "obs",              "OBS Studio" },
        { "simplescreenrecorder", "SimpleScreenRecorder" },
        { "recordmydesktop",  "RecordMyDesktop" },
        { "kazam",            "Kazam Screen Recorder" },
        { "vokoscreen",       "VokoscreenNG" },
        { "peek",             "Peek Screen Recorder" },

        // macOS
        { "obs",              "OBS Studio" },
        { "screenflow",       "ScreenFlow Recorder" },
        { "camtasia",         "Camtasia Screen Recorder" },
        { "quicktime player", "QuickTime Player" },
        { "snagit",           "TechSmith Snagit" }
    };

    for (const auto& [processName, description] : recorders)
    {
        ProcessInfo found;

        if (!ProcessScanner::FindProcess(processName, found))
            continue;

        ThreatRecord threat;

        threat.pid = found.pid;
        threat.title = description;

        if (!found.path.empty())
            threat.path = found.path;
        else
            threat.path = found.name;

        // We only know that a capture application is running.
        threat.type = "SCREEN_CAPTURE_TOOL_DETECTED";
        threat.severity = "MEDIUM";

        threat.details =
            "A known screen capture or recording application is running (" +
            processName + "). This does not by itself confirm that recording is active.";

        threats.push_back(std::move(threat));
    }

    return threats;
}