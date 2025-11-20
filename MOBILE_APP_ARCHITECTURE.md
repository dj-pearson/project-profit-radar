# BuildDesk Mobile App Architecture

## 🎯 Overview

This document describes the **completely isolated** mobile app architecture implemented for BuildDesk. The mobile app is built with Expo and React Native, with native Swift (iOS) and Kotlin (Android) modules, and is fully separated from the web build.

## 🚨 Important: Build Isolation

### Why Complete Isolation?

Previously, BuildDesk had **three competing mobile implementations**:
1. Capacitor (Android only - iOS missing)
2. Expo (partially configured)
3. Standalone React Native (backup)

This caused:
- ❌ Build conflicts between web and mobile
- ❌ Dependency version mismatches
- ❌ Unclear source of truth
- ❌ Risk of breaking web when adding mobile features

### New Architecture

The new architecture ensures **complete isolation**:

```
project-profit-radar/
├── [Web App] - Vite + React + Cloudflare Pages
│   ├── src/
│   ├── public/
│   ├── vite.config.ts ← Excludes mobile-app/**
│   └── package.json ← Web dependencies
│
└── mobile-app/ - Expo + React Native + EAS Build
    ├── src/
    ├── ios/ ← Native Swift modules
    ├── android/ ← Native Kotlin modules
    ├── package.json ← Mobile dependencies (isolated)
    └── app.json ← Expo configuration
```

## 📦 Directory Structure

### Web App (Root)
```
/
├── src/                      # Web-only source code
├── public/                   # Web-only static assets
├── dist/                     # Web build output
├── vite.config.ts            # Web build config (excludes mobile-app/)
├── package.json              # Web dependencies + mobile scripts
└── [all other web files]
```

### Mobile App (Isolated)
```
mobile-app/
├── src/
│   ├── app/                  # Expo Router (file-based routing)
│   │   ├── _layout.tsx       # Root layout with providers
│   │   ├── index.tsx         # Entry screen
│   │   ├── auth.tsx          # Auth screen
│   │   └── (tabs)/           # Tab navigation
│   │       ├── _layout.tsx
│   │       ├── dashboard.tsx
│   │       ├── projects.tsx
│   │       ├── field.tsx
│   │       ├── time.tsx
│   │       └── more.tsx
│   ├── components/           # Mobile-only components
│   ├── contexts/             # Auth, Theme, Navigation contexts
│   │   ├── AuthContext.tsx
│   │   ├── ThemeContext.tsx
│   │   └── NavigationContext.tsx
│   ├── hooks/                # Custom hooks
│   ├── services/             # API services
│   │   └── supabase.ts       # Supabase client (SecureStore)
│   ├── utils/                # Utilities
│   └── types/                # TypeScript types
├── ios/
│   └── modules/              # Native Swift modules
│       ├── CameraModule.swift
│       ├── LocationModule.swift
│       └── BiometricModule.swift
├── android/
│   └── app/src/main/java/com/builddesk/modules/
│       ├── CameraModule.kt
│       ├── LocationModule.kt
│       └── BiometricModule.kt
├── assets/                   # App icons, splash screens
├── app.json                  # Expo config
├── eas.json                  # EAS Build config
├── package.json              # ISOLATED dependencies
├── tsconfig.json             # TypeScript config
├── metro.config.js           # Metro bundler
├── babel.config.js           # Babel config
└── index.js                  # Entry point
```

## 🔧 Build Configuration

### Web Build (vite.config.ts)

```typescript
export default defineConfig({
  build: {
    // ✅ Excludes mobile-app directory entirely
    exclude: ['mobile-app/**/*'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // Web src only
    },
  },
});
```

**Commands:**
```bash
npm run dev              # Web dev server (port 8080)
npm run build            # Web production build → dist/
npm run build:cloudflare # Cloudflare Pages build
```

### Mobile Build (metro.config.js)

```javascript
module.exports = {
  resolver: {
    alias: {
      '@': path.resolve(__dirname, 'src'), // Mobile src only
    },
    // Excludes web-specific modules
    blacklistRE: /node_modules\/.*\/web\/.*/,
  },
};
```

**Commands:**
```bash
npm run mobile:start     # Expo dev server
npm run mobile:ios       # Run on iOS simulator
npm run mobile:android   # Run on Android emulator

# EAS Cloud Builds
npm run mobile:build:prod:ios       # Production iOS build
npm run mobile:build:prod:android   # Production Android build
```

## 📱 Native Modules

### Swift Modules (iOS)

Located in `mobile-app/ios/modules/`:

#### CameraModule.swift
- Permission checking and requesting
- Camera capabilities detection
- Photo library access

#### LocationModule.swift
- GPS permission management
- Current position retrieval
- Location accuracy levels
- Background location support

#### BiometricModule.swift
- Face ID / Touch ID availability
- Biometric authentication
- Fallback to device passcode
- Supported authentication types

