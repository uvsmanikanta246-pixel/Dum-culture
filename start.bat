@echo off
title Dum Theory - Local Server
echo ============================================================
echo   🍔 Starting Dum Theory WhatsApp Food Ordering App
echo ============================================================
echo.
echo Opening browser at http://localhost:8080 ...
start http://localhost:8080

powershell -ExecutionPolicy Bypass -File "%~dp0server.ps1" -Port 8080
pause
