@echo off
echo =======================================================
echo   Building SecureMeet Native Watchdog Binaries
echo =======================================================

if not exist "%~dp0bin" mkdir "%~dp0bin"

set PATH=C:\msys64\ucrt64\bin;%PATH%

echo Compiling display_affinity_detector.cpp...
g++ -std=c++17 "%~dp0src\display_affinity_detector.cpp" -o "%~dp0bin\display_affinity_detector.exe" -luser32 -ladvapi32
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to compile display_affinity_detector.exe
    exit /b %ERRORLEVEL%
)

echo Compiling display_affinity_test.cpp...
g++ -std=c++17 "%~dp0src\display_affinity_test.cpp" -o "%~dp0bin\display_affinity_test.exe" -luser32 -lgdi32
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to compile display_affinity_test.exe
    exit /b %ERRORLEVEL%
)

echo.
echo [SUCCESS] Native binaries built in: %~dp0bin
echo =======================================================
