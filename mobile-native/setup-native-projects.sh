#!/bin/bash

# BuildDesk Mobile - Native Projects Setup Script
# This script generates the iOS and Android native projects

set -e

echo "🚀 BuildDesk Mobile - Native Project Setup"
echo "=========================================="
echo ""

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the mobile-native directory"
    exit 1
fi

echo "📦 Installing dependencies (if needed)..."
if [ ! -d "node_modules" ]; then
    npm install --legacy-peer-deps
fi
echo "✅ Dependencies installed"
echo ""

# Generate native projects using React Native CLI
echo "🔨 Generating native iOS and Android projects..."
echo "This may take a few minutes..."
echo ""

# Create a temporary React Native project to copy the native folders from
TEMP_DIR="BuildDeskTemp_$(date +%s)"

echo "Creating temporary React Native project..."
npx --yes @react-native-community/cli@14.1.0 init "$TEMP_DIR" --version 0.76.5 --skip-install --pm npm || {
    echo "❌ Failed to create React Native template"
    echo "Trying alternative method..."

    # Alternative: Download template directly
    npm pack react-native@0.76.5
    tar -xzf react-native-0.76.5.tgz
    cp -r package/template/ios ./
    cp -r package/template/android ./
    rm -rf package react-native-0.76.5.tgz
}

if [ -d "$TEMP_DIR" ]; then
    echo "✅ Template created successfully"
    echo ""

    # Copy iOS project
    echo "📱 Setting up iOS project..."
    if [ -d "$TEMP_DIR/ios" ]; then
        cp -r "$TEMP_DIR/ios" ./

        # Rename the project
        cd ios
        find . -type f \( -name "*.pbxproj" -o -name "*.plist" -o -name "*.m" -o -name "*.h" \) -exec sed -i.bak "s/$TEMP_DIR/BuildDeskMobile/g" {} \;
        find . -name "*.bak" -delete

        # Rename directories
        [ -d "$TEMP_DIR" ] && mv "$TEMP_DIR" BuildDeskMobile 2>/dev/null || true
        [ -d "${TEMP_DIR}.xcodeproj" ] && mv "${TEMP_DIR}.xcodeproj" BuildDeskMobile.xcodeproj 2>/dev/null || true
        [ -d "${TEMP_DIR}.xcworkspace" ] && mv "${TEMP_DIR}.xcworkspace" BuildDeskMobile.xcworkspace 2>/dev/null || true
        [ -d "${TEMP_DIR}Tests" ] && mv "${TEMP_DIR}Tests" BuildDeskMobileTests 2>/dev/null || true

        cd ..
        echo "✅ iOS project configured"
    else
        echo "⚠️  iOS folder not found in template"
    fi
    echo ""

    # Copy Android project
    echo "🤖 Setting up Android project..."
    if [ -d "$TEMP_DIR/android" ]; then
        cp -r "$TEMP_DIR/android" ./

        # Update package name
        cd android
        find . -type f \( -name "*.gradle" -o -name "*.xml" -o -name "*.java" -o -name "*.kt" \) -exec sed -i.bak "s/com.$TEMP_DIR/com.builddeskmobile/g" {} \;
        find . -type f \( -name "*.gradle" -o -name "*.xml" -o -name "*.java" -o -name "*.kt" \) -exec sed -i.bak "s/$TEMP_DIR/BuildDeskMobile/g" {} \;
        find . -name "*.bak" -delete

        cd ..
        echo "✅ Android project configured"
    else
        echo "⚠️  Android folder not found in template"
    fi
    echo ""

    # Clean up
    echo "🧹 Cleaning up temporary files..."
    rm -rf "$TEMP_DIR"
    echo "✅ Cleanup complete"
    echo ""
fi

# Install iOS pods if on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    if command -v pod &> /dev/null; then
        echo "📦 Installing iOS CocoaPods dependencies..."
        cd ios
        pod install
        cd ..
        echo "✅ iOS dependencies installed"
        echo ""
    else
        echo "⚠️  CocoaPods not found. Install it with: sudo gem install cocoapods"
        echo "Then run: cd ios && pod install"
        echo ""
    fi
else
    echo "ℹ️  Skipping iOS setup (not on macOS)"
    echo ""
fi

echo "✅ Native project setup complete!"
echo ""
echo "📱 Next steps:"
echo ""
echo "For iOS (macOS only):"
echo "  npm run ios"
echo ""
echo "For Android:"
echo "  npm run android"
echo ""
echo "To open in IDE:"
echo "  - iOS: open ios/BuildDeskMobile.xcworkspace"
echo "  - Android: open android/ in Android Studio"
echo ""
echo "Happy coding! 🎉"
