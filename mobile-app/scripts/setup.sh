#!/bin/bash

# BuildDesk Mobile App - Setup Script
# This script sets up the mobile app development environment

set -e

echo "🏗️  BuildDesk Mobile App Setup"
echo "================================"
echo ""

# Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Error: Node.js 18+ required (found: $(node -v))"
  exit 1
fi
echo "✅ Node.js version OK: $(node -v)"
echo ""

# Check npm version
echo "📦 Checking npm version..."
NPM_VERSION=$(npm -v | cut -d'.' -f1)
if [ "$NPM_VERSION" -lt 9 ]; then
  echo "❌ Error: npm 9+ required (found: $(npm -v))"
  exit 1
fi
echo "✅ npm version OK: $(npm -v)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Check for EAS CLI
echo "🔧 Checking for EAS CLI..."
if ! command -v eas &> /dev/null; then
  echo "📦 Installing EAS CLI globally..."
  npm install -g eas-cli
  echo "✅ EAS CLI installed"
else
  echo "✅ EAS CLI already installed: $(eas --version)"
fi
echo ""

# Check for Expo CLI
echo "🔧 Checking for Expo CLI..."
if ! command -v expo &> /dev/null; then
  echo "📦 Installing Expo CLI globally..."
  npm install -g expo-cli
  echo "✅ Expo CLI installed"
else
  echo "✅ Expo CLI already installed"
fi
echo ""

# Create placeholder assets if they don't exist
echo "🎨 Checking assets..."
if [ ! -s "assets/icon.png" ]; then
  echo "⚠️  Warning: assets/icon.png is empty or missing"
  echo "   You'll need to add proper app icons before building"
fi
if [ ! -s "assets/splash.png" ]; then
  echo "⚠️  Warning: assets/splash.png is empty or missing"
  echo "   You'll need to add a splash screen before building"
fi
echo ""

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
  echo "📝 Creating .env file..."
  cat > .env << 'EOL'
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://ilhzuvemiuyfuxfegtlv.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsaHp1dmVtaXV5ZnV4ZmVndGx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5OTU1NzksImV4cCI6MjA1MDU3MTU3OX0.cWiSKcTWJvlRR1K18xgpLQnIzjZd7kMr4rQ82faxDdM

# Optional: Add custom environment variables here
EOL
  echo "✅ .env file created"
else
  echo "✅ .env file exists"
fi
echo ""

echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Add app icons and splash screen to assets/"
echo "  2. Run 'npm start' to start Expo dev server"
echo "  3. Press 'i' for iOS simulator or 'a' for Android emulator"
echo ""
echo "For production builds:"
echo "  npm run build:prod:ios       # Build iOS app"
echo "  npm run build:prod:android   # Build Android app"
echo ""
