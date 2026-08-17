#include "../../include/core/DetectorEngine.h"
#include "../../include/detectors/DisplayAffinityDetector.h"
#include "../../include/detectors/VMDetector.h"
#include "../../include/detectors/ScreenRecorderDetector.h"
#include "../../include/detectors/DebuggerDetector.h"
#include "../../include/detectors/KeystrokeDetector.h"
#include "../../include/detectors/DualTabDetector.h"
#include <windows.h>

DetectorEngine::DetectorEngine() {
}

DetectorEngine::~DetectorEngine() {
}

void DetectorEngine::AntiDebugSelfCheck() {
    if (IsDebuggerPresent()) {
        // Exit process immediately if patched/hooked
        ExitProcess(0xC0000005);
    }
}

std::vector<ThreatRecord> DetectorEngine::RunFullSecurityScan() {
    AntiDebugSelfCheck();
    std::vector<ThreatRecord> allThreats;

    // 1. Display Affinity Stealth Detector (Primary WDA_EXCLUDEFROMCAPTURE)
    auto wdaThreats = DisplayAffinityDetector::Scan();
    allThreats.insert(allThreats.end(), wdaThreats.begin(), wdaThreats.end());

    // 2. VM / Sandbox Detector
    auto vmThreats = VMDetector::Scan();
    allThreats.insert(allThreats.end(), vmThreats.begin(), vmThreats.end());

    // 3. Screen Recorder & Broadcaster Detector
    auto recThreats = ScreenRecorderDetector::Scan();
    allThreats.insert(allThreats.end(), recThreats.begin(), recThreats.end());

    // 4. Debugger & Memory Hacker Detector
    auto dbgThreats = DebuggerDetector::Scan();
    allThreats.insert(allThreats.end(), dbgThreats.begin(), dbgThreats.end());

    // 5. Keystroke Automation & Macro Cheat Bot Detector
    auto macroThreats = KeystrokeDetector::Scan();
    allThreats.insert(allThreats.end(), macroThreats.begin(), macroThreats.end());

    return allThreats;
}
