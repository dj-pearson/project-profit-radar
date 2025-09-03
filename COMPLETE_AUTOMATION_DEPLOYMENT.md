# Complete Make.com Automation Deployment Guide

This guide provides the complete setup for daily blog generation AND social media content automation using Make.com.

## 🎯 What You'll Get

### Daily Automated Content:
- **9:00 AM**: 1 SEO-optimized blog post (1,500+ words)
- **10:00 AM**: 4 platform-specific social media posts
- **10:05 AM**: Automatic posting to all social platforms

### Content Types:
- **Blog Posts**: Construction industry insights, tips, trends
- **Twitter**: Short, engaging tweets with hashtags
- **LinkedIn**: Professional long-form posts
- **Instagram**: Visual content with random media selection
- **Facebook**: Community-focused updates

## 📋 Prerequisites

### Required Accounts:
- ✅ Make.com account (free tier available)
- ✅ Supabase project access
- ✅ Claude API key (Anthropic)
- ✅ Buffer account OR direct social platform API access

### Required Information:
- 🔑 Supabase Service Role Key
- 🏢 Your Company ID from database
- 📧 Notification email addresses

## 🚀 Step-by-Step Deployment

### Phase 1: Deploy Edge Functions

```bash
# Navigate to your project directory
cd c:\Users\dpearson\OneDrive\Documents\BuildDesk\project-profit-radar

# Deploy both functions
supabase functions deploy blog-ai-automation
supabase functions deploy social-content-generator

# Verify deployment
supabase functions list
```

### Phase 2: Configure Environment Variables

In Supabase Dashboard → Edge Functions → Settings:

```
CLAUDE_API_KEY=sk-ant-api03-xxxxx
SUPABASE_URL=https://ilhzuvemiuyfuxfegtlv.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
BLOG_AUTOMATION_API_KEY=BLOG_API_k8n2m9x5p7q3w1e6r4t8y2u9i1o5p3s7
```

### Phase 3: Create Make.com Scenarios

#### Scenario 1: Daily Blog Generator (9:00 AM)

1. **Create new scenario**: "Daily Blog Generator"
2. **Add Schedule trigger**: 
   - Type: Every Day
   - Time: 09:00 AM
   - Timezone: Your timezone
3. **Add HTTP module**:
   - URL: `https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/blog-ai-automation`
   - Method: POST
   - Headers:
     ```
     Content-Type: application/json
     x-api-key: BLOG_API_k8n2m9x5p7q3w1e6r4t8y2u9i1o5p3s7
     ```
   - Body:
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

#### Scenario 2: Social Content Generator (10:00 AM)

1. **Create new scenario**: "Social Content Generator" 
2. **Add Schedule trigger**:
   - Type: Every Day  
   - Time: 10:00 AM
   - Timezone: Your timezone
3. **Add HTTP module**:
   - URL: `https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/social-content-generator`
   - Method: POST
   - Headers:
     ```
     Content-Type: application/json
     Authorization: Bearer YOUR_SERVICE_ROLE_KEY
     ```
   - Body:
     ```json
     {
       "company_id": "YOUR_COMPANY_ID_HERE",
       "template_category": "random",
       "webhook_url": "https://hook.make.com/WEBHOOK_ID_FROM_STEP_3",
       "trigger_type": "scheduled"
     }
     ```

#### Scenario 3: Social Media Poster (Webhook-triggered)

1. **Create new scenario**: "Social Media Poster"
2. **Add Webhook trigger**:
   - Create custom webhook
   - Copy webhook URL for use in Scenario 2
3. **Add JSON Parser**:
   - JSON string: `{{1.data}}`
4. **Add Router** with 4 paths:

   **Path 1: Twitter**
   - Filter: `{{2.data.platforms.twitter.platform}}` equals `twitter`
   - Buffer module: Twitter profile, content, media

   **Path 2: LinkedIn** 
   - Iterator: `{{2.data.social_posts}}`
   - Filter: `{{3.platform}}` equals `linkedin`
   - Buffer module: LinkedIn profile, content, media

   **Path 3: Instagram**
   - Filter: `{{2.data.platforms.instagram.platform}}` equals `instagram`  
   - Buffer module: Instagram profile, content, media

   **Path 4: Facebook**
   - Iterator: `{{2.data.social_posts}}`
   - Filter: `{{3.platform}}` equals `facebook`
   - Buffer module: Facebook profile, content, media

### Phase 4: Add Error Handling & Notifications

For each scenario, add:
1. **Error Handler routes** after HTTP/Buffer modules
2. **Email notification** modules for failures
3. **Success notification** modules for confirmations

### Phase 5: Test & Validate

#### Test Blog Generation:
```bash
curl -X POST https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/blog-ai-automation \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"action": "test-generation", "topic": "Construction Safety"}'
```

