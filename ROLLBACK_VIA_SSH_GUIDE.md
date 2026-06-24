# 🔄 Multi-Tenant Rollback via SSH - Complete Guide

## Overview

This guide walks you through executing the database rollback on your self-hosted Supabase instance via SSH.

**Server:** 209.145.59.219  
**Supabase Project ID:** v0os0wg0gw4ko04ww80sgg08

---

## 🚀 Step-by-Step Process

### Step 1: Connect to Server via SSH

```bash
# Connect to your server
ssh root@209.145.59.219
# Or if using a specific user:
ssh your_user@209.145.59.219
```

### Step 2: Locate Supabase Containers

Once connected, find your Supabase containers:

```bash
# List all running containers
docker ps

# Filter for your Supabase project
docker ps | grep v0os0wg0gw4ko04ww80sgg08

# Expected containers:
# - supabase-db-v0os0wg0gw4ko04ww80sgg08 (PostgreSQL database)
# - supabase-kong-v0os0wg0gw4ko04ww80sgg08 (API Gateway)
# - supabase-auth-v0os0wg0gw4ko04ww80sgg08 (Auth service)
# - supabase-rest-v0os0wg0gw4ko04ww80sgg08 (PostgREST)
# - supabase-realtime-v0os0wg0gw4ko04ww80sgg08 (Realtime)
# - supabase-storage-v0os0wg0gw4ko04ww80sgg08 (Storage)
```

### Step 3: Identify the Database Container

```bash
# Get the exact database container name
DB_CONTAINER=$(docker ps --format '{{.Names}}' | grep "supabase-db.*v0os0wg0gw4ko04ww80sgg08")
echo "Database container: $DB_CONTAINER"

# Should output something like:
# supabase-db-v0os0wg0gw4ko04ww80sgg08
```

### Step 4: Create Database Backup

```bash
# Create a backup directory
mkdir -p ~/backups
cd ~/backups

# Backup the database
docker exec $DB_CONTAINER pg_dump -U postgres -d postgres --clean --if-exists > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup was created
ls -lh backup_*.sql

# Check backup file size (should be several MB at least)
du -h backup_*.sql
```

**Alternative: Backup using docker exec with output**

```bash
# If the above doesn't work, try this method:
docker exec $DB_CONTAINER pg_dump -U postgres -d postgres --clean --if-exists -f /tmp/backup.sql

# Copy backup out of container
docker cp $DB_CONTAINER:/tmp/backup.sql ~/backups/backup_$(date +%Y%m%d_%H%M%S).sql

# Verify
ls -lh ~/backups/
```

### Step 5: Upload Rollback Migration to Server

From your **local machine** (new terminal/PowerShell):

```powershell
# From your project directory on Windows:
scp supabase/migrations/ROLLBACK_multi_tenant.sql root@209.145.59.219:~/backups/

# Or if using a specific user:
scp supabase/migrations/ROLLBACK_multi_tenant.sql your_user@209.145.59.219:~/backups/
```

**Alternative: Copy-paste method**

```bash
# On SSH server, create the file:
nano ~/backups/ROLLBACK_multi_tenant.sql

# Then paste the contents from your local file
# Save with Ctrl+X, then Y, then Enter
```

### Step 6: Apply Rollback Migration

Back on the **SSH server**:

```bash
# Method 1: Execute SQL file directly in container
docker exec -i $DB_CONTAINER psql -U postgres -d postgres < ~/backups/ROLLBACK_multi_tenant.sql

# Method 2: Copy file into container then execute
docker cp ~/backups/ROLLBACK_multi_tenant.sql $DB_CONTAINER:/tmp/
docker exec $DB_CONTAINER psql -U postgres -d postgres -f /tmp/ROLLBACK_multi_tenant.sql
```

**Expected output:**

- Lots of `DROP POLICY` statements
- `DROP INDEX` statements
- `ALTER TABLE ... DROP COLUMN` statements
- `DROP TABLE sites CASCADE`
- Final verification message

### Step 7: Verify Rollback Success

```bash
# Connect to the database
docker exec -it $DB_CONTAINER psql -U postgres -d postgres

# Now in psql, run these verification queries:
```

**Verification Queries (run in psql):**

```sql
-- Check 1: No site_id columns should remain
SELECT COUNT(*) as site_id_columns_remaining
FROM information_schema.columns
WHERE column_name = 'site_id' AND table_schema = 'public';
-- Expected: 0

-- Check 2: Verify sites table is gone
SELECT COUNT(*) as sites_table_exists
FROM information_schema.tables
WHERE table_name = 'sites' AND table_schema = 'public';
-- Expected: 0

-- Check 3: Check RLS policies
SELECT tablename, policyname
FROM pg_policies
WHERE tablename IN ('companies', 'projects', 'user_profiles')
ORDER BY tablename, policyname;
-- Should see company-based policies, NOT site-based

-- Check 4: Test data access
SELECT COUNT(*) FROM companies;
SELECT COUNT(*) FROM projects;
SELECT COUNT(*) FROM user_profiles;
-- Should return counts without errors

-- Exit psql
\q
```

