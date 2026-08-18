#include "../../include/platform/WindowScanner.h"
#include "../../include/platform/Platform.h"

#ifdef PLATFORM_MACOS
#include <CoreGraphics/CoreGraphics.h>
#include <CoreFoundation/CoreFoundation.h>
#include <vector>

std::vector<WindowInfo> WindowScanner::GetAllWindows() {
    std::vector<WindowInfo> windows;

    // Get list of all windows
    CFArrayRef windowList = CGWindowListCopyWindowInfo(
        kCGWindowListOptionAll | kCGWindowListExcludeDesktopElements,
        kCGNullWindowID
    );

    if (!windowList) return windows;

    CFIndex count = CFArrayGetCount(windowList);

    for (CFIndex i = 0; i < count; i++) {
        CFDictionaryRef windowDict = (CFDictionaryRef)CFArrayGetValueAtIndex(windowList, i);
        if (!windowDict) continue;

        WindowInfo info;

        // Get window ID
        CFNumberRef windowID = (CFNumberRef)CFDictionaryGetValue(windowDict, kCGWindowNumber);
        if (windowID) {
            uint32_t winID;
            CFNumberGetValue(windowID, kCFNumberSInt32Type, &winID);
            info.handle = reinterpret_cast<void*>(static_cast<uintptr_t>(winID));
        }

        // Get PID
        CFNumberRef pidRef = (CFNumberRef)CFDictionaryGetValue(windowDict, kCGWindowOwnerPID);
        if (pidRef) {
            int32_t pid;
            CFNumberGetValue(pidRef, kCFNumberSInt32Type, &pid);
            info.pid = static_cast<unsigned long>(pid);
        }

        // Get window title
        CFStringRef titleRef = (CFStringRef)CFDictionaryGetValue(windowDict, kCGWindowName);
        if (titleRef) {
            char title[512];
            if (CFStringGetCString(titleRef, title, sizeof(title), kCFStringEncodingUTF8)) {
                info.title = title;
            }
        }

        // Get window owner name (class)
        CFStringRef ownerRef = (CFStringRef)CFDictionaryGetValue(windowDict, kCGWindowOwnerName);
        if (ownerRef) {
            char owner[256];
            if (CFStringGetCString(ownerRef, owner, sizeof(owner), kCFStringEncodingUTF8)) {
                info.className = owner;
            }
        }

        // Get window layer
        CFNumberRef layerRef = (CFNumberRef)CFDictionaryGetValue(windowDict, kCGWindowLayer);
        if (layerRef) {
            int32_t layer;
            CFNumberGetValue(layerRef, kCFNumberSInt32Type, &layer);
            info.isTopmost = (layer > 0); // Layers above 0 are overlays
        }

        // Get window bounds
        CFDictionaryRef boundsRef = (CFDictionaryRef)CFDictionaryGetValue(windowDict, kCGWindowBounds);
        if (boundsRef) {
            CGRect bounds;
            if (CGRectMakeWithDictionaryRepresentation(boundsRef, &bounds)) {
                info.width = static_cast<int>(bounds.size.width);
                info.height = static_cast<int>(bounds.size.height);
            }
        }

        // Check if window is on screen
        CFNumberRef isOnScreenRef = (CFNumberRef)CFDictionaryGetValue(windowDict, kCGWindowIsOnscreen);
        if (isOnScreenRef) {
            int32_t isOnScreen;
            CFNumberGetValue(isOnScreenRef, kCFNumberSInt32Type, &isOnScreen);
            info.isVisible = (isOnScreen != 0);
        }

        // Get sharing state (kCGWindowSharingNone means excluded from capture)
        CFNumberRef sharingRef = (CFNumberRef)CFDictionaryGetValue(windowDict, kCGWindowSharingState);
        if (sharingRef) {
            int32_t sharingState;
            CFNumberGetValue(sharingRef, kCFNumberSInt32Type, &sharingState);

            // kCGWindowSharingNone = 0 means window is excluded from screen capture
            if (sharingState == 0) {
                info.affinity = 0x11; // Mark as excluded from capture
            }
        }

        windows.push_back(info);
    }

    CFRelease(windowList);
    return windows;
}

std::vector<WindowInfo> WindowScanner::GetWindowsWithDisplayAffinity() {
    std::vector<WindowInfo> affinity_windows;
    auto allWindows = GetAllWindows();

    for (const auto& win : allWindows) {
        // Check for windows with kCGWindowSharingNone (excluded from screen capture)
        // or windows with elevated layers (overlays)
        if (win.affinity == 0x11 || (win.isTopmost && win.isVisible && win.width > 200 && win.height > 100)) {
            affinity_windows.push_back(win);
        }
    }

    return affinity_windows;
}

bool WindowScanner::SupportsAffinityDetection() {
    return true; // macOS supports kCGWindowSharingState detection
}

#endif
