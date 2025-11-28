# Multi-Site Migration - Completion Checklist

## ✅ Phase 1: Core Infrastructure (COMPLETE)
- [x] Created `sites` table with 'builddesk' entry
- [x] Added `site_id` to 25+ core tables
- [x] Backfilled all existing data with builddesk site_id
- [x] Updated RLS policies for site isolation
- [x] Fixed RLS infinite recursion issue
- [x] Created site resolver (domain → site_id)
- [x] Updated AuthContext with site awareness
- [x] Login working ✓

## 🔧 Phase 2: Verification & Testing (DO NOW)

### Test 1: Verify JWT Contains site_id
**Expected:** After login, JWT should contain `site_id` in `app_metadata`

```javascript
// Run in browser console after logging in:
const { data: { session } } = await supabase.auth.getSession();
console.log('JWT site_id:', session?.user?.app_metadata?.site_id);
```

**Should output:** A UUID (the builddesk site_id)

---

### Test 2: Verify Site Context in Frontend
```javascript
// Run in browser console:
const { siteId, siteConfig } = useAuth(); // Or check React DevTools
console.log('Current siteId:', siteId);
console.log('Site config:', siteConfig);
```

**Expected:**
- `siteId`: UUID of builddesk
- `siteConfig.key`: 'builddesk'

---

### Test 3: Verify RLS is Filtering Data
**Run this SQL in Supabase SQL Editor:**

```sql
-- Check that site_id is present on all core tables
SELECT 
  'companies' as table_name, 
  COUNT(*) as total,
  COUNT(site_id) as with_site_id
FROM companies
UNION ALL
SELECT 'projects', COUNT(*), COUNT(site_id) FROM projects
UNION ALL
SELECT 'user_profiles', COUNT(*), COUNT(site_id) FROM user_profiles
UNION ALL
SELECT 'time_entries', COUNT(*), COUNT(site_id) FROM time_entries
UNION ALL
SELECT 'documents', COUNT(*), COUNT(site_id) FROM documents
UNION ALL
SELECT 'invoices', COUNT(*), COUNT(site_id) FROM invoices
UNION ALL
SELECT 'expenses', COUNT(*), COUNT(site_id) FROM expenses;
```

**Expected:** `total` should equal `with_site_id` for all tables (no NULL values)

---

### Test 4: Test Data Isolation (Critical Security Test)
**Create a test site and verify data doesn't leak:**

```sql
-- 1. Create a test site
INSERT INTO sites (key, domain, name, is_active)
VALUES ('testsite', 'test.example.com', 'Test Site', true);

-- 2. Create test company in new site
INSERT INTO companies (name, site_id)
SELECT 'Test Company', id FROM sites WHERE key = 'testsite';

-- 3. Verify builddesk users can't see test company
-- (should return 0 when logged in as builddesk user)
SELECT COUNT(*) FROM companies WHERE name = 'Test Company';
```

**Expected:** Count should be 0 (RLS blocks access)

---

## 📝 Phase 3: Update Application Code (IN PROGRESS)

### Frontend Hooks to Update

**Priority 1 (Core Data Access):**
- [x] `useCompanyData.tsx` ✓
- [ ] `useDashboardData.tsx`
- [ ] Any hooks querying `projects`
- [ ] Any hooks querying `time_entries`
- [ ] Any hooks querying `invoices`
- [ ] Any hooks querying `expenses`

**Priority 2 (Supporting Features):**
- [ ] All hooks in `src/hooks/` that query tenant tables
- [ ] Service files in `src/services/` (like `taskService.ts`)

**Update Pattern:**
```typescript
// BEFORE
const { data } = await supabase.from('table_name').select('*');

// AFTER
const { siteId } = useAuth();
if (!siteId) return; // Add loading/error handling

const { data } = await supabase
  .from('table_name')
  .select('*')
  .eq('site_id', siteId); // ← Add this
```

---

### Service Layer Updates

**For `taskService.ts` and similar:**

**Option A:** Pass siteId to all methods
```typescript
class TaskService {
  async getTasks(siteId: string, filters?: {...}) {
    return supabase
      .from('tasks')
      .select('*')
      .eq('site_id', siteId)  // Add this
      // ... rest of query
  }
}

// Usage in hook:
const { siteId } = useAuth();
const tasks = await taskService.getTasks(siteId, filters);
```