### Step 8: Final Verification

```bash
# List all columns named site_id (should be empty)
docker exec $DB_CONTAINER psql -U postgres -d postgres -c "
SELECT table_name, column_name
FROM information_schema.columns
WHERE column_name = 'site_id' AND table_schema = 'public';
"

# Should return: (0 rows)
```

---

## 🎯 Complete SSH Session Script

Here's a complete script you can run after connecting via SSH:

```bash
#!/bin/bash

# Exit on error
set -e

echo "========================================="
echo "  Supabase Multi-Tenant Rollback"
echo "========================================="
echo ""

# Step 1: Find database container
echo "Step 1: Finding database container..."
DB_CONTAINER=$(docker ps --format '{{.Names}}' | grep "supabase-db.*v0os0wg0gw4ko04ww80sgg08")
if [ -z "$DB_CONTAINER" ]; then
  echo "ERROR: Database container not found!"
  exit 1
fi
echo "Found: $DB_CONTAINER"
echo ""

# Step 2: Create backup
echo "Step 2: Creating database backup..."
mkdir -p ~/backups
cd ~/backups
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
docker exec $DB_CONTAINER pg_dump -U postgres -d postgres --clean --if-exists > $BACKUP_FILE

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not created!"
  exit 1
fi

BACKUP_SIZE=$(du -h $BACKUP_FILE | cut -f1)
echo "Backup created: $BACKUP_FILE ($BACKUP_SIZE)"
echo ""

# Step 3: Check for rollback file
echo "Step 3: Checking for rollback migration..."
if [ ! -f "~/backups/ROLLBACK_multi_tenant.sql" ]; then
  echo "WARNING: ROLLBACK_multi_tenant.sql not found in ~/backups/"
  echo "Please upload it using:"
  echo "  scp supabase/migrations/ROLLBACK_multi_tenant.sql root@209.145.59.219:~/backups/"
  echo ""
  read -p "Press Enter after uploading the file..."
fi

# Step 4: Apply rollback
echo "Step 4: Applying rollback migration..."
echo "This will take 1-2 minutes..."
docker exec -i $DB_CONTAINER psql -U postgres -d postgres < ~/backups/ROLLBACK_multi_tenant.sql

echo ""
echo "Step 5: Verifying rollback..."

# Verification 1: Check for site_id columns
SITE_ID_COUNT=$(docker exec $DB_CONTAINER psql -U postgres -d postgres -t -c "
SELECT COUNT(*)
FROM information_schema.columns
WHERE column_name = 'site_id' AND table_schema = 'public';
")

echo "site_id columns remaining: $SITE_ID_COUNT (expected: 0)"

# Verification 2: Check for sites table
SITES_TABLE=$(docker exec $DB_CONTAINER psql -U postgres -d postgres -t -c "
SELECT COUNT(*)
FROM information_schema.tables
WHERE table_name = 'sites' AND table_schema = 'public';
")

echo "sites table exists: $SITES_TABLE (expected: 0)"

# Verification 3: Test data access
COMPANY_COUNT=$(docker exec $DB_CONTAINER psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM companies;")
echo "Companies accessible: $COMPANY_COUNT"

echo ""
echo "========================================="
if [ "$SITE_ID_COUNT" -eq 0 ] && [ "$SITES_TABLE" -eq 0 ]; then
  echo "✅ Rollback completed successfully!"
else
  echo "⚠️  Rollback may be incomplete. Please review."
fi
echo "========================================="
echo ""
echo "Backup saved at: ~/backups/$BACKUP_FILE"
echo "Keep this backup for at least 30 days."
```

---

## 💾 Save and Run the Script

### Option 1: Create script on server

```bash
# On SSH server
nano ~/rollback.sh

# Paste the script above
# Save with Ctrl+X, Y, Enter

# Make executable
chmod +x ~/rollback.sh

# Run it
./rollback.sh
```

### Option 2: Run commands manually

Just follow the steps in **Step-by-Step Process** section above.

---

## 🔍 Manual Verification Commands

After rollback, verify everything manually:

```bash
# Connect to database
docker exec -it $DB_CONTAINER psql -U postgres -d postgres

# In psql, run:
```

```sql
-- 1. List all tables (verify sites is gone)
\dt

-- 2. Check companies table structure (no site_id)
\d companies

-- 3. Check projects table structure (no site_id)
\d projects

-- 4. List all policies on companies
\dp companies

-- 5. Check for any remaining site_id columns
SELECT table_name, column_name
FROM information_schema.columns
WHERE column_name = 'site_id'
ORDER BY table_name;

-- 6. Test data access
SELECT id, name, created_at FROM companies LIMIT 5;
SELECT id, name, company_id FROM projects LIMIT 5;

-- Exit
\q
```

---

## 🆘 Troubleshooting

### Issue: "Database container not found"

