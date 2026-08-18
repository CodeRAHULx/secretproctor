#include "../include/core/DetectorEngine.h"
#include "../include/core/ThreatReporter.h"
#include "../include/platform/ProcessScanner.h"
#include "../include/platform/Platform.h"
#include <iostream>
#include <string>
#include <cstring>

static bool TerminateProcessById(unsigned long pid) {
    if (pid <= 1) return false;
    return ProcessScanner::TerminateProcess(pid);
}

int main(int argc, char* argv[]) {
    // Check command line arguments
    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];

        if (arg == "--kill-pid" && i + 1 < argc) {
            unsigned long pid = std::stoul(argv[i + 1]);
            bool ok = TerminateProcessById(pid);
            std::cout << "{\"success\":" << (ok ? "true" : "false") << ",\"pid\":" << pid << "}" << std::endl;
            return ok ? 0 : 1;

        } else if (arg == "--version") {
            std::cout << "{\"version\":\"2.0.0\",\"platform\":\"" << Platform::GetOSName() << "\"";
            std::cout << ",\"affinitySupport\":" << (WindowScanner::SupportsAffinityDetection() ? "true" : "false");
            std::cout << "}" << std::endl;
            return 0;

        } else if (arg == "--help" || arg == "-h") {
            std::cout << "SecureMeet Native Anti-Cheat Detector v2.0.0" << std::endl;
            std::cout << "Platform: " << Platform::GetOSName() << std::endl;
            std::cout << "" << std::endl;
            std::cout << "Usage: " << argv[0] << " [options]" << std::endl;
            std::cout << "" << std::endl;
            std::cout << "Options:" << std::endl;
            std::cout << "  --json              Output scan results in JSON format (default)" << std::endl;
            std::cout << "  --kill-pid <pid>    Terminate process by PID" << std::endl;
            std::cout << "  --version           Show version and platform info" << std::endl;
            std::cout << "  --help, -h          Show this help message" << std::endl;
            return 0;
        }
    }

    // Run full security scan
    DetectorEngine engine;
    auto threats = engine.RunFullSecurityScan();
    std::cout << ThreatReporter::ToJson(threats) << std::endl;

    return 0;
}
