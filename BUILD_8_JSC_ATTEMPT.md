# Build #8 - JSC Engine Switch Attempt

## Date: October 21, 2025

## Problem Analysis

### Build #7 Crash Analysis:
- ✅ React 18.3.1 was correctly applied
- ✅ URL polyfill was added
- ✅ Memory leak fixes were applied
- ❌ **Still crashed on both devices**

### Root Cause Identified:
**Hermes engine is STILL being loaded despite `jsEngine: "jsc"` in app.config.js**

Evidence from crash logs:
- **iPhone (iOS 26.1)**: Line 164 shows `hermes arm64` framework loaded
- **iPad (iOS 18.1)**: Line 157 shows `hermes arm64` framework loaded

### Crash Location:
- **iPhone**: React Native bridge during `ObjCTurboModule::performVoidMethodInvocation`
- **iPad**: Dispatch queue with `std::terminate()` before JS execution

## Build #8 Strategy

### Changes:
1. ✅ Increment build number: 7 → 8
2. ✅ Added explicit comment on JSC engine setting
3. ✅ Verified no hermes packages in package.json
4. ✅ Verified no jsEngine overrides in eas.json

### Build Command:
```bash
eas build --platform ios --profile production --clear-cache
```

**Why `--clear-cache`?**
- Forces EAS to rebuild everything from scratch
- Ensures Hermes isn't cached from previous builds
- Guarantees JSC engine is used instead of Hermes

## Expected Outcome

### If JSC is properly applied:
- ✅ Crash logs should NOT show `hermes.framework`
- ✅ App should launch successfully
- ✅ No SIGABRT crashes on startup

### If still crashes:
- Check if JSC framework is loaded in crash logs
- If Hermes is STILL present, we need to investigate why EAS is ignoring the config
- May need to explicitly exclude Hermes or use different build approach

## Configuration

**app.config.js (iOS section):**
```javascript
ios: {
  supportsTablet: true,
  bundleIdentifier: "com.builddesk.app",
  buildNumber: "8",
  scheme: "builddesk",
  // CRITICAL: Use JavaScriptCore instead of Hermes to fix iOS crashes
  jsEngine: "jsc",
  // ... rest of config
}
```

## Testing Plan

1. **Build**: `eas build --platform ios --profile production --clear-cache`
2. **Submit**: `eas submit --platform ios --profile production`
3. **Test on TestFlight**:
   - iPhone (iOS 26.1 beta)
   - iPad (iOS 18.1 beta)
4. **Collect crash logs** if it still crashes
5. **Verify engine**: Check which framework is loaded (JSC or Hermes)

## Rollback Plan

If Build #8 fails:
```bash
git checkout backup-before-crash-fix
```

Then investigate alternative approaches:
- Manual Podfile modifications
- Different Expo SDK version
- Contact Expo support about JSC not being respected

---

**Status**: 🚀 Ready to build  
**Branch**: `fix/quick-crash-fix`  
**Commit**: "Build 8: Force JSC engine with clean build (Hermes still loading despite config)"

