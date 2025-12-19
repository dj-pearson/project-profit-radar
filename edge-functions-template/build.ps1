# Build Script for Edge Functions Docker Image
# Builds production-ready Docker image with proper tagging

param(
    [string]$Tag = "latest",
    [string]$Registry = "",
    [switch]$Push = $false,
    [switch]$NoCacheops = $false
)

$ErrorActionPreference = "Stop"

Write-Host "🐳 Building Edge Functions Docker Image" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Get build metadata
$BuildDate = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
$GitCommit = if (Get-Command git -ErrorAction SilentlyContinue) {
    (git rev-parse --short HEAD 2>$null) ?? "unknown"
} else {
    "unknown"
}
$GitBranch = if (Get-Command git -ErrorAction SilentlyContinue) {
    (git rev-parse --abbrev-ref HEAD 2>$null) ?? "unknown"
} else {
    "unknown"
}

Write-Host "Build Information:" -ForegroundColor Cyan
Write-Host "  Date:     $BuildDate" -ForegroundColor White
Write-Host "  Commit:   $GitCommit" -ForegroundColor White
Write-Host "  Branch:   $GitBranch" -ForegroundColor White
Write-Host "  Tag:      $Tag" -ForegroundColor White
Write-Host ""

# Construct image name
$ImageName = "supabase-edge-functions"
if ($Registry) {
    $ImageName = "$Registry/$ImageName"
}
$FullImageName = "${ImageName}:${Tag}"

Write-Host "Building image: $FullImageName" -ForegroundColor Cyan
Write-Host ""

# Build arguments
$BuildArgs = @(
    "--build-arg", "BUILD_DATE=$BuildDate",
    "--build-arg", "GIT_COMMIT=$GitCommit",
    "--build-arg", "GIT_BRANCH=$GitBranch",
    "-t", $FullImageName,
    "-f", "Dockerfile.production",
    "."
)

if ($NoCache) {
    $BuildArgs = @("--no-cache") + $BuildArgs
}

# Run Docker build
try {
    Write-Host "📦 Running docker build..." -ForegroundColor Yellow
    & docker build @BuildArgs
    
    if ($LASTEXITCODE -ne 0) {
        throw "Docker build failed with exit code $LASTEXITCODE"
    }
    
    Write-Host ""
    Write-Host "✅ Build successful!" -ForegroundColor Green
    Write-Host ""
    
    # Also tag as latest if not already
    if ($Tag -ne "latest") {
        $LatestImageName = "${ImageName}:latest"
        Write-Host "🏷️  Tagging as latest: $LatestImageName" -ForegroundColor Cyan
        & docker tag $FullImageName $LatestImageName
    }
    
    # Push if requested
    if ($Push) {
        Write-Host ""
        Write-Host "📤 Pushing image to registry..." -ForegroundColor Yellow
        & docker push $FullImageName
        
        if ($LASTEXITCODE -ne 0) {
            throw "Docker push failed with exit code $LASTEXITCODE"
        }
        
        if ($Tag -ne "latest") {
            $LatestImageName = "${ImageName}:latest"
            & docker push $LatestImageName
        }
        
        Write-Host "✅ Push successful!" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "📊 Image Information" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Image:    $FullImageName" -ForegroundColor Cyan
    
    # Get image size
    $ImageInfo = docker images $FullImageName --format "{{.Size}}"
    Write-Host "Size:     $ImageInfo" -ForegroundColor Cyan
    
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Test locally: docker run -p 8000:8000 --env-file .env $FullImageName" -ForegroundColor White
    Write-Host "2. Deploy to production: docker-compose -f docker-compose.production.yml up -d" -ForegroundColor White
    if (-not $Push -and $Registry) {
        Write-Host "3. Push to registry: .\build.ps1 -Tag $Tag -Registry $Registry -Push" -ForegroundColor White
    }
    Write-Host ""
}
catch {
    Write-Host ""
    Write-Host "❌ Build failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

