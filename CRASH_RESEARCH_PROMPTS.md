# Comprehensive Crash Research Prompts

## 🔍 Analysis of Current Crashes

### iPhone Crash (iOS 26.1 Beta)
**Key Details:**
- **Exception:** `EXC_BAD_ACCESS (SIGSEGV)` - Segmentation fault
- **Crash Location:** Hermes JavaScript engine
- **Thread:** Thread 9 (JavaScript thread)
- **Function:** `hermes::vm::stringPrototypeReplace` (String.cpp:1966)
- **Triggered by:** String replace operation in JavaScript

### iPad Crash (iOS 18.1 Beta)
**Key Details:**
- **Exception:** `EXC_CRASH (SIGABRT)` - Abort signal
- **Crash Location:** C++ exception handling
- **Thread:** Thread 1 (Worker thread)
- **Function:** `std::terminate()` called during dispatch
- **Triggered by:** Uncaught exception in background thread

---

## 📚 Research Prompt #1: Hermes Engine Compatibility

**Prompt:**
```
I'm experiencing crashes in a React Native app built with Expo SDK 54 on iOS. The app uses:
- React Native 0.81.4
- React 19.1.0
- TypeScript 5.9.2
- Expo SDK 54
- Hermes JavaScript engine

The crashes occur on:
1. iOS 26.1 (beta) - SIGSEGV in hermes::vm::stringPrototypeReplace
2. iOS 18.1 (beta) - SIGABRT with std::terminate() 

Questions:
1. What version of Hermes ships with React Native 0.81.4?
2. Are there known incompatibilities between this Hermes version and iOS 26.1 beta or iOS 18.1?
3. What are the recommended Hermes engine settings for Expo SDK 54 to maximize stability on iOS 18+ and 26+?
4. Should I enable/disable specific Hermes flags in app.config.js?
5. Are there known issues with String.prototype.replace in this Hermes version?
6. What's the proper way to configure Hermes for production iOS builds?
```

**Where to Research:**
- Expo SDK 54 release notes
- React Native 0.81.4 release notes
- Hermes GitHub issues
- Expo forums for iOS 18/26 compatibility

---

## 📚 Research Prompt #2: iOS Beta Version Compatibility

**Prompt:**
```
I'm building a React Native app using Expo SDK 54 that needs to run on:
- iOS 18.1 (current stable)
- iOS 26.1 (beta)

Current stack:
- Expo SDK: 54.0.13
- React Native: 0.81.4
- React: 19.1.0
- TypeScript: 5.9.2

Questions:
1. Is Expo SDK 54 officially compatible with iOS 18.1 and iOS 26.1 beta?
2. What's the maximum tested iOS version for React Native 0.81.4?
3. Are there known issues with React Native 0.81.4 on iOS 18+?
4. Should I upgrade to a newer Expo SDK for better iOS 26 support?
5. What's the recommended target iOS deployment version for this stack?
6. Are there specific build settings needed for iOS 18+ compatibility?
7. What are the breaking changes in iOS 18 and iOS 26 that affect React Native apps?
```

**Where to Research:**
- Expo compatibility matrix
- React Native iOS compatibility table
- Apple Developer forums
- Expo Discord/forums

---

## 📚 Research Prompt #3: String Operations & Memory Safety

**Prompt:**
```
My React Native app crashes specifically in string replacement operations:
- Crash location: hermes::vm::stringPrototypeReplace
- Exception: EXC_BAD_ACCESS (SIGSEGV)
- Invalid address: 0x00000004c9da1698

App uses TypeScript/JavaScript with:
- String manipulation in contexts (AuthContext, etc.)
- Platform.OS checks with conditional string operations
- Window.location string operations (with platform guards)
- URL parameter parsing with URLSearchParams

Questions:
1. Are there known issues with String.prototype.replace in Hermes on iOS?
2. Could conditional imports (Platform.OS checks) cause string operation crashes?
3. Are there memory management issues with long-lived strings in React contexts?
4. Should I avoid certain string operations in Hermes for iOS?
5. Are there recommended patterns for string manipulation in React Native?
6. Could the issue be related to Unicode or emoji handling in strings?
7. What's the proper way to handle URL string operations in React Native?
```

