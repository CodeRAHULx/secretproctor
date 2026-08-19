#include "../../include/detectors/VMDetector.h"
#include "../../include/platform/ProcessScanner.h"
#include "../../include/platform/Platform.h"

#include <string>
#include <vector>
#include <utility>
#include <algorithm>
#include <cctype>

#if defined(PLATFORM_WINDOWS) && (defined(_M_X64) || defined(_M_IX86))
    #include <intrin.h>
#elif defined(PLATFORM_LINUX) && (defined(__x86_64__) || defined(__i386__))
    #include <cpuid.h>
#endif

#ifdef PLATFORM_LINUX
    #include <fstream>
#endif

#ifdef PLATFORM_MACOS
    #include <sys/sysctl.h>
#endif


namespace {

std::string ToLower(std::string value)
{
    std::transform(
        value.begin(),
        value.end(),
        value.begin(),
        [](unsigned char c) {
            return static_cast<char>(std::tolower(c));
        }
    );

    return value;
}

bool ContainsIgnoreCase(const std::string& value,
                        const std::string& search)
{
    const std::string lowerValue = ToLower(value);
    const std::string lowerSearch = ToLower(search);

    return lowerValue.find(lowerSearch) != std::string::npos;
}

} // namespace


bool VMDetector::IsHypervisorPresent()
{
#if defined(PLATFORM_WINDOWS) && \
    (defined(_M_X64) || defined(_M_IX86))

    int cpuInfo[4] = { 0 };

    __cpuid(cpuInfo, 1);

    // CPUID leaf 1, ECX bit 31:
    // hypervisor-present bit.
    return (cpuInfo[2] & (1 << 31)) != 0;

#elif defined(PLATFORM_LINUX) && \
      (defined(__x86_64__) || defined(__i386__))

    unsigned int eax = 0;
    unsigned int ebx = 0;
    unsigned int ecx = 0;
    unsigned int edx = 0;

    if (__get_cpuid(1, &eax, &ebx, &ecx, &edx))
    {
        return (ecx & (1u << 31)) != 0;
    }

    return false;

#else

    // CPUID-based detection is not available on this architecture.
    return false;

#endif
}


std::vector<ThreatRecord> VMDetector::Scan()
{
    std::vector<ThreatRecord> threats;

    bool vmDetected = false;
    std::vector<std::string> evidence;

    auto AddEvidence = [&](const std::string& description)
    {
        vmDetected = true;
        evidence.push_back(description);
    };


    // ------------------------------------------------------------
    // CPU hypervisor detection
    // ------------------------------------------------------------

    if (IsHypervisorPresent())
    {
        AddEvidence(
            "CPU reports hypervisor presence via CPUID."
        );
    }


#ifdef PLATFORM_LINUX

    // ------------------------------------------------------------
    // Linux /proc/cpuinfo
    // ------------------------------------------------------------

    {
        std::ifstream cpuinfo("/proc/cpuinfo");

        if (cpuinfo.is_open())
        {
            std::string line;

            while (std::getline(cpuinfo, line))
            {
                if (ContainsIgnoreCase(line, "hypervisor"))
                {
                    AddEvidence(
                        "Linux /proc/cpuinfo contains the hypervisor flag."
                    );

                    break;
                }
            }
        }
    }


    // ------------------------------------------------------------
    // Linux DMI product information
    // ------------------------------------------------------------

    {
        std::ifstream dmi(
            "/sys/devices/virtual/dmi/id/product_name"
        );

        if (dmi.is_open())
        {
            std::string product;

            std::getline(dmi, product);

            if (!product.empty())
            {
                if (ContainsIgnoreCase(product, "virtualbox") ||
                    ContainsIgnoreCase(product, "vmware") ||
                    ContainsIgnoreCase(product, "qemu") ||
                    ContainsIgnoreCase(product, "kvm") ||
                    ContainsIgnoreCase(product, "microsoft corporation"))
                {
                    AddEvidence(
                        "Linux DMI product information indicates a "
                        "virtualized environment: " + product
                    );
                }
            }
        }
    }

#endif


#ifdef PLATFORM_MACOS

    // ------------------------------------------------------------
    // macOS hardware model
    // ------------------------------------------------------------

    {
        char hwModel[256] = { 0 };
        size_t length = sizeof(hwModel);

        if (sysctlbyname(
                "hw.model",
                hwModel,
                &length,
                nullptr,
                0) == 0)
        {
            std::string model(hwModel);

            if (ContainsIgnoreCase(model, "vmware") ||
                ContainsIgnoreCase(model, "virtualbox") ||
                ContainsIgnoreCase(model, "parallels") ||
                ContainsIgnoreCase(model, "qemu"))
            {
                AddEvidence(
                    "macOS hardware model indicates virtualization: " +
                    model
                );
            }
        }
    }

#endif


    // ------------------------------------------------------------
    // Guest integration processes
    // ------------------------------------------------------------

#if defined(PLATFORM_WINDOWS)

    const std::vector<std::pair<std::string, std::string>> vmProcesses = {
        { "vboxservice", "VirtualBox Guest Service" },
        { "vboxtray",    "VirtualBox Guest Tray" },

        { "vmtoolsd",    "VMware Tools Service" },
        { "vmacthlp",    "VMware Activation Helper" },

        { "prl_tools",   "Parallels Tools" },
        { "prl_cc",      "Parallels Control Center" }
    };

#elif defined(PLATFORM_LINUX)

    const std::vector<std::pair<std::string, std::string>> vmProcesses = {
        { "vboxservice",        "VirtualBox Guest Service" },
        { "vboxclient",         "VirtualBox Guest Client" },

        { "vmtoolsd",           "VMware Tools Daemon" },
        { "vmware-vmblock-fuse","VMware Block Filesystem" },

        { "qemu-ga",            "QEMU Guest Agent" },

        { "prl_tools",          "Parallels Tools" },
        { "prl_cc",             "Parallels Control Center" },

        { "hv_kvp_daemon",      "Hyper-V KVP Daemon" },
        { "hv_vss_daemon",      "Hyper-V VSS Daemon" }
    };

#elif defined(PLATFORM_MACOS)

    const std::vector<std::pair<std::string, std::string>> vmProcesses = {
        { "vmware",      "VMware Guest Component" },
        { "prl_tools",   "Parallels Tools" }
    };

#else

    const std::vector<std::pair<std::string, std::string>> vmProcesses = {};

#endif


    for (const auto& [processName, description] : vmProcesses)
    {
        ProcessInfo found;

        if (ProcessScanner::FindProcess(processName, found))
        {
            AddEvidence(
                description + " is running (" +
                processName + ")."
            );
        }
    }


    // ------------------------------------------------------------
    // Create ONE aggregated finding
    // ------------------------------------------------------------

    if (vmDetected)
    {
        ThreatRecord threat;

        threat.pid = 0;
        threat.title = "Virtual Machine Environment Detected";
        threat.path = "Multiple VM detection signals";
        threat.type = "VIRTUAL_MACHINE_DETECTED";

        // VM presence alone is not inherently malicious.
        // Use a moderate severity and let policy decide whether
        // virtualized environments are permitted.
        threat.severity =
            evidence.size() >= 2 ? "MEDIUM" : "LOW";

        threat.details =
            "The system appears to be running inside a virtualized "
            "environment. Evidence: ";

        for (std::size_t i = 0; i < evidence.size(); ++i)
        {
            if (i != 0)
                threat.details += " ";

            threat.details += evidence[i];

            if (i + 1 < evidence.size())
                threat.details += ";";
        }

        threats.push_back(std::move(threat));
    }

    return threats;
}