### Kotlin Modules (Android)

Located in `mobile-app/android/app/src/main/java/com/builddesk/modules/`:

#### CameraModule.kt
- Camera permission handling
- Camera2 API for capabilities
- Multi-camera support
- Flash availability

#### LocationModule.kt
- FusedLocationProvider integration
- Runtime permission handling
- Background location (Android 10+)
- GPS and network location

#### BiometricModule.kt
- BiometricPrompt API
- Fingerprint and face recognition
- Device credential fallback
- Biometric hardware detection

## 🎨 Mobile Navigation

### Tab-Based Navigation

**5 Main Tabs:**
1. **Dashboard** - Home screen with stats and quick actions
2. **Projects** - Project management and search
3. **Field** - Field operations (camera, reports, safety)
4. **Time** - Time tracking and clock in/out
5. **More** - Feature hub organized by category

### Categories in "More" Tab

- **Financial**: Invoices, Payments, Expenses, Reports
- **Operations**: Team, Equipment, Inventory, Documents
- **Communication**: Messages, Email, Notifications
- **Tools**: Calculator, Schedule, Weather, Maps
- **Compliance & Safety**: Safety, Compliance, Training
- **Settings**: Account, Preferences, Security, Help

### Navigation Features
- **Persistent bottom tabs** - Always accessible
- **Swipe gestures** - Natural mobile UX
- **Deep linking** - `builddesk://` scheme
- **Push notifications** - Navigate to specific screens
- **Search** - Global search across projects and features

## 🔐 Authentication Flow

```
┌─────────────┐
│   Launch    │
│   App       │
└──────┬──────┘
       │
       ▼
┌─────────────┐     Not           ┌─────────────┐
│ Check Auth  │────Authenticated──▶│  Auth       │
│ State       │                    │  Screen     │
└──────┬──────┘                    └─────────────┘
       │                                  │
       │ Authenticated                    │ Sign In/Up
       │                                  │
       ▼                                  ▼
┌─────────────┐                    ┌─────────────┐
│  Dashboard  │◀───────────────────│  Supabase   │
│  (Tabs)     │                    │  Auth       │
└─────────────┘                    └─────────────┘
```

### Authentication Features
- Supabase Auth integration
- Secure token storage (Expo SecureStore)
- Automatic session refresh
- Biometric login (Face ID/Touch ID) - planned
- Session persistence across app restarts

## 📊 Data Flow

```
┌──────────────┐
│  UI Layer    │  React Native components
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Contexts    │  Auth, Theme, Navigation
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  TanStack    │  Query caching & state management
│  Query       │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Services    │  Supabase client, API calls
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Native      │  Swift/Kotlin modules
│  Modules     │
└──────────────┘
```

## 🚀 Deployment Pipeline

### Development Flow

1. **Local Development**
   ```bash
   npm run mobile:start    # Start Expo dev server
   npm run mobile:ios      # Test on iOS simulator
   npm run mobile:android  # Test on Android emulator
   ```

2. **Preview Build** (Internal Testing)
   ```bash
   npm run mobile:build:preview:ios
   npm run mobile:build:preview:android
   ```
   - Builds on EAS cloud
   - Internal distribution
   - Test on real devices

3. **Production Build**
   ```bash
   npm run mobile:build:prod:ios
   npm run mobile:build:prod:android
   ```
   - App Store / Play Store ready
   - Code signing handled by EAS
   - Optimized and minified

4. **Submit to Stores**
   ```bash
   npm run mobile:submit:ios
   npm run mobile:submit:android
   ```

### CI/CD Integration

**GitHub Actions** (recommended workflow):

```yaml
name: Mobile App CI

on:
  push:
    branches: [main]
    paths:
      - 'mobile-app/**'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm run mobile:install

      - name: Run tests
        run: cd mobile-app && npm run test

      - name: Build iOS
        run: npm run mobile:build:prod:ios

      - name: Build Android
        run: npm run mobile:build:prod:android
```

## 📦 Dependencies

### Shared Principles
- **Isolated package.json**: Mobile has its own dependencies
- **Version control**: Mobile and web can have different versions
- **No cross-contamination**: Web build never touches mobile packages

### Mobile Dependencies (mobile-app/package.json)

**Core:**
- `expo` ~52.0.0
- `react-native` 0.76.5
- `react` 18.3.1

**Navigation:**
- `expo-router` ~4.0.0
- `@react-navigation/native` ^6.1.9
- `@react-navigation/bottom-tabs` ^6.5.11

**Data & State:**
- `@tanstack/react-query` ^5.56.2
- `zustand` ^4.4.7
- `@supabase/supabase-js` ^2.39.3

**Native Features:**
- `expo-camera` ~16.0.0
- `expo-location` ~18.0.0
- `expo-local-authentication` ~15.0.0
- `expo-secure-store` ~14.0.0
- `expo-notifications` ~0.29.0
- `expo-image` ~2.0.0

