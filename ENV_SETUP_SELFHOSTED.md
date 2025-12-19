# Environment Setup for Self-Hosted Supabase

## 🎯 Quick Reference

Your self-hosted infrastructure:
- **Main API**: `https://api.build-desk.com` (Kong, Auth, Database, Storage)
- **Edge Functions**: `https://functions.build-desk.com` (163 functions)

---

## 📋 Web App Environment Variables

Create `.env` in project root:

```env
# Self-Hosted Supabase
VITE_SUPABASE_URL=https://api.build-desk.com
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
VITE_EDGE_FUNCTIONS_URL=https://functions.build-desk.com

# Optional
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_POSTHOG_API_KEY=your-posthog-key
```

### Get Your Keys

From your self-hosted Supabase:
```bash
# In your Supabase docker directory
cat docker/.env | grep ANON_KEY
cat docker/.env | grep SERVICE_ROLE_KEY
```

---

## 📱 Mobile App Environment Variables

Create `mobile-app/.env`:

```env
# Self-Hosted Supabase
EXPO_PUBLIC_SUPABASE_URL=https://api.build-desk.com
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
EXPO_PUBLIC_EDGE_FUNCTIONS_URL=https://functions.build-desk.com
EXPO_PUBLIC_API_BASE_URL=https://api.build-desk.com

# App Config
EXPO_PUBLIC_APP_NAME=BuildDesk
EXPO_PUBLIC_APP_VERSION=1.0.0
```

---

## ☁️ Cloudflare Pages Environment Variables

In Cloudflare Pages dashboard → Settings → Environment variables:

```
VITE_SUPABASE_URL=https://api.build-desk.com
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
VITE_EDGE_FUNCTIONS_URL=https://functions.build-desk.com
```

---

## 🔄 Migration Steps

### 1. Update Local Development

```bash
# Copy example file
cp env.example .env

# Edit .env with your self-hosted URLs
nano .env
```

Update these values:
- `VITE_SUPABASE_URL`: Change to `https://api.build-desk.com`
- `VITE_EDGE_FUNCTIONS_URL`: Add `https://functions.build-desk.com`
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Use your self-hosted anon key

### 2. Test Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# In another terminal, test edge functions
curl https://functions.build-desk.com/_health
```

### 3. Update Production

#### Cloudflare Pages
1. Go to https://dash.cloudflare.com
2. Select your Pages project
3. Go to Settings → Environment variables
4. Update `VITE_SUPABASE_URL` to `https://api.build-desk.com`
5. Add `VITE_EDGE_FUNCTIONS_URL` = `https://functions.build-desk.com`
6. Update `VITE_SUPABASE_PUBLISHABLE_KEY` with new key
7. Redeploy

#### Coolify (if using)
1. Go to your Coolify dashboard
2. Select your application
3. Go to Environment variables
4. Update the same variables as above
5. Redeploy

---

## 🧪 Testing Your Setup

### Test Main API (Auth, Database, Storage)

```bash
# Test auth health
curl https://api.build-desk.com/auth/v1/health

# Test database access
curl https://api.build-desk.com/rest/v1/ \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Test storage
curl https://api.build-desk.com/storage/v1/bucket \
  -H "apikey: YOUR_ANON_KEY"
```

### Test Edge Functions

```bash
# Test health endpoint
curl https://functions.build-desk.com/_health

# Should return:
# {
#   "status": "healthy",
#   "timestamp": "2025-12-17T...",
#   "functions": ["ai-content-generator", ...]
# }

# Test specific function
curl -X POST https://functions.build-desk.com/ai-content-generator \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"prompt": "test"}'
```

---

## 🔍 Verify Configuration

### In Your Browser Console

Once your app is running, open browser console and look for:

```
Supabase Configuration: {
  mainApiUrl: "https://api.build-desk.com",
  edgeFunctionsUrl: "https://functions.build-desk.com",
  isSelfHosted: true
}
```

### In Your Application

The updated client will automatically detect self-hosted setup and log the configuration in development mode.

---

## 🐛 Troubleshooting

### Issue: "Missing Supabase configuration"

**Solution**: Ensure `.env` file exists and contains:
```env
VITE_SUPABASE_URL=https://api.build-desk.com
VITE_SUPABASE_PUBLISHABLE_KEY=your-key
```

### Issue: CORS errors

**Solution**: Check your Kong configuration in self-hosted Supabase allows your domains:
```yaml
# In Kong configuration
cors_origins:
  - https://builddesk.com
  - https://www.builddesk.com
  - https://*.build-desk.com
```

### Issue: Edge functions returning 404

**Solution**: 
1. Verify functions are deployed: `curl https://functions.build-desk.com/_health`
2. Check function name matches exactly
3. Ensure edge functions container is running

### Issue: Authentication fails

**Solution**:
1. Verify anon key matches your self-hosted instance
2. Check key is being sent in requests (check Network tab)
3. Verify Kong is running: `curl https://api.build-desk.com/auth/v1/health`

---

## ✅ Checklist

Before deploying to production:

- [ ] `.env` file created with self-hosted URLs
- [ ] Anon key updated
- [ ] Edge functions URL added
- [ ] Local development works
- [ ] Can authenticate
- [ ] Can access database
- [ ] Edge functions work
- [ ] Cloudflare Pages environment variables updated
- [ ] Mobile app environment variables updated (if applicable)
- [ ] Production deployment successful
- [ ] All features tested

---

## 📞 Need Help?

1. Check [SELF_HOSTED_MIGRATION.md](./SELF_HOSTED_MIGRATION.md) for detailed migration guide
2. Review application logs
3. Check edge function logs: `docker logs supabase-edge-functions -f`
4. Verify DNS: `nslookup api.build-desk.com`
5. Test connectivity: `curl -v https://api.build-desk.com/rest/v1/`

---

**🎉 Ready to go!** Your application will now use your self-hosted Supabase infrastructure.

