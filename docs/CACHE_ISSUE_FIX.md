# Cache Issue Fix Guide

## 🔴 The Problem

Your website is showing "Failed to fetch dynamically imported module" errors because:

1. **Service Worker Caching**: Your service worker is caching the `index.html` file
2. **Asset Hash Mismatch**: Each build generates new JS files with new hashes (e.g., `index-D7bzndJU.js`)
3. **Stale Cache**: Users' browsers serve the old cached HTML that references old JS files (e.g., `Index-CJ2hpyW0.js`) that no longer exist on the server

## ✅ Immediate Fix (For Users)

### Option 1: Hard Refresh (Quickest)
- **Windows/Linux**: Press `Ctrl + Shift + R` or `Ctrl + F5`
- **Mac**: Press `Cmd + Shift + R`

### Option 2: Clear Service Worker
1. Open DevTools (F12)
2. Go to **Application** tab → **Service Workers**
3. Click **Unregister** on any active service workers
4. Go to **Application** tab → **Storage**
5. Click **Clear site data**
6. Refresh the page

### Option 3: Clear Browser Cache
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select **"Empty Cache and Hard Reload"**

## 🔧 Permanent Fix (For Developers)

### What We've Implemented

#### 1. Dynamic Cache Versioning
The service worker now uses a build-time timestamp instead of a manual version:

```javascript
// Before
const CACHE_NAME = 'builddesk-v2025.1.12';

// After
const BUILD_VERSION = '__BUILD_VERSION__';
const CACHE_NAME = `builddesk-v${BUILD_VERSION}`;
```

#### 2. Build-Time Version Injection
A new script (`scripts/update-sw-version.js`) automatically injects a unique version into the service worker during each build:

```javascript
const BUILD_VERSION = Date.now().toString(); // Unix timestamp
```

#### 3. Automatic SW Copy
The Vite config now automatically copies the service worker to the `dist/` folder during production builds.

#### 4. Updated Build Process
The build script now includes:
```bash
npm run build
# Runs: sitemap generation → vite build → copy 404 → update SW version
```

### Testing the Fix

1. **Build locally:**
   ```bash
   npm run build
   ```

2. **Verify the service worker:**
   ```bash
   # Check that dist/sw.js exists and has a timestamp version
   cat dist/sw.js | grep "BUILD_VERSION"
   ```

3. **Deploy to Cloudflare:**
   ```bash
   git add .
   git commit -m "fix: implement dynamic service worker versioning"
   git push
   ```

4. **After deployment, purge Cloudflare cache:**
   - Go to Cloudflare dashboard
   - Navigate to Caching → Configuration
   - Click "Purge Everything"
   - OR use the purge script:
     ```bash
     node scripts/purge-cloudflare-cache.js
     ```

## 🚀 Next Deployment

After pushing these changes:

1. **Wait for Cloudflare Pages build to complete** (~2-3 minutes)
2. **Purge Cloudflare cache** (crucial!)
3. **Clear your browser cache** with a hard refresh
4. **Verify** the site loads correctly

## 🔍 Debugging

### Check Current Service Worker Version

Open DevTools Console and run:
```javascript
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => console.log('SW:', reg));
});
```

### Check Cache Contents

```javascript
caches.keys().then(names => {
  console.log('Caches:', names);
  names.forEach(name => {
    caches.open(name).then(cache => {
      cache.keys().then(keys => {
        console.log(`Cache ${name}:`, keys.length, 'entries');
      });
    });
  });
});
```

### Force Clear All Caches (Dev Console)

```javascript
caches.keys().then(names => {
  Promise.all(names.map(name => caches.delete(name)))
    .then(() => console.log('All caches cleared!'));
});
```

## 📝 Best Practices Going Forward

1. **Always purge Cloudflare cache after deployments**
2. **Test in an incognito window** to simulate first-time visitors
3. **Monitor service worker updates** in production
4. **Consider adding a "New version available" banner** for users

## 🛠️ Optional: Auto-Purge Script

You can automate cache purging by adding to your CI/CD:

```yaml
# .github/workflows/deploy.yml
- name: Purge Cloudflare Cache
  run: node scripts/purge-cloudflare-cache.js
  env:
    CLOUDFLARE_ZONE_ID: ${{ secrets.CLOUDFLARE_ZONE_ID }}
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

## ❓ FAQ

**Q: Why does this happen?**
A: Vite generates unique hashes for JS files on each build. The service worker caches the old HTML which references old hashes.

**Q: Won't this break offline functionality?**
A: No! The service worker still caches assets, but now it properly invalidates old caches on new deployments.

**Q: How often should I purge Cloudflare cache?**
A: After every deployment that changes JS/CSS files (most deployments).

**Q: Can I disable the service worker?**
A: Yes, but you'll lose offline functionality and performance benefits. Better to fix the caching strategy.

## 📞 Support

If issues persist:
1. Check browser console for specific errors
2. Verify service worker is using the new version system
3. Confirm Cloudflare cache was purged
4. Try testing in a completely different browser

---

**Status**: ✅ Fixed as of [Current Date]
**Next Review**: After next production deployment

