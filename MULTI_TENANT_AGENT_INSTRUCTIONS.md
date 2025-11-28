# Multi-Tenant Development Instructions for AI Agents

**Add this to your project's CLAUDE.md or agent instructions file.**

---

## Critical Context

This project uses a **multi-tenant architecture** where multiple Pearson Media products (Build-Desk, RealEstate Bio, SalonPros Bio, etc.) share a single Supabase database. All tenant data is isolated using a `site_id` column.

**Every query, mutation, and new table MUST respect site isolation.**

---

## Database Rules

### Creating New Tables

**ALWAYS include `site_id`** for tenant-visible tables:

```sql
CREATE TABLE new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,  -- REQUIRED
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  -- ... other columns
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ALWAYS create index for performance
CREATE INDEX idx_new_table_site_company ON new_table(site_id, company_id);

-- ALWAYS enable RLS
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- ALWAYS create site isolation policy
CREATE POLICY "Site isolation"
  ON new_table FOR ALL
  USING (
    site_id = auth.current_site_id()
    AND company_id IN (
      SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );
```

### Modifying Existing Tables

When adding columns to existing tenant tables, no changes needed for site isolation (already enforced).

### Lookup/Reference Tables

Shared lookup tables (countries, states, etc.) do NOT need `site_id`.

---

## Edge Function Rules

### Required Pattern

```typescript
import { initializeAuthContext, errorResponse, successResponse } from '../_shared/auth-helpers.ts';

Deno.serve(async (req) => {
  // 1. ALWAYS authenticate and extract site_id
  const authContext = await initializeAuthContext(req);
  if (!authContext) {
    return errorResponse('Unauthorized', 401);
  }

  const { user, siteId, supabase } = authContext;

  try {
    // 2. ALWAYS include site_id in queries
    const { data, error } = await supabase
      .from('some_table')
      .select('*')
      .eq('site_id', siteId)  // ← REQUIRED
      .eq('company_id', companyId);

    if (error) throw error;

    // 3. ALWAYS include site_id in inserts
    const { data: newRow } = await supabase
      .from('some_table')
      .insert({
        site_id: siteId,  // ← REQUIRED
        company_id: companyId,
        ...otherFields
      });

    return successResponse(data);
  } catch (error) {
    return errorResponse(error.message, 500);
  }
});
```

### Never Do This

```typescript
// ❌ WRONG - Missing site_id filter
const { data } = await supabase
  .from('projects')
  .select('*')
  .eq('company_id', companyId);  // Could leak data from other sites!

// ❌ WRONG - Missing site_id in insert
await supabase.from('projects').insert({
  company_id: companyId,
  name: 'New Project'
});  // Will fail NOT NULL constraint or orphan data!

// ❌ WRONG - Using service role without site filter
const admin = createClient(url, serviceRoleKey);
const { data } = await admin.from('projects').select('*');  // Returns ALL sites!
```

---

## Frontend Rules

### Using Hooks

```typescript
// ✅ CORRECT - Use site-aware hooks
import { useAuth } from '@/contexts/AuthContext';

function MyComponent() {
  const { siteId } = useAuth();

  const { data } = useQuery({
    queryKey: ['projects', siteId],  // Include siteId in query key
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('site_id', siteId);  // ← REQUIRED
      return data;
    },
    enabled: !!siteId,  // Don't run until siteId is available
  });
}
```

### Creating Data

```typescript
const { siteId } = useAuth();

const createProject = async (projectData) => {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      site_id: siteId,  // ← REQUIRED
      company_id: companyId,
      ...projectData
    });
};
```

---

## Quick Checklist

Before committing any database or backend changes, verify:

- [ ] New tables have `site_id UUID NOT NULL REFERENCES sites(id)`
- [ ] New tables have RLS policy with `site_id = auth.current_site_id()`
- [ ] New tables have index on `(site_id, company_id)`
- [ ] All SELECT queries include `.eq('site_id', siteId)`
- [ ] All INSERT operations include `site_id` field
- [ ] Edge Functions use `initializeAuthContext()` from shared helpers
- [ ] Frontend hooks include `siteId` in query keys
- [ ] Service role queries manually filter by `site_id`

---

## Helper Functions Available

### Database

```sql
-- Get current user's site_id
SELECT auth.current_site_id();

-- Get site by domain
SELECT * FROM get_site_by_domain('build-desk.com');

-- Get site by key
SELECT * FROM get_site_by_key('builddesk');
```

### TypeScript (Edge Functions)

```typescript
import {
  initializeAuthContext,  // Extract user + siteId from JWT
  errorResponse,          // Standardized error response
  successResponse,        // Standardized success response
  verifyCompanyAccess,    // Check user can access company
  getUserRole,            // Get user's role
  isAdmin,                // Check if user is admin
  getSiteByDomain,        // Resolve site from domain
} from '../_shared/auth-helpers.ts';
```

### TypeScript (Frontend)

```typescript
import { useAuth } from '@/contexts/AuthContext';
const { siteId, siteConfig } = useAuth();

import { useSiteQuery } from '@/hooks/useSiteQuery';
// Automatically includes site_id in queries
```

---

## Reference

For complete documentation, see:
- `TENANT_MIGRATION_GUIDE.md` - Full migration guide
- `docs/MULTI_SITE_MIGRATION_README.md` - Master guide
- `docs/EDGE_FUNCTION_MULTI_SITE_MIGRATION.md` - Edge Function patterns
- `docs/FRONTEND_MULTI_SITE_MIGRATION.md` - Frontend patterns

---

**Remember: When in doubt, always include `site_id`.**
