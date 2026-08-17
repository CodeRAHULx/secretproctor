#pragma once
#include <vector>
#include "../core/ThreatReporter.h"

class VMDetector {
public:
    static std::vector<ThreatRecord> Scan();
    static bool IsHypervisorPresent();
    static bool CheckVMProcesses();
    static bool CheckVMRegistry();
};
