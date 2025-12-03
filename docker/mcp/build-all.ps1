# PowerShell script to build all MCP Docker images
# Run from the docker/mcp directory

Write-Host "🐳 Building MCP Docker Images..." -ForegroundColor Cyan

$images = @(
    @{ Name = "mcp-playwright"; Dockerfile = "Dockerfile.playwright" },
    @{ Name = "mcp-puppeteer"; Dockerfile = "Dockerfile.puppeteer" },
    @{ Name = "mcp-sequential-thinking"; Dockerfile = "Dockerfile.sequential-thinking" },
    @{ Name = "mcp-filesystem"; Dockerfile = "Dockerfile.filesystem" },
    @{ Name = "mcp-memory"; Dockerfile = "Dockerfile.memory" },
    @{ Name = "mcp-context7"; Dockerfile = "Dockerfile.context7" },
    @{ Name = "mcp-supabase"; Dockerfile = "Dockerfile.supabase" }
)

$failed = @()
$success = @()

foreach ($image in $images) {
    Write-Host "`n📦 Building $($image.Name)..." -ForegroundColor Yellow
    
    docker build -t "$($image.Name):latest" -f $image.Dockerfile .
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $($image.Name) built successfully" -ForegroundColor Green
        $success += $image.Name
    } else {
        Write-Host "❌ Failed to build $($image.Name)" -ForegroundColor Red
        $failed += $image.Name
    }
}

Write-Host "`n" + "=" * 50 -ForegroundColor Cyan
Write-Host "📊 Build Summary:" -ForegroundColor Cyan
Write-Host "   ✅ Success: $($success.Count)" -ForegroundColor Green
Write-Host "   ❌ Failed: $($failed.Count)" -ForegroundColor Red

if ($failed.Count -gt 0) {
    Write-Host "`n   Failed images:" -ForegroundColor Red
    foreach ($f in $failed) {
        Write-Host "      - $f" -ForegroundColor Red
    }
}

Write-Host "`n🐳 Available MCP images:" -ForegroundColor Cyan
docker images | Select-String "mcp-"

