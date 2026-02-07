# Coolify Centralized AI Configuration - Deployment Guide

## 🎯 Overview

This guide enables you to deploy centralized AI configuration across your entire portfolio of Coolify-hosted Supabase projects using **Team Shared Variables**. All AI settings are managed from a single location in Coolify, automatically propagating to all connected platforms.

---

## 📋 Prerequisites

- ✅ Coolify Team Shared Variables configured
- ✅ Supabase projects hosted on Coolify
- ✅ Root admin access to each platform
- ✅ Active Anthropic/Claude API key
- ✅ (Optional) OpenAI API key for multi-provider support

---

## 🔧 Part 1: Coolify Team Shared Variables Setup

### Step 1: Configure Team Shared Variables in Coolify

Navigate to your Coolify dashboard → **Team Settings** → **Shared Variables** and add the following:

#### Required Variables

```bash
# Primary AI Provider
AI_DEFAULT_PROVIDER=anthropic

# API Keys
CLAUDE_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Model Selection
DEFAULT_AI_MODEL=claude-sonnet-4-5-20250929
LIGHTWEIGHT_AI_MODEL=claude-3-5-haiku-20241022

# Performance Settings
AI_MAX_RETRIES=3
AI_TIMEOUT_MS=30000
AI_TEMPERATURE=0.7
```

#### Optional Variables

```bash
# Multi-provider support (if using OpenAI)
OPENAI_GLOBAL_API=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Advanced Settings
AI_ENABLE_CACHING=true
```

### Step 2: Verify Variables Are Set

In Coolify, verify all variables show:
- ✅ Variable name
- ✅ Value (API keys should be masked)
- ✅ Scope: **Team Shared**

---

## 🚀 Part 2: Platform Deployment (Per Project)

### Phase 1: Database Migration

#### Step 1: Run the Migration

Connect to your Supabase project and run:

```bash
# Navigate to your project
cd /path/to/your/project

# Apply the migration
supabase db push

# Or if using manual migration
psql -h your-db-host -U postgres -d postgres -f supabase/migrations/20260204000000_coolify_ai_shared_variables.sql
```

#### Step 2: Verify Migration Success

```sql
-- Check tables were created
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'ai_environment_config'
);

-- Check Haiku models were added
SELECT model_display_name, task_type, is_default 
FROM ai_model_configurations 
WHERE model_family LIKE '%haiku%';

-- Should return:
-- Claude 3.5 Haiku | lightweight | true
-- Claude 3 Haiku (Legacy) | lightweight | false

-- Check environment config table
SELECT config_key, coolify_variable, is_required, default_value 
FROM ai_environment_config 
ORDER BY is_required DESC, config_key;
```

Expected output:
```
config_key            | coolify_variable      | is_required | default_value
----------------------|----------------------|-------------|---------------------------
AI_DEFAULT_PROVIDER   | AI_DEFAULT_PROVIDER  | true        | anthropic
CLAUDE_API_KEY        | CLAUDE_API_KEY       | true        | NULL
DEFAULT_AI_MODEL      | DEFAULT_AI_MODEL     | true        | claude-sonnet-4-5-20250929
LIGHTWEIGHT_AI_MODEL  | LIGHTWEIGHT_AI_MODEL | true        | claude-3-5-haiku-20241022
AI_MAX_RETRIES        | AI_MAX_RETRIES       | false       | 3
AI_TIMEOUT_MS         | AI_TIMEOUT_MS        | false       | 30000
...
```

### Phase 2: Environment Variables in Coolify

#### Step 1: Link Variables to Project

For **each project** in Coolify:

