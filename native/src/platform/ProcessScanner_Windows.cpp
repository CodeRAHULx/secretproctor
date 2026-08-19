#include "../../include/platform/ProcessScanner.h"
#include "../../include/platform/Platform.h"

#ifdef PLATFORM_WINDOWS

#include <windows.h>
#include <tlhelp32.h>

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
    const std::size_t pos =
        path.find_last_of("\\/");

    if (pos == std::string::npos)
        return path;

    return path.substr(pos + 1);
}

std::string NormalizeProcessName(const std::string& name)
{
    std::string normalized =
        ToLower(GetFileName(name));

    // Windows process enumeration normally returns
    // the executable with ".exe".
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

    HANDLE snapshot =
        CreateToolhelp32Snapshot(
            TH32CS_SNAPPROCESS,
            0
        );

    if (snapshot == INVALID_HANDLE_VALUE)
        return processes;

    PROCESSENTRY32A processEntry = {};
    processEntry.dwSize =
        sizeof(PROCESSENTRY32A);

    if (Process32FirstA(
            snapshot,
            &processEntry))
    {
        do
        {
            ProcessInfo info;

            info.pid =
                static_cast<unsigned long>(
                    processEntry.th32ProcessID
                );

            info.name = processEntry.szExeFile;
            info.path = GetProcessPath(info.pid);

            if (info.pid > 0 && !info.name.empty())
            {
                processes.push_back(
                    std::move(info)
                );
            }

        } while (Process32NextA(
            snapshot,
            &processEntry));
    }

    CloseHandle(snapshot);

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
    // Avoid accidentally targeting special/system PIDs.
    if (pid <= 4)
        return false;

    HANDLE process = OpenProcess(
        PROCESS_TERMINATE,
        FALSE,
        static_cast<DWORD>(pid)
    );

    if (!process)
        return false;

    const BOOL result =
        ::TerminateProcess(
            process,
            1
        );

    CloseHandle(process);

    return result == TRUE;
}


std::string ProcessScanner::GetProcessPath(
    unsigned long pid)
{
    HANDLE process = OpenProcess(
        PROCESS_QUERY_LIMITED_INFORMATION,
        FALSE,
        static_cast<DWORD>(pid)
    );

    if (!process)
        return "";

    char path[MAX_PATH] = {};
    DWORD pathLength = MAX_PATH;

    const BOOL result =
        QueryFullProcessImageNameA(
            process,
            0,
            path,
            &pathLength
        );

    CloseHandle(process);

    if (!result || pathLength == 0)
        return "";

    return std::string(
        path,
        pathLength
    );
}

#endif