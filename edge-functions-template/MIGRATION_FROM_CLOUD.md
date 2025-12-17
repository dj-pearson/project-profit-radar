# Migration Guide: From Cloud Supabase to Self-Hosted

This guide covers the complete migration process from Supabase Cloud to your self-hosted Supabase instance, with a focus on edge functions deployment.

## 📋 Overview

**Migration Strategy:** Zero-downtime parallel deployment with gradual traffic migration

**Timeline:** 2-4 weeks (depending on testing requirements)

**Risk Level:** Low (with proper testing and rollback plan)

---

## Phase 1: Preparation (Week 1)

### 1.1 Set Up Self-Hosted Supabase

#### Deploy Supabase via Docker

```bash
# Clone Supabase repository
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker

# Configure environment
cp .env.example .env
# Edit .env with your configuration
```

#### Key Configuration Changes

Edit `.env`:
```env
# Use strong passwords
POSTGRES_PASSWORD=your-strong-password
JWT_SECRET=your-jwt-secret
ANON_KEY=your-generated-anon-key
SERVICE_ROLE_KEY=your-generated-service-role-key

# Configure ports (if needed)
KONG_HTTP_PORT=8000
KONG_HTTPS_PORT=8443

# Enable necessary features
ENABLE_EMAIL_SIGNUP=true
ENABLE_EMAIL_AUTOCONFIRM=false
```

#### Start Supabase

```bash
docker-compose up -d
```

#### Verify Installation

```bash
# Check all services are running
docker-compose ps

# Test API endpoint
curl http://localhost:8000/rest/v1/
```

### 1.2 Export Data from Cloud Supabase

#### Export Database Schema

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Generate migration from cloud
supabase db diff --file cloud_schema --use-migra --linked
```

#### Export Database Data

**Option 1: Using pg_dump (Recommended)**

```bash
# Get your cloud database connection string from Supabase Dashboard
# Settings → Database → Connection string → Transaction pooler

# Export data
pg_dump "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres" \
  --data-only \
  --no-owner \
  --no-privileges \
  --exclude-schema=auth \
  --exclude-schema=realtime \
  --exclude-schema=storage \
  --exclude-table=schema_migrations \
  > cloud_data.sql
```

**Option 2: Using Supabase CLI**

```bash
# Export specific tables
supabase db dump --data-only --table=public.your_table > your_table.sql
```

#### Export Storage Files

```typescript
// storage-export.ts
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const cloudSupabase = createClient(
  process.env.CLOUD_SUPABASE_URL!,
  process.env.CLOUD_SUPABASE_SERVICE_KEY!
);

async function exportStorage() {
  // List all buckets
  const { data: buckets } = await cloudSupabase.storage.listBuckets();
  
  for (const bucket of buckets!) {
    console.log(`Exporting bucket: ${bucket.name}`);
    
    // List all files in bucket
    const { data: files } = await cloudSupabase.storage
      .from(bucket.name)
      .list();
    
    mkdirSync(`./storage-export/${bucket.name}`, { recursive: true });
    
    for (const file of files!) {
      // Download file
      const { data } = await cloudSupabase.storage
        .from(bucket.name)
        .download(file.name);
      
      // Save locally
      const buffer = await data!.arrayBuffer();
      writeFileSync(
        join('./storage-export', bucket.name, file.name),
        Buffer.from(buffer)
      );
    }
  }
}

exportStorage();
```

Run export:
```bash
deno run --allow-all storage-export.ts
```

### 1.3 Prepare Edge Functions

#### Copy Functions

Already done in previous steps! Your functions are in `edge-functions-template/functions/`

#### Review Function Dependencies

Check for cloud-specific dependencies:

```bash
# Search for Supabase-specific URLs in functions
grep -r "supabase.co" functions/

# Search for hardcoded values
grep -r "https://" functions/ | grep -v "deno.land" | grep -v "esm.sh"
```

#### Update Function Configurations

Create a migration checklist for each function:

```powershell
# Generate function checklist
Get-ChildItem .\functions -Directory | ForEach-Object {
    $name = $_.Name
    Write-Output "- [ ] $name - Verified environment variables"
    Write-Output "- [ ] $name - Tested locally"
    Write-Output "- [ ] $name - No hardcoded URLs"
    Write-Output ""
} > migration-checklist.md
```

---

## Phase 2: Data Migration (Week 1-2)

### 2.1 Import Schema to Self-Hosted

```bash
# Apply migrations to self-hosted instance
cd ../supabase

# Apply cloud schema migration
supabase db push --include-all

# Or manually apply
psql "postgresql://postgres:postgres@localhost:5432/postgres" < cloud_schema.sql
```

### 2.2 Import Data

```bash
# Import data to self-hosted instance
psql "postgresql://postgres:postgres@localhost:5432/postgres" < cloud_data.sql

# Verify data import
psql "postgresql://postgres:postgres@localhost:5432/postgres" -c "
  SELECT schemaname, tablename, 
         pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
  FROM pg_tables 
  WHERE schemaname = 'public' 
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

### 2.3 Import Storage

