# 🔴 CRITICAL: Fix GoTrue SITE_URL Redirect Issue

## Problem
Google OAuth redirects to Supabase admin dashboard (`https://api.brikly.net/project/default`) instead of the application dashboard (`https://brikly.net/dashboard`).

## Root Cause
The `GOTRUE_SITE_URL` environment variable in your GoTrue service is set to `https://api.brikly.net` instead of `https://brikly.net`.

## Current Redirect Flow (WRONG)
1. User clicks "Sign in with Google" on `https://brikly.net`
2. Google OAuth redirects back to GoTrue
3. GoTrue uses `GOTRUE_SITE_URL` to redirect the user
4. User lands on `https://api.brikly.net/project/default#access_token=...` (Supabase Studio)

## Correct Redirect Flow (GOAL)
1. User clicks "Sign in with Google" on `https://brikly.net`
2. Google OAuth redirects back to GoTrue
3. GoTrue uses `GOTRUE_SITE_URL=https://brikly.net` to redirect
4. User lands on `https://brikly.net#access_token=...`
5. Frontend routing sends user to `https://brikly.net/dashboard`

---

## Fix Steps

### Step 1: Check Current GoTrue Configuration

In your Coolify dashboard or wherever you manage your Supabase deployment:

1. Navigate to your **GoTrue service** (Auth service)
2. Look for **Environment Variables**
3. Find these variables:

```bash
SITE_URL=???
GOTRUE_SITE_URL=???
```

### Step 2: Update GoTrue Environment Variables

You need to set:

```bash
SITE_URL=https://brikly.net
GOTRUE_SITE_URL=https://brikly.net
```

**NOT:**
```bash
❌ GOTRUE_SITE_URL=https://api.brikly.net  # WRONG!
❌ GOTRUE_SITE_URL=${SERVICE_URL_SUPABASEKONG}  # WRONG!
```

### Step 3: Restart GoTrue Service

After updating the environment variables, you **MUST** restart the GoTrue container/service:

**Option A: Via Coolify**
1. Go to your GoTrue service in Coolify
2. Click "Restart" or "Redeploy"
3. Wait for the service to come back online

**Option B: Via Docker (if direct access)**
```bash
# Find the GoTrue container
docker ps | grep gotrue

# Stop and remove the container
docker stop <gotrue-container-id>
docker rm <gotrue-container-id>

# Restart the service (Coolify will recreate it with new env vars)
# Or manually run the container with updated env vars
```

**Option C: Redeploy Entire Supabase Stack**
If Options A/B don't work, redeploy the entire Supabase stack in Coolify to force a fresh start with updated environment variables.

### Step 4: Verify the Fix

1. Clear your browser cookies for `brikly.net` and `api.brikly.net`
2. Go to `https://brikly.net/auth`
3. Click "Sign in with Google"
4. After Google auth, you should be redirected to `https://brikly.net#access_token=...`
5. The app should then route you to `https://brikly.net/dashboard`

---

## Troubleshooting

### Issue: Environment variable is set but not reflected in running container

Check what the running container actually sees:

```bash
# Find the GoTrue container ID
docker ps | grep gotrue

# Inspect environment variables
docker exec supabase-auth-v0os0wg0gw4ko04ww80sgg08 env | grep GOTRUE_SITE_URL
docker exec supabase-auth-v0os0wg0gw4ko04ww80sgg08 env | grep SITE_URL
```

If it still shows the old value:
1. **Stop and remove the container** completely
2. **Redeploy** via Coolify to create a fresh container with new env vars

### Issue: Still redirecting to api.brikly.net after restart

Possible causes:
1. **Cached OAuth callback**: Clear browser cookies and try again
2. **Multiple GoTrue instances**: Check if there are multiple GoTrue containers running
3. **Environment variable precedence**: Check if there's a config file overriding the env var
4. **Docker Compose**: If using Docker Compose, the env vars might be hardcoded in the compose file

### Issue: Can't find GOTRUE_SITE_URL in Coolify

If you're managing Supabase via a Docker Compose file in Coolify:
1. Check the compose file for the GoTrue service
2. Look for `environment:` section under the `auth` or `gotrue` service
3. Update it there and redeploy

---

## Additional Configuration

### Update Google OAuth Redirect URIs

Make sure your Google OAuth consent screen has the correct redirect URI:

```
https://api.brikly.net/auth/v1/callback
```

This should already be set correctly since OAuth is working - we're just fixing where GoTrue redirects **after** receiving the callback.

### Frontend OAuth Hash Handling

The frontend code in `Dashboard.tsx` and `Setup.tsx` already clears the OAuth hash to prevent any secondary redirects:

```typescript
useEffect(() => {
  if (window.location.hash.includes('access_token=')) {
    console.log('🔒 Clearing OAuth callback hash from URL...');
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}, []);
```

This ensures that once the user lands on the dashboard, they don't get redirected again.

---

## Expected Behavior After Fix

1. ✅ User clicks "Sign in with Google" on `https://brikly.net/auth`
2. ✅ Redirected to Google OAuth consent screen
3. ✅ After approval, Google sends callback to `https://api.brikly.net/auth/v1/callback`
4. ✅ GoTrue processes the OAuth callback
5. ✅ GoTrue redirects to `https://brikly.net#access_token=...&refresh_token=...`
6. ✅ Frontend detects authentication and routes to `https://brikly.net/dashboard`
7. ✅ OAuth hash is cleared from URL
8. ✅ User sees their dashboard with no redirect loops

---

## Summary

**The issue is NOT in the frontend** - the environment variables are correctly configured and being injected into the build.

**The issue IS in GoTrue** - the `GOTRUE_SITE_URL` environment variable must be set to `https://brikly.net` (your frontend URL), not `https://api.brikly.net` (your API URL).

After fixing this single environment variable and restarting GoTrue, Google OAuth will work correctly!

