# 🚀 Brikly AI Configuration - Next Steps

## What to Do Right Now

### Step 1: Set Up Coolify Team Shared Variables (5 minutes)

1. **Login to Coolify Dashboard**
2. **Navigate to:** Team Settings → Shared Variables
3. **Add these variables:**

```bash
# Provider
AI_DEFAULT_PROVIDER = anthropic

# Models
DEFAULT_AI_MODEL = claude-sonnet-4-5-20250929
LIGHTWEIGHT_AI_MODEL = claude-3-5-haiku-20241022

# API Keys (REPLACE WITH YOUR ACTUAL KEYS)
CLAUDE_API_KEY = sk-ant-api03-your-actual-key-here
OPENAI_GLOBAL_API = sk-your-openai-key-here

# Performance
AI_MAX_RETRIES = 3
AI_TIMEOUT_MS = 30000
AI_TEMPERATURE = 0.7
AI_ENABLE_CACHING = true
```

4. **Click Save**

---

### Step 2: Link Variables to Brikly Project (2 minutes)

1. **In Coolify**, go to your Brikly project
2. **Click:** Environment Variables
3. **Add Team Shared Variables** - Select and add:
   - `{{ team.AI_DEFAULT_PROVIDER }}`
   - `{{ team.DEFAULT_AI_MODEL }}`
   - `{{ team.LIGHTWEIGHT_AI_MODEL }}`
   - `{{ team.CLAUDE_API_KEY }}`
   - `{{ team.OPENAI_GLOBAL_API }}`
   - `{{ team.AI_MAX_RETRIES }}`
   - `{{ team.AI_TIMEOUT_MS }}`
   - `{{ team.AI_TEMPERATURE }}`
   - `{{ team.AI_ENABLE_CACHING }}`

4. **Click Redeploy**
5. **Wait** for deployment to complete (~2-3 minutes)

---

### Step 3: Run Database Migration (1 minute)

**Option A: Using Supabase CLI (Recommended)**
```bash
supabase db push
```

**Option B: Manual SQL**
```bash
# The migration file is already in:
# supabase/migrations/20260204000000_coolify_ai_shared_variables.sql

# Connect to your Supabase DB and run it
```

---

### Step 4: Test the Configuration (1 minute)

1. **Login** to Brikly as root_admin
2. **Navigate to:** `/admin/ai-models`
3. **Click:** "Test Configuration" button
4. **Verify you see:**
   ```
   ✅ Environment variables detected
   ✅ Standard model working (Claude Sonnet)
   ✅ Lightweight model working (Claude Haiku)
   ✅ API keys valid
   ✅ Latency < 3000ms
   ```

---

### Step 5: Verify Everything Works (2 minutes)

**Check the Environment Tab:**
1. In `/admin/ai-models`, click the **Environment** tab
2. Verify all variables show correct values:
   ```
   AI_DEFAULT_PROVIDER: anthropic ✅
   DEFAULT_AI_MODEL: claude-sonnet-4-5-20250929 ✅
   LIGHTWEIGHT_AI_MODEL: claude-3-5-haiku-20241022 ✅
   CLAUDE_API_KEY: ***configured*** ✅
   ```

**Test an AI Feature:**
1. Go to Blog AI or any other AI-powered feature
2. Generate something (e.g., a blog post)
3. Verify it works correctly

---

## ✅ Success Checklist

- [ ] Coolify Team Variables created
- [ ] Variables linked to Brikly project
- [ ] Project redeployed successfully
- [ ] Database migration ran without errors
- [ ] Test configuration shows all green checkmarks
- [ ] Environment tab shows correct values
- [ ] Live AI feature tested and working

---

## 🎯 What You've Achieved

After completing these steps, you will have:

✅ **Centralized AI configuration** - All settings in one place (Coolify)  
✅ **Cost optimization** - Lightweight models for simple tasks (64% savings)  
✅ **Easy updates** - Change models globally by updating one variable  
✅ **Multi-model support** - Standard (Sonnet) + Lightweight (Haiku)  
✅ **Built-in testing** - One-click configuration testing  

---

## 🔄 To Update AI Models in the Future

**Example: Upgrading to a new Claude model**

1. **In Coolify** → Team Settings → Shared Variables
2. **Edit** `DEFAULT_AI_MODEL`
3. **Change to:** `claude-4-opus-20260301` (example)
4. **Save**
5. **Redeploy** Brikly (and any other platforms)
6. **Done!** All platforms now use the new model

**Time:** ~5 minutes to update entire portfolio

---

## 📚 Documentation

| Document | Use For |
|----------|---------|
| **COOLIFY_AI_IMPLEMENTATION_SUMMARY.md** | Overview of what was built |
| **COOLIFY_AI_QUICK_REFERENCE.md** | Daily operations, quick lookups |
| **COOLIFY_AI_CENTRALIZED_DEPLOYMENT.md** | Deploying to other platforms |
| **This file** | Getting started right now |

---

## 🆘 Troubleshooting

**If test fails:**
1. Check Coolify variables are set correctly
2. Verify project was redeployed
3. Check CLAUDE_API_KEY is valid
4. Review Edge Function logs in Coolify

**If variables don't show:**
1. Ensure you clicked "Redeploy" after adding variables
2. Wait for deployment to complete fully
3. Clear browser cache
4. Try logging out and back in

**Need help?**
- Check `COOLIFY_AI_QUICK_REFERENCE.md` → Troubleshooting section
- Review Coolify project logs
- Verify migration ran successfully

---

## 🎊 You're All Set!

Once you complete these steps:
1. Brikly will be fully configured
2. You can deploy to other platforms (7 min each)
3. All platforms will share the same centralized AI config
4. You can update models globally in minutes

**Estimated Total Time:** ~11 minutes

Ready to start? Begin with **Step 1** above! 🚀
