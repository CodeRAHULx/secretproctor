#include "../../include/detectors/DisplayAffinityDetector.h"
#include <windows.h>
#include <psapi.h>
#include <vector>
#include <string>

#ifndef WDA_EXCLUDEFROMCAPTURE
#define WDA_EXCLUDEFROMCAPTURE 0x00000011
#endif

#ifndef WDA_MONITOR
#define WDA_MONITOR 0x00000001
#endif

struct EnumContext {
    std::vector<ThreatRecord>* threats;
    DWORD currentProcessId;
};

static std::string GetProcessPath(HANDLE hProcess) {
    char path[MAX_PATH] = { 0 };
    if (GetModuleFileNameExA(hProcess, NULL, path, MAX_PATH)) {
        return std::string(path);
    }
    return "";
}

static BOOL CALLBACK EnumWindowProc(HWND hwnd, LPARAM lParam) {
    EnumContext* context = reinterpret_cast<EnumContext*>(lParam);
    if (!hwnd || !IsWindow(hwnd)) return TRUE;

    DWORD affinity = 0;
    if (GetWindowDisplayAffinity(hwnd, &affinity)) {
        if (affinity == WDA_EXCLUDEFROMCAPTURE || affinity == WDA_MONITOR) {
            DWORD pid = 0;
            GetWindowThreadProcessId(hwnd, &pid);

            // Skip current scanner process
            if (pid == context->currentProcessId || pid <= 4) return TRUE;

            char title[512] = { 0 };
            GetWindowTextA(hwnd, title, sizeof(title));

            std::string procPath = "";
            HANDLE hProcess = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_VM_READ, FALSE, pid);
            if (hProcess) {
                procPath = GetProcessPath(hProcess);
                CloseHandle(hProcess);
            }

            ThreatRecord rec;
            rec.pid = pid;
            rec.hwnd = hwnd;
            rec.title = (title[0] != '\0') ? title : "(Untitled Stealth Window)";
            rec.path = procPath;
            rec.affinity = affinity;
            rec.type = "WDA_EXCLUDEFROMCAPTURE_STEALTH";
            rec.severity = "CRITICAL";
            rec.details = "Window configured with Win32 Display Affinity to evade screen capture/proctoring.";

            context->threats->push_back(rec);
        }
    }
    return TRUE;
}

std::vector<ThreatRecord> DisplayAffinityDetector::Scan() {
    std::vector<ThreatRecord> threats;
    EnumContext ctx = { &threats, GetCurrentProcessId() };
    EnumWindows(EnumWindowProc, reinterpret_cast<LPARAM>(&ctx));
    return threats;
}
