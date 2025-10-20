# Expo Commands Quick Reference

## 🚀 Essential Commands

### Building

```bash
# iOS Production Build
eas build --platform ios --profile production --non-interactive

# Android Production Build  
eas build --platform android --profile production --non-interactive

# Both Platforms
eas build --platform all --profile production --non-interactive

# Preview Build (internal testing)
eas build --platform ios --profile preview

# Development Build
eas build --platform ios --profile development
```

### Submitting to Stores

```bash
# Submit to App Store
eas submit --platform ios --profile production

# Submit to Google Play
eas submit --platform android --profile production

# Submit latest build
eas submit --platform ios --latest
```

### Development

```bash
# Start Expo dev server
npx expo start

# Start on specific platform
npx expo start --ios
npx expo start --android
npx expo start --web

# Start with cleared cache
npx expo start --clear

# Start on specific port
npx expo start --port 8082
```

### Dependency Management

```bash
# Install Expo-compatible packages
npx expo install <package-name>

# Check for version mismatches
npx expo install --check

# Auto-fix version mismatches
npx expo install --fix

# Install with legacy peer deps
npm install --legacy-peer-deps
```

### Configuration & Validation

```bash
# View current configuration
npx expo config

# View public configuration only
npx expo config --type public

# View as JSON (useful for debugging)
npx expo config --json

# Validate configuration
npx expo config --json --type introspect
```

### Debugging & Diagnostics

```bash
# Export bundle (test without building)
npx expo export

# Export for specific platform
npx expo export --platform ios

# View project information
eas project:info

# View build list
eas build:list

# View specific build details
eas build:view <build-id>

# View build logs
eas build:view <build-id> --json
```

### Credentials Management

```bash
# Configure credentials interactively
eas credentials

# View iOS credentials
eas credentials --platform ios

# View Android credentials
eas credentials --platform android

# Remove credentials (reset)
eas credentials --platform ios --remove
```

### Updates (OTA)

```bash
# Configure EAS Update
eas update:configure

# Publish an update
eas update --branch production --message "Bug fixes"

# View updates
eas update:list

# Rollback an update
eas update:rollback
```

## 🔧 Maintenance Commands

```bash
# Update Expo CLI
npm install -g @expo/cli@latest

# Update EAS CLI
npm install -g eas-cli@latest

# Update all Expo packages to latest compatible versions
npx expo install --fix

# Clean install (if things break)
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

## 📊 Status & Information

```bash
# Check account status
eas whoami

# View account builds
eas build:list --distribution store

# Check build status
eas build:view

# View project settings
eas project:info

# View build queue
eas build:list --status in-queue
```

## 🧪 Testing & Preview

```bash
# Run on iOS simulator
npx expo run:ios

# Run on Android emulator
npx expo run:android

# Install on device via QR code
npx expo start --tunnel

# Generate native projects (for inspection)
npx expo prebuild
```

## 🛠️ Troubleshooting Commands

```bash
# Clear Metro bundler cache
npx expo start --clear

# Reset Expo cache
rm -rf .expo

# Clear all caches
npx expo start --clear && rm -rf .expo

# Reinstall dependencies
rm -rf node_modules && npm install --legacy-peer-deps

# Check for outdated packages
npm outdated

# Verify installation
npx expo-doctor

# Check bundle
npx expo export --dump-sourcemap
```

## 📱 Device Testing

```bash
# List connected iOS devices
xcrun xctrace list devices

# List connected Android devices
adb devices

# Install IPA on device
# (Download IPA from build, then drag to Xcode Devices window)

# Install APK on Android
adb install path/to/app.apk
```

## 🔐 Environment Variables

```bash
# Set in eas.json
{
  "build": {
    "production": {
      "env": {
        "API_URL": "https://api.production.com"
      }
    }
  }
}

# View current environment
eas env:list

# Add secret
eas secret:create

# View secrets
eas secret:list
```

## 📦 Build Profiles

```bash
# Use specific profile
eas build --profile preview

# Common profiles:
# - development: Local development builds
# - preview: Internal testing
# - production: App Store/Play Store
# - production-ios: iOS-specific production
# - production-android: Android-specific production
```

## 🎯 Common Workflows

### First-time Setup
```bash
# 1. Initialize EAS
eas init --id <project-id>

# 2. Configure build
eas build:configure

# 3. Configure updates (optional)
eas update:configure

# 4. First build
eas build --platform ios --profile production
```

### Regular Update Cycle
```bash
# 1. Make changes
# ... edit code ...

# 2. Test locally
npx expo start

# 3. Build preview
eas build --platform ios --profile preview

# 4. Test preview, then build production
eas build --platform ios --profile production --non-interactive

# 5. Submit
eas submit --platform ios --latest
```

### Emergency Fix
```bash
# 1. Make fix
# ... fix bug ...

# 2. Quick test
npx expo start

# 3. Build immediately
eas build --platform all --profile production --non-interactive

# 4. Or publish OTA update (faster)
eas update --branch production --message "Critical fix"
```

## 💡 Pro Tips

```bash
# Build both platforms simultaneously
eas build --platform all --profile production --non-interactive

# Watch build in real-time
eas build --platform ios --profile production --wait

# Submit immediately after build
eas build --platform ios --profile production --auto-submit

# Use build number auto-increment
# (Set in app.config.js)
ios: {
  buildNumber: process.env.BUILD_NUMBER || '1'
}

# Chain commands
npx expo install --fix && eas build --platform ios --profile production --non-interactive
```

## 🆘 When Things Break

```bash
# Nuclear option (complete reset)
rm -rf node_modules package-lock.json .expo ios android
npm install --legacy-peer-deps
npx expo prebuild --clean
eas build --platform ios --profile production --clear-cache
```

---

## 📚 Documentation Links

- **Expo Docs:** https://docs.expo.dev
- **EAS Build:** https://docs.expo.dev/build/introduction/
- **EAS Submit:** https://docs.expo.dev/submit/introduction/
- **EAS Update:** https://docs.expo.dev/eas-update/introduction/
- **Expo Router:** https://docs.expo.dev/router/introduction/

---

**Bookmark this file for quick reference during development!** 🔖

