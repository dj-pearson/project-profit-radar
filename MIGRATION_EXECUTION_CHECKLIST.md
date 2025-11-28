# Multi-Site Migration Execution Checklist

Use this checklist to track your migration progress. Copy this file and check off items as you complete them.

---

## 📅 Migration Timeline

**Start Date:** _______________
**Target Completion:** _______________
**Actual Completion:** _______________

---

## Phase 1: Pre-Migration (Day 0)

### Documentation Review
- [ ] Read `MULTI_SITE_MIGRATION_SUMMARY.md`
- [ ] Read `docs/MULTI_SITE_MIGRATION_README.md`
- [ ] Review `Database_Migration.md` (original PRD)
- [ ] Understand two-layer isolation concept
- [ ] Review rollback procedures

### Environment Preparation
- [ ] Create staging/test environment
- [ ] Install Supabase CLI: `npm install -g supabase`
- [ ] Link to Supabase project: `supabase link --project-ref YOUR_REF`
- [ ] Verify database access
- [ ] Set up monitoring/logging

### Backup
- [ ] **CRITICAL:** Create full database backup
  ```bash
  pg_dump -h db.YOUR-PROJECT.supabase.co -U postgres -d postgres \
    --clean --if-exists -f backup_$(date +%Y%m%d_%H%M%S).sql
  ```
- [ ] Verify backup file is valid
- [ ] Store backup in secure location
- [ ] Test restore process (optional but recommended)

### Team Communication
- [ ] Notify team of migration schedule
- [ ] Plan maintenance window (if needed)
- [ ] Assign roles (DBA, developer, tester)
- [ ] Set up communication channel (Slack, Teams, etc.)

---

## Phase 2: Database Migration (Days 1-4)

### Apply Migrations (Staging First!)

**Migration 1: Create Sites Table**
- [ ] Review `supabase/migrations/20251128000001_create_sites_table.sql`
- [ ] Apply to staging:
  ```bash
  psql -h db.STAGING.supabase.co -U postgres -d postgres \
    -f supabase/migrations/20251128000001_create_sites_table.sql
  ```
- [ ] Verify sites table exists
- [ ] Verify Build-Desk site created: `SELECT * FROM sites WHERE key = 'builddesk';`
- [ ] Test helper functions: `SELECT get_site_by_domain('build-desk.com');`
- [ ] **If successful, apply to production**

**Migration 2: Add site_id to Core Tables**
- [ ] Review `supabase/migrations/20251128000002_add_site_id_to_core_tables.sql`
- [ ] Apply to staging
- [ ] Verify site_id column added to core tables
- [ ] Verify all rows have site_id (no NULLs):
  ```sql
  SELECT COUNT(*) - COUNT(site_id) as missing FROM companies;
  SELECT COUNT(*) - COUNT(site_id) as missing FROM projects;
  ```
- [ ] Check indexes created: `SELECT * FROM pg_indexes WHERE indexname LIKE '%site_id%';`
- [ ] **If successful, apply to production**

**Migration 3: Add site_id to Extended Tables**
- [ ] Review `supabase/migrations/20251128000003_add_site_id_to_extended_tables.sql`
- [ ] Apply to staging
- [ ] Verify site_id on extended tables
- [ ] **If successful, apply to production**

**Migration 4: Update RLS Policies**
- [ ] Review `supabase/migrations/20251128000004_update_rls_policies_for_sites.sql`
- [ ] Apply to staging
- [ ] Verify `auth.current_site_id()` function exists
- [ ] Test RLS policies (see testing section below)
- [ ] **If successful, apply to production**

### Post-Migration Verification

**Data Integrity**
- [ ] Count tables with site_id:
  ```sql
  SELECT COUNT(*) FROM information_schema.columns 
  WHERE column_name = 'site_id' AND table_schema = 'public';
  ```
- [ ] Expected: 25+ tables
- [ ] Verify no NULL site_id values in critical tables
- [ ] Compare row counts before/after migration

**Performance**
- [ ] Run EXPLAIN ANALYZE on key queries
- [ ] Check query performance with site_id filter
- [ ] Verify indexes are being used
- [ ] Monitor slow query log

**RLS Testing**
- [ ] Test site isolation (see Phase 6 for details)
- [ ] Verify RLS policies are active
- [ ] Test with multiple users

---

## Phase 3: Edge Functions (Days 5-10)

### Shared Helpers
- [ ] Review `supabase/functions/_shared/auth-helpers.ts`
- [ ] Deploy shared helpers (if needed)
- [ ] Test `initializeAuthContext()` function

