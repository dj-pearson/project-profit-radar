# Fix SEO Analytics Errors

This guide will help you fix the 406 "Not Acceptable" and 500 "Internal Server Error" issues in your SEO Analytics pages.

## Issues Found

### 1. **406 Errors** - Missing Database Tables
- `seo_configurations` table missing
- `company_admin_settings` table missing

### 2. **500 Errors** - Edge Function Issues
- JWT signing was using placeholder code instead of proper RSA signing
- Google API authentication failing

### 3. **Navigation Issues**
- SEO Analytics (MCP) page is configured in navigation but may not be visible

## Fixes Applied

### ✅ Database Tables Fixed
Created migration: `supabase/migrations/20250115000000_fix_missing_tables.sql`

### ✅ Edge Functions Fixed
- Updated `google-analytics-api/index.ts` with proper JWT RSA signing
- Updated `google-search-console-api/index.ts` with proper JWT RSA signing

## Deployment Steps

### Step 1: Apply Database Migration
Run this SQL directly in your Supabase SQL editor:

```sql
-- Copy the entire contents of supabase/migrations/20250115000000_fix_missing_tables.sql
-- and run it in Supabase Dashboard > SQL Editor
```

### Step 2: Deploy Edge Functions
Deploy the updated Edge Functions:

```bash
npx supabase functions deploy google-analytics-api
npx supabase functions deploy google-search-console-api
```

### Step 3: Verify Supabase Secrets
Make sure these secrets are configured in Supabase Dashboard > Settings > Secrets:

- `GOOGLE_CLIENT_EMAIL`: Your service account email
- `GOOGLE_PRIVATE_KEY`: Your private key (with \n characters or actual newlines)
- `GA4_PROPERTY_ID`: 496297904
- `SEARCH_CONSOLE_SITE_URL`: https://build-desk.com

### Step 4: Test the Fixes

1. **Clear browser cache** and reload the application
2. Navigate to `/admin/seo-analytics` (SEO Analytics MCP)
3. Navigate to `/admin/seo-analytics-legacy` (SEO Analytics Legacy)
4. Check browser console for errors

## Expected Results

After applying these fixes:

### ✅ Database Issues Resolved
- No more 406 "Not Acceptable" errors
- `seo_configurations` and `company_admin_settings` tables available

### ✅ API Authentication Working
- Google Analytics API calls return data instead of 500 errors
- Google Search Console API calls work properly
- JWT tokens properly signed with RSA

### ✅ Navigation Available
- SEO Analytics (MCP) page accessible from admin sidebar
- Both analytics pages load without errors

## Testing Your Google API Setup

You can test if your credentials work by:

1. Opening browser dev tools
2. Going to SEO Analytics page
3. Looking for successful API calls instead of 500 errors
4. Data should load from Google Analytics and Search Console

## Troubleshooting

### If you still get 500 errors:
- Check Supabase Functions logs in Dashboard > Edge Functions
- Verify your private key format (should include `-----BEGIN PRIVATE KEY-----`)
- Ensure GA4 property ID is correct: 496297904

### If you get 406 errors:
- Run the migration SQL again
- Check if tables exist in Supabase Dashboard > Table Editor

### If navigation is missing:
- Hard refresh browser (Ctrl+F5)
- Check browser console for JavaScript errors

## Next Steps

Once these fixes are deployed:
1. Your SEO Analytics pages should load properly
2. Real Google Analytics data will display
3. No more "API credentials not configured" errors
4. Both MCP and Legacy analytics pages will work 