1. Navigate to: **Project** → **Environment Variables**
2. Click **Add Team Shared Variable**
3. Select and add each variable:
   - `{{ team.AI_DEFAULT_PROVIDER }}`
   - `{{ team.CLAUDE_API_KEY }}`
   - `{{ team.DEFAULT_AI_MODEL }}`
   - `{{ team.LIGHTWEIGHT_AI_MODEL }}`
   - `{{ team.AI_MAX_RETRIES }}`
   - `{{ team.AI_TIMEOUT_MS }}`
   - `{{ team.AI_TEMPERATURE }}`
   - `{{ team.AI_ENABLE_CACHING }}`
   - `{{ team.OPENAI_GLOBAL_API }}` (optional)

4. **Redeploy** the project for variables to take effect

#### Step 2: Verify Variables in Edge Functions

Edge functions should now have access to these variables. Check logs:

```bash
# In Coolify, view Edge Function logs for your project
# Should show environment variables loaded
```

### Phase 3: Test AI Configuration

#### Option A: Admin UI Test (Recommended)

1. Log into your platform as **root_admin**
2. Navigate to: **Admin** → **AI Models** (`/admin/ai-models`)
3. Click **"Test Configuration"** button
4. Review test results:
   - ✅ Environment variables detected
   - ✅ Standard model working (Claude Sonnet)
   - ✅ Lightweight model working (Claude Haiku)
   - ✅ API key validation successful
   - ✅ Latency measurements shown

#### Option B: API Test (Alternative)

Use curl or Postman:

```bash
# Get your access token from the platform
ACCESS_TOKEN="your-access-token"
SUPABASE_URL="https://your-project.supabase.co"

# Test configuration
curl -X POST "${SUPABASE_URL}/functions/v1/test-ai-configuration" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"testType": "full"}'
```

Expected response:
```json
{
  "success": true,
  "timestamp": "2026-02-04T...",
  "environment": {
    "AI_DEFAULT_PROVIDER": "anthropic",
    "DEFAULT_AI_MODEL": "claude-sonnet-4-5-20250929",
    "LIGHTWEIGHT_AI_MODEL": "claude-3-5-haiku-20241022",
    "CLAUDE_API_KEY": "***configured***",
    "OPENAI_API_KEY": "(not set)"
  },
  "config": {
    "defaultProvider": "anthropic",
    "defaultModel": "claude-sonnet-4-5-20250929",
    "lightweightModel": "claude-3-5-haiku-20241022",
    "maxRetries": 3,
    "timeoutMs": 30000
  },
  "standardModel": {
    "name": "claude-sonnet-4-5-20250929",
    "provider": "claude"
  },
  "lightweightModel": {
    "name": "claude-3-5-haiku-20241022",
    "provider": "claude"
  },
  "testResults": {
    "standard": {
      "success": true,
      "latencyMs": 1234
    },
    "lightweight": {
      "success": true,
      "latencyMs": 456
    }
  }
}
```

---

## 🎨 Part 3: Using the AI Model Management UI

### Accessing the Admin Panel

1. Login as `root_admin`
2. Navigate to `/admin/ai-models`

### Understanding the Interface

#### Tab 1: All Models
- View all configured AI models (standard + lightweight)
- Filter active/inactive models
- Edit or delete models

#### Tab 2: Standard Models
- Models for **complex tasks**:
  - Content generation
  - Long-form writing
  - Code generation
  - Complex analysis
- Controlled by: `DEFAULT_AI_MODEL` environment variable

#### Tab 3: Lightweight Models (Haiku)
- Models for **simple, fast tasks**:
  - Classification
  - Simple Q&A
  - Data extraction
  - Quick summaries
- Controlled by: `LIGHTWEIGHT_AI_MODEL` environment variable
- **Cost-effective** for high-volume operations

#### Tab 4: Environment Configuration
- View all Coolify Team Shared Variables
- See current values and configuration status
- Copy variable names for Coolify setup
- Instructions for updating variables

### Model Management

#### Adding a New Model

