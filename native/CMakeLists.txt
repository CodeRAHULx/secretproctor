cmake_minimum_required(VERSION 3.15)
project(SecureMeetNativeEngine CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include_directories(include)

# Collect all source files
file(GLOB_RECURSE SOURCES "src/*.cpp")

# Create executable
add_executable(display_affinity_detector ${SOURCES})

# Platform-specific settings
if(WIN32)
    # Windows-specific libraries
    target_link_libraries(display_affinity_detector
        user32
        psapi
        advapi32
    )

    # Output with .exe extension
    set_target_properties(display_affinity_detector PROPERTIES
        RUNTIME_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/bin"
        OUTPUT_NAME "display_affinity_detector"
    )

elseif(APPLE)
    # macOS-specific frameworks
    target_link_libraries(display_affinity_detector
        "-framework CoreFoundation"
        "-framework ApplicationServices"
        "-framework CoreGraphics"
    )

    # Output without extension
    set_target_properties(display_affinity_detector PROPERTIES
        RUNTIME_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/bin"
        OUTPUT_NAME "display_affinity_detector"
    )

elseif(UNIX)
    # Linux-specific libraries
    find_package(X11)
    if(X11_FOUND)
        target_link_libraries(display_affinity_detector ${X11_LIBRARIES})
        target_compile_definitions(display_affinity_detector PRIVATE HAVE_X11)
        include_directories(${X11_INCLUDE_DIR})
        message(STATUS "X11 found - window detection enabled")
    else()
        message(WARNING "X11 not found - window detection will be limited")
    endif()

    # Link pthread and dl for Linux
    target_link_libraries(display_affinity_detector pthread dl)

    # Output without extension
    set_target_properties(display_affinity_detector PROPERTIES
        RUNTIME_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/bin"
        OUTPUT_NAME "display_affinity_detector"
    )
endif()

# Set compiler flags
if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
    target_compile_options(display_affinity_detector PRIVATE -Wall -Wextra)
endif()

# Create output directory if it doesn't exist
file(MAKE_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/bin")

message(STATUS "Building for platform: ${CMAKE_SYSTEM_NAME}")
message(STATUS "Output directory: ${CMAKE_CURRENT_SOURCE_DIR}/bin")

