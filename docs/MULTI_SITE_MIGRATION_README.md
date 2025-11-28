# Multi-Site Database Migration - Master Guide

## 🎯 Project Overview

This migration transforms Build-Desk from a single-tenant system into a **multi-site architecture** that enables multiple Pearson Media products (Build-Desk, RealEstate Bio, SalonPros Bio, etc.) to share a single Supabase database with complete data isolation.

### Benefits

- ✅ **80% cost reduction** - One Supabase project instead of 10+
- ✅ **Complete data isolation** - Two-layer security (site + company)
- ✅ **Shared infrastructure** - Reuse Edge Functions, Auth, Storage
- ✅ **Easy onboarding** - Add new sites in hours, not days
- ✅ **Centralized management** - One dashboard for all products

---

## 📋 Migration Status

### Phase Status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Ready | Sites table infrastructure |
| Phase 2 | ✅ Ready | Add site_id to core tables |
| Phase 2B | ✅ Ready | Add site_id to extended tables |
| Phase 3 | ✅ Ready | Update RLS policies |
| Phase 4 | ⏳ Pending | Edge Functions updates |
| Phase 5 | ⏳ Pending | Frontend updates |
| Phase 6 | ⏳ Pending | Testing & validation |
| Phase 7 | ⏳ Pending | Production deployment |

---

## 🚀 Quick Start

### Prerequisites

1. **Backup your database** (CRITICAL!)
```bash
pg_dump -h db.your-project.supabase.co \
  -U postgres -d postgres \
  --clean --if-exists \
  -f backup_$(date +%Y%m%d_%H%M%S).sql
```

2. **Install Supabase CLI**
```bash
npm install -g supabase
```

3. **Link to your project**
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### Step-by-Step Migration

#### Step 1: Apply Database Migrations

```bash
# Apply all 4 migration files in order
supabase db push

# Or manually apply each migration:
psql -h db.your-project.supabase.co -U postgres -d postgres \
  -f supabase/migrations/20251128000001_create_sites_table.sql

psql -h db.your-project.supabase.co -U postgres -d postgres \
  -f supabase/migrations/20251128000002_add_site_id_to_core_tables.sql

psql -h db.your-project.supabase.co -U postgres -d postgres \
  -f supabase/migrations/20251128000003_add_site_id_to_extended_tables.sql

psql -h db.your-project.supabase.co -U postgres -d postgres \
  -f supabase/migrations/20251128000004_update_rls_policies_for_sites.sql
```

#### Step 2: Verify Database Changes

```sql
-- Check sites table exists
SELECT * FROM sites WHERE key = 'builddesk';

-- Count tables with site_id
SELECT COUNT(*) FROM information_schema.columns 
WHERE column_name = 'site_id' AND table_schema = 'public';

-- Verify all data has site_id
SELECT 
  'companies' as table_name,
  COUNT(*) as total,
  COUNT(site_id) as with_site_id
FROM companies;
```

#### Step 3: Update Edge Functions

```bash
# Copy shared auth helpers
cp supabase/functions/_shared/auth-helpers.ts supabase/functions/_shared/

# Deploy shared helpers (if needed)
# Then update and deploy each Edge Function category
# See docs/EDGE_FUNCTION_MULTI_SITE_MIGRATION.md for details
```

#### Step 4: Update Frontend

See `docs/FRONTEND_MULTI_SITE_MIGRATION.md` for complete instructions.

**Quick summary:**
1. Create `src/lib/site-resolver.ts`
2. Update `src/contexts/AuthContext.tsx`
3. Update all query hooks to filter by `site_id`
4. Test locally

#### Step 5: Test Everything

See `docs/MULTI_SITE_TESTING_GUIDE.md` for comprehensive tests.

**Critical tests:**
```bash
# Test RLS isolation
npm run test:rls

# Test Edge Functions
npm run test:e2e

# Test frontend
npm run test
```

#### Step 6: Deploy

```bash
# Deploy Edge Functions
supabase functions deploy

# Deploy frontend
npm run build
wrangler pages publish dist
```

---

## 📁 Project Structure

```
project-profit-radar/
├── supabase/
│   ├── migrations/
│   │   ├── 20251128000001_create_sites_table.sql
│   │   ├── 20251128000002_add_site_id_to_core_tables.sql
│   │   ├── 20251128000003_add_site_id_to_extended_tables.sql
│   │   └── 20251128000004_update_rls_policies_for_sites.sql
│   └── functions/
│       └── _shared/
│           └── auth-helpers.ts  ← Shared authentication helpers
├── docs/
│   ├── EDGE_FUNCTION_MULTI_SITE_MIGRATION.md
│   ├── FRONTEND_MULTI_SITE_MIGRATION.md
│   ├── NEW_WEBSITE_ONBOARDING_GUIDE.md
│   ├── MULTI_SITE_TESTING_GUIDE.md
│   └── MULTI_SITE_MIGRATION_README.md  ← This file
└── Database_Migration.md  ← Original PRD
```

