#include "../../include/core/ThreatReporter.h"
#include <sstream>
#include <iomanip>

static std::string EscapeJsonString(const std::string& input) {
    std::ostringstream ss;
    for (char c : input) {
        if (c == '"') ss << "\\\"";
        else if (c == '\\') ss << "\\\\";
        else if (c == '\b') ss << "\\b";
        else if (c == '\f') ss << "\\f";
        else if (c == '\n') ss << "\\n";
        else if (c == '\r') ss << "\\r";
        else if (c == '\t') ss << "\\t";
        else if (static_cast<unsigned char>(c) < 0x20) {
            ss << "\\u" << std::hex << std::setw(4) << std::setfill('0') << static_cast<int>(c);
        } else {
            ss << c;
        }
    }
    return ss.str();
}

std::string ThreatReporter::ToJson(const std::vector<ThreatRecord>& threats) {
    std::ostringstream oss;
    oss << "{\"hasThreat\":" << (threats.empty() ? "false" : "true")
        << ",\"threatCount\":" << threats.size()
        << ",\"threats\":[";

    for (size_t i = 0; i < threats.size(); ++i) {
        const auto& t = threats[i];
        if (i > 0) oss << ",";
        oss << "{"
            << "\"pid\":" << t.pid << ","
            << "\"hwnd\":\"0x" << std::hex << reinterpret_cast<uintptr_t>(t.hwnd) << std::dec << "\","
            << "\"title\":\"" << EscapeJsonString(t.title) << "\","
            << "\"path\":\"" << EscapeJsonString(t.path) << "\","
            << "\"affinity\":" << t.affinity << ","
            << "\"affinityHex\":\"0x" << std::hex << t.affinity << std::dec << "\","
            << "\"type\":\"" << EscapeJsonString(t.type) << "\","
            << "\"severity\":\"" << EscapeJsonString(t.severity) << "\","
            << "\"details\":\"" << EscapeJsonString(t.details) << "\""
            << "}";
    }
    oss << "]}";
    return oss.str();
}
