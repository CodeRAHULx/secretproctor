#include "../../include/detectors/KeystrokeDetector.h"
#include "../../include/platform/ProcessScanner.h"

#include <string>
#include <vector>
#include <utility>

std::vector<ThreatRecord> KeystrokeDetector::Scan()
{
    std::vector<ThreatRecord> threats;

    // Known automation/macro applications.
    // These are detections of software presence, not proof of malicious behavior.
    const std::vector<std::pair<std::string, std::string>> automationTools = {
        // Windows
        { "autohotkey",     "AutoHotkey Macro Engine" },
        { "autoit3",        "AutoIt Script Automation" },
        { "tinytask",       "TinyTask Automation" },
        { "macrorecorder",  "Jitbit Macro Recorder" },
        { "pulover",        "Pulover's Macro Creator" },

        // Linux
        { "xdotool",        "xdotool Automation Tool" },
        { "xte",            "XAutomation xte" },
        { "autokey",        "AutoKey Automation" },
        { "sikuli",         "Sikuli GUI Automation" },

        // macOS
        { "keyboard maestro", "Keyboard Maestro Automation" },
        { "bettertouchtool",  "BetterTouchTool Macros" },
        { "alfred",           "Alfred Automation Workflows" },
        { "automator",        "macOS Automator Scripts" }
    };

    for (const auto& [processName, description] : automationTools)
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

        threat.type = "KEYSTROKE_AUTOMATION_TOOL";

        // Presence of an automation program isn't necessarily malicious.
        threat.severity = "MEDIUM";

        threat.details =
            "Known keyboard/macro automation software detected: " +
            processName + ".";

        threats.push_back(std::move(threat));
    }

    return threats;
}