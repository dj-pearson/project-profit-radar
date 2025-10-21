# Immediate Crash Fix Action Plan

## 🚨 Critical Analysis

Based on the crash logs, we have **TWO DISTINCT CRASH PATTERNS**:

### iPhone Crash (iOS 26.1 Beta) - CRITICAL
```
Exception: EXC_BAD_ACCESS (SIGSEGV)
Location: hermes::vm::stringPrototypeReplace (String.cpp:1966)
Thread: JavaScript execution thread
Root Cause: Memory access violation during string replace operation
```

### iPad Crash (iOS 18.1) - CRITICAL  
```
Exception: EXC_CRASH (SIGABRT)
Location: std::terminate() during dispatch
Thread: Worker thread
Root Cause: Uncaught exception in background thread
```

---

## ⚠️ IMMEDIATE PROBLEM

**You're testing on iOS BETA versions (26.1 and 18.1 beta) which are NOT officially supported.**

### iOS Version Reality Check:

| Version | Status | Expo SDK 54 Support |
|---------|--------|---------------------|
| iOS 26.1 | **Beta** | ❌ NOT SUPPORTED |
| iOS 18.1 | **Beta** | ⚠️ PARTIAL (18.0 stable supported) |
| iOS 18.0 | **Stable** | ✅ SUPPORTED |
| iOS 17.x | **Stable** | ✅ FULLY SUPPORTED |

**React Native 0.81.4 was released BEFORE iOS 18**, so crashes on iOS 26.1 beta are expected.

---

## 🎯 IMMEDIATE ACTION ITEMS (Do These NOW)

### 1. Test on Supported iOS Versions (HIGHEST PRIORITY)

```bash
# You MUST test on:
- iOS 17.6 (latest iOS 17)
- iOS 18.0 (NOT 18.1 beta)
- Avoid iOS 26.1 beta entirely for now
```

**Why:** Beta iOS versions have incomplete APIs and known bugs that cause crashes.

### 2. Add Crash Reporting (DO THIS FIRST)

Install Sentry to get actual error messages instead of native crashes:

```bash
npx expo install @sentry/react-native
```

**app.config.js:**
```javascript
export default {
  // ... existing config
  plugins: [
    // ... existing plugins
    [
      "@sentry/react-native/expo",
      {
        organization: "your-org",
        project: "builddesk",
      }
    ],
  ],
};
```

**App.tsx:**
```typescript
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  enableInExpoDevelopment: true,
  debug: true, // Enable debug for testing
});
```

### 3. Wrap String Operations with Error Handling

The crash is in `stringPrototypeReplace` - we need to protect ALL string operations:

**src/contexts/AuthContext.tsx** - Add defensive checks:

```typescript
// BEFORE (unsafe):
const urlParams = new URLSearchParams(location.search);
const hashParams = new URLSearchParams(location.hash.substring(1));

// AFTER (safe):
try {
  const searchString = location?.search || '';
  const hashString = location?.hash || '';
  
  const urlParams = new URLSearchParams(searchString);
  const hashParams = new URLSearchParams(hashString.substring(1));
  const type = urlParams.get('type') || hashParams.get('type');
} catch (error) {
  console.error('Error parsing URL parameters:', error);
  // Handle gracefully
}
```

### 4. Add Global Error Boundaries

**Create: src/components/GlobalErrorBoundary.tsx**

```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, Button } from 'react-native';
import * as Sentry from '@sentry/react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    Sentry.captureException(error, { extra: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Something went wrong.</Text>
          <Text>{this.state.error?.message}</Text>
          <Button
            title="Try again"
            onPress={() => this.setState({ hasError: false, error: null })}
          />
        </View>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
```

**Update app/_layout.tsx:**

```typescript
import GlobalErrorBoundary from '../src/components/GlobalErrorBoundary';

export default function RootLayout() {
  return (
    <GlobalErrorBoundary>
      <SafeAreaProvider>
        {/* ... rest of your providers */}
      </SafeAreaProvider>
    </GlobalErrorBoundary>
  );
}
```

### 5. Fix Potential Memory Leaks in AuthContext

**Problem:** setInterval not being cleaned up properly

```typescript
// In AuthContext.tsx, update the session monitoring:

useEffect(() => {
  if (!session) return;

  // Clear any existing interval first
  if (sessionTimeoutRef.current) {
    clearInterval(sessionTimeoutRef.current);
    sessionTimeoutRef.current = null;
  }

  // Set up new interval
  sessionTimeoutRef.current = setInterval(checkSessionValidity, SESSION_CHECK_INTERVAL);

  // CRITICAL: Clean up on unmount or session change
  return () => {
    if (sessionTimeoutRef.current) {
      clearInterval(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
  };
}, [session, checkSessionValidity]);
```

### 6. Add Native Module Try-Catch Wrappers

**Create: src/utils/safeNativeModules.ts**

```typescript
import { Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';

export const safelyCallNativeModule = async <T,>(
  moduleName: string,
  operation: () => Promise<T>,
  fallback: T
): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    console.error(`Native module ${moduleName} error:`, error);
    Sentry.captureException(error, {
      tags: {
        module: moduleName,
        platform: Platform.OS,
      },
    });
    return fallback;
  }
};

// Usage example:
import * as Location from 'expo-location';

const location = await safelyCallNativeModule(
  'expo-location',
  () => Location.getCurrentPositionAsync(),
  null
);
```

