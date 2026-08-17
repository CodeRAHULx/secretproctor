#pragma once
#include <vector>
#include "../core/ThreatReporter.h"

class KeystrokeDetector {
public:
    static std::vector<ThreatRecord> Scan();
};
