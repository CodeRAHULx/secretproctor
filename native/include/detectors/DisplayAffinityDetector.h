#pragma once
#include <vector>
#include "../core/ThreatReporter.h"

class DisplayAffinityDetector {
public:
    static std::vector<ThreatRecord> Scan();
};
