# OAuth Setup Implementation Checklist

## Phase 1: Google Cloud Console Setup ☁️

### □ **Step 1.1: Create/Select Project**
- [ ] Go to [Google Cloud Console](https://console.cloud.google.com)
- [ ] Create new project: "Brikly SEO Analytics"
- [ ] Note the project ID: `_______________________`

### □ **Step 1.2: Enable Required APIs**
- [ ] Navigate to **APIs & Services** → **Library**
- [ ] Search and enable: **Google Search Console API**
- [ ] Search and enable: **Google Analytics Reporting API** (optional)

### □ **Step 1.3: Configure OAuth Consent Screen**
- [ ] Go to **APIs & Services** → **OAuth consent screen**
- [ ] Choose **External** user type
- [ ] Fill in required fields:
  - **App name**: Brikly SEO Analytics
  - **User support email**: your-email@brikly.net
  - **Developer contact**: your-email@brikly.net
- [ ] Add authorized domains: `brikly.net`, `supabase.co`
- [ ] Add scopes: `https://www.googleapis.com/auth/webmasters.readonly`

### □ **Step 1.4: Create OAuth 2.0 Credentials**
- [ ] Go to **APIs & Services** → **Credentials**
- [ ] Click **"+ CREATE CREDENTIALS"** → **OAuth 2.0 Client IDs**
- [ ] Application type: **Web application**
- [ ] Name: Brikly SEO OAuth
- [ ] **Authorized redirect URIs**: 
  ```
  https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/seo-analytics
  ```
- [ ] Download JSON credentials file
- [ ] Extract and note:
  - **Client ID**: `_______________________`
  - **Client Secret**: `_______________________`

---

## Phase 2: Microsoft Azure Setup 🔷

### □ **Step 2.1: Create App Registration**
- [ ] Go to [Azure Portal](https://portal.azure.com)
- [ ] Navigate to **Azure Active Directory** → **App registrations**
- [ ] Click **"New registration"**

### □ **Step 2.2: Configure Application**
- [ ] **Name**: Brikly Bing Analytics
- [ ] **Supported account types**: Accounts in any organizational directory and personal Microsoft accounts
- [ ] **Redirect URI**: Web platform
  ```
  https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/seo-analytics
  ```
- [ ] Click **Register**

### □ **Step 2.3: Get Application Credentials**
- [ ] Note **Application (client) ID**: `_______________________`
- [ ] Go to **Certificates & secrets**
- [ ] Click **"New client secret"**
- [ ] Description: Brikly SEO Access
- [ ] Expires: 24 months
- [ ] Note **Client secret value**: `_______________________`

### □ **Step 2.4: Configure API Permissions**
- [ ] Go to **API permissions**
- [ ] Click **"Add a permission"**
- [ ] Add **Microsoft Graph** → **Delegated permissions**
- [ ] Search and add: **User.Read**
- [ ] **Grant admin consent** (if you have admin rights)

---

## Phase 3: Supabase Configuration ⚡

### □ **Step 3.1: Add Environment Variables**
Choose one method:

#### **Option A: Supabase Dashboard**
- [ ] Go to your [Supabase Dashboard](https://supabase.com/dashboard)
- [ ] Select your project: Brikly
- [ ] Navigate to **Settings** → **Edge Functions**
- [ ] Add environment variables:
  - [ ] `GOOGLE_OAuth_CLIENT_ID` = (from Step 1.4)
  - [ ] `GOOGLE_OAuth_CLIENT_SECRET` = (from Step 1.4)
  - [ ] `Bing_Web_Client` = (from Step 2.3)
  - [ ] `Bing_Web_Secret` = (from Step 2.3)

#### **Option B: Supabase CLI**
```bash
supabase secrets set GOOGLE_OAuth_CLIENT_ID="your_google_client_id"
supabase secrets set GOOGLE_OAuth_CLIENT_SECRET="your_google_client_secret"
supabase secrets set Bing_Web_Client="your_bing_client_id"
supabase secrets set Bing_Web_Secret="your_bing_client_secret"
```

### □ **Step 3.2: Deploy Edge Function**
- [ ] Redeploy the seo-analytics function:
```bash
supabase functions deploy seo-analytics
```

---

## Phase 4: Website Verification 🌐

### □ **Step 4.1: Google Search Console**
- [ ] Go to [Google Search Console](https://search.google.com/search-console)
- [ ] Click **"Add Property"**
- [ ] Choose **URL prefix**: `https://brikly.net`
- [ ] Verify ownership using one of:
  - [ ] HTML file upload to your website root
  - [ ] DNS TXT record
  - [ ] Google Analytics account (if linked)
  - [ ] Google Tag Manager

### □ **Step 4.2: Bing Webmaster Tools**
- [ ] Go to [Bing Webmaster Tools](https://www.bing.com/webmasters)
- [ ] Click **"Add a site"**
- [ ] Enter: `https://brikly.net`
- [ ] Verify ownership using:
  - [ ] XML file upload
  - [ ] Meta tag in HTML head
  - [ ] DNS CNAME record

---

## Phase 5: Testing & Verification ✅

### □ **Step 5.1: Test OAuth URLs**
- [ ] Test Google OAuth URL generation:
```bash
curl -X POST https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/seo-analytics \
  -H "Content-Type: application/json" \
  -d '{"action": "get_google_auth_url"}'
```

- [ ] Test Microsoft OAuth URL generation:
```bash
curl -X POST https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/seo-analytics \
  -H "Content-Type: application/json" \
  -d '{"action": "get_microsoft_auth_url"}'
```

### □ **Step 5.2: Test OAuth Flow**
- [ ] Go to SEO Analytics page in your app
- [ ] Click **"Connect Google"** button
- [ ] Complete OAuth authorization
- [ ] Verify success message
- [ ] Click **"Connect Bing"** button  
- [ ] Complete OAuth authorization
- [ ] Verify success message

### □ **Step 5.3: Test Data Retrieval**
- [ ] Click **"Refresh Data"** in SEO Analytics
- [ ] Verify no more "Failed to fetch" errors
- [ ] Check for real SEO data (may take 24-48 hours for initial data)

---

## Phase 6: Production Considerations 🚀

### □ **Step 6.1: Security Review**
- [ ] Rotate client secrets regularly
- [ ] Limit OAuth scopes to minimum required
- [ ] Monitor OAuth usage in cloud consoles
- [ ] Set up alerts for failed authentications

### □ **Step 6.2: Data Privacy**
- [ ] Review data retention policies
- [ ] Ensure compliance with GDPR/CCPA
- [ ] Document what data is collected
- [ ] Provide user opt-out mechanisms

### □ **Step 6.3: Monitoring**
- [ ] Set up logging for OAuth failures
- [ ] Monitor API quota usage
- [ ] Set up alerts for credential expiration
- [ ] Regular testing of OAuth flows

---

## Quick Reference 📋

### Your Supabase Project Details:
- **Project ID**: ilhzuvemiuyfuxfegtlv
- **Redirect URI**: `https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/seo-analytics`

### Required Credentials:
- [ ] Google Client ID: `_______________________`
- [ ] Google Client Secret: `_______________________`
- [ ] Bing Client ID: `_______________________`
- [ ] Bing Client Secret: `_______________________`

### Success Indicators:
- ✅ OAuth URL generation works without errors
- ✅ Authorization flow completes successfully
- ✅ SEO data refreshes without "Failed to fetch" errors
- ✅ Real search console data appears in dashboard 