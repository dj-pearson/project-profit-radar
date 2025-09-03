# Make.com HTTP Module Setup for Daily Blog Generation

This guide will help you set up a Make.com scenario to automatically trigger your enhanced-blog-ai-fixed edge function daily for blog article generation using API key authentication.

## Overview

Your edge function is located at:
- **Function**: `enhanced-blog-ai-fixed`
- **Endpoint**: `https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/enhanced-blog-ai-fixed`
- **Authentication**: Bearer Token (Supabase Service Role Key)

## Prerequisites

1. Make.com account (free tier available)
2. Your Supabase Service Role Key (found in Supabase Dashboard > Settings > API)
3. Access to your Supabase project: `ilhzuvemiuyfuxfegtlv`

## Step-by-Step Setup

### 1. Get Your Supabase Service Role Key

1. Go to your Supabase Dashboard: https://app.supabase.com/project/ilhzuvemiuyfuxfegtlv
2. Navigate to **Settings** > **API**
3. Copy the **service_role** key (starts with `eyJ...`)
4. ⚠️ **Keep this key secure** - it has full database access

### 2. Create New Make.com Scenario

1. Log into Make.com
2. Click **"Create a new scenario"**
3. Choose a blank scenario

### 3. Add Schedule Trigger

1. Click the **"+"** button to add a module
2. Search for **"Schedule"**
3. Select **"Schedule"** > **"Every Day"**
4. Configure the schedule:
   - **Time**: Set your preferred time (e.g., 09:00 AM)
   - **Timezone**: Select your timezone
   - **Advanced Settings**: 
     - Days of the week: Monday-Friday (or all days)
     - Start date: Today's date

### 4. Add HTTP Module

1. Click the **"+"** after the Schedule module
2. Search for **"HTTP"**
3. Select **"HTTP"** > **"Make a request"**
4. Configure the HTTP request:

#### Basic Settings:
- **URL**: `https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/enhanced-blog-ai-fixed`
- **Method**: `POST`

#### Headers:
Add these headers:
```
Content-Type: application/json
Authorization: Bearer YOUR_SERVICE_ROLE_KEY_HERE
```

Replace `YOUR_SERVICE_ROLE_KEY_HERE` with your actual Supabase service role key.

#### Body (JSON):
```json
{
  "action": "generate-auto-content",
  "topic": "",
  "customSettings": {
    "preferred_ai_provider": "claude",
    "preferred_model": "claude-sonnet-4-20250514",
    "model_temperature": 0.7,
    "target_word_count": 1500,
    "content_style": "professional",
    "industry_focus": ["construction"],
    "target_keywords": ["construction", "project management", "safety", "efficiency"],
    "geo_optimization": true,
    "perplexity_optimization": true,
    "ai_search_optimization": true
  }
}
```

### 5. Add Social Media Webhook Trigger

After the blog generation is successful, trigger social media automation:

1. Add a **"Filter"** after the first HTTP module
2. Set condition: HTTP Status Code equals 200
3. Add another **"HTTP"** module for social media automation:

#### Social Media HTTP Module Settings:
- **URL**: `https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/blog_social_webhook`
- **Method**: `POST`
- **Headers**:
  ```
  Content-Type: application/json
  Authorization: Bearer YOUR_SERVICE_ROLE_KEY_HERE
  ```
- **Body**:
  ```json
  {
    "blog_post_id": "{{1.content.blogPost.id}}",
    "company_id": "YOUR_COMPANY_ID_HERE",
    "trigger_type": "auto_publish",
    "webhook_url": "YOUR_MAKE_COM_WEBHOOK_URL_HERE"
  }
  ```

### 6. Set Up Social Media Webhook Receiver (Optional)

To handle the social media content and post to platforms:

1. Create a **new Make.com scenario** with a **Webhook trigger**
2. Configure webhook URL and copy it
3. Use this webhook URL in the `webhook_url` field above
4. In the new scenario, add modules for each social platform:
   - **Buffer** modules for automated posting
   - **Direct API** calls to social platforms
   - **Email/Slack** notifications with generated content

### 7. Add Error Handling (Optional but Recommended)

1. Add **"Error Handler"** routes after both HTTP modules
2. Add **Email** or **Slack** notification modules to alert you of failures
3. Configure notifications with error details

### 8. Add Success Notification (Optional)

1. Add a **"Filter"** after the social media HTTP module
2. Set condition: HTTP Status Code equals 200
3. Add **Email** or **Slack** notification for success confirmation

## Complete Daily Content Automation Workflow

Now you can set up a complete content automation system that generates both blog posts AND social media content daily:

### Option 1: Sequential Workflow (Recommended)
1. **9:00 AM**: Generate blog post
2. **10:00 AM**: Generate social media content (separate scenario)
3. **Auto-post**: Social content posted via webhook

