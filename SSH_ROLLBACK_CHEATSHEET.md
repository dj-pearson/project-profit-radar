# SSH Rollback Cheatsheet - Quick Reference

**Server:** <REDACTED_SERVER_IP>  
**Project:** v0os0wg0gw4ko04ww80sgg08

---

## 🚀 Quick Start (5 Commands)

```bash
# 1. Connect
ssh root@<REDACTED_SERVER_IP>

# 2. Find DB container
DB_CONTAINER=$(docker ps --format '{{.Names}}' | grep "supabase-db.*v0os0wg0gw4ko04ww80sgg08")
echo $DB_CONTAINER

# 3. Backup
mkdir -p ~/backups && cd ~/backups
docker exec $DB_CONTAINER pg_dump -U postgres -d postgres --clean > backup_$(date +%Y%m%d_%H%M%S).sql

# 4. Upload rollback file from local machine (new terminal):
# scp supabase/migrations/ROLLBACK_multi_tenant.sql root@<REDACTED_SERVER_IP>:~/backups/

# 5. Apply migration
docker exec -i $DB_CONTAINER psql -U postgres -d postgres < ~/backups/ROLLBACK_multi_tenant.sql
```

---

## ✅ Verify (2 Commands)

```bash
# Check site_id columns (should be 0)
docker exec $DB_CONTAINER psql -U postgres -d postgres -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE column_name = 'site_id';"

# Check data access (should return counts)
docker exec $DB_CONTAINER psql -U postgres -d postgres -c "SELECT COUNT(*) FROM companies; SELECT COUNT(*) FROM projects;"
```

---

## 🔍 Manual Check (psql)

```bash
# Connect to database
docker exec -it $DB_CONTAINER psql -U postgres -d postgres
```

```sql
-- In psql:
SELECT COUNT(*) FROM information_schema.columns WHERE column_name = 'site_id';  -- Should be 0
SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'sites';      -- Should be 0
SELECT COUNT(*) FROM companies;  -- Should return your company count
\q
```

---

## 🆘 Emergency Restore

```bash
# List backups
ls -lh ~/backups/

# Restore from backup
docker exec -i $DB_CONTAINER psql -U postgres -d postgres < ~/backups/backup_TIMESTAMP.sql
```

---

## 📋 Full Documentation

See `ROLLBACK_VIA_SSH_GUIDE.md` for complete instructions.

