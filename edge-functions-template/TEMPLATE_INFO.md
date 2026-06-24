# Self-Hosted Supabase Edge Functions Template

## 📦 What's Included

This is a **complete, production-ready template** for running Supabase Edge Functions in a self-hosted environment. Everything you need is included!

### Core Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Production-ready Docker image with Deno 1.40.0 |
| `server.ts` | Custom HTTP server with dynamic function loading |
| `docker-compose.yml` | Local development environment |
| `env.example.txt` | Environment variables template |
| `.dockerignore` | Optimizes Docker builds |

### Documentation

| File | Purpose |
|------|---------|
| `README.md` | Complete documentation (features, usage, troubleshooting) |
| `DEPLOYMENT.md` | Platform-specific deployment guides (Coolify, Railway, Fly.io, K8s) |
| `QUICKSTART.md` | 5-minute getting started guide |
| `TEMPLATE_INFO.md` | This file |

### Example Functions

| Function | Purpose |
|----------|---------|
| `functions/_health/` | Health check endpoint (required for Docker health checks) |
| `functions/example/` | Example function showing best practices |

### Setup Scripts

| Script | Purpose |
|--------|---------|
| `setup.sh` | Linux/Mac setup script |
| `setup.ps1` | Windows PowerShell setup script |

---

## 🎯 Use Cases

This template is perfect for:

1. **Migrating from Hosted Supabase** to self-hosted
2. **Multi-project deployments** with consistent Edge Functions setup
3. **On-premise installations** for enterprise customers
4. **Development environments** that match production
5. **White-label solutions** with custom Edge Functions

---

## 🚀 Getting Started

### Quick Start (5 minutes)

See [QUICKSTART.md](./QUICKSTART.md) for the fastest path to running functions.

### Full Setup

1. **Copy template to your project**
   ```bash
   cp -r edge-functions-template/ your-project/
   cd your-project/
   ```

2. **Run setup script**
   ```bash
   # Linux/Mac
   bash setup.sh
   
   # Windows
   .\setup.ps1
   ```

3. **Configure environment**
   Edit `.env` with your credentials

4. **Add your functions**
   ```bash
   mkdir -p functions/my-function
   # Create functions/my-function/index.ts
   ```

5. **Test locally**
   ```bash
   docker-compose up
   curl http://localhost:8000/_health
   ```

6. **Deploy to production**
   See [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 📂 Recommended Project Structure

```
your-project/
├── Dockerfile                 # Docker image definition
├── server.ts                  # HTTP server (modify for custom behavior)
├── docker-compose.yml         # Local development
├── .env                       # Local environment (gitignored)
├── env.example.txt           # Environment template (committed)
│
├── functions/                 # Your Edge Functions
│   ├── _health/              # Health check (keep)
│   ├── auth/
│   │   └── index.ts          # Authentication functions
│   ├── api/
│   │   ├── users/
│   │   │   └── index.ts      # User API
│   │   └── posts/
│   │       └── index.ts      # Posts API
│   └── webhooks/
│       └── stripe/
│           └── index.ts      # Stripe webhook handler
│
├── shared/                    # Shared utilities (optional)
│   ├── database.ts           # Supabase client helpers
│   ├── validation.ts         # Input validation
│   └── constants.ts          # Shared constants
│
└── tests/                     # Tests (optional)
    ├── _health.test.ts
    └── example.test.ts
```

---

## 🔧 Customization

### Change Port

**Dockerfile**:
```dockerfile
EXPOSE 9000
```

**server.ts**:
```typescript
const PORT = 9000;
```

**docker-compose.yml**:
```yaml
ports:
  - "9000:9000"
```

### Add Custom Middleware

Edit `server.ts` and add to `handleRequest`:

```typescript
async function handleRequest(req: Request): Promise<Response> {
  // Add authentication middleware
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Add logging middleware
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  // Add rate limiting
  // ... your rate limiting logic
  
  // Continue to function handler
  // ... existing code
}
```

### Add Shared Dependencies

Create `shared/` directory:

```typescript
// shared/database.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export function getSupabaseClient(authHeader?: string) {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    authHeader ? {
      global: { headers: { Authorization: authHeader } }
    } : undefined
  );
}
```

Use in functions:

```typescript
// functions/my-function/index.ts
import { getSupabaseClient } from '../../shared/database.ts';

serve(async (req) => {
  const supabase = getSupabaseClient(req.headers.get('Authorization'));
  // ... use supabase
});
```

### Update Deno Version

**Dockerfile**:
```dockerfile
FROM denoland/deno:1.41.0  # Update version
```

Then rebuild:
```bash
docker-compose build --no-cache
```

---

## 🔒 Security Checklist

Before deploying to production:

- [ ] `.env` is in `.gitignore` (already done)
- [ ] Environment variables are set via secrets manager (not plain text)
- [ ] HTTPS is enabled (via reverse proxy)
- [ ] Service role key is kept secret
- [ ] Rate limiting is implemented
- [ ] Input validation is in place
- [ ] CORS is configured correctly
- [ ] Container runs as non-root user (already done: `USER deno`)
- [ ] Health checks are enabled
- [ ] Logging is configured

---

## 📊 Monitoring

### Built-in Health Check

```bash
curl https://your-domain.com/_health
```

Returns:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-16T...",
  "runtime": "deno",
  "version": "1.40.0",
  "environment": {
    "supabaseUrlConfigured": true,
    "anonKeyConfigured": true,
    "serviceRoleKeyConfigured": true
  },
  "functions": ["_health", "example", "..."]
}
```

### Logging

All functions log to stdout:

```bash
docker logs <container-name> -f
```

Add structured logging to your functions:

```typescript
console.log(JSON.stringify({
  level: 'info',
  function: 'my-function',
  userId: 123,
  action: 'processed_request',
  duration: 45
}));
```

---

## 🧪 Testing

### Unit Tests

```typescript
// functions/my-function/index.test.ts
import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

