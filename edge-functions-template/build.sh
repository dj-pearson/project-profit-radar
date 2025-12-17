#!/bin/bash
# Build Script for Edge Functions Docker Image
# Builds production-ready Docker image with proper tagging

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Default values
TAG="latest"
REGISTRY=""
PUSH=false
NO_CACHE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --tag)
            TAG="$2"
            shift 2
            ;;
        --registry)
            REGISTRY="$2"
            shift 2
            ;;
        --push)
            PUSH=true
            shift
            ;;
        --no-cache)
            NO_CACHE=true
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Usage: $0 [--tag TAG] [--registry REGISTRY] [--push] [--no-cache]"
            exit 1
            ;;
    esac
done

echo -e "${GREEN}🐳 Building Edge Functions Docker Image${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Get build metadata
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

echo -e "${CYAN}Build Information:${NC}"
echo -e "${WHITE}  Date:     $BUILD_DATE${NC}"
echo -e "${WHITE}  Commit:   $GIT_COMMIT${NC}"
echo -e "${WHITE}  Branch:   $GIT_BRANCH${NC}"
echo -e "${WHITE}  Tag:      $TAG${NC}"
echo ""

# Construct image name
IMAGE_NAME="supabase-edge-functions"
if [ -n "$REGISTRY" ]; then
    IMAGE_NAME="$REGISTRY/$IMAGE_NAME"
fi
FULL_IMAGE_NAME="${IMAGE_NAME}:${TAG}"

echo -e "${CYAN}Building image: $FULL_IMAGE_NAME${NC}"
echo ""

# Build arguments
BUILD_ARGS=(
    --build-arg "BUILD_DATE=$BUILD_DATE"
    --build-arg "GIT_COMMIT=$GIT_COMMIT"
    --build-arg "GIT_BRANCH=$GIT_BRANCH"
    -t "$FULL_IMAGE_NAME"
    -f Dockerfile.production
    .
)

if [ "$NO_CACHE" = true ]; then
    BUILD_ARGS=(--no-cache "${BUILD_ARGS[@]}")
fi

# Run Docker build
echo -e "${YELLOW}📦 Running docker build...${NC}"
if docker build "${BUILD_ARGS[@]}"; then
    echo ""
    echo -e "${GREEN}✅ Build successful!${NC}"
    echo ""
    
    # Also tag as latest if not already
    if [ "$TAG" != "latest" ]; then
        LATEST_IMAGE_NAME="${IMAGE_NAME}:latest"
        echo -e "${CYAN}🏷️  Tagging as latest: $LATEST_IMAGE_NAME${NC}"
        docker tag "$FULL_IMAGE_NAME" "$LATEST_IMAGE_NAME"
    fi
    
    # Push if requested
    if [ "$PUSH" = true ]; then
        echo ""
        echo -e "${YELLOW}📤 Pushing image to registry...${NC}"
        docker push "$FULL_IMAGE_NAME"
        
        if [ "$TAG" != "latest" ]; then
            LATEST_IMAGE_NAME="${IMAGE_NAME}:latest"
            docker push "$LATEST_IMAGE_NAME"
        fi
        
        echo -e "${GREEN}✅ Push successful!${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}📊 Image Information${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "${CYAN}Image:    $FULL_IMAGE_NAME${NC}"
    
    # Get image size
    IMAGE_SIZE=$(docker images "$FULL_IMAGE_NAME" --format "{{.Size}}")
    echo -e "${CYAN}Size:     $IMAGE_SIZE${NC}"
    
    echo ""
    echo -e "${CYAN}Next steps:${NC}"
    echo -e "${WHITE}1. Test locally: docker run -p 8000:8000 --env-file .env $FULL_IMAGE_NAME${NC}"
    echo -e "${WHITE}2. Deploy to production: docker-compose -f docker-compose.production.yml up -d${NC}"
    if [ "$PUSH" = false ] && [ -n "$REGISTRY" ]; then
        echo -e "${WHITE}3. Push to registry: ./build.sh --tag $TAG --registry $REGISTRY --push${NC}"
    fi
    echo ""
else
    echo ""
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

