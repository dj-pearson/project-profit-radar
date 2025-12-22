
# Frontend Multi-Tenant Rollback Checklist

## Automated Cleanup (Done by Script)
- [x] Remove src/lib/site-resolver.ts
- [x] Remove src/hooks/useSiteQuery.ts
- [x] Generated site_id reference report

## Manual Cleanup Required

### 1. AuthContext (src/contexts/AuthContext.tsx)
- [ ] Remove siteId from context interface
- [ ] Remove siteConfig from context interface
- [ ] Remove site resolution logic
- [ ] Remove getSiteByDomain calls
- [ ] Keep only: user, session, profile, auth methods

### 2. Database Queries
Review SITE_ID_CLEANUP_REPORT.txt and remove .eq('site_id', siteId) from:
- [ ] All hooks in src/hooks/
- [ ] All service files in src/services/
- [ ] All components that directly query Supabase

### 3. Replace useSiteQuery with useQuery
Find all useSiteQuery imports and replace with standard useQuery:

BEFORE:
```typescript
import { useSiteQuery } from '@/hooks/useSiteQuery';

const { data } = useSiteQuery(['projects'], async (siteId) => {
  return supabase.from('projects').select('*').eq('site_id', siteId);
});
```

AFTER:
```typescript
import { useQuery } from '@tanstack/react-query';

const { data } = useQuery({
  queryKey: ['projects'],
  queryFn: async () => {
    const { data } = await supabase.from('projects').select('*');
    return data;
  }
});
```

### 4. Test After Cleanup
- [ ] npm run build (check for TypeScript errors)
- [ ] npm run dev (test locally)
- [ ] Test authentication flow
- [ ] Test data fetching in main pages
- [ ] Check browser console for errors

### 5. Remove Multi-Tenant Documentation
- [ ] Archive or delete MULTI_TENANT_AGENT_INSTRUCTIONS.md
- [ ] Archive or delete MULTI_SITE_MIGRATION_SUMMARY.md
- [ ] Archive or delete MULTI_SITE_COMPLETION_CHECKLIST.md
- [ ] Update CLAUDE.md to remove multi-tenant references

## Common Patterns to Fix

### Pattern 1: Remove siteId from useAuth
```typescript
// BEFORE
const { user, siteId } = useAuth();

// AFTER
const { user } = useAuth();
```

### Pattern 2: Remove site_id filters
```typescript
// BEFORE
.eq('site_id', siteId)
.eq('company_id', companyId)

// AFTER
.eq('company_id', companyId)
```

### Pattern 3: Remove site_id from inserts
```typescript
// BEFORE
.insert({
  site_id: siteId,
  company_id: companyId,
  ...data
})

// AFTER
.insert({
  company_id: companyId,
  ...data
})
```

## Files Most Likely to Need Changes

Based on typical BuildDesk usage:
1. src/hooks/useCompanyData.tsx
2. src/hooks/useDashboardData.tsx
3. src/hooks/useProjects.tsx
4. src/hooks/useTimeEntries.tsx
5. src/services/taskService.ts
6. Any custom hooks you've created

## Verification Commands

```bash
# Check for remaining site_id references
grep -r "site_id" --include="*.ts" --include="*.tsx" src/

# Check for useSiteQuery usage
grep -r "useSiteQuery" --include="*.ts" --include="*.tsx" src/

# Check for siteId destructuring
grep -r "{ .* siteId" --include="*.ts" --include="*.tsx" src/

# Build check
npm run build
```