**Where to Research:**
- Hermes GitHub issues (search "string replace crash")
- React Native GitHub issues
- Stack Overflow
- Hermes documentation on string handling

---

## 📚 Research Prompt #4: React 19 + React Native Compatibility

**Prompt:**
```
I upgraded to React 19.1.0 (required by Expo SDK 54) and experiencing crashes on iOS:

Current configuration:
- React: 19.1.0
- React Native: 0.81.4
- Expo SDK: 54
- Platform: iOS 18.1 and iOS 26.1 beta

Crash patterns:
1. Crashes in background threads during dispatch
2. std::terminate() being called
3. Uncaught exceptions in worker threads

Questions:
1. Is React 19.1.0 fully compatible with React Native 0.81.4?
2. Are there known issues with React 19's concurrent features on iOS?
3. Should I disable React concurrent mode for React Native?
4. Are there specific React 19 features that don't work well with Hermes?
5. What React 19 breaking changes affect React Native?
6. Should I use React 18 instead for better stability?
7. How do I properly configure React 19 for React Native production use?
```

**Where to Research:**
- React 19 release notes
- React Native + React 19 compatibility issues
- Expo documentation on React 19
- GitHub issues on expo/expo and facebook/react-native

---

## 📚 Research Prompt #5: Context Providers & Memory Management

**Prompt:**
```
My app has multiple React context providers:
- AuthContext (handles window.location, session management)
- PlatformContext
- MobileThemeProvider
- MobileNavigationProvider
- QueryClientProvider

Crashes occur in:
1. Background threads during async operations
2. String operations within contexts
3. Dispatch worker threads

Questions:
1. Are there memory management issues with nested context providers in React Native?
2. Could useCallback/useMemo in contexts cause crashes on iOS?
3. Should context state updates be wrapped differently for mobile?
4. Are there limits on context provider nesting in React Native?
5. Could Platform.OS checks inside contexts cause thread safety issues?
6. What's the proper pattern for async operations in React contexts on mobile?
7. Should I move window checks outside of context providers?
```

**Where to Research:**
- React Native performance best practices
- React context patterns for mobile
- Memory management in React Native
- GitHub issues related to context crashes

---

## 📚 Research Prompt #6: TypeScript + React Native Configuration

**Prompt:**
```
My TypeScript React Native app configuration:
- TypeScript: 5.9.2
- React Native: 0.81.4
- Metro bundler with path aliases (@/ for src/)
- ES modules (package.json has "type": "module")
- Mix of .ts, .tsx files

Experiencing crashes on iOS 18+ and 26+.

Questions:
1. Are there TypeScript compilation issues that could cause runtime crashes?
2. Should tsconfig.json be configured differently for React Native?
3. Could the "@/" path alias cause issues with native modules?
4. Are there recommended TypeScript settings for React Native + Hermes?
5. Should I use different module resolution strategies?
6. Could strict mode TypeScript settings help catch issues before runtime?
7. Are there known issues with ES modules in React Native?
```

**Where to Research:**
- React Native TypeScript documentation
- Expo TypeScript guide
- Metro bundler configuration
- TypeScript + Hermes compatibility

---

## 📚 Research Prompt #7: Expo Native Modules & Plugins

**Prompt:**
```
My Expo app uses these native modules:
- expo-camera
- expo-location (with background location)
- expo-media-library
- expo-notifications
- expo-local-authentication
- expo-contacts
- expo-calendar
- expo-background-fetch
- expo-task-manager
- expo-file-system
- expo-device
- expo-constants
- expo-updates
- expo-router
- expo-status-bar

Crashes on iOS 18.1 and iOS 26.1 beta.

Questions:
1. Are all these modules compatible with iOS 18+ and iOS 26+?
2. Could any of these modules cause crashes in background threads?
3. Are there known issues with expo-background-fetch on iOS 18+?
4. Could expo-task-manager cause thread termination issues?
5. Are there conflicts between these modules?
6. Should any of these modules be configured differently for iOS 18+?
7. What's the proper initialization order for these modules?
8. Are there memory limits for background tasks on iOS that could cause crashes?
```

**Where to Research:**
- Each module's GitHub repository
- Expo SDK 54 changelog
- iOS 18 background execution changes
- Apple Developer documentation on background modes

---

## 📚 Research Prompt #8: Thread Safety & Async Operations

