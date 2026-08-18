@echo off
title SecureMeet - Candidate Proctoring Agent
echo =============================================================
echo   SecureMeet Windows Candidate Proctoring Agent
echo =============================================================
echo.

node detector/SecureMeetAgent.js %*
pause
