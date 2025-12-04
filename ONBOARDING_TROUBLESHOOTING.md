# Onboarding Troubleshooting Quick Reference

## Quick Diagnosis

### Symptom: User cannot complete signup
```sql
-- Check if sites table is readable by anon
SET ROLE anon;
SELECT * FROM sites WHERE key = 'builddesk';
-- Should return 1 row. If error "permission denied", apply fix #1
```

### Symptom: User profile not created after signup
```sql
-- Check if trigger exists
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'on_auth_user_created';
-- Should show trigger exists and enabled. If missing, apply fix #2

-- Check if user_profiles entry exists
SELECT * FROM user_profiles WHERE email = '<user_email>';
-- Should return 1 row. If empty, apply fix #2
```

### Symptom: Company creation fails with permission error
```sql
-- Check company INSERT policy
SELECT policyname, roles FROM pg_policies 
WHERE tablename = 'companies' AND cmd = 'INSERT';
-- Should show policy allowing authenticated users

-- Test as authenticated user
SET ROLE authenticated;
SET request.jwt.claim.sub = '<user_uuid>';
SELECT public.is_valid_site('<site_id>');
-- Should return TRUE. If error, site_id is invalid
```

### Symptom: User cannot read their profile
```sql
-- Check user_profiles SELECT policy
SELECT policyname FROM pg_policies 
WHERE tablename = 'user_profiles' AND cmd = 'SELECT';
-- Should show policy allowing self-access

-- Test as authenticated user
SET ROLE authenticated;
SET request.jwt.claim.sub = '<user_uuid>';
SELECT * FROM user_profiles WHERE id = '<user_uuid>';
-- Should return 1 row. If error, apply fix #3
```

## Common Error Messages

### "permission denied for table sites"
**Cause**: Anonymous users cannot read sites table  
**Fix**: Apply migration `20251203234844_fix_sites_anon_access.sql`

### "null value in column site_id violates not-null constraint"
**Cause**: Frontend not passing site_id to company insert  
**Fix**: Check `OnboardingFlow.tsx` has `site_id: siteId` in insert

### "new row violates row-level security policy for table companies"
**Cause**: User not authenticated or site_id invalid  
**Fix**: 
1. Check user is authenticated: `supabase.auth.getUser()`
2. Check site_id is valid: `SELECT * FROM sites WHERE id = '<site_id>'`

### "No rows returned from user_profiles"
**Cause**: Trigger not creating user_profiles entry  
**Fix**: Apply migration `20251203234845_fix_user_profiles_trigger.sql`

### "Cannot read property company_id of null"
**Cause**: user_profiles entry not found  
**Fix**: 
1. Verify trigger is enabled
2. Check user_profiles table for user's record
3. Apply fix #2 if missing

## Frontend Debugging

### Add Debug Logging to OnboardingFlow.tsx
```typescript
// At the start of handleSubscriptionSetup()
console.group('🔍 Onboarding Debug');
console.log('siteId:', siteId);
console.log('user:', user?.id);
console.log('userProfile:', userProfile);
console.log('formData:', formData);
console.groupEnd();

// Before company insert
console.log('📝 Inserting company with:', {
  name: formData.companyName,
  site_id: siteId,
  industry_type: formData.companyType,
});

// After company insert
if (companyError) {
  console.error('❌ Company error:', companyError);
  console.error('Error code:', companyError.code);
  console.error('Error message:', companyError.message);
  console.error('Error details:', companyError.details);
} else {
  console.log('✅ Company created:', company);
}
```

### Check Browser Console for Errors
Look for:
- `RLS policy violation`
- `permission denied`
- `null value in column`
- `Failed to fetch site config`
- Network errors (401, 403, 500)

### Verify Site Resolution
```typescript
// In browser console
const siteConfig = await window.supabase.from('sites').select('*').eq('key', 'builddesk').single();
console.log('Site config:', siteConfig);
// Should return BuildDesk site data
```

## Database Checks

### Verify All Tables Have site_id
```sql
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_name = 'site_id'
ORDER BY table_name;
```

