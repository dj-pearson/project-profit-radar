# ✅ Self-Hosted Supabase Setup Complete!

## 🎉 What Was Done

Your codebase has been updated to support your self-hosted Supabase infrastructure:

### ✅ Infrastructure
- **Main API** (Kong, Auth, Database, Storage): `https://api.brikly.net`
- **Edge Functions** (163 functions): `https://functions.brikly.net`

### ✅ Code Updates

1. **Updated Supabase Client** (`src/integrations/supabase/client.ts`)
   - Now supports separate URLs for edge functions
   - Automatic detection of self-hosted vs cloud setup
   - Enhanced error handling for edge function calls
   - Backward compatible with cloud Supabase

2. **Updated Environment Validation** (`src/lib/envValidation.ts`)
   - Added `VITE_EDGE_FUNCTIONS_URL` support
   - URL validation for edge functions
   - Enhanced debug logging

3. **Created Documentation**
   - [SELF_HOSTED_MIGRATION.md](./SELF_HOSTED_MIGRATION.md) - Complete migration guide
   - [ENV_SETUP_SELFHOSTED.md](./ENV_SETUP_SELFHOSTED.md) - Quick setup reference
   - [SELF_HOSTED_SETUP_COMPLETE.md](./SELF_HOSTED_SETUP_COMPLETE.md) - This file

---

## 🚀 Next Steps

### 1️⃣ Update Environment Variables

Create `.env` in your project root:

```env
# Self-Hosted Supabase
VITE_SUPABASE_URL=https://api.brikly.net
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
VITE_EDGE_FUNCTIONS_URL=https://functions.brikly.net
```

### 2️⃣ Get Your Keys

From your self-hosted Supabase instance:

```bash
# SSH to your server or check your Supabase docker/.env file
# Look for ANON_KEY and SERVICE_ROLE_KEY
```

### 3️⃣ Test Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

You should see in the console:
```
Supabase Configuration: {
  mainApiUrl: "https://api.brikly.net",
  edgeFunctionsUrl: "https://functions.brikly.net",
  isSelfHosted: true
}
```

### 4️⃣ Test API Connectivity

```bash
# Test main API
curl https://api.brikly.net/auth/v1/health

# Test edge functions
curl https://functions.brikly.net/_health
```

### 5️⃣ Update Production

#### Cloudflare Pages
1. Go to your Cloudflare Pages dashboard
2. Navigate to: Your Project → Settings → Environment variables
3. Update:
   ```
   VITE_SUPABASE_URL=https://api.brikly.net
   VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
   VITE_EDGE_FUNCTIONS_URL=https://functions.brikly.net
   ```
4. Click "Save" and redeploy

#### Mobile App (if applicable)
1. Create `mobile-app/.env`:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://api.brikly.net
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   EXPO_PUBLIC_EDGE_FUNCTIONS_URL=https://functions.brikly.net
   ```
2. Rebuild: `npm run build`

---

## 📊 How It Works

### URL Routing

**Main API** (`https://api.brikly.net`):
```
/auth/v1/*      → Supabase Auth
/rest/v1/*      → PostgREST (Database)
/storage/v1/*   → Supabase Storage
/realtime/v1/*  → Realtime subscriptions
```

**Edge Functions** (`https://functions.brikly.net`):
```
/function-name  → Your edge functions
/_health        → Health check endpoint
```

### Client Configuration

The updated client automatically:
1. Detects if you're using self-hosted (by checking URL)
2. Routes edge function calls to the correct URL
3. Logs configuration in development mode
4. Provides better error messages

### Example Usage

```typescript
import { supabase, invokeEdgeFunction } from '@/integrations/supabase/client';

// Database query - uses api.brikly.net
const { data } = await supabase.from('companies').select('*');

// Edge function call - uses functions.brikly.net
const { data, error } = await invokeEdgeFunction('ai-content-generator', {
  body: { prompt: 'Generate content' }
});
```

---

## 🧪 Testing Checklist

