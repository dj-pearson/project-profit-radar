# 🔄 Multi-Tenant to Single-Tenant Rollback Guide

## Overview

This guide will help you completely revert the multi-tenant architecture changes and return BuildDesk to a single-tenant, isolated database architecture. Since you now have your own self-hosted Supabase instance, you no longer need the multi-tenant cost-saving measures.

## ⚠️ CRITICAL: Before You Begin

### Prerequisites Checklist
- [ ] **Database Backup Created** - ABSOLUTELY REQUIRED
  ```bash
  # Self-hosted Supabase backup
  pg_dump -h YOUR_SUPABASE_HOST -U postgres -d postgres \
    --clean --if-exists -f backup_before_rollback_$(date +%Y%m%d_%H%M%S).sql
  ```
- [ ] **Git Commit Made** - Save current state
  ```bash
  git add -A
  git commit -m "Pre-rollback checkpoint: multi-tenant architecture"
  git tag pre-rollback-checkpoint
  ```
- [ ] **Staging Environment Available** - Test rollback here first
- [ ] **Maintenance Window Scheduled** - Estimated downtime: 30-60 minutes
- [ ] **Team Notified** - All developers aware of changes

## 📋 Rollback Execution Plan

### Phase 1: Database Rollback (30-45 minutes)

#### Step 1.1: Backup Production Database
```bash
# Create timestamped backup
pg_dump -h YOUR_SUPABASE_HOST -U postgres -d postgres \
  --clean --if-exists \
  -f prod_backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup file exists and has content
ls -lh prod_backup_*.sql
```

#### Step 1.2: Apply Database Rollback Migration
```bash
# Connect to your Supabase database
psql -h YOUR_SUPABASE_HOST -U postgres -d postgres

# Or use Supabase SQL Editor in dashboard
```

Execute the rollback migration:
```bash
psql -h YOUR_SUPABASE_HOST -U postgres -d postgres \
  -f supabase/migrations/ROLLBACK_multi_tenant.sql
```

**What this does:**
- Drops `auth.current_site_id()` helper function
- Reverts ALL RLS policies to company-only isolation
- Drops all site_id indexes (30+ indexes)
- Removes site_id columns from 30+ tables
- Drops site helper functions (`get_site_by_domain`, `get_site_by_key`)
- Drops the `sites` table

#### Step 1.3: Verify Database Rollback
```sql
-- Check 1: No site_id columns should remain
SELECT table_name, column_name
FROM information_schema.columns
WHERE column_name = 'site_id'
  AND table_schema = 'public';
-- Expected result: 0 rows

-- Check 2: Verify sites table is gone
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'sites';
-- Expected result: 0 rows

-- Check 3: Verify RLS policies are restored
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('companies', 'projects', 'user_profiles')
ORDER BY tablename, policyname;
-- Should see company-based policies, not site-based

-- Check 4: Test data access (as authenticated user)
SELECT COUNT(*) FROM companies;
SELECT COUNT(*) FROM projects;
-- Should return your data without errors
```

### Phase 2: Edge Functions Rollback (10-15 minutes)

#### Step 2.1: Update Edge Function Imports

For each Edge Function in `supabase/functions/`, update imports:

**BEFORE:**
```typescript
import { initializeAuthContext, errorResponse, successResponse } from '../_shared/auth-helpers.ts';

const authContext = await initializeAuthContext(req);
const { user, siteId, supabase } = authContext;

// Query with site_id
const { data } = await supabase
  .from('projects')
  .select('*')
  .eq('site_id', siteId)
  .eq('company_id', companyId);
```

**AFTER:**
```typescript
import { initializeAuthContext, errorResponse, successResponse } from '../_shared/auth-helpers-single-tenant.ts';

const authContext = await initializeAuthContext(req);
const { user, supabase } = authContext; // No siteId

// Query without site_id
const { data } = await supabase
  .from('projects')
  .select('*')
  .eq('company_id', companyId);
```

#### Step 2.2: Find All Edge Functions to Update
```bash
# List all Edge Functions
ls supabase/functions/

# Search for site_id references in Edge Functions
grep -r "siteId" supabase/functions/ --include="*.ts"

# Search for auth-helpers.ts imports
grep -r "auth-helpers.ts" supabase/functions/ --include="*.ts"
```

