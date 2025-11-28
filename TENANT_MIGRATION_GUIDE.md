# Pearson Media Multi-Tenant Database Migration Guide

**Document Version:** 1.0
**Last Updated:** 2025-11-28
**Target Audience:** Development teams migrating projects to the unified Pearson Media database

---

## Executive Summary

This document provides everything you need to migrate your project to the **Pearson Media unified multi-tenant database**. The central database (formerly Build-Desk) now hosts all Pearson Media products with complete data isolation between tenants.

### What This Migration Achieves

- **80% cost reduction** - One Supabase project instead of 10+
- **Complete data isolation** - Two-layer security (site + company)
- **Shared infrastructure** - Reuse Auth, Edge Functions, Storage
- **Unified management** - One dashboard for all products

### Key Architecture Change

```
BEFORE (Current):                    AFTER (Multi-Tenant):
┌──────────────┐                    ┌───────────────────────────────────┐
│ Your Project │                    │    Unified Supabase Project       │
│   Supabase   │                    ├───────────────────────────────────┤
│  (separate)  │        ───>        │ Sites Table                       │
└──────────────┘                    │ ├─ builddesk (Build-Desk)         │
┌──────────────┐                    │ ├─ realestate (RealEstate Bio)    │
│ Build-Desk   │                    │ ├─ salonpros (SalonPros Bio)      │
│   Supabase   │        ───>        │ ├─ yoursite  (Your Project)       │
└──────────────┘                    │ └─ ...more sites                  │
┌──────────────┐                    ├───────────────────────────────────┤
│ RealEstate   │                    │ All Tables Have site_id Column    │
│   Supabase   │        ───>        │ RLS Enforces Site Isolation       │
└──────────────┘                    │ Shared Edge Functions             │
                                    └───────────────────────────────────┘
```

---

## Table of Contents

