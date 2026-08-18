#include "../../include/platform/ProcessScanner.h"
#include "../../include/platform/Platform.h"

#ifdef PLATFORM_LINUX
#include <dirent.h>
#include <unistd.h>
#include <signal.h>
#include <sys/types.h>
#include <fstream>
#include <sstream>
#include <algorithm>
#include <cstring>

std::vector<ProcessInfo> ProcessScanner::GetAllProcesses() {
    std::vector<ProcessInfo> processes;
    DIR* dir = opendir("/proc");
    if (!dir) return processes;

    struct dirent* entry;
    while ((entry = readdir(dir)) != nullptr) {
        // Check if directory name is a number (PID)
        if (entry->d_type != DT_DIR) continue;

        std::string name = entry->d_name;
        if (name.empty() || !std::isdigit(name[0])) continue;

        unsigned long pid = std::stoul(name);

        ProcessInfo info;
        info.pid = pid;

        // Read process name from /proc/[pid]/comm
        std::string commPath = "/proc/" + name + "/comm";
        std::ifstream commFile(commPath);
        if (commFile.is_open()) {
            std::getline(commFile, info.name);
            // Remove trailing newline
            if (!info.name.empty() && info.name.back() == '\n') {
                info.name.pop_back();
            }
            commFile.close();
        }

        // Read full path from /proc/[pid]/exe
        info.path = GetProcessPath(pid);

        if (!info.name.empty()) {
            processes.push_back(info);
        }
    }

    closedir(dir);
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
    std::string exePath = "/proc/" + std::to_string(pid) + "/exe";
    char path[PATH_MAX];
    ssize_t len = readlink(exePath.c_str(), path, sizeof(path) - 1);

    if (len != -1) {
        path[len] = '\0';
        return std::string(path);
    }

    return "";
}

#endif