- [ ] Local development starts without errors
- [ ] Console shows correct Supabase configuration
- [ ] Can authenticate (login/signup)
- [ ] Can access database (view data)
- [ ] Can upload files (storage)
- [ ] Edge functions work
- [ ] All 163 functions accessible via `/_health`
- [ ] Production deployment successful
- [ ] Mobile app works (if applicable)

---

## 🔄 Rollback Plan

If you need to rollback to cloud Supabase:

1. **Update environment variables:**
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-cloud-anon-key
   # Remove or comment out VITE_EDGE_FUNCTIONS_URL
   ```

2. **Redeploy**

The code is backward compatible, so no code changes needed!

---

## 📈 Monitoring

### Check Edge Functions Health

```bash
curl https://functions.brikly.net/_health
```

Returns:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-17T...",
  "runtime": "deno",
  "version": "1.44.0",
  "environment": {
    "supabaseUrlConfigured": true,
    "anonKeyConfigured": true,
    "serviceRoleKeyConfigured": true
  },
  "functions": [
    "ai-content-generator",
    "analytics-oauth-google",
    ...
  ]
}
```

### Check Grafana Dashboards

Access monitoring at:
- **Grafana**: `http://your-server:3000` (admin/admin)
- **Prometheus**: `http://your-server:9090`

---

## 🐛 Common Issues

### Issue: "Missing Supabase configuration"

**Solution**: Create `.env` file with required variables (see Step 1 above)

### Issue: CORS errors when calling APIs

**Solution**: Check Kong configuration in your self-hosted Supabase:
```yaml
cors_origins:
  - https://brikly.net
  - https://www.brikly.net
  - https://*.brikly.net
```

### Issue: Edge functions return 404

**Solution**:
1. Check functions are running: `docker ps | grep edge-functions`
2. Verify health endpoint: `curl https://functions.brikly.net/_health`
3. Check function name matches exactly

### Issue: Authentication fails

**Solution**:
1. Verify anon key is correct
2. Test auth endpoint: `curl https://api.brikly.net/auth/v1/health`
3. Check Network tab in browser DevTools

---

## 📚 Documentation

- **[ENV_SETUP_SELFHOSTED.md](./ENV_SETUP_SELFHOSTED.md)** - Quick setup guide
- **[SELF_HOSTED_MIGRATION.md](./SELF_HOSTED_MIGRATION.md)** - Complete migration guide
- **[edge-functions-template/COMPLETE_DEPLOYMENT_GUIDE.md](./edge-functions-template/COMPLETE_DEPLOYMENT_GUIDE.md)** - Edge functions deployment
- **[edge-functions-template/DOCUMENTATION_INDEX.md](./edge-functions-template/DOCUMENTATION_INDEX.md)** - All edge functions docs

---

## ✅ Summary

Your application is now configured to use:

| Service | Cloud Supabase (Old) | Self-Hosted (New) |
|---------|---------------------|-------------------|
| **Main API** | `*.supabase.co` | `api.brikly.net` |
| **Edge Functions** | `*.supabase.co/functions/v1/*` | `functions.brikly.net/*` |
| **Functions Count** | 163 | 163 ✓ |
| **Configuration** | Single URL | Separate URLs |
| **Code Changes** | None needed | Updated client |

### Benefits of Self-Hosted

✅ **Full Control** - Complete infrastructure control  
✅ **No Limits** - No API rate limits or function invocation limits  
✅ **Cost Predictable** - Fixed monthly cost  
✅ **Data Sovereignty** - All data stays in your infrastructure  
✅ **Customization** - Modify anything you need  
✅ **Performance** - Optimized for your use case  

---

## 🎉 You're Ready!

Your application is now fully configured for self-hosted Supabase. Just update your environment variables and deploy!

**Need help?** Check the documentation above or the troubleshooting section.

**Ready to deploy?** Follow ENV_SETUP_SELFHOSTED.md for step-by-step instructions.

