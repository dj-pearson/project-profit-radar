# Expo Build Troubleshooting Quick Guide

## 🚨 Emergency Fixes

### Build Fails with "Unable to resolve module X"

**Problem:** Metro can't find a module you're importing.

**Quick Fix:**
```bash
# 1. Check if package is installed
npm list <package-name>

# 2. If missing, install it
npx expo install <package-name>

# 3. If it's a web-only package (like react-router-dom), make it conditional:
```

```typescript
import { Platform } from 'react-native';

if (Platform.OS === 'web') {
  const Module = require('web-only-package');
}
```

---

### Build Fails with "no member named X in namespace Y"

**Problem:** Version mismatch between packages.

**Quick Fix:**
```bash
# This usually means React Native version is wrong
npx expo install --fix
```

---

### Build Fails with "Cannot find module './path/to/asset'"

**Problem:** Asset file doesn't exist at specified path.

**Quick Fix:**
1. Check the file exists: `ls public/icon.png`
2. Verify path in `app.config.js` matches exactly
3. Ensure path uses forward slashes: `./public/icon.png`

---

### Build Uploads are Slow (>200MB)

**Problem:** Uploading unnecessary files.

**Quick Fix:**
Create `.easignore`:
```
.git
.expo
dist
node_modules/.cache
*.log
docs
*.md
!README.md
```

---

### Dependency Conflicts During Install

**Problem:** Peer dependency version mismatches.

**Quick Fix:**
```bash
npm install --legacy-peer-deps
# OR
echo "legacy-peer-deps=true" > .npmrc
```

---

### "window is not defined" Error

**Problem:** Using web APIs in mobile code.

**Quick Fix:**
```typescript
const location = Platform.OS === 'web' && typeof window !== 'undefined' 
  ? window.location 
  : null;
```

---

### Capacitor and Expo Conflict

**Problem:** Both frameworks trying to control native code.

**Quick Fix:**
```bash
# Remove ALL Capacitor packages
npm uninstall @capacitor/android @capacitor/app @capacitor/camera @capacitor/cli @capacitor/core @capacitor/device @capacitor/filesystem @capacitor/geolocation @capacitor/ios @capacitor/local-notifications @capacitor/preferences @capacitor/push-notifications

# Remove config files
rm capacitor.config.ts capacitor.config.json
```

---

### "expo config" Command Fails

**Problem:** Syntax error in `app.config.js`.

**Quick Fix:**
1. Check for JavaScript syntax errors
2. Ensure all required fields are present
3. Test with: `node -c app.config.js`

---

### Build Succeeds but App Crashes on Launch

**Problem:** Runtime error in initialization code.

**Quick Fix:**
1. Check `App.tsx` and `app/_layout.tsx` for errors
2. Ensure all context providers are wrapped correctly
3. Test with `npx expo start` and check console

---

### "devDependencies Not Found" During Build

**Problem:** `NODE_ENV=production` in `eas.json`.

**Quick Fix:**
Remove `NODE_ENV` from all build profiles in `eas.json`:
```json
{
  "build": {
    "production": {
      "env": {
        // ❌ Remove this:
        // "NODE_ENV": "production"
      }
    }
  }
}
```

---

## 🔍 Diagnostic Commands

```bash
# Check what's wrong
npx expo install --check

# Auto-fix version issues
npx expo install --fix

# Validate configuration
npx expo config

# View project info
npx expo config --type public

# Clear all caches
npx expo start --clear

# Test export (simulates build)
npx expo export --platform ios
```

---

## 📋 Pre-Build Checklist

Before running `eas build`:

- [ ] `npx expo config` runs without errors
- [ ] `npx expo install --check` shows no issues
- [ ] All asset files exist
- [ ] `.easignore` created for faster uploads
- [ ] No web-only imports in mobile code
- [ ] Tested with `npx expo start`

---

## 🆘 Still Stuck?

1. **Check the logs:** Every `eas build` gives you a URL to detailed logs
2. **Search the error:** Google the exact error message + "expo"
3. **Check Expo forums:** https://forums.expo.dev
4. **Review the stack trace:** Often shows the exact file causing issues
5. **Simplify:** Comment out recent changes until it builds

---

## 💡 Pro Tips

- Always use `npx expo install` for Expo packages (not `npm install`)
- Test locally with `npx expo start` before pushing to EAS
- Use `--platform ios` or `--platform android` to isolate issues
- Check build logs at expo.dev for detailed errors
- Keep dependencies minimal - every package is a potential conflict

