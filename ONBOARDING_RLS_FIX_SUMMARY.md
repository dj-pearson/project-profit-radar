# Onboarding RLS Fix - Summary

## Problem Statement
New users were unable to create their company during onboarding due to Row Level Security (RLS) policies blocking database operations.

## Root Causes Identified

### 1. **Sites Table Not Accessible to Anonymous Users**
- **Issue**: Site resolution (`getSiteConfig()`) queries the `sites` table before authentication
- **Impact**: Frontend couldn't resolve `site_id`, blocking company creation
- **Cause**: RLS policy on `sites` table didn't explicitly allow anonymous access

### 2. **Wrong Table in User Creation Trigger**
- **Issue**: `handle_new_user()` trigger was inserting into `profiles` instead of `user_profiles`
- **Impact**: New users didn't get `user_profiles` entry, causing onboarding to fail
- **Cause**: Outdated trigger targeting wrong table

### 3. **User Profiles Not Readable During Onboarding**
- **Issue**: Users couldn't read their own `user_profiles` entry immediately after signup
- **Impact**: Onboarding flow couldn't proceed without profile data
- **Cause**: RLS policy required `site_id` match even for self-access

## Solutions Implemented

### Migration 1: `20251203234844_fix_sites_anon_access.sql`
**Purpose**: Allow anonymous users to read active sites for domain routing

**Changes**:
- Updated `sites` table SELECT policy to explicitly allow `TO anon, TO authenticated`
- Enables site resolution before authentication
- Safe because sites table only contains public configuration data

**Policy**:
```sql
CREATE POLICY "Public can view active sites"
  ON sites FOR SELECT
  TO anon, TO authenticated
  USING (is_active = TRUE);
```

### Migration 2: `20251203234845_fix_user_profiles_trigger.sql`
**Purpose**: Ensure new users get `user_profiles` entry with `site_id`

**Changes**:
- Fixed `handle_new_user()` function to insert into `user_profiles` (not `profiles`)
- Automatically resolves `site_id` from JWT metadata or defaults to BuildDesk
- Includes `ON CONFLICT` handling for idempotency
- Added error handling to prevent signup failures

**Behavior**:
1. User signs up → `auth.users` insert triggers `on_auth_user_created`
2. Trigger calls `handle_new_user()`
3. Function inserts into `user_profiles` with:
   - `id` from `auth.users.id`
   - `email` from `auth.users.email`
   - `site_id` from JWT or defaulting to BuildDesk
   - `role` defaults to 'admin'

### Migration 3: `20251203234846_fix_user_profiles_select_rls.sql`
**Purpose**: Allow users to read their own profile without site_id restriction

**Changes**:
- Updated SELECT policy to allow users to ALWAYS view their own profile
- Site_id check only applies when viewing other users in the company
- Enables profile reads immediately after signup

**Policy Logic**:
```sql
-- User can view their own profile (no site_id check)
id = auth.uid()

-- OR view company members (with site_id check)
OR (site_id = current_site_id() AND company_id = ...)

-- OR root admin (with site_id check)
OR (site_id = current_site_id() AND role = 'root_admin')
```

## Files Created

### Documentation
- `/workspace/RLS_COMPANY_CREATION_DIAGNOSIS.md` - Detailed technical analysis
- `/workspace/ONBOARDING_RLS_FIX_SUMMARY.md` - This file

### Migrations (Apply in Order)
1. `/workspace/supabase/migrations/20251203234844_fix_sites_anon_access.sql`
2. `/workspace/supabase/migrations/20251203234845_fix_user_profiles_trigger.sql`
3. `/workspace/supabase/migrations/20251203234846_fix_user_profiles_select_rls.sql`

### Testing
- `/workspace/scripts/test-onboarding-rls.sql` - SQL test script for verification

## Deployment Steps

### 1. Apply Migrations
```bash
# Option A: Via Supabase CLI (recommended)
supabase db push

# Option B: Via Supabase Dashboard
# Go to Database → Migrations → Upload each migration file

# Option C: Via psql
psql <connection_string> < supabase/migrations/20251203234844_fix_sites_anon_access.sql
psql <connection_string> < supabase/migrations/20251203234845_fix_user_profiles_trigger.sql
psql <connection_string> < supabase/migrations/20251203234846_fix_user_profiles_select_rls.sql
```

### 2. Verify Migrations Applied
```bash
# Run test script
psql <connection_string> -f scripts/test-onboarding-rls.sql

# Or check in Supabase Dashboard
# Database → Schema → Tables → sites, user_profiles, companies
# Check RLS policies for each table
```

### 3. Test Onboarding Flow
1. **Open Incognito Browser**
   - Clear all cookies and localStorage
   - Navigate to your signup page

2. **Complete Signup**
   - Enter email and password
   - Submit signup form
   - Verify email if required

3. **Check User Profile Created**
   - Open browser console
   - Check for any errors
   - Verify `user_profiles` entry exists in database

4. **Complete Onboarding**
   - Fill out company information
   - Submit onboarding form
   - Should successfully create company

5. **Verify Company Created**
   - Check `companies` table for new entry
   - Verify `site_id` is set correctly
   - Verify `user_profiles.company_id` is updated

### 4. Monitor for Issues
- **Supabase Logs**: Database → Logs → Check for RLS violations
- **Sentry**: Monitor for frontend errors during signup/onboarding
- **Browser Console**: Check for network errors or failed queries

## Expected Behavior After Fix