1. [How It Works](#1-how-it-works)
2. [Before You Begin](#2-before-you-begin)
3. [Database Architecture](#3-database-architecture)
4. [Authentication & Site Resolution](#4-authentication--site-resolution)
5. [Data Isolation Model](#5-data-isolation-model)
6. [Migration Steps](#6-migration-steps)
7. [Frontend Integration](#7-frontend-integration)
8. [Edge Function Integration](#8-edge-function-integration)
9. [Shared vs. Site-Specific Tables](#9-shared-vs-site-specific-tables)
10. [Testing Your Migration](#10-testing-your-migration)
11. [Going Live](#11-going-live)
12. [Troubleshooting](#12-troubleshooting)
13. [AI Agent Instructions](#13-ai-agent-instructions)
14. [Appendix: Quick Reference](#appendix-quick-reference)

---

## 1. How It Works

### The `sites` Table

Every Pearson Media product gets a row in the `sites` table:

```sql
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,           -- 'builddesk', 'realestate', 'yoursite'
  name TEXT NOT NULL,                 -- 'Build-Desk', 'RealEstate Bio'
  domain TEXT NOT NULL,               -- 'build-desk.com', 'realestatebio.com'
  additional_domains TEXT[],          -- ['www.build-desk.com', 'staging.build-desk.com']
  description TEXT,
  industry TEXT,
  is_active BOOLEAN DEFAULT true,
  is_production BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}'::jsonb,   -- branding, features, limits
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Two-Layer Isolation

Data is protected by **two layers**:

```
Layer 1: Site Isolation
  └─ site_id = auth.current_site_id()    ← User can only see their site's data

      Layer 2: Company Isolation (existing)
        └─ company_id IN (user's companies) ← User can only see their company's data
```

### Authentication Flow

```
1. User visits domain (e.g., yoursite.com)
2. Frontend resolves domain → site_key ('yoursite')
3. Frontend queries sites table → site_id (UUID)
4. User logs in → site_id added to JWT metadata
5. All queries filter by site_id automatically
6. RLS enforces site_id = auth.current_site_id()
```

---

## 2. Before You Begin

### Prerequisites

- [ ] Access to your current Supabase project
- [ ] Supabase CLI installed (`npm install -g supabase`)
- [ ] Access to the unified Pearson Media Supabase project
- [ ] Database export from your current project
- [ ] Understanding of your current database schema

### Gather This Information

Fill out this template before starting:

```yaml
# Site Configuration
site_key: "yoursite"                    # lowercase, no spaces, unique identifier
site_name: "Your Site Name"
primary_domain: "yoursite.com"
additional_domains:
  - "www.yoursite.com"
  - "yoursite-staging.pearsonperformance.workers.dev"

# Branding
logo_url: "https://cdn.yoursite.com/logo.png"
primary_color: "#3B82F6"
secondary_color: "#1E293B"
favicon_url: "https://cdn.yoursite.com/favicon.ico"

# Features (which modules does your site use?)
enabled_features:
  crm: true/false
  projects: true/false
  financials: true/false
  gps_tracking: true/false
  time_tracking: true/false
  documents: true/false
  estimates: true/false
  invoicing: true/false

# Industry
industry: "real_estate" / "construction" / "salon" / "other"

# Current Database Info
source_project_url: "https://your-old-project.supabase.co"
```

### Export Your Data

```bash
# Export full database
pg_dump -h db.YOUR-OLD-PROJECT.supabase.co \
  -U postgres -d postgres \
  --data-only --column-inserts \
  -f your_site_data_export.sql

# Export schema (for reference)
pg_dump -h db.YOUR-OLD-PROJECT.supabase.co \
  -U postgres -d postgres \
  --schema-only \
  -f your_site_schema.sql
```

---

## 3. Database Architecture

### Core Tables (All Have site_id)

These tables are shared across all sites but isolated by `site_id`:

| Table | Purpose |
|-------|---------|
| `companies` | Company/business accounts |
| `user_profiles` | User accounts and roles |
| `profiles` | Extended user information |
| `projects` | Projects/jobs |
| `time_entries` | Time tracking entries |
| `financial_records` | Financial transactions |
| `documents` | File management |
| `expenses` | Expense records |
| `invoices` | Invoice records |
| `estimates` | Project estimates |
| `tasks` | Task management |
| `crm_contacts` | CRM contacts |
| `crm_leads` | Sales leads |
| `notifications` | User notifications |
| `audit_logs` | Activity audit trail |
| `crew_gps_checkins` | GPS/location tracking |
| `daily_reports` | Daily progress reports |
| `change_orders` | Change order management |

### Extended Tables (Also Have site_id)

| Table | Purpose |
|-------|---------|
| `project_templates` | Project templates |
| `estimate_templates` | Estimate templates |
| `daily_report_templates` | Report templates |
| `timesheet_approvals` | Approval workflows |
| `equipment_qr_codes` | Equipment tracking |
| `saved_filter_presets` | User preferences |
| `payments` | Payment records |
| `api_keys` | API key management |
| `webhooks` | Webhook subscriptions |
| `blog_posts` | Content management |
| `email_campaigns` | Marketing campaigns |

### Shared Tables (No site_id)

Some reference tables are shared globally:

- Lookup tables (states, countries, etc.)
- System configuration
- Global templates (if any)

---

## 4. Authentication & Site Resolution

### How Site ID Gets Into the JWT

When a user logs in, the frontend:

1. Resolves the current domain to a `site_key`
2. Queries the `sites` table to get the `site_id`
3. Includes `site_id` in the authentication request

```typescript
// During sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
  options: {
    data: {
      site_id: resolvedSiteId,  // ← This gets stored in user_metadata
    },
  },
});
```

### Extracting site_id from JWT

In Edge Functions and RLS policies:

```sql
-- Database helper function
CREATE OR REPLACE FUNCTION auth.current_site_id()
RETURNS UUID AS $$
BEGIN
  -- Try app_metadata first, then user_metadata
  RETURN COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'app_metadata')::json->>'site_id',
    (current_setting('request.jwt.claims', true)::json->>'user_metadata')::json->>'site_id'
  )::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;
```

```typescript
// In Edge Functions
const siteId = user.app_metadata?.site_id || user.user_metadata?.site_id;
if (!siteId) {
  return new Response('Missing site_id', { status: 403 });
}
```

---

## 5. Data Isolation Model

### RLS Policy Pattern

Every tenant-visible table has an RLS policy like this:

```sql
-- Example for projects table
CREATE POLICY "Users can view projects in their site"
  ON projects FOR SELECT
  USING (
    -- Layer 1: Site isolation
    site_id = auth.current_site_id()

    -- Layer 2: Company isolation (existing)
    AND company_id IN (
      SELECT company_id FROM user_profiles
      WHERE user_id = auth.uid()
    )
  );
```

### Query Pattern

All queries MUST include `site_id`:

```typescript
// ✅ CORRECT - Always filter by site_id
const { data } = await supabase
  .from('projects')
  .select('*')
  .eq('site_id', siteId)           // ← REQUIRED
  .eq('company_id', companyId);

// ❌ WRONG - Missing site_id filter
const { data } = await supabase
  .from('projects')
  .select('*')
  .eq('company_id', companyId);    // ← Could leak data!
```

### Service Role Key Warning

The service role key **bypasses RLS**. When using it, you MUST manually filter:

```typescript
// Using service role key - MUST filter manually!
const adminSupabase = createClient(url, serviceRoleKey);
const { data } = await adminSupabase
  .from('projects')
  .select('*')
  .eq('site_id', siteId);  // ← REQUIRED even with service role
```

---

## 6. Migration Steps

### Step 1: Create Your Site Record

Request that your site be added to the unified database:

```sql
-- This is run by the database admin
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
  'yoursite',
  'Your Site Name',
  'yoursite.com',
  ARRAY['www.yoursite.com', 'staging.yoursite.com'],
  'Description of your platform',
  'your_industry',
  TRUE,
  FALSE,  -- Set to TRUE when ready for production
  '{
    "branding": {
      "logo_url": "https://cdn.yoursite.com/logo.png",
      "primary_color": "#3B82F6",
      "secondary_color": "#1E293B",
      "favicon_url": "https://cdn.yoursite.com/favicon.ico"
    },
    "features": {
      "crm": true,
      "projects": true,
      "financials": true
    }
  }'::jsonb
) RETURNING id;  -- Save this ID!
```

### Step 2: Prepare Data Migration Script

Create a migration script that adds `site_id` to all your data:

```sql
-- Data Migration Template
DO $$
DECLARE
  v_site_id UUID := 'YOUR-SITE-ID-FROM-STEP-1';
BEGIN

  -- Migrate companies
  INSERT INTO companies (site_id, name, slug, email, phone, created_at)
  SELECT
    v_site_id,      -- Add site_id
    name,
    slug,
    email,
    phone,
    created_at
  FROM your_exported_companies;

  -- Migrate users (users must exist in auth.users first!)
  INSERT INTO user_profiles (id, site_id, company_id, email, role, created_at)
  SELECT
    auth_user_id,   -- Must match auth.users.id
    v_site_id,      -- Add site_id
    new_company_id, -- Mapped to new company
    email,
    role,
    created_at
  FROM your_exported_users;

  -- Migrate projects
  INSERT INTO projects (site_id, company_id, name, status, created_at)
  SELECT
    v_site_id,
    new_company_id,
    name,
    status,
    created_at
  FROM your_exported_projects;

  -- Continue for all tables...

END $$;
```

### Step 3: Map Old IDs to New IDs

Since you're inserting into an existing database, you need to track ID mappings:

```sql
-- Create temporary mapping tables
CREATE TEMP TABLE id_map_companies (
  old_id UUID,
  new_id UUID
);

CREATE TEMP TABLE id_map_users (
  old_id UUID,
  new_id UUID
);

-- During migration, populate mappings
WITH inserted AS (
  INSERT INTO companies (site_id, name, ...)
  SELECT v_site_id, old_name, ...
  FROM source_companies
  RETURNING id, name
)
INSERT INTO id_map_companies (old_id, new_id)
SELECT s.id, i.id
FROM source_companies s
JOIN inserted i ON i.name = s.name;
```

### Step 4: Migrate Auth Users

Auth users require special handling:

```typescript
// Option A: Invite users to re-register
// Users sign up fresh on the new domain

// Option B: Admin API migration (requires service role)
const { data: user } = await supabaseAdmin.auth.admin.createUser({
  email: 'user@example.com',
  email_confirm: true,
  user_metadata: {
    site_id: 'YOUR-SITE-ID',
    // ... other metadata
  },
});
```

### Step 5: Verify Migration

```sql
-- Check data counts
SELECT
  s.name as site,
  COUNT(DISTINCT c.id) as companies,
  COUNT(DISTINCT up.id) as users,
  COUNT(DISTINCT p.id) as projects
FROM sites s
LEFT JOIN companies c ON c.site_id = s.id
LEFT JOIN user_profiles up ON up.site_id = s.id
LEFT JOIN projects p ON p.site_id = s.id
WHERE s.key = 'yoursite'
GROUP BY s.name;

-- Check for NULL site_id (should be 0)
SELECT
  'companies' as table_name,
  COUNT(*) FILTER (WHERE site_id IS NULL) as missing_site_id
FROM companies WHERE site_id = 'YOUR-SITE-ID'
UNION ALL
SELECT 'projects', COUNT(*) FILTER (WHERE site_id IS NULL)
FROM projects WHERE site_id = 'YOUR-SITE-ID';
```

---

## 7. Frontend Integration

### Site Resolver

Create a site resolver to determine the current site:

```typescript
// src/lib/site-resolver.ts

export interface SiteConfig {
  id: string;
  key: string;
  name: string;
  domain: string;
  branding?: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
    favicon_url?: string;
  };
  features?: Record<string, boolean>;
}

// Map domains to site keys
const siteKeyMap: Record<string, string> = {
  // Build-Desk
  'build-desk.com': 'builddesk',
  'www.build-desk.com': 'builddesk',

  // Your Site - ADD YOUR DOMAINS HERE
  'yoursite.com': 'yoursite',
  'www.yoursite.com': 'yoursite',
  'yoursite-staging.pearsonperformance.workers.dev': 'yoursite',

  // Development
  'localhost': 'builddesk',  // or 'yoursite' for your development
};

export async function getSiteConfig(): Promise<SiteConfig | null> {
  const hostname = window.location.hostname;
  const siteKey = siteKeyMap[hostname];

  if (!siteKey) {
    console.error(`Unknown domain: ${hostname}`);
    return null;
  }

  // Fetch full config from database
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .eq('key', siteKey)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;
  return data as SiteConfig;
}

export async function getCurrentSiteId(): Promise<string | null> {
  const cached = localStorage.getItem('site_id');
  if (cached) return cached;

  const config = await getSiteConfig();
  if (config) {
    localStorage.setItem('site_id', config.id);
    return config.id;
  }
  return null;
}
```

### Auth Context Integration

Update your auth context to include `site_id`:

```typescript
// src/contexts/AuthContext.tsx

interface AuthContextType {
  user: User | null;
  session: Session | null;
  siteId: string | null;        // ← ADD THIS
  siteConfig: SiteConfig | null; // ← ADD THIS
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// In the provider:
const signIn = async (email: string, password: string) => {
  const currentSiteId = await getCurrentSiteId();
  if (!currentSiteId) {
    throw new Error('Unable to determine site');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: {
      data: { site_id: currentSiteId },  // ← Include site_id
    },
  });

  if (error) throw error;
};
```

### Query Hook Pattern

Create a site-aware query hook:

```typescript
// src/hooks/useSiteQuery.ts
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

export function useSiteQuery<T>(
  queryKey: string | unknown[],
  queryFn: (siteId: string) => Promise<{ data: T | null; error: any }>
) {
  const { siteId } = useAuth();

  return useQuery({
    queryKey: Array.isArray(queryKey) ? [...queryKey, siteId] : [queryKey, siteId],
    queryFn: async () => {
      if (!siteId) throw new Error('No site_id available');
      const { data, error } = await queryFn(siteId);
      if (error) throw error;
      return data;
    },
    enabled: !!siteId,
  });
}

// Usage:
export function useProjects() {
  return useSiteQuery('projects', async (siteId) => {
    return supabase
      .from('projects')
      .select('*')
      .eq('site_id', siteId)  // ← Always filter by site_id
      .order('created_at', { ascending: false });
  });
}
```

---

## 8. Edge Function Integration

### Shared Auth Helpers

Use the shared auth helpers in all Edge Functions:

```typescript
// supabase/functions/_shared/auth-helpers.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface AuthContext {
  user: any;
  siteId: string;
  supabase: SupabaseClient;
}

export async function initializeAuthContext(req: Request): Promise<AuthContext | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const siteId = user.app_metadata?.site_id || user.user_metadata?.site_id;
  if (!siteId) return null;

  return { user, siteId, supabase };
}

export function errorResponse(message: string, status: number = 400): Response {
  return new Response(
    JSON.stringify({ error: message, success: false }),
    { status, headers: { 'Content-Type': 'application/json' } }
  );
}

export function successResponse(data: any): Response {
  return new Response(
    JSON.stringify({ data, success: true }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
```

### Edge Function Pattern

All Edge Functions must follow this pattern:

```typescript
// supabase/functions/your-function/index.ts
import { initializeAuthContext, errorResponse, successResponse } from '../_shared/auth-helpers.ts';

Deno.serve(async (req) => {
  // 1. Initialize auth context (extracts site_id)
  const authContext = await initializeAuthContext(req);
  if (!authContext) {
    return errorResponse('Unauthorized', 401);
  }

  const { user, siteId, supabase } = authContext;

  try {
    // 2. Parse request
    const { projectId } = await req.json();

    // 3. ALL queries must include site_id filter
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('site_id', siteId)  // ← REQUIRED
      .single();

    if (error) throw error;
    if (!data) {
      return errorResponse('Not found', 404);
    }

    // 4. Return response
    return successResponse({ project: data });
  } catch (error) {
    console.error('Error:', error);
    return errorResponse(error.message, 500);
  }
});
```

---

## 9. Shared vs. Site-Specific Tables

### Tables That Get site_id

Any table where data "belongs to" a tenant must have `site_id`:

- User data (profiles, preferences)
- Business data (companies, projects, invoices)
- CRM data (contacts, leads, campaigns)
- Content (documents, blog posts)
- Activity (time entries, audit logs)

### Tables That DON'T Get site_id

Some tables remain global:

- **Lookup tables**: Countries, states, currencies
- **System tables**: Migrations, schema info
- **Shared templates**: If offering global templates

### Adding site_id to New Tables

When creating new tables, ALWAYS include site_id:

```sql
CREATE TABLE your_new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,  -- REQUIRED
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  -- ... other columns
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for performance
CREATE INDEX idx_your_new_table_site_company
  ON your_new_table(site_id, company_id);

-- Create RLS policy
ALTER TABLE your_new_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site isolation"
  ON your_new_table FOR ALL
  USING (
    site_id = auth.current_site_id()
    AND company_id IN (
      SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );
```

---

## 10. Testing Your Migration

### Test 1: Data Isolation

```sql
-- As user from YOUR site, try to access Build-Desk data
SET LOCAL request.jwt.claims TO '{"app_metadata": {"site_id": "YOUR-SITE-ID"}}';
SELECT * FROM projects WHERE site_id = 'BUILDDESK-SITE-ID';
-- Should return 0 rows
```

### Test 2: RLS Enforcement

```typescript
// Test that queries without site_id return nothing
const { data } = await supabase
  .from('projects')
  .select('*')
  .eq('company_id', someCompanyId);

// If RLS is working, this should return empty or error
// for companies not in the user's site
```

### Test 3: Edge Function Isolation

```bash
# Test that Edge Function rejects cross-site access
curl -X POST https://project.supabase.co/functions/v1/your-function \
  -H "Authorization: Bearer YOUR_SITE_JWT" \
  -d '{"projectId": "BUILDDESK_PROJECT_ID"}'

# Should return 404 or empty (not the actual project)
```

### Test 4: Frontend Isolation

1. Log in to your site (yoursite.com)
2. Verify `site_id` in localStorage
3. Navigate to list views
4. Confirm only your site's data appears
5. Check network requests include `site_id` filter

---

## 11. Going Live

### Pre-Launch Checklist

- [ ] Site record created in `sites` table
- [ ] All data migrated with correct `site_id`
- [ ] No NULL `site_id` values in your data
- [ ] Frontend site resolver updated
- [ ] Auth flow includes `site_id`
- [ ] All queries filter by `site_id`
- [ ] Edge Functions validated
- [ ] DNS configured (CNAME to Cloudflare Pages)
- [ ] SSL certificate provisioned
- [ ] Data isolation tested

### Launch Steps

1. **Update site record for production:**
```sql
UPDATE sites
SET is_production = TRUE
WHERE key = 'yoursite';
```

2. **Deploy frontend:**
```bash
npm run build
wrangler pages publish dist --project-name yoursite
```

3. **Configure custom domain in Cloudflare**

4. **Monitor for 24-48 hours:**
   - Check error logs for missing `site_id`
   - Verify no cross-site data access
   - Monitor query performance

---

## 12. Troubleshooting

### "Missing site_id in authentication"

**Cause:** User's JWT doesn't have `site_id`

**Fix:**
```typescript
// Force update user metadata
await supabase.auth.updateUser({
  data: { site_id: 'YOUR-SITE-ID' }
});

// Or have user re-authenticate
await supabase.auth.signOut();
// User logs in again
```

### User sees wrong site's data

**Cause:** User profile has wrong `site_id`

**Fix:**
```sql
UPDATE user_profiles
SET site_id = (SELECT id FROM sites WHERE key = 'yoursite')
WHERE email = 'user@example.com';
```

### Edge Function returns 403

**Cause:** `site_id` not in JWT or doesn't match

**Fix:**
```typescript
// Debug: Log the JWT contents
const { data: { user } } = await supabase.auth.getUser();
console.log('app_metadata:', user.app_metadata);
console.log('user_metadata:', user.user_metadata);
```

### Query returns empty unexpectedly

**Cause:** Missing `site_id` filter or wrong `site_id`

**Fix:**
```typescript
// Ensure site_id is correct
const { siteId } = useAuth();
console.log('Current siteId:', siteId);

// Verify query includes filter
const { data, error } = await supabase
  .from('projects')
  .select('*')
  .eq('site_id', siteId);  // Make sure this is included!

console.log('Query returned:', data?.length, 'rows');
```

---

## 13. AI Agent Instructions

When working with this multi-tenant codebase, AI agents should:

### Database Migrations

1. **ALWAYS include `site_id`** when creating new tables that store tenant data
2. **ALWAYS add RLS policies** that filter by `site_id`
3. **ALWAYS create indexes** on `site_id` and `(site_id, company_id)`
4. **Use the standard FK pattern:** `site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE`

### Edge Functions

1. **ALWAYS use the shared auth helpers** from `_shared/auth-helpers.ts`
2. **ALWAYS extract and validate `site_id`** before processing
3. **ALWAYS include `.eq('site_id', siteId)`** in all queries
4. **NEVER use service role key** without manual site filtering

### Frontend Code

1. **ALWAYS use `useSiteQuery`** or equivalent for data fetching
2. **ALWAYS include `site_id` in query keys** for proper caching
3. **ALWAYS get `siteId` from AuthContext** (never hardcode)
4. **ALWAYS include `site_id` in mutations**

### Testing

1. **ALWAYS test site isolation** when adding new features
2. **VERIFY RLS policies** for new tables
3. **CHECK for NULL site_id** in test data

See [MULTI_TENANT_AGENT_INSTRUCTIONS.md](./MULTI_TENANT_AGENT_INSTRUCTIONS.md) for a condensed version of these rules.

---

## Appendix: Quick Reference

### SQL Quick Reference

```sql
-- Get your site_id
SELECT id, key, name FROM sites WHERE key = 'yoursite';

-- Check data counts for your site
SELECT
  'companies' as table_name, COUNT(*) as count
FROM companies WHERE site_id = 'YOUR-SITE-ID'
UNION ALL
SELECT 'projects', COUNT(*) FROM projects WHERE site_id = 'YOUR-SITE-ID'
UNION ALL
SELECT 'users', COUNT(*) FROM user_profiles WHERE site_id = 'YOUR-SITE-ID';

-- Find rows missing site_id (should be 0)
SELECT id, name FROM companies WHERE site_id IS NULL;

-- Get user's site
SELECT up.email, s.key, s.name
FROM user_profiles up
JOIN sites s ON s.id = up.site_id
WHERE up.email = 'user@example.com';
```

### TypeScript Quick Reference

```typescript
// Get current site_id
const { siteId } = useAuth();

// Query with site filter
const { data } = await supabase
  .from('table')
  .select('*')
  .eq('site_id', siteId)
  .eq('company_id', companyId);

// Insert with site_id
const { data } = await supabase
  .from('table')
  .insert({
    site_id: siteId,  // ← REQUIRED
    company_id: companyId,
    ...otherFields
  });
```

### Edge Function Quick Reference

```typescript
import { initializeAuthContext, errorResponse, successResponse } from '../_shared/auth-helpers.ts';

Deno.serve(async (req) => {
  const authContext = await initializeAuthContext(req);
  if (!authContext) return errorResponse('Unauthorized', 401);

  const { siteId, supabase } = authContext;

  // All queries include site_id
  const { data } = await supabase
    .from('table')
    .select('*')
    .eq('site_id', siteId);

  return successResponse(data);
});
```

---

## Contact & Support

- **Master Documentation:** This file + docs/ folder
- **Technical Issues:** Create GitHub issue
- **Migration Help:** Contact Pearson Media DevOps

---

**Document maintained by Pearson Media Development Team**
**Last updated: 2025-11-28**
