# Environment Setup Script
# Manages environment variables for different deployment environments

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("development", "staging", "production")]
    [string]$Environment,
    
    [switch]$Validate = $false,
    [switch]$Export = $false,
    [string]$ExportPath = ".env"
)

$ErrorActionPreference = "Stop"

Write-Host "🔧 Environment Setup for Self-Hosted Supabase Edge Functions" -ForegroundColor Green
Write-Host "=============================================================" -ForegroundColor Green
Write-Host ""

# Environment-specific configurations
$Configurations = @{
    development = @{
        SUPABASE_URL = $env:DEV_SUPABASE_URL
        SUPABASE_ANON_KEY = $env:DEV_SUPABASE_ANON_KEY
        SUPABASE_SERVICE_ROLE_KEY = $env:DEV_SUPABASE_SERVICE_ROLE_KEY
        PORT = "8000"
        NODE_ENV = "development"
        LOG_LEVEL = "debug"
    }
    staging = @{
        SUPABASE_URL = $env:STAGING_SUPABASE_URL
        SUPABASE_ANON_KEY = $env:STAGING_SUPABASE_ANON_KEY
        SUPABASE_SERVICE_ROLE_KEY = $env:STAGING_SUPABASE_SERVICE_ROLE_KEY
        PORT = "8000"
        NODE_ENV = "staging"
        LOG_LEVEL = "info"
    }
    production = @{
        SUPABASE_URL = $env:PROD_SUPABASE_URL
        SUPABASE_ANON_KEY = $env:PROD_SUPABASE_ANON_KEY
        SUPABASE_SERVICE_ROLE_KEY = $env:PROD_SUPABASE_SERVICE_ROLE_KEY
        PORT = "8000"
        NODE_ENV = "production"
        LOG_LEVEL = "warn"
    }
}

$Config = $Configurations[$Environment]

Write-Host "Environment: $Environment" -ForegroundColor Cyan
Write-Host ""

# Validate configuration
if ($Validate) {
    Write-Host "🔍 Validating configuration..." -ForegroundColor Yellow
    Write-Host ""
    
    $IsValid = $true
    $RequiredVars = @("SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY")
    
    foreach ($Var in $RequiredVars) {
        $Value = $Config[$Var]
        if ([string]::IsNullOrWhiteSpace($Value)) {
            Write-Host "❌ Missing: $Var" -ForegroundColor Red
            $IsValid = $false
        } else {
            $MaskedValue = if ($Var -like "*KEY*") {
                $Value.Substring(0, [Math]::Min(20, $Value.Length)) + "..."
            } else {
                $Value
            }
            Write-Host "✅ $Var = $MaskedValue" -ForegroundColor Green
        }
    }
    
    Write-Host ""
    if ($IsValid) {
        Write-Host "✅ All required variables are configured" -ForegroundColor Green
    } else {
        Write-Host "❌ Configuration is incomplete" -ForegroundColor Red
        Write-Host ""
        Write-Host "Required environment variables for ${Environment}:" -ForegroundColor Yellow
        Write-Host "  - ${Environment.ToUpper()}_SUPABASE_URL" -ForegroundColor White
        Write-Host "  - ${Environment.ToUpper()}_SUPABASE_ANON_KEY" -ForegroundColor White
        Write-Host "  - ${Environment.ToUpper()}_SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor White
        exit 1
    }
}

# Export to .env file
if ($Export) {
    Write-Host "📝 Exporting configuration to: $ExportPath" -ForegroundColor Yellow
    Write-Host ""
    
    $EnvContent = @"
# Auto-generated environment configuration
# Environment: $Environment
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# Supabase Configuration
SUPABASE_URL=$($Config.SUPABASE_URL)
SUPABASE_ANON_KEY=$($Config.SUPABASE_ANON_KEY)
SUPABASE_SERVICE_ROLE_KEY=$($Config.SUPABASE_SERVICE_ROLE_KEY)

# Server Configuration
PORT=$($Config.PORT)
NODE_ENV=$($Config.NODE_ENV)
LOG_LEVEL=$($Config.LOG_LEVEL)

# Deno Configuration
DENO_DIR=/app/.deno_cache
"@
    
    $EnvContent | Out-File -FilePath $ExportPath -Encoding UTF8
    Write-Host "✅ Configuration exported successfully" -ForegroundColor Green
    Write-Host ""
}

# Display configuration
Write-Host "Configuration for $Environment:" -ForegroundColor Cyan
Write-Host ""
foreach ($Key in $Config.Keys) {
    $Value = $Config[$Key]
    $DisplayValue = if ($Key -like "*KEY*") {
        if ([string]::IsNullOrWhiteSpace($Value)) {
            "<NOT SET>"
        } else {
            $Value.Substring(0, [Math]::Min(20, $Value.Length)) + "..."
        }
    } else {
        if ([string]::IsNullOrWhiteSpace($Value)) {
            "<NOT SET>"
        } else {
            $Value
        }
    }
    Write-Host "  $Key = $DisplayValue" -ForegroundColor White
}

Write-Host ""
Write-Host "Usage examples:" -ForegroundColor Cyan
Write-Host "  Validate:  .\env-setup.ps1 -Environment $Environment -Validate" -ForegroundColor White
Write-Host "  Export:    .\env-setup.ps1 -Environment $Environment -Export" -ForegroundColor White
Write-Host "  Custom:    .\env-setup.ps1 -Environment $Environment -Export -ExportPath .env.$Environment" -ForegroundColor White
Write-Host ""

