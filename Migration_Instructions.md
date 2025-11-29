Below is a **PRD-style document** that lays out a clean, safe, and complete plan for migrating Edge Functions from all your separate Supabase projects into the **single Build-Desk shared project**, including:

- What the change is
- Why it’s being done
- How `site_id` support is added
- How each function is audited
- How to perform the first migration run safely
- How to avoid breaking existing production systems

This PRD matches your Build-Desk architecture from the CLAUDE.md file.
(No banned words, plain writing.)

---

# **PRD — Migration of All Supabase Edge Functions to Shared Build-Desk Project**

## **Document Type**

Product Requirements Document

## **Project**

Pearson Media — Unified Supabase Platform

## **Component**

Edge Functions Migration + Multi-Tenant Isolation

## **Version**

Draft v1.0

---

# **1. Goal**

Move all Edge Functions from all Pearson Media Supabase projects into one main project (Build-Desk).
During the transition, each function gains support for `site_id` so the shared project can run many websites without mixing data.

This is the first major step toward making Build-Desk the central system for all Pearson Media platforms.

---

# **2. Problem**

Pearson Media currently has many Supabase projects.
Each has:

- Its own Edge Functions
- Its own storage
- Its own tables
- Its own auth setup
- Its own hosting and deploys

This layout increases:

- cost
- upkeep
- risk of code drift
- risk of updates getting applied to some sites but not others

It also blocks your move to a unified multi-tenant system.

---

# **3. What Will Change**

### **Before**

Each website has its own:

- Supabase project
- Edge Functions
- Storage
- Database

Functions cannot talk to each other.

### **After**

Build-Desk becomes the main Supabase project.
All Edge Functions from the other projects get merged into this project.
Each function will:

- check the logged-in user
- read the `site_id`
- run its logic only for that site
- never touch another site’s data
- always filter queries by `site_id`

This allows a single shared project to safely run many websites.

---

# **4. New Required Behavior for All Functions**

Every Edge Function will follow the same pattern:

### **4.1 Must identify the site**

Either from:

- JWT (`user.user_metadata.site_id`)
- or the request domain for public functions

### **4.2 Must filter all queries by site**

Every `select`, `insert`, `update`, and `delete` must include:

```
.eq('site_id', siteId)
```

### **4.3 Must reject calls with no `site_id`**

If a request comes in without a site context, the function returns:

```
400 Bad Request — Missing site_id
```

This protects all sites in the shared project.

---

# **5. Migration Plan Overview**

The migration is done in four large steps:

1. **Extract functions from all old projects**
2. **Group and organize functions**
3. **Add `site_id` isolation logic**
4. **Deploy functions in controlled batches**

The process repeats for each platform until every function lives in Build-Desk.

---

# **6. Detailed Steps**

## **6.1 Extract Functions From Each Project**

For each production project, run:

```
supabase functions pull --all
```

Place each project in its own folder:

```
/imports/
    /realestate/
    /salonpros/
    /fitness/
    /site4/
    /site5/
```

This prevents confusion.

---

## **6.2 Audit Every Function**

Each function must be checked for:

- imports
- table names
- storage bucket paths
- direct SQL
- custom policies
- fetch requests
- hardcoded table names
- unused code
- logging
- service keys being used incorrectly

This step helps spot problems early.

---

## **6.3 Resolve Naming Conflicts**

Two projects may have function names like:

- `upload_image`
- `send_email`
- `save_profile`

To avoid conflicts:

- If logic is the same → merge into **one shared function**
- If logic is different → rename:

```
re_upload_image
sa_upload_image
```

This keeps functions stable.

---

## **6.4 Add `site_id` Logic**

Add this to the top of every function:

```ts
const token = req.headers.get("Authorization")?.replace("Bearer ", "");
const { data: user } = await supabase.auth.getUser(token);

if (!user) {
  return new Response("Unauthorized", { status: 401 });
}

const siteId = user.user_metadata?.site_id;

if (!siteId) {
  return new Response("Missing site_id", { status: 400 });
}
```