1. Click **"Add Model"**
2. Fill in:
   - Provider: `claude`, `openai`, `gemini`
   - Model Name: e.g., `claude-3-7-sonnet-20250219`
   - Display Name: Human-readable name
   - Task Type: `standard` or `lightweight`
   - Usage Category: `general`, `content_generation`, `analysis`, `chat`, `code`
3. Set ratings (1-10):
   - Speed Rating
   - Quality Rating
   - Cost Rating
4. Click **"Save Model"**

#### Setting a New Default Model

1. Edit existing model
2. Check **"Set as Default"**
3. Save
4. **Update Coolify variable** to match (for centralized control)

---

## 🔄 Part 4: Changing AI Models Globally

### Scenario: Upgrade to New Claude Model

When Anthropic releases a new model (e.g., `claude-4-opus-20260301`):

#### Step 1: Add Model to ONE Platform

1. Login to **any platform** as root_admin
2. Go to `/admin/ai-models`
3. Click **"Add Model"**
4. Configure the new model:
   ```
   Provider: claude
   Model Name: claude-4-opus-20260301
   Display Name: Claude 4 Opus
   Task Type: standard
   Active: Yes
   Default: No (initially)
   ```

#### Step 2: Test New Model

1. Click **"Test Configuration"**
2. Verify new model works
3. Check latency and performance

#### Step 3: Update Coolify Team Shared Variable

In Coolify:
1. Go to **Team Settings** → **Shared Variables**
2. Edit `DEFAULT_AI_MODEL`
3. Change value to: `claude-4-opus-20260301`
4. Save

#### Step 4: Redeploy All Projects

In Coolify, for **each project**:
1. Click **Redeploy** or **Restart**
2. Wait for deployment to complete

#### Step 5: Verify Across Portfolio

Test on **each platform**:
1. Login as root_admin
2. Go to `/admin/ai-models`
3. Click **"Test Configuration"**
4. Verify `standardModel.name` shows new model

🎉 **All platforms now use the new model!**

---

## 📊 Part 5: Cost Optimization with Task Types

### Understanding Task Types

#### Standard Tasks (Use Sonnet/Opus)
```typescript
// Use for complex operations
await aiService.generateContent(request, 'standard');
```

**Examples:**
- Blog post generation (800+ words)
- Complex code generation
- Deep analysis
- Long-form content

**Cost:** ~$3-15 per million tokens

#### Lightweight Tasks (Use Haiku)
```typescript
// Use for simple operations
await aiService.generateContent(request, 'lightweight');
```

**Examples:**
- Email subject line generation
- Simple classification
- Short summaries
- Q&A responses
- Data extraction

**Cost:** ~$0.25 per million tokens (10-60x cheaper!)

### Implementing in Your Code

#### Before (All using expensive model):
```typescript
// ❌ Expensive for simple tasks
const subject = await aiService.generateSimpleContent("Generate email subject for: Order #12345");
const category = await aiService.generateSimpleContent("Classify document type: invoice");
const blogPost = await aiService.generateSimpleContent("Write 1000 word blog about construction safety");
```

#### After (Optimized):
```typescript
// ✅ Use Haiku for lightweight tasks
const subject = await aiService.generateContent(
  { messages: [{ role: 'user', content: "Generate email subject for: Order #12345" }] },
  'lightweight' // Uses Claude Haiku
);

const category = await aiService.generateContent(
  { messages: [{ role: 'user', content: "Classify document type: invoice" }] },
  'lightweight' // Uses Claude Haiku
);

// ✅ Use Sonnet for complex content
const blogPost = await aiService.generateContent(
  { messages: [{ role: 'user', content: "Write 1000 word blog about construction safety" }] },
  'standard' // Uses Claude Sonnet
);
```

**Savings Example:**
- 1M lightweight tasks/month
- Before: $15,000/month (all Sonnet)
- After: $250/month (Haiku) + $3000 for complex = **$11,750 saved/month**

---

## 🛠️ Part 6: Troubleshooting

### Issue: "API key not configured"

