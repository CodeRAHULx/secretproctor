#pragma once
#include <vector>
#include <string>

struct WindowInfo {
    void* handle;           // HWND on Windows, Window on X11, CGWindowID on macOS
    unsigned long pid;
    std::string title;
    std::string className;
    unsigned long affinity;
    bool isVisible;
    bool isTopmost;
    int width;
    int height;
};

class WindowScanner {
public:
    static std::vector<WindowInfo> GetAllWindows();
    static std::vector<WindowInfo> GetWindowsWithDisplayAffinity();
    static bool SupportsAffinityDetection();
};
