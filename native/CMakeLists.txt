cmake_minimum_required(VERSION 3.15)
project(SecureMeetNativeEngine CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include_directories(include)

file(GLOB_RECURSE SOURCES "src/*.cpp")

add_executable(display_affinity_detector ${SOURCES})

target_link_libraries(display_affinity_detector
    user32
    psapi
    advapi32
)

set_target_properties(display_affinity_detector PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/bin"
)