#### Step 2.3: Automated Update Script (Optional)
```bash
# Replace auth-helpers.ts with auth-helpers-single-tenant.ts
find supabase/functions -name "*.ts" -type f -exec sed -i \
  's/auth-helpers\.ts/auth-helpers-single-tenant.ts/g' {} +

# Note: You'll still need to manually remove .eq('site_id', siteId) from queries
```

#### Step 2.4: Test Edge Functions
```bash
# Deploy updated functions to staging
supabase functions deploy FUNCTION_NAME --project-ref YOUR_STAGING_REF

# Test with curl or Postman
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/FUNCTION_NAME \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### Phase 3: Frontend Rollback (20-30 minutes)

#### Step 3.1: Run Automated Cleanup Script
```bash
# Run the cleanup script
node scripts/rollback-multi-tenant-frontend.js
```

This will:
- Remove `src/lib/site-resolver.ts`
- Remove `src/hooks/useSiteQuery.ts`
- Remove `src/contexts/SiteContext.tsx` (if exists)
- Generate `SITE_ID_CLEANUP_REPORT.txt` with all site_id references
- Generate `FRONTEND_ROLLBACK_CHECKLIST.md` with manual steps

#### Step 3.2: Update AuthContext

Edit `src/contexts/AuthContext.tsx`:

**Remove these:**
```typescript
// ❌ Remove site-related state
const [siteId, setSiteId] = useState<string | null>(null);
const [siteConfig, setSiteConfig] = useState<any>(null);

// ❌ Remove site resolution logic
useEffect(() => {
  const resolveSite = async () => {
    const site = await getSiteByDomain(window.location.hostname);
    setSiteId(site?.id);
    setSiteConfig(site);
  };
  resolveSite();
}, []);

// ❌ Remove from context value
value={{
  user,
  session,
  profile,
  siteId,        // ❌ Remove
  siteConfig,    // ❌ Remove
  signIn,
  signOut,
}}
```

**Keep only:**
```typescript
// ✅ Keep user, session, profile
const [user, setUser] = useState<User | null>(null);
const [session, setSession] = useState<Session | null>(null);
const [profile, setProfile] = useState<any>(null);

// ✅ Keep auth methods
const signIn = async (email: string, password: string) => { ... };
const signOut = async () => { ... };

// ✅ Context value without site data
value={{
  user,
  session,
  profile,
  signIn,
  signOut,
  loading,
}}
```

#### Step 3.3: Update All Hooks and Components

Review `SITE_ID_CLEANUP_REPORT.txt` and fix each reference:

**Pattern 1: Remove useSiteQuery**
```typescript
// BEFORE
import { useSiteQuery } from '@/hooks/useSiteQuery';

export function useProjects() {
  return useSiteQuery(['projects'], async (siteId) => {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('site_id', siteId);
    return data;
  });
}

// AFTER
import { useQuery } from '@tanstack/react-query';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('*');
      return data;
    }
  });
}
```

**Pattern 2: Remove siteId destructuring**
```typescript
// BEFORE
const { user, siteId } = useAuth();

// AFTER
const { user } = useAuth();
```

**Pattern 3: Remove site_id from queries**
```typescript
// BEFORE
const { data } = await supabase
  .from('projects')
  .select('*')
  .eq('site_id', siteId)
  .eq('company_id', companyId);

// AFTER
const { data } = await supabase
  .from('projects')
  .select('*')
  .eq('company_id', companyId);
```

**Pattern 4: Remove site_id from inserts**
```typescript
// BEFORE
const { data } = await supabase
  .from('projects')
  .insert({
    site_id: siteId,
    company_id: companyId,
    name: 'New Project',
  });

// AFTER
const { data } = await supabase
  .from('projects')
  .insert({
    company_id: companyId,
    name: 'New Project',
  });
```

#### Step 3.4: Find and Fix All References
```bash
# Find all site_id references
grep -r "site_id" --include="*.ts" --include="*.tsx" src/

# Find all siteId destructuring
grep -r "siteId" --include="*.ts" --include="*.tsx" src/

# Find all useSiteQuery usage
grep -r "useSiteQuery" --include="*.ts" --include="*.tsx" src/
```

#### Step 3.5: Build and Test
```bash
# Check for TypeScript errors
npm run build

# Run development server
npm run dev

# Check browser console for errors
# Test key workflows:
# - Login
# - View dashboard
# - View projects
# - Create/edit data
```

### Phase 4: Documentation Cleanup (5-10 minutes)

#### Step 4.1: Archive Multi-Tenant Documentation
```bash
# Create archive folder
mkdir -p docs/archive/multi-tenant

