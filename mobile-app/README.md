# BuildDesk Mobile App

Native iOS and Android mobile application built with Expo and React Native.

## 🏗️ Architecture

This mobile app is **completely isolated** from the web build to ensure:
- ✅ No build contamination between web and mobile
- ✅ Independent dependency management
- ✅ Native Swift (iOS) and Kotlin (Android) modules
- ✅ Cloud builds via EAS (no Mac required for development)
- ✅ Optimized for construction field work

## 📂 Project Structure

```
mobile-app/
├── src/
│   ├── app/                    # Expo Router screens (file-based routing)
│   │   ├── _layout.tsx         # Root layout with providers
│   │   ├── index.tsx           # Entry point (redirects based on auth)
│   │   ├── auth.tsx            # Authentication screen
│   │   └── (tabs)/             # Tab-based navigation
│   │       ├── _layout.tsx     # Tab layout
│   │       ├── dashboard.tsx   # Dashboard screen
│   │       ├── projects.tsx    # Projects screen
│   │       ├── field.tsx       # Field operations screen
│   │       ├── time.tsx        # Time tracking screen
│   │       └── more.tsx        # More features hub
│   ├── components/             # Reusable React Native components
│   ├── contexts/               # React contexts (Auth, Theme, Navigation)
│   ├── hooks/                  # Custom React hooks
│   ├── services/               # API services (Supabase client)
│   ├── utils/                  # Utility functions
│   └── types/                  # TypeScript type definitions
├── ios/
│   └── modules/                # Native Swift modules
│       ├── CameraModule.swift
│       ├── LocationModule.swift
│       └── BiometricModule.swift
├── android/
│   └── app/src/main/java/com/builddesk/modules/
│       ├── CameraModule.kt
│       ├── LocationModule.kt
│       └── BiometricModule.kt
├── assets/                     # App icons, splash screens, images
├── app.json                    # Expo configuration
├── eas.json                    # EAS Build configuration
├── package.json                # Mobile app dependencies (isolated)
├── tsconfig.json               # TypeScript configuration
├── metro.config.js             # Metro bundler configuration
└── babel.config.js             # Babel configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Expo CLI (installed globally or via npx)
- EAS CLI (for cloud builds)
- iOS Simulator (Mac) or Android Emulator

### Installation

From the **root** of the repository:

```bash
# Install mobile app dependencies
npm run mobile:install
```

Or from the **mobile-app** directory:

```bash
cd mobile-app
npm install
```

### Development

#### Start Expo Development Server

```bash
# From root
npm run mobile:start

# Or from mobile-app/
npm start
```

This opens the Expo Developer Tools. You can then:
- Press `i` to open iOS Simulator
- Press `a` to open Android Emulator
- Scan QR code with Expo Go app (for testing without prebuild)

#### Run on iOS Simulator

```bash
# From root
npm run mobile:ios

# Or from mobile-app/
npm run ios
```

#### Run on Android Emulator

```bash
# From root
npm run mobile:android

# Or from mobile-app/
npm run android
```

## 🏗️ Building Native Apps

### Prebuild (Generate Native Projects)

Before building, you need to generate the native iOS and Android projects:

```bash
# From root
npm run mobile:prebuild

# Or from mobile-app/
npm run prebuild
```

This creates `ios/` and `android/` directories with Xcode and Android Studio projects.

### Cloud Builds (EAS Build) - Recommended

**Advantages:**
- No Mac required for iOS builds
- Consistent build environment
- Handles code signing
- Parallel builds for iOS and Android

```bash
# Development builds (with Expo dev client)
npm run mobile:build:dev:ios
npm run mobile:build:dev:android

# Preview builds (for internal testing)
npm run mobile:build:preview:ios
npm run mobile:build:preview:android

# Production builds (for App Store/Play Store)
npm run mobile:build:prod:ios
npm run mobile:build:prod:android
```

### Local Builds (Advanced)

**iOS** (requires Mac with Xcode):
```bash
cd mobile-app/ios
pod install
open BuildDesk.xcworkspace
# Build in Xcode
```

**Android**:
```bash
cd mobile-app/android
./gradlew assembleRelease
```

## 📱 Native Modules

### Custom Native Modules

We've created custom native modules for platform-specific features:

#### Camera Module
- `checkCameraPermission()` - Check camera permission status
- `requestCameraPermission()` - Request camera access
- `checkPhotoLibraryPermission()` - Check photo library access
- `getCameraFeatures()` - Get device camera capabilities

#### Location Module
- `checkLocationPermission()` - Check location permission status
- `requestLocationPermission(type)` - Request location access (whenInUse/always)
- `getCurrentPosition()` - Get current GPS coordinates
- `isLocationEnabled()` - Check if location services are enabled
- `getLocationAccuracy()` - Get current permission level

#### Biometric Module
- `isAvailable()` - Check if biometric auth is available
- `authenticate(reason)` - Authenticate with Face ID/Touch ID
- `authenticateWithFallback(reason)` - Authenticate with fallback to passcode
- `getSupportedAuthentications()` - Get supported auth types

### Using Native Modules

```typescript
import { NativeModules } from 'react-native';

