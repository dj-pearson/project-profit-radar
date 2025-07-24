# 🚀 Blog AI Generation Setup Guide

## Quick Setup for Manual Topic Generation

Your BlogManager now uses the enhanced AI blog generation system. Here's how to get it working:

### 1. **Environment Variables (Required)**

Add these to your Supabase project settings:

```bash
# Primary AI Provider (Choose one)
CLAUDE_API_KEY=your_claude_api_key_here
# OR
OPENAI_API_KEY=your_openai_api_key_here
# OR  
GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. **Database Setup (Optional but Recommended)**

The system will work with defaults, but for better control, run this SQL in your Supabase SQL Editor:

```sql
-- Insert default auto-generation settings for your company
INSERT INTO public.blog_auto_generation_settings (
  company_id,
  is_enabled,
  preferred_ai_provider,
  preferred_model,
  target_word_count,
  content_style,
  industry_focus,
  geo_optimization,
  brand_voice_guidelines
) VALUES (
  'your-company-id-here',  -- Replace with your actual company ID
  false,  -- Keep disabled for manual use only
  'claude',  -- or 'openai' or 'gemini'
  'claude-3-5-sonnet-20241022',
  1200,
  'professional',
  '{"construction", "project management", "technology"}',
  true,
  'Professional, authoritative, but approachable. Use industry expertise while remaining accessible to various skill levels.'
);
```

### 3. **How It Works Now**

1. **BlogManager → New Post → AI Assistant Tab**
2. Enter your topic (e.g., "Benefits of Digital Project Management in Construction")
3. Click "Generate with AI"
4. The system will:
   - Use the enhanced AI generation engine
   - Apply professional construction industry focus
   - Generate SEO-optimized content
   - Return just the content (won't auto-create the post)
   - Fill in your form fields for review before saving

### 4. **Troubleshooting**

**Error: "API keys not configured"**
- Add the appropriate API key to your Supabase environment variables

**Error: "Auto-generation settings not configured"**  
- Either run the SQL setup above, or the system will use sensible defaults

**Error: "Authentication failed"**
- Make sure you're logged in as a root admin

### 5. **API Key Setup Instructions**

#### Claude (Recommended)
1. Go to [Claude API Console](https://console.anthropic.com/)
2. Create an API key
3. Add `CLAUDE_API_KEY=your_key_here` to Supabase environment

#### OpenAI
1. Go to [OpenAI API Console](https://platform.openai.com/api-keys)
2. Create an API key  
3. Add `OPENAI_API_KEY=your_key_here` to Supabase environment

#### Gemini
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create an API key
3. Add `GEMINI_API_KEY=your_key_here` to Supabase environment

### 6. **What Changed**

- **Before**: Used simple `blog-ai` function with basic `ai_settings` table
- **Now**: Uses advanced `enhanced-blog-ai` function with better content generation
- **Benefits**: 
  - Better SEO optimization
  - Construction industry expertise
  - Improved content quality
  - Fallback AI providers
  - More sophisticated prompting

### 7. **Next Steps**

Once manual generation is working, you can:
1. Enable auto-generation in the Auto-Generation settings
2. Set up scheduled blog posting
3. Configure advanced SEO and content diversity settings

---

## Test Your Setup

1. Go to BlogManager
2. Click "New Post"  
3. Go to "AI Assistant" tab
4. Enter: "5 Essential Project Management Tools for Construction"
5. Click "Generate with AI"
6. You should see the form populate with high-quality content!

---

*If you encounter any issues, the enhanced error messages will guide you to the specific problem and solution.* 