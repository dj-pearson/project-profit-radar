# 🎯 Start Here - Edge Functions Template

Welcome to your **complete, production-ready** self-hosted Supabase Edge Functions template!

## 📦 What You Have

This template includes **everything** you need to run Edge Functions in any environment:

### ✅ Core Components
- **Dockerfile** - Production-ready with Deno 1.40.0
- **server.ts** - Custom HTTP server with dynamic function loading
- **docker-compose.yml** - Local development environment
- **Health checks** - Built-in monitoring
- **CORS support** - Pre-configured
- **Security** - Non-root user, proper permissions

### 📚 Documentation
- **README.md** - Complete guide (features, usage, troubleshooting)
- **DEPLOYMENT.md** - Deploy to Coolify, Railway, Fly.io, K8s
- **QUICKSTART.md** - Get running in 5 minutes
- **TEMPLATE_INFO.md** - Customization guide

### 🛠️ Tools
- **setup.sh** - Linux/Mac setup script
- **setup.ps1** - Windows PowerShell setup
- **Example functions** - _health and example to get started

---

## 🚀 Quick Start (Choose Your Path)

### Option 1: 5-Minute Quick Start ⚡

**Perfect for**: Testing locally or quick POC

1. Run setup:
   ```bash
   bash setup.sh  # or .\setup.ps1 on Windows
   ```

2. Edit `.env` with your credentials

3. Start:
   ```bash
   docker-compose up
   ```

4. Test:
   ```bash
   curl http://localhost:8000/_health
   ```

**→ See [QUICKSTART.md](./QUICKSTART.md) for details**

---

### Option 2: Full Production Setup 🏗️

**Perfect for**: Production deployment

1. Copy template to your project:
   ```bash
   cp -r edge-functions-template/ my-project/
   cd my-project/
   ```

2. Run setup and configure `.env`

3. Add your functions:
   ```bash
   mkdir -p functions/my-function
   # Create functions/my-function/index.ts
   ```

4. Test locally:
   ```bash
   docker-compose up
   ```

