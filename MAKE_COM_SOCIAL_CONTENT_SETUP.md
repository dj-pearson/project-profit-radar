# Make.com Social Content Generator Setup

This guide shows you how to set up Make.com to automatically trigger your social-content-generator edge function for daily social media post generation with webhook delivery.

## 🎯 Overview

The social-content-generator function creates platform-optimized social media content using predefined templates and AI, then sends the content to your webhook for automated posting.

## 📋 Function Details

- **Function**: `social-content-generator`
- **Endpoint**: `https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/social-content-generator`
- **Authentication**: Bearer Token (Supabase Service Role Key)
- **Method**: POST

## 🚀 Make.com Scenario Setup

### Scenario 1: Daily Social Content Generation

#### Step 1: Add Schedule Trigger
1. Create new Make.com scenario: "Daily Social Content Generator"
2. Add **"Schedule"** → **"Every Day"** module
3. Configure schedule:
   - **Time**: 10:00 AM (1 hour after blog generation)
   - **Timezone**: Your timezone
   - **Days**: Monday-Friday or all days

#### Step 2: Add Social Content Generator HTTP Module
1. Add **"HTTP"** → **"Make a request"** module
2. Configure the HTTP request:

**Basic Settings:**
- **URL**: `https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/social-content-generator`
- **Method**: `POST`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_SERVICE_ROLE_KEY_HERE
```

**Body (JSON):**
```json
{"company_id": "YOUR_COMPANY_ID_HERE", "template_category": "random", "webhook_url": "https://hook.make.com/YOUR_SOCIAL_WEBHOOK_URL", "trigger_type": "scheduled"}
```

**⚠️ IMPORTANT**: 
- Use **single-line JSON** (no line breaks) to avoid Windows `\r\n` encoding issues
- Copy and paste this exact format: `{"company_id": "fcfd2e31-637b-466b-b533-df70f7f1b3af", "template_category": "random", "webhook_url": "https://hook.us1.make.com/rkpj6v4l8982s2fi1f4ndvfqqyvl5ty9", "trigger_type": "scheduled"}`
- Make sure **Body Type** is set to **"Raw"** in Make.com HTTP module

### Scenario 2: Social Media Webhook Receiver

#### Step 1: Create Webhook Receiver Scenario
1. Create new scenario: "Social Media Content Poster"
2. Add **"Webhooks"** → **"Custom webhook"** 
3. Copy the webhook URL for use in Step 2 above

#### Step 2: Add JSON Parser
1. Add **"JSON"** → **"Parse JSON"** module
2. **JSON string**: `{{1.data}}`

#### Step 3: Add Platform Router
1. Add **"Flow Control"** → **"Router"**
2. Create paths for each platform:
   - Twitter Path
   - LinkedIn Path  
   - Instagram Path
   - Facebook Path

## 📊 Webhook Data Structure

The social-content-generator sends this structured data:

```json
{
  "timestamp": "2025-01-29T10:00:00Z",
  "event": "social_content_automation",
  "data": {
    "template": {
      "category": "feature",
      "topic": "Project Cost Tracking",
      "key_points": ["Real-time budget monitoring...", "..."],
      "target_audience": "contractors and project managers"
    },
    "social_posts": [
      {
        "platform": "twitter",
        "content": "💰 Real-time budget monitoring prevents cost overruns! Our latest feature helps contractors track expenses automatically, saving 5+ hours weekly. #Construction #ProjectManagement #BuildDesk",
        "hashtags": ["#Construction", "#ProjectManagement", "#BuildDesk"],
        "media_urls": ["https://example.com/image.jpg"],
        "optimal_length": 280,
        "post_type": "short",
        "includes_url": false
      },
      {
        "platform": "linkedin",
        "content": "Effective project cost tracking is crucial for construction success. Here's how real-time budget monitoring can transform your operations:\n\n✅ Automated expense categorization\n✅ Predictive analytics for early issue detection\n✅ QuickBooks integration for seamless reporting\n\nReady to improve your project budgeting? Learn more about our construction management platform.",
        "hashtags": ["#Construction", "#ProjectManagement", "#BuildDesk"],
        "media_urls": ["https://example.com/image.jpg"],
        "optimal_length": 3000,
        "post_type": "long",
        "includes_url": false
      },
      {
        "platform": "instagram",
        "content": "📊 Smart project tracking = better profits! ✨ See how our platform helps contractors stay on budget and ahead of schedule. 💪\n\n#Construction #ProjectManagement #BuildDesk #ConstructionTech",
        "hashtags": ["#Construction", "#ProjectManagement", "#BuildDesk", "#ConstructionTech"],
        "media_urls": ["https://random-selected-image.jpg"],
        "optimal_length": 2200,
        "post_type": "medium",
        "includes_url": false
      },
      {
        "platform": "facebook",
        "content": "Managing construction project budgets just got easier! Our real-time cost tracking feature helps contractors:\n\n🔹 Monitor expenses automatically\n🔹 Prevent budget overruns\n🔹 Save hours on financial reporting\n🔹 Make data-driven decisions\n\nDiscover how technology can boost your project profitability!",
        "hashtags": ["#Construction", "#ProjectManagement", "#BuildDesk"],
        "media_urls": ["https://example.com/image.jpg"],
        "optimal_length": 2000,
        "post_type": "medium",
        "includes_url": false
      }
    ],
    "platforms": {
      "twitter": { /* Twitter post object */ },
      "non_twitter": [ /* All other platform objects */ ],
      "instagram": { /* Instagram post object */ }
    },
    "routing_data": {
      "short_content": [ /* Twitter posts */ ],
      "medium_content": [ /* Facebook, Instagram posts */ ],
      "long_content": [ /* LinkedIn posts */ ]
    },
    "company_id": "your-company-id",
    "trigger_type": "scheduled"
  }
}
```

## 🎯 Platform Router Configuration

### Path 1: Twitter
**Filter**: `{{2.data.platforms.twitter.platform}}` equals `twitter`
**Buffer Module**:
- **Profile**: Your Twitter Buffer profile
- **Text**: `{{2.data.platforms.twitter.content}}`
- **Media**: `{{2.data.platforms.twitter.media_urls[0]}}`

### Path 2: LinkedIn
**Iterator**: `{{2.data.social_posts}}`
**Filter**: `{{3.platform}}` equals `linkedin`
**Buffer Module**:
- **Profile**: Your LinkedIn Buffer profile
- **Text**: `{{3.content}}`
- **Media**: `{{3.media_urls[0]}}`

### Path 3: Instagram
**Filter**: `{{2.data.platforms.instagram.platform}}` equals `instagram`
**Buffer Module**:
- **Profile**: Your Instagram Buffer profile
- **Text**: `{{2.data.platforms.instagram.content}}`
- **Media**: `{{2.data.platforms.instagram.media_urls[0]}}`

### Path 4: Facebook
**Iterator**: `{{2.data.social_posts}}`
**Filter**: `{{3.platform}}` equals `facebook`
**Buffer Module**:
- **Profile**: Your Facebook Buffer profile
- **Text**: `{{3.content}}`
- **Media**: `{{3.media_urls[0]}}`

## 🎨 Template Categories

You can specify different template categories:

### Random Content (Default)
```json
{
  "template_category": "random"
}
```

### Feature-Focused Content
```json
{
  "template_category": "feature"
}
```

### Benefits-Focused Content
```json
{
  "template_category": "benefit"
}
```

### Knowledge/Educational Content
```json
{
  "template_category": "knowledge"
}
```

## 📅 Multiple Scenario Strategy

### Scenario 1: Monday - Feature Focus (10:00 AM)
```json
{
  "company_id": "YOUR_COMPANY_ID",
  "template_category": "feature",
  "webhook_url": "https://hook.make.com/feature-webhook",
  "trigger_type": "scheduled"
}
```

### Scenario 2: Wednesday - Benefits Focus (10:00 AM)
```json
{
  "company_id": "YOUR_COMPANY_ID", 
  "template_category": "benefit",
  "webhook_url": "https://hook.make.com/benefit-webhook",
  "trigger_type": "scheduled"
}
```

### Scenario 3: Friday - Knowledge Focus (10:00 AM)
```json
{
  "company_id": "YOUR_COMPANY_ID",
  "template_category": "knowledge", 
  "webhook_url": "https://hook.make.com/knowledge-webhook",
  "trigger_type": "scheduled"
}
```

## 🔧 Advanced Configuration

### Add Posting Delays
1. Add **"Tools"** → **"Sleep"** modules between platform posts
2. Configure 2-5 minute delays to avoid rate limiting
3. Randomize delays: `{{floor(random * 300) + 120}}` seconds

### Error Handling
1. Add **"Error Handler"** routes after HTTP and Buffer modules
2. Configure **Email/Slack** notifications for failures
3. Include error details in notifications

### Success Tracking
1. Add **"Data Store"** modules to track successful posts
2. Create daily summary reports
3. Monitor posting frequency and engagement

## 🧪 Testing Your Setup

### Test the Social Content Generator
```bash
curl -X POST https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/social-content-generator \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -d '{
    "company_id": "YOUR_COMPANY_ID",
    "template_category": "feature",
    "webhook_url": "https://hook.make.com/test-webhook",
    "trigger_type": "manual"
  }'
