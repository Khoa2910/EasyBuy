# Start All Services Script
Write-Host "🚀 Starting EasyBuy Services..." -ForegroundColor Green

# Kill existing processes
Write-Host "`n🛑 Stopping existing services..." -ForegroundColor Yellow
taskkill /f /im node.exe 2>$null

# Wait a moment
Start-Sleep 2

# Start Auth Service
Write-Host "`n🔐 Starting Auth Service..." -ForegroundColor Cyan
Start-Process -FilePath "node" -ArgumentList "server-simple.js" -WorkingDirectory "services/auth-service" -WindowStyle Minimized

# Wait
Start-Sleep 3

# Start Product Service  
Write-Host "`n🛍️ Starting Product Service..." -ForegroundColor Cyan
Start-Process -FilePath "node" -ArgumentList "server-complete.js" -WorkingDirectory "services/product-service" -WindowStyle Minimized

# Wait
Start-Sleep 3

# Start API Gateway
Write-Host "`n🌐 Starting API Gateway..." -ForegroundColor Cyan
Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory "api-gateway" -WindowStyle Minimized

# Wait for services to start
Write-Host "`n⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep 5

# Test services
Write-Host "`n🧪 Testing services..." -ForegroundColor Green

try {
    $authHealth = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 5
    Write-Host "✅ Auth Service: $($authHealth.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ Auth Service: Failed to connect" -ForegroundColor Red
}

try {
    $productHealth = Invoke-RestMethod -Uri "http://localhost:3003/health" -TimeoutSec 5
    Write-Host "✅ Product Service: $($productHealth.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ Product Service: Failed to connect" -ForegroundColor Red
}

try {
    $gatewayHealth = Invoke-RestMethod -Uri "http://localhost:3000/health" -TimeoutSec 5
    Write-Host "✅ API Gateway: $($gatewayHealth.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ API Gateway: Failed to connect" -ForegroundColor Red
}

# Test API endpoints
Write-Host "`n🔍 Testing API endpoints..." -ForegroundColor Green

try {
    $featured = Invoke-RestMethod -Uri "http://localhost:3000/api/products/featured" -TimeoutSec 5
    Write-Host "✅ Featured Products: $($featured.Count) items" -ForegroundColor Green
} catch {
    Write-Host "❌ Featured Products: Failed" -ForegroundColor Red
}

try {
    $bestsellers = Invoke-RestMethod -Uri "http://localhost:3000/api/products/bestsellers" -TimeoutSec 5
    Write-Host "✅ Bestsellers: $($bestsellers.Count) items" -ForegroundColor Green
} catch {
    Write-Host "❌ Bestsellers: Failed" -ForegroundColor Red
}

Write-Host "`n🎉 Services started! Open http://localhost:3000 in your browser" -ForegroundColor Green
Write-Host "`nPress any key to continue..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

