#include "../../include/platform/WindowScanner.h"
#include "../../include/platform/Platform.h"

#ifdef PLATFORM_WINDOWS
#include <windows.h>
#include <psapi.h>

#ifndef WDA_EXCLUDEFROMCAPTURE
#define WDA_EXCLUDEFROMCAPTURE 0x00000011
#endif

#ifndef WDA_MONITOR
#define WDA_MONITOR 0x00000001
#endif

struct EnumContext {
    std::vector<WindowInfo>* windows;
    DWORD currentProcessId;
};

static std::string GetProcessPathByPid(DWORD pid) {
    char path[MAX_PATH] = {0};
    HANDLE hProcess = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_VM_READ, FALSE, pid);
    if (hProcess) {
        if (GetModuleFileNameExA(hProcess, NULL, path, MAX_PATH)) {
            CloseHandle(hProcess);
            return std::string(path);
        }
        CloseHandle(hProcess);
    }
    return "";
}

static BOOL CALLBACK EnumWindowProc(HWND hwnd, LPARAM lParam) {
    EnumContext* context = reinterpret_cast<EnumContext*>(lParam);
    if (!hwnd || !IsWindow(hwnd)) return TRUE;

    DWORD pid = 0;
    GetWindowThreadProcessId(hwnd, &pid);

    // Skip system processes
    if (pid <= 4 || pid == context->currentProcessId) return TRUE;

    WindowInfo info;
    info.handle = hwnd;
    info.pid = pid;

    // Get window title
    char title[512] = {0};
    GetWindowTextA(hwnd, title, sizeof(title));
    info.title = title;

    // Get window class name
    char className[256] = {0};
    GetClassNameA(hwnd, className, sizeof(className));
    info.className = className;

    // Get display affinity
    DWORD affinity = 0;
    if (GetWindowDisplayAffinity(hwnd, &affinity)) {
        info.affinity = affinity;
    }

    // Get window visibility and position
    info.isVisible = IsWindowVisible(hwnd) == TRUE;
    info.isTopmost = (GetWindowLong(hwnd, GWL_EXSTYLE) & WS_EX_TOPMOST) != 0;

    RECT rect;
    if (GetWindowRect(hwnd, &rect)) {
        info.width = rect.right - rect.left;
        info.height = rect.bottom - rect.top;
    }

    context->windows->push_back(info);
    return TRUE;
}

std::vector<WindowInfo> WindowScanner::GetAllWindows() {
    std::vector<WindowInfo> windows;
    EnumContext ctx = {&windows, GetCurrentProcessId()};
    EnumWindows(EnumWindowProc, reinterpret_cast<LPARAM>(&ctx));
    return windows;
}

std::vector<WindowInfo> WindowScanner::GetWindowsWithDisplayAffinity() {
    std::vector<WindowInfo> affinity_windows;
    auto allWindows = GetAllWindows();

    for (const auto& win : allWindows) {
        if (win.affinity == WDA_EXCLUDEFROMCAPTURE || win.affinity == WDA_MONITOR) {
            affinity_windows.push_back(win);
        }
    }

    return affinity_windows;
}

bool WindowScanner::SupportsAffinityDetection() {
    return true; // Windows fully supports WDA_EXCLUDEFROMCAPTURE detection
}

#endif
