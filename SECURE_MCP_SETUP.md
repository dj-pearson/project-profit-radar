# 🔒 Secure MCP SEO Analytics Setup

## 🎯 **Security-First Approach**

Your MCP setup now uses **Supabase Secrets** instead of local JSON files for maximum security.

### **✅ What's Secure:**
- **No exposed credentials** in code or config files
- **Encrypted storage** in Supabase Secrets
- **Environment isolation** between dev/staging/production  
- **Access control** - only root admins can access
- **No credential transmission** - values never leave secure environment

## 🔑 **Required Supabase Secrets**

### **For Google Analytics:**
```
GOOGLE_PRIVATE_KEY = [from service account JSON private_key field]
GOOGLE_PRIVATE_KEY_ID = [from service account JSON private_key_id field]  
```

### **For Google Search Console:**
```
Google_Search_Console_API = [your search console API key]
```

### **Service Account Email:**
Store the service account email in your MCP setup wizard - this is not sensitive data.

## 📋 **Setup Process**

### **1. Create Service Account (Google Cloud)**
1. **Google Cloud Console** → Create/select project
2. **Enable APIs:** Analytics Reporting API, Analytics Data API, Search Console API
3. **Create Service Account** → Download JSON (temporary)
4. **Extract credentials** from JSON for Supabase Secrets
5. **Delete JSON file** after extracting values

### **2. Store in Supabase Secrets**
1. **Supabase Dashboard** → Your Project → Settings → Secrets
2. **Add secrets** (copy exact values from JSON):
   - `GOOGLE_PRIVATE_KEY`
   - `GOOGLE_PRIVATE_KEY_ID` 
   - `Google_Search_Console_API`
3. **Test connection** via MCP Dashboard

### **3. Grant Permissions**
1. **Google Analytics:** Admin → User Management → Add service account email
2. **Search Console:** Settings → Users → Add service account email  
3. **Grant "Viewer" permissions** in both

### **4. Configure Claude Desktop**
```json
{
  "mcpServers": {
    "google-analytics": {
      "command": "npx",
      "args": ["-y", "@google-analytics/mcp-server"],
      "env": {
        "GOOGLE_PRIVATE_KEY": "{{SUPABASE_SECRET:GOOGLE_PRIVATE_KEY}}",
        "GOOGLE_PRIVATE_KEY_ID": "{{SUPABASE_SECRET:GOOGLE_PRIVATE_KEY_ID}}",
        "GOOGLE_CLIENT_EMAIL": "your-service-account@project.iam.gserviceaccount.com",
        "GA_PROPERTY_ID": "your-ga4-property-id"
      }
    },
    "google-search-console": {
      "command": "npx",
      "args": ["-y", "mcp-server-gsc"],
      "env": {
        "GOOGLE_SEARCH_CONSOLE_API": "{{SUPABASE_SECRET:Google_Search_Console_API}}",
        "GOOGLE_CLIENT_EMAIL": "your-service-account@project.iam.gserviceaccount.com"
      }
    }
  }
}
```

## 🛡️ **Security Benefits**

### **vs JSON File Approach:**
| Aspect | JSON Files ❌ | Supabase Secrets ✅ |
|--------|---------------|---------------------|
| **Storage** | Local filesystem | Encrypted cloud storage |
| **Exposure Risk** | High (files can be leaked) | Low (encrypted at rest) |
| **Access Control** | File permissions only | IAM + role-based access |
| **Environment Management** | Manual file copying | Automatic per environment |
| **Rotation** | Manual file replacement | Secure API updates |
| **Audit Trail** | File system logs only | Full access logging |

### **Additional Security:**
- **Edge Function Protection** - Credentials only accessible to authenticated root admins
- **No Credential Transmission** - Values never sent to frontend
- **Connection Testing** - Validate credentials without exposing them
- **Automatic Status Checking** - Dashboard shows connection status safely

## 🔧 **Edge Function Integration**

The `mcp-credentials` Edge Function provides:

### **Secure Endpoints:**
- **`get-credentials`** - Check if credentials are configured (no values exposed)
- **`test-connection`** - Validate API connections  
- **Root admin only** - Strict authentication and authorization

### **Response Example:**
```json
{
  "configured": {
    "googleAnalytics": true,
    "searchConsole": true,
    "both": true
  },
  "credentials": {
    "GOOGLE_PRIVATE_KEY": "[CONFIGURED]",
    "GOOGLE_PRIVATE_KEY_ID": "[CONFIGURED]", 
    "Google_Search_Console_API": "[CONFIGURED]"
  }
}
```

## 🚀 **Ready to Use!**

Your MCP SEO Analytics now follows enterprise security best practices:

1. **Credentials secured** in Supabase Secrets ✅
2. **No file exposure** risks ✅  
3. **Proper access control** ✅
4. **Environment isolation** ✅
5. **Connection validation** ✅

Navigate to **Admin → SEO Analytics (MCP)** to complete the setup wizard and start analyzing your real SEO data with AI! 🎯✨ 