Deno.test('function returns correct response', async () => {
  // Test your function logic
});
```

Run:
```bash
deno test functions/my-function/index.test.ts
```

### Integration Tests

```bash
# Start server
docker-compose up -d

# Test endpoints
curl -X POST http://localhost:8000/my-function \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}' \
  | jq .

# Stop server
docker-compose down
```

---

## 🔄 Updating the Template

When you want to update this template for other projects:

1. **Make improvements** in your current project
2. **Copy changes back** to the template
3. **Version the template** (optional)
   ```bash
   git tag -a v1.1.0 -m "Added rate limiting support"
   ```

---

## 📝 Best Practices

### Function Structure

**✅ Good**:
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  try {
    // 1. Validate input
    // 2. Process request
    // 3. Return response
  } catch (error) {
    // Error handling
  }
});
```

**❌ Bad**:
```typescript
// No error handling
// No input validation
// Synchronous code that blocks
```

### Error Handling

**Always return proper error responses**:

```typescript
try {
  // Function logic
} catch (error) {
  console.error('Error:', error);
  return new Response(
    JSON.stringify({ 
      error: error.message,
      code: 'FUNCTION_ERROR'
    }),
    { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}
```

### Input Validation

```typescript
import { z } from 'https://deno.land/x/zod/mod.ts';

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

serve(async (req) => {
  const body = await req.json();
  const result = schema.safeParse(body);
  
  if (!result.success) {
    return new Response(
      JSON.stringify({ error: result.error }),
      { status: 400 }
    );
  }
  
  // Use validated data: result.data
});
```

---

## 🆘 Support & Troubleshooting

### Common Issues

1. **Port already in use**
   - Change port in `docker-compose.yml`

2. **Function not found**
   - Check directory structure: `functions/name/index.ts`
   - Restart container

3. **CORS errors**
   - Update `corsHeaders` in `server.ts`

4. **Permission denied**
   - Already handled in Dockerfile
   - If still occurs, check volume permissions

### Getting Help

- 📖 **Full docs**: [README.md](./README.md)
- 🚀 **Deployment**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- ⚡ **Quick start**: [QUICKSTART.md](./QUICKSTART.md)
- 💬 **Community**: [Supabase Discord](https://discord.supabase.com)

---

## 📄 License

This template is provided as-is for use with self-hosted Supabase instances. Feel free to modify and distribute.

---

## ✨ Features Summary

- ✅ **Production-ready** Dockerfile with security best practices
- ✅ **Dynamic function loading** - no need to restart for new functions
- ✅ **Health checks** built-in
- ✅ **CORS support** out of the box
- ✅ **Docker Compose** for local development
- ✅ **Complete documentation** (README, deployment guides, quickstart)
- ✅ **Example functions** to get started quickly
- ✅ **Platform-agnostic** - works on any Docker host
- ✅ **Setup scripts** for Windows, Mac, and Linux
- ✅ **Error handling** patterns included
- ✅ **Non-root container** for security

---

**Ready to deploy?** Start with [QUICKSTART.md](./QUICKSTART.md)! 🚀

