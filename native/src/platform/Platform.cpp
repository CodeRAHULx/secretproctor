#include "../../include/platform/Platform.h"
#include <cstdlib>
#include <cstring>

namespace Platform {
    OS GetCurrentOS() {
#ifdef PLATFORM_WINDOWS
        return OS::Windows;
#elif defined(PLATFORM_MACOS)
        return OS::MacOS;
#elif defined(PLATFORM_LINUX)
        return OS::Linux;
#else
        return OS::Unknown;
#endif
    }

    std::string GetOSName() {
        OS os = GetCurrentOS();
        switch (os) {
            case OS::Windows: return "Windows";
            case OS::Linux: return "Linux";
            case OS::MacOS: return "macOS";
            default: return "Unknown";
        }
    }

    bool IsX11Available() {
#ifdef PLATFORM_LINUX
        const char* display = std::getenv("DISPLAY");
        return display != nullptr && std::strlen(display) > 0;
#else
        return false;
#endif
    }

    bool IsWaylandSession() {
#ifdef PLATFORM_LINUX
        const char* wayland = std::getenv("WAYLAND_DISPLAY");
        return wayland != nullptr && std::strlen(wayland) > 0;
#else
        return false;
#endif
    }
}
