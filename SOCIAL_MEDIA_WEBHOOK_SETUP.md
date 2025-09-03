# Make.com Social Media Webhook Receiver Setup

This guide shows you how to create a separate Make.com scenario to receive social media content and post it to various platforms.

## 🎯 Purpose

After your daily blog is generated, the social media automation creates platform-specific content and sends it to a webhook. This scenario receives that content and posts it to your social media accounts.

## 📋 Setup Steps

### 1. Create New Scenario for Social Media

1. In Make.com, create a **new scenario**
2. Name it: "Social Media Content Receiver"

### 2. Add Webhook Trigger

1. Add **"Webhooks"** → **"Custom webhook"** as the first module
2. Click **"Create a webhook"**
3. Copy the webhook URL (you'll need this for the blog scenario)
4. The webhook URL will look like: `https://hook.make.com/xxxxxxxxxx`

### 3. Add JSON Parser (Optional but Recommended)

1. Add **"JSON"** → **"Parse JSON"** module after webhook
2. Configure:
   - **JSON string**: `{{1.data}}`
   - This will structure the incoming social media data

### 4. Add Router for Platform Splitting

1. Add **"Flow Control"** → **"Router"**
2. Create 4 paths:
   - Path 1: Twitter
   - Path 2: LinkedIn  
   - Path 3: Instagram
   - Path 4: Facebook

### 5. Configure Each Platform Path

#### Path 1: Twitter
1. **Filter**: `{{2.data.platforms.twitter.platform}}` equals `twitter`
2. **Buffer/Twitter Module**:
   - Text: `{{2.data.platforms.twitter.content}}`
   - Media: `{{2.data.platforms.twitter.media_urls[0]}}`
   - Profile: Your Twitter Buffer profile

#### Path 2: LinkedIn
1. **Filter**: Find `linkedin` in `{{2.data.social_posts}}`
2. **Iterator**: `{{2.data.social_posts}}`
3. **Filter**: `{{3.platform}}` equals `linkedin`
4. **Buffer/LinkedIn Module**:
   - Text: `{{3.content}}`
   - Media: `{{3.media_urls[0]}}`
   - Profile: Your LinkedIn Buffer profile

#### Path 3: Instagram  
1. **Filter**: `{{2.data.platforms.instagram.platform}}` equals `instagram`
2. **Buffer/Instagram Module**:
   - Text: `{{2.data.platforms.instagram.content}}`
   - Media: `{{2.data.platforms.instagram.media_urls[0]}}`
   - Profile: Your Instagram Buffer profile

#### Path 4: Facebook
1. **Filter**: Find `facebook` in `{{2.data.social_posts}}`
2. **Iterator**: `{{2.data.social_posts}}`
3. **Filter**: `{{3.platform}}` equals `facebook`
4. **Buffer/Facebook Module**:
   - Text: `{{3.content}}`
   - Media: `{{3.media_urls[0]}}`
   - Profile: Your Facebook Buffer profile

## 🔗 Connect to Your Blog Scenario

### Update Your Blog Generation Scenario

In your daily blog generation scenario, update the social media HTTP module:

```json
{
  "blog_post_id": "{{1.content.blogPost.id}}",
  "company_id": "YOUR_COMPANY_ID_HERE",
  "trigger_type": "auto_publish", 
  "webhook_url": "https://hook.make.com/YOUR_WEBHOOK_ID_HERE"
}
```

Replace `YOUR_WEBHOOK_ID_HERE` with the webhook URL from step 2.

## 🎨 Alternative: Direct Platform APIs

Instead of Buffer, you can post directly to platform APIs:

### Twitter API v2
```
URL: https://api.twitter.com/2/tweets
Method: POST
Headers: 
  Authorization: Bearer YOUR_TWITTER_BEARER_TOKEN
  Content-Type: application/json
Body:
{
  "text": "{{content}}"
}
```

### LinkedIn API
```
URL: https://api.linkedin.com/v2/ugcPosts
Method: POST  
Headers:
  Authorization: Bearer YOUR_LINKEDIN_TOKEN
  Content-Type: application/json
Body:
{
  "author": "urn:li:person:YOUR_PERSON_ID",
  "lifecycleState": "PUBLISHED",
  "specificContent": {
    "com.linkedin.ugc.ShareContent": {
      "shareCommentary": {
        "text": "{{content}}"
      },
      "shareMediaCategory": "NONE"
    }
  }
}
```

## 📊 Testing Your Setup

### Test Webhook Data
Send this test payload to your webhook:

```json
{
  "timestamp": "2025-01-29T10:00:00Z",
  "event": "blog_post_social_automation_enhanced",
  "data": {
    "blog_post": {
      "id": "test-id",
      "title": "Test Blog Post",
      "url": "https://example.com/blog/test"
    },
    "social_posts": [
      {
        "platform": "twitter",
        "content": "Test Twitter content with hashtags #test",
        "hashtags": ["#test"],
        "media_urls": ["https://example.com/image.jpg"],
        "post_type": "short"
      },
      {
        "platform": "linkedin",
        "content": "Test LinkedIn professional content with insights.",
        "hashtags": ["#professional"],
        "media_urls": ["https://example.com/image.jpg"],
        "post_type": "long"
      }
    ],
    "platforms": {
      "twitter": {
        "platform": "twitter",
        "content": "Test Twitter content with hashtags #test",
        "hashtags": ["#test"],
        "media_urls": ["https://example.com/image.jpg"]
      },
      "instagram": {
        "platform": "instagram", 
        "content": "Test Instagram visual content 📸",
        "hashtags": ["#visual"],
        "media_urls": ["https://example.com/image.jpg"]
      }
    }
  }
}
```

## 🔧 Advanced Configuration

### Add Scheduling Delays
- Add **"Tools"** → **"Sleep"** modules between posts
- Set 2-5 minute delays to avoid rate limits
- Randomize posting times slightly

### Add Error Handling
- Add error handler routes after each platform module
- Send notifications if posts fail
- Log failed posts for manual review

### Add Success Notifications
- Add **"Email"** or **"Slack"** modules after successful posts
- Include post content and platform in notifications
- Track daily posting statistics

## 💡 Pro Tips

1. **Test Each Platform Separately**: Enable one path at a time during testing
2. **Monitor Rate Limits**: Each platform has posting frequency limits
3. **Content Preview**: Add email notifications to preview content before posting
4. **Scheduling**: Consider adding random delays between posts
5. **Backup Plan**: Keep manual posting as backup for important content

## 🚨 Troubleshooting

### Common Issues:
- **Webhook not triggered**: Check webhook URL in blog scenario
- **Missing content**: Verify JSON parsing is working
- **Platform API errors**: Check authentication tokens
- **Rate limiting**: Add delays between posts

### Debug Steps:
1. Test webhook with manual data first
2. Check Make.com execution logs
3. Verify platform API credentials
4. Test each router path individually

This setup will automatically receive your generated social media content and post it to all your platforms! 🚀
