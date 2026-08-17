#include "../../include/detectors/VMDetector.h"
#include <windows.h>
#include <tlhelp32.h>
#include <intrin.h>
#include <string>
#include <algorithm>

bool VMDetector::IsHypervisorPresent() {
    int cpuInfo[4] = { 0 };
    __cpuid(cpuInfo, 1);
    // Bit 31 of ECX is set if hypervisor is present
    return (cpuInfo[2] & (1 << 31)) != 0;
}

static bool CheckProcessName(const std::string& targetName, DWORD& foundPid) {
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

std::vector<ThreatRecord> VMDetector::Scan() {
    std::vector<ThreatRecord> threats;

    const std::vector<std::pair<std::string, std::string>> vmProcesses = {
        { "vboxservice.exe", "VirtualBox Guest Integration Service" },
        { "vboxtray.exe", "VirtualBox Guest Tray" },
        { "vmtoolsd.exe", "VMware Tools Daemon" },
        { "vmacthlp.exe", "VMware Activation Helper" },
        { "qemu-ga.exe", "QEMU Guest Agent" },
        { "vdagent.exe", "SPICE VDAgent Sandbox" }
    };

    for (const auto& item : vmProcesses) {
        DWORD pid = 0;
        if (CheckProcessName(item.first, pid)) {
            ThreatRecord t;
            t.pid = pid;
            t.title = item.second;
            t.path = item.first;
            t.type = "VM_SANDBOX_ENVIRONMENT";
            t.severity = "HIGH";
            t.details = "Candidate is running the evaluation inside a Virtual Machine / Sandbox (" + item.first + ")";
            threats.push_back(t);
        }
    }

    return threats;
}