**Solution:**
1. Check Coolify Team Shared Variables include `CLAUDE_API_KEY`
2. Verify project has linked the team variable
3. Redeploy project in Coolify
4. Check Edge Function logs for environment variables

### Issue: "No default lightweight model configured"

**Solution:**
```sql
-- Check if Haiku models exist
SELECT * FROM ai_model_configurations WHERE task_type = 'lightweight';

-- If missing, run migration again
```

### Issue: Test shows wrong model

**Solution:**
1. Verify Coolify variable value matches model name exactly
2. Check database: `SELECT model_name FROM ai_model_configurations WHERE model_name = 'your-model-name';`
3. Ensure model is `is_active = true`
4. Redeploy project

### Issue: Changes not propagating

**Checklist:**
- ✅ Updated Coolify Team Shared Variable?
- ✅ Redeployed affected projects?
- ✅ Waited for deployment to complete?
- ✅ Cleared browser cache?
- ✅ Checked Edge Function logs?

---

## 📝 Part 7: Migration Checklist for Each Platform

Use this checklist when deploying to a new platform:

### Pre-Deployment
- [ ] Backup database
- [ ] Note current AI settings
- [ ] Verify Coolify Team Variables exist
- [ ] Have root_admin credentials ready

### Deployment
- [ ] Run database migration
- [ ] Verify migration success (check tables/data)
- [ ] Link Team Shared Variables in Coolify
- [ ] Redeploy project
- [ ] Wait for deployment completion

### Testing
- [ ] Login as root_admin
- [ ] Navigate to `/admin/ai-models`
- [ ] Click "Test Configuration"
- [ ] Verify all checks pass:
  - [ ] Environment variables loaded
  - [ ] Standard model works
  - [ ] Lightweight model works
  - [ ] API keys valid
  - [ ] Latency acceptable (< 3000ms)
- [ ] Test actual AI feature (e.g., blog generation)

### Verification
- [ ] Check Edge Function logs for errors
- [ ] Generate test content with both task types
- [ ] Verify costs in AI provider dashboard
- [ ] Update project documentation
- [ ] Mark platform as "migrated" in portfolio tracker

### Post-Deployment
- [ ] Monitor error logs for 24 hours
- [ ] Check AI usage metrics
- [ ] Verify cost reduction (if applicable)
- [ ] Get feedback from team

---

## 🎓 Part 8: Best Practices

### 1. Model Selection Strategy

```typescript
// Decision tree for task type
function selectTaskType(operation: string): AITaskType {
  const lightweightOps = [
    'classify', 'extract', 'summarize', 'tag',
    'validate', 'short_answer', 'subject_line'
  ];
  
  const standardOps = [
    'generate_article', 'write_code', 'deep_analysis',
    'long_form', 'creative_writing'
  ];
  
  if (lightweightOps.some(op => operation.includes(op))) {
    return 'lightweight';
  }
  
  return 'standard';
}
```

### 2. Monitoring & Alerts

Set up alerts for:
- API key expiration
- High error rates (> 5%)
- High latency (> 5000ms)
- Cost spikes (> 20% monthly increase)

### 3. Version Control

Document all changes:
```markdown
## 2026-02-04
- Updated DEFAULT_AI_MODEL: claude-sonnet-4-5-20250929
- Added LIGHTWEIGHT_AI_MODEL support
- Deployed to: Build-Desk, Project-Alpha, Client-Portal

## 2026-02-10
- Upgraded to Claude 4 Opus
- Cost increased 15%, quality improved 25%
```

### 4. Testing Cadence

- **Weekly:** Run configuration test on all platforms
- **Monthly:** Review cost reports
- **Quarterly:** Evaluate new models
- **Annually:** Full AI strategy review

---

## 📚 Part 9: Platform-Specific Notes

### Build-Desk (Reference Implementation)

- ✅ **Status:** Fully deployed and tested
- **Features:**
  - Blog AI automation
  - Social content generation
  - Document classification
  - Lead scoring
