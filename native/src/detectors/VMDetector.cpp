#include "../../include/detectors/VMDetector.h"
#include "../../include/platform/ProcessScanner.h"
#include "../../include/platform/Platform.h"
#include <string>
#include <vector>
#include <utility>

#ifdef PLATFORM_WINDOWS
#include <intrin.h>
#elif defined(PLATFORM_LINUX)
#include <fstream>
#include <cpuid.h>
#elif defined(PLATFORM_MACOS)
#include <sys/sysctl.h>
#include <cpuid.h>
#endif

bool VMDetector::IsHypervisorPresent() {
#if defined(PLATFORM_WINDOWS)
    int cpuInfo[4] = { 0 };
    __cpuid(cpuInfo, 1);
    // Bit 31 of ECX is set if hypervisor is present
    return (cpuInfo[2] & (1 << 31)) != 0;
#elif defined(__x86_64__) || defined(__i386__)
    unsigned int eax, ebx, ecx, edx;
    if (__get_cpuid(1, &eax, &ebx, &ecx, &edx)) {
        return (ecx & (1 << 31)) != 0;
    }
    return false;
#else
    // ARM or other architectures - check via other methods
    return false;
#endif
}

std::vector<ThreatRecord> VMDetector::Scan() {
    std::vector<ThreatRecord> threats;

    // Check CPUID hypervisor bit
    if (IsHypervisorPresent()) {
        ThreatRecord t;
        t.pid = 0;
        t.title = "Hypervisor Detected (CPUID)";
        t.path = "CPUID Leaf 1, ECX bit 31";
        t.type = "VM_SANDBOX_ENVIRONMENT";
        t.severity = "HIGH";
        t.details = "CPU reports hypervisor presence via CPUID instruction. Candidate may be running in a VM.";
        threats.push_back(t);
    }

#ifdef PLATFORM_LINUX
    // Check /proc/cpuinfo for hypervisor
    std::ifstream cpuinfo("/proc/cpuinfo");
    if (cpuinfo.is_open()) {
        std::string line;
        while (std::getline(cpuinfo, line)) {
            if (line.find("hypervisor") != std::string::npos) {
                ThreatRecord t;
                t.pid = 0;
                t.title = "Hypervisor Flag in /proc/cpuinfo";
                t.path = "/proc/cpuinfo";
                t.type = "VM_SANDBOX_ENVIRONMENT";
                t.severity = "HIGH";
                t.details = "Linux kernel reports hypervisor flag in CPU information.";
                threats.push_back(t);
                break;
            }
        }
        cpuinfo.close();
    }

    // Check DMI information
    std::ifstream dmi("/sys/devices/virtual/dmi/id/product_name");
    if (dmi.is_open()) {
        std::string product;
        std::getline(dmi, product);
        if (product.find("VirtualBox") != std::string::npos ||
            product.find("VMware") != std::string::npos ||
            product.find("QEMU") != std::string::npos ||
            product.find("KVM") != std::string::npos) {
            ThreatRecord t;
            t.pid = 0;
            t.title = "VM Product Name: " + product;
            t.path = "/sys/devices/virtual/dmi/id/product_name";
            t.type = "VM_SANDBOX_ENVIRONMENT";
            t.severity = "HIGH";
            t.details = "System DMI information indicates virtual machine: " + product;
            threats.push_back(t);
        }
        dmi.close();
    }
#endif

#ifdef PLATFORM_MACOS
    // Check sysctl for hypervisor
    char hwmodel[256] = {0};
    size_t len = sizeof(hwmodel);
    if (sysctlbyname("hw.model", hwmodel, &len, NULL, 0) == 0) {
        std::string model(hwmodel);
        if (model.find("VMware") != std::string::npos ||
            model.find("VirtualBox") != std::string::npos ||
            model.find("Parallels") != std::string::npos ||
            model.find("QEMU") != std::string::npos) {
            ThreatRecord t;
            t.pid = 0;
            t.title = "VM Hardware Model: " + model;
            t.path = "sysctl hw.model";
            t.type = "VM_SANDBOX_ENVIRONMENT";
            t.severity = "HIGH";
            t.details = "macOS hardware model indicates virtual machine: " + model;
            threats.push_back(t);
        }
    }
#endif

    // Cross-platform VM process detection
    const std::vector<std::pair<std::string, std::string>> vmProcesses = {
        // VirtualBox
        { "vboxservice", "VirtualBox Guest Integration Service" },
        { "vboxtray", "VirtualBox Guest Tray" },
        { "VBoxClient", "VirtualBox Client" },
        { "VBoxService", "VirtualBox Service" },

        // VMware
        { "vmtoolsd", "VMware Tools Daemon" },
        { "vmacthlp", "VMware Activation Helper" },
        { "vmware-vmblock-fuse", "VMware Block Filesystem" },
        { "vmware", "VMware Process" },

        // QEMU/KVM
        { "qemu-ga", "QEMU Guest Agent" },
        { "qemu", "QEMU Process" },

        // Parallels
        { "prl_tools", "Parallels Tools" },
        { "prl_cc", "Parallels Control Center" },

        // Hyper-V
        { "vdagent", "SPICE VDAgent" },
        { "hv_kvp_daemon", "Hyper-V KVP Daemon" },
        { "hv_vss_daemon", "Hyper-V VSS Daemon" }
    };

    for (const auto& item : vmProcesses) {
        ProcessInfo found;
        if (ProcessScanner::FindProcess(item.first, found)) {
            ThreatRecord t;
            t.pid = found.pid;
            t.title = item.second;
            t.path = found.path.empty() ? found.name : found.path;
            t.type = "VM_SANDBOX_ENVIRONMENT";
            t.severity = "HIGH";
            t.details = "Candidate is running the evaluation inside a Virtual Machine / Sandbox (" + item.first + ")";
            threats.push_back(t);
        }
    }

    return threats;
}
