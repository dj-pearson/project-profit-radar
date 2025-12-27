#!/bin/bash
# BuildDesk Stripe Products Setup Script
# Run this script with Stripe CLI installed and authenticated
# Bash script for Linux/Mac

# Prerequisites:
# 1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
# 2. Login: stripe login
# 3. Run: chmod +x setup-stripe-products.sh && ./setup-stripe-products.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

LIVE_MODE=false
DRY_RUN=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --live)
            LIVE_MODE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  BuildDesk Stripe Products Setup Script${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

if [ "$LIVE_MODE" = true ]; then
    echo -e "${RED}[WARNING] Running in LIVE mode - real charges will be possible!${NC}"
    read -p "Are you sure? Type 'YES' to continue: " confirm
    if [ "$confirm" != "YES" ]; then
        echo -e "${YELLOW}Aborted.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}[INFO] Running in TEST mode (use --live for production)${NC}"
fi

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[INFO] DRY RUN - No actual API calls will be made${NC}"
fi

echo ""

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo -e "${RED}Error: Stripe CLI is not installed.${NC}"
    echo "Install it from: https://stripe.com/docs/stripe-cli"
    exit 1
fi

# Check if logged in
if ! stripe config --list &> /dev/null; then
    echo -e "${RED}Error: Not logged in to Stripe CLI.${NC}"
    echo "Run: stripe login"
    exit 1
fi

# Arrays to store results
declare -A PRODUCTS
declare -A PRICES
declare -A PAYMENT_LINKS

# Function to run stripe command
run_stripe() {
    local cmd=$1
    local description=$2

    echo -e "  -> ${description}"

    if [ "$DRY_RUN" = true ]; then
        echo -e "     ${YELLOW}[DRY RUN] Would execute: stripe ${cmd}${NC}"
        echo '{"id": "dry_run_id", "url": "https://buy.stripe.com/test"}'
        return
    fi

    result=$(eval "stripe $cmd" 2>&1)
    if [ $? -ne 0 ]; then
        echo -e "     ${RED}[ERROR] $result${NC}"
        exit 1
    fi
    echo "$result"
}

# Create Starter Product
echo ""
echo -e "${YELLOW}Creating product: BuildDesk Starter${NC}"
STARTER_PRODUCT=$(run_stripe "products create \
    --name='BuildDesk Starter' \
    --description='Perfect for small teams (1-5 users). Includes basic job costing, mobile time tracking, QuickBooks sync, and email support.' \
    --metadata[tier]=starter" \
    "Creating Starter product")
STARTER_PRODUCT_ID=$(echo "$STARTER_PRODUCT" | jq -r '.id')
echo -e "     ${GREEN}Product ID: $STARTER_PRODUCT_ID${NC}"
PRODUCTS[starter]=$STARTER_PRODUCT_ID

# Starter Monthly Price
echo -e "  ${CYAN}Creating price: Starter Monthly${NC}"
STARTER_MONTHLY=$(run_stripe "prices create \
    --product=$STARTER_PRODUCT_ID \
    --currency=usd \
    --unit-amount=14900 \
    --recurring[interval]=month \
    --nickname='Starter Monthly' \
    --metadata[tier]=starter \
    --metadata[billing_period]=monthly" \
    "Creating Starter Monthly price")
STARTER_MONTHLY_ID=$(echo "$STARTER_MONTHLY" | jq -r '.id')
echo -e "     ${GREEN}Price ID: $STARTER_MONTHLY_ID${NC}"
PRICES[starter_monthly]=$STARTER_MONTHLY_ID

# Starter Annual Price
echo -e "  ${CYAN}Creating price: Starter Annual${NC}"
STARTER_ANNUAL=$(run_stripe "prices create \
    --product=$STARTER_PRODUCT_ID \
    --currency=usd \
    --unit-amount=149000 \
    --recurring[interval]=year \
    --nickname='Starter Annual' \
    --metadata[tier]=starter \
    --metadata[billing_period]=annual" \
    "Creating Starter Annual price")
STARTER_ANNUAL_ID=$(echo "$STARTER_ANNUAL" | jq -r '.id')
echo -e "     ${GREEN}Price ID: $STARTER_ANNUAL_ID${NC}"
PRICES[starter_annual]=$STARTER_ANNUAL_ID

# Create Professional Product
echo ""
echo -e "${YELLOW}Creating product: BuildDesk Professional${NC}"
PROFESSIONAL_PRODUCT=$(run_stripe "products create \
    --name='BuildDesk Professional' \
    --description='Most popular choice for growing contractors (5-20 users). Full mobile suite, all integrations, OSHA compliance tools, and priority support.' \
    --metadata[tier]=professional" \
    "Creating Professional product")
PROFESSIONAL_PRODUCT_ID=$(echo "$PROFESSIONAL_PRODUCT" | jq -r '.id')
echo -e "     ${GREEN}Product ID: $PROFESSIONAL_PRODUCT_ID${NC}"
PRODUCTS[professional]=$PROFESSIONAL_PRODUCT_ID

# Professional Monthly Price
echo -e "  ${CYAN}Creating price: Professional Monthly${NC}"
PROFESSIONAL_MONTHLY=$(run_stripe "prices create \
    --product=$PROFESSIONAL_PRODUCT_ID \
    --currency=usd \
    --unit-amount=29900 \
    --recurring[interval]=month \
    --nickname='Professional Monthly' \
    --metadata[tier]=professional \
    --metadata[billing_period]=monthly" \
    "Creating Professional Monthly price")
PROFESSIONAL_MONTHLY_ID=$(echo "$PROFESSIONAL_MONTHLY" | jq -r '.id')
echo -e "     ${GREEN}Price ID: $PROFESSIONAL_MONTHLY_ID${NC}"
PRICES[professional_monthly]=$PROFESSIONAL_MONTHLY_ID

# Professional Annual Price
echo -e "  ${CYAN}Creating price: Professional Annual${NC}"
PROFESSIONAL_ANNUAL=$(run_stripe "prices create \
    --product=$PROFESSIONAL_PRODUCT_ID \
    --currency=usd \
    --unit-amount=299000 \
    --recurring[interval]=year \
    --nickname='Professional Annual' \
    --metadata[tier]=professional \
    --metadata[billing_period]=annual" \
    "Creating Professional Annual price")
PROFESSIONAL_ANNUAL_ID=$(echo "$PROFESSIONAL_ANNUAL" | jq -r '.id')
echo -e "     ${GREEN}Price ID: $PROFESSIONAL_ANNUAL_ID${NC}"
PRICES[professional_annual]=$PROFESSIONAL_ANNUAL_ID

# Create Enterprise Product
echo ""
echo -e "${YELLOW}Creating product: BuildDesk Enterprise${NC}"
ENTERPRISE_PRODUCT=$(run_stripe "products create \
    --name='BuildDesk Enterprise' \
    --description='For large operations (20+ users). Unlimited everything, custom integrations, white-label options, and dedicated success manager.' \
    --metadata[tier]=enterprise" \
    "Creating Enterprise product")
ENTERPRISE_PRODUCT_ID=$(echo "$ENTERPRISE_PRODUCT" | jq -r '.id')
echo -e "     ${GREEN}Product ID: $ENTERPRISE_PRODUCT_ID${NC}"
PRODUCTS[enterprise]=$ENTERPRISE_PRODUCT_ID

# Enterprise Monthly Price
echo -e "  ${CYAN}Creating price: Enterprise Monthly${NC}"
ENTERPRISE_MONTHLY=$(run_stripe "prices create \
    --product=$ENTERPRISE_PRODUCT_ID \
    --currency=usd \
    --unit-amount=59900 \
    --recurring[interval]=month \
    --nickname='Enterprise Monthly' \
    --metadata[tier]=enterprise \
    --metadata[billing_period]=monthly" \
    "Creating Enterprise Monthly price")
ENTERPRISE_MONTHLY_ID=$(echo "$ENTERPRISE_MONTHLY" | jq -r '.id')
echo -e "     ${GREEN}Price ID: $ENTERPRISE_MONTHLY_ID${NC}"
PRICES[enterprise_monthly]=$ENTERPRISE_MONTHLY_ID

# Enterprise Annual Price
echo -e "  ${CYAN}Creating price: Enterprise Annual${NC}"
ENTERPRISE_ANNUAL=$(run_stripe "prices create \
    --product=$ENTERPRISE_PRODUCT_ID \
    --currency=usd \
    --unit-amount=599000 \
    --recurring[interval]=year \
    --nickname='Enterprise Annual' \
    --metadata[tier]=enterprise \
    --metadata[billing_period]=annual" \
    "Creating Enterprise Annual price")
ENTERPRISE_ANNUAL_ID=$(echo "$ENTERPRISE_ANNUAL" | jq -r '.id')
echo -e "     ${GREEN}Price ID: $ENTERPRISE_ANNUAL_ID${NC}"
PRICES[enterprise_annual]=$ENTERPRISE_ANNUAL_ID

# Create Payment Links
echo ""
echo -e "${YELLOW}Creating Payment Links...${NC}"

create_payment_link() {
    local price_id=$1
    local nickname=$2
    local key=$3

    echo -e "  ${CYAN}Creating payment link for: $nickname${NC}"
    LINK=$(run_stripe "payment_links create \
        --line-items[0][price]=$price_id \
        --line-items[0][quantity]=1 \
        --allow-promotion-codes \
        --billing-address-collection=auto \
        --after-completion[type]=redirect \
        --after-completion[redirect][url]='https://build-desk.com/setup?session_id={CHECKOUT_SESSION_ID}'" \
        "Creating payment link")
    LINK_URL=$(echo "$LINK" | jq -r '.url')
    LINK_ID=$(echo "$LINK" | jq -r '.id')
    echo -e "     ${GREEN}Payment Link: $LINK_URL${NC}"
    PAYMENT_LINKS[$key]=$LINK_URL
}

create_payment_link "$STARTER_MONTHLY_ID" "Starter Monthly" "starter_monthly"
create_payment_link "$STARTER_ANNUAL_ID" "Starter Annual" "starter_annual"
create_payment_link "$PROFESSIONAL_MONTHLY_ID" "Professional Monthly" "professional_monthly"
create_payment_link "$PROFESSIONAL_ANNUAL_ID" "Professional Annual" "professional_annual"
create_payment_link "$ENTERPRISE_MONTHLY_ID" "Enterprise Monthly" "enterprise_monthly"
create_payment_link "$ENTERPRISE_ANNUAL_ID" "Enterprise Annual" "enterprise_annual"

# Output summary
echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

echo -e "${YELLOW}PRODUCTS:${NC}"
for key in "${!PRODUCTS[@]}"; do
    echo "  $key: ${PRODUCTS[$key]}"
done

echo ""
echo -e "${YELLOW}PRICES:${NC}"
for key in "${!PRICES[@]}"; do
    echo "  $key: ${PRICES[$key]}"
done

echo ""
echo -e "${YELLOW}PAYMENT LINKS:${NC}"
for key in "${!PAYMENT_LINKS[@]}"; do
    echo "  $key: ${PAYMENT_LINKS[$key]}"
done

# Generate configuration
OUTPUT_FILE="$(dirname "$0")/stripe-config-output.ts"
cat > "$OUTPUT_FILE" << EOF
// Stripe Configuration - Generated $(date '+%Y-%m-%d %H:%M:%S')
// Copy this to your configuration file

export const STRIPE_CONFIG = {
  products: {
    starter: '${PRODUCTS[starter]}',
    professional: '${PRODUCTS[professional]}',
    enterprise: '${PRODUCTS[enterprise]}',
  },
  prices: {
    starter_monthly: '${PRICES[starter_monthly]}',
    starter_annual: '${PRICES[starter_annual]}',
    professional_monthly: '${PRICES[professional_monthly]}',
    professional_annual: '${PRICES[professional_annual]}',
    enterprise_monthly: '${PRICES[enterprise_monthly]}',
    enterprise_annual: '${PRICES[enterprise_annual]}',
  },
  paymentLinks: {
    starter_monthly: '${PAYMENT_LINKS[starter_monthly]}',
    starter_annual: '${PAYMENT_LINKS[starter_annual]}',
    professional_monthly: '${PAYMENT_LINKS[professional_monthly]}',
    professional_annual: '${PAYMENT_LINKS[professional_annual]}',
    enterprise_monthly: '${PAYMENT_LINKS[enterprise_monthly]}',
    enterprise_annual: '${PAYMENT_LINKS[enterprise_annual]}',
  }
} as const;

// Environment variables to add to Supabase Edge Functions:
// STRIPE_PRICE_STARTER_MONTHLY=${PRICES[starter_monthly]}
// STRIPE_PRICE_STARTER_ANNUAL=${PRICES[starter_annual]}
// STRIPE_PRICE_PROFESSIONAL_MONTHLY=${PRICES[professional_monthly]}
// STRIPE_PRICE_PROFESSIONAL_ANNUAL=${PRICES[professional_annual]}
// STRIPE_PRICE_ENTERPRISE_MONTHLY=${PRICES[enterprise_monthly]}
// STRIPE_PRICE_ENTERPRISE_ANNUAL=${PRICES[enterprise_annual]}
EOF

echo ""
echo -e "${GREEN}Configuration saved to: $OUTPUT_FILE${NC}"

echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${YELLOW}  Next Steps:${NC}"
echo -e "${CYAN}============================================${NC}"
echo "1. Copy the price IDs to src/config/stripe.ts"
echo "2. Add price IDs as Supabase Edge Function secrets:"
echo "   supabase secrets set STRIPE_PRICE_STARTER_MONTHLY=price_xxx"
echo "3. Update create-stripe-checkout function to use price IDs"
echo "4. Test checkout flow in test mode"
echo "5. When ready, run with --live for production"
echo ""
