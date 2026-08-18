#include "../../include/detectors/KeystrokeDetector.h"
#include "../../include/platform/ProcessScanner.h"
#include "../../include/platform/Platform.h"
#include <string>
#include <vector>
#include <utility>

std::vector<ThreatRecord> KeystrokeDetector::Scan() {
    std::vector<ThreatRecord> threats;

    // Cross-platform macro and automation tools
    const std::vector<std::pair<std::string, std::string>> macros = {
        // Windows
        { "autohotkey", "AutoHotkey Macro Engine" },
        { "autoit3", "AutoIt Script Automation" },
        { "tinytask", "TinyTask Auto-Clicker" },
        { "macrorecorder", "Jitbit Macro Recorder" },
        { "clicker", "Generic Auto-Clicker Cheat Bot" },
        { "pulover", "Pulover's Macro Creator" },

        // Linux
        { "xdotool", "xdotool Automation Tool" },
        { "xte", "XAutomation xte" },
        { "autokey", "AutoKey Automation" },
        { "sikuli", "Sikuli GUI Automation" },
        { "pyautogui", "PyAutoGUI Script" },

        // macOS
        { "Keyboard Maestro", "Keyboard Maestro Automation" },
        { "BetterTouchTool", "BetterTouchTool Macros" },
        { "Alfred", "Alfred Automation Workflows" },
        { "Automator", "macOS Automator Scripts" }
    };

    for (const auto& item : macros) {
        ProcessInfo found;
        if (ProcessScanner::FindProcess(item.first, found)) {
            ThreatRecord t;
            t.pid = found.pid;
            t.title = item.second;
            t.path = found.path.empty() ? found.name : found.path;
            t.type = "KEYSTROKE_AUTOMATION_MACRO";
            t.severity = "HIGH";
            t.details = "Automated keystroke injection / macro automation software detected running in background (" + item.first + ").";
            threats.push_back(t);
        }
    }

    return threats;
}
