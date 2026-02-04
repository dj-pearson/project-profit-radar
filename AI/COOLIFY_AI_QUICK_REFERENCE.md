# Coolify AI Variables - Quick Reference

## 📋 Team Shared Variables to Set in Coolify

Copy and paste these into your Coolify Team Settings → Shared Variables:

### Core Configuration

```bash
# Provider Selection
AI_DEFAULT_PROVIDER=anthropic

# Model Selection (update these when upgrading models)
DEFAULT_AI_MODEL=claude-sonnet-4-5-20250929
LIGHTWEIGHT_AI_MODEL=claude-3-5-haiku-20241022

# API Keys
CLAUDE_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_GLOBAL_API=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Performance Tuning
AI_MAX_RETRIES=3
AI_TIMEOUT_MS=30000
AI_TEMPERATURE=0.7
AI_ENABLE_CACHING=true
```

---

## 🔗 How to Link to Projects

For **each project** in Coolify:

1. Project → Environment Variables
2. Add these Team Shared Variables:

```
{{ team.AI_DEFAULT_PROVIDER }}
{{ team.DEFAULT_AI_MODEL }}
{{ team.LIGHTWEIGHT_AI_MODEL }}
{{ team.CLAUDE_API_KEY }}
{{ team.OPENAI_GLOBAL_API }}
{{ team.AI_MAX_RETRIES }}
{{ team.AI_TIMEOUT_MS }}
{{ team.AI_TEMPERATURE }}
{{ team.AI_ENABLE_CACHING }}
```

3. Click **Redeploy**

---

## 🎯 Model Recommendations by Use Case

### Standard Tasks (Use Sonnet/Opus)

**When to use:** Complex, high-value operations
- **DEFAULT_AI_MODEL:** `claude-sonnet-4-5-20250929`
- **Cost:** ~$3 per million tokens
- **Use for:**
  - Blog post generation (500+ words)
  - Code generation
  - Complex analysis
  - Long-form content
  - Creative writing

### Lightweight Tasks (Use Haiku)

**When to use:** Simple, high-volume operations
- **LIGHTWEIGHT_AI_MODEL:** `claude-3-5-haiku-20241022`
- **Cost:** ~$0.25 per million tokens (12x cheaper!)
- **Use for:**
  - Email subject lines
  - Classification
  - Data extraction
  - Short summaries (< 100 words)
  - Simple Q&A
  - Tags/categories

---

## 🔄 Model Update Workflow

### To upgrade to a new Claude model globally:

1. **Update Coolify variable:**
   ```
   DEFAULT_AI_MODEL=claude-4-opus-20260301
   ```

2. **Redeploy all projects** in Coolify

3. **Test on one platform:**
   - Login as root_admin
   - Go to `/admin/ai-models`
   - Click "Test Configuration"
   - Verify new model works

4. **Monitor for 24 hours**

5. **Done!** All platforms now use new model

---

## 🧪 Testing Commands

### Test via Admin UI (Recommended)
1. Login as `root_admin`
2. Navigate to `/admin/ai-models`
3. Click **"Test Configuration"**

### Test via API
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/test-ai-configuration" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"testType": "full"}'
```

### Expected Test Results
```json
{
  "success": true,
  "config": {
    "defaultProvider": "anthropic",
    "defaultModel": "claude-sonnet-4-5-20250929",
    "lightweightModel": "claude-3-5-haiku-20241022"
  },
  "testResults": {
    "standard": { "success": true, "latencyMs": 1500 },
    "lightweight": { "success": true, "latencyMs": 400 }
  }
}
```

---

## 💰 Cost Savings Calculator

### Example Workload
- 100,000 AI calls per month
- Average prompt: 1,000 tokens
- Average response: 500 tokens
- Total: 150 million tokens/month

### Before Optimization (All Sonnet)
```
150M tokens × $3/1M = $450/month
```

### After Optimization (70% Haiku, 30% Sonnet)
```
Haiku:  105M × $0.25/1M = $26.25
Sonnet:  45M × $3/1M   = $135.00
Total:                   $161.25/month

SAVINGS: $288.75/month (64% reduction!)
```

---

## 🚨 Troubleshooting

### Error: "API key not configured"
✅ Check variable exists in Coolify  
✅ Verify project has linked the variable  
✅ Redeploy project  
✅ Check Edge Function logs  

### Error: "Model not found"
✅ Verify model name spelling matches exactly  
✅ Check model exists in database  
✅ Ensure model `is_active = true`  

### Test fails but API works
✅ Check test permissions (root_admin only)  
✅ Verify Supabase auth token valid  
✅ Review Edge Function logs  

---

## 📊 Monitoring Checklist

### Daily
- [ ] Check error rates in Supabase Dashboard
- [ ] Monitor API usage in Claude dashboard

### Weekly
- [ ] Run configuration test on all platforms
- [ ] Review latency metrics
- [ ] Check for failed AI calls

### Monthly
- [ ] Review total costs vs budget
- [ ] Analyze task type distribution
- [ ] Evaluate new model options
- [ ] Update this document with current values

---

## 🔒 Security Best Practices

1. **Never commit API keys** to git
2. **Use Coolify Team Variables** for all secrets
3. **Rotate API keys** every 90 days
4. **Monitor unusual usage** patterns
5. **Set up billing alerts** in AI provider dashboard
6. **Restrict root_admin access** to AI settings

---

## 📚 Additional Resources

- Full Deployment Guide: `COOLIFY_AI_CENTRALIZED_DEPLOYMENT.md`
- Migration File: `supabase/migrations/20260204000000_coolify_ai_shared_variables.sql`
- AI Service: `supabase/functions/_shared/ai-service-v2.ts`
- Test Function: `supabase/functions/test-ai-configuration/index.ts`
- Admin UI: `src/components/admin/AIModelManager.tsx`

---

**Last Updated:** 2026-02-04  
**Version:** 1.0.0
