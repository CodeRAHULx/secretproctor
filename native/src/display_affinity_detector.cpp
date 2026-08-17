#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <iostream>
#include <vector>
#include <string>
#include <algorithm>
#include <sstream>
#include <psapi.h>

#pragma comment(lib, "User32.lib")
#pragma comment(lib, "Advapi32.lib")
#pragma comment(lib, "Psapi.lib")

#ifndef WDA_NONE
#define WDA_NONE 0x00000000
#endif

#ifndef WDA_MONITOR
#define WDA_MONITOR 0x00000001
#endif

#ifndef WDA_EXCLUDEFROMCAPTURE
#define WDA_EXCLUDEFROMCAPTURE 0x00000011
#endif

struct DetectedWindowInfo {
    HWND hwnd;
    DWORD processId;
    std::wstring processName;
    std::wstring windowTitle;
    std::wstring className;
    DWORD affinity;
    LONG_PTR exStyle;
    LONG_PTR style;
    RECT rect;
    bool isVisible;
    bool isTopmost;
    bool isTransparentLayered;
    bool isKnownSystemOverlay;
    std::wstring threatReason;
};

// Enable SeDebugPrivilege to query any running process
bool EnableDebugPrivilege() {
    HANDLE hToken = nullptr;
    if (!OpenProcessToken(GetCurrentProcess(), TOKEN_ADJUST_PRIVILEGES | TOKEN_QUERY, &hToken)) {
        return false;
    }

    TOKEN_PRIVILEGES tp{};
    LUID luid{};
    if (LookupPrivilegeValueW(nullptr, L"SeDebugPrivilege", &luid)) {
        tp.PrivilegeCount = 1;
        tp.Privileges[0].Luid = luid;
        tp.Privileges[0].Attributes = SE_PRIVILEGE_ENABLED;
        AdjustTokenPrivileges(hToken, FALSE, &tp, sizeof(tp), nullptr, nullptr);
    }

    CloseHandle(hToken);
    return true;
}

std::wstring ToLower(const std::wstring& str) {
    std::wstring lower = str;
    std::transform(lower.begin(), lower.end(), lower.begin(), ::towlower);
    return lower;
}

std::wstring EscapeJsonString(const std::wstring& input) {
    std::wstring out;
    for (wchar_t c : input) {
        if (c == L'\\') out += L"\\\\";
        else if (c == L'"') out += L"\\\"";
        else if (c == L'\n') out += L"\\n";
        else if (c == L'\r') out += L"\\r";
        else if (c == L'\t') out += L"\\t";
        else out += c;
    }
    return out;
}

std::wstring GetProcessPathById(DWORD processId) {
    if (processId == 0) return L"System Idle Process";
    if (processId == 4) return L"System";

    std::wstring processPath = L"Unknown Process";
    
    // Method 1: PROCESS_QUERY_LIMITED_INFORMATION
    HANDLE hProcess = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_QUERY_INFORMATION, FALSE, processId);
    if (!hProcess) {
        hProcess = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, FALSE, processId);
    }

    if (hProcess) {
        wchar_t buffer[MAX_PATH];
        DWORD size = MAX_PATH;
        if (QueryFullProcessImageNameW(hProcess, 0, buffer, &size)) {
            processPath = buffer;
        } else if (GetProcessImageFileNameW(hProcess, buffer, MAX_PATH)) {
            processPath = buffer;
        }
        CloseHandle(hProcess);
    }
    return processPath;
}

// Strict whitelist for legitimate OS and GPU overlays ONLY
bool IsKnownVendorOverlay(const std::wstring& processPath, const std::wstring& className) {
    std::wstring lowerPath = ToLower(processPath);
    std::wstring lowerClass = ToLower(className);

    // AMD Radeon Software Overlay
    if (lowerPath.find(L"amdow.exe") != std::wstring::npos ||
        (lowerPath.find(L"radeonsoftware") != std::wstring::npos && lowerClass.find(L"amddvroverlay") != std::wstring::npos)) {
        return true;
    }

    // NVIDIA GeForce Experience
    if (lowerPath.find(L"nvcontainer.exe") != std::wstring::npos ||
        lowerPath.find(L"nvidiatosoverlay.exe") != std::wstring::npos) {
        return true;
    }

    // Windows Shell Experience / System Tray (Explorer)
    if (lowerPath.find(L"explorer.exe") != std::wstring::npos &&
        (lowerClass == L"shell_traywnd" || lowerClass == L"progman" || lowerClass == L"workerw")) {
        return true;
    }

    return false;
}

std::wstring AffinityToString(DWORD affinity) {
    switch (affinity) {
        case WDA_NONE:
            return L"WDA_NONE (0x00)";
        case WDA_MONITOR:
            return L"WDA_MONITOR (0x01)";
        case WDA_EXCLUDEFROMCAPTURE:
            return L"WDA_EXCLUDEFROMCAPTURE (0x11)";
        default: {
            wchar_t buf[32];
            swprintf_s(buf, L"0x%08X", affinity);
            return buf;
        }
    }
}

