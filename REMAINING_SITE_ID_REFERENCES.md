# Remaining site_id References - Status Report

**Generated**: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

## Current Status

After initial cleanup, we found **1,700+ site_id references** remaining across **111 files**.

### Top Offenders:

| File | References | Priority |
|------|-----------|----------|
| `src/integrations/supabase/types.ts` | 301 | LOW (auto-generated) |
| `src/hooks/useCRM.ts` | 200 | HIGH |
| `src/hooks/useAccounting.ts` | 90 | HIGH |
| `src/hooks/useMarketingCampaigns.ts` | 72 | MEDIUM |
| `src/services/taskService.ts` | 55 | HIGH |
| `src/hooks/useLeadInsights.ts` | 52 | MEDIUM |
| `supabase/functions/_shared/auth-helpers.ts` | 32 | HIGH |
| ... 104 more files | 838+ | MEDIUM-LOW |

---

## What's Happening?

The **first automated cleanup** removed site_id from:
✅ Simple database queries
✅ Basic destructuring
✅ Insert statements

But **many hooks still have**:
❌ Complex `siteId` validation logic
❌ Query key dependencies
❌ Conditional enabled checks
❌ Multiple siteId references per function

---

## Available Cleanup Scripts

### 1. **`scripts/scan-site-id-references.ps1`** (Scanner)
Scans entire codebase and generates:
- Console output with file/line numbers
- CSV export (`site_id_references.csv`)

**Usage**:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/scan-site-id-references.ps1
```

### 2. **`scripts/final-cleanup-siteid.ps1`** (Cleanup)
Applies comprehensive cleanup patterns to hooks and services.

**Usage**:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/final-cleanup-siteid.ps1
```

### 3. **`scripts/bulk-cleanup-siteid.ps1`** (Original)
First-pass cleanup that was already run.

---

##  Recommended Approach

### Option A: Run Automated Final Cleanup (Recommended)
```powershell
# Step 1: Run final cleanup
powershell -ExecutionPolicy Bypass -File scripts/final-cleanup-siteid.ps1

# Step 2: Rebuild to check for errors
npm run build

# Step 3: Scan again to see what's left
powershell -ExecutionPolicy Bypass -File scripts/scan-site-id-references.ps1
```

### Option B: Manual Review of Critical Files
Focus on these high-impact files first:
1. `src/hooks/useCRM.ts` (200 refs)
2. `src/hooks/useAccounting.ts` (90 refs)
3. `src/hooks/useMarketingCampaigns.ts` (72 refs)
4. `src/services/taskService.ts` (55 refs)
5. `supabase/functions/_shared/auth-helpers.ts` (32 refs)

---

## Special Cases

### `src/integrations/supabase/types.ts` (301 references)
**Action**: REGENERATE from database
```bash
# This file is auto-generated, don't manually edit
# After database rollback is complete, regenerate types:
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
```

### `supabase/functions/_shared/auth-helpers.ts` (32 references)
**Action**: Already have `auth-helpers-single-tenant.ts`
- Switch all functions to use the single-tenant version
- Or update the main auth-helpers.ts to match single-tenant

---

## Why So Many References?

The multi-tenant implementation was **VERY thorough**:
- Every hook destructured `{ siteId }` from `useAuth()`
- Every query included `.eq('site_id', siteId)`
- Every insert included `site_id: siteId`
- Every validation checked `if (!siteId)`
- Every queryKey included `siteId` for cache isolation

This is actually **GOOD** - it means the multi-tenant implementation was complete!
Now we just need to systematically remove it all.

---

## Next Steps

1. **Run the final cleanup script** ✅
2. **Regenerate Supabase types** ✅
3. **Test the application** ✅
4. **Deploy** ✅

---

## Files Already Fixed

✅ `src/contexts/AuthContext.tsx` - Core auth (8 refs → comments only)
✅ Database migrations - All site_id columns removed
✅ 113 edge functions - Bulk updated
✅ 39 frontend files - First pass cleanup

**Progress**: ~20% of references cleaned, ~80% remaining

---

**Need Help?** 
- Run scanner to see current state
- Run final cleanup for automated fix
- Or manually update critical files first

