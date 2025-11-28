Below is the **PRD-style document** you asked for.
It is written specifically for **Build-Desk.com**, using the real info from your CLAUDE.md file.
It describes exactly **how to transition Build-Desk to the new multi-tenant structure (Option A)** while keeping your current 482-table / 155-function setup stable.

This is structured like a clean product requirement doc, and cites your Build-Desk file as the source when referencing details.

---

# **PRD — Transition Plan for Build-Desk.com to Multi-Tenant Supabase Architecture (Option A)**

**Document Type:** Product Requirements Document
**Applies To:** Build-Desk.com platform
**Source:** BuildDesk reference file (CLAUDE.md)
**Goal:** Move Build-Desk from a single-tenant Supabase project into a **shared multi-tenant structure** so one Supabase instance can power all Pearson Media platforms.

---

# **1. Summary**

Build-Desk.com is a large system with:

- 482+ tables
- 155+ Edge Functions
- Hundreds of React domains and modules
- Full multi-role RBAC, GPS tracking, financial modules, CRM, mobile apps
- Complex RLS

The goal is to **transition Build-Desk to a shared multi-tenant system** that allows multiple Pearson Media products to run inside a single Supabase project.

Build-Desk becomes the “main project” that will hold all other platforms.
This gives the lowest cost and the strongest long-term structure.

---

# **2. Problem Statement**

Pearson Media currently maintains **10–11 separate Supabase projects**, each with its own:

- Database
- Auth
- Edge Functions
- Billing
- Storage
- Backups
- RLS rules

This creates:

- High cost
- Redundant logic
- Maintenance overhead
- Inconsistent security rules
- Hard-to-track deployments

We want one scalable project with **tenant isolation** inside the database.

---

# **3. Core Multi-Tenant Requirement**

### Build-Desk will shift from:

**company-based isolation → site-based isolation + company isolation inside each site.**

You already have company-level multi-tenancy (`companies`, `user_profiles`, etc.)

We add **one more layer above company: `site`**.

---

# **4. New High-Level Architecture**

## **4.1 New “sites” Table**

Every Pearson Media product (Build-Desk, RealEstate Bio, SalonPros Bio, etc.) gets a row.

### Table Structure

```
sites (
  id uuid primary key,
  key text unique,      -- "builddesk", "realestate", "salonpros"
  domain text,          -- the live domain for routing
  created_at timestamp
)
```

All future queries will join back to `site_id`.

---

# **5. Database Requirements**

### **5.1 Add `site_id` to all tenant-visible tables**

Tables such as:

- projects
- user_profiles
- companies
- documents
- tasks
- time_entries
- expenses
- invoices
- crm\_\*
- estimates
- gps tables
- audit tables
- notifications
- settings

Any table where a row “belongs” to an account must gain a `site_id`.

### **Important Note:**

You do **not** add `site_id` to core lookup tables or shared templates.

---

## **5.2 RLS Updates**

Every table with tenant-visible data must change from:

```
company_id IN (SELECT company_id... )
```

to:

```
site_id = auth.jwt()->>'site_id'
AND
company_id IN (SELECT company_id... )
```

This creates **two-layer isolation**:

1. User must belong to the correct Build-Desk site (or another Pearson platform site).
2. User must belong to the correct company inside that site.

---

# **6. Auth Requirements**

Build-Desk uses Supabase Auth for:

- Email/password
- OAuth
- SSO/SAML
- MFA

### New Requirement:

When users sign in, their session must include:

```
site_id
```

### Implementation Options

**Option A (recommended):** Attach `site_id` via redirect domain.
**Option B:** Write the site ID into user metadata after login.

Mobile apps (Capacitor + Expo) must also add this value during login.

---

# **7. Edge Function Requirements**

Build-Desk has 155+ edge functions:

- payments
- AI
- GPS
- analytics
- CRM
- documents
- scheduling
- blog/automation

### Each function must be updated to:

