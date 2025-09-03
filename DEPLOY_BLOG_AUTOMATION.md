# Deploy New Blog Automation Function

This guide will help you deploy the new simplified blog automation function that works better with Make.com.

## Step 1: Deploy the Function

Run these commands in your terminal from the project root:

```bash
# Navigate to your project directory
cd c:\Users\dpearson\OneDrive\Documents\BuildDesk\project-profit-radar

# Deploy the new function
supabase functions deploy blog-ai-automation

# Or deploy all functions
supabase functions deploy
```

## Step 2: Set Environment Variables

In your Supabase Dashboard (https://app.supabase.com/project/ilhzuvemiuyfuxfegtlv):

1. Go to **Edge Functions** > **blog-ai-automation** > **Settings**
2. Add these environment variables:

```
CLAUDE_API_KEY=your_claude_api_key_here
SUPABASE_URL=https://ilhzuvemiuyfuxfegtlv.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
BLOG_AUTOMATION_API_KEY=your_custom_api_key_here
```

## Step 3: Generate Custom API Key

Create a strong API key for Make.com automation:

```bash
# Generate a secure random key (run in PowerShell)
[System.Web.Security.Membership]::GeneratePassword(32, 8)

# Or use this format:
# BLOG_API_[random-string]
# Example: BLOG_API_k8n2m9x5p7q3w1e6r4t8y2u9i1o5p3s7
```

## Step 4: Update Make.com Configuration

Use the new endpoint in Make.com:

### New Endpoint:
```
https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/blog-ai-automation
```

### Headers (Choose One Method):

**Method 1 - Custom API Key (Recommended for Make.com):**
```
Content-Type: application/json
x-api-key: BLOG_API_k8n2m9x5p7q3w1e6r4t8y2u9i1o5p3s7
```

**Method 2 - Service Role Token:**
```
Content-Type: application/json
Authorization: Bearer your_service_role_key_here
```

### Request Body:
```json
{
  "action": "generate-auto-content",
  "topic": "",
  "customSettings": {
    "preferred_model": "claude-3-5-haiku-20241022",
    "model_temperature": 0.7,
    "max_tokens": 2000
  }
}
```

## Step 5: Test the Function

### Test via curl:
```bash
curl -X POST https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/blog-ai-automation \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY_HERE" \
  -d '{
    "action": "test-generation",
    "topic": "Construction Safety Best Practices"
  }'
```

### Expected Response:
```json
{
  "success": true,
  "content": {
    "title": "Construction Safety Best Practices",
    "body": "# Construction Safety Best Practices...",
    "excerpt": "Discover essential safety practices...",
    "seo_title": "Construction Safety Best Practices",
    "seo_description": "Learn essential safety practices...",
    "keywords": ["construction", "safety", "best practices"],
    "estimated_read_time": 8
  },
  "blogPost": {
    "id": "uuid-here",
    "title": "Construction Safety Best Practices",
    "slug": "construction-safety-best-practices"
  },
  "metadata": {
    "model": "claude-3-5-haiku-20241022",
    "topic": "Construction Safety Best Practices",
    "timestamp": "2025-01-XX",
    "function": "blog-ai-automation",
    "slug": "construction-safety-best-practices"
  }
}
```

## Benefits of New Function

1. **Simplified Authentication**: No need for user roles or complex permissions
2. **API Key Support**: Perfect for Make.com and other automation tools
3. **Flexible Authentication**: Supports both API key and service role methods
4. **Better Error Handling**: Clear error messages for troubleshooting
5. **Random Topics**: Generates random topics if none provided
6. **Duplicate Prevention**: Automatically handles slug conflicts

## Security Notes

1. Keep your API key secure and rotate it periodically
2. The function automatically prevents duplicate blog posts
3. Uses service role for database operations but simpler auth for requests
4. Logs are available in Supabase Dashboard for monitoring

## Troubleshooting

### Common Issues:

1. **"Unauthorized" Error**: Check your API key is correct
2. **"Claude API key not configured"**: Set CLAUDE_API_KEY environment variable
3. **"Function not found"**: Ensure the function is deployed successfully

### Debug Steps:
1. Check Supabase function logs
2. Verify environment variables are set
3. Test with curl command first
4. Check Make.com execution logs

This new function is specifically designed for automation workflows and should work much better with Make.com!
