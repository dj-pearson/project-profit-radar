# BuildDesk Mobile Native

This is a **pure JavaScript** React Native mobile application built separately from the main web app. It provides a stable, crash-free iOS and Android experience for app store deployment.

## Why This Separate Build?

- **100% JavaScript** - No TypeScript compilation issues
- **Native iOS/Android projects** - Full control over native code for debugging
- **Independent from Capacitor/Expo** - Won't interfere with your existing mobile builds
- **App Store ready** - Optimized for production deployment

## Project Structure

```
mobile-native/
├── src/
│   ├── screens/          # App screens (Login, Dashboard, Projects, etc.)
│   ├── navigation/       # React Navigation setup
│   ├── contexts/         # React contexts (Auth)
│   ├── services/         # Supabase client and API services
│   ├── components/       # Reusable UI components
│   └── utils/            # Utility functions
├── ios/                  # Native iOS project (generated)
├── android/              # Native Android project (generated)
├── App.js                # Main app component
├── index.js              # Entry point
└── package.json          # Dependencies
```

## Setup Instructions

### Prerequisites

**For iOS Development:**
- macOS with Xcode 15 or later
- CocoaPods installed (`sudo gem install cocoapods`)
- iOS Simulator or physical iPhone

**For Android Development:**
- Java JDK 17 or later
- Android Studio with Android SDK
- Android Emulator or physical device

### Step 1: Generate Native Projects

Run this command from the `mobile-native` directory:

```bash
npx @react-native-community/cli init BuildDeskMobile --skip-install --directory temp-template
```

Then copy the native projects:

```bash
# Copy iOS project
cp -r temp-template/ios ./

# Copy Android project
cp -r temp-template/android ./

# Clean up
rm -rf temp-template
```

**OR** use the automated script (recommended):

```bash
# On macOS/Linux
./generate-native-projects.sh

# On Windows (Git Bash or WSL)
bash generate-native-projects.sh
```

### Step 2: Install iOS Dependencies

```bash
cd ios
pod install
cd ..
```

### Step 3: Run the App

**iOS:**
```bash
npm run ios

# Or with specific device
npx react-native run-ios --device "iPhone 15 Pro"
```

**Android:**
```bash
npm run android

# Or build release
npm run build:android
```

## Key Features Implemented

### ✅ Authentication
- Login with Supabase Auth
- Session management
- Auto-refresh tokens
- Persistent login

### ✅ Dashboard
- Project statistics
- Today's hours
- Recent projects
- Quick actions

### ✅ Projects Management
- View all projects
- Search functionality
- Project details
- Status indicators

### ✅ Time Tracking
- Clock in/out
- GPS location (ready for implementation)
- Today's summary
- Time entry history

### ✅ Profile
- User information
- App settings
- Sign out

## Native Modules Configuration

### Camera (iOS)

Add to `ios/BuildDeskMobile/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>BuildDesk needs camera access to capture job site photos</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>BuildDesk needs photo library access to attach images</string>
```

### Location Services (iOS)

Add to `ios/BuildDeskMobile/Info.plist`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>BuildDesk needs your location for time tracking and job sites</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>BuildDesk needs your location for accurate time tracking</string>
```

### Camera & Location (Android)

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

## Building for Production

### iOS App Store Build

1. Open `ios/BuildDeskMobile.xcworkspace` in Xcode
2. Select "Any iOS Device (arm64)" as the destination
3. Product → Archive
4. Upload to App Store Connect
5. Submit for review

**Or use command line:**

```bash
cd ios
xcodebuild -workspace BuildDeskMobile.xcworkspace \
  -scheme BuildDeskMobile \
  -configuration Release \
  -archivePath build/BuildDeskMobile.xcarchive \
  archive
```

### Android Play Store Build

1. Generate signing key:

```bash
cd android/app
keytool -genkeypair -v -keystore builddesk-release.keystore \
  -alias builddesk -keyalg RSA -keysize 2048 -validity 10000
```

2. Update `android/gradle.properties`:

```properties
BUILDDESK_RELEASE_STORE_FILE=builddesk-release.keystore
BUILDDESK_RELEASE_KEY_ALIAS=builddesk
BUILDDESK_RELEASE_STORE_PASSWORD=your_password
BUILDDESK_RELEASE_KEY_PASSWORD=your_password
```

3. Update `android/app/build.gradle`:

```gradle
android {
    signingConfigs {
        release {
            storeFile file('builddesk-release.keystore')
            storePassword BUILDDESK_RELEASE_STORE_PASSWORD
            keyAlias BUILDDESK_RELEASE_KEY_ALIAS
            keyPassword BUILDDESK_RELEASE_KEY_PASSWORD
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

4. Build the AAB:

```bash
cd android
./gradlew bundleRelease
```

The bundle will be at: `android/app/build/outputs/bundle/release/app-release.aab`

## API Configuration

The app uses your existing Supabase backend:

**File:** `src/services/supabase.js`

```javascript
const supabaseUrl = 'https://ilhzuvemiuyfuxfegtlv.supabase.co';
const supabaseAnonKey = 'your-anon-key-here';
```

No changes needed - it's already configured to match your web app.

## Troubleshooting

### iOS Build Fails

1. Clean build folder:
```bash
cd ios
rm -rf build
pod deintegrate
pod install
```

2. Reset CocoaPods cache:
```bash
pod cache clean --all
```

### Android Build Fails

1. Clean Gradle cache:
```bash
cd android
./gradlew clean
./gradlew --stop
```

2. Clear Gradle cache:
```bash
rm -rf ~/.gradle/caches/
```

### Metro Bundler Issues

```bash
npx react-native start --reset-cache
```

## Next Steps

### To Add GPS Time Tracking

1. Install library:
```bash
npm install react-native-geolocation-service
```

2. Update `src/screens/TimeTrackingScreen.js` to use the library
3. Request permissions on app start

### To Add Camera Support

1. Install library:
```bash
npm install react-native-image-picker
```

2. Add camera functionality to Dashboard and Projects screens
3. Upload to Supabase Storage

### To Add Push Notifications

1. Set up Firebase (Android) and APNS (iOS)
2. Install library:
```bash
npm install @react-native-firebase/app
npm install @react-native-firebase/messaging
```

3. Configure in `src/contexts/AuthContext.js`

## Support

This is a separate native build that won't affect your main web app or existing Capacitor/Expo builds.

For issues:
1. Check the console logs: `npx react-native log-ios` or `npx react-native log-android`
2. Review native logs in Xcode (iOS) or Android Studio (Android)
3. Check Supabase connection in `src/services/supabase.js`

## Version

- **React Native**: 0.76.5
- **React**: 18.3.1
- **React Navigation**: 6.x
- **Supabase**: 2.58.0
