# Quick Test - Is Multi-Site Working?

## 🧪 Run These Tests in Browser Console

### Test 1: Check JWT has site_id (CRITICAL)
```javascript
// Copy-paste into browser console after logging in:
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const siteId = session?.user?.app_metadata?.site_id;
  const userMeta = session?.user?.user_metadata;
  
  console.log('✅ TEST 1: JWT Check');
  console.log('━━━━━━━━━━━━━━━━━━━━');
  console.log('site_id in JWT:', siteId);
  console.log('User email:', session?.user?.email);
  console.log('App metadata:', session?.user?.app_metadata);
  
  if (siteId) {
    console.log('✅ PASS: site_id is in JWT');
  } else {
    console.log('❌ FAIL: site_id NOT in JWT - need to update user');
  }
})();
```

**If FAIL:** Your user doesn't have `site_id` in their JWT yet. Run this SQL in Supabase SQL Editor:
```sql
-- Get the builddesk site_id
SELECT id FROM sites WHERE key = 'builddesk';

-- Update your user (replace YOUR_EMAIL and SITE_ID_HERE)
UPDATE auth.users
SET raw_app_metadata = jsonb_set(
  COALESCE(raw_app_metadata, '{}'::jsonb),
  '{site_id}',
  '"SITE_ID_HERE"'
)
WHERE email = 'YOUR_EMAIL';
```

Then **log out and log back in** to refresh the JWT.

---

### Test 2: Check Site Context in React
```javascript
// In console:
console.log('✅ TEST 2: React Context Check');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━');

// Look for AuthContext in React DevTools
// Or check localStorage:
const hasSession = localStorage.getItem('supabase.auth.token') !== null;
console.log('Has session:', hasSession);

// Check if site resolver is working:
console.log('Current domain:', window.location.hostname);
console.log('Should resolve to: builddesk');
```

---

### Test 3: Check Database Queries Work
```javascript
// Test if you can query companies with site filtering
(async () => {
  console.log('✅ TEST 3: Database Query Check');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('id, name, site_id')
      .limit(5);
    
    if (error) {
      console.log('❌ Query error:', error.message);
    } else {
      console.log('✅ Companies query successful');
      console.log('Companies found:', data.length);
      console.log('Sample:', data[0]);
      
      // Check if RLS is filtering
      const allHaveSiteId = data.every(c => c.site_id);
      if (allHaveSiteId) {
        console.log('✅ All companies have site_id');
      } else {
        console.log('⚠️  Some companies missing site_id');
      }
    }
  } catch (err) {
    console.log('❌ Exception:', err.message);
  }
})();
```

---

### Test 4: Check for Console Errors
```javascript
// Just look in the console - are there any errors mentioning:
// - "column site_id does not exist"
// - "No site_id available"
// - "infinite recursion"
// - RLS policy errors

console.log('✅ TEST 4: Check console above for errors');
console.log('Look for red errors related to site_id or RLS');
```

---

## 🔍 What Needs Fixing Based on Test Results

### If Test 1 FAILS (no site_id in JWT):
**Priority: CRITICAL**
- Need to update user's `app_metadata` in database
- See SQL query in Test 1 above

### If Test 2 Shows No Context:
**Priority: HIGH**
- Check `src/contexts/AuthContext.tsx` is being used
- Verify `src/lib/site-resolver.ts` exists
- Check browser console for any import errors

### If Test 3 Fails:
**Priority: MEDIUM**
- RLS policies might be too restrictive
- User might not have proper permissions
- Table might not have site_id column

### If Console Has "column site_id does not exist":
**Priority: MEDIUM**
- That table wasn't included in migrations
- Add site_id to that table manually

---

## 📋 Next Actions Based on Results

### Scenario A: All Tests Pass ✅
**You're 90% done!** Just need to:
1. Update hooks as you encounter them
2. Test each feature as you use it
3. See list below for which hooks to update first

### Scenario B: Test 1 Fails (No JWT site_id) ❌
**Fix this FIRST before anything else works:**
1. Run SQL query to update your user
2. Log out completely
3. Log back in
4. Re-run Test 1

### Scenario C: Tests Pass But Features Broken 🟡
**Normal - need to update code:**
1. Note which pages/features are broken
2. Find the hooks they use
3. Update those hooks to include `.eq('site_id', siteId)`

---

## 🎯 Priority Hook Update List

Based on what you'll likely use first, update in this order:

### Must Update (Core Features):
1. **`useDashboardData.tsx`** - Main dashboard
2. **`projectService.ts`** - Project management
3. **`estimateService.ts`** - Estimates
4. **`useAccounting.ts`** - Financial data

### Should Update (Common Features):
5. Any hook that queries `projects`
6. Any hook that queries `time_entries`
7. Any hook that queries `invoices`
8. Any hook that queries `expenses`

### Can Update Later (As Needed):
- Other hooks in `src/hooks/`
- Advanced services you're not using yet
- Edge Functions (if you have any running)

---

## 🚀 Quick Update Pattern

For any hook that breaks, use this pattern:

```typescript
import { useAuth } from '@/contexts/AuthContext';

export const useYourHook = () => {
  const { siteId } = useAuth();
  
  return useQuery({
    queryKey: ['your-key', siteId],
    queryFn: async () => {
      if (!siteId) throw new Error('No site_id');
      
      const { data, error } = await supabase
        .from('your_table')
        .select('*')
        .eq('site_id', siteId)  // ← Add this line
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!siteId  // ← Don't run query until siteId exists
  });
};
```

---

## ✅ Done When...

Migration is complete when:
- [ ] All 4 tests above pass
- [ ] Can navigate the app without errors
- [ ] Can view/create companies, projects, time entries
- [ ] No console errors about site_id or RLS
- [ ] Data is filtered correctly (only see your site's data)

---

**Run Test 1 now and let me know the result!**

