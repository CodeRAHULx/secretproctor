#!/bin/bash
# Build script for Linux/macOS

set -e

echo "==================================="
echo "SecureMeet Native Detector Builder"
echo "==================================="
echo ""

# Check platform
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    PLATFORM="Linux"
    echo "Platform: Linux"

    # Install dependencies on Debian/Ubuntu
    if command -v apt-get &> /dev/null; then
        echo "Installing build dependencies..."
        sudo apt-get update
        sudo apt-get install -y build-essential cmake libx11-dev
    fi
elif [[ "$OSTYPE" == "darwin"* ]]; then
    PLATFORM="macOS"
    echo "Platform: macOS"

    # Check for Homebrew and install cmake if needed
    if ! command -v cmake &> /dev/null; then
        echo "CMake not found. Please install: brew install cmake"
        exit 1
    fi
else
    echo "Unsupported platform: $OSTYPE"
    exit 1
fi

# Navigate to native directory
cd "$(dirname "$0")"

# Create build directory
mkdir -p build
cd build

# Run CMake
echo ""
echo "Running CMake..."
cmake ..

# Build
echo ""
echo "Building..."
cmake --build . --config Release

# Check if build succeeded
if [ -f "../bin/display_affinity_detector" ]; then
    echo ""
    echo "✓ Build successful!"
    echo "Binary: native/bin/display_affinity_detector"

    # Make executable
    chmod +x ../bin/display_affinity_detector

    # Test the binary
    echo ""
    echo "Testing binary..."
    ../bin/display_affinity_detector --version
else
    echo ""
    echo "✗ Build failed!"
    exit 1
fi

echo ""
echo "==================================="
echo "Build completed successfully!"
echo "==================================="