### Option 2: Integrated Workflow
1. **9:00 AM**: Generate blog post
2. **Immediately after**: Generate social content in same scenario
3. **Auto-post**: Both blog and social content delivered

### Setting Up Sequential Workflow

#### Blog Generation Scenario (9:00 AM)
- Use your existing blog generation setup
- Generates 1 high-quality blog post daily

#### Social Content Generation Scenario (10:00 AM)
1. Create new scenario: "Daily Social Content Generator"
2. Add **Schedule** trigger for 10:00 AM
3. Add **HTTP** module with these settings:

**URL:** `https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/social-content-generator`

**Body:**
```json
{
  "company_id": "YOUR_COMPANY_ID_HERE",
  "template_category": "random",
  "webhook_url": "https://hook.make.com/YOUR_SOCIAL_WEBHOOK_URL",
  "trigger_type": "scheduled"
}
```

#### Social Media Webhook Receiver
1. Create third scenario: "Social Media Poster"
2. Receives structured content for all platforms
3. Posts to Buffer or direct platform APIs

### Template Rotation Strategy

**Monday**: Feature content
```json
{"template_category": "feature"}
```

**Tuesday**: Benefits content  
```json
{"template_category": "benefit"}
```

**Wednesday**: Knowledge content
```json
{"template_category": "knowledge"}
```

**Thursday**: Random content
```json
{"template_category": "random"}
```

**Friday**: Feature content
```json
{"template_category": "feature"}
```

Your project includes a comprehensive social media automation system that can be triggered after blog generation. Here's how to integrate it:

### Social Media Webhook Response Format

The social media webhook returns structured data for each platform:

```json
{
  "timestamp": "2025-01-29T10:00:00Z",
  "event": "blog_post_social_automation_enhanced", 
  "data": {
    "blog_post": {
      "id": "uuid",
      "title": "Blog Post Title",
      "url": "https://build-desk.com/blog/post-slug"
    },
    "social_posts": [
      {
        "platform": "twitter",
        "content": "Short engaging content... https://link",
        "hashtags": ["#construction", "#builddesk"],
        "media_urls": ["https://..."],
        "optimal_length": 280,
        "post_type": "short"
      },
      {
        "platform": "linkedin", 
        "content": "Professional content with insights... https://link",
        "hashtags": ["#construction", "#projectmanagement"],
        "media_urls": ["https://..."],
        "optimal_length": 3000,
        "post_type": "long"
      },
      {
        "platform": "instagram",
        "content": "Visual storytelling content... 🔗 Link in bio",
        "hashtags": ["#construction", "#builddesk"],
        "media_urls": ["https://random-asset.jpg"],
        "optimal_length": 2200,
        "post_type": "medium"
      }
    ],
    "platforms": {
      "twitter": { /* Twitter post object */ },
      "non_twitter": [ /* Facebook, LinkedIn, Instagram */ ],
      "instagram": { /* Instagram post object */ }
    }
  }
}
```

### Complete Make.com Scenario Flow

Your complete scenario should look like this:

1. **Schedule Trigger** (Every day at 9:00 AM)
   ↓
2. **HTTP Module** (Generate blog post)
   ↓
3. **Filter** (Status = 200)
   ↓
4. **HTTP Module** (Trigger social media automation)
   ↓
5. **Webhook Module** (Receive social content) - Optional
   ↓
6. **Router** (Split by platform)
   ├─ **Buffer/Twitter** (Short content)
   ├─ **Buffer/LinkedIn** (Long content)  
   ├─ **Buffer/Facebook** (Medium content)
   └─ **Buffer/Instagram** (Visual content with media)

### Platform-Specific Routing in Make.com

Use these data paths for routing:

**For Twitter:**
- Content: `{{data.platforms.twitter.content}}`
- Media: `{{data.platforms.twitter.media_urls[0]}}`

**For LinkedIn:**
- Content: `{{data.platforms.linkedin.content}}`  
- Media: `{{data.platforms.linkedin.media_urls[0]}}`

**For Instagram:**
- Content: `{{data.platforms.instagram.content}}`
- Media: `{{data.platforms.instagram.media_urls[0]}}`

**For All Non-Twitter Platforms:**
```
{{range(data.platforms.non_twitter)}}
  Platform: {{item.platform}}
  Content: {{item.content}}
  Media: {{item.media_urls[0]}}
{{/range}}
```

### With Custom Topic:
```json
{
  "action": "generate-auto-content",
  "topic": "5 Advanced Safety Protocols Every Construction Site Should Implement",
  "customSettings": {
    "preferred_ai_provider": "claude",
    "preferred_model": "claude-sonnet-4-20250514",
    "model_temperature": 0.7
  }
}
```

### For Testing:
```json
{
  "action": "test-generation",
  "topic": "Construction Technology Trends 2025"
}
```

## Advanced Automation Features

### 1. Dynamic Topic Generation

