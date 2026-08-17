#pragma once
#include <vector>
#include "../core/ThreatReporter.h"

class DebuggerDetector {
public:
    static std::vector<ThreatRecord> Scan();
    static bool IsDebuggerAttached();
};
