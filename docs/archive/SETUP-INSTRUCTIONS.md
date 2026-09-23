# 🚀 AI Blog Auto-Generation Setup Instructions

## Step 1: Run Database Migration

You need to create the required database tables in your Supabase instance.

### Option A: Using Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**: https://app.supabase.com/
2. **Select your project**: `ilhzuvemiuyfuxfegtlv`
3. **Navigate to SQL Editor**: Left sidebar → SQL Editor
4. **Create a new query**: Click "New Query"
5. **Copy and paste the entire contents** of `setup-blog-auto-generation.sql`
6. **Run the query**: Click "Run" button
7. **Verify success**: You should see "AI Blog Auto-Generation System setup completed successfully!"

### Option B: Using Supabase CLI (If available)

```bash
supabase db push
```

## Step 2: Add Environment Variables

Add the Claude API key to your Supabase project:

1. **Go to Supabase Dashboard** → Your Project
2. **Navigate to Settings** → Edge Functions
3. **Add Environment Variable**:
   - **Name**: `CLAUDE_API_KEY`
   - **Value**: Your Claude API key from Anthropic
4. **Save** the environment variable

### Optional API Keys (for additional models):
- `OPENAI_API_KEY` - For GPT models
- `GEMINI_API_KEY` - For Google Gemini models

## Step 3: Deploy Edge Functions

You need to deploy the Edge Functions to your Supabase project.

### Using Supabase Dashboard:

1. **Go to Edge Functions** in your Supabase dashboard
2. **Create new function** named `enhanced-blog-ai`
3. **Copy the code** from `supabase/functions/enhanced-blog-ai/index.ts`
4. **Deploy the function**

Repeat for `process-blog-generation-queue`.

### Using Supabase CLI (If available):

```bash
supabase functions deploy enhanced-blog-ai
supabase functions deploy process-blog-generation-queue
```

## Step 4: Test the Setup

1. **Go to your application**: Navigate to Blog Manager
2. **Click "Auto-Generation"** button
3. **Verify the interface loads** without 404 errors
4. **Check AI Models**: You should see Claude models available
5. **Save basic settings** to test database connectivity

## Troubleshooting

### Issue: 404 Errors on Table Access

**Problem**: Tables don't exist yet
**Solution**: Run the SQL migration in Step 1

### Issue: No AI Models Available

**Problem**: AI model configurations table is empty
**Solution**: The setup script includes sample models. If still empty, run this query:

```sql
SELECT * FROM public.ai_model_configurations;
```

If empty, re-run the setup script.

### Issue: Function Not Found Errors

**Problem**: Edge Functions not deployed
**Solution**: Deploy the functions as described in Step 3

### Issue: Permission Denied

**Problem**: Row Level Security policies
**Solution**: Ensure your user has `root_admin` role:

```sql
UPDATE public.user_profiles 
SET role = 'root_admin' 
WHERE id = auth.uid();
```

## Verification Checklist

- [ ] Database tables created (no 404 errors)
- [ ] AI models appear in dropdown
- [ ] Settings can be saved successfully
- [ ] Claude API key is configured
- [ ] Edge Functions are deployed
- [ ] User has root_admin role

## Need Help?

If you encounter issues:

1. **Check Supabase Logs**: Dashboard → Logs
2. **Verify API Keys**: Dashboard → Settings → Edge Functions
3. **Check Database**: Dashboard → Table Editor
4. **Test Functions**: Dashboard → Edge Functions → Test

## Next Steps

Once setup is complete:

1. **Configure your first auto-generation**:
   - Set frequency (recommend starting with weekly)
   - Choose Claude 3.5 Sonnet model
   - Enable GEO optimization
   - Set to draft mode for initial testing

2. **Test generation**:
   - Use the "Test" feature first
   - Review generated content quality
   - Adjust settings as needed

3. **Enable automation**:
   - Turn on scheduling once satisfied with quality
   - Set up notifications
   - Monitor the generation queue 