```bash
# List ALL containers
docker ps -a

# Look for any container with 'db' or 'postgres' in the name
docker ps -a | grep -i postgres

# If container is stopped, start it:
docker start supabase-db-v0os0wg0gw4ko04ww80sgg08
```

### Issue: "Permission denied"

```bash
# If getting permission errors, try with sudo:
sudo docker exec -it $DB_CONTAINER psql -U postgres -d postgres

# Or add your user to docker group:
sudo usermod -aG docker $USER
# Then logout and login again
```

### Issue: "Backup file is empty or too small"

```bash
# Try alternative backup method:
docker exec $DB_CONTAINER sh -c 'pg_dump -U postgres -d postgres --clean --if-exists' > backup.sql

# Or backup to a file inside container first:
docker exec $DB_CONTAINER pg_dump -U postgres -d postgres --clean --if-exists -f /tmp/backup.sql
docker cp $DB_CONTAINER:/tmp/backup.sql ./backup_$(date +%Y%m%d).sql
```

### Issue: "Migration fails partway through"

```bash
# Restore from backup
docker exec -i $DB_CONTAINER psql -U postgres -d postgres < ~/backups/backup_TIMESTAMP.sql

# Or copy backup into container:
docker cp ~/backups/backup_TIMESTAMP.sql $DB_CONTAINER:/tmp/backup.sql
docker exec $DB_CONTAINER psql -U postgres -d postgres -f /tmp/backup.sql

# Then try migration again with verbose output:
docker exec -i $DB_CONTAINER psql -U postgres -d postgres -a < ~/backups/ROLLBACK_multi_tenant.sql
```

### Issue: "Can't connect via SSH"

```bash
# Test SSH connection
ssh -v root@209.145.59.219

# If using key authentication:
ssh -i ~/.ssh/your_key root@209.145.59.219

# If using different port:
ssh -p 2222 root@209.145.59.219
```

---

## 📊 What Happens During Rollback

The migration will:

1. **Drop RLS Policies** (~50 policies)
   - Removes all site-based policies
2. **Recreate Company-Only Policies** (~30 policies)

   - Restores simple company-based access

3. **Drop Indexes** (~30 indexes)

   - Removes all site_id composite indexes

4. **Remove Columns** (~30 tables)

   - Drops site_id column from each table

5. **Drop Helper Functions**

   - `auth.current_site_id()`
   - `get_site_by_domain()`
   - `get_site_by_key()`

6. **Drop Sites Table**
   - Removes the main sites table

**Total time:** 1-2 minutes

---

## ✅ Post-Rollback Checklist

After successful database rollback:

- [ ] Backup file created and verified
- [ ] Rollback migration applied successfully
- [ ] No site_id columns remain
- [ ] Sites table is gone
- [ ] Data is accessible (SELECT queries work)
- [ ] Can proceed with frontend rollback

---

## 🔄 Next Steps After Database Rollback

1. **On your local machine**, update the frontend:

   ```powershell
   # From project directory
   node scripts/rollback-multi-tenant-frontend.js
   ```

2. **Follow the generated checklist**:

   - Update AuthContext
   - Update hooks
   - Update Edge Functions

3. **Test locally**:

   ```powershell
   npm run build
   npm run dev
   ```

4. **Deploy**:
   ```powershell
   git commit -am "Complete multi-tenant rollback"
   git push origin main
   ```

---

## 📞 Quick Reference

### Essential Commands

```bash
# Connect to server
ssh root@209.145.59.219

# Find database container
docker ps | grep supabase-db

# Create backup
docker exec CONTAINER_NAME pg_dump -U postgres -d postgres --clean > backup.sql

# Apply migration
docker exec -i CONTAINER_NAME psql -U postgres -d postgres < ROLLBACK_multi_tenant.sql

# Verify
docker exec CONTAINER_NAME psql -U postgres -d postgres -c "
SELECT COUNT(*) FROM information_schema.columns WHERE column_name = 'site_id';
"
```

### Container Names Pattern

- Database: `supabase-db-v0os0wg0gw4ko04ww80sgg08`
- Kong: `supabase-kong-v0os0wg0gw4ko04ww80sgg08`
- Auth: `supabase-auth-v0os0wg0gw4ko04ww80sgg08`
- Rest: `supabase-rest-v0os0wg0gw4ko04ww80sgg08`

---

## 🎯 Success Criteria

Database rollback is complete when:

- ✅ Backup file exists and is > 1MB
- ✅ Migration executed without errors
- ✅ `SELECT COUNT(*) ... site_id` returns 0
- ✅ `SELECT * FROM sites` returns "relation does not exist"
- ✅ `SELECT * FROM companies` returns data
- ✅ `SELECT * FROM projects` returns data

---

**Ready to proceed?**

```bash
ssh root@209.145.59.219
```

Then follow the steps above! 🚀

---

**Created:** 2025-12-21  
**Server:** 209.145.59.219  
**Project:** v0os0wg0gw4ko04ww80sgg08  
**Status:** Ready for execution