Add a **Text Aggregator** module before the HTTP request to create dynamic topics:

```json
{
  "action": "generate-auto-content",
  "topic": "{{formatDate(now; 'YYYY-MM-DD')}}: Latest Construction Industry Insights",
  "customSettings": {
    "queue_id": "{{timestamp}}"
  }
}
```

### 2. Multiple Scenarios for Different Content Types

Create separate scenarios for:
- **Daily**: General construction tips
- **Weekly**: In-depth project management guides
- **Monthly**: Industry trend analysis

### 3. Content Validation Webhook

Add a second HTTP module to check if the blog was successfully created:

- **URL**: `https://ilhzuvemiuyfuxfegtlv.supabase.co/rest/v1/blog_posts`
- **Method**: `GET`
- **Headers**: 
  ```
  Authorization: Bearer YOUR_SERVICE_ROLE_KEY_HERE
  apikey: YOUR_ANON_KEY_HERE
  ```
- **Query**: `?select=id,title,created_at&order=created_at.desc&limit=1`

## Environment Variables Setup

Your edge function requires these environment variables in Supabase:

1. Go to **Supabase Dashboard** > **Edge Functions** > **Settings**
2. Add these environment variables:
   - `CLAUDE_API_KEY`: Your Anthropic Claude API key
   - `SUPABASE_URL`: `https://ilhzuvemiuyfuxfegtlv.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key

## Monitoring and Analytics

### 1. Make.com Built-in Monitoring
- View execution history in Make.com dashboard
- Set up email alerts for failed executions
- Monitor data usage and execution time

### 2. Supabase Function Logs
- Check function logs in Supabase Dashboard > Edge Functions > enhanced-blog-ai-fixed
- Monitor function performance and errors

### 3. Blog Post Analytics
Add analytics tracking by including custom parameters:

```json
{
  "action": "generate-auto-content",
  "customSettings": {
    "analytics_tag": "make-com-automation",
    "source": "daily-scheduler",
    "campaign": "automated-content-{{formatDate(now; 'YYYY-MM')}}"
  }
}
```

## Security Best Practices

1. **API Key Management**:
   - Store service role key securely in Make.com
   - Consider using Make.com's data store for sensitive data
   - Rotate keys periodically

2. **Rate Limiting**:
   - Set reasonable intervals between requests
   - Monitor Claude API usage to avoid rate limits

3. **Error Handling**:
   - Always include error handling modules
   - Set up alerts for authentication failures
   - Log successful operations for audit trail

## Testing Your Setup

### 1. Manual Test
1. Save your scenario
2. Click **"Run once"** to test immediately
3. Check the execution log for any errors
4. Verify a new blog post was created in your CMS

### 2. Response Validation
Expected success response:
```json
{
  "success": true,
  "content": {
    "title": "Generated Blog Title",
    "body": "Full blog content...",
    "excerpt": "Brief summary...",
    "seo_title": "SEO Title",
    "seo_description": "SEO description..."
  },
  "blogPost": {
    "id": "uuid",
    "title": "Generated Blog Title",
    "slug": "generated-blog-title"
  },
  "metadata": {
    "model": "claude-sonnet-4-20250514",
    "topic": "Generated topic",
    "timestamp": "2025-01-XX",
    "function": "enhanced-blog-ai-fixed"
  }
}
```

## Troubleshooting

### Common Issues:

1. **Authentication Error**: Verify your service role key is correct
2. **Function Not Found**: Check the endpoint URL
3. **Claude API Error**: Ensure CLAUDE_API_KEY is set in Supabase
4. **Permission Error**: The function requires root_admin role access
5. **Social Media Webhook Failed**: Check company_id and blog_post_id are correct
6. **Platform Content Missing**: Verify social automation settings are configured

### Debug Steps:
1. Test the endpoint directly with Postman first
2. Check Supabase function logs for both functions
3. Verify environment variables are set
4. Test with simplified payload
5. Check social media automation settings in your app
6. Verify webhook URL is reachable from external services

### Social Media Integration Debug:

Test the social media webhook separately:
```bash
curl -X POST https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/blog_social_webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -d '{
    "blog_post_id": "your-blog-post-id",
    "company_id": "your-company-id", 
    "trigger_type": "manual",
    "webhook_url": "https://hook.make.com/your-webhook-url"
  }'
```

## Cost Considerations

- **Make.com**: Free tier includes 1,000 operations/month
- **Supabase**: Functions included in free tier with usage limits
- **Claude API**: Pay per token - estimate ~$0.10-0.50 per blog post

## Next Steps

1. Set up the basic scenario and test it
2. Add error handling and notifications
3. Create additional scenarios for different content types
4. Monitor performance and adjust as needed
5. Consider adding content calendar integration

This automation will generate high-quality, SEO-optimized blog posts daily without manual intervention, helping you maintain a consistent content publishing schedule for your construction industry blog.
