#pragma once
#include <vector>
#include "../core/ThreatReporter.h"

class DualTabDetector {
public:
    static std::vector<ThreatRecord> Scan();
    static bool CheckNamedMutex(const std::string& userId);
};
