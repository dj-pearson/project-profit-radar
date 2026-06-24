#!/bin/bash
# Deploy Edge Functions Script for Self-Hosted Supabase
# This script copies your Supabase functions to the edge-functions-template for deployment

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# Flags
DRY_RUN=false
CLEAN=false
FUNCTION_FILTER="*"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --clean)
            CLEAN=true
            shift
            ;;
        --filter)
            FUNCTION_FILTER="$2"
            shift 2
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Usage: $0 [--dry-run] [--clean] [--filter PATTERN]"
            exit 1
            ;;
    esac
done

echo -e "${GREEN}🚀 Edge Functions Deployment Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Define paths
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SOURCE_DIR="$PROJECT_ROOT/supabase/functions"
TARGET_DIR="$SCRIPT_DIR/functions"
SHARED_DIR="$SOURCE_DIR/_shared"

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo -e "${RED}❌ Error: Source directory not found: $SOURCE_DIR${NC}"
    exit 1
fi

# Clean target directory if requested
if [ "$CLEAN" = true ]; then
    echo -e "${YELLOW}🧹 Cleaning target directory...${NC}"
    if [ -d "$TARGET_DIR" ]; then
        find "$TARGET_DIR" -mindepth 1 -maxdepth 1 -type d ! -name "_health" ! -name "_shared" | while read -r dir; do
            echo -e "${GRAY}   Removing: $(basename "$dir")${NC}"
            if [ "$DRY_RUN" = false ]; then
                rm -rf "$dir"
            fi
        done
    fi
    echo -e "${GREEN}✅ Cleaned target directory${NC}"
    echo ""
fi

# Create target directory if it doesn't exist
if [ ! -d "$TARGET_DIR" ]; then
    echo -e "${CYAN}📁 Creating target directory: $TARGET_DIR${NC}"
    if [ "$DRY_RUN" = false ]; then
        mkdir -p "$TARGET_DIR"
    fi
fi

# Copy _shared directory first if it exists
if [ -d "$SHARED_DIR" ]; then
    TARGET_SHARED_DIR="$TARGET_DIR/_shared"
    echo -e "${CYAN}📦 Copying _shared directory...${NC}"
    if [ "$DRY_RUN" = false ]; then
        rm -rf "$TARGET_SHARED_DIR"
        cp -r "$SHARED_DIR" "$TARGET_SHARED_DIR"
    fi
    echo -e "${GREEN}✅ Copied _shared directory${NC}"
    echo ""
fi

# Get all function directories
TOTAL_FUNCTIONS=0
COPIED_FUNCTIONS=0
SKIPPED_FUNCTIONS=0
ERROR_FUNCTIONS=()

# Count total functions
for dir in "$SOURCE_DIR"/*/ ; do
    [ -d "$dir" ] || continue
    dirname=$(basename "$dir")
    [[ "$dirname" =~ ^_.* ]] && continue
    [[ "$dirname" == $FUNCTION_FILTER ]] || [[ "$FUNCTION_FILTER" == "*" ]] || continue
    ((TOTAL_FUNCTIONS++))
done

echo -e "${CYAN}📋 Found $TOTAL_FUNCTIONS function(s) to process${NC}"
echo ""

# Process functions
for dir in "$SOURCE_DIR"/*/ ; do
    [ -d "$dir" ] || continue
    
    FUNCTION_NAME=$(basename "$dir")
    
    # Skip _shared and other underscore directories
    [[ "$FUNCTION_NAME" =~ ^_.* ]] && continue
    
    # Apply filter
    if [ "$FUNCTION_FILTER" != "*" ]; then
        [[ "$FUNCTION_NAME" == $FUNCTION_FILTER ]] || continue
    fi
    
    SOURCE_PATH="$dir"
    TARGET_PATH="$TARGET_DIR/$FUNCTION_NAME"
    INDEX_FILE="$SOURCE_PATH/index.ts"
    
    # Check if index.ts exists
    if [ ! -f "$INDEX_FILE" ]; then
        echo -e "${YELLOW}⚠️  Skipping $FUNCTION_NAME (no index.ts)${NC}"
        ((SKIPPED_FUNCTIONS++))
        continue
    fi
    
    echo -e "${CYAN}📦 Processing: $FUNCTION_NAME${NC}"
    
    if [ "$DRY_RUN" = false ]; then
        # Create target directory
        mkdir -p "$TARGET_PATH"
        
        # Copy all files from function directory
        cp -r "$SOURCE_PATH"/* "$TARGET_PATH/"
        
        if [ $? -eq 0 ]; then
            echo -e "   ${GREEN}✅ Copied successfully${NC}"
            ((COPIED_FUNCTIONS++))
        else
            echo -e "   ${RED}❌ Error copying function${NC}"
            ERROR_FUNCTIONS+=("$FUNCTION_NAME")
        fi
    else
        echo -e "   ${GREEN}✅ Would copy${NC}"
        ((COPIED_FUNCTIONS++))
    fi
done

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}📊 Deployment Summary${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${CYAN}Total functions found:    $TOTAL_FUNCTIONS${NC}"
echo -e "${GREEN}Successfully copied:      $COPIED_FUNCTIONS${NC}"
echo -e "${YELLOW}Skipped (no index.ts):   $SKIPPED_FUNCTIONS${NC}"
echo -e "$([ ${#ERROR_FUNCTIONS[@]} -gt 0 ] && echo "${RED}" || echo "${GREEN}")Errors:                   ${#ERROR_FUNCTIONS[@]}${NC}"

if [ ${#ERROR_FUNCTIONS[@]} -gt 0 ]; then
    echo ""
    echo -e "${RED}Failed functions:${NC}"
    for func in "${ERROR_FUNCTIONS[@]}"; do
        echo -e "${RED}  - $func${NC}"
    done
fi

if [ "$DRY_RUN" = true ]; then
    echo ""
    echo -e "${YELLOW}🔍 DRY RUN MODE - No changes were made${NC}"
    echo -e "${YELLOW}Run without --dry-run flag to perform actual deployment${NC}"
fi

echo ""
echo -e "${GREEN}✨ Deployment preparation complete!${NC}"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo -e "${NC}1. Review copied functions in: $TARGET_DIR${NC}"
echo -e "${NC}2. Ensure .env file is configured with your Supabase credentials${NC}"
echo -e "${NC}3. Test locally: docker-compose up${NC}"
echo -e "${NC}4. Build for production: docker build -t supabase-edge-functions .${NC}"
echo ""

