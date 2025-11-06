# Email Sync Setup Guide

This guide will help you set up Gmail and Outlook email synchronization for your CRM.

## Prerequisites
- Supabase project configured
- Email sync tables migrated
- User authentication working

---

## 🔵 Gmail OAuth Setup

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Gmail API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"

### Step 2: Configure OAuth Consent Screen
1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in required fields:
   - App name: "Your CRM Name"
   - User support email: your email
   - Developer contact: your email
4. Add scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.modify`
5. Add test users (your email addresses)

### Step 3: Create OAuth Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Application type: "Web application"
4. Name: "CRM Email Sync"
5. Authorized redirect URIs:
   ```
   http://localhost:3000/auth/gmail/callback
   https://your-domain.com/auth/gmail/callback
   https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/gmail-oauth-callback
   ```
6. Click "Create"
7. **Save the Client ID and Client Secret**

### Step 4: Add to Supabase Secrets
Add these secrets to your Supabase project:
- `GOOGLE_CLIENT_ID`: Your OAuth Client ID
- `GOOGLE_CLIENT_SECRET`: Your OAuth Client Secret
- `GMAIL_REDIRECT_URI`: `https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/gmail-oauth-callback`

---

## 🟦 Outlook/Microsoft OAuth Setup

### Step 1: Register Azure AD Application
1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" > "App registrations"
3. Click "New registration"
4. Fill in details:
   - Name: "Your CRM Email Sync"
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI: Web - `https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/outlook-oauth-callback`
5. Click "Register"

### Step 2: Configure API Permissions
1. In your app, go to "API permissions"
2. Click "Add a permission"
3. Select "Microsoft Graph"
4. Choose "Delegated permissions"
5. Add these permissions:
   - `Mail.Read`
   - `Mail.ReadWrite`
   - `Mail.Send`
   - `User.Read`
6. Click "Grant admin consent" (if you're admin)

### Step 3: Create Client Secret
1. Go to "Certificates & secrets"
2. Click "New client secret"
3. Add description: "CRM Email Sync"
4. Set expiration (recommend 24 months)
5. Click "Add"
6. **Copy the secret value immediately** (you won't see it again!)

### Step 4: Get Application IDs
1. Go to "Overview"
2. Copy the **Application (client) ID**
3. Copy the **Directory (tenant) ID**

### Step 5: Add to Supabase Secrets
Add these secrets to your Supabase project:
- `MICROSOFT_CLIENT_ID`: Your Application (client) ID
- `MICROSOFT_CLIENT_SECRET`: Your client secret value
- `MICROSOFT_TENANT_ID`: Your Directory (tenant) ID
- `OUTLOOK_REDIRECT_URI`: `https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/outlook-oauth-callback`

---

## 📧 Email Sending with Resend (Optional but Recommended)

For sending tracked emails from the CRM:

### Step 1: Sign Up for Resend
1. Go to [Resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email

### Step 2: Add Domain
1. Go to [Domains](https://resend.com/domains)
2. Click "Add Domain"
3. Enter your domain (e.g., `yourdomain.com`)
4. Add the DNS records shown to your domain provider
5. Wait for verification (can take up to 48 hours)

### Step 3: Create API Key
1. Go to [API Keys](https://resend.com/api-keys)
2. Click "Create API Key"
3. Name it "CRM Email Sync"
4. Select permissions: "Sending access"
5. **Copy the API key**

### Step 4: Add to Supabase Secrets
- `RESEND_API_KEY`: Your Resend API key
- `RESEND_FROM_EMAIL`: Your verified sender email (e.g., `noreply@yourdomain.com`)

---

## 🚀 Testing the Setup

### Test Gmail Connection
1. Go to CRM Settings > Email Accounts
2. Click "Connect Gmail"
3. Authorize the app
4. You should see your Gmail account listed

### Test Outlook Connection
1. Go to CRM Settings > Email Accounts
2. Click "Connect Outlook"
3. Authorize the app
4. You should see your Outlook account listed

### Test Email Sync
1. Send yourself a test email
2. Click "Sync Now" in CRM
3. The email should appear in your CRM inbox within seconds

---

## 🔧 Troubleshooting

### Gmail Issues
- **"Access blocked"**: Make sure you added test users in OAuth consent screen
- **"Invalid redirect URI"**: Double-check the redirect URI matches exactly
- **"API not enabled"**: Verify Gmail API is enabled in Google Cloud Console

### Outlook Issues
- **"AADSTS50011"**: Redirect URI mismatch - verify in Azure portal
- **"Insufficient privileges"**: Grant admin consent for the required permissions
- **"Invalid client secret"**: Make sure you copied the secret value, not the secret ID

### General Issues
- **Tokens expired**: Implement token refresh logic in edge functions
- **Sync not working**: Check edge function logs for errors
- **Missing emails**: Verify sync_from_date in email_accounts table

---

## 📊 Next Steps

Once email sync is working:
1. ✅ Configure email templates for campaigns
2. ✅ Set up email tracking pixels
3. ✅ Create automated email sequences
4. ✅ Build email activity dashboard
5. ✅ Implement AI email classification

---

## 🔐 Security Best Practices

1. **Never expose OAuth secrets** in client-side code
2. **Encrypt tokens** before storing in database
3. **Use HTTPS only** for redirect URIs
4. **Rotate secrets** regularly (every 6-12 months)
5. **Implement token refresh** to avoid re-authentication
6. **Log all email access** for audit trails
7. **Limit API scopes** to only what's needed

---

## 📝 Notes

- Gmail has daily sending limits (500 for free accounts, 2000 for Google Workspace)
- Outlook has rate limits (30 requests/second per app)
- Email sync can take 1-2 minutes for first sync
- Attachments over 25MB may not sync properly
- Consider implementing webhook notifications for real-time sync
