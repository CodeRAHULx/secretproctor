#include "../../include/platform/ProcessScanner.h"
#include "../../include/platform/Platform.h"

#ifdef PLATFORM_MACOS

#include <libproc.h>
#include <sys/proc_info.h>
#include <sys/sysctl.h>
#include <signal.h>

#include <algorithm>
#include <cctype>
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
    std::string normalized =
        ToLower(GetFileName(name));

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

} // namespace


std::vector<ProcessInfo> ProcessScanner::GetAllProcesses()
{
    std::vector<ProcessInfo> processes;

    int mib[4] = {
        CTL_KERN,
        KERN_PROC,
        KERN_PROC_ALL,
        0
    };

    size_t size = 0;

    if (sysctl(
            mib,
            4,
            nullptr,
            &size,
            nullptr,
            0) < 0)
    {
        return processes;
    }

    if (size == 0)
        return processes;

    std::vector<struct kinfo_proc> procList(
        size / sizeof(struct kinfo_proc)
    );

    if (sysctl(
            mib,
            4,
            procList.data(),
            &size,
            nullptr,
            0) < 0)
    {
        return processes;
    }

    const std::size_t count =
        size / sizeof(struct kinfo_proc);

    processes.reserve(count);

    for (std::size_t i = 0; i < count; ++i)
    {
        const auto& kp = procList[i];

        ProcessInfo info;

        info.pid =
            static_cast<unsigned long>(
                kp.kp_proc.p_pid
            );

        info.name = kp.kp_proc.p_comm;
        info.path = GetProcessPath(info.pid);

        if (info.pid > 0 && !info.name.empty())
        {
            processes.push_back(std::move(info));
        }
    }

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
        if (NormalizeProcessName(process.name) == target)
        {
            found = process;
            return true;
        }

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
    if (pid <= 1)
        return false;

    return kill(
        static_cast<pid_t>(pid),
        SIGKILL
    ) == 0;
}


std::string ProcessScanner::GetProcessPath(unsigned long pid)
{
    char pathBuffer[PROC_PIDPATHINFO_MAXSIZE] = {};

    const int result = proc_pidpath(
        static_cast<int>(pid),
        pathBuffer,
        sizeof(pathBuffer)
    );

    if (result <= 0)
        return "";

    return std::string(pathBuffer);
}

#endif