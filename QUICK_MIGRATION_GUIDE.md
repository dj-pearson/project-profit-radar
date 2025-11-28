# Quick Migration Guide - What to Do Next

## ✅ What's Done

1. **Database:** Fully migrated with site_id
2. **Frontend Core:** 
   - `src/lib/site-resolver.ts` ✓
   - `src/contexts/AuthContext.tsx` ✓  
   - `src/hooks/useSiteQuery.ts` ✓
   - `src/hooks/useCompanyData.tsx` ✓ (updated with site filter)

## 🧪 Test It Now!

```bash
npm run dev
```

**What to check:**
1. Open browser console
2. Look for: `Site initialized: builddesk (UUID)`
3. Try logging in
4. Check for any errors

## 🔧 Fix Issues As You Go

### Common Errors & Fixes:

**Error: "No site_id available"**
```typescript
// Check if siteId is being set:
const { siteId } = useAuth();
console.log('Current siteId:', siteId);
```

**Error: "column site_id does not exist"**
- Table wasn't included in migration
- Add manually or add to migration

**Error: "Cannot read property 'id' of null"**
- Wait for siteConfig to load before rendering
- Add loading check:
```typescript
const { siteId, loading } = useAuth();
if (loading || !siteId) return <Loading />;
```

## 📝 Update Pattern for Hooks

### Direct Supabase Queries:
```typescript
// BEFORE
const { data } = await supabase
  .from('projects')
  .select('*');

// AFTER
const { siteId } = useAuth();
const { data } = await supabase
  .from('projects')
  .select('*')
  .eq('site_id', siteId);  // ← Add this
```

### Using useSiteQuery:
```typescript
import { useSiteQuery } from '@/hooks/useSiteQuery';

export function useProjects() {
  return useSiteQuery('projects', async (siteId) => {
    return supabase
      .from('projects')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false });
  });
}
```

### Service Layer (like taskService):
**Option 1:** Pass siteId to methods:
```typescript
class TaskService {
  async getTasks(siteId: string, filters?: {...}) {
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('site_id', siteId);  // ← Add filter
    // ... rest of query
  }
}

// In hook:
const { siteId } = useAuth();
const tasks = await taskService.getTasks(siteId, filters);
```

**Option 2:** RLS will handle it automatically
- If your RLS policies are correct, they'll filter automatically
- But ALWAYS add `.eq('site_id', siteId)` for performance

## 🎯 Priority Updates (Do These First)

### 1. Hooks That Query Companies:
- ✅ `useCompanyData.tsx` (DONE)

### 2. Hooks That Query Projects:
Search for files querying 'projects' table:
```bash
grep -r "from('projects')" src/hooks/
```

### 3. Hooks That Query Users:
Search for files querying 'user_profiles' table:
```bash
grep -r "from('user_profiles')" src/hooks/
```

### 4. Service Files:
- `src/services/taskService.ts` - Add siteId parameter
- Check for other services in `src/services/`

## 🐛 Debug Commands

```sql
-- Check if user has site_id
SELECT id, email, raw_user_meta_data, raw_app_meta_data 
FROM auth.users 
WHERE email = 'your-email@example.com';

-- Check if data has site_id
SELECT id, name, site_id FROM companies;
SELECT id, name, site_id FROM projects;

-- Verify site exists
SELECT * FROM sites WHERE key = 'builddesk';
```

## 📊 What's Left

### Core (Do Now):
- [ ] Test login/logout flow
- [ ] Update 5-10 most-used hooks
- [ ] Fix any errors that come up

### Medium (This Week):
- [ ] Update remaining hooks
- [ ] Update service files
- [ ] Test major features (projects, time tracking, invoices)

### Later (When Needed):
- [ ] Update Edge Functions
- [ ] Add new sites
- [ ] Performance optimization

## 🆘 If Stuck

**Can't log in:**
- Check console for errors
- Verify `sites` table has builddesk row
- Check `site-resolver.ts` domain mapping

**Data not showing:**
- Check if siteId is set: `console.log(useAuth())`
- Verify RLS policies are active
- Add `.eq('site_id', siteId)` to query

**Need help:**
- Check `docs/FRONTEND_MULTI_SITE_MIGRATION.md`
- Check `MIGRATION_SESSION_PROGRESS.md`
- Look for similar patterns in updated hooks

## 🚀 Next Action

**Right now:** `npm run dev` and see what breaks! 
Fix issues one at a time. Most will be simple additions of `.eq('site_id', siteId)`.

**After testing:** Update the hooks/services that are actually being used by your app.

