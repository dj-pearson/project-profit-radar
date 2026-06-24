# Deploy Edge Functions Script for Self-Hosted Supabase
# This script copies your Supabase functions to the edge-functions-template for deployment

param(
    [switch]$DryRun = $false,
    [switch]$Clean = $false,
    [string]$FunctionFilter = "*"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Edge Functions Deployment Script" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Define paths
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$SourceDir = Join-Path $ProjectRoot "supabase\functions"
$TargetDir = Join-Path $PSScriptRoot "functions"
$SharedDir = Join-Path $SourceDir "_shared"

# Check if source directory exists
if (-not (Test-Path $SourceDir)) {
    Write-Host "❌ Error: Source directory not found: $SourceDir" -ForegroundColor Red
    exit 1
}

# Clean target directory if requested
if ($Clean) {
    Write-Host "🧹 Cleaning target directory..." -ForegroundColor Yellow
    if (Test-Path $TargetDir) {
        Get-ChildItem $TargetDir -Directory | Where-Object { 
            $_.Name -ne "_health" -and $_.Name -ne "_shared" 
        } | ForEach-Object {
            Write-Host "   Removing: $($_.Name)" -ForegroundColor Gray
            if (-not $DryRun) {
                Remove-Item $_.FullName -Recurse -Force
            }
        }
    }
    Write-Host "✅ Cleaned target directory" -ForegroundColor Green
    Write-Host ""
}

# Create target directory if it doesn't exist
if (-not (Test-Path $TargetDir)) {
    Write-Host "📁 Creating target directory: $TargetDir" -ForegroundColor Cyan
    if (-not $DryRun) {
        New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
    }
}

# Copy _shared directory first if it exists
if (Test-Path $SharedDir) {
    $TargetSharedDir = Join-Path $TargetDir "_shared"
    Write-Host "📦 Copying _shared directory..." -ForegroundColor Cyan
    if (-not $DryRun) {
        if (Test-Path $TargetSharedDir) {
            Remove-Item $TargetSharedDir -Recurse -Force
        }
        Copy-Item $SharedDir $TargetSharedDir -Recurse -Force
    }
    Write-Host "✅ Copied _shared directory" -ForegroundColor Green
    Write-Host ""
}

# Get all function directories
$FunctionDirs = Get-ChildItem $SourceDir -Directory | Where-Object {
    $_.Name -notlike "_*" -and $_.Name -like $FunctionFilter
}

$TotalFunctions = $FunctionDirs.Count
$CopiedFunctions = 0
$SkippedFunctions = 0
$ErrorFunctions = @()

Write-Host "📋 Found $TotalFunctions function(s) to process" -ForegroundColor Cyan
Write-Host ""

foreach ($FunctionDir in $FunctionDirs) {
    $FunctionName = $FunctionDir.Name
    $SourcePath = $FunctionDir.FullName
    $TargetPath = Join-Path $TargetDir $FunctionName
    $IndexFile = Join-Path $SourcePath "index.ts"
    
    # Check if index.ts exists
    if (-not (Test-Path $IndexFile)) {
        Write-Host "⚠️  Skipping $FunctionName (no index.ts)" -ForegroundColor Yellow
        $SkippedFunctions++
        continue
    }
    
    Write-Host "📦 Processing: $FunctionName" -ForegroundColor Cyan
    
    try {
        if (-not $DryRun) {
            # Create target directory
            if (-not (Test-Path $TargetPath)) {
                New-Item -ItemType Directory -Path $TargetPath -Force | Out-Null
            }
            
            # Copy all files from function directory
            Copy-Item "$SourcePath\*" $TargetPath -Recurse -Force
        }
        
        Write-Host "   ✅ Copied successfully" -ForegroundColor Green
        $CopiedFunctions++
    }
    catch {
        Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        $ErrorFunctions += $FunctionName
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "📊 Deployment Summary" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Total functions found:    $TotalFunctions" -ForegroundColor Cyan
Write-Host "Successfully copied:      $CopiedFunctions" -ForegroundColor Green
Write-Host "Skipped (no index.ts):   $SkippedFunctions" -ForegroundColor Yellow

$ErrorColor = if ($ErrorFunctions.Count -gt 0) { "Red" } else { "Green" }
Write-Host "Errors:                   $($ErrorFunctions.Count)" -ForegroundColor $ErrorColor

if ($ErrorFunctions.Count -gt 0) {
    Write-Host ""
    Write-Host "Failed functions:" -ForegroundColor Red
    $ErrorFunctions | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
}

if ($DryRun) {
    Write-Host ""
    Write-Host "🔍 DRY RUN MODE - No changes were made" -ForegroundColor Yellow
    Write-Host "Run without -DryRun flag to perform actual deployment" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✨ Deployment preparation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Review copied functions in: $TargetDir" -ForegroundColor White
Write-Host "2. Ensure .env file is configured with your Supabase credentials" -ForegroundColor White
Write-Host "3. Test locally: docker-compose up" -ForegroundColor White
Write-Host "4. Build for production: docker build -t supabase-edge-functions ." -ForegroundColor White
Write-Host ""