// Deep inspection of any HWND
void InspectWindowHandle(HWND hwnd, std::vector<DetectedWindowInfo>& detectedList, DWORD currentProcessId) {
    if (!IsWindow(hwnd)) return;

    DWORD procId = 0;
    GetWindowThreadProcessId(hwnd, &procId);

    // Skip our own process and invalid IDs
    if (procId == currentProcessId || procId == 0) {
        return;
    }

    // Query Display Affinity
    DWORD affinity = WDA_NONE;
    BOOL hasAffinity = GetWindowDisplayAffinity(hwnd, &affinity);

    LONG_PTR exStyle = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
    LONG_PTR style = GetWindowLongPtrW(hwnd, GWL_STYLE);
    bool isVisible = (IsWindowVisible(hwnd) != FALSE);
    bool isTopmost = (exStyle & WS_EX_TOPMOST) != 0;
    bool isLayered = (exStyle & WS_EX_LAYERED) != 0;
    bool isTransparent = (exStyle & WS_EX_TRANSPARENT) != 0;
    bool isToolWindow = (exStyle & WS_EX_TOOLWINDOW) != 0;
    bool isNoActivate = (exStyle & WS_EX_NOACTIVATE) != 0;

    RECT rect{ 0, 0, 0, 0 };
    GetWindowRect(hwnd, &rect);
    int width = rect.right - rect.left;
    int height = rect.bottom - rect.top;

    bool isThreat = false;
    std::wstring reason = L"";

    // 1. Primary Check: Non-Zero Display Affinity (WDA_EXCLUDEFROMCAPTURE or WDA_MONITOR)
    if (hasAffinity && affinity != WDA_NONE) {
        isThreat = true;
        reason = L"WDA_EXCLUDEFROMCAPTURE: Window explicitly blotted from video & screen recording";
    }
    // 2. Secondary Check: Topmost Transparent Layered Overlay (Stealth AI teleprompter / assistant)
    else if (isTopmost && isLayered && (isTransparent || isToolWindow || isNoActivate) && isVisible && (width > 80 && height > 40)) {
        std::wstring procName = GetProcessPathById(procId);
        std::wstring lowerProc = ToLower(procName);
        if (lowerProc.find(L"explorer.exe") == std::wstring::npos && 
            lowerProc.find(L"taskmgr.exe") == std::wstring::npos &&
            lowerProc.find(L"dwm.exe") == std::wstring::npos) {
            isThreat = true;
            reason = L"STEALTH_OVERLAY: Topmost transparent layered window hovering over desktop";
        }
    }

    if (isThreat) {
        // Prevent duplicate HWND records
        for (const auto& item : detectedList) {
            if (item.hwnd == hwnd) return;
        }

        DetectedWindowInfo info{};
        info.hwnd = hwnd;
        info.processId = procId;
        info.affinity = affinity;
        info.exStyle = exStyle;
        info.style = style;
        info.rect = rect;
        info.isVisible = isVisible;
        info.isTopmost = isTopmost;
        info.isTransparentLayered = isLayered && isTransparent;
        info.threatReason = reason;

        info.processName = GetProcessPathById(procId);

        wchar_t titleBuf[512] = { 0 };
        GetWindowTextW(hwnd, titleBuf, ARRAYSIZE(titleBuf));
        info.windowTitle = titleBuf;

        wchar_t classBuf[256] = { 0 };
        GetClassNameW(hwnd, classBuf, ARRAYSIZE(classBuf));
        info.className = classBuf;

        info.isKnownSystemOverlay = IsKnownVendorOverlay(info.processName, info.className);

        detectedList.push_back(info);
    }
}

// Child Window Callback
BOOL CALLBACK EnumChildProc(HWND hwnd, LPARAM lParam) {
    auto* pContext = reinterpret_cast<std::pair<std::vector<DetectedWindowInfo>*, DWORD>*>(lParam);
    InspectWindowHandle(hwnd, *(pContext->first), pContext->second);
    return TRUE;
}

// Top-Level Window Callback
BOOL CALLBACK EnumWindowsProc(HWND hwnd, LPARAM lParam) {
    auto* pContext = reinterpret_cast<std::pair<std::vector<DetectedWindowInfo>*, DWORD>*>(lParam);
    InspectWindowHandle(hwnd, *(pContext->first), pContext->second);

    // Deep scan child windows attached to this window
    EnumChildWindows(hwnd, EnumChildProc, lParam);
    return TRUE;
}

