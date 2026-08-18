#pragma once
#include <string>

// Platform detection macros
#if defined(_WIN32) || defined(_WIN64)
    #define PLATFORM_WINDOWS
#elif defined(__APPLE__) || defined(__MACH__)
    #define PLATFORM_MACOS
#elif defined(__linux__)
    #define PLATFORM_LINUX
#else
    #define PLATFORM_UNKNOWN
#endif

namespace Platform {
    enum class OS {
        Windows,
        Linux,
        MacOS,
        Unknown
    };

    OS GetCurrentOS();
    std::string GetOSName();
    bool IsX11Available();
    bool IsWaylandSession();
}
