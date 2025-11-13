#!/bin/bash

# BuildDesk Version Bump Script
# Usage: ./scripts/mobile/bump-version.sh 1.0.1

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

NEW_VERSION=$1

if [ -z "$NEW_VERSION" ]; then
    echo -e "${RED}❌ Version number required${NC}"
    echo "Usage: $0 <version>"
    echo "Example: $0 1.0.1"
    exit 1
fi

# Validate version format (semver)
if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}❌ Invalid version format${NC}"
    echo "Version must be in format: MAJOR.MINOR.PATCH (e.g., 1.0.1)"
    exit 1
fi

echo -e "${BLUE}📝 Updating version to $NEW_VERSION${NC}"
echo ""

# Extract version parts
IFS='.' read -r MAJOR MINOR PATCH <<< "$NEW_VERSION"
VERSION_CODE=$((MAJOR * 10000 + MINOR * 100 + PATCH))

echo "Version: $NEW_VERSION"
echo "Version Code (Android): $VERSION_CODE"
echo ""

# Update package.json
echo -e "${YELLOW}📦 Updating package.json...${NC}"
npm version $NEW_VERSION --no-git-tag-version
echo -e "${GREEN}✅ package.json updated${NC}"
echo ""

# Update Android version
if [ -f "android/app/build.gradle" ]; then
    echo -e "${YELLOW}🤖 Updating Android version...${NC}"

    # Backup file
    cp android/app/build.gradle android/app/build.gradle.bak

    # Update versionCode
    sed -i.tmp "s/versionCode [0-9]*/versionCode $VERSION_CODE/" android/app/build.gradle

    # Update versionName
    sed -i.tmp "s/versionName \"[^\"]*\"/versionName \"$NEW_VERSION\"/" android/app/build.gradle

    # Clean up temp files
    rm -f android/app/build.gradle.tmp android/app/build.gradle.bak

    echo -e "${GREEN}✅ Android version updated${NC}"
    echo "   versionCode: $VERSION_CODE"
    echo "   versionName: $NEW_VERSION"
    echo ""
else
    echo -e "${YELLOW}⚠️  android/app/build.gradle not found${NC}"
    echo ""
fi

# iOS version update instructions
if [ -d "ios" ]; then
    echo -e "${YELLOW}🍎 iOS version update required:${NC}"
    echo "   Please update manually in Xcode:"
    echo "   1. Open ios/App/App.xcodeproj in Xcode"
    echo "   2. Select App target"
    echo "   3. General tab → Identity section"
    echo "   4. Set Version: $NEW_VERSION"
    echo "   5. Set Build: $VERSION_CODE"
    echo ""
    echo "   Or update ios/App/App/Info.plist:"
    echo "   - CFBundleShortVersionString: $NEW_VERSION"
    echo "   - CFBundleVersion: $VERSION_CODE"
    echo ""
else
    echo -e "${YELLOW}⚠️  ios directory not found${NC}"
    echo ""
fi

# Update Capacitor config
if [ -f "capacitor.config.ts" ]; then
    echo -e "${YELLOW}⚙️  Capacitor config:${NC}"
    echo "   Consider adding version to capacitor.config.ts if needed"
    echo ""
fi

echo -e "${GREEN}✅ Version bump complete!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Review changes: git diff"
echo "2. Update iOS version in Xcode (see instructions above)"
echo "3. Update changelog/release notes"
echo "4. Commit changes: git add . && git commit -m \"Bump version to $NEW_VERSION\""
echo "5. Tag release: git tag v$NEW_VERSION"
echo "6. Build mobile apps: ./scripts/mobile/build-mobile.sh"
echo ""
