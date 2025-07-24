# Debug SEO Analytics 500 Errors

## Current Status
You're still getting 500 "Internal Server Error" and "non-2xx status code" errors. Let's debug this systematically.

## Step 1: Deploy Updated Edge Function
The Edge Function now has extensive logging to help debug the issue.

### Deploy Command
```bash
# Make sure you're in the project-profit-radar directory
cd project-profit-radar

# Deploy the updated function with debug logging
supabase functions deploy google-analytics-api
```

## Step 2: Check Function Logs
After deployment, check the Supabase Function logs to see exactly what's failing:

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Click on **google-analytics-api**
3. Click on **Logs** tab
4. Try to load your SEO Analytics page again
5. Check the logs for detailed error messages

## Step 3: Verify Credentials Format

Based on our debugging function, check these in **Supabase Dashboard** → **Settings** → **Secrets**:

### Expected Log Messages:
If credentials are properly set, you should see:
```
Client Email exists: true
Private Key exists: true  
GA4 Property ID exists: true
```

### If Missing Credentials:
You'll see specific debug info showing:
- `clientEmailLength`: Should be > 30 characters
- `privateKeyLength`: Should be > 1500 characters  
- `propertyId`: Should be "496297904"

## Step 4: Check Private Key Format

The most common issue is private key format. In Supabase Secrets, your `GOOGLE_PRIVATE_KEY` should look like:

**Option A (with \n characters):**
```
-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7...\n-----END PRIVATE KEY-----\n
```

**Option B (with actual newlines):**
```
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7...
...
-----END PRIVATE KEY-----
```

## Step 5: Expected Debug Flow

With the updated function, you should see these logs in order:

1. `=== Google Analytics API Function Called ===`
2. `User authenticated as root_admin`
3. `Request data: {action: "get-metrics"}`
4. `Checking credentials...`
5. `All credentials found, attempting to get access token...`
6. `Creating JWT token...`
7. `Creating JWT with proper RSA signing...`
8. `Parsing private key...`
9. `Private key parsed successfully, bytes length: XXXX`
10. `Data signed successfully`
11. `JWT created, requesting token from Google...`
12. `Token response status: 200`
13. `Access token obtained successfully`

## Step 6: Common Error Patterns

### If you see "Private key parsing failed":
- Your private key format is wrong
- Copy exactly what's inside the quotes from your JSON file
- Include `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`

### If you see "Data signing failed":
- The private key might be corrupted
- Try downloading a new service account key from Google Cloud Console

### If you see "Failed to get access token":
- Check if your service account has the right permissions
- Verify the service account email is correct

## Step 7: Test Command

Once deployed, test the function manually:

1. Go to your SEO Analytics page: `https://build-desk.com/admin/seo-analytics`
2. Open browser dev tools (F12)
3. Look for the POST request to `google-analytics-api`
4. Check if it returns 200 (success) or 500 (error)
5. Look at the response body for detailed error messages

## Step 8: Expected Success Response

When working correctly, you should see this response:
```json
{
  "success": true,
  "message": "Google Analytics API function is working",
  "data": {
    "test": true,
    "action": "get-metrics",
    "propertyId": "496297904",
    "tokenGenerated": true
  }
}
```

## Quick Verification Steps

1. **Deploy the function**: `supabase functions deploy google-analytics-api`
2. **Check function exists**: Go to Supabase Dashboard → Edge Functions
3. **Test the page**: Visit `/admin/seo-analytics`  
4. **Check logs**: Look at Function logs in Supabase Dashboard
5. **Verify response**: Should see success message instead of 500 error

## Next Steps After Success

Once the debugging function works and shows "tokenGenerated: true", we can restore the full Analytics API functionality.

Let me know what you see in the logs after deploying this debug version! 