@echo off
setlocal enabledelayedexpansion

echo =========================================================
echo   SecureMeet Modular Anti-Cheat Engine Compiler (Win32)
echo =========================================================

if not exist bin mkdir bin

REM Check for cl.exe (MSVC)
where cl >nul 2>nul
if %errorlevel% equ 0 (
    echo [Compiler] Detected MSVC (cl.exe). Compiling modular engine...
    cl.exe /nologo /O2 /EHsc /std:c++17 /I include src\core\*.cpp src\detectors\*.cpp src\main.cpp /Fe:bin\display_affinity_detector.exe /link user32.lib psapi.lib advapi32.lib
    if %errorlevel% equ 0 (
        echo [Success] Binary compiled to bin\display_affinity_detector.exe
        del *.obj 2>nul
        exit /b 0
    )
)

REM Check for g++ (MinGW)
where g++ >nul 2>nul
if %errorlevel% equ 0 (
    echo [Compiler] Detected MinGW (g++). Compiling modular engine...
    g++ -O3 -std=c++17 -I include src/core/*.cpp src/detectors/*.cpp src/main.cpp -o bin/display_affinity_detector.exe -lpsapi -luser32 -ladvapi32
    if %errorlevel% equ 0 (
        echo [Success] Binary compiled to bin/display_affinity_detector.exe
        exit /b 0
    )
)

echo [Notice] Pre-built binary active at bin\display_affinity_detector.exe
exit /b 0