For public functions:

```ts
const host = req.headers.get("host");
const { data: site } = await supabase
  .from("sites")
  .select("*")
  .eq("domain", host)
  .single();

const siteId = site?.id;

if (!siteId) return new Response("Unknown site", { status: 400 });
```

---

## **6.5 Add `site_id` Filter to All Queries**

Find every query like:

```ts
supabase.from("projects").select("*");
```

Change to:

```ts
supabase.from("projects").select("*").eq("site_id", siteId);
```

Repeat for:

- selects
- inserts
- updates
- deletes
- count queries
- filters
- storage operations

This is required for tenant safety.

---

## **6.6 Remove Old Project Secrets or Hardcoded Keys**

Some functions may be using:

- service keys
- old URLs
- old project identifiers
- old Storage paths

All these must be changed to the shared project settings.

---

## **6.7 Deploy Functions in Batches**

You will not deploy all functions at once.

Use groups:

1. **Auth support**
2. **Billing / Stripe**
3. **Media**
4. **Documents**
5. **CRM**
6. **Projects**
7. **Scheduling**
8. **GPS**
9. **Invoices**
10. **AI functions**
11. **SEO + blog**
12. **Automation**
13. **Integration hooks (QuickBooks, Outlook, Google Calendar)**

After each batch:

- test
- verify `site_id` checks
- check logs
- confirm no cross-site data

This lowers the risk.

---

## **6.8 Update All Frontend Callers**

Update all frontends (React, mobile, Capacitor, Expo) to send:

```
Authorization: Bearer <JWT>
```

And also send:

```
x-site-id: <site_id>
```

This makes debugging easier.

---

## **6.9 Freeze Changes on Old Projects**

Once a site has its functions live in the shared project, put its old Supabase project in read-only mode:

- Disable deploys
- Stop new triggers
- Stop new functions
- Stop schema changes

This avoids drift.

---

## **6.10 Remove the Old Project When Stable**

Once a site is stable on Build-Desk:

- Check error logs
- Check billing logs
- Check storage paths
- Confirm migrations
- Archive old project
- Delete old project

This lowers cost and simplifies billing.

---

# **7. Success Measures**

The migration is considered successful when:

- All Edge Functions run inside Build-Desk
- The logic works per site using `site_id`
- No data leaks between sites
- All frontends can call the new functions
- Billing logic runs in the shared project
- AI, GPS, CRM, storage, and media functions behave the same
- Old projects can be removed safely

---

# **8. First-Run Safety Plan**

### Before touching production:

1. Clone the Build-Desk project from a backup
2. Load one small site into the clone
3. Deploy its functions only
4. Test:

   - login
   - billing
   - storage
   - AI
   - PDFs
   - schedules
   - GPS tracking

5. Validate RLS
6. Validate logs
7. Validate site isolation
8. Fix issues
9. Repeat with the next site
10. Once stable → deploy batch to real Build-Desk

This prevents damage.

---

# **9. Backout Plan**

If anything fails:

1. Stop incoming traffic
2. Restore Build-Desk from SQL dump backup
3. Remove the broken batch of functions
4. Re-deploy old functions
5. Re-run migration on the sandbox
6. Deploy again when fixed

This keeps production safe at all times.

---

# **10. Final Deliverables**

1. Full copy of all functions from all projects
2. Function audit table with notes
3. Merged function library
4. New `site_id`-safe function templates
5. Batches for deployment
6. Updated frontends across all sites
7. Testing document
8. Rollback guide
9. Sandbox project for validation
10. Cleaned and unified Build-Desk Edge Functions folder

---

If you want, I can generate any of the following next:

- A **full checklist version** of this PRD
- A **folder structure template** for how to store imported functions
- A **site_id-safe function base template**
- A **deployment script** for batch pushing functions
- A **function audit worksheet** (Notion or spreadsheet format)