**Prompt:**
```
Analyzing crash logs showing:
1. Crashes in Thread 9 (JavaScript thread)
2. Crashes in Thread 1 (worker thread)
3. std::terminate() during dispatch operations
4. Background thread exceptions not being caught

My app architecture:
- Multiple async operations in useEffect
- setTimeout/setInterval for session monitoring
- Async storage operations
- Background location updates
- Push notification handling

Questions:
1. What are the thread safety rules for React Native on iOS?
2. How should I handle exceptions in background threads?
3. Are there specific patterns for async operations in React Native?
4. Could setInterval/setTimeout cause crashes if not cleaned up properly?
5. What's the proper way to handle async storage on iOS?
6. Should I use specific error boundaries for background operations?
7. How do I properly handle uncaught promises in React Native?
8. Are there iOS-specific threading issues I should know about?
```

**Where to Research:**
- React Native threading model
- iOS background execution limits
- JavaScript engine threading in mobile
- Error handling best practices for React Native

---

## 📚 Research Prompt #9: Build Configuration & Native Code

**Prompt:**
```
My Expo/EAS build configuration:
- EAS Build with managed workflow
- iOS deployment target: Not explicitly set
- Hermes enabled (default for Expo)
- New Architecture: Unknown status
- Build profile: production

app.config.js includes:
- Multiple background modes
- Many iOS permissions
- Custom plugins configuration
- Updates configuration

Questions:
1. What iOS deployment target should I set for iOS 18+ compatibility?
2. Should I enable the React Native "New Architecture" for better stability?
3. Are there specific Xcode build settings needed for iOS 18+?
4. Could background mode configuration cause crashes?
5. What's the recommended iOS deployment target for Expo SDK 54?
6. Should I set specific compiler flags for iOS 18+ compatibility?
7. Are there known issues with managed workflow on iOS 18+?
8. Should I migrate to bare workflow for better control?
```

**Where to Research:**
- Expo managed vs bare workflow
- React Native New Architecture
- iOS deployment target recommendations
- EAS Build configuration docs

---

## 📚 Research Prompt #10: Platform-Specific Code Patterns

**Prompt:**
```
My code uses Platform.OS checks extensively:

```typescript
const isWeb = Platform.OS === 'web';
if (isWeb && typeof window !== 'undefined') {
  // Web-only code
}

// Conditional requires
if (Platform.OS === 'web') {
  const Module = require('react-router-dom');
}
```

Questions:
1. Could Platform.OS checks cause runtime crashes on iOS?
2. Are there better patterns for platform-specific code?
3. Should I use .ios.ts file extensions instead of Platform.OS?
4. Could dynamic requires cause issues with Metro bundler?
5. What's the performance impact of Platform.OS checks?
6. Are there memory implications of conditional module loading?
7. Should platform-specific code be in separate files?
8. How does Metro tree-shake platform-specific code?
```

**Where to Research:**
- React Native platform-specific code documentation
- Metro bundler platform extensions
- Best practices for cross-platform React Native code
- Performance implications of Platform.OS

---

## 🎯 Specific Code Sections to Research

### 1. AuthContext.tsx String Operations
```typescript
// LINE 443-445 in crash trace context
const urlParams = new URLSearchParams(location.search);
const hashParams = new URLSearchParams(location.hash.substring(1));
const type = urlParams.get('type') || hashParams.get('type');
```

**Research:** Could URLSearchParams cause string operation crashes in Hermes?

### 2. Session Monitoring with setInterval
```typescript
const sessionTimeoutRef = useRef<ReturnType<typeof setInterval> | null>(null);
sessionTimeoutRef.current = setInterval(checkSessionValidity, SESSION_CHECK_INTERVAL);
```

**Research:** Could uncleaned intervals cause background thread crashes?

### 3. Async Profile Fetching
```typescript
const fetchUserProfile = async (userId: string, retryCount = 0): Promise<UserProfile | null> => {
  // Async operation with retries
};
```

**Research:** Could retry logic in async functions cause memory issues?

---

## 🔬 Diagnostic Research Prompts

### For Hermes-Specific Issues:
```
Search: "Hermes stringPrototypeReplace crash iOS"
Search: "Hermes EXC_BAD_ACCESS string operations"
Search: "React Native 0.81.4 Hermes version iOS 18 crash"
```

