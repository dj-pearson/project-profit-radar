# 🚀 Blog to Social Media Automation Setup Guide

## Overview

This system automatically creates and distributes social media posts when you publish blog content. It uses AI to optimize content for each platform and can integrate with external automation tools like Make.com, Zapier, or directly with Buffer.

## 🔧 System Components

### 1. Database Schema

- **social_media_automation_settings**: Configuration per company
- **social_media_automation_logs**: Tracking automation attempts
- **social_media_posts**: Generated social posts with blog_post_id linking

### 2. Supabase Function

- **blog-social-webhook**: Processes blog posts and generates social content
- Uses OpenAI GPT-4 for platform-specific content optimization
- Sends webhooks to external automation tools

### 3. Frontend Components

- **SocialAutomationSettings**: Configuration UI in Social Media Manager
- **useSocialMediaAutomation**: React hook for automation management
- **BlogManager**: Integrated automation triggers

## 📋 Setup Steps

### Step 1: Database Migration

```bash
# Run the migration to create required tables
supabase migration up
```

### Step 2: Environment Variables

Ensure these environment variables are set in Supabase:

```env
OPENAI_API_KEY=sk-your-openai-api-key
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Step 3: Configure Social Media Automation

1. **Navigate to Social Media Manager**

   - Go to Admin → Social Media Manager
   - Click the "Automation" tab

2. **Basic Settings**

   - Enable Automation: Turn on the main switch
   - Auto-post on Publish: Automatically trigger when blog posts are published
   - AI Content Generation: Use AI to optimize content for each platform

3. **Platform Selection**
   - Choose which social media platforms to create posts for:
     - LinkedIn (Professional content)
     - Twitter/X (Concise, engaging)
     - Facebook (Community-focused)
     - Instagram (Visual, hashtag-rich)

### Step 4: Webhook Configuration (Optional)

#### Option A: Make.com Integration

1. **Create Make.com Scenario**

   - Add "Webhooks" → "Custom webhook" as trigger
   - Copy the webhook URL provided
   - Add modules for each social platform you want to post to

2. **Configure in BuildDesk**
   - Paste the Make.com webhook URL in the "Webhook URL" field
   - Test the webhook using the "Test" button
   - Save settings

#### Option B: Zapier Integration

1. **Create Zapier Zap**

   - Trigger: "Webhooks by Zapier"
   - Copy the webhook URL
   - Add actions for each social media platform

2. **Configure in BuildDesk**
   - Paste the Zapier webhook URL
   - Test and save

#### Option C: Direct Buffer Integration

If you have an existing Buffer account:

1. Create a custom integration in your external system
2. Use the webhook to receive post data
3. Format and send to Buffer API

## 🎯 How It Works

### Automatic Flow

1. **Blog Post Published**: User publishes a blog post
2. **Automation Check**: System checks if auto-posting is enabled
3. **Content Generation**: AI creates platform-specific content
4. **Database Storage**: Social posts saved with draft status
5. **Webhook Notification**: External systems notified with post data
6. **External Processing**: Make.com/Zapier processes and posts to platforms

### Manual Trigger

1. **Blog Manager**: Use "Trigger Social Automation" button on any blog post
2. **Direct API Call**: Call the webhook function directly

### Content Optimization

The AI system optimizes content for each platform:

- **LinkedIn**: Professional tone, industry insights, 3000 char limit
- **Twitter**: Concise, engaging, 280 char limit
- **Facebook**: Community-focused, discussion-starter, 2000 char limit
- **Instagram**: Visual descriptions, hashtag-rich, 2200 char limit

## 📊 Webhook Data Format

When triggered, the webhook sends this JSON structure:

```json
{
  "timestamp": "2025-01-29T10:00:00Z",
  "event": "blog_post_social_automation",
  "data": {
    "blog_post": {
      "id": "uuid",
      "title": "Blog Post Title",
      "excerpt": "Post excerpt...",
      "body": "Full content...",
      "featured_image_url": "https://..."
    },
    "social_posts": [
      {
        "platform": "linkedin",
        "content": "Optimized LinkedIn content...",
        "hashtags": ["#construction", "#industry"],
        "media_urls": ["https://..."],
        "optimal_length": 3000
      }
    ],
    "company_id": "uuid",
    "trigger_type": "auto_publish"
  }
}
```

## 🔄 Make.com Scenario Template

### Basic Social Media Posting Scenario:

1. **Webhook Trigger**

   - Custom webhook listening for BuildDesk automation

2. **Data Processing**

   - Parse JSON webhook data
   - Extract blog post information
   - Loop through social_posts array

3. **Platform Modules** (one for each platform)

   - **LinkedIn**: "LinkedIn" → "Create a post"
   - **Twitter**: "Twitter" → "Create a tweet"
   - **Facebook**: "Facebook" → "Create a post"
   - **Instagram**: "Instagram" → "Create a post"

4. **Error Handling**
   - Add error handlers for each platform
   - Send notifications on failures

### Advanced Features:

- **Scheduling**: Delay posts using "Tools" → "Sleep"
- **Analytics**: Track performance with custom database logging
- **A/B Testing**: Create variations and test performance

## 📈 Monitoring & Analytics

### Automation Logs

- View automation attempts in the database
- Track success/failure rates
- Monitor webhook delivery status

### Social Media Analytics

- Track engagement across platforms
- Monitor automated vs manual post performance
- Analyze optimal posting times

## 🛠️ Troubleshooting

### Common Issues:

1. **Webhook Not Triggering**

   - Check webhook URL is correct
   - Verify external service is running
   - Test webhook manually

2. **AI Content Generation Failing**

   - Verify OpenAI API key is set
   - Check API usage limits
   - Review error logs in Supabase

3. **Posts Not Creating**
   - Check user permissions
   - Verify database schema is up to date
   - Review automation settings

### Debug Steps:

1. Check Supabase function logs
2. Test webhook URL manually
3. Verify environment variables
4. Review automation logs table

## 🚦 Testing

### Manual Testing:

1. Create a test blog post
2. Set status to "published"
3. Check automation logs
4. Verify social posts created
5. Check webhook delivery (if configured)

### Webhook Testing:

1. Use the "Test" button in automation settings
2. Check external service receives test data
3. Verify webhook signature (if using secrets)

## 📝 Best Practices

1. **Content Quality**: Review AI-generated content before auto-posting
2. **Timing**: Consider optimal posting times for each platform
3. **Monitoring**: Regularly check automation logs and success rates
4. **Customization**: Adjust AI prompts based on your brand voice
5. **Backup Plans**: Have manual posting workflows ready

## 🔮 Future Enhancements

- **Scheduling**: Delay posts for optimal timing
- **A/B Testing**: Test different content variations
- **Analytics Integration**: Connect with platform analytics APIs
- **Image Generation**: AI-generated images for posts
- **Video Clips**: Auto-create video snippets from blog content

## 📞 Support

If you encounter issues:

1. Check the automation logs in the database
2. Review Supabase function logs
3. Test webhook endpoints manually
4. Contact support with specific error messages and logs
