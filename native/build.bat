@echo off
setlocal enabledelayedexpansion

echo =========================================================
echo   SecureMeet Cross-Platform Anti-Cheat Engine Compiler
echo =========================================================

if not exist bin mkdir bin

REM Check for cl.exe (MSVC)
where cl >nul 2>nul
if %errorlevel% equ 0 (
    echo [Compiler] Detected MSVC (cl.exe). Compiling cross-platform engine...
    cl.exe /nologo /O2 /EHsc /std:c++17 /I include src\platform\*.cpp src\core\*.cpp src\detectors\*.cpp src\main.cpp /Fe:bin\display_affinity_detector.exe /link user32.lib psapi.lib advapi32.lib
    if %errorlevel% equ 0 (
        echo [Success] Binary compiled to bin\display_affinity_detector.exe
        del *.obj 2>nul
        bin\display_affinity_detector.exe --version
        exit /b 0
    )
)

REM Check for g++ (MinGW)
where g++ >nul 2>nul
if %errorlevel% equ 0 (
    echo [Compiler] Detected MinGW (g++). Compiling cross-platform engine...
    g++ -O3 -std=c++17 -I include src/platform/*.cpp src/core/*.cpp src/detectors/*.cpp src/main.cpp -o bin/display_affinity_detector.exe -lpsapi -luser32 -ladvapi32 -static-libgcc -static-libstdc++
    if %errorlevel% equ 0 (
        echo [Success] Binary compiled to bin/display_affinity_detector.exe
        bin\display_affinity_detector.exe --version
        exit /b 0
    )
)

echo [Error] No suitable compiler found. Please install MSVC or MinGW.
exit /b 1

