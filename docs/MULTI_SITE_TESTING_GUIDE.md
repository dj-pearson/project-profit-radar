# Multi-Site Architecture Testing & Validation Guide

## Overview

This guide provides comprehensive testing procedures to validate the multi-site architecture migration. Use this to ensure complete data isolation and system integrity before going to production.

---

## Table of Contents

1. [Pre-Migration Testing](#1-pre-migration-testing)
2. [Database Migration Validation](#2-database-migration-validation)
3. [RLS Policy Testing](#3-rls-policy-testing)
4. [Edge Function Testing](#4-edge-function-testing)
5. [Frontend Testing](#5-frontend-testing)
6. [Integration Testing](#6-integration-testing)
7. [Performance Testing](#7-performance-testing)
8. [Security Audit](#8-security-audit)
9. [Production Readiness Checklist](#9-production-readiness-checklist)

---

## 1. Pre-Migration Testing

### 1.1 Backup Current Database

```bash
# Create complete backup before migration
pg_dump -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  --clean \
  --if-exists \
  -f pre_migration_backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup file
ls -lh pre_migration_backup_*.sql
```

### 1.2 Document Current State

```sql
-- Count all tables
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';

-- Count all rows per major table
SELECT 'companies' as table_name, COUNT(*) as row_count FROM companies
UNION ALL
SELECT 'user_profiles', COUNT(*) FROM user_profiles
UNION ALL
SELECT 'projects', COUNT(*) FROM projects
UNION ALL
SELECT 'time_entries', COUNT(*) FROM time_entries
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices;

-- Save results for comparison after migration
```

### 1.3 Test Environment Setup

```bash
# Create staging environment
supabase projects create staging-multi-site --db-password YOUR_PASSWORD

# Run migrations on staging first
supabase db push --project-ref staging-project-ref
```

---

## 2. Database Migration Validation

### 2.1 Verify Sites Table

```sql
-- Test: Sites table exists and has Build-Desk site
SELECT * FROM sites WHERE key = 'builddesk';

-- Expected: 1 row with Build-Desk configuration
-- ✓ id is UUID
-- ✓ key = 'builddesk'
-- ✓ domain = 'build-desk.com'
-- ✓ is_active = true
```

### 2.2 Verify site_id Columns Added

```sql
-- Test: Count tables with site_id column
SELECT COUNT(*) as tables_with_site_id
FROM information_schema.columns
WHERE column_name = 'site_id'
AND table_schema = 'public';

-- Expected: 20+ tables (all tenant-visible tables)

-- Test: List all tables with site_id
SELECT table_name
FROM information_schema.columns
WHERE column_name = 'site_id'
AND table_schema = 'public'
ORDER BY table_name;
```

### 2.3 Verify site_id Backfilled

```sql
-- Test: All rows have site_id set
SELECT 'companies' as table_name,
       COUNT(*) as total_rows,
       COUNT(site_id) as rows_with_site_id,
       COUNT(*) - COUNT(site_id) as missing_site_id
FROM companies
UNION ALL
SELECT 'projects',
       COUNT(*),
       COUNT(site_id),
       COUNT(*) - COUNT(site_id)
FROM projects
UNION ALL
SELECT 'user_profiles',
       COUNT(*),
       COUNT(site_id),
       COUNT(*) - COUNT(site_id)
FROM user_profiles;

-- Expected: missing_site_id = 0 for all tables
```

### 2.4 Verify Foreign Key Constraints

```sql
-- Test: site_id foreign keys exist
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND kcu.column_name = 'site_id';

-- Expected: Multiple rows showing site_id → sites(id) foreign keys
```

### 2.5 Verify Indexes

```sql
-- Test: site_id indexes exist
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE indexdef LIKE '%site_id%'
AND schemaname = 'public'
ORDER BY tablename;

-- Expected: Index on site_id for all major tables
```

---

## 3. RLS Policy Testing

### 3.1 Test auth.current_site_id() Function

```sql
-- Test: Function exists
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'current_site_id';

-- Test: Function returns correct site_id
-- (Run as authenticated user with site_id in JWT)
SELECT auth.current_site_id();

-- Expected: Returns UUID matching user's site
```

### 3.2 Test Site Isolation in RLS Policies

**Test Setup:**

```sql
-- Create test users and data for two different sites
-- Site A (Build-Desk)
INSERT INTO sites (key, name, domain, is_active) 
VALUES ('test_site_a', 'Test Site A', 'test-a.com', true) 
RETURNING id;  -- Save as site_a_id

-- Site B (Real Estate)
INSERT INTO sites (key, name, domain, is_active) 
VALUES ('test_site_b', 'Test Site B', 'test-b.com', true) 
RETURNING id;  -- Save as site_b_id

-- Company for Site A
INSERT INTO companies (site_id, name, slug)
VALUES ('site_a_id', 'Company A', 'company-a')
RETURNING id;  -- Save as company_a_id

-- Company for Site B
INSERT INTO companies (site_id, name, slug)
VALUES ('site_b_id', 'Company B', 'company-b')
RETURNING id;  -- Save as company_b_id

-- Project for Site A
INSERT INTO projects (site_id, company_id, name)
VALUES ('site_a_id', 'company_a_id', 'Project A');

-- Project for Site B
INSERT INTO projects (site_id, company_id, name)
VALUES ('site_b_id', 'company_b_id', 'Project B');
```

**Test Execution:**

```sql
-- As user from Site A, try to access Site B data
-- This should return 0 rows or error
SET LOCAL role TO 'authenticated';
SET LOCAL request.jwt.claims TO '{"sub": "site-a-user-id", "app_metadata": {"site_id": "site_a_id"}}';

SELECT * FROM projects WHERE site_id = 'site_b_id';  -- Should return 0 rows

-- Clean up test data
DELETE FROM projects WHERE name IN ('Project A', 'Project B');
DELETE FROM companies WHERE slug IN ('company-a', 'company-b');
DELETE FROM sites WHERE key IN ('test_site_a', 'test_site_b');
```

### 3.3 Test Company-Level Isolation Within Site

```sql
-- Test: User can only see their company's data within their site
-- (Already enforced by existing RLS, but verify it still works)

-- As user from Company A in Site 1
-- Should NOT see Company B's data (even in same site)
SELECT * FROM projects 
WHERE site_id = 'site_1_id' 
AND company_id = 'company_b_id';  -- Should return 0 rows via RLS
```

### 3.4 Test RLS on All Major Tables

For each table with site_id, verify RLS enforces site isolation:

```sql
-- Companies
SELECT COUNT(*) FROM companies WHERE site_id != auth.current_site_id();  -- Should return 0

-- Projects
SELECT COUNT(*) FROM projects WHERE site_id != auth.current_site_id();  -- Should return 0

-- Documents
SELECT COUNT(*) FROM documents WHERE site_id != auth.current_site_id();  -- Should return 0

-- Invoices
SELECT COUNT(*) FROM invoices WHERE site_id != auth.current_site_id();  -- Should return 0

-- CRM Contacts
SELECT COUNT(*) FROM crm_contacts WHERE site_id != auth.current_site_id();  -- Should return 0
```

---

## 4. Edge Function Testing

### 4.1 Test Auth Helper Functions

```bash
# Test _shared/auth-helpers.ts locally
cd supabase/functions

# Start local functions
supabase functions serve

# Test initializeAuthContext
curl -X POST http://localhost:54321/functions/v1/test-auth \
  -H "Authorization: Bearer eyJ..." \
  -d '{}'
```

### 4.2 Test Site Isolation in Edge Functions

Create a test function:

```typescript
// supabase/functions/test-site-isolation/index.ts
import { withAuth, successResponse } from '../_shared/auth-helpers.ts';

Deno.serve(withAuth(async (req, authContext) => {
  const { siteId, supabase } = authContext;
  
  // Query projects for current site
  const { data: siteProjects, error } = await supabase
    .from('projects')
    .select('id, name, site_id')
    .eq('site_id', siteId);
  
  return successResponse({
    siteId,
    projectCount: siteProjects?.length || 0,
    projects: siteProjects,
  });
}));
```

**Test:**

```bash
# Deploy test function
supabase functions deploy test-site-isolation

# Test with Site A user
curl -X POST https://your-project.supabase.co/functions/v1/test-site-isolation \
  -H "Authorization: Bearer SITE-A-JWT"

# Expected: Returns only Site A projects

# Test with Site B user
curl -X POST https://your-project.supabase.co/functions/v1/test-site-isolation \
  -H "Authorization: Bearer SITE-B-JWT"

# Expected: Returns only Site B projects (different set)
```

### 4.3 Test Missing site_id Handling

```bash
# Test with JWT that has no site_id
curl -X POST https://your-project.supabase.co/functions/v1/test-site-isolation \
  -H "Authorization: Bearer JWT-WITHOUT-SITE-ID"

# Expected: 403 Forbidden with error message
```

### 4.4 Test All Critical Edge Functions

Update and test each function category:

- [ ] Authentication functions (set site_id in JWT)
- [ ] Payment/Stripe webhooks (validate site_id)
- [ ] CRM functions (filter by site_id)
- [ ] Project functions (filter by site_id)
- [ ] GPS/tracking functions (filter by site_id)

---

## 5. Frontend Testing

### 5.1 Test Site Resolution

```typescript
// Test site-resolver.ts
import { getSiteConfig, getCurrentSiteId } from '@/lib/site-resolver';

describe('Site Resolver', () => {
  it('should resolve builddesk domain', async () => {
    // Mock window.location.hostname
    Object.defineProperty(window, 'location', {
      value: { hostname: 'build-desk.com' },
    });
    
    const config = await getSiteConfig();
    expect(config?.key).toBe('builddesk');
  });
  
  it('should return null for unknown domain', async () => {
    Object.defineProperty(window, 'location', {
      value: { hostname: 'unknown-domain.com' },
    });
    
    const config = await getSiteConfig();
    expect(config).toBeNull();
  });
});
```

### 5.2 Test AuthContext Integration

```typescript
// Test AuthContext includes site_id
import { renderHook } from '@testing-library/react';
import { useAuth } from '@/contexts/AuthContext';

describe('AuthContext', () => {
  it('should provide siteId after login', async () => {
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      await result.current.signIn('test@builddesk.com', 'password');
    });
    
    expect(result.current.siteId).toBeTruthy();
    expect(result.current.siteConfig?.key).toBe('builddesk');
  });
});
```

### 5.3 Test Query Hooks Include site_id

```typescript
// Test useProjects hook
import { renderHook, waitFor } from '@testing-library/react';
import { useProjects } from '@/hooks/useProjects';

describe('useProjects', () => {
  it('should filter projects by site_id', async () => {
    const { result } = renderHook(() => useProjects());
    
    await waitFor(() => expect(result.current.data).toBeDefined());
    
    // Verify all returned projects have correct site_id
    const allMatchSite = result.current.data?.every(
      project => project.site_id === result.current.siteId
    );
    expect(allMatchSite).toBe(true);
  });
});
```

### 5.4 Manual Frontend Testing

- [ ] Visit build-desk.com → Sign in → Verify site_id in localStorage
- [ ] Create project → Verify site_id in database
- [ ] Query projects → Verify only current site's projects returned
- [ ] Check network requests → Verify site_id in query params
- [ ] Check console → No site_id errors

---

## 6. Integration Testing

### 6.1 End-to-End User Flow Test

```typescript
// tests/e2e/multi-site.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Multi-Site Isolation', () => {
  test('Site A user cannot see Site B data', async ({ page }) => {
    // Login as Site A user
    await page.goto('https://build-desk.com/login');
    await page.fill('[name="email"]', 'usera@builddesk.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // Navigate to projects
    await page.goto('https://build-desk.com/projects');
    
    // Get all project names
    const projectNames = await page.locator('[data-testid="project-name"]').allTextContents();
    
    // Verify no Site B projects are visible
    expect(projectNames).not.toContain('Site B Project');
  });
  
  test('Site B user cannot see Site A data', async ({ page }) => {
    // Login as Site B user
    await page.goto('https://realestatebio.com/login');
    await page.fill('[name="email"]', 'userb@realestatebio.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // Navigate to projects
    await page.goto('https://realestatebio.com/projects');
    
    // Get all project names
    const projectNames = await page.locator('[data-testid="project-name"]').allTextContents();
    
    // Verify no Site A projects are visible
    expect(projectNames).not.toContain('Site A Project');
  });
});
```

### 6.2 API Integration Test

```typescript
// Test API endpoints respect site isolation
describe('API Site Isolation', () => {
  it('should only return site-specific data from API', async () => {
    const siteAToken = 'JWT-FOR-SITE-A-USER';
    const siteBProjectId = 'project-id-from-site-b';
    
    const response = await fetch(
      `https://your-project.supabase.co/rest/v1/projects?id=eq.${siteBProjectId}`,
      {
        headers: {
          'Authorization': `Bearer ${siteAToken}`,
          'apikey': 'YOUR-ANON-KEY',
        },
      }
    );
    
    const data = await response.json();
    
    // Should return empty array (RLS filtered it out)
    expect(data).toEqual([]);
  });
});
```

---

## 7. Performance Testing

### 7.1 Query Performance with site_id

```sql
-- Test: Query performance with site_id filter
EXPLAIN ANALYZE
SELECT * FROM projects
WHERE site_id = 'builddesk-site-id'
AND company_id = 'some-company-id';

-- Expected: Uses indexes efficiently (idx_projects_site_company)
-- Execution time should be < 10ms for typical dataset
```

### 7.2 Bulk Operation Performance

```sql
-- Test: Bulk insert with site_id
EXPLAIN ANALYZE
INSERT INTO projects (site_id, company_id, name)
SELECT
  'builddesk-site-id',
  'company-id',
  'Test Project ' || generate_series(1, 1000);

-- Expected: < 1 second for 1000 rows
```

### 7.3 RLS Performance Impact

```sql
-- Compare performance with and without RLS

-- Disable RLS temporarily (for testing only)
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- Time query without RLS
EXPLAIN ANALYZE
SELECT * FROM projects LIMIT 100;

-- Re-enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Time query with RLS
EXPLAIN ANALYZE
SELECT * FROM projects LIMIT 100;

-- Expected: < 20% performance difference
```

---

## 8. Security Audit

### 8.1 SQL Injection Prevention

```sql
-- Test: site_id parameter escaping in Edge Functions
-- Attempt SQL injection via site_id (should fail)

-- In Edge Function test:
const maliciousSiteId = "'; DROP TABLE projects; --";
const { data, error } = await supabase
  .from('projects')
  .select('*')
  .eq('site_id', maliciousSiteId);

-- Expected: No SQL injection, query returns empty or error
```

### 8.2 Authentication Bypass Prevention

```bash
# Test: Accessing API without JWT
curl -X GET https://your-project.supabase.co/rest/v1/projects

# Expected: 401 Unauthorized

# Test: Accessing Edge Function without JWT
curl -X POST https://your-project.supabase.co/functions/v1/your-function

# Expected: 401 Unauthorized
```

### 8.3 Cross-Site Request Forgery (CSRF) Prevention

```typescript
// Test CSRF protection in Edge Functions
// Verify CORS headers are set correctly
const response = await fetch('https://your-project.supabase.co/functions/v1/your-function', {
  method: 'OPTIONS',
});

const corsHeaders = {
  'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
  'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
};

// Expected: CORS headers present and configured correctly
```

### 8.4 Sensitive Data Exposure

```sql
-- Test: Verify RLS prevents exposure of sensitive data

-- As user from Site A, attempt to query Site B users
SELECT email, phone FROM user_profiles WHERE site_id = 'site-b-id';

-- Expected: 0 rows (RLS blocks access)
```

---

## 9. Production Readiness Checklist

### 9.1 Database Checklist

- [ ] All migrations applied successfully
- [ ] All tables have `site_id` column
- [ ] All `site_id` columns are NOT NULL
- [ ] Foreign key constraints on `site_id` exist
- [ ] Indexes on `site_id` exist
- [ ] RLS policies updated for all tables
- [ ] `auth.current_site_id()` function works correctly
- [ ] No data missing `site_id`
- [ ] Backup created before migration
- [ ] Rollback plan documented

### 9.2 Edge Functions Checklist

- [ ] All functions use `_shared/auth-helpers.ts`
- [ ] All functions extract `site_id` from JWT
- [ ] All functions filter queries by `site_id`
- [ ] All functions reject requests without `site_id`
- [ ] Authentication functions set `site_id` in JWT
- [ ] Payment/Stripe functions validate `site_id`
- [ ] Test function deployed and working
- [ ] Error handling includes site context
- [ ] Logging includes `site_id`

### 9.3 Frontend Checklist

- [ ] `site-resolver.ts` created and working
- [ ] `AuthContext` provides `siteId` and `siteConfig`
- [ ] All hooks filter by `site_id`
- [ ] Protected routes check for `site_id`
- [ ] Site-specific branding applied
- [ ] Mobile apps include `site_id` in auth
- [ ] Domain mapping configured
- [ ] Local testing with multiple domains works
- [ ] No hardcoded site references

### 9.4 Testing Checklist

- [ ] Database migration validated
- [ ] RLS policies tested
- [ ] Edge functions tested
- [ ] Frontend tested
- [ ] Integration tests passing
- [ ] Performance tests acceptable
- [ ] Security audit completed
- [ ] E2E tests passing
- [ ] Manual testing completed

### 9.5 Documentation Checklist

- [ ] Migration guide completed
- [ ] Edge Function guide completed
- [ ] Frontend guide completed
- [ ] Onboarding guide completed
- [ ] Testing guide completed (this document)
- [ ] Runbook for common operations
- [ ] Troubleshooting guide
- [ ] Architecture diagrams updated

### 9.6 Monitoring & Observability

- [ ] Sentry configured with `site_id` tags
- [ ] PostHog tracking `site_id` in events
- [ ] Database query logs include `site_id`
- [ ] Edge Function logs include `site_id`
- [ ] Alerts configured for missing `site_id` errors
- [ ] Dashboards show metrics per site

---

## Test Execution Record

Use this table to track test execution:

| Test Category | Status | Date | Tester | Notes |
|--------------|--------|------|---------|-------|
| Pre-Migration | ⏳ | | | |
| Database Migration | ⏳ | | | |
| RLS Policies | ⏳ | | | |
| Edge Functions | ⏳ | | | |
| Frontend | ⏳ | | | |
| Integration | ⏳ | | | |
| Performance | ⏳ | | | |
| Security | ⏳ | | | |
| Production Readiness | ⏳ | | | |

**Legend:**
- ⏳ Pending
- ✅ Passed
- ❌ Failed
- ⚠️ Passed with issues

---

## Summary

### Critical Tests (Must Pass Before Production)

1. ✅ All tables have `site_id` with no NULL values
2. ✅ RLS policies enforce site isolation
3. ✅ Edge Functions filter by `site_id`
4. ✅ Frontend includes `site_id` in all queries
5. ✅ Cross-site data access returns empty results
6. ✅ Authentication sets `site_id` in JWT
7. ✅ Backup and rollback plan in place

### Recommended Tests

1. ⭐ Performance tests show acceptable query times
2. ⭐ Security audit finds no vulnerabilities
3. ⭐ E2E tests pass for all user flows
4. ⭐ Mobile apps authenticate correctly
5. ⭐ Monitoring and logging configured

---

**Ready for Production?** Only proceed if all critical tests pass. Document any issues or deviations from expected behavior.