```typescript
// storage-import.ts
import { createClient } from '@supabase/supabase-js';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const selfHostedSupabase = createClient(
  process.env.SELF_HOSTED_SUPABASE_URL!,
  process.env.SELF_HOSTED_SUPABASE_SERVICE_KEY!
);

async function importStorage() {
  const buckets = readdirSync('./storage-export');
  
  for (const bucket of buckets) {
    console.log(`Importing bucket: ${bucket}`);
    
    // Create bucket if doesn't exist
    await selfHostedSupabase.storage.createBucket(bucket, {
      public: false
    });
    
    const files = readdirSync(join('./storage-export', bucket));
    
    for (const file of files) {
      const filePath = join('./storage-export', bucket, file);
      const fileBuffer = readFileSync(filePath);
      
      // Upload file
      await selfHostedSupabase.storage
        .from(bucket)
        .upload(file, fileBuffer, {
          upsert: true
        });
      
      console.log(`  ✓ ${file}`);
    }
  }
}

importStorage();
```

Run import:
```bash
deno run --allow-all storage-import.ts
```

### 2.4 Verify Data Integrity

```sql
-- Compare row counts
SELECT 
  schemaname,
  tablename,
  (xpath('/row/cnt/text()', xml_count))[1]::text::int as row_count
FROM (
  SELECT 
    table_schema as schemaname,
    table_name as tablename,
    table_catalog,
    query_to_xml(
      format('SELECT count(*) as cnt FROM %I.%I', table_schema, table_name),
      false, true, ''
    ) as xml_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
) t
ORDER BY row_count DESC;
```

---

## Phase 3: Edge Functions Deployment (Week 2)

### 3.1 Deploy Edge Functions

Already covered in `COMPLETE_DEPLOYMENT_GUIDE.md`!

Quick recap:

```powershell
# Copy functions
.\deploy-functions.ps1

# Configure environment
.\env-setup.ps1 -Environment production -Export

# Build and deploy
.\build.ps1 -Tag v1.0.0
docker-compose -f docker-compose.production.yml up -d
```

### 3.2 Test All Functions

Create an automated test script:

```typescript
// test-all-functions.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!
);

const functions = [
  'ai-content-generator',
  'analytics-oauth-google',
  'api-auth',
  // ... add all your functions
];

async function testFunction(name: string) {
  try {
    const { data, error } = await supabase.functions.invoke(name, {
      body: { test: true }
    });
    
    if (error) throw error;
    
    console.log(`✅ ${name} - OK`);
    return true;
  } catch (error) {
    console.error(`❌ ${name} - FAILED:`, error.message);
    return false;
  }
}

async function testAll() {
  const results = await Promise.all(
    functions.map(fn => testFunction(fn))
  );
  
  const passed = results.filter(r => r).length;
  const failed = results.length - passed;
  
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
}

testAll();
```

Run tests:
```bash
deno run --allow-all test-all-functions.ts
```

---

## Phase 4: Parallel Deployment (Week 2-3)

### 4.1 Set Up Feature Flags

Use environment variables to control which instance is used:

```typescript
// config.ts
export const config = {
  usesSelfHosted: Deno.env.get('USE_SELF_HOSTED') === 'true',
  selfHostedUrl: Deno.env.get('SELF_HOSTED_SUPABASE_URL'),
  cloudUrl: Deno.env.get('CLOUD_SUPABASE_URL'),
  
  getSupabaseUrl() {
    return this.usesSelfHosted ? this.selfHostedUrl : this.cloudUrl;
  }
};
```

### 4.2 Implement Traffic Splitting

**Option 1: Environment Variable (Simple)**

```typescript
// 10% to self-hosted
const useSelfHosted = Math.random() < 0.1;
const SUPABASE_URL = useSelfHosted 
  ? process.env.SELF_HOSTED_SUPABASE_URL
  : process.env.CLOUD_SUPABASE_URL;
```

**Option 2: Load Balancer (Advanced)**

Configure Nginx, Traefik, or your load balancer:

```nginx
# nginx.conf
upstream supabase_cloud {
    server cloud.supabase.co:443 weight=90;
}

upstream supabase_selfhosted {
    server selfhosted.yourdomain.com:443 weight=10;
}

server {
    location / {
        proxy_pass https://supabase_$upstream;
    }
}
```

### 4.3 Monitor Both Instances

Set up monitoring for both:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'cloud-supabase'
    static_configs:
      - targets: ['cloud-proxy:9090']
        labels:
          instance: 'cloud'
  
  - job_name: 'selfhosted-supabase'
    static_configs:
      - targets: ['edge-functions:8000']
        labels:
          instance: 'selfhosted'
