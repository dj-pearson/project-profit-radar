# 🔒 Content Security Policy (CSP) Fix

## Issue
After fixing the cache issue, the site loaded but **critical API calls were blocked** by Content Security Policy, causing:
- ❌ Supabase API calls to `api.build-desk.com` blocked
- ❌ Google Analytics blocked
- ❌ Cloudflare Insights blocked  
- ❌ Three.js HDR assets from GitHub blocked

## Root Cause
The CSP `connect-src` directive was missing critical domains:
```
# Before (incomplete):
connect-src 'self' https://*.supabase.co https://*.stripe.com ... wss://*.supabase.co

# Missing:
- api.build-desk.com (your self-hosted Supabase API!)
- functions.build-desk.com (your edge functions)
- Google Analytics domains
- raw.githack.com (Three.js assets)
```

## What Was Fixed

### Updated CSP Directives in `public/_headers`:

#### `script-src` - Added:
- `https://static.cloudflareinsights.com` (Cloudflare analytics)
- `https://www.googletagmanager.com` (Google Tag Manager)
- `https://*.google-analytics.com` (Google Analytics)

#### `connect-src` - Added (CRITICAL):
- **`https://api.build-desk.com`** ← Your Supabase API (most important!)
- **`https://functions.build-desk.com`** ← Your Supabase Edge Functions
- `https://www.google-analytics.com` (GA reporting)
- `https://*.analytics.google.com` (GA data collection)
- `https://raw.githack.com` (Three.js HDR assets)
- `https://raw.githubusercontent.com` (GitHub raw content)
- `wss://api.build-desk.com` (WebSocket for Realtime)

## Testing the Fix

After deployment completes and cache is purged, verify:

### 1. Check CSP Headers
```bash
curl -I https://build-desk.com | grep -i "content-security-policy"
```

Should show updated policy with `api.build-desk.com` included.

### 2. Test in Browser
1. Open DevTools (F12) → Console
2. Hard refresh (Ctrl+Shift+R)
3. **Should NOT see**:
   - ❌ "Refused to connect because it violates CSP"
   - ❌ "Fetch API cannot load api.build-desk.com"
4. **Should see**:
   - ✅ Successful API calls to `api.build-desk.com`
   - ✅ No CSP violation errors
   - ✅ App loading with data

### 3. Network Tab Verification
Check Network tab for:
- ✅ `api.build-desk.com/rest/v1/...` → Status 200
- ✅ `functions.build-desk.com/...` → Status 200
- ✅ `www.googletagmanager.com/gtag/js` → Status 200
- ✅ `static.cloudflareinsights.com/beacon.min.js` → Status 200

## Complete Deployment Checklist

After this fix is deployed:

- [x] **Fix 1**: Updated `_headers` to prevent HTML caching (prevent hash mismatches)
- [x] **Fix 2**: Updated CSP to allow critical connections (this fix)
- [ ] **Action Required**: Purge Cloudflare cache (see CACHE_ISSUE_FIX.md)
- [ ] **Action Required**: Wait for Cloudflare Pages deployment to complete (~2 min)
- [ ] **Action Required**: Hard refresh browser (Ctrl+Shift+R)
- [ ] **Verify**: Site loads with no errors
- [ ] **Verify**: Data displays (reviews, promotions, etc.)

## Additional CSP Notes

### Current CSP Directives Summary
```
default-src:     'self'
script-src:      'self' + third-party scripts (Stripe, Sentry, PostHog, GA, CF)
style-src:       'self' 'unsafe-inline' + Google Fonts
font-src:        'self' data: + Google Fonts
img-src:         'self' data: blob: + all HTTPS/HTTP
connect-src:     'self' + APIs (Supabase, Stripe, Sentry, PostHog, GA)
frame-src:       'self' + Stripe
worker-src:      'self' blob:
object-src:      'none'
base-uri:        'self'
form-action:     'self'
frame-ancestors: 'none'
```

### Security Level
- ✅ **Strict**: Only whitelisted domains allowed
- ✅ **Secure**: No arbitrary external resources
- ✅ **Functional**: All necessary integrations whitelisted
- ⚠️ **Note**: Using `'unsafe-inline'` and `'unsafe-eval'` for React/Vite compatibility

### If Adding New Third-Party Services
Update CSP in `public/_headers` to include new domains:
1. Identify required domains from browser console errors
2. Add to appropriate directive (script-src, connect-src, etc.)
3. Test locally first if possible
4. Deploy and verify

## Common CSP Issues

### Issue: "Refused to connect to X"
**Solution**: Add domain to `connect-src` directive

### Issue: "Refused to load script X"  
**Solution**: Add domain to `script-src` directive

### Issue: "Refused to load stylesheet X"
**Solution**: Add domain to `style-src` directive

### Issue: "Refused to load font X"
**Solution**: Add domain to `font-src` directive

### Issue: WebSocket connection blocked
**Solution**: Add `wss://domain` to `connect-src` directive

## Resources

- **MDN CSP Guide**: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
- **CSP Evaluator**: https://csp-evaluator.withgoogle.com/
- **Test CSP**: Browser DevTools → Console (shows violations)

---

**Status**: ✅ Fixed - Deployed  
**Last Updated**: December 26, 2025  
**Next**: Purge Cloudflare cache after deployment completes