- **Performance:**
  - Standard tasks: ~2000ms avg
  - Lightweight tasks: ~500ms avg
- **Costs:** $XXX/month (track and update)

### Other Platforms

Create similar notes for each platform in your portfolio:

```markdown
### Platform: [Name]

- Status: [Not Started / In Progress / Complete]
- Migration Date: YYYY-MM-DD
- Features Using AI:
  - [ ] Feature 1
  - [ ] Feature 2
- Test Results:
  - Standard: [latency]ms
  - Lightweight: [latency]ms
- Monthly Cost: $XXX
- Notes: [Any platform-specific issues or configurations]
```

---

## 🚨 Emergency Rollback

If something goes wrong:

### Quick Rollback

```sql
-- Disable all AI features temporarily
UPDATE ai_model_configurations SET is_active = false;

-- Re-enable only stable models
UPDATE ai_model_configurations 
SET is_active = true 
WHERE model_name IN (
  'claude-3-5-sonnet-20241022',  -- Previous stable standard
  'claude-3-haiku-20240307'      -- Previous stable lightweight
);
```

### Revert Coolify Variables

1. Go to Coolify Team Settings
2. Revert variables to previous values:
   ```
   DEFAULT_AI_MODEL=claude-3-5-sonnet-20241022
   LIGHTWEIGHT_AI_MODEL=claude-3-haiku-20240307
   ```
3. Redeploy all affected projects

---

## 🎯 Success Metrics

Track these KPIs to measure success:

### Performance
- ✅ Average latency < 2000ms (standard)
- ✅ Average latency < 500ms (lightweight)
- ✅ Error rate < 1%
- ✅ Uptime > 99.9%

### Cost
- ✅ Monthly AI costs reduced by [X]% (vs pre-centralization)
- ✅ Cost per AI request < $0.01 (average)
- ✅ Lightweight task adoption > 60%

### Operations
- ✅ Time to deploy new model: < 30 minutes
- ✅ All platforms synchronized: < 1 hour
- ✅ Zero downtime during updates

---

## 📞 Support & Resources

### Coolify Documentation
- Team Shared Variables: [Coolify Docs](https://coolify.io/docs)

### AI Provider Documentation
- Anthropic Claude: https://docs.anthropic.com/
- OpenAI: https://platform.openai.com/docs

### Internal Resources
- Migration file: `/supabase/migrations/20260204000000_coolify_ai_shared_variables.sql`
- AI Service: `/supabase/functions/_shared/ai-service-v2.ts`
- Test function: `/supabase/functions/test-ai-configuration/index.ts`
- Admin UI: `/src/components/admin/AIModelManager.tsx`

---

## ✅ Final Checklist

Before marking deployment as complete:

- [ ] All Coolify Team Variables configured
- [ ] Migration run successfully on all platforms
- [ ] Variables linked in each project
- [ ] All projects redeployed
- [ ] Configuration tests pass on all platforms
- [ ] Live AI features working correctly
- [ ] Error monitoring in place
- [ ] Cost tracking configured
- [ ] Team trained on new system
- [ ] Documentation updated
- [ ] Rollback procedure tested

---

## 🎉 Congratulations!

You now have centralized AI configuration across your entire portfolio. Any changes to Coolify Team Shared Variables will propagate to all platforms automatically, making it easy to:

- ✅ Upgrade to new models globally
- ✅ Optimize costs with task-type routing
- ✅ Maintain consistent AI quality
- ✅ Monitor and troubleshoot from one place
- ✅ Scale AI features across platforms

**Next Steps:**
1. Deploy to remaining platforms in portfolio
2. Optimize task-type usage for cost savings
3. Monitor performance and costs
4. Plan for next model upgrade

---

**Document Version:** 1.0.0  
**Last Updated:** 2026-02-04  
**Maintained By:** Build-Desk Team
