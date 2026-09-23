# 🚀 Claude 4 Models Update Guide

Based on the latest [Claude models documentation](https://docs.anthropic.com/en/docs/about-claude/models/overview), we've added support for the new Claude 4 models!

## ✨ New Models Available

- **Claude Opus 4** (`claude-opus-4-20250514`) - Most powerful and capable model
- **Claude Sonnet 4** (`claude-sonnet-4-20250514`) - High-performance model with exceptional reasoning
- **Claude Sonnet 3.7** (`claude-3-7-sonnet-20250219`) - Latest before Claude 4 with extended thinking

## 🎯 Quick Setup

### 1. Add Models to Database

Go to **Supabase Dashboard → SQL Editor** and run:

```sql
-- Add Claude 4 Models (Fixed - No ON CONFLICT dependency)
INSERT INTO public.ai_model_configurations (
  provider, model_name, model_display_name, model_family, 
  max_tokens, context_window, speed_rating, quality_rating, cost_rating, 
  recommended_for_blog, good_for_seo, good_for_long_form, is_active, is_default, 
  requires_api_key, description, supports_vision, supports_function_calling
) VALUES
('claude', 'claude-opus-4-20250514', 'Claude Opus 4', 'claude-4', 32000, 200000, 6, 10, 10, true, true, true, true, false, 'CLAUDE_API_KEY', 'Our most powerful and capable model with superior reasoning capabilities', true, true),
('claude', 'claude-sonnet-4-20250514', 'Claude Sonnet 4', 'claude-4', 64000, 200000, 8, 10, 8, true, true, true, true, false, 'CLAUDE_API_KEY', 'High-performance model with exceptional reasoning capabilities and efficiency', true, true),
('claude', 'claude-3-7-sonnet-20250219', 'Claude Sonnet 3.7', 'claude-3.7', 64000, 200000, 8, 9, 7, true, true, true, true, false, 'CLAUDE_API_KEY', 'High-performance model with early extended thinking capabilities', true, true);
```

### 2. Set Claude Sonnet 4 as Default

```sql
-- Update default model
UPDATE public.ai_model_configurations 
SET is_default = false 
WHERE provider = 'claude' AND is_default = true;

UPDATE public.ai_model_configurations 
SET is_default = true 
WHERE provider = 'claude' AND model_name = 'claude-sonnet-4-20250514';
```

### 3. Test the New Models

1. **Go to Blog Manager → Debug AI**
2. **Run Diagnostics** - Should show Claude 4 models available
3. **Deploy Edge Functions** if needed (see deployment guide)
4. **Test generation** with Claude Sonnet 4

## 📊 Model Comparison

| Model | Best For | Speed | Quality | Cost | Max Output |
|-------|----------|--------|---------|------|------------|
| **Claude Opus 4** | Highest quality content | ⭐⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐ | 32K tokens |
| **Claude Sonnet 4** | Best balance | ⭐⭐⭐⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐⭐⭐⭐ | 64K tokens |
| Claude Sonnet 3.7 | Extended thinking | ⭐⭐⭐⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐⭐⭐ | 64K tokens |
| Claude 3.5 Sonnet | Reliable choice | ⭐⭐⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐⭐⭐⭐ | 8K tokens |

## 🎉 What You'll See

After setup:

1. **Model Dropdowns** will show Claude 4 models at the top
2. **Claude Sonnet 4** will be the default choice
3. **Enhanced quality** in generated blog content
4. **Better reasoning** for complex construction topics

## 🔧 Troubleshooting

### Error: "there is no unique or exclusion constraint matching the ON CONFLICT specification"

This means your table doesn't have the expected unique constraint. **Solution:**

1. **Use the fixed SQL above** (without ON CONFLICT)
2. **If you get "duplicate key" error**, run this first:
   ```sql
   -- Check existing models
   SELECT provider, model_name, model_display_name 
   FROM public.ai_model_configurations 
   WHERE provider = 'claude';
   
   -- If Claude 4 models exist, you're done!
   -- If you want to update them, delete first:
   DELETE FROM public.ai_model_configurations 
   WHERE model_name IN ('claude-opus-4-20250514', 'claude-sonnet-4-20250514', 'claude-3-7-sonnet-20250219');
   ```
3. **Then run the INSERT** from Step 1

### Verify Installation

```sql
-- Check all Claude models
SELECT model_display_name, model_name, model_family, is_default 
FROM public.ai_model_configurations 
WHERE provider = 'claude' 
ORDER BY model_family DESC, quality_rating DESC;
```

## 💡 Recommendations

- **Use Claude Sonnet 4** for regular blog generation (best balance)
- **Use Claude Opus 4** for premium/important content (highest quality)
- **Keep Claude 3.5 Haiku** as fallback (fastest/cheapest)

The system now supports the latest and most capable Claude models for your AI-powered blog generation! 🚀 