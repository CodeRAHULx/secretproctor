#include "../../include/platform/ProcessScanner.h"
#include "../../include/platform/Platform.h"

#ifdef PLATFORM_MACOS
#include <libproc.h>
#include <sys/proc_info.h>
#include <sys/sysctl.h>
#include <signal.h>
#include <vector>
#include <algorithm>
#include <cstring>

std::vector<ProcessInfo> ProcessScanner::GetAllProcesses() {
    std::vector<ProcessInfo> processes;

    // Get number of processes
    int mib[4] = {CTL_KERN, KERN_PROC, KERN_PROC_ALL, 0};
    size_t size = 0;

    if (sysctl(mib, 4, NULL, &size, NULL, 0) < 0) {
        return processes;
    }

    size_t numProcs = size / sizeof(struct kinfo_proc);
    std::vector<struct kinfo_proc> procList(numProcs);

    if (sysctl(mib, 4, procList.data(), &size, NULL, 0) < 0) {
        return processes;
    }

    for (const auto& kp : procList) {
        ProcessInfo info;
        info.pid = kp.kp_proc.p_pid;
        info.name = kp.kp_proc.p_comm;
        info.path = GetProcessPath(info.pid);

        if (info.pid > 0 && !info.name.empty()) {
            processes.push_back(info);
        }
    }

    return processes;
}

bool ProcessScanner::FindProcess(const std::string& targetName, ProcessInfo& found) {
    auto processes = GetAllProcesses();
    std::string targetLower = targetName;
    std::transform(targetLower.begin(), targetLower.end(), targetLower.begin(), ::tolower);

    for (const auto& proc : processes) {
        std::string nameLower = proc.name;
        std::transform(nameLower.begin(), nameLower.end(), nameLower.begin(), ::tolower);

        std::string pathLower = proc.path;
        std::transform(pathLower.begin(), pathLower.end(), pathLower.begin(), ::tolower);

        if (nameLower.find(targetLower) != std::string::npos ||
            pathLower.find(targetLower) != std::string::npos) {
            found = proc;
            return true;
        }
    }
    return false;
}

bool ProcessScanner::TerminateProcess(unsigned long pid) {
    if (pid <= 1) return false;
    return kill(pid, SIGKILL) == 0;
}

std::string ProcessScanner::GetProcessPath(unsigned long pid) {
    char pathbuf[PROC_PIDPATHINFO_MAXSIZE];
    int ret = proc_pidpath(pid, pathbuf, sizeof(pathbuf));

    if (ret > 0) {
        return std::string(pathbuf);
    }

    return "";
}

#endif
