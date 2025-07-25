# Blog to Social Media Automation System

## 🚀 **Enhanced Multi-Platform Content Generation with Smart Routing**

This system now generates **platform-specific content** with different lengths and intelligent routing structure for integration with Buffer, Make.com, Zapier, or custom automation workflows.

## ✨ **Key Features**

- **🤖 AI-Powered Content Generation**: Uses GPT-4 to create platform-optimized content
- **📏 Length-Specific Posts**: Twitter (short), Facebook (medium), LinkedIn (long)
- **📸 Instagram Media Integration**: Randomly selects from your GitHub media assets
- **🔗 Smart URL Inclusion**: Blog URLs added appropriately per platform
- **📊 Structured Webhook Data**: Organized for easy routing in automation platforms
- **⚡ Fallback System**: Works even without OpenAI API

## 📋 **Content Structure by Platform**

### **Twitter (Short Content)**

- **Character Limit**: 250 characters + URL
- **Content Type**: Key insight + call to action
- **Media**: Blog featured image
- **URL**: Direct link appended

### **LinkedIn (Long Content)**

- **Character Limit**: 2800 characters + URL
- **Content Type**: Professional insights + discussion questions
- **Media**: Blog featured image
- **URL**: "Read the full article:" + link

### **Facebook (Medium Content)**

- **Character Limit**: 1900 characters + URL
- **Content Type**: Community-focused + engagement prompts
- **Media**: Blog featured image
- **URL**: "Learn more:" + link

### **Instagram (Medium Content + Random Media)**

- **Character Limit**: 2000 characters + URL + hashtags
- **Content Type**: Visual storytelling + inspiration
- **Media**: Randomly selected from GitHub repository
- **URL**: "🔗 Link in bio:" + link
- **Special**: More hashtags for discoverability

## 📊 **Enhanced Webhook Data Format**

When triggered, the webhook sends this **structured JSON** for easy routing:

```json
{
  "timestamp": "2025-01-29T10:00:00Z",
  "event": "blog_post_social_automation_enhanced",
  "data": {
    "blog_post": {
      "id": "uuid",
      "title": "Blog Post Title",
      "excerpt": "Post excerpt...",
      "body": "Full content...",
      "featured_image_url": "https://...",
      "url": "https://build-desk.com/blog/post-slug"
    },
    "social_posts": [
      {
        "platform": "twitter",
        "content": "Short engaging content with insights... https://build-desk.com/blog/post-slug",
        "hashtags": ["#construction", "#builddesk", "#projectmanagement"],
        "media_urls": ["https://..."],
        "optimal_length": 280,
        "post_type": "short",
        "includes_url": true
      },
      {
        "platform": "linkedin",
        "content": "Professional content with detailed insights...\n\nRead the full article: https://build-desk.com/blog/post-slug",
        "hashtags": ["#construction", "#projectmanagement", "#builddesk"],
        "media_urls": ["https://..."],
        "optimal_length": 3000,
        "post_type": "long",
        "includes_url": true
      },
      {
        "platform": "facebook",
        "content": "Community-focused content...\n\nLearn more: https://build-desk.com/blog/post-slug",
        "hashtags": ["#construction", "#builddesk"],
        "media_urls": ["https://..."],
        "optimal_length": 2000,
        "post_type": "medium",
        "includes_url": true
      },
      {
        "platform": "instagram",
        "content": "Visual storytelling content...\n\n🔗 Link in bio: https://build-desk.com/blog/post-slug",
        "hashtags": ["#construction", "#builddesk", "#constructionlife"],
        "media_urls": ["https://random-github-media-asset.jpg"],
        "optimal_length": 2200,
        "post_type": "medium",
        "includes_url": true
      }
    ],
    "platforms": {
      "twitter": {
        /* Twitter post object */
      },
      "non_twitter": [
        /* Facebook, LinkedIn, Instagram objects */
      ],
      "instagram": {
        /* Instagram post object */
      }
    },
    "routing_data": {
      "short_content": [
        /* Twitter posts */
      ],
      "medium_content": [
        /* Facebook, Instagram posts */
      ],
      "long_content": [
        /* LinkedIn posts */
      ]
    },
    "company_id": "uuid",
    "trigger_type": "auto_publish"
  }
}
```

## 🎯 **Smart Routing Options**

The enhanced webhook structure allows multiple routing strategies:

### **Option 1: Route by Platform**

```javascript
// In Make.com/Zapier
const twitterPost = data.platforms.twitter;
const nonTwitterPosts = data.platforms.non_twitter;
const instagramPost = data.platforms.instagram;
```

### **Option 2: Route by Content Length**

```javascript
// Route by content type
const shortPosts = data.routing_data.short_content; // Twitter
const mediumPosts = data.routing_data.medium_content; // Facebook, Instagram
const longPosts = data.routing_data.long_content; // LinkedIn
```

### **Option 3: Individual Platform Routing**

```javascript
// Process each platform individually
data.social_posts.forEach((post) => {
  switch (post.platform) {
    case "twitter":
      // Send to Twitter via Buffer
      break;
    case "linkedin":
      // Send to LinkedIn via Buffer
      break;
    case "facebook":
      // Send to Facebook via Buffer
      break;
    case "instagram":
      // Send to Instagram via Buffer
      break;
  }
});
```

## 🔄 **Make.com Enhanced Scenario Template**

### **Advanced Multi-Platform Routing:**

1. **Webhook Trigger**

   - Custom webhook listening for BuildDesk automation
   - Parse enhanced JSON structure

2. **Platform Router Module**

   ```
   Router with 4 paths:
   - Path 1: Twitter (data.platforms.twitter)
   - Path 2: LinkedIn (data.platforms.linkedin)
   - Path 3: Facebook (data.platforms.facebook)
   - Path 4: Instagram (data.platforms.instagram)
   ```

