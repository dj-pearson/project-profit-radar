# Expo Build Best Practices & Lessons Learned

## 🎯 Critical Success Factors

### 1. **Version Compatibility is EVERYTHING**

The #1 cause of build failures is version mismatches. Always ensure:

```bash
# Check what versions Expo SDK expects
npx expo install --check

# Auto-fix version mismatches
npx expo install --fix
```

**Key Learning:** We had React Native 0.82.0 but Expo SDK 54 requires 0.81.4. This caused compilation errors in ExpoModulesCore with cryptic messages like "no member named 'CallInvoker'".

#### SDK 54 Compatible Versions:
```json
{
  "expo": "~54.0.0",
  "react": "19.1.0",
  "react-dom": "19.1.0", 
  "react-native": "0.81.4",
  "react-native-screens": "~4.16.0",
  "@types/react": "~19.1.10",
  "@types/react-dom": "~19.1.7",
  "typescript": "~5.9.2"
}
```

### 2. **Choose ONE Native Framework (Not Both!)**

**NEVER mix Capacitor and Expo.** They conflict at the native level.

❌ **Bad:** Having both `@capacitor/core` and `expo` in package.json
✅ **Good:** Pick one framework and commit to it

**What We Did:**
- Removed all `@capacitor/*` packages
- Deleted `capacitor.config.ts` and `capacitor.config.json`
- Removed Capacitor scripts from package.json
- Used Expo's equivalent modules instead

### 3. **Platform-Aware Code is Essential**

Web code won't run on mobile. Make your code platform-safe:

#### ✅ Safe Pattern for Web-Only APIs:

```typescript
import { Platform } from 'react-native';

// Platform check helper
const isWeb = Platform.OS === 'web';

// Safe window access
const getWindowLocation = () => {
  if (isWeb && typeof window !== 'undefined') {
    return window.location;
  }
  return null;
};

// Usage
const location = getWindowLocation();
if (location) {
  location.href = '/auth'; // Only runs on web
}
```

#### ✅ Conditional Imports:

```typescript
import { Platform } from 'react-native';

// Conditionally require web-only packages
let useLocation: any = () => ({ pathname: '', search: '' });
if (Platform.OS === 'web') {
  try {
    const ReactRouterDOM = require('react-router-dom');
    useLocation = ReactRouterDOM.useLocation;
  } catch (e) {
    console.warn('react-router-dom not available');
  }
}
```

### 4. **Dependency Installation Strategies**

Expo has specific install patterns that work better than raw npm:

```bash
# ✅ BEST: Use expo install for Expo packages
npx expo install expo-camera expo-location

# ✅ GOOD: Use legacy-peer-deps for complex dependencies
npm install --legacy-peer-deps

# ⚠️ OK: Create .npmrc for consistent behavior
echo "legacy-peer-deps=true" > .npmrc

# ❌ BAD: Using npm install without flags (may cause peer dep conflicts)
npm install expo-camera
```

### 5. **Metro Bundler Configuration**

Metro is picky about what it bundles. Configure it properly:

```javascript
// metro.config.cjs
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add path aliases
config.resolver.alias = {
  '@': path.resolve(__dirname, 'src'),
};

// Exclude web-only code from mobile bundles (if needed)
config.resolver.blacklistRE = /(\/src\/pages\/)|(\/src\/App\.tsx$)/;

// Support platform-specific extensions
config.resolver.sourceExts = ['expo.tsx', 'expo.ts', 'expo.js', 'tsx', 'ts', 'js', 'json'];

module.exports = config;
```

**Note:** Use `.cjs` extension if your package.json has `"type": "module"`.

### 6. **Asset Management**

Assets must exist and be properly referenced:

```javascript
// app.config.js
export default {
  icon: './public/icon-512x512.png',  // ✅ File must exist
  splash: {
    image: './public/splash.png',      // ✅ File must exist
  },
  ios: {
    icon: './public/ios-icon.png',     // ✅ iOS-specific if needed
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './public/android-icon.png',  // ✅ Must exist
    }
  }
}
```