**Option B:** Let RLS handle it (simpler but less performant)
- RLS will automatically filter
- Still recommended to add `.eq('site_id', siteId)` for better performance

---

## 🚀 Phase 4: Edge Functions (When Needed)

**Only update Edge Functions you're actively using.**

Check which functions exist:
```bash
ls supabase/functions/
```

For each active function, add to the top:
```typescript
import { corsHeaders, getUserFromAuth, getSiteId } from '../_shared/auth-helpers.ts';

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Get site_id from JWT
  const siteId = getSiteId(req);
  if (!siteId) {
    return new Response('No site_id', { status: 400 });
  }

  // Use in queries
  const { data } = await supabase
    .from('your_table')
    .select('*')
    .eq('site_id', siteId);
  
  // ...
});
```

---

## 🧪 Phase 5: End-to-End Testing

### Test Core Workflows:

1. **Authentication:**
   - [x] Login works
   - [ ] Logout works
   - [ ] Session persists across page refresh
   - [ ] site_id stays in context

2. **Company Management:**
   - [ ] View company list (should only show builddesk companies)
   - [ ] Create new company (should auto-set site_id)
   - [ ] Edit company
   - [ ] Company data isolated by site

3. **Project Management:**
   - [ ] View projects (filtered by site)
   - [ ] Create project
   - [ ] Edit project
   - [ ] Projects isolated by site

4. **Time Tracking:**
   - [ ] Clock in/out
   - [ ] View time entries (filtered by site)
   - [ ] Time entries isolated by site

5. **Documents:**
   - [ ] Upload document
   - [ ] View documents (filtered by site)
   - [ ] Documents isolated by site

6. **Invoices & Expenses:**
   - [ ] Create invoice
   - [ ] View invoices (filtered by site)
   - [ ] Create expense
   - [ ] View expenses (filtered by site)

---

## 🔍 Quick Verification Commands

### Check for Missing site_id Filters in Code
```bash
# Find queries that might need site_id filter
grep -r "\.from(" src/ --include="*.ts" --include="*.tsx" | grep -v "site_id"
```

### Check for Service Files
```bash
ls src/services/
```

### List All Edge Functions
```bash
ls supabase/functions/
```

---

## ⚠️ Known Issues & Limitations

### Current State:
- ✅ Database fully migrated
- ✅ RLS policies enforcing site isolation
- ✅ Login working with site resolution
- ⚠️ Frontend hooks partially updated
- ⚠️ Service layer needs updating
- ⚠️ Edge Functions not yet updated

### What Could Go Wrong:
1. **Missing .eq('site_id', siteId)** - Some queries might fail or return no data
2. **Service layer not passing siteId** - Functions may not filter correctly
3. **Edge Functions without site filtering** - API endpoints may not work

### How to Fix Issues:
- **"No data showing"** → Add `.eq('site_id', siteId)` to query
- **"Cannot read property 'id' of null"** → Check if siteId is loaded
- **"500 error on API call"** → Update Edge Function to handle site_id

---

## 📊 Success Criteria

Migration is 100% complete when:
- [ ] All tests pass
- [ ] No NULL site_id values in database
- [ ] All queries include site_id filter (or rely on RLS)
- [ ] RLS prevents cross-site data access
- [ ] All active features work end-to-end
- [ ] No console errors related to site_id
- [ ] Can successfully onboard a new test site

---

## 🎯 Next Steps (Priority Order)

1. **Run Tests 1-4 above** (5 min)
2. **Check console for errors** while using app (10 min)
3. **Update high-traffic hooks** found in errors (20 min)
4. **Test core workflows** you use daily (15 min)
5. **Update Edge Functions** if needed (10 min each)

---

## 📞 Need Help?

**Common Issues:**
- See `QUICK_MIGRATION_GUIDE.md` for patterns
- Check `docs/FRONTEND_MULTI_SITE_MIGRATION.md` for detailed examples
- Review `docs/MULTI_SITE_TESTING_GUIDE.md` for test procedures

**If Stuck:**
Run verification tests and note which fail - that will show exactly what needs fixing.

