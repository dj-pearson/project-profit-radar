# RLS Company Creation Diagnosis

## Issue Summary
New users cannot create their company during onboarding due to Row Level Security (RLS) policies blocking the INSERT operation.

## Root Cause Analysis

### The Problem
During onboarding, when a new user tries to create a company, the following sequence occurs:

1. **User signs up** → Creates auth.users record
2. **Frontend resolves site_id** → Calls `getSiteConfig()` which queries the `sites` table
3. **User creates company** → Attempts INSERT into `companies` table with the resolved `site_id`
4. **RLS blocks the INSERT** because:
   - The user's JWT doesn't have `site_id` in metadata yet (chicken-and-egg problem)
   - The `user_profiles` entry doesn't exist yet or doesn't have `site_id` set
   - The `current_site_id()` function returns NULL
   - RLS policies that check site_id fail

### Migration History
There have been multiple attempts to fix this:

1. **20251203000007_fix_company_onboarding_rls.sql** (First attempt)
   - Tried to allow company creation by checking if site_id exists in sites table
   - Problem: The EXISTS subquery runs in the user's RLS context, which might fail

2. **20251203000008_fix_company_insert_rls_v2.sql** (Second attempt - CURRENT)
   - Created `is_valid_site()` SECURITY DEFINER function to bypass RLS
   - This should work, but there might be other issues

## Current RLS Policies

### Sites Table
```sql
-- Policy allows SELECT for authenticated users
CREATE POLICY "Users can view active sites"
  ON sites FOR SELECT
  USING (is_active = TRUE);
```

**Issue**: This policy doesn't specify `TO authenticated` or `TO anon`, which means:
- It applies to the calling role
- During onboarding, before full authentication, this might fail
- The `site-resolver.ts` makes unauthenticated calls to resolve the site

### Companies Table (Current - v2)
```sql
-- INSERT policy using SECURITY DEFINER function
CREATE POLICY "Authenticated users can create companies with valid site"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (
    site_id IS NOT NULL
    AND public.is_valid_site(site_id)  -- SECURITY DEFINER bypasses RLS
  );

-- SELECT policy with fallback logic
CREATE POLICY "Users can view companies in their site"
  ON companies FOR SELECT
  TO authenticated
  USING (
    (
      site_id = public.current_site_id()
      OR site_id IN (SELECT up.site_id FROM user_profiles up WHERE up.id = auth.uid())
      OR (
        public.is_valid_site(site_id)
        AND id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
      )
    )
    AND (
      id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
      OR id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'root_admin')
    )
  );
```

## Frontend Code Analysis

### OnboardingFlow.tsx (Lines 244-314)
```typescript
const handleSubscriptionSetup = async () => {
  // 1. Validates siteId is available
  if (!siteId) {
    toast({ title: "Configuration Error", ... });
    return;
  }

  // 2. Creates company with site_id
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert({
      name: formData.companyName,
      industry_type: formData.companyType,
      company_size: formData.teamSize.toString(),
      site_id: siteId,  // ← Required by RLS
      tenant_id: userProfile?.tenant_id || null,
    })
    .select()
    .single();

  // 3. Updates user_profiles with company_id and site_id
  await supabase
    .from('user_profiles')
    .update({
      company_id: company.id,
      site_id: siteId,  // ← Sets site_id on user profile
      ...
    })
    .eq('id', user?.id);
}
```

### Site Resolution (site-resolver.ts)
```typescript
export async function getSiteConfig(): Promise<SiteConfig | null> {
  const hostname = window.location.hostname;
  const siteKey = siteKeyMap[hostname] || 'builddesk';
  
  // Queries sites table WITHOUT authentication
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .eq('key', siteKey)
    .eq('is_active', true)
    .single();
    
  return data;
}
```

## Potential Issues

### Issue #1: Site Resolution Before Authentication
**Problem**: `getSiteConfig()` queries the `sites` table before the user is fully authenticated.

