#pragma once
#include <vector>
#include "ThreatReporter.h"

class DetectorEngine {
public:
    DetectorEngine();
    ~DetectorEngine();

    std::vector<ThreatRecord> RunFullSecurityScan();
    void AntiDebugSelfCheck();
};
