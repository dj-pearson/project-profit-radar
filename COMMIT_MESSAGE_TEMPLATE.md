# Git Commit Message Template

Use this template when committing the RLS fixes:

```
fix: resolve RLS blocking company creation during onboarding

Problem:
- New users unable to complete onboarding due to RLS policies blocking database operations
- Site resolution failed before authentication (sites table not accessible to anon)
- User profiles not created automatically on signup (trigger targeting wrong table)
- Users couldn't read their own profile immediately after signup (overly restrictive RLS)

Root Causes:
1. Sites table SELECT policy didn't explicitly allow anonymous access
2. handle_new_user() trigger was inserting into 'profiles' instead of 'user_profiles'
3. user_profiles SELECT policy required site_id match even for self-access

Solutions:
1. Updated sites RLS policy to allow TO anon, TO authenticated (migration 20251203234844)
2. Fixed handle_new_user() trigger to insert into user_profiles with site_id (migration 20251203234845)
3. Relaxed user_profiles SELECT policy to allow self-access without site_id check (migration 20251203234846)

Changes:
- supabase/migrations/20251203234844_fix_sites_anon_access.sql
- supabase/migrations/20251203234845_fix_user_profiles_trigger.sql
- supabase/migrations/20251203234846_fix_user_profiles_select_rls.sql
- scripts/test-onboarding-rls.sql (test script)

Documentation:
- RLS_COMPANY_CREATION_DIAGNOSIS.md (detailed analysis)
- ONBOARDING_RLS_FIX_SUMMARY.md (deployment guide)
- ONBOARDING_TROUBLESHOOTING.md (quick reference)

Impact:
- Enables new user signups to complete successfully
- Maintains multi-tenant site isolation via site_id
- No security vulnerabilities introduced
- Minimal performance impact

Testing:
- [x] Sites table readable by anonymous users
- [x] User profiles created on signup with correct site_id
- [x] Users can read their own profile immediately
- [x] Company creation works with valid site_id
- [x] Site isolation maintained for cross-company access
- [ ] Manual test: Fresh signup flow in browser
- [ ] Monitor: Supabase logs for 24-48 hours

Refs: #onboarding #rls #multi-tenant #critical
```

## Alternative Shorter Version

```
fix: resolve onboarding RLS blocking company creation

- Allow anonymous access to sites table for domain routing
- Fix user_profiles trigger to insert into correct table with site_id
- Relax user_profiles SELECT policy for self-access during onboarding

Migrations:
- 20251203234844_fix_sites_anon_access.sql
- 20251203234845_fix_user_profiles_trigger.sql
- 20251203234846_fix_user_profiles_select_rls.sql

Fixes: New users blocked from completing signup/onboarding
Impact: Critical - enables user signups
Testing: Run scripts/test-onboarding-rls.sql
```

## Conventional Commit Format

```
fix(rls): resolve onboarding blocking for new users

BREAKING CHANGE: Sites table now allows anonymous read access

- Allow anon users to query sites table for domain routing
- Fix handle_new_user() to create user_profiles (not profiles)
- Relax RLS for user_profiles self-access during onboarding

Closes: #<issue-number>
```
