# Quick Start Guide - Self-Hosted Edge Functions

Get your edge functions up and running in 15 minutes!

## 🚀 TL;DR

```powershell
# 1. Deploy functions
.\deploy-functions.ps1

# 2. Configure environment
.\env-setup.ps1 -Environment development -Export

# 3. Start!
docker-compose up
```

---

## Prerequisites

✅ Docker & Docker Compose installed  
✅ Self-hosted Supabase instance running  
✅ Supabase credentials (URL, anon key, service key)

---

## Step-by-Step

### 1️⃣ Deploy Your Functions

**Windows:**
```powershell
cd edge-functions-template
.\deploy-functions.ps1
```

**Linux/Mac:**
```bash
cd edge-functions-template
./deploy-functions.sh
```

This copies all 100+ functions from `supabase/functions/` to the deployment template.

### 2️⃣ Configure Environment

**Option A: Using Setup Script (Recommended)**

Windows:
```powershell
$env:DEV_SUPABASE_URL = "https://your-instance.yourdomain.com"
$env:DEV_SUPABASE_ANON_KEY = "your-anon-key"
$env:DEV_SUPABASE_SERVICE_ROLE_KEY = "your-service-key"

.\env-setup.ps1 -Environment development -Export
```

Linux/Mac:
```bash
export DEV_SUPABASE_URL="https://your-instance.yourdomain.com"
export DEV_SUPABASE_ANON_KEY="your-anon-key"
export DEV_SUPABASE_SERVICE_ROLE_KEY="your-service-key"

./env-setup.sh --environment development --export
```

**Option B: Manual Configuration**

```bash
cp env.example.txt .env
```

Edit `.env`:
```env
SUPABASE_URL=https://your-instance.yourdomain.com
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PORT=8000
```

### 3️⃣ Start the Server

```bash
docker-compose up
```

Or in detached mode:
```bash
docker-compose up -d
```

### 4️⃣ Test It!

**Health Check:**
```bash
curl http://localhost:8000/_health
```

**Test a Function:**
```bash
curl -X POST http://localhost:8000/ai-content-generator \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"prompt": "Hello World"}'
```

**View Logs:**
```bash
docker-compose logs -f
```

---

## 🎯 What's Next?

### For Development

- ✅ Functions hot-reload automatically
- ✅ Edit functions in `functions/` directory
- ✅ Changes apply immediately

### For Production

1. **Build Production Image:**
   ```bash
   ./build.sh --tag v1.0.0
   ```

2. **Deploy:**
   ```bash
   docker-compose -f docker-compose.production.yml up -d
   ```

3. **Set Up Monitoring:**
   ```bash
   docker-compose -f docker-compose.monitoring.yml up -d
   ```

   Access Grafana: http://localhost:3000 (admin/admin)

---

## 📖 Full Documentation

- [Complete Deployment Guide](./COMPLETE_DEPLOYMENT_GUIDE.md)
- [Migration from Cloud Supabase](./MIGRATION_FROM_CLOUD.md)
- [README](./README.md)

---

## 🐛 Common Issues

### Port Already in Use

```bash
# Change port in docker-compose.yml
ports:
  - "8001:8000"  # Use 8001 instead
```

### Container Won't Start

```bash
# Check logs
docker logs supabase-edge-functions

# Verify environment
docker exec supabase-edge-functions env | grep SUPABASE
```

### Function Not Found

```bash
# List available functions
curl http://localhost:8000/

# Verify function exists
docker exec supabase-edge-functions ls /app/functions/
```

---

## 🆘 Need Help?

1. Check logs: `docker-compose logs -f`
2. Verify environment: `docker exec container env`
3. Test health: `curl http://localhost:8000/_health`
4. Review [Troubleshooting Guide](./COMPLETE_DEPLOYMENT_GUIDE.md#troubleshooting)

---

**🎉 You're all set!** Your edge functions are now running locally.
