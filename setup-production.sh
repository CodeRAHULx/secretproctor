#!/bin/bash
# Production Restructure Setup Script
# Creates all necessary directories and installs dependencies

set -e

echo "================================================"
echo "  SecureMeet Production Restructure Setup"
echo "================================================"

# Backend directories
echo "[1/4] Creating backend directory structure..."
mkdir -p backend/models
mkdir -p backend/middleware
mkdir -p backend/validators
mkdir -p backend/utils
mkdir -p backend/tests/unit
mkdir -p backend/tests/integration
mkdir -p backend/logs

# Frontend directories
echo "[2/4] Creating frontend directory structure..."
mkdir -p frontend/src/components/common/Button
mkdir -p frontend/src/components/common/Card
mkdir -p frontend/src/components/common/Modal
mkdir -p frontend/src/components/common/Input
mkdir -p frontend/src/components/common/Avatar
mkdir -p frontend/src/components/layout
mkdir -p frontend/src/components/meeting/VideoGrid
mkdir -p frontend/src/components/meeting/Chat
mkdir -p frontend/src/components/meeting/Participants
mkdir -p frontend/src/components/host
mkdir -p frontend/src/store
mkdir -p frontend/src/hooks
mkdir -p frontend/src/layouts
mkdir -p frontend/src/pages
mkdir -p frontend/src/services/webrtc
mkdir -p frontend/src/services/sse
mkdir -p frontend/src/utils

# C++ directories
echo "[3/4] Creating C++ directory structure..."
mkdir -p native/include/core
mkdir -p native/include/detectors
mkdir -p native/include/utils
mkdir -p native/include/platform
mkdir -p native/src/core
mkdir -p native/src/detectors
mkdir -p native/src/utils
mkdir -p native/src/platform
mkdir -p native/tests
mkdir -p native/build

# Python AI service directories
echo "[4/4] Creating Python AI service structure..."
mkdir -p ai-service/src/api/routes
mkdir -p ai-service/src/api/middleware
mkdir -p ai-service/src/services
mkdir -p ai-service/src/models
mkdir -p ai-service/src/utils
mkdir -p ai-service/tests

echo ""
echo "✅ Directory structure created successfully!"
echo ""

# Install backend dependencies
echo "[Backend] Installing additional dependencies..."
cd backend
npm install --save winston joi express-rate-limit helmet compression morgan
cd ..

# Install frontend dependencies
echo "[Frontend] Installing additional dependencies..."
cd frontend
npm install --save zustand
cd ..

echo ""
echo "================================================"
echo "  ✅ Setup Complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "  1. Review the production plan: .claude/plans/cryptic-swimming-yeti.md"
echo "  2. Start implementing backend models"
echo "  3. Split frontend hooks"
echo "  4. Refactor C++ detector"
echo ""
