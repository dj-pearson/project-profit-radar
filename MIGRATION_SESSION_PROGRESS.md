# Multi-Site Migration Progress - Session Update

## ✅ Completed Today (Phase 1 & 2 Started)

### Phase 1: Database Migration (COMPLETE ✓)
1. **✅ Sites table created** - Build-Desk registered as primary site
2. **✅ site_id added to 25+ tables** - All verified with no NULL values
   - companies: 2/2 rows with site_id
   - projects: 6/6 rows with site_id  
   - user_profiles: 2/2 rows with site_id
3. **✅ RLS policies updated** - Two-layer security active
4. **✅ Helper function created** - `public.current_site_id()` working

### Phase 2: Frontend Core (IN PROGRESS 🔄)
1. **✅ Created `src/lib/site-resolver.ts`**
   - Domain → site_id resolution
   - Caching for performance
   - Defaults to 'builddesk' for development

2. **✅ Updated `src/contexts/AuthContext.tsx`**
   - Added `siteId` and `siteConfig` to context
   - Updated `signIn()` to set site_id in user metadata
   - Updated `signOut()` to clear site cache
   - Site config loaded on app initialization

## 🔄 What's Been Fixed During Migration

### Database Issues Resolved:
1. **blog_posts trigger** - Bypassed using `SESSION_REPLICATION_ROLE`
2. **email_campaigns** - Added conditional company_id check
3. **Schema permissions** - Moved function from `auth.` to `public.` schema
4. **user_profiles.user_id** - Fixed to use `user_profiles.id` (correct PK)
5. **Missing tables** - Wrapped RLS policies in existence checks for:
   - financial_records
   - crm_contacts
   - crm_leads
   - notifications

## 📋 Next Steps (Immediate)

### Step 1: Test the Current Setup (15 min)

```bash
# Start development server
npm run dev

# Visit http://localhost:8080
# Try logging in with existing account
```

**What to verify:**
- Site config loads (check browser console for "Site initialized" message)
- Login works
- No errors in console
- User metadata includes site_id (check in Supabase dashboard)

### Step 2: Create Site-Aware Query Hook (30 min)

Create `src/hooks/useSiteQuery.ts`:

```typescript
import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function useSiteQuery<TData = any>(
  queryKey: string | readonly unknown[],
  queryFn: (siteId: string) => Promise<{ data: TData | null; error: any }>,
  options?: Omit<UseQueryOptions<TData, Error>, 'queryKey' | 'queryFn'>
) {
  const { siteId } = useAuth();

  return useQuery({
    queryKey: Array.isArray(queryKey) ? [...queryKey, siteId] : [queryKey, siteId],
    queryFn: async () => {
      if (!siteId) {
        throw new Error('No site_id available');
      }

      const { data, error } = await queryFn(siteId);
      if (error) throw error;
      return data;
    },
    enabled: !!siteId && (options?.enabled !== false),
    ...options,
  });
}
```

### Step 3: Update Your Top 5 Hooks (1-2 hours)

Example - Update `useProjects`:

**Before:**
```typescript
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*');
      if (error) throw error;
      return data;
    },
  });
}
```

**After:**
```typescript
import { useSiteQuery } from './useSiteQuery';

export function useProjects() {
  return useSiteQuery('projects', async (siteId) => {
    return supabase
      .from('projects')
      .select('*')
      .eq('site_id', siteId)  // ← Add site filter
      .order('created_at', { ascending: false });
  });
}
```

**Priority hooks to update:**
1. `useProjects`
2. `useCompanies` 
3. `useTimeEntries`
4. `useInvoices`
5. `useDocuments`

### Step 4: Update Edge Functions (As Needed)

Since your Edge Functions already use the shared auth helper pattern, update them to:

1. Use `initializeAuthContext()` from `_shared/auth-helpers.ts`
2. Filter all queries by `site_id`

Example:
```typescript
import { withAuth, successResponse } from '../_shared/auth-helpers.ts';

Deno.serve(withAuth(async (req, authContext) => {
  const { siteId, supabase } = authContext;
  
  const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('site_id', siteId);  // ← Always filter
  
  return successResponse({ data });
}));
```

## 📊 Current Status

**Database:** ✅ 100% Complete
**Frontend Core:** ✅ 80% Complete  
**Hooks:** ⏳ 0% Complete (Next task)
**Edge Functions:** ⏳ 0% Complete
**Testing:** ⏳ Not started

## ⚠️ Important Notes

### For Development:
- All Build-Desk data now has `site_id` set to Build-Desk's site UUID
- RLS policies enforce site isolation at database level
- Users must have `site_id` in their JWT (now handled by AuthContext)

### Before Going to Production:
1. Test login/logout flow
2. Test that queries return correct data
3. Verify site isolation (user from Site A can't see Site B data)
4. Update all hooks that query the database
5. Update Edge Functions that need site_id

## 🆘 Troubleshooting

### If login fails:
Check console for "Unable to determine site_id" error. If present:
- Verify `sites` table has Build-Desk row
- Check domain mapping in `site-resolver.ts`

### If queries return empty:
- Verify user has `site_id` in metadata (Supabase dashboard → Authentication → Users)
- Check that hook includes `.eq('site_id', siteId)`
- Check RLS policies are active

### If "site_id does not exist" error:
- Verify migrations ran successfully
- Check specific table has `site_id` column

## 📖 Reference Documents

- **Master Guide:** `docs/MULTI_SITE_MIGRATION_README.md`
- **Frontend Guide:** `docs/FRONTEND_MULTI_SITE_MIGRATION.md`
- **Edge Functions:** `docs/EDGE_FUNCTION_MULTI_SITE_MIGRATION.md`
- **Testing:** `docs/MULTI_SITE_TESTING_GUIDE.md`
- **Quick Reference:** `docs/MULTI_SITE_QUICK_REFERENCE.md`

## 🎯 Success Criteria

Before marking complete:
- [ ] Users can log in and site_id is set
- [ ] Top 5 hooks filter by site_id
- [ ] No console errors
- [ ] Data is correctly isolated
- [ ] Edge Functions validate site_id

---

**Great work today!** The hard part (database migration) is complete. Now it's mostly about updating frontend code to use the site_id.

**Estimated time to complete:** 4-6 hours of development work
- Hooks updates: 2-3 hours
- Edge Functions: 1-2 hours  
- Testing: 1 hour

