#pragma once
#include <string>
#include <vector>

struct ThreatRecord {
    unsigned long pid = 0;
    void* hwnd = nullptr;
    std::string title;
    std::string path;
    unsigned long affinity = 0;
    std::string type;       // "WDA_EXCLUDEFROMCAPTURE_STEALTH", "VM_SANDBOX", "SCREEN_RECORDER", "DEBUGGER", "KEY_MACRO", "DUAL_TAB"
    std::string severity;   // "CRITICAL", "HIGH", "MEDIUM"
    std::string details;
};

class ThreatReporter {
public:
    static std::string ToJson(const std::vector<ThreatRecord>& threats);
};
