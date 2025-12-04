# Deployment Checklist - Onboarding RLS Fix

## Pre-Deployment

- [ ] Review all migration files for correctness
  - [ ] `20251203234844_fix_sites_anon_access.sql`
  - [ ] `20251203234845_fix_user_profiles_trigger.sql`
  - [ ] `20251203234846_fix_user_profiles_select_rls.sql`

- [ ] Backup production database
  ```bash
  # Via Supabase Dashboard: Database → Backups → Create Backup
  # Or via CLI:
  supabase db dump -f backup_before_rls_fix_$(date +%Y%m%d).sql
  ```

- [ ] Test migrations in staging environment
  - [ ] Apply migrations to staging
  - [ ] Run test script: `psql <staging_url> -f scripts/test-onboarding-rls.sql`
  - [ ] Test signup flow in staging
  - [ ] Verify no existing functionality broken

- [ ] Review documentation
  - [ ] `RLS_COMPANY_CREATION_DIAGNOSIS.md`
  - [ ] `ONBOARDING_RLS_FIX_SUMMARY.md`
  - [ ] `ONBOARDING_TROUBLESHOOTING.md`

## Deployment (Production)

### Step 1: Apply Migrations
- [ ] Apply migration 1: Sites anonymous access
  ```bash
  psql <production_url> -f supabase/migrations/20251203234844_fix_sites_anon_access.sql
  ```
  - [ ] Verify no errors
  - [ ] Check policy exists: `SELECT * FROM pg_policies WHERE tablename='sites' AND policyname='Public can view active sites';`

- [ ] Apply migration 2: User profiles trigger
  ```bash
  psql <production_url> -f supabase/migrations/20251203234845_fix_user_profiles_trigger.sql
  ```
  - [ ] Verify trigger exists: `SELECT tgname FROM pg_trigger WHERE tgname='on_auth_user_created';`
  - [ ] Check function targets correct table

- [ ] Apply migration 3: User profiles SELECT policy
  ```bash
  psql <production_url> -f supabase/migrations/20251203234846_fix_user_profiles_select_rls.sql
  ```
  - [ ] Verify policy exists: `SELECT * FROM pg_policies WHERE tablename='user_profiles';`

### Step 2: Verify Migrations
- [ ] Run test script
  ```bash
  psql <production_url> -f scripts/test-onboarding-rls.sql > test_results.txt
  ```
  - [ ] Review test results
  - [ ] All tests should pass

- [ ] Manual verification queries
  ```sql
  -- Test 1: Anonymous can read sites
  SET ROLE anon;
  SELECT * FROM sites WHERE key = 'builddesk';
  -- Should return 1 row
  
  RESET ROLE;
  
  -- Test 2: Trigger exists and enabled
  SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'on_auth_user_created';
  -- Should show enabled = 'O' (origin enabled)
  
  -- Test 3: is_valid_site function works
  SELECT public.is_valid_site(id) FROM sites WHERE key = 'builddesk';
  -- Should return TRUE
  ```

## Post-Deployment Testing

### Test 1: Fresh User Signup (Critical)
- [ ] Open incognito browser window
- [ ] Navigate to signup page
- [ ] Enter test email: `test-rls-fix-$(date +%s)@example.com`
- [ ] Enter password: `TestPassword123!`
- [ ] Submit signup form
- [ ] Expected: User created successfully
- [ ] Verify in database:
  ```sql
  SELECT u.id, u.email, u.created_at, up.id as profile_id, up.site_id, up.role
  FROM auth.users u
  LEFT JOIN user_profiles up ON u.id = up.id
  WHERE u.email = 'test-rls-fix-XXXXX@example.com';
  ```
  - [ ] user_profiles entry exists
  - [ ] site_id is set (BuildDesk UUID)
  - [ ] role is 'admin'

### Test 2: Complete Onboarding (Critical)
- [ ] Continue with test account from Test 1
- [ ] Fill out onboarding form
  - Company name: `Test Company RLS Fix`
  - Company type: `Residential`
  - Team size: `2-5 people`
  - Expected projects: `1-5 projects`
- [ ] Submit onboarding
- [ ] Expected: Company created successfully
- [ ] Verify in database:
  ```sql
  SELECT c.id, c.name, c.site_id, up.company_id
  FROM companies c
  JOIN user_profiles up ON c.id = up.company_id
  WHERE c.name = 'Test Company RLS Fix';
  ```
  - [ ] Company exists with correct site_id
  - [ ] user_profiles.company_id updated

### Test 3: Site Resolution (Critical)
- [ ] Open browser console
- [ ] Run:
  ```javascript
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .eq('key', 'builddesk')
    .single();
  console.log({ data, error });
  ```
- [ ] Expected: Returns BuildDesk site data
- [ ] No RLS error

### Test 4: Existing User Login (Regression)
- [ ] Login with existing user account
- [ ] Navigate to dashboard
- [ ] Expected: Dashboard loads successfully
- [ ] Verify no RLS errors in console
- [ ] Verify user can still access their data

