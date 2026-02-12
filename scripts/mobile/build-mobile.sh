#!/bin/bash

# BuildDesk Mobile Build Script (App Store / Play Store Ready)
# Usage: ./scripts/mobile/build-mobile.sh [ios|android|both]
#
# This script builds the web assets using the ISOLATED mobile Vite config
# (vite.config.mobile.ts → dist-mobile/) so that the web production build
# in dist/ is never affected.

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${BLUE}${BOLD}BuildDesk Mobile Build Script${NC}"
echo -e "${BLUE}App Store & Play Store Production Build${NC}"
echo ""

# ── Prerequisites ──

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command_exists node; then
    echo -e "${RED}Node.js is not installed${NC}"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Node.js 18+ required (found v${NODE_VERSION})${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}npm is not installed${NC}"
    exit 1
fi

if ! command_exists npx; then
    echo -e "${RED}npx is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}Prerequisites OK${NC}"
echo ""

# ── Platform selection ──

PLATFORM=${1:-both}

if [[ "$PLATFORM" != "ios" && "$PLATFORM" != "android" && "$PLATFORM" != "both" ]]; then
    echo -e "${RED}Invalid platform: $PLATFORM${NC}"
    echo "Usage: $0 [ios|android|both]"
    exit 1
fi

echo -e "${BLUE}Target platform: ${BOLD}${PLATFORM}${NC}"
echo ""

# ── Install dependencies ──

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# ── Run pre-submission checklist ──

echo -e "${BLUE}Running pre-submission checklist...${NC}"
node scripts/mobile/app-store-checklist.js || {
    echo ""
    echo -e "${RED}Pre-submission checklist has failures.${NC}"
    echo -e "${YELLOW}Fix the issues above before continuing, or pass --skip-checks to bypass.${NC}"
    if [[ "$2" != "--skip-checks" ]]; then
        exit 1
    fi
    echo -e "${YELLOW}Continuing despite failures (--skip-checks)...${NC}"
}
echo ""

# ── Build web assets (ISOLATED — outputs to dist-mobile/) ──

echo -e "${BLUE}Building mobile web assets (dist-mobile/)...${NC}"
echo -e "${YELLOW}Note: This does NOT affect your web production build (dist/).${NC}"
npm run build:mobile

if [ $? -ne 0 ]; then
    echo -e "${RED}Mobile build failed${NC}"
    exit 1
fi

echo -e "${GREEN}Mobile build complete → dist-mobile/${NC}"
echo ""

# ── Verify output ──

if [ ! -d "dist-mobile" ]; then
    echo -e "${RED}dist-mobile/ directory not created${NC}"
    exit 1
fi

if [ ! -f "dist-mobile/index.html" ]; then
    echo -e "${RED}dist-mobile/index.html not found${NC}"
    exit 1
fi

MOBILE_SIZE=$(du -sh dist-mobile | cut -f1)
echo -e "${GREEN}Mobile bundle size: ${MOBILE_SIZE}${NC}"
echo ""

# ── Capacitor sync ──

echo -e "${BLUE}Syncing with Capacitor...${NC}"
npx cap sync

if [ $? -ne 0 ]; then
    echo -e "${RED}Capacitor sync failed${NC}"
    exit 1
fi

echo -e "${GREEN}Capacitor sync complete${NC}"
echo ""

# ── iOS ──

if [[ "$PLATFORM" == "ios" || "$PLATFORM" == "both" ]]; then
    echo -e "${BLUE}${BOLD}iOS Setup${NC}"

    if [ ! -d "ios" ]; then
        echo -e "${YELLOW}iOS project not found. Initializing...${NC}"
        npx cap add ios
    fi

    npx cap sync ios

    echo ""
    echo -e "${GREEN}iOS ready.${NC}"
    echo -e "${BOLD}Next steps for App Store submission:${NC}"
    echo "  1. npx cap open ios"
    echo "  2. In Xcode → select your signing team"
    echo "  3. Set deployment target to iOS 16.0+"
    echo "  4. Product → Archive"
    echo "  5. Distribute App → App Store Connect"
    echo ""
    echo -e "${BOLD}Before uploading, verify:${NC}"
    echo "  - App icon is set (1024x1024 in Assets.xcassets)"
    echo "  - Launch screen is configured"
    echo "  - Privacy manifest (PrivacyInfo.xcprivacy) is present"
    echo "  - All permission usage descriptions are set"
    echo "  - Version and build number are correct"
    echo ""
fi

# ── Android ──

if [[ "$PLATFORM" == "android" || "$PLATFORM" == "both" ]]; then
    echo -e "${BLUE}${BOLD}Android Setup${NC}"

    if [ ! -d "android" ]; then
        echo -e "${YELLOW}Android project not found. Initializing...${NC}"
        npx cap add android
    fi

    npx cap sync android

    echo ""
    echo -e "${GREEN}Android ready.${NC}"
    echo -e "${BOLD}Next steps for Play Store submission:${NC}"
    echo ""
    echo "  Option 1 — App Bundle for Play Store (recommended):"
    echo "    cd android && ./gradlew bundleRelease"
    echo ""
    echo "  Option 2 — APK for testing:"
    echo "    cd android && ./gradlew assembleRelease"
    echo ""
    echo "  Option 3 — Android Studio:"
    echo "    npx cap open android"
    echo "    Build → Generate Signed Bundle/APK"
    echo ""
    echo -e "${BOLD}Before uploading, verify:${NC}"
    echo "  - Signing key is configured (release keystore)"
    echo "  - targetSdkVersion is 35"
    echo "  - Adaptive icon is set"
    echo "  - Version code and name are correct"
    echo "  - ProGuard / R8 minification is enabled for release"
    echo ""
fi

# ── Summary ──

echo -e "${GREEN}${BOLD}Mobile build preparation complete!${NC}"
echo ""
echo -e "${BLUE}Build output:${NC}"
echo "  Web (for Capacitor):  dist-mobile/"
echo "  Web (for Cloudflare): dist/ (unchanged)"
echo ""
echo -e "${BLUE}Submission commands:${NC}"
echo "  Expo/EAS iOS:     cd mobile-app && eas build --profile production --platform ios"
echo "  Expo/EAS Android: cd mobile-app && eas build --profile production --platform android"
echo "  Submit iOS:       cd mobile-app && eas submit --platform ios"
echo "  Submit Android:   cd mobile-app && eas submit --platform android"
echo ""