### Check All RLS Policies
```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('sites', 'companies', 'user_profiles')
ORDER BY tablename, policyname;
```

### Verify BuildDesk Site Exists
```sql
SELECT * FROM sites WHERE key = 'builddesk';
-- Should return 1 active row
```

### Check Recent User Signups
```sql
SELECT 
  u.id,
  u.email,
  u.created_at as signup_time,
  up.id as profile_exists,
  up.site_id,
  up.company_id
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id
WHERE u.created_at > NOW() - INTERVAL '24 hours'
ORDER BY u.created_at DESC;
```

## Test Scenarios

### Test 1: Anonymous Site Resolution
```bash
# Using curl (no auth)
curl 'https://<project-ref>.supabase.co/rest/v1/sites?key=eq.builddesk&select=*' \
  -H "apikey: <anon-key>"

# Should return BuildDesk site data
```

### Test 2: New User Signup
```javascript
// In browser console
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'test123456',
  options: {
    data: {
      first_name: 'Test',
      last_name: 'User',
    }
  }
});

console.log('Signup result:', { data, error });

// Check user_profiles
const { data: profile } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('email', 'test@example.com')
  .single();

console.log('Profile created:', profile);
// Should have id, email, site_id, role='admin'
```

### Test 3: Company Creation
```javascript
// After signup and authentication
const { data: siteData } = await supabase
  .from('sites')
  .select('id')
  .eq('key', 'builddesk')
  .single();

const { data: company, error } = await supabase
  .from('companies')
  .insert({
    name: 'Test Company',
    site_id: siteData.id,
    industry_type: 'residential',
    company_size: '1-10',
    annual_revenue_range: 'startup',
  })
  .select()
  .single();

console.log('Company created:', { company, error });
```

## Quick Fixes

### Fix 1: Allow Anonymous Site Access
```sql
DROP POLICY IF EXISTS "Public can view active sites" ON sites;
CREATE POLICY "Public can view active sites"
  ON sites FOR SELECT
  TO anon, TO authenticated
  USING (is_active = TRUE);
```

### Fix 2: Recreate User Profiles Trigger
```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE v_site_id UUID;
BEGIN
  SELECT id INTO v_site_id FROM sites WHERE key = 'builddesk' LIMIT 1;
  
  INSERT INTO public.user_profiles (id, email, role, site_id, is_active)
  VALUES (NEW.id, NEW.email, 'admin', v_site_id, TRUE)
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Fix 3: Allow Self-Access to Profiles
```sql
DROP POLICY IF EXISTS "Users can view own profile and company members" ON user_profiles;

CREATE POLICY "Users can view own profile and company members"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR (
      site_id = public.current_site_id()
      AND company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );
```

## When to Escalate

Escalate to senior engineer if:
1. All fixes applied but issue persists
2. RLS errors continue after policy updates
3. Multiple users reporting signup failures
4. Database migration fails
5. Production data at risk

## Emergency Rollback

If onboarding completely broken in production:

```sql
-- 1. Disable RLS temporarily (EMERGENCY ONLY)
ALTER TABLE sites DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;

-- 2. Fix issues

-- 3. Re-enable RLS immediately
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
```

⚠️ **WARNING**: Only disable RLS in emergency. All data becomes accessible to all users.

## Support Contacts

- **Database Issues**: Check Supabase Dashboard → Database → Logs
- **Frontend Errors**: Check Sentry dashboard
- **RLS Policy Help**: See `/workspace/MULTI_TENANT_AGENT_INSTRUCTIONS.md`
- **Migration Issues**: See `/workspace/docs/MULTI_SITE_MIGRATION_README.md`

## Additional Resources

- Full Diagnosis: `/workspace/RLS_COMPANY_CREATION_DIAGNOSIS.md`
- Fix Summary: `/workspace/ONBOARDING_RLS_FIX_SUMMARY.md`
- Test Script: `/workspace/scripts/test-onboarding-rls.sql`
- Multi-tenant Docs: `/workspace/CLAUDE.md`
