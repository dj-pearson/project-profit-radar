#!/bin/bash

# BuildDesk Mobile Build Script
# Usage: ./scripts/mobile/build-mobile.sh [ios|android|both]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🏗️  BuildDesk Mobile Build Script${NC}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

if ! command_exists npx; then
    echo -e "${RED}❌ npx is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"
echo ""

# Determine platform
PLATFORM=${1:-both}

if [[ "$PLATFORM" != "ios" && "$PLATFORM" != "android" && "$PLATFORM" != "both" ]]; then
    echo -e "${RED}❌ Invalid platform: $PLATFORM${NC}"
    echo "Usage: $0 [ios|android|both]"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Build web assets
echo -e "${BLUE}📦 Building web assets for production...${NC}"
npm run build:prod

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Web build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Web build complete${NC}"
echo ""

# Sync with Capacitor
echo -e "${BLUE}🔄 Syncing with Capacitor...${NC}"
npx cap sync

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Capacitor sync failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Capacitor sync complete${NC}"
echo ""

# iOS Build
if [[ "$PLATFORM" == "ios" || "$PLATFORM" == "both" ]]; then
    echo -e "${BLUE}🍎 iOS Setup${NC}"

    # Check if iOS project exists
    if [ ! -d "ios" ]; then
        echo -e "${YELLOW}⚠️  iOS project not found. Adding iOS platform...${NC}"
        npx cap add ios
    else
        echo -e "${GREEN}✅ iOS project exists${NC}"
    fi

    # Sync iOS
    npx cap sync ios

    echo -e "${YELLOW}📱 To build for iOS:${NC}"
    echo "   1. Run: npx cap open ios"
    echo "   2. In Xcode, select 'Any iOS Device (arm64)'"
    echo "   3. Product → Archive"
    echo "   4. Distribute App → App Store Connect"
    echo ""
fi

# Android Build
if [[ "$PLATFORM" == "android" || "$PLATFORM" == "both" ]]; then
    echo -e "${BLUE}🤖 Android Setup${NC}"

    # Check if Android project exists
    if [ ! -d "android" ]; then
        echo -e "${YELLOW}⚠️  Android project not found. Adding Android platform...${NC}"
        npx cap add android
    else
        echo -e "${GREEN}✅ Android project exists${NC}"
    fi

    # Sync Android
    npx cap sync android

    echo -e "${YELLOW}📱 To build for Android:${NC}"
    echo "   Option 1 (App Bundle for Play Store):"
    echo "   cd android && ./gradlew bundleRelease"
    echo ""
    echo "   Option 2 (APK for testing):"
    echo "   cd android && ./gradlew assembleRelease"
    echo ""
    echo "   Option 3 (Use Android Studio):"
    echo "   npx cap open android"
    echo "   Then: Build → Generate Signed Bundle/APK"
    echo ""
fi

echo -e "${GREEN}✅ Mobile build preparation complete!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. For iOS: Open Xcode and archive the app"
echo "2. For Android: Run the gradle commands shown above"
echo "3. Upload to respective app stores"
echo "4. Submit for review"
echo ""
echo "📖 See docs/MOBILE_DEPLOYMENT.md for detailed instructions"