### Signup Flow
1. ✅ User navigates to signup page
2. ✅ Frontend resolves site from domain (queries `sites` table as anonymous)
3. ✅ User submits signup form
4. ✅ `auth.users` record created
5. ✅ Trigger automatically creates `user_profiles` entry with `site_id`
6. ✅ User redirected to onboarding

### Onboarding Flow
1. ✅ User sees onboarding form
2. ✅ Frontend reads user's `user_profiles` entry (no RLS block)
3. ✅ User fills out company info
4. ✅ Frontend submits company creation with `site_id`
5. ✅ RLS allows INSERT because user is authenticated and `site_id` is valid
6. ✅ Company created successfully
7. ✅ `user_profiles.company_id` updated
8. ✅ User redirected to dashboard

## Validation Checklist

- [ ] Migrations applied successfully
- [ ] Test script runs without errors
- [ ] Anonymous users can query `sites` table
- [ ] `is_valid_site()` function returns TRUE for BuildDesk
- [ ] `on_auth_user_created` trigger exists and is enabled
- [ ] Companies INSERT policy allows authenticated users
- [ ] User_profiles SELECT policy allows self-access
- [ ] Fresh signup creates `user_profiles` entry
- [ ] Onboarding completes without errors
- [ ] Company created with correct `site_id`
- [ ] No RLS violations in Supabase logs

## Rollback Plan (If Needed)

If issues occur after deployment:

### Quick Rollback
```sql
-- 1. Restore previous sites policy (authenticated only)
DROP POLICY IF EXISTS "Public can view active sites" ON sites;
CREATE POLICY "Users can view active sites"
  ON sites FOR SELECT
  USING (is_active = TRUE);

-- 2. Keep trigger fix (it's correct)
-- Don't rollback this one

-- 3. Restore previous user_profiles policy (if absolutely necessary)
DROP POLICY IF EXISTS "Users can view own profile and company members" ON user_profiles;
CREATE POLICY "Users can view profiles in their site"
  ON user_profiles FOR SELECT
  USING (
    site_id = public.current_site_id()
    AND id = auth.uid()
  );
```

### Alternative: Site ID in Signup
If rollback is needed, alternative solution:
1. Pass `site_id` in signup form metadata
2. Update signup function to include `site_id` in JWT
3. Keep existing RLS policies

## Known Edge Cases

### Case 1: User Signs Up Without site_id Metadata
- **Handled by**: Trigger defaults to BuildDesk site
- **Behavior**: User assigned to BuildDesk automatically

### Case 2: Multi-Site Deployment
- **Handled by**: Site resolution from domain in `site-resolver.ts`
- **Behavior**: Each domain maps to correct site

### Case 3: User Has Invalid site_id
- **Handled by**: `is_valid_site()` function checks site exists and is active
- **Behavior**: Company creation blocked if site_id is invalid

## Performance Considerations

### Impact: Minimal
- Site resolution adds 1 query before authentication
- User profile creation adds 1 insert per signup
- No change to existing queries

### Optimization Opportunities
1. **Cache site config in localStorage** (already implemented)
2. **Index on sites.key** (already exists)
3. **Index on user_profiles.site_id** (should exist from previous migrations)

## Security Review

### Changes Are Safe ✅
1. **Sites table public read**: Only returns non-sensitive config data
2. **User profile self-access**: Users can only see their own profile
3. **Company creation**: Still requires authentication and valid site_id
4. **Site isolation**: Enforced via site_id checks in all policies

### No New Vulnerabilities Introduced ✅
- Anonymous access limited to active sites only
- Company creation still requires authentication
- Users cannot view other users' profiles without site_id match
- Root admin restrictions maintained

## Next Steps

1. **Apply migrations** ✅ (You are here)
2. **Run test script** to verify
3. **Test signup flow** in browser
4. **Monitor logs** for 24-48 hours
5. **Document any issues** encountered
6. **Update team** on changes

## Support

If issues persist after applying these fixes:

1. **Check Supabase Logs**
   - Database → Logs → Filter by "RLS" or "permission denied"

2. **Enable Debug Logging** (temporary)
   ```typescript
   // In OnboardingFlow.tsx
   console.log('🔍 Debug:', {
     siteId,
     user: user?.id,
     userProfile,
     hasSession: !!supabase.auth.getSession(),
   });
   ```

3. **Test RLS Policies Manually**
   ```sql
   -- As authenticated user
   SET ROLE authenticated;
   SET request.jwt.claim.sub = '<user_uuid>';
   
   -- Test queries
   SELECT * FROM sites WHERE key = 'builddesk';
   SELECT * FROM user_profiles WHERE id = '<user_uuid>';
   INSERT INTO companies (...) VALUES (...);
   ```

4. **Review Error Messages**
   - Look for "permission denied" or "policy violation"
   - Check which table and policy is blocking

## References

- Multi-tenant Architecture: `/workspace/CLAUDE.md` (Multi-Tenant Architecture section)
- Agent Instructions: `/workspace/MULTI_TENANT_AGENT_INSTRUCTIONS.md`
- Site Resolver: `/workspace/src/lib/site-resolver.ts`
- Onboarding Flow: `/workspace/src/components/onboarding/OnboardingFlow.tsx`
- Auth Context: `/workspace/src/contexts/AuthContext.tsx`

---

**Last Updated**: 2025-12-03  
**Status**: Ready for deployment  
**Priority**: Critical (blocks user signups)  
**Estimated Impact**: Fixes onboarding for all new users