**Lesson:** Build failed when we referenced `./public/icon-512x512.png` but the file didn't exist. Always verify asset paths.

### 7. **Optimize Build Upload Size**

Create an `.easignore` file to reduce upload time and size:

```
# .easignore
.git
.expo
node_modules/.cache
*.log
.DS_Store
.vscode
.idea
dist
dist-ssr
coverage
.env.local
.env.*.local
*.test.ts
*.test.tsx
*.spec.ts
*.spec.tsx
__tests__
tests
docs
*.md
!README.md
scripts
# Large assets not needed for build
public/assets/*.mp4
public/assets/*.mov
```

**Result:** Reduced our upload from 205MB to 102MB (~50% reduction).

### 8. **Git Ignore Strategy**

Expo generates native code. Don't commit it:

```gitignore
# Expo
.expo/
.expo-shared/

# Native folders (Expo generates these)
android/
ios/

# Build artifacts
*.ipa
*.apk
*.aab
```

### 9. **EAS Build Configuration**

Structure your `eas.json` properly:

```json
{
  "cli": {
    "version": ">= 15.3.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview"
    },
    "production": {
      "distribution": "store",
      "channel": "production"
    }
  }
}
```

**Key Points:**
- ❌ DON'T set `NODE_ENV=production` in build profiles (breaks devDependencies install)
- ❌ DON'T set `bundleIdentifier` or `applicationId` in eas.json (use app.config.js)
- ✅ DO use different channels for different environments
- ✅ DO use `--non-interactive` flag for automated builds

### 10. **Apple Developer Requirements**

For iOS builds, you need:

1. **Apple Developer Account** ($99/year)
2. **Bundle Identifier** (e.g., `com.yourcompany.app`)
3. **App Store Connect App** (create before first build)
4. **Certificates & Provisioning Profiles** (EAS can manage these)

**Interactive Setup:**
```bash
# First time - let EAS create credentials
eas build --platform ios --profile production

# Non-interactive (after credentials exist)
eas build --platform ios --profile production --non-interactive
```

### 11. **Common Build Error Patterns**

| Error | Cause | Fix |
|-------|-------|-----|
| `Unable to resolve module react-router-dom` | Web package imported in mobile code | Make imports conditional with Platform.OS |
| `require is not defined` | ES modules in CommonJS context | Rename to `.cjs` or fix module syntax |
| `no member named 'CallInvoker'` | React Native version mismatch | Use `npx expo install --fix` |
| `Cannot find module './public/icon.png'` | Missing asset file | Verify file exists at exact path |
| `Capacitor conflicts` | Both Capacitor and Expo installed | Remove all Capacitor packages |
| `devDependencies not found` | `NODE_ENV=production` in eas.json | Remove NODE_ENV from build config |

### 12. **Debugging Build Failures**

**Best Practices:**
1. ✅ Always check the full build logs on expo.dev
2. ✅ Look for "Unable to resolve module" errors first
3. ✅ Check version compatibility with `npx expo install --check`
4. ✅ Test imports locally with `npx expo start`
5. ✅ Use `--platform ios` or `--platform android` to isolate issues

**Useful Commands:**
```bash
# Validate app.config.js
npx expo config

# Check for version mismatches
npx expo install --check

# Auto-fix version issues
npx expo install --fix

# Test bundle locally
npx expo export

# Clear caches if needed
npx expo start --clear
```

### 13. **Project Structure for Expo**

```
project-root/
├── app/                    # Expo Router screens (mobile)
│   ├── _layout.tsx        # Root layout
│   ├── index.tsx          # Home screen
│   └── dashboard.tsx      # Other screens
├── src/                   # Shared code
│   ├── components/        # UI components
│   ├── contexts/          # React contexts (make platform-safe!)
│   ├── hooks/             # Custom hooks (make platform-safe!)
│   └── mobile/            # Mobile-specific code
│       ├── components/
│       ├── contexts/
│       └── utils/
├── public/                # Static assets
│   ├── icon.png
│   └── splash.png
├── App.tsx                # Expo entry point (minimal)
├── app.config.js          # Expo configuration (dynamic)
├── metro.config.cjs       # Metro bundler config
├── eas.json              # EAS Build config
├── .easignore            # Files to exclude from EAS builds
└── package.json          # Dependencies
```