### Test 5: Multi-Tenant Isolation (Security)
- [ ] Create two test companies
- [ ] Login as User A (Company A)
- [ ] Attempt to read Company B's data:
  ```javascript
  const { data } = await supabase
    .from('companies')
    .select('*')
    .eq('id', '<company_b_id>');
  console.log(data); // Should be empty or error
  ```
- [ ] Expected: Cannot access other company's data
- [ ] Site isolation still enforced

## Monitoring (First 24 Hours)

### Supabase Dashboard
- [ ] **Hour 1**: Check Database → Logs
  - [ ] Filter for "permission denied"
  - [ ] Filter for "RLS"
  - [ ] Should see no new RLS violations

- [ ] **Hour 4**: Check Database → Logs
  - [ ] Review error rate
  - [ ] Check for repeated errors

- [ ] **Hour 24**: Check Database → Logs
  - [ ] Confirm no RLS issues
  - [ ] Verify signups completing successfully

### Sentry Monitoring
- [ ] Check for new errors related to:
  - [ ] Signup flow
  - [ ] Onboarding flow
  - [ ] Site resolution
  - [ ] Company creation

### User Metrics
- [ ] Track signup completion rate
  - [ ] Before fix: X%
  - [ ] After fix: Y% (should increase)

- [ ] Track onboarding drop-off
  - [ ] Before fix: Z users stuck
  - [ ] After fix: 0 users stuck

## Rollback Plan (If Needed)

### Indicators for Rollback
- [ ] RLS errors increase significantly
- [ ] Signup completion rate drops
- [ ] Security concerns arise
- [ ] Existing users cannot login
- [ ] Data isolation broken

### Rollback Steps
1. [ ] Restore database backup
   ```bash
   supabase db restore backup_before_rls_fix_YYYYMMDD.sql
   ```

2. [ ] Or revert policies manually
   ```sql
   -- Revert sites policy
   DROP POLICY "Public can view active sites" ON sites;
   CREATE POLICY "Users can view active sites"
     ON sites FOR SELECT
     USING (is_active = TRUE);
   
   -- Keep user_profiles trigger fix (it's correct)
   
   -- Revert user_profiles policy (if needed)
   DROP POLICY "Users can view own profile and company members" ON user_profiles;
   CREATE POLICY "Users can view profiles in their site"
     ON user_profiles FOR SELECT
     USING (
       site_id = public.current_site_id()
       AND id = auth.uid()
     );
   ```

3. [ ] Verify existing functionality restored

4. [ ] Investigate issue

5. [ ] Re-plan deployment

## Post-Deployment Cleanup

### After 48 Hours (If Successful)
- [ ] Remove test accounts created during testing
  ```sql
  DELETE FROM auth.users WHERE email LIKE 'test-rls-fix-%@example.com';
  ```

- [ ] Update team documentation
  - [ ] Link to RLS fix docs in team wiki
  - [ ] Add to onboarding runbook
  - [ ] Update troubleshooting guide

- [ ] Archive migration documentation
  - [ ] Save diagnosis and fix summary
  - [ ] Update CLAUDE.md with lessons learned

### After 1 Week (If Successful)
- [ ] Review metrics
  - [ ] Signup completion rate improved
  - [ ] No RLS-related support tickets
  - [ ] User feedback positive

- [ ] Consider security audit
  - [ ] Review all RLS policies
  - [ ] Verify site isolation working
  - [ ] Check for edge cases

## Success Criteria

### Must Have ✅
- [x] Migrations applied without errors
- [ ] Fresh signups complete successfully
- [ ] Onboarding flow works end-to-end
- [ ] No RLS violations in logs
- [ ] Existing users unaffected
- [ ] Site isolation maintained

### Nice to Have ✨
- [ ] Signup completion rate improves by >50%
- [ ] Zero onboarding-related support tickets
- [ ] Positive user feedback
- [ ] Clean Sentry error logs
- [ ] Documentation updated

## Sign-Off

### Deployment Completed By
- **Engineer**: _______________
- **Date**: _______________
- **Time**: _______________

### Verification Completed By
- **QA/Engineer**: _______________
- **Date**: _______________
- **Tests Passed**: ___/15

### Approved By
- **Tech Lead**: _______________
- **Date**: _______________
- **Notes**: _______________

---

## Quick Reference

**Diagnosis**: `/workspace/RLS_COMPANY_CREATION_DIAGNOSIS.md`  
**Fix Summary**: `/workspace/ONBOARDING_RLS_FIX_SUMMARY.md`  
**Troubleshooting**: `/workspace/ONBOARDING_TROUBLESHOOTING.md`  
**Test Script**: `/workspace/scripts/test-onboarding-rls.sql`  
**Migrations**: `/workspace/supabase/migrations/202512032348*.sql`
