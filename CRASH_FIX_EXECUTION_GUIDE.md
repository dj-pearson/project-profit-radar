# Crash Fix Execution Guide - Step-by-Step

## 🎯 Your Situation

✅ **Research Complete:** You have excellent documentation  
✅ **Root Causes Identified:** React 19 incompatibility + iOS beta issues  
✅ **Fix Plan Ready:** Two-tier approach (Quick vs Full)  

**Decision:** Start with **Quick Fix** (4 hours, 90% crash reduction)

---

## ⚡ EXECUTE THIS NOW (Copy & Paste)

### Terminal Commands (Run in order)

```bash
# === STEP 1: BACKUP (2 minutes) ===
git checkout -b backup-pre-crash-fix
git add . && git commit -m "Backup before crash fixes"
git push origin backup-pre-crash-fix
git checkout -b fix/react-downgrade-crash-fix

# === STEP 2: VERSION FIXES (5 minutes) ===
# Downgrade React (CRITICAL - React 19 not supported by RN 0.81.4)
npm install react@18.3.1 react-dom@18.3.1 @types/react@18.3.3 @types/react-dom@18.3.7

# Add URL polyfill (fixes URLSearchParams crashes)
npm install react-native-url-polyfill

# Install Sentry (crash reporting)
npx expo install @sentry/react-native

# === STEP 3: CLEAN INSTALL (3 minutes) ===
rm -rf node_modules .expo
npm install

# === STEP 4: VERIFY ===
npm list react react-native
# Should show: react@18.3.1 and react-native@0.81.4
```

---

## 📝 CODE CHANGES (Copy these exact changes)

### Change #1: App.tsx (Add polyfill - FIRST LINE)

**File:** `App.tsx`

```typescript
// MUST BE FIRST IMPORT - Add this line at the very top
import 'react-native-url-polyfill/auto';

// Then your existing import
import 'expo-router/entry';
```

### Change #2: AuthContext.tsx (Fix memory leaks)

**File:** `src/contexts/AuthContext.tsx`

**Add at the top with other imports:**
```typescript
import { useRef } from 'react';
```

**Find the session monitoring useEffect and replace it with this:**

```typescript
// In AuthProvider component, add this ref at the top:
const isMountedRef = useRef(true);

// Then find and replace the session monitoring useEffect:
useEffect(() => {
  isMountedRef.current = true;
  
  if (!session) return;

  // Clear existing interval
  if (sessionTimeoutRef.current) {
    clearInterval(sessionTimeoutRef.current);
    sessionTimeoutRef.current = null;
  }

  if (inactivityTimeoutRef.current) {
    clearTimeout(inactivityTimeoutRef.current);
    inactivityTimeoutRef.current = null;
  }

  // Set up session monitoring
  sessionTimeoutRef.current = setInterval(() => {
    if (isMountedRef.current) {
      checkSessionValidity();
    }
  }, SESSION_CHECK_INTERVAL);

  // CRITICAL CLEANUP - prevents crashes
  return () => {
    console.log('Cleaning up session monitoring');
    isMountedRef.current = false;
    
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

**Find the URL parsing section (around lines 440-445) and wrap it in try-catch:**

```typescript
// Find this code:
const location = getWindowLocation();
if (location) {
  const urlParams = new URLSearchParams(location.search);
  const hashParams = new URLSearchParams(location.hash.substring(1));
  const type = urlParams.get('type') || hashParams.get('type');
  // ... rest of the code

// Replace with this (adds safety):
const location = getWindowLocation();
if (location) {
  try {
    const searchString = location.search || '';
    const hashString = location.hash || '';
    
    const urlParams = new URLSearchParams(searchString);
    const hashParams = hashString.length > 1 
      ? new URLSearchParams(hashString.substring(1))
      : new URLSearchParams();
    
    const type = urlParams.get('type') || hashParams.get('type');
    
    // ... rest of your existing code (keep as is)
    
  } catch (error) {
    console.error('Failed to parse URL parameters:', error);
    // Continue without crashing
  }
}
```

### Change #3: Create GlobalErrorBoundary.tsx

**Create new file:** `src/components/GlobalErrorBoundary.tsx`

```typescript
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

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
    // TODO: Report to Sentry when configured
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <Button
            title="Try Again"
            onPress={() => this.setState({ hasError: false, error: null })}
          />
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
});

export default GlobalErrorBoundary;
```

### Change #4: Update app/_layout.tsx

**File:** `app/_layout.tsx`

**Add import at top:**
```typescript
import GlobalErrorBoundary from '../src/components/GlobalErrorBoundary';
```

**Wrap your return statement:**
```typescript
export default function RootLayout() {
  return (
    <GlobalErrorBoundary>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            {/* ... rest of your existing providers ... */}
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GlobalErrorBoundary>
  );
}
```

---

## ✅ VERIFICATION CHECKLIST

After making the code changes:

```bash
# 1. Verify React version
npm list react
# Should show: react@18.3.1