### Authentication Functions (CRITICAL - Priority 1)
- [ ] Update SSO/login functions to set site_id in JWT
- [ ] Test authentication flow
- [ ] Verify site_id in JWT: `console.log(user.app_metadata.site_id)`
- [ ] Functions updated:
  - [ ] `sso-login` (or equivalent)
  - [ ] `oauth-callback`
  - [ ] Other auth functions: _______________

### Payment Functions (HIGH - Priority 2)
- [ ] Update Stripe webhook handlers
- [ ] Add site_id validation
- [ ] Test with Stripe test mode
- [ ] Functions updated:
  - [ ] `stripe-webhooks`
  - [ ] `create-checkout-session`
  - [ ] Other payment functions: _______________

### CRM Functions (HIGH - Priority 2)
- [ ] Update CRM functions to filter by site_id
- [ ] Test CRM operations
- [ ] Functions updated:
  - [ ] List affected functions: _______________
  - [ ] _______________
  - [ ] _______________

### Remaining Functions (MEDIUM/LOW - Priority 3)
- [ ] AI functions (_____ total)
- [ ] Analytics functions (_____ total)
- [ ] GPS functions (_____ total)
- [ ] Blog/SEO functions (_____ total)
- [ ] Other functions: _______________

### Edge Function Testing
- [ ] Deploy test function
- [ ] Test with Site A user (returns only Site A data)
- [ ] Test with Site B user (returns only Site B data)
- [ ] Test without site_id (returns 403)
- [ ] Monitor logs for errors

---

## Phase 4: Frontend (Days 11-15)

### Core Infrastructure
- [ ] Create `src/lib/site-resolver.ts`
  - [ ] Add domain mappings
  - [ ] Test `getSiteConfig()`
  - [ ] Test `getCurrentSiteId()`
- [ ] Update `src/contexts/AuthContext.tsx`
  - [ ] Add `siteId` state
  - [ ] Add `siteConfig` state
  - [ ] Update `signIn` to include site_id
  - [ ] Test context provides correct values

### Query Hooks
- [ ] Create `src/hooks/useSiteQuery.ts`
- [ ] Update top 10 most-used hooks:
  - [ ] `useProjects` - add `.eq('site_id', siteId)`
  - [ ] `useCompanies` - add `.eq('site_id', siteId)`
  - [ ] `useDocuments` - add `.eq('site_id', siteId)`
  - [ ] `useInvoices` - add `.eq('site_id', siteId)`
  - [ ] `useTimeEntries` - add `.eq('site_id', siteId)`
  - [ ] `useCRMContacts` - add `.eq('site_id', siteId)`
  - [ ] `useCRMLeads` - add `.eq('site_id', siteId)`
  - [ ] Other hooks: _______________
  - [ ] _______________
  - [ ] _______________

### Components
- [ ] Update components with direct queries
- [ ] Add site checks to protected routes
- [ ] Apply site-specific branding
- [ ] Test UI with different domains

### Mobile Apps
- [ ] Update Capacitor config
- [ ] Update mobile login flow to include site_id
- [ ] Test mobile authentication
- [ ] Update Expo config (if using Expo)
- [ ] Test mobile app on both iOS and Android

### Frontend Testing
- [ ] Local testing with build-desk.com (add to /etc/hosts if needed)
- [ ] Test authentication sets site_id
- [ ] Test all major features work correctly
- [ ] Test with network inspector (verify site_id in queries)

---

## Phase 5: Deployment (Days 16-17)

### Staging Deployment
- [ ] Deploy Edge Functions to staging
- [ ] Deploy frontend to staging
- [ ] Test end-to-end flow in staging
- [ ] Fix any issues found

### Production Deployment
- [ ] Schedule deployment window
- [ ] Notify users of potential downtime (if any)
- [ ] Deploy Edge Functions: `supabase functions deploy`
- [ ] Deploy frontend: `npm run build && wrangler pages publish dist`
- [ ] Verify deployment successful
- [ ] Test critical user flows

### Post-Deployment
- [ ] Monitor error logs (first 2 hours)
- [ ] Check Sentry for errors
- [ ] Monitor Supabase logs
- [ ] Check database performance
- [ ] Verify user authentication working
- [ ] Test key features

---

## Phase 6: Testing & Validation (Days 18-20)

### Database Testing
- [ ] Verify all tables have site_id
- [ ] Verify no NULL site_id values
- [ ] Test RLS policies:
  ```sql
  -- As Site A user, try to access Site B data
  SET LOCAL request.jwt.claims TO '{"app_metadata": {"site_id": "site-a-id"}}';
  SELECT * FROM projects WHERE site_id = 'site-b-id';
  -- Should return 0 rows
  ```
