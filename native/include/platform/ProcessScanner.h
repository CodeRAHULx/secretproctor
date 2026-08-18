#pragma once
#include <vector>
#include <string>

struct ProcessInfo {
    unsigned long pid;
    std::string name;
    std::string path;
};

class ProcessScanner {
public:
    static std::vector<ProcessInfo> GetAllProcesses();
    static bool FindProcess(const std::string& targetName, ProcessInfo& found);
    static bool TerminateProcess(unsigned long pid);
    static std::string GetProcessPath(unsigned long pid);
};
