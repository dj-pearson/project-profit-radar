# MCP Security Check Script
# Run this before committing to ensure no secrets are accidentally included

Write-Host "[SECURITY] Running MCP Security Check..." -ForegroundColor Blue

$hasSecrets = $false
$secretPatterns = @(
    "sbp_[a-zA-Z0-9]{40,}",  # Supabase tokens
    "sk-[a-zA-Z0-9]{40,}",   # OpenAI API keys
    "ACCESS_TOKEN=(?!\$\{)[^`n`r]*",  # Actual tokens (not env vars)
    "api_key.*=(?!\$\{)[^`n`r]*",     # API keys
    "secret.*=(?!\$\{)[^`n`r]*"       # Secrets
)

# Check staged files for secrets
Write-Host "`n[CHECK] Checking staged files for secrets..." -ForegroundColor Yellow

$stagedFiles = git diff --cached --name-only
if ($stagedFiles) {
    foreach ($file in $stagedFiles) {
        if (Test-Path $file) {
            $content = Get-Content $file -ErrorAction SilentlyContinue
            if ($content) {
                foreach ($pattern in $secretPatterns) {
                    if ($content -match $pattern) {
                        Write-Host "[WARNING] POTENTIAL SECRET FOUND in $file" -ForegroundColor Red
                        Write-Host "   Pattern: $pattern" -ForegroundColor Red
                        $hasSecrets = $true
                    }
                }
            }
        }
    }
} else {
    Write-Host "   No staged files to check." -ForegroundColor Green
}

# Check for protected file types
Write-Host "`n[FILES] Checking for protected file types..." -ForegroundColor Yellow
$protectedFiles = @(
    ".env.mcp",
    ".env.mcp.local", 
    "claude_desktop_config.json",
    ".mcprc.local",
    "mcp-server-config.local.json"
)

foreach ($file in $protectedFiles) {
    if (git diff --cached --name-only | Select-String -Pattern "^$file$") {
        Write-Host "[WARNING] PROTECTED FILE STAGED: $file" -ForegroundColor Red
        Write-Host "   This file should not be committed!" -ForegroundColor Red
        $hasSecrets = $true
    }
}

# Check gitignore patterns
Write-Host "`n[GITIGNORE] Checking .gitignore coverage..." -ForegroundColor Yellow
$ignoredFiles = git status --ignored --porcelain | Where-Object { $_ -match "^!!" }
if ($ignoredFiles) {
    Write-Host "   [OK] Found ignored files (this is good):" -ForegroundColor Green
    $ignoredFiles | ForEach-Object { Write-Host "      $_" -ForegroundColor Gray }
} else {
    Write-Host "   [INFO] No ignored files detected." -ForegroundColor Blue
}

# Final result
Write-Host "`n[RESULTS] Security Check Results:" -ForegroundColor Blue
if ($hasSecrets) {
    Write-Host "[ERROR] SECURITY ISSUES FOUND!" -ForegroundColor Red
    Write-Host "   Please review and fix the issues above before committing." -ForegroundColor Red
    Write-Host "   If these are false positives, update the security check script." -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "[SUCCESS] No security issues detected!" -ForegroundColor Green
    Write-Host "   Safe to commit." -ForegroundColor Green
    exit 0
} 