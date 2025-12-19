#!/bin/bash
# Environment Setup Script
# Manages environment variables for different deployment environments

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=""
VALIDATE=false
EXPORT=false
EXPORT_PATH=".env"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment|-e)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --validate|-v)
            VALIDATE=true
            shift
            ;;
        --export)
            EXPORT=true
            shift
            ;;
        --export-path)
            EXPORT_PATH="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 --environment <dev|staging|prod> [options]"
            echo ""
            echo "Options:"
            echo "  --environment, -e    Environment (development, staging, production)"
            echo "  --validate, -v       Validate configuration"
            echo "  --export            Export to .env file"
            echo "  --export-path PATH  Custom export path (default: .env)"
            echo "  --help, -h          Show this help"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Validate environment parameter
if [ -z "$ENVIRONMENT" ]; then
    echo -e "${RED}Error: --environment parameter is required${NC}"
    echo "Usage: $0 --environment <development|staging|production>"
    exit 1
fi

case $ENVIRONMENT in
    development|dev)
        ENVIRONMENT="development"
        ;;
    staging|stage)
        ENVIRONMENT="staging"
        ;;
    production|prod)
        ENVIRONMENT="production"
        ;;
    *)
        echo -e "${RED}Error: Invalid environment: $ENVIRONMENT${NC}"
        echo "Valid options: development, staging, production"
        exit 1
        ;;
esac

echo -e "${GREEN}🔧 Environment Setup for Self-Hosted Supabase Edge Functions${NC}"
echo -e "${GREEN}=============================================================${NC}"
echo ""

# Load environment-specific variables
case $ENVIRONMENT in
    development)
        SUPABASE_URL="${DEV_SUPABASE_URL}"
        SUPABASE_ANON_KEY="${DEV_SUPABASE_ANON_KEY}"
        SUPABASE_SERVICE_ROLE_KEY="${DEV_SUPABASE_SERVICE_ROLE_KEY}"
        PORT="8000"
        NODE_ENV="development"
        LOG_LEVEL="debug"
        ;;
    staging)
        SUPABASE_URL="${STAGING_SUPABASE_URL}"
        SUPABASE_ANON_KEY="${STAGING_SUPABASE_ANON_KEY}"
        SUPABASE_SERVICE_ROLE_KEY="${STAGING_SUPABASE_SERVICE_ROLE_KEY}"
        PORT="8000"
        NODE_ENV="staging"
        LOG_LEVEL="info"
        ;;
    production)
        SUPABASE_URL="${PROD_SUPABASE_URL}"
        SUPABASE_ANON_KEY="${PROD_SUPABASE_ANON_KEY}"
        SUPABASE_SERVICE_ROLE_KEY="${PROD_SUPABASE_SERVICE_ROLE_KEY}"
        PORT="8000"
        NODE_ENV="production"
        LOG_LEVEL="warn"
        ;;
esac

echo -e "${CYAN}Environment: $ENVIRONMENT${NC}"
echo ""

# Validate configuration
if [ "$VALIDATE" = true ]; then
    echo -e "${YELLOW}🔍 Validating configuration...${NC}"
    echo ""
    
    IS_VALID=true
    
    # Check SUPABASE_URL
    if [ -z "$SUPABASE_URL" ]; then
        echo -e "${RED}❌ Missing: SUPABASE_URL${NC}"
        IS_VALID=false
    else
        echo -e "${GREEN}✅ SUPABASE_URL = $SUPABASE_URL${NC}"
    fi
    
    # Check SUPABASE_ANON_KEY
    if [ -z "$SUPABASE_ANON_KEY" ]; then
        echo -e "${RED}❌ Missing: SUPABASE_ANON_KEY${NC}"
        IS_VALID=false
    else
        MASKED_KEY="${SUPABASE_ANON_KEY:0:20}..."
        echo -e "${GREEN}✅ SUPABASE_ANON_KEY = $MASKED_KEY${NC}"
    fi
    
    # Check SUPABASE_SERVICE_ROLE_KEY
    if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        echo -e "${RED}❌ Missing: SUPABASE_SERVICE_ROLE_KEY${NC}"
        IS_VALID=false
    else
        MASKED_KEY="${SUPABASE_SERVICE_ROLE_KEY:0:20}..."
        echo -e "${GREEN}✅ SUPABASE_SERVICE_ROLE_KEY = $MASKED_KEY${NC}"
    fi
    
    echo ""
    if [ "$IS_VALID" = true ]; then
        echo -e "${GREEN}✅ All required variables are configured${NC}"
    else
        echo -e "${RED}❌ Configuration is incomplete${NC}"
        echo ""
        echo -e "${YELLOW}Required environment variables for $ENVIRONMENT:${NC}"
        echo -e "${WHITE}  - ${ENVIRONMENT^^}_SUPABASE_URL${NC}"
        echo -e "${WHITE}  - ${ENVIRONMENT^^}_SUPABASE_ANON_KEY${NC}"
        echo -e "${WHITE}  - ${ENVIRONMENT^^}_SUPABASE_SERVICE_ROLE_KEY${NC}"
        exit 1
    fi
fi

# Export to .env file
if [ "$EXPORT" = true ]; then
    echo -e "${YELLOW}📝 Exporting configuration to: $EXPORT_PATH${NC}"
    echo ""
    
    cat > "$EXPORT_PATH" << EOF
# Auto-generated environment configuration
# Environment: $ENVIRONMENT
# Generated: $(date "+%Y-%m-%d %H:%M:%S")

# Supabase Configuration
SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY

# Server Configuration
PORT=$PORT
NODE_ENV=$NODE_ENV
LOG_LEVEL=$LOG_LEVEL

# Deno Configuration
DENO_DIR=/app/.deno_cache
EOF
    
    echo -e "${GREEN}✅ Configuration exported successfully${NC}"
    echo ""
fi

# Display configuration
echo -e "${CYAN}Configuration for $ENVIRONMENT:${NC}"
echo ""
echo -e "${WHITE}  SUPABASE_URL = ${SUPABASE_URL:-<NOT SET>}${NC}"
echo -e "${WHITE}  SUPABASE_ANON_KEY = ${SUPABASE_ANON_KEY:0:20}${SUPABASE_ANON_KEY:+...}${NC}"
echo -e "${WHITE}  SUPABASE_SERVICE_ROLE_KEY = ${SUPABASE_SERVICE_ROLE_KEY:0:20}${SUPABASE_SERVICE_ROLE_KEY:+...}${NC}"
echo -e "${WHITE}  PORT = $PORT${NC}"
echo -e "${WHITE}  NODE_ENV = $NODE_ENV${NC}"
echo -e "${WHITE}  LOG_LEVEL = $LOG_LEVEL${NC}"

echo ""
echo -e "${CYAN}Usage examples:${NC}"
echo -e "${WHITE}  Validate:  ./env-setup.sh --environment $ENVIRONMENT --validate${NC}"
echo -e "${WHITE}  Export:    ./env-setup.sh --environment $ENVIRONMENT --export${NC}"
echo -e "${WHITE}  Custom:    ./env-setup.sh --environment $ENVIRONMENT --export --export-path .env.$ENVIRONMENT${NC}"
echo ""