### 7. Disable Background Modes Temporarily

In `app.config.js`, comment out background modes for testing:

```javascript
ios: {
  infoPlist: {
    UIBackgroundModes: [
      // 'location',  // TEMP DISABLE
      // 'background-fetch',  // TEMP DISABLE
      // 'background-processing',  // TEMP DISABLE
    ],
  }
}
```

**Why:** Background tasks can cause crashes on beta iOS versions.

### 8. Add String Operation Polyfill

**Create: src/utils/safeStringOperations.ts**

```typescript
export const safeStringReplace = (
  str: string,
  searchValue: string | RegExp,
  replaceValue: string
): string => {
  try {
    if (!str || typeof str !== 'string') {
      return '';
    }
    return str.replace(searchValue, replaceValue);
  } catch (error) {
    console.error('String replace error:', error);
    return str; // Return original string if replace fails
  }
};

export const safeSubstring = (str: string, start: number, end?: number): string => {
  try {
    if (!str || typeof str !== 'string') {
      return '';
    }
    return str.substring(start, end);
  } catch (error) {
    console.error('String substring error:', error);
    return str;
  }
};
```

---

## 🔧 CONFIGURATION CHANGES

### Update app.config.js

```javascript
export default {
  // ... existing config
  
  // Add explicit iOS deployment target
  ios: {
    deploymentTarget: '15.0',  // Safer minimum version
    supportsTablet: true,
    bundleIdentifier: 'com.builddesk.app',
    buildNumber: '1.0.0',
    scheme: 'builddesk',
    
    // TEMPORARY: Remove complex background modes
    infoPlist: {
      // ... keep permission descriptions
      
      // DISABLE background modes temporarily
      UIBackgroundModes: [],
    }
  },
  
  // Add extra Hermes configuration
  extra: {
    eas: {
      projectId: "e9733a8e-5df1-4d6e-9c1f-c13774542b16"
    },
    // CRITICAL: Add Hermes flags
    hermesEnabled: true,
  },
};
```

### Update package.json

Add testing scripts:

```json
{
  "scripts": {
    "test:ios": "expo run:ios",
    "test:sentry": "npx sentry-expo-upload-sourcemaps",
    "build:safe": "eas build --platform ios --profile preview --clear-cache"
  }
}
```

---

## 📱 TESTING PROTOCOL

### Phase 1: Local Testing (Do this first)
```bash
# 1. Install Sentry
npx expo install @sentry/react-native

# 2. Test locally
npx expo start

# 3. Run on iOS simulator (iOS 17 or 18.0, NOT beta)
npx expo run:ios
```

### Phase 2: Safe Build Test
```bash
# Build with simplified configuration
eas build --platform ios --profile preview --clear-cache
```

### Phase 3: TestFlight Distribution
```bash
# Only after local testing passes
eas submit --platform ios --latest
```

---

## 🎯 EXPECTED RESULTS

After implementing these fixes:

✅ **If crashes stop on iOS 17/18.0 stable:** The issue was beta iOS versions
✅ **If Sentry reports specific errors:** We can see ACTUAL JavaScript errors instead of native crashes
✅ **If error boundaries trigger:** We know where exceptions are happening
✅ **If still crashing:** We'll have Sentry stack traces to debug further

---

## ⚠️ ROOT CAUSE HYPOTHESIS

Based on crash analysis:

1. **iOS 26.1 Beta** - Likely has breaking changes in string handling that Hermes 0.81 doesn't support
2. **iOS 18.1 Beta** - May have threading changes causing uncaught exceptions
3. **String Operations** - URLSearchParams + substring operations triggering Hermes crash
4. **Background Threads** - setInterval/setTimeout not properly cleaned up causing worker thread crashes

---

## 🚀 PRIORITY ORDER

1. **Install Sentry** (30 minutes) - Get real error reporting
2. **Add Error Boundaries** (1 hour) - Catch uncaught exceptions
3. **Fix String Operations** (2 hours) - Add try-catch to all string ops
4. **Test on iOS 18.0 stable** (1 hour) - Verify on supported iOS version
5. **Fix Memory Leaks** (2 hours) - Proper cleanup of intervals/timeouts
6. **Disable Background Modes** (15 minutes) - Simplify for testing
7. **Build and Test** (1 hour) - Create new build with fixes

**Total Estimated Time: 8 hours**

---

## 📊 SUCCESS METRICS

| Metric | Before | Target |
|--------|--------|--------|
| Crash Rate | 100% | <1% |
| Sentry Coverage | 0% | 100% |
| Error Boundaries | 0 | All screens |
| Safe String Ops | 0% | 100% |
| Memory Leaks | Multiple | Zero |

---

## 🔍 NEXT STEPS AFTER FIXES

1. **If still crashing:** Review Sentry errors for specific code locations
2. **If stable:** Gradually re-enable background modes one at a time
3. **If working:** Test on iOS 18.1 beta again to confirm it was the issue
4. **Long term:** Consider upgrading to newer Expo SDK when iOS 18+ fully supported

---

## ⚡ QUICK WIN: Test on Real Device with iOS 17

**Fastest path to verify:**
1. Get iPhone with iOS 17.x (not beta)
2. Install via TestFlight
3. If works: Issue is beta iOS versions
4. If crashes: Real issue in code (use Sentry to find it)

---

**START HERE:** Install Sentry first, then test on iOS 17/18.0 stable!

