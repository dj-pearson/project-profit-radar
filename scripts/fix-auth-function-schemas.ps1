# Fix auth function schemas - remove siteId validation

Write-Host "Fixing auth function schemas..." -ForegroundColor Cyan

$authFunctions = @(
    "supabase/functions/send-auth-otp/index.ts",
    "supabase/functions/reset-password-otp/index.ts",
    "supabase/functions/verify-auth-otp/index.ts"
)

$changes = 0

foreach ($file in $authFunctions) {
    if (!(Test-Path $file)) {
        Write-Host "Skip: $file (not found)" -ForegroundColor Yellow
        continue
    }
    
    $content = Get-Content $file -Raw
    $originalContent = $content
    
    # Remove siteId from schema validations
    $content = $content -replace 'siteId:\s*z\.string\(\)\.uuid\([^\)]*\),?\s*\n', ''
    
    # Fix trailing commas in objects (when siteId was last)
    $content = $content -replace ',(\s*)\}', '$1}'
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file -Value $content -NoNewline
        $changes++
        Write-Host "+ Fixed: $file" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Fixed $changes auth function schemas" -ForegroundColor Green