**UI:**
- `nativewind` ^4.1.23 (Tailwind for React Native)
- `@expo/vector-icons` ^14.0.0
- `react-native-svg` 15.8.0
- `react-native-gesture-handler` ~2.20.2
- `react-native-reanimated` ~3.16.1

### Web Dependencies (root package.json)

Remains unchanged - all web-specific dependencies stay in root.

## 🔧 Development Guidelines

### For Mobile Development

**DO:**
- ✅ Work in `mobile-app/` directory
- ✅ Use Expo Router for navigation
- ✅ Use React Native components (View, Text, etc.)
- ✅ Test on both iOS and Android
- ✅ Use EAS Build for cloud builds
- ✅ Follow React Native best practices

**DON'T:**
- ❌ Import from `../src` (web codebase)
- ❌ Use React Router (use Expo Router)
- ❌ Use HTML elements (use React Native components)
- ❌ Mix web and mobile builds
- ❌ Add mobile dependencies to root package.json

### For Web Development

**DO:**
- ✅ Work in `src/` directory (root level)
- ✅ Use React Router for navigation
- ✅ Use web components (div, button, etc.)
- ✅ Build with Vite
- ✅ Deploy to Cloudflare Pages

**DON'T:**
- ❌ Import from `mobile-app/`
- ❌ Use React Native components in web
- ❌ Touch mobile app files
- ❌ Add Expo dependencies to root

## 🧪 Testing Strategy

### Mobile Testing

**Unit Tests:**
```bash
cd mobile-app
npm run test
```

**Type Checking:**
```bash
cd mobile-app
npm run type-check
```

**E2E Testing:**
- Detox (planned)
- Maestro (alternative)

### Web Testing

Remains unchanged - existing Vitest and Playwright setup.

## 🎛️ Environment Variables

### Mobile (.env in mobile-app/)
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Web (.env in root/)
Existing environment variables remain unchanged.

## 📈 Performance Optimizations

### Mobile Optimizations
- **React Native Reanimated** - 60 FPS animations
- **Expo Image** - Fast caching and loading
- **Code Splitting** - Lazy load routes
- **Native Modules** - Swift/Kotlin for performance-critical features
- **Secure Storage** - Native keychains (iOS/Android)

### Web Optimizations
Remains unchanged - existing Vite optimizations.

## 🐛 Troubleshooting

### "Cannot find module" errors in mobile app

**Solution:**
```bash
cd mobile-app
rm -rf node_modules
npm install
```

### Web build includes mobile files

**Solution:** Check `vite.config.ts` has:
```typescript
exclude: ['mobile-app/**/*']
```

### Mobile build fails on EAS

**Solution:** Check `eas.json` configuration and ensure EAS CLI is authenticated:
```bash
npx eas login
npx eas build:configure
```

## 📚 Resources

- [Expo Documentation](https://docs.expo.dev)
- [React Native Documentation](https://reactnative.dev)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [Supabase React Native](https://supabase.com/docs/guides/getting-started/tutorials/with-react-native)

## 🎓 Learning Path

### For Developers New to Mobile

1. **Start with Expo Documentation** - Learn Expo fundamentals
2. **Understand Expo Router** - File-based routing
3. **Learn React Native** - Components, StyleSheet, Platform API
4. **Study Native Modules** - Swift and Kotlin basics
5. **Practice with Simulator** - Test on iOS/Android emulators
6. **Deploy with EAS** - Cloud build workflow

## 🔄 Migration from Old Structure

### What Changed?

**Removed:**
- ❌ `android/` (root level - Capacitor)
- ❌ `ios/` (root level - didn't exist)
- ❌ `mobile-native/` (standalone React Native)
- ❌ `app/` (root level - old Expo app)
- ❌ `capacitor.config.ts`
- ❌ `app.config.js` (root level)
- ❌ `metro.config.cjs` (root level)
- ❌ `eas.json` (root level)

**Added:**
- ✅ `mobile-app/` - Completely isolated mobile app
- ✅ `mobile-app/ios/modules/` - Swift native modules
- ✅ `mobile-app/android/.../modules/` - Kotlin native modules
- ✅ `mobile-app/package.json` - Isolated dependencies
- ✅ `mobile-app/src/app/` - Expo Router structure

### Benefits of New Structure

1. **Zero Build Conflicts** - Web and mobile never interfere
2. **Independent Versioning** - Different React versions OK
3. **Clearer Code Organization** - Mobile code in one place
4. **Easier Onboarding** - Clear separation of concerns
5. **Better CI/CD** - Test web and mobile independently
6. **Native Performance** - Swift/Kotlin for critical features
7. **Cloud Builds** - No Mac required for iOS builds

---

**Last Updated:** 2024-12-20
**Version:** 2.0
**Status:** Production Ready

---

For questions or issues, please refer to `mobile-app/README.md` or file an issue on GitHub.
