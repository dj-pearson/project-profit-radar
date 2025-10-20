# BuildDesk Mobile Development Guide

## Overview

BuildDesk is now configured for cross-platform mobile development using Expo and React Native. This guide covers the complete mobile development setup, architecture, and deployment process.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm 9+
- Expo CLI (`npm install -g @expo/cli`)
- EAS CLI (`npm install -g eas-cli`)
- Docker Desktop (for local builds)

### Development Commands

```bash
# Start Expo development server
npm run expo:start

# Start with specific platform
npm run expo:web      # Web development
npm run expo:ios      # iOS simulator
npm run expo:android  # Android emulator

# Build for production
npm run expo:build:ios      # iOS build
npm run expo:build:android  # Android build

# Submit to app stores
npm run expo:submit:ios      # Submit to App Store
npm run expo:submit:android  # Submit to Google Play
```

## 📱 Project Structure

```
project-profit-radar/
├── app/                          # Expo Router pages
│   ├── _layout.tsx              # Root layout with providers
│   ├── index.tsx                # Home/Landing screen
│   ├── auth.tsx                 # Authentication screen
│   ├── dashboard.tsx            # Main dashboard
│   ├── field.tsx                # Field management
│   └── projects.tsx             # Projects list
├── src/
│   ├── mobile/                  # Mobile-specific code
│   │   ├── contexts/           # Mobile context providers
│   │   │   ├── MobileThemeContext.tsx
│   │   │   └── MobileNavigationContext.tsx
│   │   ├── components/         # Mobile UI components
│   │   └── utils/              # Mobile utilities
│   │       └── platform.ts     # Platform detection & styling
│   ├── contexts/               # Shared contexts (work on mobile too)
│   ├── components/             # Shared components
│   └── services/               # API services
├── app.config.js               # Expo configuration
├── eas.json                    # EAS Build configuration
└── metro.config.js             # Metro bundler configuration
```

## 🔧 Configuration Files

### app.config.js
- **Purpose**: Main Expo configuration
- **Key Features**:
  - App metadata (name, version, icons)
  - Platform-specific settings (iOS/Android)
  - Permissions and capabilities
  - Plugin configuration
  - EAS project ID integration

### eas.json
- **Purpose**: EAS Build and Submit configuration
- **Build Profiles**:
  - `development`: Development builds with Expo Dev Client
  - `preview`: Internal testing builds
  - `production`: App store ready builds

### metro.config.js
- **Purpose**: Metro bundler configuration
- **Features**:
  - TypeScript/JSX support
  - Web platform compatibility
  - Path aliases (`@` → `./src`)
  - NativeWind integration

## 📋 Mobile App Features

### 🏠 Home Screen (`app/index.tsx`)
- **Features**:
  - Branded landing page with gradient background
  - Feature highlights with icons
  - Conditional navigation (authenticated vs. guest)
  - Responsive design for all screen sizes

### 🔐 Authentication (`app/auth.tsx`)
- **Features**:
  - Sign in/Sign up toggle
  - Email/password authentication
  - Form validation and error handling
  - Keyboard-aware scrolling
  - Loading states and feedback

### 📊 Dashboard (`app/dashboard.tsx`)
- **Features**:
  - Welcome message with user profile
  - Quick stats cards (projects, budget, progress)
  - Navigation grid to main features
  - Recent activity feed
  - Responsive card layout

### 🏗️ Field Management (`app/field.tsx`)
- **Features**:
  - GPS location tracking
  - Camera integration for site photos
  - Voice notes and text annotations
  - Quick action buttons
  - Weather conditions display
  - Task management
  - Safety reporting (coming soon)

### 📋 Projects (`app/projects.tsx`)
- **Features**:
  - Project list with search and filtering
  - Progress tracking with visual indicators
  - Budget vs. actual cost display
  - Status badges and timeline info
  - Pull-to-refresh functionality
  - Floating action button for new projects

## 🎨 Mobile Design System

### Theme System
The mobile app uses a comprehensive theme system with:
- **Light/Dark mode support** with system preference detection
- **Persistent theme storage** using AsyncStorage
- **Consistent color palette** across all screens
- **Typography scale** optimized for mobile readability

### Platform Utilities (`src/mobile/utils/platform.ts`)
```typescript
// Platform detection
isWeb, isIOS, isAndroid, isMobile

// Responsive sizing
getResponsiveSize(size: number)
isTablet()

// Design tokens
colors, spacing, typography, shadowStyle
```

### Navigation Context
Custom navigation wrapper around Expo Router:
- **Route state management**
- **Back button handling**
- **Navigation history tracking**
- **Deep linking support**

## 🔌 Native Capabilities

### Permissions Configured
- **Camera**: Site photography and documentation
- **Location**: GPS tracking for field management
- **Photo Library**: Image selection and storage
- **Microphone**: Voice notes and communication

### Native Features
- **Camera Integration**: `expo-camera` for photo capture
- **Location Services**: `expo-location` for GPS tracking
- **File System**: `expo-file-system` for local storage
- **Device Info**: `expo-device` for device capabilities

## 🚀 Development Workflow

### 1. Local Development
```bash
# Start development server
npm run expo:start

# Open in simulator/emulator
# Press 'i' for iOS simulator
# Press 'a' for Android emulator
# Press 'w' for web browser
```

### 2. Testing on Physical Devices
- Install **Expo Go** app from App Store/Google Play
- Scan QR code from development server
- Live reload and hot refresh enabled