std::vector<DetectedWindowInfo> ScanAllSystemWindows() {
    EnableDebugPrivilege();
    DWORD currentPid = GetCurrentProcessId();

    std::vector<DetectedWindowInfo> detected;
    std::pair<std::vector<DetectedWindowInfo>*, DWORD> context(&detected, currentPid);

    EnumWindows(EnumWindowsProc, reinterpret_cast<LPARAM>(&context));
    return detected;
}

void PrintJsonOutput(const std::vector<DetectedWindowInfo>& results, bool filterKnown) {
    std::vector<DetectedWindowInfo> filtered;
    for (const auto& item : results) {
        if (!filterKnown || !item.isKnownSystemOverlay) {
            filtered.push_back(item);
        }
    }

    std::wcout << L"{\"threatCount\":" << filtered.size() << L",\"threats\":[";
    bool first = true;

    for (const auto& item : filtered) {
        if (!first) std::wcout << L",";
        first = false;

        int width = item.rect.right - item.rect.left;
        int height = item.rect.bottom - item.rect.top;

        std::wcout << L"{"
                   << L"\"hwnd\":\"0x" << std::hex << (ULONG_PTR)item.hwnd << std::dec << L"\","
                   << L"\"pid\":" << item.processId << L","
                   << L"\"path\":\"" << EscapeJsonString(item.processName) << L"\","
                   << L"\"title\":\"" << EscapeJsonString(item.windowTitle) << L"\","
                   << L"\"className\":\"" << EscapeJsonString(item.className) << L"\","
                   << L"\"affinity\":\"" << AffinityToString(item.affinity) << L"\","
                   << L"\"affinityCode\":" << item.affinity << L","
                   << L"\"isVisible\":" << (item.isVisible ? L"true" : L"false") << L","
                   << L"\"isTopmost\":" << (item.isTopmost ? L"true" : L"false") << L","
                   << L"\"width\":" << width << L","
                   << L"\"height\":" << height << L","
                   << L"\"reason\":\"" << EscapeJsonString(item.threatReason) << L"\""
                   << L"}";
    }
    std::wcout << L"]}" << std::endl;
}

void PrintTextOutput(const std::vector<DetectedWindowInfo>& results, bool filterKnown) {
    std::vector<DetectedWindowInfo> suspicious;
    for (const auto& item : results) {
        if (!filterKnown || !item.isKnownSystemOverlay) {
            suspicious.push_back(item);
        }
    }

    std::wcout << L"================================================================================" << std::endl;
    std::wcout << L"         DISPLAY AFFINITY & STEALTH OVERLAY DETECTOR SCAN RESULT                " << std::endl;
    std::wcout << L"================================================================================" << std::endl;

    if (suspicious.empty()) {
        std::wcout << L"[OK] No suspicious anti-capture evasion windows detected." << std::endl;
    } else {
        std::wcout << L"[!] HIGH ALERT: Detected " << suspicious.size() 
                   << L" unauthorized window(s) hiding from screen recorders or hovering over desktop:" << std::endl << std::endl;

        for (size_t i = 0; i < suspicious.size(); ++i) {
            const auto& item = suspicious[i];
            int width = item.rect.right - item.rect.left;
            int height = item.rect.bottom - item.rect.top;

            std::wcout << L"--- [ SUSPICIOUS WINDOW #" << (i + 1) << L" ] ---" << std::endl;
            std::wcout << L"  Executable Path    : " << item.processName << std::endl;
            std::wcout << L"  Process ID (PID)   : " << item.processId << std::endl;
            std::wcout << L"  HWND               : 0x" << std::hex << (ULONG_PTR)item.hwnd << std::dec << std::endl;
            std::wcout << L"  Window Title       : " << (item.windowTitle.empty() ? L"(No Title)" : item.windowTitle) << std::endl;
            std::wcout << L"  Window Class       : " << item.className << std::endl;
            std::wcout << L"  Affinity Flag      : " << AffinityToString(item.affinity) << std::endl;
            std::wcout << L"  Reason             : " << item.threatReason << std::endl;
            std::wcout << L"  Visibility State   : " << (item.isVisible ? L"VISIBLE (Candidate Can See It)" : L"Hidden") << std::endl;
            std::wcout << L"  Dimensions         : " << width << L"x" << height << std::endl;
            std::wcout << std::endl;
        }
    }
    std::wcout << L"================================================================================" << std::endl;
}

int main(int argc, char* argv[]) {
    bool jsonOutput = false;
    bool filterKnown = true;

    for (int i = 1; i < argc; ++i) {
        if (strcmp(argv[i], "--json") == 0) {
            jsonOutput = true;
        } else if (strcmp(argv[i], "--show-all") == 0) {
            filterKnown = false;
        }
    }

    auto results = ScanAllSystemWindows();

    if (jsonOutput) {
        PrintJsonOutput(results, filterKnown);
    } else {
        PrintTextOutput(results, filterKnown);
    }

    return 0;
}
