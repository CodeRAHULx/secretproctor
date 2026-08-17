#include "../../include/detectors/DebuggerDetector.h"
#include <windows.h>
#include <tlhelp32.h>
#include <string>
#include <algorithm>

bool DebuggerDetector::IsDebuggerAttached() {
    if (IsDebuggerPresent()) return true;

    BOOL remoteDebugger = FALSE;
    if (CheckRemoteDebuggerPresent(GetCurrentProcess(), &remoteDebugger) && remoteDebugger) {
        return true;
    }
    return false;
}

static bool CheckProcess(const std::string& targetName, DWORD& foundPid) {
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

std::vector<ThreatRecord> DebuggerDetector::Scan() {
    std::vector<ThreatRecord> threats;

    if (IsDebuggerAttached()) {
        ThreatRecord t;
        t.pid = GetCurrentProcessId();
        t.title = "Direct Debugger Attached to Evaluation Engine";
        t.path = "Kernel Debug Port";
        t.type = "ATTACHED_DEBUGGER";
        t.severity = "CRITICAL";
        t.details = "An active debugger is directly attached to the SecureMeet watchdog engine.";
        threats.push_back(t);
    }

    const std::vector<std::pair<std::string, std::string>> debuggers = {
        { "x64dbg.exe", "x64dbg Disassembler" },
        { "x32dbg.exe", "x32dbg Disassembler" },
        { "cheatengine", "Cheat Engine Memory Inspector" },
        { "ida64.exe", "IDA Pro Interactive Disassembler (64-bit)" },
        { "ida.exe", "IDA Pro Interactive Disassembler (32-bit)" },
        { "processhacker.exe", "Process Hacker Memory Editor" }
    };

    for (const auto& item : debuggers) {
        DWORD pid = 0;
        if (CheckProcess(item.first, pid)) {
            ThreatRecord t;
            t.pid = pid;
            t.title = item.second;
            t.path = item.first;
            t.type = "REVERSE_ENGINEERING_TOOL";
            t.severity = "CRITICAL";
            t.details = "Active memory inspection or reverse engineering tool running on candidate host machine.";
            threats.push_back(t);
        }
    }

    return threats;
}