---

## 📚 Documentation Index

### Core Guides

1. **[Database_Migration.md](../Database_Migration.md)**
   - Original PRD and architectural overview
   - Problem statement and solution design
   - Phase breakdown

2. **[EDGE_FUNCTION_MULTI_SITE_MIGRATION.md](./EDGE_FUNCTION_MULTI_SITE_MIGRATION.md)**
   - How to update Edge Functions for multi-site
   - Shared helper functions
   - Migration patterns by function category
   - Testing Edge Functions

3. **[FRONTEND_MULTI_SITE_MIGRATION.md](./FRONTEND_MULTI_SITE_MIGRATION.md)**
   - Site resolver implementation
   - AuthContext updates
   - Query hook patterns
   - Mobile app configuration

4. **[NEW_WEBSITE_ONBOARDING_GUIDE.md](./NEW_WEBSITE_ONBOARDING_GUIDE.md)**
   - Step-by-step guide to add new sites
   - Data migration procedures
   - Domain configuration
   - Go-live checklist

5. **[MULTI_SITE_TESTING_GUIDE.md](./MULTI_SITE_TESTING_GUIDE.md)**
   - Comprehensive testing procedures
   - RLS policy validation
   - Security audit
   - Production readiness checklist

### Migration Files

- **Phase 1:** `20251128000001_create_sites_table.sql`
  - Creates `sites` table
  - Seeds Build-Desk site
  - Helper functions for site resolution

- **Phase 2:** `20251128000002_add_site_id_to_core_tables.sql`
  - Adds `site_id` to 15+ core tables
  - Backfills with Build-Desk site_id
  - Creates indexes

- **Phase 2B:** `20251128000003_add_site_id_to_extended_tables.sql`
  - Adds `site_id` to extended tables
  - Covers templates, equipment, SEO, etc.

- **Phase 3:** `20251128000004_update_rls_policies_for_sites.sql`
  - Creates `auth.current_site_id()` function
  - Updates RLS policies for site isolation
  - Maintains company-level isolation

---

## 🔑 Key Concepts

### Two-Layer Isolation

The multi-site architecture enforces **two layers of data isolation**:

```
Layer 1: Site Isolation
  └─ site_id = auth.current_site_id()
      Layer 2: Company Isolation (existing)
        └─ company_id IN (user's companies)
```

**Example RLS Policy:**

```sql
CREATE POLICY "Users can view projects in their site"
  ON projects FOR SELECT
  USING (
    site_id = auth.current_site_id()  -- Layer 1: Site isolation
    AND company_id IN (                -- Layer 2: Company isolation
      SELECT company_id FROM user_profiles
      WHERE user_id = auth.uid()
    )
  );
```

### Site Resolution Flow

```
1. User visits domain (e.g., realestatebio.com)
2. Frontend resolves domain → site_key ('realestate')
3. Frontend queries sites table → site_id (UUID)
4. User logs in → site_id added to JWT
5. All queries filter by site_id
6. RLS enforces site_id = auth.current_site_id()
```

### Authentication Flow

```typescript
// Frontend: site-resolver.ts
const siteConfig = await getSiteConfig();  // Resolves from domain
const siteId = siteConfig.id;

// Frontend: Sign in
await supabase.auth.signInWithPassword({
  email,
  password,
  options: {
    data: { site_id: siteId },  // ← Set in JWT
  },
});

// Edge Function: auth-helpers.ts
const siteId = user.app_metadata?.site_id;  // ← Extract from JWT
if (!siteId) return errorResponse('Forbidden', 403);

// Database: RLS
site_id = auth.current_site_id()  // ← Enforced automatically
```

---

## ⚠️ Critical Considerations

### Data Integrity

- ✅ **Always backup before migration**
- ✅ **Test in staging first**
- ✅ **Verify all rows have site_id**
- ✅ **No NULL site_id values allowed**

### Security

- ✅ **RLS policies must include site_id filter**
- ✅ **Edge Functions must validate site_id**
- ✅ **Frontend must reject requests without site_id**
- ✅ **Test cross-site data access (should fail)**

### Performance

- ✅ **Indexes on site_id for all major tables**
- ✅ **Composite indexes on (site_id, company_id)**
- ✅ **RLS performance impact < 20%**

### Rollback Plan

