# Complete Deployment Guide for Self-Hosted Supabase Edge Functions

This comprehensive guide will walk you through deploying your 100+ edge functions to a self-hosted Supabase instance running on Docker.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Environment Configuration](#environment-configuration)
4. [Function Deployment](#function-deployment)
5. [Docker Deployment](#docker-deployment)
6. [Monitoring Setup](#monitoring-setup)
7. [CI/CD Configuration](#cicd-configuration)
8. [Migration from Cloud Supabase](#migration-from-cloud-supabase)
9. [Production Checklist](#production-checklist)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Docker** (v20.10+) and **Docker Compose** (v2.0+)
- **Git** (for version control)
- **PowerShell 7+** (Windows) or **Bash** (Linux/Mac)
- **Deno** (v1.40.0) - for local testing
- Self-hosted Supabase instance running

### Required Credentials

From your self-hosted Supabase instance:
- `SUPABASE_URL` - Your Supabase instance URL
- `SUPABASE_ANON_KEY` - Anonymous/public API key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role (admin) key

---

## Initial Setup

### Step 1: Clone and Prepare

```bash
# Navigate to your project
cd C:\Users\dpearson\Documents\Build-Desk\project-profit-radar

# Verify edge-functions-template exists
cd edge-functions-template
```

### Step 2: Deploy Functions to Template

This copies your 100+ functions from `supabase/functions/` to the deployment template.

**Windows (PowerShell):**
```powershell
# Dry run first (preview changes)
.\deploy-functions.ps1 -DryRun

# Deploy all functions
.\deploy-functions.ps1

# Deploy with clean (removes old functions first)
.\deploy-functions.ps1 -Clean

# Deploy specific function
.\deploy-functions.ps1 -FunctionFilter "ai-content-generator"
```

**Linux/Mac:**
```bash
# Dry run first
./deploy-functions.sh --dry-run

# Deploy all functions
./deploy-functions.sh

# Deploy with clean
./deploy-functions.sh --clean

# Deploy specific function
./deploy-functions.sh --filter "ai-content-generator"
```

### Step 3: Verify Deployment

```powershell
# Check copied functions
Get-ChildItem .\functions -Directory | Measure-Object

# Should show 100+ directories
```

---

## Environment Configuration

### Development Environment

**Windows:**
```powershell
# Set environment variables
$env:DEV_SUPABASE_URL = "http://localhost:54321"
$env:DEV_SUPABASE_ANON_KEY = "your-dev-anon-key"
$env:DEV_SUPABASE_SERVICE_ROLE_KEY = "your-dev-service-key"

# Generate .env file
.\env-setup.ps1 -Environment development -Validate -Export
```

**Linux/Mac:**
```bash
# Set environment variables
export DEV_SUPABASE_URL="http://localhost:54321"
export DEV_SUPABASE_ANON_KEY="your-dev-anon-key"
export DEV_SUPABASE_SERVICE_ROLE_KEY="your-dev-service-key"

# Generate .env file
./env-setup.sh --environment development --validate --export
```

### Staging Environment

```powershell
# Windows
$env:STAGING_SUPABASE_URL = "https://staging.yourdomain.com"
$env:STAGING_SUPABASE_ANON_KEY = "your-staging-anon-key"
$env:STAGING_SUPABASE_SERVICE_ROLE_KEY = "your-staging-service-key"

.\env-setup.ps1 -Environment staging -Export -ExportPath .env.staging
```

### Production Environment

```bash
# Linux/Mac
export PROD_SUPABASE_URL="https://api.yourdomain.com"
export PROD_SUPABASE_ANON_KEY="your-prod-anon-key"
export PROD_SUPABASE_SERVICE_ROLE_KEY="your-prod-service-key"

./env-setup.sh --environment production --validate --export --export-path .env.production
```

### Manual .env Configuration

If you prefer manual configuration, copy and edit:

```bash
cp env.example.txt .env
```

Edit `.env`:
```env
SUPABASE_URL=https://your-instance.yourdomain.com
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PORT=8000
NODE_ENV=production
```

---

## Function Deployment

### Local Testing

Test functions locally before deployment:

```bash
# Start development server
docker-compose up

# Test health endpoint
curl http://localhost:8000/_health

# Test specific function
curl -X POST http://localhost:8000/ai-content-generator \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"prompt": "Test content generation"}'

# View logs
docker-compose logs -f edge-functions
```

### Production Build

**Windows:**
```powershell
# Build production image
.\build.ps1 -Tag v1.0.0

# Build with no cache
.\build.ps1 -Tag v1.0.0 -NoCache

# Build and push to registry
.\build.ps1 -Tag v1.0.0 -Registry ghcr.io/your-org -Push
```

**Linux/Mac:**
```bash
# Build production image
./build.sh --tag v1.0.0

# Build with no cache
./build.sh --tag v1.0.0 --no-cache

# Build and push to registry
./build.sh --tag v1.0.0 --registry ghcr.io/your-org --push
```

---

## Docker Deployment

### Development Deployment

```bash
# Start with development config
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Production Deployment

```bash
# Start with production config
docker-compose -f docker-compose.production.yml up -d

# Check status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f edge-functions

# Stop
docker-compose -f docker-compose.production.yml down
```

### Docker Swarm Deployment

For high availability:

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.production.yml edge-functions

# Check services
docker stack services edge-functions

# Update service
docker service update --image supabase-edge-functions:v1.1.0 edge-functions_edge-functions

# Remove stack
docker stack rm edge-functions
```

---

## Monitoring Setup

### Full Monitoring Stack

Deploy Prometheus, Grafana, Loki, and AlertManager:

```bash
# Create monitoring directories
mkdir -p monitoring/{prometheus,grafana,loki,promtail,alertmanager}

# Start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Access Grafana
# URL: http://localhost:3000
# Default credentials: admin/admin

# Access Prometheus
# URL: http://localhost:9090

# View logs in Loki
# Configure in Grafana: Configuration → Data Sources → Loki
```

### Configure Alerts

Edit `monitoring/alertmanager/alertmanager.yml`:

```yaml
global:
  slack_api_url: 'YOUR_SLACK_WEBHOOK'
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@yourdomain.com'
  smtp_auth_username: 'your-email@gmail.com'
  smtp_auth_password: 'your-app-password'

receivers:
  - name: 'critical'
    slack_configs:
      - channel: '#critical-alerts'
        send_resolved: true
```

Restart AlertManager:
```bash
docker-compose -f docker-compose.monitoring.yml restart alertmanager
```

---

## CI/CD Configuration

### GitHub Actions Setup

1. **Configure Secrets** in GitHub repository:
   - `STAGING_HOST` - Staging server hostname/IP
   - `STAGING_USER` - SSH username
   - `STAGING_SSH_KEY` - Private SSH key
   - `STAGING_URL` - Staging URL
   - `PRODUCTION_HOST` - Production server hostname/IP
   - `PRODUCTION_USER` - SSH username
   - `PRODUCTION_SSH_KEY` - Private SSH key
   - `PRODUCTION_URL` - Production URL

2. **Workflow is triggered on**:
   - Push to `main` branch → Production deployment (with approval)
   - Push to `develop` branch → Staging deployment (automatic)
   - Pull requests → Build and test only
   - Manual workflow dispatch

3. **Test the workflow**:
```bash
git add .
git commit -m "Deploy edge functions"
git push origin develop
```

### Manual Deployment

If you need to deploy manually:

```bash
# SSH to server
ssh user@your-server.com

# Navigate to deployment directory
cd /opt/edge-functions

# Pull latest image
docker pull ghcr.io/your-org/edge-functions:latest

# Update and restart
docker-compose pull
docker-compose up -d

# Verify deployment
curl http://localhost:8000/_health
```

---

## Migration from Cloud Supabase

### Pre-Migration Checklist

- [ ] Self-hosted Supabase instance is running
- [ ] All database migrations have been applied
- [ ] Database data has been migrated
- [ ] Edge functions have been deployed and tested
- [ ] Environment variables are configured
- [ ] Monitoring is set up
- [ ] Backup strategy is in place

### Migration Steps

#### 1. Parallel Run (Recommended)

Run both cloud and self-hosted instances in parallel:

```typescript
// Update your client code to support both instances
const SUPABASE_URL = process.env.USE_SELF_HOSTED 
  ? process.env.SELF_HOSTED_SUPABASE_URL 
  : process.env.CLOUD_SUPABASE_URL;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

#### 2. Gradual Traffic Migration

Use environment variables to control traffic:

```bash
# Start with 10% traffic
USE_SELF_HOSTED=true # for 10% of requests

# Monitor for issues, then increase gradually
# 25% → 50% → 75% → 100%
```

#### 3. Update DNS/Load Balancer

Once self-hosted is stable:

```bash
# Update DNS to point to self-hosted instance
# OR update load balancer configuration
```

#### 4. Decommission Cloud Instance

After confirming self-hosted is working:

1. Stop accepting new requests on cloud instance
2. Wait for in-flight requests to complete
3. Backup final state
4. Decommission cloud Supabase project

---

## Production Checklist

### Security

- [ ] All secrets are stored in environment variables (not hardcoded)
- [ ] Service role key is only used in server-side functions
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled (at reverse proxy level)
- [ ] HTTPS is enabled (via reverse proxy)
- [ ] Regular security updates are scheduled

### Performance

- [ ] Resource limits are set (CPU, memory)
- [ ] Connection pooling is configured
- [ ] Caching is enabled where appropriate
- [ ] Image size is optimized
- [ ] Logging is not excessive

### Monitoring

- [ ] Prometheus is collecting metrics
- [ ] Grafana dashboards are configured
- [ ] Alerts are configured and tested
- [ ] Log aggregation is working (Loki)
- [ ] Health checks are passing

### Backup & Recovery

- [ ] Regular backups are scheduled
- [ ] Backup restoration has been tested
- [ ] Disaster recovery plan is documented
- [ ] Rollback procedure is documented

### Documentation

- [ ] All environment variables are documented
- [ ] Deployment procedures are documented
- [ ] Troubleshooting guide is available
- [ ] On-call procedures are established

---

## Troubleshooting

### Container Won't Start

**Check logs:**
```bash
docker logs supabase-edge-functions
```

**Common issues:**
- Missing environment variables → Check `.env` file
- Port already in use → Change port or stop conflicting service
- Permission errors → Check file ownership and Docker user

### Function Not Found (404)

**Verify function exists:**
```bash
docker exec supabase-edge-functions ls -la /app/functions/
```

**Check function structure:**
```bash
docker exec supabase-edge-functions cat /app/functions/your-function/index.ts
```

### High Memory Usage

**Check container stats:**
```bash
docker stats supabase-edge-functions
```

**Solutions:**
- Increase memory limit in `docker-compose.production.yml`
- Optimize function code (reduce memory footprint)
- Enable Deno's V8 heap snapshots

### Function Timeouts

**Increase timeout:**
```typescript
// In server.ts
const FUNCTION_TIMEOUT = 60000; // 60 seconds
```

**Check function logs:**
```bash
docker-compose logs -f edge-functions | grep "your-function"
```

### CORS Errors

**Update CORS headers in `server.ts`:**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://yourdomain.com',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
};
```

**Rebuild and restart:**
```bash
docker-compose up -d --build
```

### Database Connection Issues

**Check Supabase URL:**
```bash
docker exec supabase-edge-functions env | grep SUPABASE_URL
```

**Test connection:**
```bash
curl -X GET \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  "YOUR_SUPABASE_URL/rest/v1/"
```

---

## Support & Resources

### Documentation
- [Deno Manual](https://deno.land/manual)
- [Supabase Documentation](https://supabase.com/docs)
- [Docker Documentation](https://docs.docker.com)

### Monitoring
- Grafana Dashboard: `http://localhost:3000`
- Prometheus: `http://localhost:9090`
- Health Check: `http://localhost:8000/_health`

### Getting Help
1. Check logs: `docker-compose logs -f`
2. Verify environment: `docker exec container env`
3. Test function locally: `deno run --allow-all function/index.ts`
4. Review alerts in Grafana/AlertManager

---

## Next Steps

After successful deployment:

1. **Set up monitoring alerts** - Configure Slack/email notifications
2. **Implement backup strategy** - Schedule regular backups
3. **Document your setup** - Create runbooks for your team
4. **Load testing** - Test with production-like traffic
5. **Security audit** - Review and harden security settings

---

**🎉 Congratulations!** Your self-hosted Supabase Edge Functions are now deployed and running!