```

### Expected Response
```json
{
  "success": true,
  "template": {
    "category": "feature",
    "topic": "Project Cost Tracking"
  },
  "platforms_processed": ["twitter", "linkedin", "instagram", "facebook"],
  "social_posts_created": 4,
  "webhook_sent": true
}
```

## 📈 Content Templates Available

The function includes templates for:

1. **Project Cost Tracking** - Budget monitoring and financial control
2. **Time Tracking & Payroll** - Labor management and payroll automation  
3. **Increased Profitability** - ROI and business growth benefits
4. **Document Management** - File organization and mobile access
5. **Construction Industry Trends** - Industry insights and technology
6. **Risk Management** - Safety, compliance, and risk reduction
7. **Client Communication** - Project transparency and updates
8. **Small Business Success** - Growth strategies and efficiency

## 🎯 Integration with Blog Automation

### Combined Daily Schedule:
- **9:00 AM**: Blog post generation (from previous setup)
- **10:00 AM**: Social content generation (this setup)
- **10:05 AM**: Social media posting (webhook receiver)

### Linking Blog and Social Content:
You can modify the blog automation to trigger social content generation:

```json
{
  "blog_post_id": "{{blog.content.blogPost.id}}",
  "company_id": "YOUR_COMPANY_ID",
  "template_category": "random",
  "webhook_url": "https://hook.make.com/social-webhook",
  "trigger_type": "blog_triggered"
}
```

## 💡 Pro Tips

1. **Content Variety**: Use different template categories throughout the week
2. **Timing Strategy**: Stagger posts across platforms by 2-5 minutes
3. **Media Assets**: Keep your `site-assets` bucket populated with construction images
4. **Rate Limits**: Monitor platform posting limits and adjust frequency
5. **A/B Testing**: Try different template categories and track performance

## 🔒 Security & Environment Variables

Ensure these environment variables are set in Supabase:

```
CLAUDE_API_KEY=your_claude_api_key
SUPABASE_URL=https://ilhzuvemiuyfuxfegtlv.supabase.co  
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 🚨 Troubleshooting

### Common Issues:
- **Company ID not found**: Verify company_id exists in your database
- **Webhook delivery failed**: Check webhook URL is accessible
- **No media for Instagram**: Add images to your `site-assets` bucket
- **Claude API error**: Verify CLAUDE_API_KEY environment variable

### Debug Steps:
1. Test function directly with curl first
2. Check Supabase function logs
3. Verify environment variables
4. Test webhook receiver with manual data
5. Monitor Buffer/platform API rate limits

This setup will generate fresh, engaging social media content daily and automatically post it to all your platforms! 🚀
