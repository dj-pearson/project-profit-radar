#!/bin/bash
# Bash script to build all MCP Docker images
# Run from the docker/mcp directory

set -e

echo "🐳 Building MCP Docker Images..."

IMAGES=(
    "mcp-playwright:Dockerfile.playwright"
    "mcp-puppeteer:Dockerfile.puppeteer"
    "mcp-sequential-thinking:Dockerfile.sequential-thinking"
    "mcp-filesystem:Dockerfile.filesystem"
    "mcp-memory:Dockerfile.memory"
    "mcp-context7:Dockerfile.context7"
    "mcp-supabase:Dockerfile.supabase"
)

FAILED=()
SUCCESS=()

for IMAGE_SPEC in "${IMAGES[@]}"; do
    NAME="${IMAGE_SPEC%%:*}"
    DOCKERFILE="${IMAGE_SPEC##*:}"
    
    echo ""
    echo "📦 Building $NAME..."
    
    if docker build -t "$NAME:latest" -f "$DOCKERFILE" .; then
        echo "✅ $NAME built successfully"
        SUCCESS+=("$NAME")
    else
        echo "❌ Failed to build $NAME"
        FAILED+=("$NAME")
    fi
done

echo ""
echo "=================================================="
echo "📊 Build Summary:"
echo "   ✅ Success: ${#SUCCESS[@]}"
echo "   ❌ Failed: ${#FAILED[@]}"

if [ ${#FAILED[@]} -gt 0 ]; then
    echo ""
    echo "   Failed images:"
    for f in "${FAILED[@]}"; do
        echo "      - $f"
    done
fi

echo ""
echo "🐳 Available MCP images:"
docker images | grep "mcp-" || true

