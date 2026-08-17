#pragma once
#include <string>
#include <vector>

// Compile-time XOR string obfuscation to defeat static binary string analysis
namespace SecureCrypto {
    constexpr char XOR_KEY = 0x5A;

    inline std::string Decrypt(const char* data, size_t len) {
        std::string result;
        result.reserve(len);
        for (size_t i = 0; i < len; ++i) {
            result.push_back(data[i] ^ XOR_KEY);
        }
        return result;
    }
}
