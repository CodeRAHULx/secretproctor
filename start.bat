@echo off
title SecureMeet AI-Shielded Interview Platform
echo =============================================================
echo   🛡️  Starting SecureMeet: AI-Shielded Interview Platform
echo =============================================================
echo.

if not exist "%~dp0native\bin\display_affinity_detector.exe" (
    echo [INFO] Building native watchdog binaries...
    call "%~dp0native\build.bat"
)

echo [INFO] Launching Node.js backend server...
cd /d "%~dp0"
node backend/server.js
pause
