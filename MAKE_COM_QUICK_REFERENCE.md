# Make.com Blog Automation - Quick Setup Reference

## 🚀 Quick Setup Checklist

### 1. Deploy Functions
```bash
supabase functions deploy blog-ai-automation
supabase functions deploy social-content-generator
```

### 2. Environment Variables (Supabase Dashboard)
```
CLAUDE_API_KEY=sk-ant-xxxxx
SUPABASE_URL=https://ilhzuvemiuyfuxfegtlv.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
BLOG_AUTOMATION_API_KEY=BLOG_API_k8n2m9x5p7q3w1e6r4t8y2u9i1o5p3s7
```

### 3. Make.com HTTP Modules Configuration

#### Blog Generation Module (9:00 AM):
**URL:**
```
https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/blog-ai-automation
```

**Method:** `POST`

**Headers:**
```
Content-Type: application/json
x-api-key: BLOG_API_k8n2m9x5p7q3w1e6r4t8y2u9i1o5p3s7
```

**Body:**
```json
{
  "action": "generate-auto-content",
  "topic": "",
  "customSettings": {
    "preferred_model": "claude-3-5-haiku-20241022",
    "model_temperature": 0.7
  }
}
```

#### Social Content Generation Module (10:00 AM):
**URL:**
```
https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/social-content-generator
```

**Method:** `POST`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_SERVICE_ROLE_KEY_HERE
```

**Body:**
```json
{
  "company_id": "YOUR_COMPANY_ID_HERE",
  "template_category": "random",
  "webhook_url": "https://hook.make.com/YOUR_SOCIAL_WEBHOOK_URL",
  "trigger_type": "scheduled"
}
```

#### Blog-Triggered Social Media Module (Optional):
**URL:**
```
https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/blog_social_webhook
```

**Method:** `POST`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_SERVICE_ROLE_KEY_HERE
```

**Body:**
```json
{
  "blog_post_id": "{{1.content.blogPost.id}}",
  "company_id": "YOUR_COMPANY_ID_HERE", 
  "trigger_type": "auto_publish",
  "webhook_url": "YOUR_SOCIAL_WEBHOOK_URL_HERE"
}
```

## � Complete Automation Flow

### Make.com Scenario Structure:
1. **Schedule** → Every day at 9:00 AM
2. **Blog Generator** → Creates blog post
3. **Filter** → Check if blog creation succeeded
4. **Social Media Trigger** → Generate social content
5. **Social Webhook** → Receive platform-specific content
6. **Router** → Split content by platform
7. **Buffer/Platform APIs** → Post to social media

### Social Media Webhook Response:
```json
{
  "event": "blog_post_social_automation_enhanced",
  "data": {
    "social_posts": [
      {
        "platform": "twitter",
        "content": "Engaging tweet with link...",
        "hashtags": ["#construction"],
        "media_urls": ["https://..."]
      },
      {
        "platform": "linkedin", 
        "content": "Professional post with insights...",
        "hashtags": ["#projectmanagement"],
        "media_urls": ["https://..."]
      },
      {
        "platform": "instagram",
        "content": "Visual content... 🔗 Link in bio",
        "hashtags": ["#builddesk"],
        "media_urls": ["https://random-image.jpg"]
      }
    ],
    "platforms": {
      "twitter": { /* Twitter data */ },
      "non_twitter": [ /* All other platforms */ ]
    }
  }
}
```

## 📊 Platform Routing

### Router Paths in Make.com:
- **Path 1**: Twitter → `data.platforms.twitter`
- **Path 2**: LinkedIn → Find platform = "linkedin" in `data.social_posts`  
- **Path 3**: Instagram → `data.platforms.instagram`
- **Path 4**: Facebook → Find platform = "facebook" in `data.social_posts`

### Content Mapping:
```
Content: {{item.content}}
Media: {{item.media_urls[0]}}
Hashtags: {{join(item.hashtags; " ")}}
Platform: {{item.platform}}
```

## 📅 Schedule Options

### Blog Generation Schedule:
- **Daily**: Every day at 9:00 AM
- **Weekdays**: Monday-Friday at 9:00 AM  
- **Weekly**: Every Monday at 9:00 AM

### Social Content Generation Schedule:
- **Daily**: Every day at 10:00 AM (1 hour after blog)
- **Template Rotation**:
  - Monday: Feature content
  - Tuesday: Benefits content
  - Wednesday: Knowledge content
  - Thursday: Random content
  - Friday: Feature content

### Multiple Scenarios for Content Variety:
- **9:00 AM**: Blog generation (all days)
- **10:00 AM**: Social content generation (template rotation)
- **Webhook-triggered**: Social media posting (immediate)

### Template Categories Available:
- `"feature"` - Product features and capabilities
- `"benefit"` - ROI and business benefits  
- `"knowledge"` - Industry insights and trends
- `"random"` - Random selection from all templates

## 🎯 Topic Variations

### Auto-Generated Topics (leave topic empty)
```json
{
  "action": "generate-auto-content",
  "topic": ""
}
```

### Custom Topics
```json
{
  "action": "generate-auto-content", 
  "topic": "5 Ways to Improve Construction Site Safety"
}
```

### Dynamic Topics with Date
```json
{
  "action": "generate-auto-content",
  "topic": "{{formatDate(now; 'MMMM YYYY')}} Construction Industry Update"
}
```

## ⚙️ Advanced Settings

### Long-form Articles
```json
{
  "customSettings": {
    "preferred_model": "claude-3-5-sonnet-20241022",
    "model_temperature": 0.7,
    "max_tokens": 3000
  }
}
```

### Technical Content
```json
{
  "customSettings": {
    "preferred_model": "claude-3-5-haiku-20241022",
    "model_temperature": 0.3,
    "max_tokens": 2500
  }
}
```

## 🔍 Testing

### Quick Test
```bash
curl -X POST https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/blog-ai-automation \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"action": "test-generation", "topic": "Test Topic"}'
```

### Success Response Check
- Status: `200 OK`
- Body contains: `"success": true`
- Blog post created in database

## 📊 Monitoring

### Make.com Dashboard
- Execution history
- Error logs
- Performance metrics

### Supabase Logs
- Function execution logs
- Database queries
- API call details

## 🚨 Error Handling

### Add Error Handler Route
1. Drag from HTTP module to create error handler
2. Add Email/Slack notification
3. Include error details in message

### Common Errors & Solutions

| Error | Solution |
|-------|----------|
| `Unauthorized` | Check API key |
| `Claude API key not configured` | Set environment variable |
| `Function not found` | Deploy function first |
| `Rate limit exceeded` | Reduce frequency |

## 💡 Pro Tips

1. **Test First**: Always test manually before scheduling
2. **Monitor Closely**: Check first few automated runs
3. **Content Quality**: Review generated content periodically  
4. **API Limits**: Monitor Claude API usage
5. **Backup Plan**: Have fallback topics ready

## 🔄 Multiple Scenarios Setup

### Scenario 1: Daily General Content
- **Schedule**: Every day 9:00 AM
- **Topic**: Auto-generated
- **Model**: Haiku (faster, cheaper)

### Scenario 2: Weekly Deep Dive
- **Schedule**: Every Monday 10:00 AM
- **Topic**: "Weekly Construction Industry Analysis"
- **Model**: Sonnet (more detailed)

### Scenario 3: Monthly Trends
- **Schedule**: 1st of month 9:00 AM
- **Topic**: "{{formatDate(now; 'MMMM YYYY')}} Construction Trends"
- **Model**: Sonnet (comprehensive)

This setup will automatically generate high-quality construction blog posts daily! 🎉
