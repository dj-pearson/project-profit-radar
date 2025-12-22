# Edge Functions Rollback Summary

## ✅ Complete - All Edge Functions Updated for Single-Tenant

### 📊 Statistics

- **Total Edge Functions**: 165
- **Functions Modified**: 116
- **Pattern Matches**: 384+
- **Scripts Created**: 2 automated cleanup scripts

---

## 🔧 Changes Made

### 1. Bulk Automated Changes (113 functions)
**Script**: `scripts/bulk-cleanup-edge-functions.ps1`

#### Pattern Replacements:
- ✅ Changed `auth-helpers` imports to `auth-helpers-single-tenant`
- ✅ Removed `, siteId` from destructuring
- ✅ Removed `.eq('site_id', siteId)` from database queries
- ✅ Removed `site_id: siteId` from inserts
- ✅ Removed siteId parameter from function calls
- ✅ Removed siteId validation blocks
- ✅ Removed comments mentioning site_id

#### Affected Functions Include:
- ai-content-generator
- analytics-oauth-google
- api-auth, api-management
- blog-ai, blog-ai-automation
- calculate-* functions
- change-orders, change-subscription
- check-* functions
- create-stripe-checkout
- crm-email-automation
- daily-reports
- generate-* functions
- geofencing
- image-processor
- quickbooks-* functions
- seo-* functions
- stripe-webhook
- time-tracking
- workflow-execution
- ... and 90+ more

### 2. Auth Function Schemas (3 functions)
**Script**: `scripts/fix-auth-function-schemas.ps1`

#### Fixed:
- ✅ `send-auth-otp/index.ts` - Removed siteId from schema
- ✅ `reset-password-otp/index.ts` - Removed siteId from schema
- ✅ `verify-auth-otp/index.ts` - Removed siteId from schema

### 3. Email Service Updates
**File**: `supabase/functions/_shared/ses-email-service.ts`

#### Changes:
- ✅ Created single-tenant `getSiteEmailConfig()` function
- ✅ Always returns default BuildDesk configuration
- ✅ Kept multi-tenant version as deprecated reference

### 4. Critical Auth Functions (3 functions)
**Manually Updated**:

#### `signup-with-otp/index.ts`:
- ✅ Removed siteId from schema validation
- ✅ Removed site verification logic
- ✅ Updated getSiteEmailConfig call
- ✅ Fixed comments

#### `send-auth-otp/index.ts`:
- ✅ Updated getSiteEmailConfig call (no parameters)

#### `reset-password-otp/index.ts`:
- ✅ Updated getSiteEmailConfig call (no parameters)

---

## 📁 Updated Files

### Shared Helpers:
- `_shared/auth-helpers-single-tenant.ts` (already existed)
- `_shared/ses-email-service.ts` (updated)

### Auth Functions:
- `signup-with-otp/index.ts`
- `send-auth-otp/index.ts`
- `reset-password-otp/index.ts`
- `verify-auth-otp/index.ts`

### All Other Functions:
113 functions automatically updated by bulk script

---

## 🚀 Deployment

### For Coolify Docker Deployment:

1. **Commit Changes**:
   ```bash
   git add supabase/functions
   git commit -m "chore: rollback edge functions to single-tenant"
   git push
   ```

2. **Coolify Auto-Deploy**:
   - Edge functions will auto-deploy on git push
   - Docker container will restart with new functions
   - No manual deployment needed

3. **Verify Deployment**:
   - Check Coolify logs for deployment status
   - Test critical functions (signup, login, password reset)
   - Monitor error logs for any issues

---

## 🧪 Testing Recommendations

### Critical Functions to Test:

1. **Authentication Flow**:
   - [ ] User signup (`signup-with-otp`)
   - [ ] OTP verification (`verify-auth-otp`)
   - [ ] Password reset request (`reset-password-otp`)
   - [ ] OTP email sending (`send-auth-otp`)

2. **Payment Functions**:
   - [ ] Stripe checkout (`create-stripe-checkout`)
   - [ ] Stripe webhooks (`stripe-webhook`)
   - [ ] Subscription management (`manage-subscription`)

3. **Integrations**:
   - [ ] QuickBooks sync (`quickbooks-sync`)
   - [ ] Calendar integrations (`google-calendar-*`, `outlook-calendar-*`)
   - [ ] Analytics OAuth (`analytics-oauth-google`)

4. **Data Operations**:
   - [ ] Project operations (`projects`)
   - [ ] Time tracking (`time-tracking`)
   - [ ] Daily reports (`daily-reports`)
   - [ ] Change orders (`change-orders`)

### Test Locally (if needed):

```bash
# Start Supabase local
supabase start

# Test individual function
supabase functions serve <function-name> --no-verify-jwt

# Invoke function
curl -i http://localhost:54321/functions/v1/<function-name> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

---

## ⚠️ Breaking Changes

### Removed Parameters:
All edge functions no longer accept or require `siteId` parameter:

**Before**:
```typescript
{
  email: "user@example.com",
  siteId: "uuid-here",  // ← REMOVED
  ...
}
```

**After**:
```typescript
{
  email: "user@example.com",
  // siteId removed - single tenant
  ...
}
```

### Database Queries:
All queries no longer filter by `site_id`:

**Before**:
```typescript
.from('table')
.select('*')
.eq('site_id', siteId)  // ← REMOVED
.eq('company_id', companyId)
```

**After**:
```typescript
.from('table')
.select('*')
.eq('company_id', companyId)
// site_id filter removed
```

---

## 📝 Notes

- **Auth Helper**: All functions now use `auth-helpers-single-tenant.ts`
- **Email Config**: Always uses default BuildDesk branding
- **Database**: All queries rely on RLS for `company_id` isolation only
- **No Breaking Frontend**: Frontend was already updated in previous steps

---

## ✅ Completion Checklist

- [x] Create automated cleanup scripts
- [x] Run bulk edge function cleanup (113 functions)
- [x] Fix auth function schemas (3 functions)
- [x] Update email service (1 file)
- [x] Manually fix critical auth functions (3 functions)
- [ ] Commit and push to Git
- [ ] Verify Coolify deployment
- [ ] Test critical functions
- [ ] Monitor error logs

---

**Last Updated**: 2025-12-22
**Status**: ✅ Complete - Ready for Deployment

