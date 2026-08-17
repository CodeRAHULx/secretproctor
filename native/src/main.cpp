#include "../include/core/DetectorEngine.h"
#include "../include/core/ThreatReporter.h"
#include <windows.h>
#include <iostream>
#include <string>

static bool TerminateProcessByPid(DWORD pid) {
    if (pid <= 4) return false;
    HANDLE hProcess = OpenProcess(PROCESS_TERMINATE, FALSE, pid);
    if (!hProcess) return false;
    BOOL res = TerminateProcess(hProcess, 1);
    CloseHandle(hProcess);
    return res == TRUE;
}

static bool TerminateWindowOwner(HWND hwnd) {
    if (!hwnd || !IsWindow(hwnd)) return false;
    DWORD pid = 0;
    GetWindowThreadProcessId(hwnd, &pid);
    if (pid > 4) {
        return TerminateProcessByPid(pid);
    }
    return false;
}

int main(int argc, char* argv[]) {
    // Check command line arguments
    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];
        if (arg == "--kill-pid" && i + 1 < argc) {
            DWORD pid = static_cast<DWORD>(std::stoul(argv[i + 1]));
            bool ok = TerminateProcessByPid(pid);
            std::cout << "{\"success\":" << (ok ? "true" : "false") << ",\"pid\":" << pid << "}" << std::endl;
            return ok ? 0 : 1;
        } else if (arg == "--kill-hwnd" && i + 1 < argc) {
            HWND hwnd = reinterpret_cast<HWND>(std::stoull(argv[i + 1], nullptr, 16));
            bool ok = TerminateWindowOwner(hwnd);
            std::cout << "{\"success\":" << (ok ? "true" : "false") << "}" << std::endl;
            return ok ? 0 : 1;
        }
    }

    DetectorEngine engine;
    auto threats = engine.RunFullSecurityScan();
    std::cout << ThreatReporter::ToJson(threats) << std::endl;

    return 0;
}
