#pragma once

#include <string>

// ------------------------------------------------------------
// Operating system
// ------------------------------------------------------------

#if defined(_WIN32) || defined(_WIN64)

    #define PLATFORM_WINDOWS 1

#elif defined(__APPLE__) && defined(__MACH__)

    #define PLATFORM_MACOS 1

#elif defined(__linux__)

    #define PLATFORM_LINUX 1

#else

    #define PLATFORM_UNKNOWN 1

#endif


// ------------------------------------------------------------
// Architecture
// ------------------------------------------------------------

#if defined(_M_X64) || defined(__x86_64__)

    #define PLATFORM_ARCH_X64 1

#elif defined(_M_IX86) || defined(__i386__)

    #define PLATFORM_ARCH_X86 1

#elif defined(_M_ARM64) || defined(__aarch64__)

    #define PLATFORM_ARCH_ARM64 1

#elif defined(_M_ARM) || defined(__arm__)

    #define PLATFORM_ARCH_ARM32 1

#else

    #define PLATFORM_ARCH_UNKNOWN 1

#endif


namespace Platform {

enum class OS {
    Windows,
    Linux,
    MacOS,
    Unknown
};

enum class Architecture {
    X86,
    X64,
    ARM32,
    ARM64,
    Unknown
};

OS GetCurrentOS();

Architecture GetArchitecture();

std::string GetOSName();

bool IsX11Available();

bool IsWaylandSession();

} // namespace Platform