**Evidence**:
- The query doesn't pass authentication headers
- RLS policy on `sites` might block unauthenticated reads

**Solution**: Add `TO anon, TO authenticated` to the sites SELECT policy

### Issue #2: user_profiles Entry Timing
**Problem**: The `user_profiles` entry might not exist when trying to create the company.

**Evidence**:
- OnboardingFlow checks `userProfile?.tenant_id`
- If `user_profiles` doesn't exist yet, this could cause issues

**Solution**: Ensure `user_profiles` is created immediately after signup

### Issue #3: Circular Dependency
**Problem**: 
1. Need `site_id` to create company
2. Need to query `sites` table to get `site_id`
3. RLS on `sites` might require authenticated user
4. User authentication metadata needs `site_id`

**Solution**: Allow anonymous/public access to read active sites

## Recommended Fixes

### Fix #1: Allow Anonymous Access to Sites Table (CRITICAL)
```sql
-- Drop existing policy
DROP POLICY IF EXISTS "Users can view active sites" ON sites;

-- Create new policy that allows both authenticated and anonymous users
CREATE POLICY "Public can view active sites"
  ON sites FOR SELECT
  TO anon, TO authenticated
  USING (is_active = TRUE);
```

**Rationale**:
- Sites table contains only configuration data, not sensitive information
- Domain routing needs to work before authentication
- Active sites are already meant to be public-facing websites

### Fix #2: Ensure user_profiles Creation Trigger
```sql
-- Create trigger to auto-create user_profiles on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    'admin',  -- First user in a company is admin
    TRUE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### Fix #3: Add Logging to Diagnose Issues
```typescript
// In OnboardingFlow.tsx handleSubscriptionSetup()
console.log('🔍 Onboarding Debug:', {
  siteId,
  userProfile,
  user: user?.id,
  hasAuth: !!supabase.auth.getSession(),
});

// Before company insert
console.log('📝 Attempting company insert with:', {
  site_id: siteId,
  company_name: formData.companyName,
});

// After company insert
console.log('✅ Company created:', company);
console.log('❌ Company error:', companyError);
```

## Testing Checklist

### Test Case 1: Fresh Signup
1. Open incognito browser
2. Navigate to /signup
3. Enter email and password
4. Complete onboarding form
5. Submit company creation
6. ✅ Company should be created successfully

### Test Case 2: Site Resolution
1. Open browser console
2. Navigate to app
3. Check localStorage for `site_id`
4. Verify `getSiteConfig()` returns valid data
5. ✅ Should see BuildDesk site config

### Test Case 3: RLS Verification
```sql
-- As authenticated user
SET ROLE authenticated;
SET request.jwt.claim.sub = '<user_uuid>';

-- Test site read
SELECT * FROM sites WHERE key = 'builddesk';  -- Should return row

-- Test company insert
INSERT INTO companies (name, site_id, industry_type, company_size, annual_revenue_range)
VALUES ('Test Co', '<builddesk_site_id>', 'residential', '1-10', 'startup');  -- Should succeed
```

## Next Steps

1. **Apply Fix #1** (Allow anonymous access to sites) - HIGHEST PRIORITY
2. **Verify user_profiles trigger exists** (Fix #2)
3. **Add debug logging** (Fix #3)
4. **Test fresh signup flow**
5. **Monitor Sentry for errors**
6. **Check Supabase logs for RLS violations**

## Related Files
- `/workspace/supabase/migrations/20251128000001_create_sites_table.sql` - Sites table and RLS
- `/workspace/supabase/migrations/20251203000008_fix_company_insert_rls_v2.sql` - Company RLS fix
- `/workspace/src/components/onboarding/OnboardingFlow.tsx` - Frontend onboarding
- `/workspace/src/lib/site-resolver.ts` - Site resolution logic
- `/workspace/src/contexts/AuthContext.tsx` - Auth state management
