@echo off
title Participant Registration System
cls
echo ========================================
echo   PARTICIPANT REGISTRATION SYSTEM
echo ========================================
echo.
echo Starting application...
echo The browser will open automatically.
echo.
echo Keep this window open while using the app.
echo Close this window to stop the application.
echo.
echo ========================================
echo.

start "" "%~dp0ParticipantRegistration.exe"

echo Application is running...
echo Press any key to stop the application.
pause >nul
