# 🚀 Edge Functions Deployment Guide

## Fix the 500 Error

The 500 error means the Edge Function exists but is failing during execution. This usually means:
1. The function code has an error
2. Environment variables are missing
3. The function wasn't deployed properly

## Step-by-Step Deployment

### 1. Deploy the Simple Test Function First

1. **Go to Supabase Dashboard**: https://app.supabase.com/
2. **Navigate to Edge Functions**: Left sidebar → Edge Functions
3. **Create New Function**: Click "Create a new function"
4. **Function Name**: `enhanced-blog-ai-simple`
5. **Copy the code**: Copy entire contents of `supabase/functions/enhanced-blog-ai-simple/index.ts`
6. **Deploy**: Click "Deploy function"

### 2. Test the Simple Function

1. **Run the Debug Tool**: Go to Blog Manager → Debug AI → Run Diagnostics
2. **Check Results**: You should see "Edge Function (Simple)" test pass
3. **If it fails**: Check the function logs in Supabase Dashboard

### 3. Add Environment Variables

1. **Go to Settings**: Supabase Dashboard → Settings → Edge Functions
2. **Add Environment Variables**:
   ```
   Name: CLAUDE_API_KEY
   Value: [Your Claude API key from Anthropic]
   ```
3. **Save**: Click "Save"

### 4. Test Claude Integration

1. **Run Debug Tool Again**: Should now show Claude API test
2. **If Claude test passes**: Ready to deploy main function
3. **If Claude test fails**: Check API key is correct

### 5. Deploy Main Function

1. **Create New Function**: `enhanced-blog-ai`
2. **Copy the code**: Copy entire contents of `supabase/functions/enhanced-blog-ai/index.ts`
3. **Deploy**: Click "Deploy function"

### 6. Final Test

1. **Run Debug Tool**: All tests should pass
2. **Test Generation**: Try generating content in Auto-Generation tab
3. **Check Quality**: Should get AI-generated content instead of fallback

## Troubleshooting

### Function Won't Deploy
- **Check syntax**: Make sure TypeScript code is valid
- **Check imports**: Ensure all import paths are correct
- **Try simple function first**: Start with the simple version

### 500 Error Persists
1. **Check Logs**: Supabase Dashboard → Edge Functions → Function Name → Logs
2. **Look for errors**: Console.log statements will show in logs
3. **Check environment vars**: Ensure CLAUDE_API_KEY is set

### API Key Issues
- **Get Claude API key**: https://console.anthropic.com/
- **Check format**: Should start with `sk-ant-`
- **Test manually**: Try the key in Claude's API documentation

### Still Using Fallback Content
- **Check function name**: Ensure it's exactly `enhanced-blog-ai`
- **Check function response**: Look at debug tool details
- **Check authentication**: Ensure you have root_admin role

## Quick Debug Commands

### Check if functions exist:
```sql
-- In Supabase SQL Editor
SELECT name FROM pg_catalog.pg_proc WHERE proname LIKE '%enhanced%';
```

### Test function directly:
```javascript
// In browser console on your app
const { data, error } = await supabase.functions.invoke('enhanced-blog-ai-simple', {
  body: { action: 'test-generation', topic: 'test' }
});
console.log(data, error);
```

## Expected Results

After successful deployment:

1. **Debug Tool Shows**:
   - ✅ Database Tables: Pass
   - ✅ AI Models Configuration: Pass  
   - ✅ Edge Function (Simple): Pass
   - ✅ Claude API Test: Pass
   - ✅ Edge Function Test: Pass
   - ✅ API Keys Configuration: Pass

2. **Content Generation**:
   - Real AI-generated articles (not fallback)
   - 1200+ word comprehensive content
   - Professional construction industry focus
   - Proper SEO optimization

3. **No More Errors**:
   - No 404 errors
   - No 500 errors
   - Smooth generation process

## Need Help?

If you're still having issues:

1. **Check Function Logs**: Most errors show up in the logs
2. **Start with Simple Function**: Get that working first
3. **Verify API Key**: Test it manually if needed
4. **Check Environment**: Make sure variables are saved

The simple function is designed to give you detailed diagnostic information about what's working and what isn't! 