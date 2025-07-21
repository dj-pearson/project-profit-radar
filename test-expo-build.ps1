# Test Expo Build Trigger
Write-Host "Testing Expo Build Trigger..." -ForegroundColor Green

$headers = @{
    "Content-Type" = "application/json"
}

$body = @{
    platform = "ios"
    profile = "development"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/trigger-expo-build" -Method POST -Headers $headers -Body $body
    
    Write-Host "✅ Build triggered successfully!" -ForegroundColor Green
    Write-Host "Build ID: $($response.buildId)" -ForegroundColor Cyan
    Write-Host "Build URL: $($response.buildUrl)" -ForegroundColor Cyan
    Write-Host "Platform: $($response.platform)" -ForegroundColor Cyan
    Write-Host "Profile: $($response.profile)" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Yellow
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Yellow
    }
}

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. If successful, visit the build URL to monitor progress" -ForegroundColor White
Write-Host "2. The build will appear in your Expo dashboard" -ForegroundColor White
Write-Host "3. Once complete, you can download the .ipa file" -ForegroundColor White 