# Move multi-tenant docs
mv MULTI_TENANT_AGENT_INSTRUCTIONS.md docs/archive/multi-tenant/
mv MULTI_SITE_MIGRATION_SUMMARY.md docs/archive/multi-tenant/
mv MULTI_SITE_COMPLETION_CHECKLIST.md docs/archive/multi-tenant/
mv docs/MULTI_SITE_MIGRATION_README.md docs/archive/multi-tenant/
mv docs/EDGE_FUNCTION_MULTI_SITE_MIGRATION.md docs/archive/multi-tenant/
mv docs/FRONTEND_MULTI_SITE_MIGRATION.md docs/archive/multi-tenant/
mv docs/NEW_WEBSITE_ONBOARDING_GUIDE.md docs/archive/multi-tenant/
mv docs/MULTI_SITE_TESTING_GUIDE.md docs/archive/multi-tenant/
mv docs/MULTI_SITE_QUICK_REFERENCE.md docs/archive/multi-tenant/
```

#### Step 4.2: Update CLAUDE.md

Edit `CLAUDE.md` and remove the **Multi-Tenant Architecture** section. Replace with:

```markdown
## Single-Tenant Architecture

BuildDesk operates as a single-tenant application with company-level data isolation.

### Data Isolation Strategy
- **Row Level Security (RLS)**: All tables use RLS policies for security
- **Company Isolation**: All data is filtered by `company_id`
- **User Access**: Users can only access data from companies they belong to

### Database Query Pattern
```typescript
// All queries filter by company_id (RLS enforces this)
const { data } = await supabase
  .from('projects')
  .select('*')
  .eq('company_id', companyId);
```

### Edge Function Pattern
```typescript
import { initializeAuthContext, errorResponse, successResponse } from '../_shared/auth-helpers-single-tenant.ts';

const authContext = await initializeAuthContext(req);
if (!authContext) return errorResponse('Unauthorized', 401);

const { user, supabase } = authContext;

// Queries automatically filtered by RLS
const { data } = await supabase
  .from('projects')
  .select('*')
  .eq('company_id', companyId);
```
```

#### Step 4.3: Clean Up Rollback Files (After Successful Deployment)
```bash
# After everything is working, remove rollback artifacts
rm SITE_ID_CLEANUP_REPORT.txt
rm FRONTEND_ROLLBACK_CHECKLIST.md
rm scripts/rollback-multi-tenant-frontend.js

# Keep these for future reference:
# - supabase/migrations/ROLLBACK_multi_tenant.sql
# - supabase/functions/_shared/auth-helpers-single-tenant.ts
```

### Phase 5: Testing & Verification (15-20 minutes)

#### Step 5.1: Critical Tests

**Database Access:**
```sql
-- Test 1: Verify no site_id columns exist
SELECT COUNT(*) FROM information_schema.columns 
WHERE column_name = 'site_id';
-- Expected: 0

-- Test 2: Verify data is accessible
SELECT COUNT(*) FROM companies;
SELECT COUNT(*) FROM projects;
SELECT COUNT(*) FROM user_profiles;
-- Should return counts without errors

-- Test 3: Verify RLS is working
-- Log in as regular user, try to access data
-- Should only see own company's data
```

**Frontend Tests:**
```bash
# Test 1: Build succeeds
npm run build
# Expected: No errors

# Test 2: No TypeScript errors
npm run lint
# Expected: No site_id related errors

# Test 3: Development server runs
npm run dev
# Expected: No console errors
```

**Feature Tests (Manual):**
- [ ] Authentication works (login/logout)
- [ ] Dashboard loads and shows data
- [ ] Projects page loads and shows projects
- [ ] Can create new project
- [ ] Can edit existing project
- [ ] Time tracking works
- [ ] Documents upload works
- [ ] Invoices/estimates work
- [ ] No console errors in browser

#### Step 5.2: Performance Tests
```bash
# Run Lighthouse audit
npm run lighthouse

# Check bundle size
npm run build:analyze

# Expected results should be similar to pre-migration
```

#### Step 5.3: Edge Function Tests

Test each active Edge Function:
```bash
# List functions
supabase functions list

# Test individual function
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/FUNCTION_NAME \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### Phase 6: Deployment (10-15 minutes)