const { Camera, Location, Biometric } = NativeModules;

// Example: Check camera permission
const cameraPermission = await Camera.checkCameraPermission();

// Example: Get current location
const position = await Location.getCurrentPosition();

// Example: Authenticate with biometrics
const result = await Biometric.authenticate('Sign in to BuildDesk');
```

## 🎨 Navigation Structure

The app uses **Expo Router** (file-based routing) with a tab-based navigation:

### Main Tabs:
1. **Dashboard** - Overview, stats, quick actions, recent activity
2. **Projects** - Project list, search, filtering, quick actions
3. **Field** - Field operations (camera, daily reports, safety, weather)
4. **Time** - Time tracking, clock in/out, timesheet entries
5. **More** - Hub for additional features (Financial, Operations, Communication, Tools, Settings)

### Navigation Features:
- **Bottom Tab Bar** - Always visible, 5 main sections
- **Collapsible Categories** - "More" tab groups features by domain
- **Swipe Gestures** - Natural mobile navigation
- **Deep Linking** - Support for `builddesk://` URLs
- **Push Notifications** - Navigate to specific screens

## 🔐 Authentication

Uses **Supabase Auth** with:
- Email/password authentication
- Secure token storage (Expo SecureStore)
- Automatic session refresh
- Biometric login (Face ID/Touch ID) - coming soon

## 🎨 Theming

Supports **light** and **dark** modes:
- Auto-detect system theme
- Manual theme selection
- Persistent theme preference
- All screens optimized for both modes

## 📦 App Configuration

### app.json

Key configuration:
- **Bundle ID**: `com.builddesk.app`
- **App Name**: BuildDesk
- **Version**: 1.0.0
- **Scheme**: `builddesk://`
- **Permissions**: Camera, Location (always), Biometric, Photos, etc.

### Environment Variables

Create a `.env` file in `mobile-app/`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 🚢 Deployment

### iOS App Store

1. **Build Production App**:
   ```bash
   npm run mobile:build:prod:ios
   ```

2. **Submit to App Store**:
   ```bash
   npm run mobile:submit:ios
   ```

3. **Configure in EAS**:
   - Apple ID credentials in eas.json
   - App Store Connect app ID
   - Apple Team ID

### Google Play Store

1. **Build Production App**:
   ```bash
   npm run mobile:build:prod:android
   ```

2. **Submit to Play Store**:
   ```bash
   npm run mobile:submit:android
   ```

3. **Configure in EAS**:
   - Service account JSON
   - Upload key/keystore
   - Track (internal/beta/production)

## 🧪 Testing

### Run Tests
```bash
npm run test
```

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
```

## 📊 Performance

### Optimizations:
- **React Native Reanimated** - 60 FPS animations on UI thread
- **React Native Gesture Handler** - Native touch handling
- **Expo Image** - Fast image loading with caching
- **Lazy Loading** - Routes loaded on demand
- **Code Splitting** - Manual chunks for optimal caching

### Monitoring:
- **Error Tracking**: Sentry (configure in app.json)
- **Analytics**: PostHog or similar
- **Performance**: Expo Developer Tools

## 🔧 Troubleshooting

### iOS Build Issues

**Problem**: "No bundle URL present"
**Solution**:
```bash
npm run mobile:prebuild:clean
npm run mobile:ios
```

**Problem**: "CocoaPods not installed"
**Solution**:
```bash
sudo gem install cocoapods
cd mobile-app/ios && pod install
```

### Android Build Issues

**Problem**: "SDK location not found"
**Solution**: Create `local.properties`:
```properties
sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk
```

**Problem**: "Gradle build failed"
**Solution**:
```bash
cd mobile-app/android
./gradlew clean
./gradlew assembleDebug
```

### General Issues

**Problem**: "Module not found"
**Solution**:
```bash
cd mobile-app
rm -rf node_modules
npm install
```

**Problem**: "Metro bundler cache issues"
**Solution**:
```bash
npx expo start --clear
```

## 📚 Resources

- [Expo Documentation](https://docs.expo.dev)
- [React Native Documentation](https://reactnative.dev)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [Supabase React Native](https://supabase.com/docs/guides/getting-started/tutorials/with-react-native)

## 🆘 Support

For issues with:
- **Mobile app**: File issue in GitHub repository
- **Web app**: Separate issue (web build is isolated)
- **EAS builds**: Check [Expo Status](https://status.expo.dev)
- **Supabase**: Check [Supabase Status](https://status.supabase.com)

## 📝 Development Workflow

1. **Make changes** in `mobile-app/src/`
2. **Test in simulator** with `npm run mobile:ios` or `npm run mobile:android`
3. **Build preview** with EAS for device testing
4. **Submit** to app stores when ready

## 🔄 Syncing with Web Codebase

The mobile app is **intentionally isolated** from the web codebase. However, you can share:

- **Types**: Copy type definitions from `../src/types/` if needed
- **API logic**: Supabase queries can be similar
- **Utils**: Pure functions can be shared

**Do NOT**:
- Import web components into mobile
- Import React Router into mobile (use Expo Router)
- Mix build configurations

---

**Built with ❤️ for construction professionals**
