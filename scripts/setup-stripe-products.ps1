# BuildDesk Stripe Products Setup Script
# Run this script with Stripe CLI installed and authenticated
# PowerShell script for Windows

# Prerequisites:
# 1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
# 2. Login: stripe login
# 3. Run this script: .\setup-stripe-products.ps1

param(
    [switch]$LiveMode = $false,
    [switch]$DryRun = $false
)

$ErrorActionPreference = "Stop"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  BuildDesk Stripe Products Setup Script" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

if ($LiveMode) {
    Write-Host "[WARNING] Running in LIVE mode - real charges will be possible!" -ForegroundColor Red
    $confirm = Read-Host "Are you sure? Type 'YES' to continue"
    if ($confirm -ne "YES") {
        Write-Host "Aborted." -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "[INFO] Running in TEST mode (use -LiveMode for production)" -ForegroundColor Green
}

if ($DryRun) {
    Write-Host "[INFO] DRY RUN - No actual API calls will be made" -ForegroundColor Yellow
}

Write-Host ""

# Configuration
$products = @(
    @{
        Name = "BuildDesk Starter"
        Description = "Perfect for small teams (1-5 users). Includes basic job costing, mobile time tracking, QuickBooks sync, and email support."
        Features = @(
            "Up to 5 team members",
            "Up to 10 active projects",
            "Basic job costing",
            "Mobile time tracking",
            "QuickBooks sync",
            "Email support",
            "Basic reporting",
            "Mobile app access"
        )
        Prices = @(
            @{
                Nickname = "Starter Monthly"
                Amount = 14900  # $149.00 in cents
                Interval = "month"
            },
            @{
                Nickname = "Starter Annual"
                Amount = 149000  # $1,490.00 in cents
                Interval = "year"
            }
        )
    },
    @{
        Name = "BuildDesk Professional"
        Description = "Most popular choice for growing contractors (5-20 users). Full mobile suite, all integrations, OSHA compliance tools, and priority support."
        Features = @(
            "Up to 20 team members",
            "Up to 50 active projects",
            "Advanced job costing",
            "Full mobile suite",
            "All integrations",
            "OSHA compliance tools",
            "Client portal",
            "Advanced reporting",
            "Phone & priority support",
            "Custom workflows"
        )
        Prices = @(
            @{
                Nickname = "Professional Monthly"
                Amount = 29900  # $299.00 in cents
                Interval = "month"
            },
            @{
                Nickname = "Professional Annual"
                Amount = 299000  # $2,990.00 in cents
                Interval = "year"
            }
        )
    },
    @{
        Name = "BuildDesk Enterprise"
        Description = "For large operations (20+ users). Unlimited everything, custom integrations, white-label options, and dedicated success manager."
        Features = @(
            "Unlimited team members",
            "Unlimited projects",
            "Everything in Professional",
            "Custom domain support",
            "White-label branding",
            "Custom integrations",
            "Advanced automation",
            "White-label client portal",
            "Dedicated success manager",
            "24/7 priority support",
            "Advanced analytics",
            "Multi-company management"
        )
        Prices = @(
            @{
                Nickname = "Enterprise Monthly"
                Amount = 59900  # $599.00 in cents
                Interval = "month"
            },
            @{
                Nickname = "Enterprise Annual"
                Amount = 599000  # $5,990.00 in cents
                Interval = "year"
            }
        )
    }
)

# Results storage
$results = @{
    Products = @{}
    Prices = @{}
    PaymentLinks = @{}
}

function Invoke-StripeCommand {
    param(
        [string]$Command,
        [string]$Description
    )

    Write-Host "  -> $Description" -ForegroundColor Gray

    if ($DryRun) {
        Write-Host "     [DRY RUN] Would execute: stripe $Command" -ForegroundColor Yellow
        return '{"id": "dry_run_id"}'
    }

    $fullCommand = "stripe $Command"
    if (-not $LiveMode) {
        # Test mode is default in Stripe CLI when authenticated
    }

    try {
        $result = Invoke-Expression $fullCommand 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Stripe CLI returned error: $result"
        }
        return $result
    }
    catch {
        Write-Host "     [ERROR] $($_.Exception.Message)" -ForegroundColor Red
        throw
    }
}

function Create-StripeProduct {
    param(
        [hashtable]$Product
    )

    Write-Host ""
    Write-Host "Creating product: $($Product.Name)" -ForegroundColor Yellow

    # Build features string for metadata
    $featuresJson = ($Product.Features | ConvertTo-Json -Compress) -replace '"', '\"'

    $command = @(
        "products create"
        "--name=`"$($Product.Name)`""
        "--description=`"$($Product.Description)`""
        "--metadata[tier]=$($Product.Name -replace 'BuildDesk ', '' -replace ' ', '_' | ForEach-Object { $_.ToLower() })"
    ) -join " "

    $result = Invoke-StripeCommand -Command $command -Description "Creating product"
    $productData = $result | ConvertFrom-Json

    Write-Host "     Product ID: $($productData.id)" -ForegroundColor Green

    return $productData.id
}

