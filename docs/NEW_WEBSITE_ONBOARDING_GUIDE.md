# New Website Onboarding Guide

## Overview

This comprehensive guide explains how to add a new Pearson Media website to the shared Build-Desk database. This process ensures complete data isolation while leveraging shared infrastructure.

**Time Estimate:** 4-6 hours per website

**Prerequisites:**
- Completed multi-site migration (all 4 migration files applied)
- Access to Supabase dashboard
- Access to Build-Desk codebase
- Understanding of DNS/domain configuration

---

## Table of Contents

1. [Pre-Migration Planning](#1-pre-migration-planning)
2. [Database Setup](#2-database-setup)
3. [Data Migration](#3-data-migration)
4. [Frontend Configuration](#4-frontend-configuration)
5. [Edge Function Updates](#5-edge-function-updates)
6. [Domain & DNS Setup](#6-domain--dns-setup)
7. [Testing & Validation](#7-testing--validation)
8. [Go-Live Checklist](#8-go-live-checklist)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Pre-Migration Planning

### 1.1 Gather Site Information

Fill out this checklist before starting:

```yaml
# Site Configuration
site_key: "realestate"  # lowercase, no spaces
site_name: "RealEstate Bio"
primary_domain: "realestatebio.com"
additional_domains:
  - "www.realestatebio.com"
  - "realestate-staging.pearsonperformance.workers.dev"

# Branding
logo_url: "https://cdn.realestatebio.com/logo.png"
primary_color: "#3B82F6"
secondary_color: "#1E293B"
favicon_url: "https://cdn.realestatebio.com/favicon.ico"

# Features
enabled_features:
  crm: true
  projects: true
  financials: true
  gps_tracking: false  # May differ per site
  ai_features: true
  seo: true
  blog: true

# Industry
industry: "real_estate"

# Current Database (if migrating from existing Supabase project)
source_project_url: "https://old-project.supabase.co"
source_project_key: "your-old-anon-key"
```

### 1.2 Export Data from Existing Project (If Applicable)

If migrating from an existing Supabase project:

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to source project
supabase link --project-ref your-old-project-ref

# Export database schema
supabase db dump --schema public > source_schema.sql

# Export data
pg_dump -h db.your-old-project.supabase.co \
  -U postgres \
  -d postgres \
  --data-only \
  --column-inserts \
  -f source_data.sql
```

### 1.3 Review Data Volume

Estimate data to migrate:

```sql
-- Run on source database
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  n_tup_ins AS row_count
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;
```

---

## 2. Database Setup

### 2.1 Create Site Record

Run this SQL in Supabase SQL Editor:

```sql
-- Insert new site
INSERT INTO sites (
  key,
  name,
  domain,
  additional_domains,
  description,
  industry,
  is_active,
  is_production,
  config
) VALUES (
  'realestate',  -- ← Change this
  'RealEstate Bio',  -- ← Change this
  'realestatebio.com',  -- ← Change this
  ARRAY['www.realestatebio.com', 'realestate-staging.pearsonperformance.workers.dev'],  -- ← Change this
  'Real estate agent branding and lead generation platform',  -- ← Change this
  'real_estate',  -- ← Change this
  TRUE,
  FALSE,  -- Set to TRUE when ready for production
  '{
    "branding": {
      "logo_url": "https://cdn.realestatebio.com/logo.png",
      "primary_color": "#3B82F6",
      "secondary_color": "#1E293B",
      "favicon_url": "https://cdn.realestatebio.com/favicon.ico"
    },
    "features": {
      "crm": true,
      "projects": true,
      "financials": true,
      "gps_tracking": false,
      "ai_features": true,
      "seo": true,
      "blog": true
    },
    "limits": {
      "max_companies": null,
      "max_users": null,
      "max_storage_gb": null
    }
  }'::jsonb
) RETURNING *;
```

### 2.2 Verify Site Creation

```sql
-- Get the new site_id (save this!)
SELECT id, key, name, domain
FROM sites
WHERE key = 'realestate';  -- ← Your site key
```

**Save the `id` (UUID) — you'll need it for data migration.**

---

## 3. Data Migration

### 3.1 Table-by-Table Migration Script

Create a migration script for your data:

```sql
-- =====================================================
-- DATA MIGRATION: RealEstate Bio → Build-Desk Database
-- =====================================================

DO $$
DECLARE
  v_new_site_id UUID := 'YOUR-NEW-SITE-ID-HERE';  -- ← Replace with site.id from step 2.2
  v_old_to_new_company_map JSONB := '{}';
  v_old_to_new_user_map JSONB := '{}';
BEGIN

  -- =====================================================
  -- STEP 1: Migrate Companies
  -- =====================================================
  
  -- This assumes you're importing from CSV or another database
  -- Adjust the INSERT source based on your data format
  
  WITH imported_companies AS (
    -- Option A: If importing from CSV loaded into temp table
    SELECT * FROM temp_companies_import
    
    -- Option B: If manually inserting
    -- SELECT 'old-company-id-1' as old_id, 'Acme Real Estate' as name, ...
  ),
  inserted_companies AS (
    INSERT INTO companies (
      site_id,
      name,
      slug,
      logo_url,
      email,
      phone,
      industry_type,
      subscription_tier,
      subscription_status,
      created_at
    )
    SELECT
      v_new_site_id,
      name,
      slug,
      logo_url,
      email,
      phone,
      'residential',  -- Default industry
      'professional',
      'active',
      created_at
    FROM imported_companies
    RETURNING id, (SELECT old_id FROM imported_companies LIMIT 1) as old_id
  )
  SELECT jsonb_object_agg(old_id::text, id::text) INTO v_old_to_new_company_map
  FROM inserted_companies;
  
  RAISE NOTICE 'Migrated % companies', jsonb_object_length(v_old_to_new_company_map);

  -- =====================================================
  -- STEP 2: Migrate User Profiles
  -- =====================================================
  
  -- NOTE: Users must already exist in auth.users
  -- This only migrates user_profiles/profiles
  
  WITH imported_users AS (
    SELECT * FROM temp_users_import
  ),
  inserted_users AS (
    INSERT INTO user_profiles (
      id,  -- Must match auth.users.id
      site_id,
      company_id,
      first_name,
      last_name,
      display_name,
      email,
      role,
      is_active,
      created_at
    )
    SELECT
      auth_user_id,  -- From auth.users
      v_new_site_id,
      (v_old_to_new_company_map->>old_company_id::text)::UUID,
      first_name,
      last_name,
      display_name,
      email,
      role,
      is_active,
      created_at
    FROM imported_users
    ON CONFLICT (id) DO UPDATE SET
      site_id = EXCLUDED.site_id,
      company_id = EXCLUDED.company_id
    RETURNING id
  )
  SELECT COUNT(*) FROM inserted_users;
  
  RAISE NOTICE 'Migrated % users', (SELECT COUNT(*) FROM inserted_users);

  -- =====================================================
  -- STEP 3: Migrate Projects
  -- =====================================================
  
  INSERT INTO projects (
    site_id,
    company_id,
    name,
    description,
    status,
    client_name,
    budget_total,
    start_date,
    end_date,
    created_at
  )
  SELECT
    v_new_site_id,
    (v_old_to_new_company_map->>old_company_id::text)::UUID,
    name,
    description,
    status,
    client_name,
    budget_total,
    start_date,
    end_date,
    created_at
  FROM temp_projects_import;

  -- =====================================================
  -- STEP 4: Migrate Other Tables
  -- =====================================================
  
  -- Repeat for:
  -- - invoices
  -- - expenses
  -- - documents
  -- - time_entries
  -- - crm_contacts
  -- - crm_leads
  -- - etc.
  
  -- Template:
  -- INSERT INTO table_name (site_id, company_id, ...)
  -- SELECT v_new_site_id, (v_old_to_new_company_map->>old_company_id::text)::UUID, ...
  -- FROM temp_table_import;

END $$;
```

### 3.2 Execute Migration

```bash
# Copy your data files to temp tables
psql -h db.your-build-desk-project.supabase.co \
  -U postgres \
  -d postgres \
  -c "\copy temp_companies_import FROM 'companies.csv' CSV HEADER"

# Run migration script
psql -h db.your-build-desk-project.supabase.co \
  -U postgres \
  -d postgres \
  -f data_migration.sql
```

### 3.3 Verify Data Migration

```sql
-- Count records per site
SELECT
  s.name as site,
  COUNT(DISTINCT c.id) as companies,
  COUNT(DISTINCT up.id) as users,
  COUNT(DISTINCT p.id) as projects
FROM sites s
LEFT JOIN companies c ON c.site_id = s.id
LEFT JOIN user_profiles up ON up.site_id = s.id
LEFT JOIN projects p ON p.site_id = s.id
WHERE s.key IN ('builddesk', 'realestate')  -- ← Your sites
GROUP BY s.name;
```

---

## 4. Frontend Configuration

### 4.1 Update Site Resolver

Edit `src/lib/site-resolver.ts`:

```typescript
const siteKeyMap: Record<string, string> = {
  'build-desk.com': 'builddesk',
  'www.build-desk.com': 'builddesk',
  'builddesk.pearsonperformance.workers.dev': 'builddesk',
  
  // ← ADD NEW SITE HERE
  'realestatebio.com': 'realestate',
  'www.realestatebio.com': 'realestate',
  'realestate-staging.pearsonperformance.workers.dev': 'realestate',
  
  'localhost': 'builddesk',  // Development default
};
```

### 4.2 Test Locally

```bash
# Add to /etc/hosts (macOS/Linux) or C:\Windows\System32\drivers\etc\hosts (Windows)
127.0.0.1 realestatebio.local

# Start dev server
npm run dev

# Visit http://realestatebio.local:8080
```

### 4.3 Build and Deploy

```bash
# Build
npm run build

# Deploy to Cloudflare Pages (or your hosting)
wrangler pages publish dist --project-name realestate-bio
```

---

## 5. Edge Function Updates

### 5.1 Verify Edge Functions Use Auth Helpers

All Edge Functions should already use the shared auth helpers:

```typescript
import { initializeAuthContext } from '../_shared/auth-helpers.ts';

// This automatically extracts and validates site_id
const authContext = await initializeAuthContext(req);
```

### 5.2 Test Edge Functions

```bash
# Test locally
supabase functions serve

# Test site isolation
curl -X POST http://localhost:54321/functions/v1/your-function \
  -H "Authorization: Bearer YOUR-JWT-WITH-SITE-ID" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### 5.3 Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy

# Or deploy specific function
supabase functions deploy your-function-name
```

---

## 6. Domain & DNS Setup

### 6.1 DNS Configuration

Add DNS records for the new domain:

```
Type: CNAME
Name: realestatebio.com
Value: realestate-bio.pages.dev
TTL: Auto

Type: CNAME
Name: www
Value: realestate-bio.pages.dev
TTL: Auto
```

### 6.2 SSL Certificate

1. Go to Cloudflare Pages dashboard
2. Navigate to your project → Custom domains
3. Add `realestatebio.com` and `www.realestatebio.com`
4. Wait for SSL provisioning (~1-5 minutes)

### 6.3 Verify Domain Resolution

```bash
# Check DNS propagation
dig realestatebio.com

# Test HTTPS
curl -I https://realestatebio.com
```

---

## 7. Testing & Validation

### 7.1 Authentication Testing

- [ ] Visit new domain (e.g., `realestatebio.com`)
- [ ] Sign up for new account
- [ ] Verify `site_id` is set in JWT
- [ ] Verify user is created with correct `site_id`

```sql
-- Check user's site_id
SELECT 
  up.id,
  up.email,
  up.site_id,
  s.key as site_key
FROM user_profiles up
JOIN sites s ON s.id = up.site_id
WHERE up.email = 'test@realestatebio.com';
```

### 7.2 Data Isolation Testing

Test that users from different sites cannot see each other's data:

**Test 1: Cross-Site Data Access**

```typescript
// As user from Site A, try to access Site B project
const siteAUser = 'user-a@builddesk.com';
const siteBProjectId = 'project-from-realestatebio';

const { data, error } = await supabase
  .from('projects')
  .select('*')
  .eq('id', siteBProjectId)
  .single();

// Should return null or error (not Site B data)
console.assert(data === null, 'Data isolation failed!');
```

**Test 2: Network Requests**

```bash
# User A tries to access User B's data via API
curl -X GET https://build-desk.com/api/projects/site-b-project-id \
  -H "Authorization: Bearer SITE-A-USER-JWT"

# Should return 404 or 403
```

### 7.3 Feature Testing

For each enabled feature:

- [ ] CRM: Create contact, lead
- [ ] Projects: Create project, add tasks
- [ ] Financials: Create invoice, expense
- [ ] Time Tracking: Clock in/out
- [ ] Documents: Upload file
- [ ] Blog: Create blog post

### 7.4 Branding Verification

- [ ] Logo displays correctly
- [ ] Primary color applied to buttons, links
- [ ] Secondary color applied to backgrounds
- [ ] Favicon shows in browser tab
- [ ] Page title shows site name

---

## 8. Go-Live Checklist

### Pre-Launch

- [ ] All data migrated successfully
- [ ] Data isolation tested and verified
- [ ] DNS configured and SSL active
- [ ] Branding applied correctly
- [ ] Key features tested
- [ ] Edge Functions deployed
- [ ] Auth flow tested (sign up, sign in, sign out)
- [ ] Mobile app configured (if applicable)

### Launch

- [ ] Update `is_production` flag on site record:

```sql
UPDATE sites
SET is_production = TRUE
WHERE key = 'realestate';
```

- [ ] Monitor logs for errors:

```bash
# Supabase logs
supabase logs --project-ref your-project-ref

# Cloudflare logs
wrangler pages tail
```

- [ ] Set up monitoring alerts (Sentry, PostHog, etc.)

### Post-Launch

- [ ] Monitor for 24-48 hours
- [ ] Review error logs
- [ ] Check database query performance
- [ ] Gather user feedback
- [ ] Document any site-specific customizations

---

## 9. Troubleshooting

### Issue: "Missing site_id in authentication"

**Cause:** User JWT doesn't have `site_id` in metadata.

**Fix:**

```typescript
// Force update user metadata
await supabase.auth.updateUser({
  data: {
    site_id: 'YOUR-SITE-ID',
  },
});

// Or re-authenticate
await supabase.auth.signOut();
await supabase.auth.signInWithPassword({ email, password });
```

### Issue: User sees data from wrong site

**Cause:** RLS policy not enforcing site_id, or site_id not set correctly.

**Fix:**

```sql
-- Check user's site_id
SELECT id, email, site_id FROM user_profiles WHERE email = 'user@example.com';

-- Fix site_id if wrong
UPDATE user_profiles
SET site_id = (SELECT id FROM sites WHERE key = 'correct-site-key')
WHERE email = 'user@example.com';
```

### Issue: Edge Function returns 403 "Forbidden"

**Cause:** `site_id` not in JWT or doesn't match database.

**Fix:**

1. Check JWT payload:

```typescript
const { data: { user } } = await supabase.auth.getUser();
console.log('app_metadata:', user.app_metadata);
console.log('user_metadata:', user.user_metadata);
```

2. Update if missing:

```typescript
await supabase.auth.updateUser({
  data: { site_id: 'correct-site-id' },
});
```

### Issue: Domain not resolving

**Cause:** DNS not propagated or misconfigured.

**Fix:**

```bash
# Check DNS
dig realestatebio.com

# Check Cloudflare Pages custom domain status
# Verify CNAME points to *.pages.dev

# Clear DNS cache
sudo dscacheutil -flushcache  # macOS
ipconfig /flushdns             # Windows
```

### Issue: Data migration failed halfway

**Cause:** Foreign key constraint violation or missing related records.

**Fix:**

```sql
-- Rollback partial migration
BEGIN;

DELETE FROM projects WHERE site_id = 'your-new-site-id';
DELETE FROM user_profiles WHERE site_id = 'your-new-site-id';
DELETE FROM companies WHERE site_id = 'your-new-site-id';

ROLLBACK;  -- or COMMIT if you want to delete

-- Fix data issues in source, then retry
```

---

## Summary

### Key Takeaways

1. **Always test data isolation** before going live
2. **Migrate data table-by-table** with proper foreign key mapping
3. **Update frontend site resolver** to include new domain
4. **Verify `site_id` in JWT** for all authenticated users
5. **Monitor logs closely** for the first 48 hours

### Files Modified Per Site

- `sites` table (1 new row)
- `src/lib/site-resolver.ts` (add domain mapping)
- DNS records (CNAME for domain)
- Cloudflare Pages custom domain (add domain)

### No Changes Needed

- ✅ Edge Functions (already use shared auth helpers)
- ✅ RLS Policies (already enforce `site_id`)
- ✅ Mobile apps (use same auth flow)
- ✅ Database schema (already has `site_id` columns)

---

## Next Steps

After successfully onboarding your first new site:

1. **Document site-specific customizations** in a new markdown file
2. **Create runbook** for common operations (user management, data export)
3. **Set up automated backups** per site if needed
4. **Plan for next site** using this same process

---

**Questions?** Review the troubleshooting section or check:
- `docs/EDGE_FUNCTION_MULTI_SITE_MIGRATION.md`
- `docs/FRONTEND_MULTI_SITE_MIGRATION.md`
- `Database_Migration.md`