### 14. **Context Provider Best Practices**

When using contexts in both web and mobile:

```typescript
// ✅ Good: Platform-aware context
import { Platform } from 'react-native';

export const AuthProvider = ({ children }) => {
  const isWeb = Platform.OS === 'web';
  
  const handleRedirect = () => {
    if (isWeb && typeof window !== 'undefined') {
      window.location.href = '/auth';
    } else {
      // Mobile navigation using expo-router
      router.push('/auth');
    }
  };
  
  return <AuthContext.Provider value={{ /* ... */ }}>{children}</AuthContext.Provider>;
};
```

### 15. **Testing Strategy**

Before pushing to EAS Build:

```bash
# 1. Test locally on web
npm run dev

# 2. Test Expo start (mobile simulator)
npx expo start

# 3. Validate config
npx expo config

# 4. Check dependencies
npx expo install --check

# 5. Test export (simulates build)
npx expo export

# 6. Only then push to EAS
eas build --platform ios --profile preview
```

## 🎓 Key Lessons from Our Build Journey

### Lesson 1: Start Small, Build Up
- Start with a minimal Expo app that builds successfully
- Gradually add features and test after each addition
- Don't try to convert a complex web app to mobile all at once

### Lesson 2: Respect Platform Differences
- Web has `window`, `document`, `react-router-dom`
- Mobile has `Platform`, `expo-router`, native APIs
- Always check platform before using web-only APIs

### Lesson 3: Version Management is Critical
- Use `npx expo install` for Expo packages (auto-manages versions)
- Don't manually specify versions unless necessary
- Let Expo SDK dictate compatible versions

### Lesson 4: Read Error Messages Carefully
- "Unable to resolve module" = import issue
- "no member named X" = version mismatch
- "Cannot find module" = missing file/package
- Check the import stack to trace the source

### Lesson 5: When in Doubt, Check the Docs
- Expo docs are excellent: https://docs.expo.dev
- Check SDK compatibility: https://github.com/expo/expo/tree/main/packages
- React Native docs for platform-specific code

## 🚀 Quick Start Checklist for Future Builds

- [ ] Verify all package versions match Expo SDK (`npx expo install --check`)
- [ ] Remove conflicting frameworks (Capacitor, Cordova, etc.)
- [ ] Make all web-specific code platform-aware
- [ ] Verify all asset paths exist
- [ ] Create `.easignore` for faster uploads
- [ ] Add `.expo/`, `ios/`, `android/` to `.gitignore`
- [ ] Test `npx expo config` passes without errors
- [ ] Test `npx expo start` works locally
- [ ] Use `--non-interactive` for automated builds
- [ ] Check build logs at expo.dev for detailed errors

## 📚 Essential Resources

- **Expo Docs:** https://docs.expo.dev
- **EAS Build:** https://docs.expo.dev/build/introduction/
- **Expo Router:** https://docs.expo.dev/router/introduction/
- **Platform-Specific Code:** https://reactnative.dev/docs/platform-specific-code
- **Troubleshooting:** https://docs.expo.dev/troubleshooting/overview/

## 🎯 Success Metrics

Our successful build achieved:
- ✅ 0 compilation errors
- ✅ 102MB upload size (down from 205MB)
- ✅ ~10 minute build time
- ✅ Valid IPA file ready for App Store
- ✅ All native permissions properly configured
- ✅ Platform-specific code properly isolated

---

**Remember:** Expo builds are deterministic. If it fails, there's always a specific reason. Follow the error messages, check versions, verify imports, and you'll get there! 🎉

