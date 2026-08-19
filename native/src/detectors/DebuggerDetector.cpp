#include "../../include/detectors/DebuggerDetector.h"
#include "../../include/platform/ProcessScanner.h"
#include "../../include/platform/Platform.h"
#include <string>
#include <vector>
#include <utility>

#ifdef PLATFORM_WINDOWS
#include <windows.h>
#elif defined(PLATFORM_LINUX)
#include <fstream>
#include <sys/ptrace.h>
#include <unistd.h>
#elif defined(PLATFORM_MACOS)
#include <sys/types.h>
#include <sys/sysctl.h>
#include <unistd.h>
#endif

bool DebuggerDetector::IsDebuggerAttached() {
#ifdef PLATFORM_WINDOWS
    if (IsDebuggerPresent()) return true;

    BOOL remoteDebugger = FALSE;
    if (CheckRemoteDebuggerPresent(GetCurrentProcess(), &remoteDebugger) && remoteDebugger) {
        return true;
    }
    return false;

#elif defined(PLATFORM_LINUX)
    // Check /proc/self/status for TracerPid
    std::ifstream statusFile("/proc/self/status");
    if (statusFile.is_open()) {
        std::string line;
        while (std::getline(statusFile, line)) {
            if (line.find("TracerPid:") == 0) {
                int tracerPid = std::stoi(line.substr(10));
                if (tracerPid != 0) {
                    return true;
                }
            }
        }
        statusFile.close();
    } else {
        // Handle file open error
        return false;
    }

    // Try ptrace(PTRACE_TRACEME) - fails if already traced
    if (ptrace(PTRACE_TRACEME, 0, 1, 0) < 0) {
        return true;
    }
    ptrace(PTRACE_DETACH, 0, 1, 0);
    return false;

#elif defined(PLATFORM_MACOS)
    // Use sysctl to check P_TRACED flag
    int mib[4];
    struct kinfo_proc info;
    size_t size = sizeof(info);

    info.kp_proc.p_flag = 0;
    mib[0] = CTL_KERN;
    mib[1] = KERN_PROC;
    mib[2] = KERN_PROC_PID;
    mib[3] = getpid();

    if (sysctl(mib, 4, &info, &size, NULL, 0) == 0) {
        return ((info.kp_proc.p_flag & P_TRACED) != 0);
    }
    return false;

#else
    return false;
#endif
}

std::vector<ThreatRecord> DebuggerDetector::Scan() {
    std::vector<ThreatRecord> threats;

    if (IsDebuggerAttached()) {
        ThreatRecord t;
        t.pid = getpid();
        t.title = "Direct Debugger Attached to Evaluation Engine";
        t.path = "Kernel Debug Port";
        t.type = "ATTACHED_DEBUGGER";
        t.severity = "CRITICAL";
        t.details = "An active debugger is directly attached to the SecureMeet watchdog engine.";
        threats.push_back(t);
    }

    // Cross-platform debugger and reverse engineering tools
    const std::vector<std::pair<std::string, std::string>> debuggers = {
        // Windows
        { "x64dbg", "x64dbg Disassembler" },
        { "x32dbg", "x32dbg Disassembler" },
        { "cheatengine", "Cheat Engine Memory Inspector" },
        { "ida64", "IDA Pro Interactive Disassembler (64-bit)" },
        { "ida", "IDA Pro Interactive Disassembler" },
        { "processhacker", "Process Hacker Memory Editor" },
        { "ollydbg", "OllyDbg Debugger" },
        { "windbg", "WinDbg Debugger" },

        // Linux
        { "gdb", "GNU Debugger (GDB)" },
        { "lldb", "LLVM Debugger" },
        { "strace", "System Call Tracer" },
        { "ltrace", "Library Call Tracer" },
        { "radare2", "Radare2 Reverse Engineering" },
        { "ghidra", "Ghidra Reverse Engineering" },
        { "edb", "Evan's Debugger" },

        // macOS
        { "lldb", "LLVM Debugger" },
        { "dtrace", "DTrace System Tracer" },
        { "dtruss", "DTrace Wrapper" },
        { "Hopper", "Hopper Disassembler" },
        { "IDA Pro", "IDA Pro Disassembler" }
    };

    for (const auto& item : debuggers) {
        ProcessInfo found;
        if (ProcessScanner::FindProcess(item.first, found)) {
            ThreatRecord t;
            t.pid = found.pid;
            t.title = item.second;
            t.path = found.path.empty() ? found.name : found.path;
            t.type = "REVERSE_ENGINEERING_TOOL";
            t.severity = "CRITICAL";
            t.details = "Active memory inspection or reverse engineering tool running on candidate host machine.";
            threats.push_back(t);
        }
    }

    return threats;
}