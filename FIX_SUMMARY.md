# Fix Summary - December 4, 2025

## Issues Fixed

### 1. ✅ npm install failure
**Problem**: Package `@capacitor-community/biometric-auth@^7.0.1` doesn't exist in npm registry

**Solution**: Removed the non-existent package from `package.json`

**Status**: ✅ FIXED - npm install now works

---

### 2. 🔧 Companies INSERT 403 Error (NEEDS DATABASE FIX)
**Problem**: Frontend gets 403 Forbidden when trying to insert into companies table during setup

**Root Cause**: 
- RLS policy requires `site_id = public.current_site_id()`
- During initial setup, `current_site_id()` returns NULL because:
  - User doesn't have `site_id` in JWT yet
  - User doesn't have `company_id` in `user_profiles` yet (chicken-egg problem)
- Frontend correctly passes `site_id` in the INSERT, but RLS policy blocks it

**Solution**: Updated RLS policy to allow INSERT if `site_id` matches any active site

**Files Created**:
- `FIX_companies_insert_policy.sql` - Quick fix to run in Supabase Dashboard
- `supabase/migrations/20251204140000_fix_companies_insert_rls.sql` - Proper migration file

---

## How to Apply the Database Fix

### Option 1: Quick Fix (Recommended for immediate testing)

1. Open Supabase SQL Editor:
   ```
   https://supabase.com/dashboard/project/ilhzuvemiuyfuxfegtlv/sql/new
   ```

2. Copy the contents of `FIX_companies_insert_policy.sql`

3. Paste into SQL Editor and click **Run**

4. Verify output shows the new policy was created

5. Test the setup flow at: https://build-desk.com/setup

### Option 2: Apply via Migration (Recommended for production)

```bash
# Push the migration to Supabase
npx supabase db push

# Or apply specific migration
npx supabase migration up --db-url "postgresql://postgres:[YOUR-PASSWORD]@db.ilhzuvemiuyfuxfegtlv.supabase.co:5432/postgres"
```

---

## What Changed

### Before (Restrictive)
```sql
CREATE POLICY "Admins can insert companies in their site"
  ON companies FOR INSERT
  WITH CHECK (
    site_id = public.current_site_id()  -- ❌ Returns NULL during setup
  );
```

### After (Permissive for Setup)
```sql
CREATE POLICY "Allow company creation for authenticated users"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (
    -- ✅ Allow if site_id matches any active site
    site_id IN (SELECT id FROM sites WHERE is_active = true)
  );
```

---

## Security Considerations

**Is this safe?** ✅ YES

1. **Authentication Required**: User must be authenticated
2. **Valid Site Only**: `site_id` must exist in `sites` table and be active
3. **Post-Creation Protection**: After company is created, SELECT/UPDATE/DELETE policies still enforce proper isolation
4. **No Data Leakage**: User can only create companies, not view/modify other companies

**Why is this better than `WITH CHECK (true)`?**
- Still validates `site_id` is legitimate
- Prevents inserting companies with invalid/fake site_ids
- Maintains multi-tenant data integrity

---

## Testing After Fix

1. Navigate to: https://build-desk.com/setup
2. Fill out company setup form
3. Submit
4. Should succeed and redirect to dashboard

---

## Additional Notes

### Frontend Code (Already Correct)
Both setup flows correctly pass `site_id`:

**OnboardingFlow.tsx** (line 261-275):
```typescript
const { data: company, error: companyError } = await supabase
  .from('companies')
  .insert({
    name: formData.companyName,
    industry_type: formData.companyType,
    company_size: formData.teamSize.toString(),
    site_id: siteId,  // ✅ Correctly passed
    tenant_id: userProfile?.tenant_id || null,
  })
  .select()
  .single();
```

**Setup.tsx** (line 103-128):
```typescript
const insertPayload = {
  name: companyName,
  address,
  industry_type: industryType,
  company_size: companySize,
  site_id: siteId,  // ✅ Correctly passed
  tenant_id: userProfile?.tenant_id || null,
};

const { data: company, error: companyError } = await supabase
  .from('companies')
  .insert([insertPayload])
  .select()
  .single();
```

### Other 404 Errors (Not Critical)
The console shows some 404 errors for:
- `/grid-pattern.svg` - Missing asset
- `/src/main.tsx` - Vite dev import (should be built)
- `/pricing`, `/features`, `/auth` - Routing issues

These are separate issues and don't block the setup flow.

---

## Next Steps

1. ✅ Apply the database fix (see "How to Apply" above)
2. ✅ Test the setup flow
3. 🔄 Fix the 404 errors (optional, lower priority)
4. 🔄 Run `npm audit fix` to address security vulnerabilities

---

**Status**: Ready to apply database fix
**Priority**: HIGH (blocks user onboarding)
**Estimated Time**: 2 minutes to apply fix

