# Supabase Self-Hosted (Coolify) Upgrade Guide
## Feb 2026 — Upstream Version Bump

This document covers every change required to upgrade a Coolify-hosted self-hosted Supabase
instance from the late-2025 images to the Feb 2026 upstream versions. All issues and fixes
were discovered and validated during a live upgrade session.

---

## 1. Image Version Updates

Update these image tags in your Coolify docker-compose:

| Service | Old Image | New Image |
|---|---|---|
| `supabase-studio` | `studio:2026.02.16-sha-26c615c` | `supabase/studio:2026.02.16-sha-26c615c` |
| `supabase-db` | `supabase/postgres:15.8.1.048` | `supabase/postgres:15.8.1.085` |
| `supabase-analytics` | `supabase/logflare:1.4.0` | `supabase/logflare:1.31.2` |
| `supabase-vector` | `timberio/vector:0.28.1-alpine` | `timberio/vector:0.53.0-alpine` |
| `supabase-rest` | `postgrest/postgrest:v12.2.12` | `postgrest/postgrest:v14.5` |
| `supabase-auth` | `supabase/gotrue:v2.174.0` | `supabase/gotrue:v2.186.0` |
| `realtime-dev` | `supabase/realtime:v2.34.47` | `supabase/realtime:v2.76.5` |
| `supabase-storage` | `supabase/storage-api:v1.14.6` | `supabase/storage-api:v1.37.8` |
| `imgproxy` | `darthsim/imgproxy:v3.8.0` | `darthsim/imgproxy:v3.30.1` |
| `supabase-meta` | `supabase/postgres-meta:v0.89.3` | `supabase/postgres-meta:v0.95.2` |
| `supabase-edge-functions` | `supabase/edge-runtime:v1.67.4` | `supabase/edge-runtime:v1.70.3` |
| `supabase-supavisor` | `supabase/supavisor:2.5.1` | `supabase/supavisor:2.7.4` |
| `supabase-kong` | `kong:2.8.1` | `kong:2.8.1` *(unchanged)* |

> **Note:** `supabase-minio` uses a Coolify-specific image (`ghcr.io/coollabsio/minio`) — do not change it to the upstream standard minio image.

---

## 2. Bug Fix — Studio Image Missing `supabase/` Prefix

**Problem:** The old compose had `image: 'studio:2026...'` without the `supabase/` org prefix, causing Docker to fail finding the image.

**Fix:** Change to `image: 'supabase/studio:2026...'`

---

## 3. SQL Editor Fix — `SNIPPETS_MANAGEMENT_FOLDER` Env Var

**Problem:** Studio showed *"SNIPPETS_MANAGEMENT_FOLDER env var is not set"* and the SQL Editor would not load. The old compose had this using YAML map syntax inside a list-format env block:

```yaml
# WRONG — colon syntax in a list block, value becomes ": /app/snippets"
- 'SNIPPETS_MANAGEMENT_FOLDER: /app/snippets'
```

**Fix:** Use `=` assignment syntax:

```yaml
# CORRECT
- 'SNIPPETS_MANAGEMENT_FOLDER=/app/snippets'
- 'EDGE_FUNCTIONS_MANAGEMENT_FOLDER=/app/edge-functions'  # also add this new var
```

Also add the corresponding volume mounts to `supabase-studio`:

```yaml
volumes:
  - './volumes/snippets:/app/snippets:Z'
  - './volumes/functions:/app/edge-functions:Z'  # new — enables edge fn management from dashboard
```

Create the snippets directory on the host if it doesn't exist:

```bash
mkdir -p ./volumes/snippets
```

---

## 4. Table Editor Fix — New Studio Env Vars Required

**Problem:** Studio v2026+ passes `POSTGRES_HOST` to postgres-meta when loading the Table Editor and Schema Visualizer. Without it, Studio defaults to the upstream service name `db` (not `supabase-db`), causing `EAI_AGAIN db` DNS failures.

**Fix:** Add these three env vars to `supabase-studio`:

```yaml
- POSTGRES_HOST=supabase-db
- 'POSTGRES_PORT=${POSTGRES_PORT:-5432}'
- 'POSTGRES_DB=${POSTGRES_DB:-postgres}'
- 'PG_META_CRYPTO_KEY=${SERVICE_PASSWORD_POSTGRES}'  # new required key for postgres-meta v0.95+
```

---

## 5. postgres-meta Fix — Hardcode Host + Add CRYPTO_KEY

**Problem:** postgres-meta v0.95.2 added a required `CRYPTO_KEY` env var. Without it, schema queries silently fail. Also, if `POSTGRES_HOSTNAME` is overridden in Coolify's service-level env vars, `PG_META_DB_HOST` can receive the wrong hostname (`db` instead of `supabase-db`).

**Fix:** In `supabase-meta`, hardcode the host and add the crypto key:

