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

echo [INFO] Checking for processes on port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " 2^>nul') do (
    echo [INFO] Killing stale process on port 3000 ^(PID %%a^)...
    taskkill /PID %%a /F >nul 2>&1
)

echo [INFO] Launching Node.js backend server...
cd /d "%~dp0"
node backend/server.js
pause