5. Deploy to production:
   - **Coolify**: See [DEPLOYMENT.md#coolify](./DEPLOYMENT.md#coolify)
   - **Railway**: See [DEPLOYMENT.md#railway](./DEPLOYMENT.md#railway)
   - **Fly.io**: See [DEPLOYMENT.md#flyio](./DEPLOYMENT.md#flyio)
   - **Others**: See [DEPLOYMENT.md](./DEPLOYMENT.md)

**→ See [README.md](./README.md) for full guide**

---

## 📖 Documentation Index

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **[QUICKSTART.md](./QUICKSTART.md)** | Get running in 5 minutes | Start here for quick testing |
| **[README.md](./README.md)** | Complete documentation | Read for full understanding |
| **[DEPLOYMENT.md](./DEPLOYMENT.md)** | Platform-specific deployment | When deploying to production |
| **[TEMPLATE_INFO.md](./TEMPLATE_INFO.md)** | Template overview & customization | When customizing for your needs |
| **[START_HERE.md](./START_HERE.md)** | This file | Your entry point |

---

## 🎯 Use Cases

This template is perfect for:

1. **Current Project (EatPal)**
   - Copy files to your project root
   - Add your 76+ functions to `functions/`
   - Deploy to Coolify at `functions.tryeatpal.com`

2. **Future Projects**
   - Copy entire template
   - Customize as needed
   - Deploy anywhere

3. **Multi-Environment**
   - Same template for dev, staging, production
   - Just change `.env` values

4. **White-Label Solutions**
   - Each customer gets their own instance
   - Same template, different configuration

---

## 🔧 Customization

### Add Your Functions

```bash
mkdir -p functions/your-function
```

Create `functions/your-function/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const { data } = await req.json();
  
  return new Response(
    JSON.stringify({ result: 'success' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

### Change Port

Edit these files:
- `Dockerfile`: `EXPOSE 9000`
- `server.ts`: `const PORT = 9000;`
- `docker-compose.yml`: `ports: - "9000:9000"`

### Customize CORS

Edit `server.ts`:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://yourdomain.com',
  // ... other headers
};
```

**→ See [TEMPLATE_INFO.md](./TEMPLATE_INFO.md) for more**

---

## ✅ Current Status (EatPal Deployment)

### What's Working ✅
- ✅ Dockerfile created and working
- ✅ Build succeeded on Coolify
- ✅ Container deployed
- ✅ Domain configured: `functions.tryeatpal.com`

### What Needs Attention ⚠️
- ⚠️ **Bad Gateway error** - Port configuration issue
  - **Fix**: In Coolify, set **Ports Exposes** to `8000`
  - See [TROUBLESHOOT_FUNCTIONS.md](../coolify-migration/TROUBLESHOOT_FUNCTIONS.md)

### Next Steps for EatPal
1. Fix the port configuration in Coolify
2. Verify health endpoint works
3. Copy your 76 functions to `functions/` directory
4. Redeploy
5. Test all functions

---

## 🆘 Need Help?

### Quick Troubleshooting

**Container won't start?**
→ Check `.env` has all required values

**Function not found?**
→ Verify directory: `functions/your-function/index.ts`

**CORS errors?**
→ Update `corsHeaders` in `server.ts`

**Bad Gateway?**
→ Check port configuration (must be `8000`)

### Full Troubleshooting
- **Local issues**: See [README.md#troubleshooting](./README.md#troubleshooting)
- **Deployment issues**: See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Bad Gateway**: See `coolify-migration/TROUBLESHOOT_FUNCTIONS.md`

---

## 🎓 Learning Path

**New to Edge Functions?**

1. Read [QUICKSTART.md](./QUICKSTART.md) (5 min)
2. Follow the quick start steps
3. Test the example function
4. Create your first function
5. Read [README.md](./README.md) for details

**Ready to Deploy?**

1. Test locally with `docker-compose up`
2. Choose your platform
3. Read the relevant section in [DEPLOYMENT.md](./DEPLOYMENT.md)
4. Deploy!
5. Monitor with health checks

**Need to Customize?**

1. Read [TEMPLATE_INFO.md](./TEMPLATE_INFO.md)
2. Make changes to `server.ts`, `Dockerfile`, etc.
3. Test locally
4. Redeploy

---

## 📊 Template Stats

```
📁 Files: 13 total
   - 3 core files (Dockerfile, server.ts, docker-compose.yml)
   - 4 documentation files
   - 2 setup scripts
   - 2 example functions
   - 2 configuration files

📝 Lines of Code: ~2,200
   - Comprehensive documentation
   - Production-ready code
   - Well-commented examples

🎯 Platforms Supported: 6
   - Coolify
   - Railway
   - Fly.io
   - Generic Docker
   - Kubernetes
   - Any Docker host

✨ Features: 10+
   - Dynamic function loading
   - Health checks
   - CORS support
   - Error handling
   - Security best practices
   - And more!
```

---

## 🚀 Ready to Begin?

Choose your path:

1. **Test Locally** → [QUICKSTART.md](./QUICKSTART.md)
2. **Full Setup** → [README.md](./README.md)
3. **Deploy Now** → [DEPLOYMENT.md](./DEPLOYMENT.md)
4. **Customize** → [TEMPLATE_INFO.md](./TEMPLATE_INFO.md)

---

## 📝 Quick Reference

```bash
# Setup
bash setup.sh                    # Linux/Mac
.\setup.ps1                      # Windows

# Local Development
docker-compose up                # Start
docker-compose down              # Stop
docker-compose up --build        # Rebuild

# Testing
curl http://localhost:8000/_health
curl -X POST http://localhost:8000/example \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}'

# Deployment
# See DEPLOYMENT.md for platform-specific commands
```

---

**Questions?** Check the docs or ask for help!

**Ready?** Let's get started! 🎉

