#pragma once

#include <string>
#include <vector>

struct ProcessInfo {
    unsigned long pid = 0;
    std::string name;
    std::string path;
};

class ProcessScanner {
public:
    static std::vector<ProcessInfo> GetAllProcesses();

    // Finds a process by executable/process name.
    // Matching is case-insensitive and ignores a Windows ".exe" suffix.
    static bool FindProcess(const std::string& targetName, ProcessInfo& found);

    static bool TerminateProcess(unsigned long pid);
    static std::string GetProcessPath(unsigned long pid);
};