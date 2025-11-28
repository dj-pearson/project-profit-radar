# Multi-Site Quick Reference Card

## 🚀 Quick Commands

### Database Operations

```bash
# Backup database
pg_dump -h db.YOUR-PROJECT.supabase.co -U postgres -d postgres \
  --clean --if-exists -f backup_$(date +%Y%m%d).sql

# Apply migrations
supabase db push

# Check site_id coverage
psql -h db.YOUR-PROJECT.supabase.co -U postgres -d postgres \
  -c "SELECT COUNT(*) FROM information_schema.columns WHERE column_name='site_id'"
```

### Adding a New Site

```sql
-- 1. Create site record
INSERT INTO sites (key, name, domain, is_active, config)
VALUES (
  'newsite',
  'New Site Name',
  'newsite.com',
  TRUE,
  '{"branding":{},"features":{},"limits":{}}'::jsonb
) RETURNING id;

-- 2. Verify
SELECT * FROM sites WHERE key = 'newsite';
```

### Common Queries

```sql
-- Count data per site
SELECT 
  s.name,
  COUNT(DISTINCT c.id) as companies,
  COUNT(DISTINCT p.id) as projects
FROM sites s
LEFT JOIN companies c ON c.site_id = s.id
LEFT JOIN projects p ON p.site_id = s.id
GROUP BY s.name;

-- Find users without site_id
SELECT id, email FROM user_profiles WHERE site_id IS NULL;

-- Get user's site
SELECT up.email, s.key, s.name
FROM user_profiles up
JOIN sites s ON s.id = up.site_id
WHERE up.email = 'user@example.com';
```

## 🔧 Frontend

### Site Resolver

```typescript
// src/lib/site-resolver.ts
const siteKeyMap: Record<string, string> = {
  'build-desk.com': 'builddesk',
  'newsite.com': 'newsite',  // ← Add here
};
```

### Using site_id in Queries

```typescript
// With useSiteQuery hook
const { data } = useSiteQuery('projects', async (siteId) => {
  return supabase
    .from('projects')
    .select('*')
    .eq('site_id', siteId);
});

// Manual query
const { siteId } = useAuth();
const { data } = await supabase
  .from('projects')
  .select('*')
  .eq('site_id', siteId)
  .eq('company_id', companyId);
```

## ⚡ Edge Functions

### Using Auth Helpers

```typescript
import { withAuth, successResponse } from '../_shared/auth-helpers.ts';

Deno.serve(withAuth(async (req, authContext) => {
  const { siteId, supabase } = authContext;
  
  const { data } = await supabase
    .from('table')
    .select('*')
    .eq('site_id', siteId);  // ← Always filter
  
  return successResponse({ data });
}));
```

## 🧪 Testing

### Quick Isolation Test

```sql
-- As user from Site A, try to access Site B data
SET LOCAL request.jwt.claims TO '{"app_metadata": {"site_id": "site-a-id"}}';
SELECT * FROM projects WHERE site_id = 'site-b-id';
-- Should return 0 rows
```

### Check RLS

```sql
-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'projects';
```

## 📊 Monitoring

### Check for Errors

```sql
-- Find rows missing site_id
SELECT 
  'companies' as table_name,
  COUNT(*) FILTER (WHERE site_id IS NULL) as missing
FROM companies
UNION ALL
SELECT 'projects', COUNT(*) FILTER (WHERE site_id IS NULL) FROM projects;
```

### Performance

```sql
-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read
FROM pg_stat_user_indexes
WHERE indexname LIKE '%site_id%'
ORDER BY idx_scan DESC;
```

## ⚠️ Troubleshooting

### Fix Missing site_id in JWT

```typescript
await supabase.auth.updateUser({
  data: { site_id: 'YOUR-SITE-ID' }
});
```

### Fix Wrong site_id on User

```sql
UPDATE user_profiles
SET site_id = (SELECT id FROM sites WHERE key = 'correct-site')
WHERE email = 'user@example.com';
```

### Emergency Disable Filtering

```typescript
// Frontend: site-resolver.ts
const EMERGENCY_DISABLE = true;  // Set to true only in emergency

if (!EMERGENCY_DISABLE && siteId) {
  query.eq('site_id', siteId);
}
```

## 📝 Checklists

### New Site Launch

- [ ] Create site record in database
- [ ] Migrate data (if applicable)
- [ ] Update site-resolver.ts
- [ ] Configure DNS (CNAME)
- [ ] Test authentication
- [ ] Verify data isolation
- [ ] Deploy to production

### Daily Operations

- [ ] Check error logs for missing site_id
- [ ] Verify RLS policies active
- [ ] Monitor query performance
- [ ] Review cross-site access attempts (should be 0)

## 🔗 Full Documentation

- [Master Guide](./MULTI_SITE_MIGRATION_README.md)
- [Edge Functions](./EDGE_FUNCTION_MULTI_SITE_MIGRATION.md)
- [Frontend](./FRONTEND_MULTI_SITE_MIGRATION.md)
- [New Site Onboarding](./NEW_WEBSITE_ONBOARDING_GUIDE.md)
- [Testing](./MULTI_SITE_TESTING_GUIDE.md)