### For iOS Beta Compatibility:
```
Search: "Expo SDK 54 iOS 26.1 compatibility"
Search: "React Native iOS 18.1 crashes"
Search: "iOS 26 beta React Native issues"
```

### For React 19 Issues:
```
Search: "React 19 React Native 0.81 compatibility"
Search: "React 19 concurrent mode crashes iOS"
Search: "React 19 std::terminate mobile"
```

### For Background Thread Issues:
```
Search: "React Native background thread crash iOS"
Search: "dispatch_client_callout crash React Native"
Search: "std::terminate React Native iOS"
```

---

## 📊 Testing Matrix to Research

| Component | iOS 18.1 | iOS 26.1 | Action Needed |
|-----------|----------|----------|---------------|
| Hermes Engine | ❓ | ❓ | Research version compatibility |
| React 19 | ❓ | ❓ | Verify full compatibility |
| String operations | ❌ Crash | ❌ Crash | Find safe patterns |
| Background threads | ❌ Crash | ✅ Works | Investigate iOS 18 changes |
| Context providers | ❓ | ❓ | Test memory usage |
| Expo modules | ❓ | ❓ | Verify each module |

---

## 🎯 Priority Research Order

1. **HIGHEST PRIORITY:**
   - Hermes version shipped with RN 0.81.4
   - Known Hermes string operation bugs
   - iOS 18.1 and 26.1 compatibility matrix

2. **HIGH PRIORITY:**
   - React 19 + React Native compatibility
   - Background thread safety patterns
   - Expo SDK 54 iOS 18+ known issues

3. **MEDIUM PRIORITY:**
   - Native module compatibility
   - TypeScript configuration issues
   - Build configuration optimization

4. **LOWER PRIORITY:**
   - Platform-specific code patterns
   - Memory optimization
   - Performance tuning

---

## 📝 Research Action Plan

### Phase 1: Version Compatibility (Day 1)
1. Check Expo SDK 54 compatibility matrix
2. Verify Hermes version in RN 0.81.4
3. Search for known iOS 18/26 issues
4. Review React 19 + RN compatibility

### Phase 2: Crash Pattern Analysis (Day 1-2)
1. Search Hermes GitHub for string operation crashes
2. Check React Native issues for similar crash signatures
3. Review Expo forums for iOS 18/26 crashes
4. Analyze crash symbolication for specific code paths

### Phase 3: Code Pattern Review (Day 2-3)
1. Audit all string operations
2. Review all async operations and cleanup
3. Check context provider patterns
4. Verify thread safety of all background tasks

### Phase 4: Testing & Validation (Day 3-4)
1. Create minimal reproduction case
2. Test with different Hermes configurations
3. Test with React 18 vs React 19
4. Test with simplified context structure

---

## 🔍 Specific GitHub Searches

```bash
# Hermes issues
site:github.com/facebook/hermes stringPrototypeReplace crash
site:github.com/facebook/hermes SIGSEGV iOS

# React Native issues
site:github.com/facebook/react-native iOS 18 crash
site:github.com/facebook/react-native std::terminate

# Expo issues  
site:github.com/expo/expo iOS 26 crash
site:github.com/expo/expo SDK 54 iOS 18

# React issues
site:github.com/facebook/react React 19 React Native crash
```

---

## 💡 Key Questions to Answer

1. **Can we downgrade React to 18.x for stability?**
2. **Should we upgrade to Expo SDK 55 or newer?**
3. **Is there a stable RN version for iOS 18+?**
4. **Can we disable Hermes and use JSC instead?**
5. **Should we move to bare workflow for better control?**
6. **Are there alternative patterns for our context structure?**
7. **Should we implement stricter error boundaries?**
8. **Do we need to set explicit iOS deployment target?**

---

## 🚀 Expected Outcomes

After completing this research, we should know:

✅ Exact compatibility requirements for iOS 18+ and 26+
✅ Whether to upgrade/downgrade any dependencies  
✅ Specific code patterns causing crashes
✅ Required configuration changes
✅ Testing strategy to prevent future crashes
✅ Whether architecture changes are needed

---

**Next Steps:** Start with Research Prompt #1 (Hermes compatibility) as it's the most likely culprit based on the crash logs.

