#include "../../include/detectors/KeystrokeDetector.h"
#include <windows.h>
#include <tlhelp32.h>
#include <string>
#include <algorithm>

static bool CheckMacroProcess(const std::string& targetName, DWORD& foundPid) {
    HANDLE hSnapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (hSnapshot == INVALID_HANDLE_VALUE) return false;

    PROCESSENTRY32 pe32;
    pe32.dwSize = sizeof(PROCESSENTRY32);

    std::string targetLower = targetName;
    std::transform(targetLower.begin(), targetLower.end(), targetLower.begin(), ::tolower);

    if (Process32First(hSnapshot, &pe32)) {
        do {
            std::string exeLower = pe32.szExeFile;
            std::transform(exeLower.begin(), exeLower.end(), exeLower.begin(), ::tolower);
            if (exeLower.find(targetLower) != std::string::npos) {
                foundPid = pe32.th32ProcessID;
                CloseHandle(hSnapshot);
                return true;
            }
        } while (Process32Next(hSnapshot, &pe32));
    }
    CloseHandle(hSnapshot);
    return false;
}

std::vector<ThreatRecord> KeystrokeDetector::Scan() {
    std::vector<ThreatRecord> threats;

    const std::vector<std::pair<std::string, std::string>> macros = {
        { "autohotkey", "AutoHotkey Macro Engine" },
        { "autoit3", "AutoIt Script Automation" },
        { "tinytask.exe", "TinyTask Auto-Clicker" },
        { "macrorecorder.exe", "Jitbit Macro Recorder" },
        { "clicker.exe", "Generic Auto-Clicker Cheat Bot" }
    };

    for (const auto& item : macros) {
        DWORD pid = 0;
        if (CheckMacroProcess(item.first, pid)) {
            ThreatRecord t;
            t.pid = pid;
            t.title = item.second;
            t.path = item.first;
            t.type = "KEYSTROKE_AUTOMATION_MACRO";
            t.severity = "HIGH";
            t.details = "Automated keystroke injection / macro automation software detected running in background (" + item.first + ").";
            threats.push_back(t);
        }
    }

    return threats;
}