```

### 4.4 Gradual Traffic Migration Schedule

| Week | Self-Hosted % | Cloud % | Action |
|------|---------------|---------|--------|
| 2 | 10% | 90% | Initial rollout, monitor for issues |
| 2.5 | 25% | 75% | Increase if no issues |
| 3 | 50% | 50% | Split traffic evenly |
| 3.5 | 75% | 25% | Majority to self-hosted |
| 4 | 100% | 0% | Full migration |

---

## Phase 5: Complete Migration (Week 3-4)

### 5.1 Final Cutover Checklist

- [ ] All data is synchronized
- [ ] All functions are tested and working
- [ ] Monitoring shows healthy metrics
- [ ] Backup and restore tested
- [ ] Rollback procedure documented
- [ ] Team trained on new infrastructure
- [ ] Documentation updated

### 5.2 DNS/Load Balancer Update

Update your DNS to point to self-hosted instance:

```bash
# Example: Update Cloudflare DNS
curl -X PUT "https://api.cloudflare.com/client/v4/zones/ZONE_ID/dns_records/RECORD_ID" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "A",
    "name": "api.yourdomain.com",
    "content": "YOUR_SELFHOSTED_IP",
    "ttl": 1,
    "proxied": true
  }'
```

### 5.3 Monitor for Issues

Watch for:
- Error rate increases
- Latency spikes
- Database connection issues
- Storage access problems
- Authentication failures

### 5.4 Decommission Cloud Instance

Once self-hosted is stable (1-2 weeks):

1. **Final Backup**
   ```bash
   # One last backup from cloud
   pg_dump "postgresql://..." > final_cloud_backup.sql
   ```

2. **Stop Accepting Traffic**
   - Remove cloud instance from load balancer
   - Update DNS to only point to self-hosted

3. **Wait Period**
   - Keep cloud instance running (but idle) for 1 week
   - Monitor for any issues

4. **Decommission**
   - Delete cloud Supabase project
   - Cancel cloud subscription

---

## Rollback Procedures

### Emergency Rollback to Cloud

If critical issues occur:

```bash
# 1. Update DNS immediately
# Point back to cloud instance

# 2. Update environment variables
export USE_SELF_HOSTED=false

# 3. Restart applications
docker-compose restart

# 4. Verify cloud is serving traffic
curl https://your-cloud-url.supabase.co/rest/v1/
```

### Partial Rollback

Rollback specific functions only:

```typescript
// config.ts
const ROLLBACK_FUNCTIONS = ['function-with-issues'];

export function shouldUseSelfHosted(functionName: string) {
  if (ROLLBACK_FUNCTIONS.includes(functionName)) {
    return false; // Use cloud
  }
  return true; // Use self-hosted
}
```

---

## Post-Migration Checklist

### Week 1 After Migration

- [ ] Daily monitoring of all metrics
- [ ] Review error logs
- [ ] Verify backup processes
- [ ] Check storage costs vs. cloud
- [ ] Document any issues encountered

### Week 2-4 After Migration

- [ ] Weekly metric reviews
- [ ] Performance optimization
- [ ] Cost analysis
- [ ] Team feedback session
- [ ] Update runbooks

### Month 2+

- [ ] Monthly security audits
- [ ] Capacity planning
- [ ] Disaster recovery testing
- [ ] Documentation updates

---

## Cost Comparison

### Cloud Supabase (Example)

```
Pro Plan: $25/month
Database: 8GB - Included
Storage: 100GB - Included
Bandwidth: 250GB - Included
Edge Functions: 2M invocations - Included

Total: ~$25-100/month (depending on usage)
```

### Self-Hosted (Example)

```
VPS/Server: $50-200/month (8GB RAM, 4 CPUs, 250GB SSD)
Backup Storage: $10-20/month
Monitoring: $0 (self-hosted)
CDN (optional): $10-50/month

Total: ~$60-270/month

Break-even: Typically at higher usage tiers
Benefits: Full control, no limits, data sovereignty
```

---

## Troubleshooting Common Issues

### Authentication Issues

**Problem:** Users can't authenticate on self-hosted

**Solution:**
```sql
-- Check auth settings
SELECT * FROM auth.config;

-- Verify JWT secret matches
-- In .env file
JWT_SECRET=your-jwt-secret-here
```

### Function Invocation Errors

**Problem:** Functions return 500 errors

**Solution:**
```bash
# Check function logs
docker logs supabase-edge-functions

# Test function directly
curl -X POST http://localhost:8000/your-function \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -d '{"test": true}'
```

### Database Connection Issues

**Problem:** Functions can't connect to database

**Solution:**
```bash
# Verify database is accessible
docker exec supabase-db pg_isready

# Check network connectivity
docker exec supabase-edge-functions ping db

# Verify connection string
echo $SUPABASE_URL
```

---

## Success Metrics

Track these metrics to measure migration success:

| Metric | Target | Current |
|--------|--------|---------|
| Uptime | 99.9% | - |
| P95 Latency | <500ms | - |
| Error Rate | <0.1% | - |
| Monthly Cost | <$200 | - |
| Function Success Rate | >99% | - |
| Team Satisfaction | >8/10 | - |

---

## Support Resources

- **Supabase Discord:** https://discord.supabase.com
- **Self-Hosting Docs:** https://supabase.com/docs/guides/self-hosting
- **GitHub Issues:** https://github.com/supabase/supabase/issues
- **Your Team Wiki:** [Add your internal wiki link]

---

**🎉 Migration Complete!**

You now have full control over your Supabase infrastructure with 100+ edge functions running smoothly on your self-hosted instance!