1. Extract `site_id` from the JWT
2. Apply `site_id` filtering on all queries
3. Reject any request missing a `site_id`

### Shared Functions

The following functions will become cross-product shared logic:

- Stripe
- Analytics
- AI
- Blog/SEO
- OCR
- GPS
- Public API

These functions must be made multi-tenant safe.

---

# **8. Frontend Requirements**

Build-Desk frontend is large (115+ component domains, 260+ pages).

### 8.1 Add `site_id` to the global auth context

`AuthContext.tsx`

### 8.2 Add a site-resolver on app load

Check domain:

```
build-desk.com → builddesk
realestatebio.com → realestate
salonpros.bio → salonpros
```

Set the correct `site_id`.

### 8.3 Update hooks and queries

All hooks that call Supabase must include `eq('site_id', SITE_ID)`.

### 8.4 Mobile apps must send the same `site_id`

Capacitor + Expo login uses the same process.

---

# **9. Storage Requirements**

Supabase Storage must shift to folder partitioning:

```
/site/{site_key}/company/{company_id}/documents
/site/{site_key}/media
/site/{site_key}/invoices
```

Shared global assets remain unchanged.

---

# **10. Migration Plan**

### **Phase 1 — Infrastructure Setup**

1. Create `sites` table
2. Create a row for Build-Desk
3. Add `site_id` to the Build-Desk companies and users
4. Add `site_id` to core tables (100+ tables)

### **Phase 2 — Update RLS**

All RLS policies switch to dual conditions:

- site isolation
- company isolation

### **Phase 3 — Edge Function Updates**

Update all 155 functions in batches by domain:

1. Auth/SSO
2. Payments
3. CRM
4. GPS
5. Documents
6. Financial
7. Projects
8. AI
9. Blog/SEO
10. Templates
11. Webhooks

### **Phase 4 — Frontend Updates**

1. Inject site_id into AuthContext
2. Add domain → site resolver
3. Update all query hooks
4. Update mobile apps
5. Update Expo config
6. Update Capacitor config

### **Phase 5 — Data Migration for Other Platforms**

For each new Pearson site:

1. Create a site row
2. Export data from old project
3. Import into Build-Desk shared project
4. Backfill `site_id`
5. Update frontend config
6. Test and validate
7. Cut over traffic

### **Phase 6 — Monitoring**

1. Sentry
2. PostHog
3. Supabase logs
4. Lighthouse CI

---

# **11. Risk Analysis**

### Risks

- RLS mistakes could leak data
- Edge Functions missing site_id checks
- Migration errors across 482 tables
- Mobile app caches might hold old auth
- Stripe webhooks could mix data

### Mitigations

- Automated RLS scanning
- Write tests for tenant rules
- Stage environment with production copy
- Feature flags per site
- Version bump mobile apps
- Wrap all queries in site filters

---

# **12. Success Metrics**

- All apps run on one Supabase project
- Zero cross-tenant data leaks
- Stripe billing isolated per tenant
- Build-Desk performance remains fast
- Mobile apps authenticate correctly
- All Edge Functions return site-filtered results
- Cost drops by ~80% (fewer Supabase projects needed)

---

# **13. Deliverables**

### Technical Deliverables

- `sites` table + migration
- `site_id` column for all tenant tables
- Updated RLS
- Updated 155 Edge Functions
- Updated Supabase types
- Updated React contexts
- Updated mobile login flow
- Storage folder structure
- Migration scripts
- Rollback plan

### Documentation Deliverables

- Internal dev guide
- New DB ERD
- Tenant isolation doc
- Domain routing table
- Edge Function matrix
- Permissions and roles doc

---

# **14. Next Steps**

If you want, I can generate:

- The SQL migration set
- The RLS templates
- A full ERD for the new structure
- The timeline with sprint breakdown
- Edge function batch update plan
- Testing plan
- A migration script for your top 50 tables
- A domain → site routing map
- Mobile changes needed for Capacitor and Expo

Just tell me which one you want next.