```yaml
environment:
  - PG_META_PORT=8080
  - PG_META_DB_HOST=supabase-db                      # hardcoded, not from env var
  - 'PG_META_DB_PORT=${POSTGRES_PORT:-5432}'          # must match your actual POSTGRES_PORT
  - 'PG_META_DB_NAME=${POSTGRES_DB:-postgres}'
  - PG_META_DB_USER=supabase_admin
  - 'PG_META_DB_PASSWORD=${SERVICE_PASSWORD_POSTGRES}'
  - 'CRYPTO_KEY=${SERVICE_PASSWORD_POSTGRES}'         # new in v0.95.2
```

> **Coolify port gotcha:** If your Coolify service has `POSTGRES_PORT=5433` set at the service level (common when supavisor is exposed on 5433), postgres itself will also be listening on 5433. Make sure `PG_META_DB_PORT` resolves to that same port. Verify with:
> ```bash
> docker exec supabase-db-<id> psql -U postgres -c "SHOW port;"
> ```

---

## 6. Vector Fix — `vector.yml` Config Rewrite Required

**Problem:** Vector jumped from 0.28 to 0.53 — a breaking change. The new version:
1. Requires `LOGFLARE_PUBLIC_ACCESS_TOKEN` env var (not just `LOGFLARE_API_KEY`)
2. Has updated sink configuration format

**Fix — docker-compose:** Add the new env var alias to `supabase-vector`:

```yaml
environment:
  - 'LOGFLARE_API_KEY=${SERVICE_PASSWORD_LOGFLARE}'
  - 'LOGFLARE_PUBLIC_ACCESS_TOKEN=${SERVICE_PASSWORD_LOGFLARE}'  # ADD THIS
```

**Fix — `volumes/logs/vector.yml`:** The config file must be replaced on the server. The key change is all sinks now use `LOGFLARE_PUBLIC_ACCESS_TOKEN` in headers and must reference the correct service name (`supabase-analytics`, not `analytics`).

Replace all sink `x-api-key` headers from:
```yaml
x-api-key: ${LOGFLARE_API_KEY}
```
To:
```yaml
x-api-key: ${LOGFLARE_API_KEY}
```

Or use sed on the server to do a bulk rename:
```bash
sed -i 's/LOGFLARE_PUBLIC_ACCESS_TOKEN/LOGFLARE_API_KEY/g' \
  /data/coolify/services/<service-id>/volumes/logs/vector.yml
```

Also verify all sink URIs use your actual service name. In Coolify the analytics container is `supabase-analytics`, not `analytics`:
```yaml
# All 7 sinks — change:
uri: 'http://analytics:4000/...'
# To:
uri: 'http://supabase-analytics:4000/...'
```

---

## 7. Order of Operations for Upgrade

Follow this order to avoid cascading failures:

```
1. Update vector.yml on the server FIRST (before pulling new images)
2. Update docker-compose with all changes above
3. Deploy — containers start in dependency order:
   vector → db → analytics → everything else
4. If vector fails: check logs with docker logs supabase-vector-<id>
5. If meta fails: verify PG_META_DB_PORT matches actual postgres port
6. If Studio Table Editor fails: verify POSTGRES_HOST=supabase-db is in Studio env
```

---

## 8. Quick Diagnostic Commands

```bash
# Check all container statuses
docker ps --filter "name=<service-id>" --format "table {{.Names}}\t{{.Status}}"

# Check vector errors
docker logs supabase-vector-<id> 2>&1 | tail -20

# Check meta errors
docker logs supabase-meta-<id> 2>&1 | tail -20

# Verify postgres port
docker exec supabase-db-<id> psql -U postgres -c "SHOW port;"

# Verify postgres is listening on all interfaces
docker exec supabase-db-<id> psql -U postgres -c "SHOW listen_addresses;"

# Test TCP connectivity from meta to db
docker exec supabase-meta-<id> node -e \
  "const net=require('net'); const c=net.connect(<PORT>,'supabase-db',()=>{console.log('OK');c.destroy()}); c.on('error',e=>console.log('FAIL:',e.message))"

# Check what env vars a container actually has
docker inspect <container-name> --format '{{range .Config.Env}}{{println .}}{{end}}'

# Check which Docker network a container is on
docker inspect <container-name> --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}: {{$v.IPAddress}}{{"\n"}}{{end}}'
```

---

## 9. Known Non-Issues

- **`minio-createbucket` shows no healthcheck** — this is normal, it's a one-shot init container
- **`supabase-rest` shows no health status** — it has `exclude_from_hc: true` intentionally
- Vector container name matching: Coolify appends a suffix (e.g. `-cgkko0cscowggwk8sss44wkw`) to all container names. The `vector.yml` route rules match on `.appname` which comes from the Docker container name label — verify these match your actual container names if logs don't appear in Studio

---

*Last updated: Feb 19, 2026*