#### Test Social Content Generation:
```bash
curl -X POST https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/social-content-generator \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -d '{"company_id": "YOUR_COMPANY_ID", "template_category": "feature", "webhook_url": "https://hook.make.com/test"}'
```

#### Test Social Webhook:
Send test JSON to your webhook URL with the expected social content structure.

## 🎨 Advanced Configuration

### Template Rotation Schedule

**Monday Scenario** (Feature Focus):
```json
{
  "template_category": "feature",
  "webhook_url": "https://hook.make.com/monday-webhook"
}
```

**Wednesday Scenario** (Benefits Focus):  
```json
{
  "template_category": "benefit", 
  "webhook_url": "https://hook.make.com/wednesday-webhook"
}
```

**Friday Scenario** (Knowledge Focus):
```json
{
  "template_category": "knowledge",
  "webhook_url": "https://hook.make.com/friday-webhook"
}
```

### Custom Topics for Blog Generation

**Industry-Specific Topics**:
```json
{
  "action": "generate-auto-content",
  "topic": "5 Construction Technology Trends Shaping 2025",
  "customSettings": {
    "preferred_model": "claude-3-5-sonnet-20241022",
    "model_temperature": 0.8,
    "max_tokens": 3000
  }
}
```

### Posting Delays to Avoid Rate Limits

Add **Sleep modules** between social platform posts:
- Twitter → 2 minutes → LinkedIn → 3 minutes → Instagram → 2 minutes → Facebook

## 📊 Monitoring & Analytics

### Make.com Built-in Monitoring:
- Execution history for all scenarios
- Error logs and failure notifications
- Data usage and operation counts

### Custom Analytics:
- Blog post creation tracking
- Social media engagement monitoring  
- Content performance metrics
- Webhook delivery success rates

### Success Metrics to Track:
- Daily blog posts published: Target 1/day
- Social media posts created: Target 4/day
- Platform posting success rate: Target >95%
- Content variation: Different topics and templates

## 🔒 Security Best Practices

### API Key Management:
- Store all keys securely in Make.com
- Rotate API keys quarterly
- Use separate keys for production vs testing
- Monitor API usage for unusual activity

### Webhook Security:
- Use HTTPS URLs only
- Implement webhook signature validation if needed
- Monitor webhook delivery logs
- Set up alerts for failed deliveries

### Rate Limiting:
- Respect platform posting limits
- Implement delays between posts
- Monitor Claude API usage
- Set up usage alerts

## 💰 Cost Management

### Expected Monthly Costs:
- **Make.com**: $0 (free tier up to 1,000 operations)
- **Claude API**: ~$15-30 (based on daily generation)
- **Supabase**: $0 (within free tier limits)
- **Buffer**: $5/month (essential plan) or platform API costs

### Cost Optimization Tips:
- Use Claude Haiku model for social content (cheaper)
- Use Claude Sonnet for blog posts (higher quality)
- Monitor API usage and adjust frequency if needed
- Implement content caching where possible

## 🚨 Troubleshooting

### Common Issues:

**Blog Generation Failures:**
- Check CLAUDE_API_KEY environment variable
- Verify blog-ai-automation function is deployed
- Check API key authentication

**Social Content Generation Failures:**
- Verify company_id exists in database
- Check social-content-generator function deployment
- Ensure CLAUDE_API_KEY is set

**Webhook Delivery Issues:**
- Verify webhook URLs are accessible
- Check Make.com webhook configuration
- Test webhook URLs manually

**Social Media Posting Failures:**
- Verify Buffer account connections
- Check platform API authentication
- Monitor rate limiting

### Debug Commands:

**Check function logs:**
```bash
supabase functions logs blog-ai-automation
supabase functions logs social-content-generator
```

**Test API endpoints:**
```bash
# Test blog generation
curl -X POST https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/blog-ai-automation \
  -H "x-api-key: YOUR_KEY" -H "Content-Type: application/json" \
  -d '{"action": "test-generation"}'

# Test social generation  
curl -X POST https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/social-content-generator \
  -H "Authorization: Bearer YOUR_SERVICE_KEY" -H "Content-Type: application/json" \
  -d '{"company_id": "test", "template_category": "random"}'
```

## 🎉 Go Live!

Once everything is tested:

1. ✅ Enable all Make.com scenarios
2. ✅ Set up monitoring and notifications
3. ✅ Verify daily content generation at scheduled times
4. ✅ Monitor for 1 week and adjust as needed
5. ✅ Document any customizations for future reference

Your automated content system is now live and will generate:
- **365 blog posts per year** (SEO-optimized, construction-focused)
- **1,460+ social media posts per year** (platform-optimized)
- **Consistent brand presence** across all channels
- **Time savings of 10+ hours per week** on content creation

🚀 **Congratulations! Your complete automated content system is now operational!** 🚀
