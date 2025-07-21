# Supabase Environment Variables Setup

## Required Environment Variables for SEO Analytics

### Google OAuth Credentials
```bash
GOOGLE_OAuth_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
GOOGLE_OAuth_CLIENT_SECRET=GOCSPX-your_secret_here
```

### Microsoft OAuth Credentials  
```bash
Bing_Web_Client=12345678-1234-1234-1234-123456789abc
Bing_Web_Secret=your_microsoft_secret_here
```

## How to Add Environment Variables to Supabase

### Method 1: Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Edge Functions**
3. Click **"Environment Variables"**
4. Add each variable:
   - Variable name: `GOOGLE_OAuth_CLIENT_ID`
   - Value: Your Google client ID
   - Click **"Add"**
5. Repeat for all variables above

### Method 2: Supabase CLI
```bash
# Set Google credentials
supabase secrets set GOOGLE_OAuth_CLIENT_ID=your_google_client_id
supabase secrets set GOOGLE_OAuth_CLIENT_SECRET=your_google_client_secret

# Set Bing credentials
supabase secrets set Bing_Web_Client=your_bing_client_id
supabase secrets set Bing_Web_Secret=your_bing_client_secret
```

### Method 3: Environment File (Local Development)
Create `.env.local` in your `supabase/functions/` directory:
```bash
GOOGLE_OAuth_CLIENT_ID=your_google_client_id
GOOGLE_OAuth_CLIENT_SECRET=your_google_client_secret
Bing_Web_Client=your_bing_client_id
Bing_Web_Secret=your_bing_client_secret
```

## Verification Steps

### 1. Test Google OAuth URL Generation
```bash
curl -X POST https://[project].supabase.co/functions/v1/seo-analytics \
  -H "Content-Type: application/json" \
  -d '{"action": "get_google_auth_url"}'
```

### 2. Test Microsoft OAuth URL Generation  
```bash
curl -X POST https://[project].supabase.co/functions/v1/seo-analytics \
  -H "Content-Type: application/json" \
  -d '{"action": "get_microsoft_auth_url"}'
```

### 3. Expected Success Response
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

### 4. Expected Error Response (Before Setup)
```json
{
  "error": "Google OAuth credentials not configured",
  "requiresSetup": true
}
```

## Security Notes

- **Never commit credentials** to version control
- Use different credentials for **development** vs **production**
- **Rotate secrets** regularly
- Limit **redirect URIs** to your actual domains
- Set appropriate **scopes** (readonly for safety)

## Required Scopes

### Google Search Console
```
https://www.googleapis.com/auth/webmasters.readonly
```

### Microsoft Bing Webmaster
```
https://api.bing.microsoft.com/webmaster.read
```

## Website Verification Required

After OAuth setup, you'll also need to verify website ownership:

### Google Search Console
1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add property: `https://build-desk.com`
3. Verify ownership using HTML file upload or DNS record

### Bing Webmaster Tools
1. Go to [Bing Webmaster Tools](https://www.bing.com/webmasters)
2. Add site: `https://build-desk.com` 
3. Verify ownership using XML file or meta tag

## Troubleshooting

### Common Issues:
1. **"Invalid redirect URI"** - Check redirect URIs match exactly
2. **"Client not found"** - Verify client ID is correct
3. **"Insufficient permissions"** - Check API permissions and scopes
4. **"Site not verified"** - Complete website verification first

### Debug Mode:
Enable debug logging in the edge function:
```typescript
console.log('Client ID:', Deno.env.get('GOOGLE_OAuth_CLIENT_ID')?'Set':'Missing');
``` 