3. **Buffer Integration Modules**

   - **Buffer → Create Post** for each platform
   - Use `post.content` as text
   - Use `post.media_urls[0]` as media
   - Use `post.hashtags` as tags

4. **Content-Length Based Routing**

   ```
   Alternative Router by content type:
   - Short Content Router → Twitter Buffer
   - Medium Content Router → Facebook + Instagram Buffer
   - Long Content Router → LinkedIn Buffer
   ```

5. **Instagram Special Handling**
   ```
   Instagram Path:
   - Get random media from post.media_urls
   - Format content with hashtags
   - Send to Buffer Instagram
   ```

## 📸 **Dynamic Instagram Media Integration**

The system now **dynamically pulls media from your Supabase storage** instead of using hardcoded URLs! This makes your Instagram posts much more dynamic and maintainable.

### **How It Works:**

1. **Storage Scan**: Function scans your `site-assets` bucket: [https://ilhzuvemiuyfuxfegtlv.supabase.co/storage/v1/object/public/site-assets/](https://ilhzuvemiuyfuxfegtlv.supabase.co/storage/v1/object/public/site-assets/)
2. **Image Filter**: Automatically filters for image files (jpg, jpeg, png, gif, webp)
3. **Random Selection**: Picks 1-2 random images for each Instagram post
4. **Public URLs**: Generates proper public URLs for your webhook

### **Current Media Assets:**

Your storage currently includes assets like:

- [djpearson_construction_management_platform_that_helps_contrac_1de9fdda-6cac-4868-a8f3-9eebdb2f8631_0.png](https://ilhzuvemiuyfuxfegtlv.supabase.co/storage/v1/object/public/site-assets//djpearson_construction_management_platform_that_helps_contrac_1de9fdda-6cac-4868-a8f3-9eebdb2f8631_0.png)

### **To Add More Media:**

1. **Upload to Supabase Storage**: Go to [Storage Dashboard](https://supabase.com/dashboard/project/ilhzuvemiuyfuxfegtlv/storage/buckets/site-assets)
2. **Upload Images/Videos**: Drag and drop your media files
3. **Automatic Detection**: The function will automatically find and use new media

### **No Configuration Required!**

Unlike the previous GitHub integration, this system automatically:

- ✅ Discovers new images when you upload them
- ✅ Generates proper public URLs
- ✅ Handles file filtering and selection
- ✅ Falls back to blog featured image if no storage media

```typescript
// The function now dynamically fetches from storage:
async function getInstagramMediaFromStorage(supabaseClient) {
  const { data: files } = await supabaseClient.storage
    .from("site-assets")
    .list("", { limit: 100, sortBy: { column: "created_at", order: "desc" } });

  // Filter for image files and generate public URLs
  const publicUrls = imageFiles.map((file) => {
    const {
      data: { publicUrl },
    } = supabaseClient.storage.from("site-assets").getPublicUrl(file.name);
    return publicUrl;
  });

  return publicUrls;
}
```

## 🛠️ **Setup Instructions**

### 1. **Database Setup** (Complete ✅)

```sql
-- Tables created: social_media_automation_settings, social_media_automation_logs
-- Enhanced blog_post relationship added
```

### 2. **Function Deployment** (Complete ✅)

```bash
supabase functions deploy blog_social_webhook --no-verify-jwt
```

### 3. **Environment Variables** (Required)

Set in Supabase Dashboard → Project Settings → Functions:

- `CLAUDE_API_KEY`: Your Claude API key for AI content generation
- `SUPABASE_URL`: Your Supabase project URL (auto-configured)
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (auto-configured)

### 4. **Media Assets** (Action Required)

1. Upload your images/videos to your GitHub repository
2. Update `INSTAGRAM_MEDIA_ASSETS` array in the function with actual URLs
3. Redeploy the function

### 5. **Buffer/Make.com Webhook** (Action Required)

1. Get your Make.com webhook URL or Buffer webhook
2. Configure in Social Media Manager → Automation tab
3. Test the webhook connection

## 🧪 **Testing the Enhanced System**

### **Manual Test via UI:**

1. Go to **Blog Manager**
2. Create/edit a blog post
3. Click the **"Social"** button
4. Check the webhook receives enhanced structured data

### **API Test:**

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/blog_social_webhook' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "blog_post_id": "your-blog-id",
    "company_id": "your-company-id",
    "trigger_type": "manual"
  }'
```

## 📈 **Enhanced Analytics & Monitoring**

The system now tracks:

- **Platform-specific generation success**
- **Content length optimization**
- **Media asset selection for Instagram**
- **Webhook routing success by platform**
- **AI vs fallback content usage**

## 🔒 **Security Features**

- Row Level Security (RLS) on all tables
- Webhook signature validation
- Rate limiting protection
- Error handling with graceful fallbacks

## 🎉 **What's New in Version 2.0**

✅ **Platform-Specific Content**: Tailored length and tone per platform  
✅ **Smart Routing Structure**: Multiple ways to route content in automation  
✅ **Instagram Media Integration**: Random selection from GitHub assets  
✅ **Enhanced Webhooks**: Structured data for complex automation  
✅ **Improved AI Prompts**: Better content generation per platform  
✅ **Fallback System**: Works without AI when needed  
✅ **URL Management**: Smart URL inclusion per platform standards

## 🤝 **Ready for Your Automation Platform**

This enhanced system is now ready for sophisticated routing in:

- **Buffer** (direct integration)
- **Make.com** (advanced routing scenarios)
- **Zapier** (multi-path workflows)
- **Custom webhooks** (full control)

The structured webhook data makes it easy to send the right content to the right platform with the right media and formatting! 🚀