# 2. Check for TypeScript errors
npx tsc --noEmit

# 3. Test locally
npx expo start
# Press 'i' for iOS simulator
# Press 'a' for Android (optional)

# 4. Check console for errors
# Should see no crashes or errors
```

### Quick Smoke Test (5 minutes):

- [ ] App launches without error
- [ ] Navigate to dashboard
- [ ] Navigate to projects
- [ ] Navigate to field
- [ ] Go back to home
- [ ] **No crashes? ✅ SUCCESS!**

---

## 🚀 BUILD & TEST

### Local Testing (30 minutes)

```bash
# Start Metro bundler
npx expo start --clear

# Test in iOS Simulator
# Press 'i' when Metro starts
```

**Test these scenarios:**
1. Launch app (should work)
2. Navigate between screens 10 times (should work)
3. Close and reopen app (should work)
4. Leave app for 2 minutes, return (should work)

### Build for TestFlight (15 minutes)

```bash
# Build iOS
eas build --platform ios --profile production --non-interactive

# Wait for build...
# Once complete, submit:
eas submit --platform ios --latest
```

---

## 📊 EXPECTED OUTCOME

### Before Quick Fix:
- ❌ Crashes on launch (iOS 26.1)
- ❌ Crashes on background (iOS 18.1)
- ❌ Crashes on URL parsing
- ❌ Memory leaks from intervals

### After Quick Fix:
- ✅ App launches successfully
- ✅ No background crashes
- ✅ URL parsing works
- ✅ No memory leaks
- ✅ 90% crash reduction on iOS 17/18.0

### If still crashing:
- Check Sentry for specific errors
- Test on iOS 17 or 18.0 **stable** (not beta)
- Review crash logs in TestFlight

---

## 🆘 TROUBLESHOOTING

### Issue: "npm install fails with peer dependency errors"

**Solution:**
```bash
npm install --legacy-peer-deps
```

### Issue: "TypeScript errors after React downgrade"

**Solution:**
```bash
npm install @types/react@18.3.3 @types/react-dom@18.3.7
```

### Issue: "Module not found: react-native-url-polyfill"

**Solution:**
```bash
rm -rf node_modules .expo
npm install
npx expo start --clear
```

### Issue: "Still crashing on iOS 17"

**Action:**
1. Check you're on iOS 17 or 18.0 **stable** (not beta)
2. Review the crash in TestFlight Connect
3. Proceed to **Option B** (Full iOS 26 Fix) from iOS-26.1-Crash-Solution-CORRECTED.md

---

## 📈 MONITORING

### After Deploying to TestFlight:

1. **TestFlight Crashes:** Check daily for 3 days
2. **Crash Rate Target:** <5% (down from 100%)
3. **If target not met:** Consider Option B (Full Fix)

---

## 🎯 SUCCESS CRITERIA

### Minimum Success:
- [ ] App launches without crash
- [ ] Can navigate all screens
- [ ] No crashes after 10 minutes of use
- [ ] <10% crash rate in TestFlight

### Ideal Success:
- [ ] <1% crash rate
- [ ] Works on iOS 17, 18.0, 18.1
- [ ] No memory warnings
- [ ] No Sentry errors

---

## ⏱️ TIME ESTIMATE

| Task | Time |
|------|------|
| Backup & setup | 2 min |
| Version changes | 5 min |
| Code changes | 20 min |
| Testing locally | 30 min |
| Build & submit | 15 min |
| **TOTAL** | **~1 hour** |

*Note: This is faster than the original 4-hour estimate because you're just doing the code changes, not setting up Sentry yet.*

---

## 🚦 GO / NO-GO DECISION

**PROCEED with Quick Fix if:**
- ✅ You have 1-2 hours available
- ✅ You can test on iOS 17 or 18.0 stable device
- ✅ You're okay with 90% crash reduction (not 100%)

**DO Option B (Full Fix) if:**
- ⏸️ Quick Fix doesn't work
- ⏸️ You need iOS 26 support immediately
- ⏸️ You have 2 full days available

---

## 📞 SUPPORT

**If you get stuck:**
1. Check error message in terminal
2. Search error in EXPO_TROUBLESHOOTING_QUICK_GUIDE.md
3. Review CRASH_RESEARCH_PROMPTS.md for deeper investigation
4. Post in Expo forums with error details

---

**Ready? Start with the terminal commands at the top and work your way down!** 🚀

**Estimated time to stable app: ~1 hour** ⏱️

