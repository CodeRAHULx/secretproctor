#include "../../include/detectors/ScreenRecorderDetector.h"
#include <windows.h>
#include <tlhelp32.h>
#include <string>
#include <algorithm>

static bool FindProcess(const std::string& targetName, DWORD& foundPid, std::string& matchedExe) {
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
            if (exeLower == targetLower) {
                foundPid = pe32.th32ProcessID;
                matchedExe = pe32.szExeFile;
                CloseHandle(hSnapshot);
                return true;
            }
        } while (Process32Next(hSnapshot, &pe32));
    }
    CloseHandle(hSnapshot);
    return false;
}

std::vector<ThreatRecord> ScreenRecorderDetector::Scan() {
    std::vector<ThreatRecord> threats;

    const std::vector<std::pair<std::string, std::string>> recorders = {
        { "obs64.exe", "OBS Studio (64-bit)" },
        { "obs32.exe", "OBS Studio (32-bit)" },
        { "bdcam.exe", "Bandicam Screen Recorder" },
        { "fraps.exe", "Fraps Capture Tool" },
        { "camtasiastudio.exe", "Camtasia Studio Recorder" },
        { "camrecorder.exe", "TechSmith Camtasia Recorder" },
        { "action.exe", "Mirillis Action! Screen Recorder" },
        { "sharex.exe", "ShareX Auto-Capture" },
        { "xsplit.core.exe", "XSplit Broadcaster" }
    };

    for (const auto& item : recorders) {
        DWORD pid = 0;
        std::string matchedExe;
        if (FindProcess(item.first, pid, matchedExe)) {
            ThreatRecord t;
            t.pid = pid;
            t.title = item.second;
            t.path = matchedExe;
            t.type = "UNAUTHORIZED_SCREEN_RECORDER";
            t.severity = "HIGH";
            t.details = "Candidate has an active screen recording or streaming application running in the background (" + item.first + ").";
            threats.push_back(t);
        }
    }

    return threats;
}
