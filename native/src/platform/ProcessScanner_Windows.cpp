#include "../../include/platform/ProcessScanner.h"
#include "../../include/platform/Platform.h"

#ifdef PLATFORM_WINDOWS
#include <windows.h>
#include <tlhelp32.h>
#include <psapi.h>

std::vector<ProcessInfo> ProcessScanner::GetAllProcesses() {
    std::vector<ProcessInfo> processes;

    HANDLE hSnapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (hSnapshot == INVALID_HANDLE_VALUE) return processes;

    PROCESSENTRY32 pe32;
    pe32.dwSize = sizeof(PROCESSENTRY32);

    if (Process32First(hSnapshot, &pe32)) {
        do {
            ProcessInfo info;
            info.pid = pe32.th32ProcessID;
            info.name = pe32.szExeFile;
            info.path = GetProcessPath(info.pid);
            processes.push_back(info);
        } while (Process32Next(hSnapshot, &pe32));
    }

    CloseHandle(hSnapshot);
    return processes;
}

bool ProcessScanner::FindProcess(const std::string& targetName, ProcessInfo& found) {
    auto processes = GetAllProcesses();
    std::string targetLower = targetName;
    std::transform(targetLower.begin(), targetLower.end(), targetLower.begin(), ::tolower);

    for (const auto& proc : processes) {
        std::string nameLower = proc.name;
        std::transform(nameLower.begin(), nameLower.end(), nameLower.begin(), ::tolower);

        if (nameLower.find(targetLower) != std::string::npos) {
            found = proc;
            return true;
        }
    }
    return false;
}

bool ProcessScanner::TerminateProcess(unsigned long pid) {
    if (pid <= 4) return false;
    HANDLE hProcess = OpenProcess(PROCESS_TERMINATE, FALSE, pid);
    if (!hProcess) return false;
    BOOL res = ::TerminateProcess(hProcess, 1);
    CloseHandle(hProcess);
    return res == TRUE;
}

std::string ProcessScanner::GetProcessPath(unsigned long pid) {
    HANDLE hProcess = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_VM_READ, FALSE, pid);
    if (!hProcess) return "";

    char path[MAX_PATH] = {0};
    if (GetModuleFileNameExA(hProcess, NULL, path, MAX_PATH)) {
        CloseHandle(hProcess);
        return std::string(path);
    }

    CloseHandle(hProcess);
    return "";
}

#endif
