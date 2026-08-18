#include "../../include/detectors/DualTabDetector.h"
#include "../../include/platform/Platform.h"
#include <string>

#ifdef PLATFORM_WINDOWS
#include <windows.h>
static HANDLE g_hEvaluationMutex = NULL;
#else
#include <fcntl.h>
#include <unistd.h>
#include <sys/file.h>
#include <sys/stat.h>
static int g_lockFd = -1;
#endif

bool DualTabDetector::CheckNamedMutex(const std::string& sessionKey) {
#ifdef PLATFORM_WINDOWS
    std::string mutexName = "Global\\SecureMeet_Session_" + (sessionKey.empty() ? "Default" : sessionKey);

    g_hEvaluationMutex = CreateMutexA(NULL, TRUE, mutexName.c_str());
    if (GetLastError() == ERROR_ALREADY_EXISTS) {
        return false; // Dual tab / duplicate evaluation instance running
    }
    return true; // Primary single instance

#else
    // Unix: Use file lock
    std::string lockFile = "/tmp/securemeet_session_" + (sessionKey.empty() ? "default" : sessionKey) + ".lock";

    g_lockFd = open(lockFile.c_str(), O_CREAT | O_RDWR, 0666);
    if (g_lockFd < 0) {
        return true; // Cannot create lock file, allow by default
    }

    // Try to acquire exclusive lock
    if (flock(g_lockFd, LOCK_EX | LOCK_NB) < 0) {
        close(g_lockFd);
        g_lockFd = -1;
        return false; // Lock already held by another instance
    }

    return true; // Successfully acquired lock
#endif
}

std::vector<ThreatRecord> DualTabDetector::Scan() {
    std::vector<ThreatRecord> threats;
    // Mutex checking hook - actual detection happens in CheckNamedMutex
    return threats;
}