If issues arise:

1. **Database rollback:**
```bash
psql -h db.your-project.supabase.co -U postgres -d postgres \
  -f backup_TIMESTAMP.sql
```

2. **Emergency disable site filtering:**
```typescript
// In frontend: site-resolver.ts
const DISABLE_SITE_FILTERING = true;  // Emergency flag

if (!DISABLE_SITE_FILTERING && siteId) {
  query.eq('site_id', siteId);
}
```

3. **Remove site_id column (last resort):**
```sql
-- Only if absolutely necessary
ALTER TABLE projects DROP COLUMN site_id;
-- Repeat for all tables
```

---

## 🧪 Testing Checklist

### Database Testing

- [ ] Sites table exists with Build-Desk site
- [ ] All tenant tables have site_id column
- [ ] All rows have site_id (no NULLs)
- [ ] Foreign keys on site_id exist
- [ ] Indexes on site_id exist
- [ ] RLS policies enforce site isolation

### Application Testing

- [ ] Edge Functions extract site_id from JWT
- [ ] Edge Functions filter by site_id
- [ ] Frontend resolves site from domain
- [ ] Frontend includes site_id in queries
- [ ] Authentication sets site_id in JWT
- [ ] Cross-site data access returns empty

### Security Testing

- [ ] User from Site A cannot see Site B data
- [ ] Requests without site_id are rejected
- [ ] RLS policies prevent SQL injection
- [ ] No sensitive data leakage across sites

---

## 🚀 Adding a New Site

Once migration is complete, adding a new site takes **4-6 hours**:

1. **Create site record** (5 min)
```sql
INSERT INTO sites (key, name, domain, ...) VALUES (...);
```

2. **Migrate data** (2-4 hours depending on volume)
```sql
-- See NEW_WEBSITE_ONBOARDING_GUIDE.md for templates
```

3. **Update frontend** (30 min)
```typescript
// Add domain mapping in site-resolver.ts
```

4. **Configure DNS** (15 min + propagation time)
```
CNAME: newsite.com → project.pages.dev
```

5. **Test and deploy** (1 hour)

See `docs/NEW_WEBSITE_ONBOARDING_GUIDE.md` for complete instructions.

---

## 📊 Migration Timeline

**Estimated Total Time:** 2-3 weeks

| Week | Phase | Tasks | Time |
|------|-------|-------|------|
| Week 1 | Database | Apply migrations, verify data | 3-4 days |
| Week 1-2 | Edge Functions | Update 154 functions in batches | 4-5 days |
| Week 2 | Frontend | Update AuthContext, hooks, components | 3-4 days |
| Week 2-3 | Testing | RLS, security, performance tests | 2-3 days |
| Week 3 | Deployment | Staged rollout, monitoring | 1-2 days |

---

## 🆘 Troubleshooting

### Issue: "Missing site_id in authentication"

**Solution:**
```typescript
await supabase.auth.updateUser({
  data: { site_id: 'correct-site-id' },
});
```

### Issue: User sees data from wrong site

**Solution:**
```sql
-- Check user's site_id
SELECT id, email, site_id FROM user_profiles WHERE email = 'user@example.com';

-- Fix if wrong
UPDATE user_profiles
SET site_id = (SELECT id FROM sites WHERE key = 'correct-key')
WHERE email = 'user@example.com';
```

### Issue: Edge Function returns 403

**Solution:** Verify JWT has site_id:
```typescript
const { data: { user } } = await supabase.auth.getUser();
console.log('site_id:', user.app_metadata?.site_id);
```

More troubleshooting in `docs/NEW_WEBSITE_ONBOARDING_GUIDE.md` section 9.

---

## 📈 Success Metrics

- ✅ All apps run on one Supabase project
- ✅ Zero cross-site data leaks
- ✅ Build-Desk performance unchanged
- ✅ New site onboarding < 1 day
- ✅ Cost reduction ~80%
- ✅ All tests passing

---

## 🔗 Related Resources

- [Build-Desk Documentation (CLAUDE.md)](../CLAUDE.md)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Multi-Tenant Architecture Best Practices](https://supabase.com/blog/multi-tenant-applications)

---

## 📞 Support

For questions or issues:

1. Review the relevant guide in `docs/`
2. Check the troubleshooting sections
3. Search Supabase Discord for similar issues
4. Create a GitHub issue with detailed logs

---

## ✅ Next Steps

1. **Read this guide completely**
2. **Review Database_Migration.md for context**
3. **Backup your database**
4. **Apply Phase 1 migration in staging**
5. **Verify and test**
6. **Proceed with remaining phases**

**Good luck with your migration! 🚀**

