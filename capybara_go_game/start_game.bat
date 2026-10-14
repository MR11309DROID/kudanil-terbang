@echo off
title Capybara Go! Game Launcher
echo ========================================================
echo         CAPYBARA GO! - PRODUCTION GAME LAUNCHER
echo ========================================================
echo Starting local game server on http://localhost:8080/ ...
echo Opening game in your browser...
echo (Keep this window open while playing)
echo ========================================================

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1" -Port 8080
pause