function Create-StripePrice {
    param(
        [string]$ProductId,
        [hashtable]$Price,
        [string]$Tier
    )

    Write-Host "  Creating price: $($Price.Nickname)" -ForegroundColor Cyan

    $tierKey = $Tier.ToLower()
    $intervalKey = if ($Price.Interval -eq "month") { "monthly" } else { "annual" }

    $command = @(
        "prices create"
        "--product=$ProductId"
        "--currency=usd"
        "--unit-amount=$($Price.Amount)"
        "--recurring[interval]=$($Price.Interval)"
        "--nickname=`"$($Price.Nickname)`""
        "--metadata[tier]=$tierKey"
        "--metadata[billing_period]=$intervalKey"
    ) -join " "

    $result = Invoke-StripeCommand -Command $command -Description "Creating price"
    $priceData = $result | ConvertFrom-Json

    Write-Host "     Price ID: $($priceData.id)" -ForegroundColor Green

    return $priceData.id
}

function Create-PaymentLink {
    param(
        [string]$PriceId,
        [string]$Nickname
    )

    Write-Host "  Creating payment link for: $Nickname" -ForegroundColor Cyan

    $command = @(
        "payment_links create"
        "--line-items[0][price]=$PriceId"
        "--line-items[0][quantity]=1"
        "--allow-promotion-codes"
        "--billing-address-collection=auto"
        "--after-completion[type]=redirect"
        "--after-completion[redirect][url]=https://build-desk.com/setup?session_id={CHECKOUT_SESSION_ID}"
    ) -join " "

    $result = Invoke-StripeCommand -Command $command -Description "Creating payment link"
    $linkData = $result | ConvertFrom-Json

    Write-Host "     Payment Link: $($linkData.url)" -ForegroundColor Green

    return @{
        Id = $linkData.id
        Url = $linkData.url
    }
}

# Main execution
Write-Host ""
Write-Host "Starting product creation..." -ForegroundColor White
Write-Host ""

foreach ($product in $products) {
    $tier = $product.Name -replace "BuildDesk ", ""
    $tierKey = $tier.ToLower()

    # Create product
    $productId = Create-StripeProduct -Product $product
    $results.Products[$tierKey] = $productId

    # Create prices for this product
    foreach ($price in $product.Prices) {
        $intervalKey = if ($price.Interval -eq "month") { "monthly" } else { "annual" }
        $priceKey = "${tierKey}_${intervalKey}"

        $priceId = Create-StripePrice -ProductId $productId -Price $price -Tier $tier
        $results.Prices[$priceKey] = $priceId

        # Create payment link
        $linkData = Create-PaymentLink -PriceId $priceId -Nickname $price.Nickname
        $results.PaymentLinks[$priceKey] = $linkData
    }
}

# Output summary
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "PRODUCTS:" -ForegroundColor Yellow
foreach ($key in $results.Products.Keys) {
    Write-Host "  $key : $($results.Products[$key])"
}

Write-Host ""
Write-Host "PRICES:" -ForegroundColor Yellow
foreach ($key in $results.Prices.Keys) {
    Write-Host "  $key : $($results.Prices[$key])"
}

Write-Host ""
Write-Host "PAYMENT LINKS:" -ForegroundColor Yellow
foreach ($key in $results.PaymentLinks.Keys) {
    Write-Host "  $key :"
    Write-Host "    ID : $($results.PaymentLinks[$key].Id)"
    Write-Host "    URL: $($results.PaymentLinks[$key].Url)"
}

# Generate configuration file content
$configContent = @"
// Stripe Configuration - Generated $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
// Copy this to your configuration file

export const STRIPE_CONFIG = {
  products: {
    starter: '$($results.Products['starter'])',
    professional: '$($results.Products['professional'])',
    enterprise: '$($results.Products['enterprise'])',
  },
  prices: {
    starter_monthly: '$($results.Prices['starter_monthly'])',
    starter_annual: '$($results.Prices['starter_annual'])',
    professional_monthly: '$($results.Prices['professional_monthly'])',
    professional_annual: '$($results.Prices['professional_annual'])',
    enterprise_monthly: '$($results.Prices['enterprise_monthly'])',
    enterprise_annual: '$($results.Prices['enterprise_annual'])',
  },
  paymentLinks: {
    starter_monthly: '$($results.PaymentLinks['starter_monthly'].Url)',
    starter_annual: '$($results.PaymentLinks['starter_annual'].Url)',
    professional_monthly: '$($results.PaymentLinks['professional_monthly'].Url)',
    professional_annual: '$($results.PaymentLinks['professional_annual'].Url)',
    enterprise_monthly: '$($results.PaymentLinks['enterprise_monthly'].Url)',
    enterprise_annual: '$($results.PaymentLinks['enterprise_annual'].Url)',
  }
} as const;

// Environment variables to add to Supabase Edge Functions:
// STRIPE_PRICE_STARTER_MONTHLY=$($results.Prices['starter_monthly'])
// STRIPE_PRICE_STARTER_ANNUAL=$($results.Prices['starter_annual'])
// STRIPE_PRICE_PROFESSIONAL_MONTHLY=$($results.Prices['professional_monthly'])
// STRIPE_PRICE_PROFESSIONAL_ANNUAL=$($results.Prices['professional_annual'])
// STRIPE_PRICE_ENTERPRISE_MONTHLY=$($results.Prices['enterprise_monthly'])
// STRIPE_PRICE_ENTERPRISE_ANNUAL=$($results.Prices['enterprise_annual'])
"@

Write-Host ""
Write-Host "GENERATED CONFIGURATION:" -ForegroundColor Cyan
Write-Host $configContent

# Save to file
$outputPath = Join-Path $PSScriptRoot "stripe-config-output.ts"
$configContent | Out-File -FilePath $outputPath -Encoding utf8
Write-Host ""
Write-Host "Configuration saved to: $outputPath" -ForegroundColor Green

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Next Steps:" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "1. Copy the price IDs to src/config/stripe.ts"
Write-Host "2. Add price IDs as Supabase Edge Function secrets:"
Write-Host "   supabase secrets set STRIPE_PRICE_STARTER_MONTHLY=price_xxx"
Write-Host "3. Update create-stripe-checkout function to use price IDs"
Write-Host "4. Test checkout flow in test mode"
Write-Host "5. When ready, run with -LiveMode for production"
Write-Host ""