- [ ] Performance testing (queries should be < 10ms)

### Application Testing
- [ ] Test authentication flow
- [ ] Test site isolation (User A cannot see User B's data from different site)
- [ ] Test all major features:
  - [ ] Projects
  - [ ] Time tracking
  - [ ] Invoicing
  - [ ] CRM
  - [ ] Documents
  - [ ] Financials
- [ ] Test mobile apps

### Security Audit
- [ ] Test cross-site data access (should fail)
- [ ] Test requests without site_id (should be rejected)
- [ ] Test SQL injection prevention
- [ ] Review RLS policies
- [ ] Check for data leakage

### Performance Testing
- [ ] Run load tests
- [ ] Check query performance with site_id
- [ ] Monitor database CPU/memory
- [ ] Verify indexes being used

### User Acceptance Testing
- [ ] Test with real users
- [ ] Gather feedback
- [ ] Document any issues
- [ ] Fix critical issues

---

## Phase 7: Adding First New Site (Optional - Days 21+)

Follow `docs/NEW_WEBSITE_ONBOARDING_GUIDE.md`

### Planning
- [ ] Choose site to migrate (e.g., RealEstate Bio)
- [ ] Gather site information
- [ ] Export data from old project (if applicable)

### Database
- [ ] Create site record in `sites` table
- [ ] Migrate data (companies, users, projects, etc.)
- [ ] Verify site_id set correctly on all rows
- [ ] Test isolation between Build-Desk and new site

### Frontend
- [ ] Update `site-resolver.ts` with new domain
- [ ] Test site resolution
- [ ] Test authentication

### DNS
- [ ] Configure DNS records
- [ ] Add custom domain to Cloudflare Pages
- [ ] Verify SSL certificate

### Go-Live
- [ ] Test new site end-to-end
- [ ] Verify data isolation
- [ ] Monitor for 24-48 hours
- [ ] Document any site-specific customizations

---

## Phase 8: Monitoring & Maintenance (Ongoing)

### Daily (Week 1)
- [ ] Check error logs
- [ ] Monitor database performance
- [ ] Review user feedback
- [ ] Check for missing site_id errors

### Weekly (Month 1)
- [ ] Review query performance
- [ ] Check RLS policy violations (should be 0)
- [ ] Update documentation if needed
- [ ] Plan next site migration

### Monthly (Ongoing)
- [ ] Security audit
- [ ] Performance review
- [ ] Cost analysis
- [ ] Plan improvements

---

## Rollback Procedures (If Needed)

### Emergency Rollback
If critical issues found:

- [ ] Restore from backup:
  ```bash
  psql -h db.YOUR-PROJECT.supabase.co -U postgres -d postgres \
    -f backup_TIMESTAMP.sql
  ```
- [ ] Redeploy previous Edge Functions
- [ ] Redeploy previous frontend
- [ ] Notify team and users
- [ ] Document issues for future attempt

### Partial Rollback
If only specific component broken:

- [ ] Identify problematic component (database, Edge Function, frontend)
- [ ] Rollback only that component
- [ ] Test and verify
- [ ] Document issue

---

## Success Metrics

### Required (Must Achieve)
- [ ] Zero cross-site data leaks
- [ ] All existing features work correctly
- [ ] Performance degradation < 10%
- [ ] No authentication issues
- [ ] Mobile apps work correctly

### Desired (Nice to Have)
- [ ] Query performance improved (due to better indexes)
- [ ] User satisfaction maintained or improved
- [ ] Team confidence in multi-site architecture
- [ ] Documentation complete and helpful
- [ ] First new site onboarded within 1 day

---

## Team Sign-Off

### Migration Completion

**Database Administrator:**
- Name: _______________
- Date: _______________
- Sign-off: ☐

**Lead Developer:**
- Name: _______________
- Date: _______________
- Sign-off: ☐

**QA/Tester:**
- Name: _______________
- Date: _______________
- Sign-off: ☐

**Product Owner:**
- Name: _______________
- Date: _______________
- Sign-off: ☐

---

## Notes & Issues

Document any issues, deviations, or important decisions made during migration:

```
Date: _______________
Issue: _______________
Resolution: _______________

Date: _______________
Issue: _______________
Resolution: _______________

Date: _______________
Issue: _______________
Resolution: _______________
```

---

## Post-Migration Review

**What went well:**

**What could be improved:**

**Lessons learned:**

**Recommendations for next site:**

---

**Migration Status:** ☐ Planning | ☐ In Progress | ☐ Testing | ☐ Complete

**Overall Health:** ☐ Green | ☐ Yellow | ☐ Red

