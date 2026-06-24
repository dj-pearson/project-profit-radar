# Brikly Mobile App - Quick Start Guide

Get the mobile app running in 5 minutes!

## 🚀 Quick Setup

### 1. Install Dependencies

From the **root** of the repository:

```bash
npm run mobile:install
```

Or from the **mobile-app** directory:

```bash
cd mobile-app
npm install
```

### 2. Start Development Server

```bash
npm start
```

This will open Expo Developer Tools in your terminal.

### 3. Run on Simulator/Emulator

**iOS Simulator** (Mac only):
```bash
# Press 'i' in the terminal
# OR
npm run ios
```

**Android Emulator**:
```bash
# Press 'a' in the terminal
# OR
npm run android
```

**Physical Device**:
- Install Expo Go app from App Store or Play Store
- Scan the QR code shown in the terminal

## 📱 Development Workflow

### Make Changes

Edit files in `mobile-app/src/`:
- `src/app/` - Screens (Expo Router)
- `src/components/` - Components
- `src/contexts/` - React contexts
- `src/services/` - API calls

**Hot reload** is enabled - changes appear instantly!

### Test on Multiple Platforms

Always test on both iOS and Android:
```bash
npm run ios      # Test on iOS
npm run android  # Test on Android
```

## 🏗️ Building for Production

### Cloud Build (Recommended)

**No Mac required for iOS builds!**

```bash
# iOS
npm run build:prod:ios

# Android
npm run build:prod:android
```

Builds are handled by EAS Build in the cloud.

### First Time Setup for EAS

```bash
# Login to Expo
npx eas login

# Configure build (if needed)
npx eas build:configure
```

## 📦 Project Structure

```
mobile-app/
├── src/
│   ├── app/           # Screens (file-based routing)
│   │   ├── (tabs)/    # Tab navigation
│   │   │   ├── dashboard.tsx
│   │   │   ├── projects.tsx
│   │   │   ├── field.tsx
│   │   │   ├── time.tsx
│   │   │   └── more.tsx
│   │   ├── auth.tsx   # Login screen
│   │   └── index.tsx  # Entry point
│   ├── components/    # Reusable components
│   ├── contexts/      # Auth, Theme, Navigation
│   ├── services/      # Supabase client
│   └── utils/         # Helper functions
├── ios/modules/       # Native Swift modules
├── android/.../modules/ # Native Kotlin modules
└── assets/            # Icons, images
```

## 🎨 Main Features

### 5 Tab Navigation
1. **Dashboard** - Overview and quick actions
2. **Projects** - Project management
3. **Field** - Field operations (camera, reports)
4. **Time** - Time tracking
5. **More** - Additional features hub

### What's Built
- ✅ Authentication (email/password)
- ✅ Tab navigation
- ✅ Theme support (light/dark)
- ✅ Supabase integration
- ✅ Native modules (Camera, Location, Biometric)
- ✅ Offline-first architecture

## 🔧 Common Commands

```bash
# Development
npm start              # Start Expo dev server
npm run ios            # Run on iOS simulator
npm run android        # Run on Android emulator

# Building
npm run prebuild       # Generate native projects
npm run build:prod:ios # Build iOS (cloud)
npm run build:prod:android # Build Android (cloud)

# Maintenance
npm run type-check     # TypeScript validation
npm run lint           # ESLint check
npm test               # Run tests
```

## 🐛 Troubleshooting

### "Cannot find module"

```bash
rm -rf node_modules
npm install
```

### "Metro bundler not starting"

```bash
npx expo start --clear
```

### "iOS build failing"

```bash
npm run prebuild:clean
npm run ios
```

## 📚 Learn More

- **Full README**: See `mobile-app/README.md`
- **Architecture**: See `../MOBILE_APP_ARCHITECTURE.md`
- **Expo Docs**: https://docs.expo.dev
- **React Native**: https://reactnative.dev

## 🆘 Need Help?

1. Check the [Expo Documentation](https://docs.expo.dev)
2. File an issue on GitHub
3. Ask in team Slack/Discord

## 🎉 You're Ready!

The mobile app is completely isolated from the web build - you can develop freely without worrying about breaking anything!

Happy coding! 🚀
