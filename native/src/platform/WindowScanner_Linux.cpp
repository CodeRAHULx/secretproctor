#include "../../include/platform/WindowScanner.h"
#include "../../include/platform/Platform.h"

#ifdef PLATFORM_LINUX

#ifdef HAVE_X11
#include <X11/Xlib.h>
#include <X11/Xatom.h>
#include <X11/Xutil.h>
#include <cstring>
#endif

std::vector<WindowInfo> WindowScanner::GetAllWindows() {
    std::vector<WindowInfo> windows;

#ifdef HAVE_X11
    if (!Platform::IsX11Available()) {
        return windows; // Wayland doesn't allow window enumeration
    }

    Display* display = XOpenDisplay(nullptr);
    if (!display) return windows;

    Window root = DefaultRootWindow(display);
    Atom clientListAtom = XInternAtom(display, "_NET_CLIENT_LIST", False);
    Atom pidAtom = XInternAtom(display, "_NET_WM_PID", False);
    Atom nameAtom = XInternAtom(display, "_NET_WM_NAME", False);
    Atom utf8Atom = XInternAtom(display, "UTF8_STRING", False);

    Atom actualType;
    int actualFormat;
    unsigned long numItems, bytesAfter;
    unsigned char* data = nullptr;

    // Get list of all windows
    if (XGetWindowProperty(display, root, clientListAtom, 0, (~0L), False,
                          AnyPropertyType, &actualType, &actualFormat,
                          &numItems, &bytesAfter, &data) == Success && data) {

        Window* windowList = reinterpret_cast<Window*>(data);

        for (unsigned long i = 0; i < numItems; i++) {
            Window win = windowList[i];
            WindowInfo info;
            info.handle = reinterpret_cast<void*>(win);

            // Get PID
            unsigned char* pidData = nullptr;
            if (XGetWindowProperty(display, win, pidAtom, 0, 1, False,
                                  XA_CARDINAL, &actualType, &actualFormat,
                                  &numItems, &bytesAfter, &pidData) == Success && pidData) {
                info.pid = *reinterpret_cast<unsigned long*>(pidData);
                XFree(pidData);
            }

            // Get window title
            unsigned char* nameData = nullptr;
            if (XGetWindowProperty(display, win, nameAtom, 0, (~0L), False,
                                  utf8Atom, &actualType, &actualFormat,
                                  &numItems, &bytesAfter, &nameData) == Success && nameData) {
                info.title = reinterpret_cast<char*>(nameData);
                XFree(nameData);
            }

            // Get window class
            XClassHint classHint;
            if (XGetClassHint(display, win, &classHint)) {
                info.className = classHint.res_class ? classHint.res_class : "";
                if (classHint.res_name) XFree(classHint.res_name);
                if (classHint.res_class) XFree(classHint.res_class);
            }

            // Get window attributes
            XWindowAttributes attrs;
            if (XGetWindowAttributes(display, win, &attrs)) {
                info.isVisible = (attrs.map_state == IsViewable);
                info.width = attrs.width;
                info.height = attrs.height;
            }

            // Check if window is topmost (overlay)
            Atom stateAtom = XInternAtom(display, "_NET_WM_STATE", False);
            Atom aboveAtom = XInternAtom(display, "_NET_WM_STATE_ABOVE", False);
            unsigned char* stateData = nullptr;

            if (XGetWindowProperty(display, win, stateAtom, 0, (~0L), False,
                                  XA_ATOM, &actualType, &actualFormat,
                                  &numItems, &bytesAfter, &stateData) == Success && stateData) {
                Atom* states = reinterpret_cast<Atom*>(stateData);
                for (unsigned long j = 0; j < numItems; j++) {
                    if (states[j] == aboveAtom) {
                        info.isTopmost = true;
                        break;
                    }
                }
                XFree(stateData);
            }

            windows.push_back(info);
        }

        XFree(data);
    }

    XCloseDisplay(display);
#endif

    return windows;
}

std::vector<WindowInfo> WindowScanner::GetWindowsWithDisplayAffinity() {
    std::vector<WindowInfo> suspicious_windows;

#ifdef HAVE_X11
    if (!Platform::IsX11Available()) {
        return suspicious_windows;
    }

    auto allWindows = GetAllWindows();

    // On Linux, detect suspicious overlay windows that might be hiding from screen capture
    for (const auto& win : allWindows) {
        // Flag windows that are topmost AND have suspicious characteristics
        if (win.isTopmost && win.isVisible) {
            // Check if window dimensions suggest it's an overlay
            if (win.width > 200 && win.height > 100) {
                WindowInfo suspicious = win;
                suspicious.affinity = 0x11; // Mimic WDA_EXCLUDEFROMCAPTURE for consistency
                suspicious_windows.push_back(suspicious);
            }
        }
    }
#endif

    return suspicious_windows;
}

bool WindowScanner::SupportsAffinityDetection() {
#ifdef HAVE_X11
    return Platform::IsX11Available(); // Partial support on X11, none on Wayland
#else
    return false;
#endif
}

#endif