### 3. Development Builds
```bash
# Create development build
eas build --profile development --platform ios
eas build --profile development --platform android

# Install on device for testing native features
```

## 📦 Build & Deployment

### EAS Build Configuration

#### Development Builds
- **Purpose**: Testing native features during development
- **Features**: Expo Dev Client, debugging tools
- **Distribution**: Internal testing only

#### Preview Builds
- **Purpose**: Internal testing and QA
- **Features**: Production-like but with debugging
- **Distribution**: TestFlight (iOS) / Internal App Sharing (Android)

#### Production Builds
- **Purpose**: App store submission
- **Features**: Optimized, minified, production-ready
- **Distribution**: App Store / Google Play Store

### Build Commands
```bash
# Build for specific platform and profile
eas build --platform ios --profile production
eas build --platform android --profile preview

# Build for all platforms
eas build --platform all --profile production
```

### Submission to App Stores
```bash
# Submit to App Store
eas submit --platform ios

# Submit to Google Play
eas submit --platform android
```

## 🔧 Environment Configuration

### Environment Variables
Create `.env` files for different environments:

```bash
# .env.development
EXPO_PUBLIC_SUPABASE_URL=your_dev_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_dev_anon_key

# .env.production
EXPO_PUBLIC_SUPABASE_URL=your_prod_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_prod_anon_key
```

### App Store Configuration

#### iOS (App Store Connect)
- **Bundle ID**: `com.builddesk.app`
- **App Name**: BuildDesk
- **Categories**: Business, Productivity
- **Age Rating**: 4+ (Business apps)

#### Android (Google Play Console)
- **Package Name**: `com.builddesk.app`
- **App Name**: BuildDesk
- **Category**: Business
- **Content Rating**: Everyone

## 🧪 Testing Strategy

### Unit Testing
```bash
# Run tests
npm test

# Watch mode
npm test -- --watch
```

### E2E Testing
```bash
# Install Detox (for React Native E2E)
npm install -g detox-cli

# Run E2E tests
detox test
```

### Device Testing Checklist
- [ ] Authentication flow
- [ ] Camera permissions and functionality
- [ ] Location services
- [ ] Offline data sync
- [ ] Push notifications
- [ ] Deep linking
- [ ] Performance on low-end devices

## 🔍 Debugging

### Expo Dev Tools
- **Metro bundler**: Real-time bundling and error reporting
- **Device logs**: Console output from connected devices
- **Network inspector**: API call monitoring
- **Performance monitor**: FPS and memory usage

### React Native Debugger
```bash
# Install React Native Debugger
npm install -g react-native-debugger

# Use with Expo
# Enable "Debug with Chrome" in Expo menu
```

### Common Issues & Solutions

#### Metro bundler issues
```bash
# Clear Metro cache
npx expo start --clear

# Reset npm cache
npm start -- --reset-cache
```

#### Build failures
```bash
# Clear EAS build cache
eas build --clear-cache

# Check build logs in EAS dashboard
```

## 📈 Performance Optimization

### Bundle Size Optimization
- **Code splitting**: Lazy load screens and components
- **Tree shaking**: Remove unused code
- **Image optimization**: Use WebP format, appropriate sizes
- **Font optimization**: Subset fonts, use system fonts when possible

### Runtime Performance
- **FlatList**: Use for large lists instead of ScrollView
- **Image caching**: Implement proper image caching
- **Memory management**: Avoid memory leaks in listeners
- **Navigation optimization**: Preload critical screens

### Monitoring
```bash
# Bundle analyzer
npx expo export --dump-assetmap

# Performance profiling
# Use Flipper or React DevTools Profiler
```

## 🔐 Security Considerations

### API Security
- **Environment variables**: Never commit sensitive keys
- **Certificate pinning**: Implement for production API calls
- **Token storage**: Use secure storage for auth tokens

### App Security
- **Code obfuscation**: Enable in production builds
- **Root/jailbreak detection**: Implement security checks
- **Biometric authentication**: Add fingerprint/face ID support

## 🚀 Next Steps

### Immediate Tasks
1. **Test on physical devices** - Install Expo Go and test core functionality
2. **Configure push notifications** - Set up Firebase/APNs
3. **Implement offline sync** - Add local storage and sync logic
4. **Add biometric auth** - Fingerprint/Face ID integration

### Future Enhancements
1. **Advanced camera features** - AR markup, document scanning
2. **Voice commands** - Speech-to-text integration
3. **Geofencing** - Automatic check-in/out based on location
4. **Apple Watch/Wear OS** - Companion apps for field workers
5. **Tablet optimization** - Enhanced UI for larger screens

## 📚 Resources

### Documentation
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)

### Community
- [Expo Discord](https://chat.expo.dev/)
- [React Native Community](https://reactnative.dev/community/overview)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/expo)

---

## 🎯 Current Status

✅ **Completed**:
- EAS CLI initialization with project ID
- Expo app configuration and routing
- Mobile-specific context providers
- Core mobile screens (Home, Auth, Dashboard, Field, Projects)
- Metro bundler configuration
- Development scripts and workflow

🔄 **In Progress**:
- Testing Expo development server
- Physical device testing

⏳ **Pending**:
- Native permissions configuration
- EAS Build setup for iOS/Android
- App store submission preparation

Your BuildDesk mobile app is now ready for development and testing! 🚀
