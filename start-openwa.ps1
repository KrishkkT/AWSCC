Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Starting AWSCC WhatsApp Gateway on Port 2785" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# Stop old docker container if running on port 2785
docker stop openwa-gateway 2>&1 | Out-Null

Write-Host "Launching Native WebSocket WhatsApp Gateway..." -ForegroundColor Green
Start-Process "http://localhost:2785"
node scripts/whatsapp-server.js

