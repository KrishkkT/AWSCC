@echo off
title AWSCC WhatsApp Gateway (Port 2785)
echo ===================================================
echo   Starting AWSCC WhatsApp Gateway (Port 2785)
echo ===================================================
echo.

REM Stop old docker container if running on port 2785
docker stop openwa-gateway >nul 2>&1

echo Starting Native WebSocket WhatsApp Gateway...
start "" "http://localhost:2785"
node scripts/whatsapp-server.js
pause

