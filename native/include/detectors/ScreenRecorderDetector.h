#pragma once
#include <vector>
#include "../core/ThreatReporter.h"

class ScreenRecorderDetector {
public:
    static std::vector<ThreatRecord> Scan();
};
