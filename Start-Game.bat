@echo off
setlocal
title ASHFALL - Game Launcher
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Launch-Game.ps1"
if errorlevel 1 (
  echo.
  echo Launch failed. See the message above.
  pause
)
endlocal
