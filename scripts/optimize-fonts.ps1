# Font Optimization Script (PowerShell)
# Downloads and self-hosts Google Fonts for better performance

Write-Host "Font Optimization Script" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

# Create fonts directory if it doesn't exist
$fontsDir = "public/fonts"
if (-not (Test-Path $fontsDir)) {
    New-Item -ItemType Directory -Path $fontsDir -Force | Out-Null
}

Write-Host "Downloading Inter font files..." -ForegroundColor Yellow
Write-Host ""

# Download Inter font weights 400 and 600 (most commonly used)
$baseUrl = "https://fonts.gstatic.com/s/inter/v12"

# Inter Regular (400)
$inter400Url = "$baseUrl/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2"
# Inter Semi-Bold (600)
$inter600Url = "$baseUrl/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiA.woff2"

try {
    Write-Host "Downloading Inter Regular (400)..." -ForegroundColor Gray
    Invoke-WebRequest -Uri $inter400Url -OutFile "$fontsDir/inter-regular.woff2" -ErrorAction Stop
    
    Write-Host "Downloading Inter Semi-Bold (600)..." -ForegroundColor Gray
    Invoke-WebRequest -Uri $inter600Url -OutFile "$fontsDir/inter-semibold.woff2" -ErrorAction Stop
    
    Write-Host ""
    Write-Host "Fonts downloaded successfully!" -ForegroundColor Green
    Write-Host ""
    
    # Get file sizes
    $regularSize = (Get-Item "$fontsDir/inter-regular.woff2").Length
    $semiboldSize = (Get-Item "$fontsDir/inter-semibold.woff2").Length
    
    # Format sizes
    $regularSizeKB = [math]::Round($regularSize / 1KB, 2)
    $semiboldSizeKB = [math]::Round($semiboldSize / 1KB, 2)
    
    Write-Host "Font file sizes:" -ForegroundColor Cyan
    Write-Host "   Inter Regular (400):    $regularSizeKB KB"
    Write-Host "   Inter Semi-Bold (600):  $semiboldSizeKB KB"
    Write-Host ""
    
    # Create CSS file
    $cssFile = "$fontsDir/inter.css"
    
    # Build CSS content line by line to avoid here-string issues
    $cssLines = @(
        "/**",
        " * Inter Font - Self-hosted for optimal performance",
        " * Includes weights: 400 (regular), 600 (semi-bold)",
        " */",
        "",
        "@font-face {",
        "  font-family: 'Inter';",
        "  font-style: normal;",
        "  font-weight: 400;",
        "  font-display: swap;",
        "  src: url('/fonts/inter-regular.woff2') format('woff2');",
        "  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;",
        "}",
        "",
        "@font-face {",
        "  font-family: 'Inter';",
        "  font-style: normal;",
        "  font-weight: 600;",
        "  font-display: swap;",
        "  src: url('/fonts/inter-semibold.woff2') format('woff2');",
        "  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;",
        "}"
    )
    
    $cssContent = $cssLines -join "`n"
    Set-Content -Path $cssFile -Value $cssContent -Encoding UTF8
    
    Write-Host "Created CSS file: $cssFile" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Remove Google Fonts from index.html:"
    Write-Host "   - Remove all <link> tags referencing fonts.googleapis.com"
    Write-Host "   - Remove preconnect links to fonts.gstatic.com"
    Write-Host ""
    Write-Host "2. Add preload links to index.html <head>:"
    Write-Host '   <link rel="preload" href="/fonts/inter-regular.woff2" as="font" type="font/woff2" crossorigin>'
    Write-Host '   <link rel="preload" href="/fonts/inter-semibold.woff2" as="font" type="font/woff2" crossorigin>'
    Write-Host ""
    Write-Host "3. Import the CSS file in your index.css or index.html:"
    Write-Host '   <link rel="stylesheet" href="/fonts/inter.css">'
    Write-Host ""
    Write-Host "4. Test font rendering across your app"
    Write-Host ""
    Write-Host "Expected improvements:" -ForegroundColor Cyan
    Write-Host "   - 100-300ms faster font load time"
    Write-Host "   - No DNS lookup to Google servers"
    Write-Host "   - Better privacy (no Google tracking)"
    Write-Host "   - Reduced total font payload (2 weights vs 4)"
    Write-Host ""
    Write-Host "Font optimization complete!" -ForegroundColor Green
}
catch {
    Write-Host "Error downloading fonts: $_" -ForegroundColor Red
    exit 1
}
