# Expo Migration Guide for BuildDesk

## Current Setup Analysis

### ✅ What You Have
- **React + Vite** web app
- **Capacitor** for mobile builds (v7.4.1)
- **Native plugins**: Camera, Geolocation, Local Notifications, Push Notifications
- **App ID**: `com.builddesk.app`
- **Build output**: `dist/` directory

### 🎯 Migration Options

## Option 1: Full Expo Migration (Recommended)

### Benefits:
- ✅ **Simplified App Store submission** with EAS Build
- ✅ **Over-the-air updates** with EAS Update  
- ✅ **Cloud builds** (no need for macOS/Xcode locally)
- ✅ **Better developer experience** and tooling
- ✅ **Built-in testing** with Expo Go app

### Migration Steps:

#### Step 1: Install Expo CLI
```bash
npm install -g @expo/cli
npx create-expo-app --template blank-typescript BuildDeskExpo
cd BuildDeskExpo
```

#### Step 2: Configure Expo App
Create `app.json`:
```json
{
  "expo": {
    "name": "BuildDesk",
    "slug": "builddesk",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.builddesk.app",
      "buildNumber": "1"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.builddesk.app",
      "versionCode": 1
    },
    "web": {
      "favicon": "./assets/favicon.png",
      "bundler": "metro"
    },
    "plugins": [
      "expo-camera",
      "expo-location",
      "expo-notifications",
      [
        "expo-build-properties",
        {
          "ios": {
            "deploymentTarget": "13.0"
          }
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    }
  }
}
```

#### Step 3: Install Required Dependencies
```bash
# Core Expo dependencies
npx expo install expo-camera expo-location expo-notifications
npx expo install expo-device expo-constants expo-status-bar

# Web compatibility
npx expo install @expo/webpack-config

# Your existing web dependencies (copy from current package.json)
npm install @radix-ui/react-* @tanstack/react-query react-router-dom
```

#### Step 4: Migrate Your Components
1. Copy your `src/` directory to the new Expo project
2. Update imports for native modules:

```typescript
// Replace Capacitor imports
// OLD: import { Camera } from '@capacitor/camera';
// NEW: import * as ImagePicker from 'expo-image-picker';

// OLD: import { Geolocation } from '@capacitor/geolocation';
// NEW: import * as Location from 'expo-location';

// OLD: import { LocalNotifications } from '@capacitor/local-notifications';
// NEW: import * as Notifications from 'expo-notifications';
```

#### Step 5: Configure EAS Build
```bash
npm install -g eas-cli
eas login
eas build:configure
```

Create `eas.json`:
```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "ios": {
        "simulator": false,
        "scheme": "BuildDesk"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "your-app-store-connect-id",
        "appleTeamId": "your-team-id"
      }
    }
  }
}
```

---

## Option 2: Hybrid Approach (Keep Current + Add Expo)

Keep your current Capacitor setup and use Expo for builds only:

### Step 1: Install Expo Development Build
```bash
npx expo install expo-dev-client
```

### Step 2: Configure for Development Build
```json
{
  "expo": {
    "name": "BuildDesk",
    "slug": "builddesk",
    "platforms": ["ios", "android"],
    "plugins": [
      "expo-dev-client",
      "@config-plugins/react-native-web"
    ]
  }
}
```

### Step 3: Build with EAS
```bash
eas build --platform ios --profile development
```

---

## Option 3: Capacitor + Expo Build Tools

Use Expo's build infrastructure with your existing Capacitor app:

### Step 1: Add Expo CLI to Current Project
```bash
cd project-profit-radar
npm install @expo/cli
npx expo prebuild --platform ios
```

### Step 2: Configure for iOS Build
```bash
# Generate iOS project with Expo tooling
npx expo run:ios
```

---

## Migration Timeline & Effort

### Option 1 (Full Migration): 2-3 weeks
- **Week 1**: Setup Expo, migrate core components
- **Week 2**: Update native module integrations, testing
- **Week 3**: App Store preparation, submission

### Option 2 (Hybrid): 1 week
- **Days 1-3**: Setup development build
- **Days 4-5**: Configure EAS builds
- **Days 6-7**: App Store submission

### Option 3 (Build Tools Only): 3-5 days
- **Days 1-2**: Setup Expo build tools
- **Days 3-5**: Configure and test builds

---

## Native Module Compatibility

### ✅ Direct Expo Equivalents:
| Capacitor Plugin | Expo Equivalent |
|------------------|-----------------|
| `@capacitor/camera` | `expo-image-picker` |
| `@capacitor/geolocation` | `expo-location` |
| `@capacitor/local-notifications` | `expo-notifications` |
| `@capacitor/push-notifications` | `expo-notifications` |
| `@capacitor/device` | `expo-device` |

### 🔄 Migration Required:
- **File system access**: Capacitor FileSystem → Expo FileSystem
- **Preferences**: Capacitor Preferences → Expo SecureStore
- **App state**: Capacitor App → Expo AppState

---

## App Store Submission with Expo

### Traditional Capacitor Way:
1. Build iOS project locally
2. Open Xcode
3. Configure signing certificates
4. Archive and upload
5. Manage provisioning profiles manually

### Expo EAS Way:
```bash
# Build for App Store
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --profile production
```

### EAS Benefits:
- ✅ **No Xcode required**
- ✅ **Automatic certificate management**
- ✅ **Cloud builds** (works on any OS)
- ✅ **One-command submission**
- ✅ **Automatic provisioning profiles**

---

## Recommended Migration Plan

### Phase 1: Proof of Concept (3 days)
1. Create new Expo project
2. Migrate 2-3 core components
3. Test native functionality
4. Validate build process

### Phase 2: Core Migration (1 week)
1. Migrate all components
2. Update native module usage
3. Configure EAS builds
4. Test on device

### Phase 3: Production Preparation (3-5 days)
1. App Store assets preparation
2. Production build configuration
3. Submission to App Store
4. Monitor review process

---

## Cost Considerations

### Expo EAS Pricing:
- **Free tier**: 30 builds/month
- **Production**: $99/month (unlimited builds)
- **Enterprise**: Custom pricing

### vs. Traditional iOS Development:
- **Mac/Xcode setup**: $1000+ (hardware)
- **Apple Developer**: $99/year
- **Time savings**: 50-70% faster deployment

---

## Quick Start Command

To begin migration immediately:

```bash
# Option 1: Full migration
npx create-expo-app@latest BuildDeskExpo --template blank-typescript

# Option 2: Add to existing project
cd project-profit-radar
npx expo install expo-dev-client

# Option 3: Use Expo build tools only
npx expo prebuild --platform ios
```

## Next Steps

1. **Choose your migration option**
2. **Set up Apple Developer account** (if not done)
3. **Create Expo account** at expo.dev
4. **Start with proof of concept**
5. **Plan component migration**

The **Full Expo Migration (Option 1)** is recommended for the best long-term developer experience and easiest App Store submission process. 