#!/bin/bash

# Brikly Version Bump Script
# Bumps version across all project configs (root, mobile-app, Expo, Android, iOS)
# Usage: ./scripts/mobile/bump-version.sh 1.0.1

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

NEW_VERSION=$1

if [ -z "$NEW_VERSION" ]; then
    echo -e "${RED}Version number required${NC}"
    echo "Usage: $0 <version>"
    echo "Example: $0 1.0.1"
    exit 1
fi

# Validate version format (semver)
if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}Invalid version format${NC}"
    echo "Version must be in format: MAJOR.MINOR.PATCH (e.g., 1.0.1)"
    exit 1
fi

echo -e "${BLUE}Updating version to $NEW_VERSION${NC}"
echo ""

# Extract version parts
IFS='.' read -r MAJOR MINOR PATCH <<< "$NEW_VERSION"
VERSION_CODE=$((MAJOR * 10000 + MINOR * 100 + PATCH))

echo "Version: $NEW_VERSION"
echo "Version Code (Android): $VERSION_CODE"
echo "Build Number (iOS): $VERSION_CODE"
echo ""

# ── Root package.json ──

echo -e "${YELLOW}Updating root package.json...${NC}"
npm version $NEW_VERSION --no-git-tag-version
echo -e "${GREEN}Root package.json updated${NC}"

# ── mobile-app/package.json ──

if [ -f "mobile-app/package.json" ]; then
    echo -e "${YELLOW}Updating mobile-app/package.json...${NC}"
    cd mobile-app
    npm version $NEW_VERSION --no-git-tag-version
    cd ..
    echo -e "${GREEN}mobile-app/package.json updated${NC}"
fi

# ── mobile-app/app.json (Expo) ──

if [ -f "mobile-app/app.json" ]; then
    echo -e "${YELLOW}Updating mobile-app/app.json (Expo)...${NC}"

    # Update expo version
    node -e "
      const fs = require('fs');
      const app = JSON.parse(fs.readFileSync('mobile-app/app.json', 'utf8'));
      app.expo.version = '$NEW_VERSION';
      app.expo.ios.buildNumber = '$VERSION_CODE';
      app.expo.android.versionCode = $VERSION_CODE;
      fs.writeFileSync('mobile-app/app.json', JSON.stringify(app, null, 2) + '\n');
    "

    echo -e "${GREEN}app.json updated:${NC}"
    echo "  expo.version: $NEW_VERSION"
    echo "  expo.ios.buildNumber: $VERSION_CODE"
    echo "  expo.android.versionCode: $VERSION_CODE"
fi

# ── Android build.gradle (Capacitor) ──

if [ -f "android/app/build.gradle" ]; then
    echo -e "${YELLOW}Updating Android build.gradle...${NC}"

    sed -i.tmp "s/versionCode [0-9]*/versionCode $VERSION_CODE/" android/app/build.gradle
    sed -i.tmp "s/versionName \"[^\"]*\"/versionName \"$NEW_VERSION\"/" android/app/build.gradle
    rm -f android/app/build.gradle.tmp

    echo -e "${GREEN}Android build.gradle updated${NC}"
    echo "  versionCode: $VERSION_CODE"
    echo "  versionName: $NEW_VERSION"
else
    echo -e "${YELLOW}android/app/build.gradle not found (Capacitor not initialized yet)${NC}"
fi

# ── iOS Info.plist (Capacitor) ──

if [ -d "ios" ]; then
    echo -e "${YELLOW}iOS version update required in Xcode:${NC}"
    echo "  1. Open ios/App/App.xcodeproj in Xcode"
    echo "  2. Select App target → General → Identity"
    echo "  3. Set Version: $NEW_VERSION"
    echo "  4. Set Build: $VERSION_CODE"
    echo ""
    echo "  Or update ios/App/App/Info.plist:"
    echo "  - CFBundleShortVersionString: $NEW_VERSION"
    echo "  - CFBundleVersion: $VERSION_CODE"
else
    echo -e "${YELLOW}ios/ directory not found (Capacitor not initialized yet)${NC}"
fi

echo ""
echo -e "${GREEN}Version bump complete!${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Review changes: git diff"
echo "2. Commit: git add . && git commit -m \"chore: bump version to $NEW_VERSION\""
echo "3. Tag: git tag v$NEW_VERSION"
echo "4. Build: ./scripts/mobile/build-mobile.sh"
echo ""