#### Step 6.1: Commit Changes
```bash
git add -A
git commit -m "Rollback multi-tenant architecture to single-tenant"
git push origin main
```

#### Step 6.2: Deploy Edge Functions
```bash
# Deploy all Edge Functions
supabase functions deploy --project-ref YOUR_PRODUCTION_REF

# Or deploy individually
supabase functions deploy FUNCTION_NAME --project-ref YOUR_PRODUCTION_REF
```

#### Step 6.3: Deploy Frontend
```bash
# Build production
npm run build

# Deploy to Cloudflare Pages
wrangler pages publish dist

# Or let CI/CD handle it
git push origin main
```

#### Step 6.4: Monitor Deployment
- [ ] Check Sentry for errors
- [ ] Check Supabase logs
- [ ] Check Cloudflare analytics
- [ ] Monitor user sessions
- [ ] Watch for support tickets

## 🔄 Rollback the Rollback (If Something Goes Wrong)

If you need to restore multi-tenant architecture:

```bash
# Restore database from backup
psql -h YOUR_SUPABASE_HOST -U postgres -d postgres \
  < prod_backup_TIMESTAMP.sql

# Restore git state
git reset --hard pre-rollback-checkpoint

# Re-deploy
npm run build && wrangler pages publish dist
```

## 📊 Post-Rollback Checklist

### Immediate (Within 1 hour)
- [ ] All critical features working
- [ ] No console errors
- [ ] No 500 errors in Edge Functions
- [ ] Authentication working
- [ ] Data accessible
- [ ] No user reports of issues

### Within 24 hours
- [ ] Monitor error rates (Sentry)
- [ ] Check database performance
- [ ] Verify all scheduled jobs still run
- [ ] Test all integrations (Stripe, QuickBooks, etc.)

### Within 1 week
- [ ] Review and archive multi-tenant documentation
- [ ] Update team on new architecture
- [ ] Remove unused Edge Function helpers
- [ ] Clean up development branches

## 🎯 Success Criteria

Rollback is complete when:
- ✅ No `site_id` columns in database
- ✅ No `sites` table exists
- ✅ All RLS policies use company-based isolation only
- ✅ No `siteId` references in frontend code
- ✅ No `useSiteQuery` usage
- ✅ AuthContext doesn't provide `siteId`
- ✅ All Edge Functions use `auth-helpers-single-tenant.ts`
- ✅ Build succeeds without errors
- ✅ All tests pass
- ✅ Production app works normally

## ❓ Troubleshooting

### Issue: "column site_id does not exist"
**Solution:** Run the database rollback migration again, or manually drop the column:
```sql
ALTER TABLE table_name DROP COLUMN site_id;
```

### Issue: "Cannot read property 'siteId' of undefined"
**Solution:** Check for remaining siteId references:
```bash
grep -r "siteId" --include="*.ts" --include="*.tsx" src/
```

### Issue: Edge Function returns 500 error
**Solution:** 
1. Check Supabase logs: `supabase functions logs FUNCTION_NAME`
2. Verify function uses `auth-helpers-single-tenant.ts`
3. Remove all `.eq('site_id', siteId)` from queries

### Issue: RLS blocking all data access
**Solution:** Verify RLS policies were restored:
```sql
SELECT * FROM pg_policies WHERE tablename = 'your_table';
```
Re-run relevant section of rollback migration if needed.

### Issue: TypeScript errors about missing siteId
**Solution:** Find and update the code:
```bash
# Find the file
grep -r "siteId" --include="*.ts" --include="*.tsx" src/

# Update to remove siteId usage
```

## 📞 Support

If you encounter issues during rollback:
1. **Don't panic** - You have backups
2. **Check logs** - Supabase, Sentry, browser console
3. **Reference this guide** - Follow steps carefully
4. **Restore from backup** - If needed, use backup files
5. **Git reset** - Use `pre-rollback-checkpoint` tag

## 📚 Additional Resources

- **Database Rollback SQL**: `supabase/migrations/ROLLBACK_multi_tenant.sql`
- **Single-Tenant Auth Helpers**: `supabase/functions/_shared/auth-helpers-single-tenant.ts`
- **Frontend Cleanup Script**: `scripts/rollback-multi-tenant-frontend.js`
- **Supabase Docs**: https://supabase.com/docs
- **BuildDesk CLAUDE.md**: Main development reference

---

**Last Updated:** 2025-12-21
**Version:** 1.0
**Status:** Ready for execution

