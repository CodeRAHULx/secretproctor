#include "../../include/platform/ProcessScanner.h"
#include "../../include/platform/Platform.h"

#ifdef PLATFORM_LINUX

#include <dirent.h>
#include <unistd.h>
#include <signal.h>
#include <sys/types.h>

#include <algorithm>
#include <cctype>
#include <fstream>
#include <string>
#include <vector>

namespace {

std::string ToLower(std::string value)
{
    std::transform(
        value.begin(),
        value.end(),
        value.begin(),
        [](unsigned char c) {
            return static_cast<char>(std::tolower(c));
        }
    );

    return value;
}

std::string GetFileName(const std::string& path)
{
    const std::size_t pos = path.find_last_of('/');

    if (pos == std::string::npos)
        return path;

    return path.substr(pos + 1);
}

std::string NormalizeProcessName(const std::string& name)
{
    std::string normalized = ToLower(GetFileName(name));

    // Linux normally doesn't use .exe, but accepting it here
    // keeps matching behavior consistent across platforms.
    if (normalized.size() >= 4 &&
        normalized.compare(
            normalized.size() - 4,
            4,
            ".exe"
        ) == 0)
    {
        normalized.erase(normalized.size() - 4);
    }

    return normalized;
}

bool IsNumeric(const char* value)
{
    if (value == nullptr || *value == '\0')
        return false;

    for (const char* p = value; *p != '\0'; ++p)
    {
        if (!std::isdigit(
                static_cast<unsigned char>(*p)))
        {
            return false;
        }
    }

    return true;
}

} // namespace


std::vector<ProcessInfo> ProcessScanner::GetAllProcesses()
{
    std::vector<ProcessInfo> processes;

    DIR* dir = opendir("/proc");

    if (!dir)
        return processes;

    struct dirent* entry = nullptr;

    while ((entry = readdir(dir)) != nullptr)
    {
        if (!IsNumeric(entry->d_name))
            continue;

        const std::string pidString = entry->d_name;

        unsigned long pid = 0;

        try
        {
            pid = std::stoul(pidString);
        }
        catch (...)
        {
            continue;
        }

        if (pid == 0)
            continue;

        ProcessInfo info;
        info.pid = pid;

        // /proc/<pid>/comm contains the process name.
        const std::string commPath =
            "/proc/" + pidString + "/comm";

        std::ifstream commFile(commPath);

        if (commFile.is_open())
        {
            std::getline(commFile, info.name);
        }

        info.path = GetProcessPath(pid);

        if (!info.name.empty())
        {
            processes.push_back(std::move(info));
        }
    }

    closedir(dir);

    return processes;
}


bool ProcessScanner::FindProcess(
    const std::string& targetName,
    ProcessInfo& found)
{
    const std::string target =
        NormalizeProcessName(targetName);

    if (target.empty())
        return false;

    const auto processes = GetAllProcesses();

    for (const auto& process : processes)
    {
        // Prefer the process name.
        if (NormalizeProcessName(process.name) == target)
        {
            found = process;
            return true;
        }

        // If the process name isn't useful, also check the
        // executable filename from its path.
        if (!process.path.empty() &&
            NormalizeProcessName(process.path) == target)
        {
            found = process;
            return true;
        }
    }

    return false;
}


bool ProcessScanner::TerminateProcess(unsigned long pid)
{
    // Never allow termination of PID 0/1.
    if (pid <= 1)
        return false;

    return kill(
        static_cast<pid_t>(pid),
        SIGKILL
    ) == 0;
}


std::string ProcessScanner::GetProcessPath(unsigned long pid)
{
    const std::string exePath =
        "/proc/" + std::to_string(pid) + "/exe";

    char path[4096] = {};

    const ssize_t length = readlink(
        exePath.c_str(),
        path,
        sizeof(path) - 1
    );

    if (length <= 0)
        return "";

    path[length] = '\0';

    return std::string(path);
}

#endif