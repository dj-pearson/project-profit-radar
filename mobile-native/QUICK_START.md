# BuildDesk Mobile - Quick Start Guide

## For Developers Who Want to Get Started FAST

### Option 1: Use React Native CLI (Recommended)

This is the **fastest and most reliable** method to generate the native projects:

```bash
# 1. Make sure you're in the mobile-native directory
cd mobile-native

# 2. Use React Native CLI to create a temporary template project
npx @react-native-community/cli@latest init TempProject --skip-install

# 3. Copy only the native folders
cp -r TempProject/ios ./
cp -r TempProject/android ./

# 4. Delete the temporary project
rm -rf TempProject

# 5. Update the iOS project name
# Open ios/TempProject.xcodeproj/project.pbxproj and replace "TempProject" with "BuildDeskMobile"
# Or use sed:
find ios -type f -name "*.pbxproj" -exec sed -i '' 's/TempProject/BuildDeskMobile/g' {} +
find ios -type f -name "*.plist" -exec sed -i '' 's/TempProject/BuildDeskMobile/g' {} +
mv ios/TempProject ios/BuildDeskMobile 2>/dev/null || true
mv ios/TempProject.xcodeproj ios/BuildDeskMobile.xcodeproj 2>/dev/null || true
mv ios/TempProject.xcworkspace ios/BuildDeskMobile.xcworkspace 2>/dev/null || true
mv ios/TempProjectTests ios/BuildDeskMobileTests 2>/dev/null || true

# 6. Update the Android package name
find android -type f \( -name "*.gradle" -o -name "*.xml" -o -name "*.java" \) -exec sed -i '' 's/com.tempproject/com.builddeskmo bile/g' {} +

# 7. Install iOS dependencies
cd ios && pod install && cd ..

# 8. Run the app!
npm run ios  # For iOS
npm run android  # For Android
```

### Option 2: Use Included Script (Linux/Mac)

```bash
cd mobile-native
./setup-native-projects.sh
```

### Option 3: Manual Setup (If Both Above Fail)

If the automated methods don't work, you'll need to:

1. **Install Xcode** (Mac only) - for iOS
2. **Install Android Studio** - for Android
3. Use React Native CLI on your local machine to create a new project
4. Copy the `ios/` and `android/` folders to this directory

## Testing the App

### Test on iOS Simulator

```bash
npm run ios
```

### Test on Android Emulator

1. Open Android Studio
2. Start an AVD (Android Virtual Device)
3. Run:
```bash
npm run android
```

### Test on Physical Device

**iOS:**
```bash
# List available devices
xcrun simctl list devices

# Run on connected iPhone
npx react-native run-ios --device "Your iPhone Name"
```

**Android:**
```bash
# Enable USB debugging on your Android phone
# Connect via USB
adb devices  # Verify device is connected
npm run android
```

## Build for App Stores

### iOS - TestFlight / App Store

```bash
# 1. Open in Xcode
open ios/BuildDeskMobile.xcworkspace

# 2. In Xcode:
#    - Select "Any iOS Device"
#    - Product → Archive
#    - Upload to App Store Connect
```

### Android - Google Play

```bash
# 1. Generate signing key (one-time)
keytool -genkeypair -v -keystore android/app/builddesk-release.keystore \
  -alias builddesk -keyalg RSA -keysize 2048 -validity 10000

# 2. Build the release AAB
cd android
./gradlew bundleRelease

# 3. Upload to Google Play Console
# File is at: android/app/build/outputs/bundle/release/app-release.aab
```

## Common Issues & Fixes

### "Command not found: react-native"

```bash
npm install -g react-native-cli
```

### "Pod install failed" (iOS)

```bash
cd ios
pod deintegrate
pod cache clean --all
pod install
cd ..
```

### "Could not find tools.jar" (Android)

Make sure you have JDK 17 installed:
```bash
java -version
```

### Metro Bundler Connection Issues

```bash
npx react-native start --reset-cache
```

## Default Test Credentials

Use your existing BuildDesk credentials from the web app. The mobile app uses the same Supabase backend.

## File Structure

```
mobile-native/
├── App.js                    ← Main app component
├── index.js                  ← Entry point
├── src/
│   ├── screens/             ← All screens
│   │   ├── LoginScreen.js
│   │   ├── DashboardScreen.js
│   │   ├── ProjectsScreen.js
│   │   ├── TimeTrackingScreen.js
│   │   └── ProfileScreen.js
│   ├── navigation/
│   │   └── AppNavigator.js  ← Navigation setup
│   ├── contexts/
│   │   └── AuthContext.js   ← Authentication state
│   └── services/
│       └── supabase.js      ← API client
├── ios/                     ← iOS native project
└── android/                 ← Android native project
```

## Need Help?

1. Check the full README.md in this folder
2. Review React Native docs: https://reactnative.dev
3. Check issues in the main project repository

---

**This mobile build is 100% independent** from your Capacitor/Expo builds. You can develop and deploy both simultaneously without conflicts.
