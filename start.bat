@echo off
title Fresh Path CRM
echo ============================================
echo    Fresh Path CRM - Starting...
echo ============================================
echo.

cd /d "%~dp0"

:: Kill any existing processes on port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1

:: Kill any existing cloudflared
taskkill /IM cloudflared.exe /F >nul 2>&1

:: Start Next.js production server in background
echo [1/2] Starting production server...
start /B cmd /c "npm start > nul 2>&1"

:: Wait for server to be ready
echo       Waiting for server...
timeout /t 5 /nobreak > nul

:: Start Cloudflare Tunnel
echo [2/2] Starting tunnel...
echo.
echo ============================================
echo    Your CRM will be ready in a few seconds
echo    Watch for the URL below!
echo ============================================
echo.

"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:3000
