# 🚀 Quick Rollback Reference Card

## 30-Second Overview

**Goal:** Revert BuildDesk from multi-tenant (shared database with site_id) back to single-tenant (isolated database, company-only isolation).

**Why:** Self-hosted Supabase means no cost penalty for separate databases.

**Time:** 1-2 hours total

---

## 🎯 Quick Start (Recommended)

```bash
# 1. Create backup (CRITICAL!)
pg_dump -h YOUR_HOST -U postgres -d postgres --clean > backup.sql

# 2. Create git checkpoint
git add -A && git commit -m "Pre-rollback checkpoint"
git tag pre-rollback-checkpoint

# 3. Run automated rollback
bash scripts/execute-rollback.sh

# 4. Follow the prompts and manual steps
```

---

## 📋 Manual 3-Step Process

### Step 1: Database (5 minutes)
```bash
# Apply rollback migration
psql -h YOUR_HOST -U postgres -d postgres \
  -f supabase/migrations/ROLLBACK_multi_tenant.sql

# Verify
psql -h YOUR_HOST -U postgres -d postgres -c \
  "SELECT COUNT(*) FROM information_schema.columns WHERE column_name='site_id';"
# Should return 0
```

### Step 2: Frontend (30 minutes)
```bash
# Run cleanup script
node scripts/rollback-multi-tenant-frontend.js

# Review generated reports
cat SITE_ID_CLEANUP_REPORT.txt
cat FRONTEND_ROLLBACK_CHECKLIST.md

# Update AuthContext - remove siteId
# Update all hooks - remove .eq('site_id', siteId)
# Replace useSiteQuery with useQuery

# Test
npm run build
npm run dev
```

### Step 3: Edge Functions (15 minutes)
```typescript
// Change imports in all Edge Functions from:
import { ... } from '../_shared/auth-helpers.ts';

// To:
import { ... } from '../_shared/auth-helpers-single-tenant.ts';

// Remove from destructuring:
const { user, siteId, supabase } = authContext; // ❌
const { user, supabase } = authContext;         // ✅

// Remove from queries:
.eq('site_id', siteId)  // ❌ Remove this
```

---

## 🔍 Quick Verification Commands

```bash
# Database: Check for site_id columns (should be 0)
psql -h YOUR_HOST -U postgres -d postgres -c \
  "SELECT COUNT(*) FROM information_schema.columns WHERE column_name='site_id';"

# Frontend: Check for site_id references
grep -r "site_id" --include="*.ts" --include="*.tsx" src/

# Frontend: Check for siteId usage
grep -r "siteId" --include="*.ts" --include="*.tsx" src/

# Frontend: Check for useSiteQuery
grep -r "useSiteQuery" --include="*.ts" --include="*.tsx" src/

# Build test
npm run build
```

---

## 🔄 Code Patterns to Fix

### Pattern 1: AuthContext
```typescript
// BEFORE (multi-tenant)
const { user, siteId } = useAuth();

// AFTER (single-tenant)
const { user } = useAuth();
```

### Pattern 2: Queries
```typescript
// BEFORE (multi-tenant)
const { data } = await supabase
  .from('projects')
  .select('*')
  .eq('site_id', siteId)
  .eq('company_id', companyId);

// AFTER (single-tenant)
const { data } = await supabase
  .from('projects')
  .select('*')
  .eq('company_id', companyId);
```

### Pattern 3: Inserts
```typescript
// BEFORE (multi-tenant)
await supabase.from('projects').insert({
  site_id: siteId,
  company_id: companyId,
  name: 'Test',
});

// AFTER (single-tenant)
await supabase.from('projects').insert({
  company_id: companyId,
  name: 'Test',
});
```

### Pattern 4: Hooks
```typescript
// BEFORE (multi-tenant)
import { useSiteQuery } from '@/hooks/useSiteQuery';

export function useProjects() {
  return useSiteQuery(['projects'], async (siteId) => {
    return supabase.from('projects').select('*').eq('site_id', siteId);
  });
}

// AFTER (single-tenant)
import { useQuery } from '@tanstack/react-query';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('*');
      return data;
    }
  });
}
```

### Pattern 5: Edge Functions
```typescript
// BEFORE (multi-tenant)
import { initializeAuthContext } from '../_shared/auth-helpers.ts';

const authContext = await initializeAuthContext(req);
const { user, siteId, supabase } = authContext;

const { data } = await supabase
  .from('projects')
  .select('*')
  .eq('site_id', siteId);

// AFTER (single-tenant)
import { initializeAuthContext } from '../_shared/auth-helpers-single-tenant.ts';

const authContext = await initializeAuthContext(req);
const { user, supabase } = authContext;

const { data } = await supabase
  .from('projects')
  .select('*');
```

---

## ⚠️ Critical Reminders

1. **ALWAYS backup database first** - No exceptions!
2. **Test in staging first** - Never YOLO to production
3. **Git checkpoint before starting** - Easy rollback if needed
4. **Remove site_id from ALL queries** - Even if RLS would filter
5. **Update ALL Edge Functions** - Or they'll fail

---

## 🚨 Emergency Rollback

If something goes wrong:

```bash
# Restore code
git reset --hard pre-rollback-checkpoint

# Restore database
psql -h YOUR_HOST -U postgres -d postgres < backup.sql

# Redeploy
npm run build
wrangler pages publish dist
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `MULTI_TENANT_ROLLBACK_GUIDE.md` | Complete step-by-step guide |
| `FRONTEND_ROLLBACK_CHECKLIST.md` | Frontend cleanup checklist |
| `SITE_ID_CLEANUP_REPORT.txt` | List of all site_id refs |
| `supabase/migrations/ROLLBACK_multi_tenant.sql` | Database rollback |
| `supabase/functions/_shared/auth-helpers-single-tenant.ts` | New auth helpers |
| `scripts/execute-rollback.sh` | Automated rollback script |
| `scripts/rollback-multi-tenant-frontend.js` | Frontend cleanup script |

---

## ✅ Success Checklist

Rollback complete when:
- [ ] No site_id columns in database
- [ ] No sites table exists
- [ ] RLS policies use company_id only
- [ ] No siteId in AuthContext
- [ ] No useSiteQuery in code
- [ ] All Edge Functions use auth-helpers-single-tenant.ts
- [ ] `npm run build` succeeds
- [ ] All features work in testing

---

## 🔗 Resources

- Full Guide: `MULTI_TENANT_ROLLBACK_GUIDE.md`
- Frontend Checklist: `FRONTEND_ROLLBACK_CHECKLIST.md`
- BuildDesk Docs: `CLAUDE.md`
- Supabase Docs: https://supabase.com/docs

---

## 🆘 Need Help?

1. Check logs (Sentry, Supabase, browser console)
2. Review `MULTI_TENANT_ROLLBACK_GUIDE.md` troubleshooting section
3. Use git reset to rollback if needed
4. Restore database from backup if needed

---

**Status:** Ready to execute
**Last Updated:** 2025-12-21

