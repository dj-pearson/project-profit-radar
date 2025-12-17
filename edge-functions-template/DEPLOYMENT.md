# Deployment Guide - Self-Hosted Supabase Edge Functions

This guide covers deploying your Edge Functions to various platforms.

## Table of Contents

1. [Coolify](#coolify)
2. [Railway](#railway)
3. [Fly.io](#flyio)
4. [Docker (Generic)](#docker-generic)
5. [Kubernetes](#kubernetes)

---

## Coolify

### Prerequisites

- Coolify instance running
- Git repository with this template
- Domain name (optional)

### Steps

1. **Push Code to Git Repository**

```bash
git add .
git commit -m "Add edge functions"
git push origin main
```

2. **Create New Resource in Coolify**

- Go to your Coolify dashboard
- Click **+ New Resource**
- Select **Public Repository**
- Enter your Git repository URL
- Select branch (e.g., `main`)

3. **Configure Build Settings**

- **Build Pack**: Dockerfile
- **Dockerfile Location**: `Dockerfile` (or path to your Dockerfile)
- **Docker Compose**: Leave empty (not needed)

4. **Set Environment Variables**

Add these in the **Environment Variables** section:

```env
SUPABASE_URL=https://your-instance.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=8000
```

5. **Configure Ports**

- **Ports Exposes**: `8000`
- **Port Mapping**: `8000:8000` (optional)

6. **Configure Domain** (Optional)

- **Domain**: `functions.yourdomain.com`
- **HTTPS**: Enable
- **Force HTTPS**: Enable

7. **Health Check** (Optional but Recommended)

- **Health Check Path**: `/_health`
- **Health Check Method**: `GET`
- **Health Check Interval**: `30s`

8. **Deploy**

- Click **Save**
- Click **Deploy**
- Monitor logs for successful deployment

9. **Test**

```bash
# Health check
curl https://functions.yourdomain.com/_health

# Example function
curl -X POST https://functions.yourdomain.com/example \
  -H "Content-Type: application/json" \
  -d '{"name":"World"}'
```

### Troubleshooting Coolify

**Issue**: "Bad Gateway" error

**Solutions**:
1. Check **Ports Exposes** is set to `8000`
2. Verify container is running (check logs)
3. Regenerate proxy configuration
4. Restart the service

**Issue**: Container crashes on startup

**Check**:
1. Environment variables are set correctly
2. Build logs for errors
3. Container logs: `docker logs <container-name>`

---

## Railway

### Prerequisites

- Railway account
- Railway CLI installed (optional)

### Steps

1. **Create New Project**

```bash
railway login
railway init
```

2. **Add Environment Variables**

```bash
railway variables set SUPABASE_URL="https://your-instance.supabase.co"
railway variables set SUPABASE_ANON_KEY="your-anon-key"
railway variables set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
railway variables set PORT="8000"
```

3. **Deploy**

```bash
railway up
```

4. **Add Domain**

- Go to Railway dashboard
- Click on your service
- Go to **Settings** → **Networking**
- Click **Generate Domain** or add custom domain

5. **Test**

```bash
curl https://your-app.railway.app/_health
```

### Railway Configuration File

Create `railway.toml`:

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = ""
healthcheckPath = "/_health"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

---

## Fly.io

### Prerequisites

- Fly.io account
- Fly CLI installed

### Steps

1. **Login to Fly**

```bash
fly auth login
```

2. **Create App**

```bash
fly launch --name your-edge-functions --region sea
```

3. **Set Environment Variables**

```bash
fly secrets set SUPABASE_URL="https://your-instance.supabase.co"
fly secrets set SUPABASE_ANON_KEY="your-anon-key"
fly secrets set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

4. **Deploy**

```bash
fly deploy
```

5. **Test**

```bash
curl https://your-edge-functions.fly.dev/_health
```

### Fly.io Configuration

Create `fly.toml`:

```toml
app = "your-edge-functions"
primary_region = "sea"

[build]

[http_service]
  internal_port = 8000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[http_service.concurrency]
  type = "connections"
  hard_limit = 1000
  soft_limit = 800

[[services.ports]]
  port = 80
  handlers = ["http"]

[[services.ports]]
  port = 443
  handlers = ["tls", "http"]

[[services.http_checks]]
  interval = "10s"
  timeout = "2s"
  grace_period = "5s"
  method = "get"
  path = "/_health"
```

---

## Docker (Generic)

For any Docker-compatible hosting provider.

### Build Image

```bash
docker build -t edge-functions:latest .
```

### Run Locally

```bash
docker run -d \
  --name edge-functions \
  -p 8000:8000 \
  -e SUPABASE_URL="https://your-instance.supabase.co" \
  -e SUPABASE_ANON_KEY="your-anon-key" \
  -e SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" \
  edge-functions:latest
```

### Push to Registry

```bash
# Docker Hub
docker tag edge-functions:latest your-username/edge-functions:latest
docker push your-username/edge-functions:latest

# GitHub Container Registry
docker tag edge-functions:latest ghcr.io/your-username/edge-functions:latest
docker push ghcr.io/your-username/edge-functions:latest

# Private Registry
docker tag edge-functions:latest registry.yourdomain.com/edge-functions:latest
docker push registry.yourdomain.com/edge-functions:latest
```

### Deploy on Server

```bash
# SSH to server
ssh user@your-server.com

# Pull image
docker pull your-username/edge-functions:latest

# Stop old container
docker stop edge-functions
docker rm edge-functions

# Run new container
docker run -d \
  --name edge-functions \
  --restart unless-stopped \
  -p 8000:8000 \
  -e SUPABASE_URL="https://your-instance.supabase.co" \
  -e SUPABASE_ANON_KEY="your-anon-key" \
  -e SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" \
  your-username/edge-functions:latest
```

---

## Kubernetes

### Prerequisites

- Kubernetes cluster
- `kubectl` configured
- Docker registry for images

### Steps

1. **Build and Push Image**

```bash
docker build -t your-registry/edge-functions:v1.0.0 .
docker push your-registry/edge-functions:v1.0.0
```

2. **Create Secret for Environment Variables**

```bash
kubectl create secret generic edge-functions-secrets \
  --from-literal=SUPABASE_URL="https://your-instance.supabase.co" \
  --from-literal=SUPABASE_ANON_KEY="your-anon-key" \
  --from-literal=SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

3. **Create Deployment**

Create `k8s-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: edge-functions
  labels:
    app: edge-functions
spec:
  replicas: 3
  selector:
    matchLabels:
      app: edge-functions
  template:
    metadata:
      labels:
        app: edge-functions
    spec:
      containers:
      - name: edge-functions
        image: your-registry/edge-functions:v1.0.0
        ports:
        - containerPort: 8000
        env:
        - name: SUPABASE_URL
          valueFrom:
            secretKeyRef:
              name: edge-functions-secrets
              key: SUPABASE_URL
        - name: SUPABASE_ANON_KEY
          valueFrom:
            secretKeyRef:
              name: edge-functions-secrets
              key: SUPABASE_ANON_KEY
        - name: SUPABASE_SERVICE_ROLE_KEY
          valueFrom:
            secretKeyRef:
              name: edge-functions-secrets
              key: SUPABASE_SERVICE_ROLE_KEY
        livenessProbe:
          httpGet:
            path: /_health
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /_health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: edge-functions
spec:
  selector:
    app: edge-functions
  ports:
  - port: 80
    targetPort: 8000
  type: LoadBalancer
```

4. **Deploy**

```bash
kubectl apply -f k8s-deployment.yaml
```

5. **Get Service URL**

```bash
kubectl get service edge-functions
```

6. **Test**

```bash
curl http://<EXTERNAL-IP>/_health
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | ✅ Yes | Your Supabase instance URL |
| `SUPABASE_ANON_KEY` | ✅ Yes | Public API key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes | Admin API key (keep secret!) |
| `PORT` | ❌ No | Server port (default: 8000) |
| `DENO_DIR` | ❌ No | Deno cache directory |

---

## Post-Deployment Checklist

- [ ] Health endpoint responds: `/_health`
- [ ] Functions are listed in health response
- [ ] Example function works
- [ ] HTTPS/SSL is enabled
- [ ] Environment variables are set correctly
- [ ] Domain is configured (if applicable)
- [ ] Monitoring/logging is set up
- [ ] Backups are configured
- [ ] Security best practices followed

---

## Monitoring & Logging

### Health Check Monitoring

Set up automated health checks:

```bash
# Cron job example (check every 5 minutes)
*/5 * * * * curl -f https://your-domain.com/_health || echo "Health check failed"
```

### Logging

**View logs**:

```bash
# Docker
docker logs edge-functions -f

# Kubernetes
kubectl logs -f deployment/edge-functions

# Railway
railway logs

# Fly.io
fly logs
```

### Metrics

Consider adding:
- **Uptime monitoring**: UptimeRobot, Pingdom
- **Error tracking**: Sentry
- **Performance monitoring**: New Relic, Datadog

---

## Scaling

### Horizontal Scaling

**Docker Compose**:
```bash
docker-compose up --scale edge-functions=3
```

**Kubernetes**:
```bash
kubectl scale deployment edge-functions --replicas=5
```

**Railway/Fly.io**: Configure in dashboard

### Vertical Scaling

Increase container resources:
- **Memory**: 512MB → 1GB
- **CPU**: 0.5 → 1.0 cores

---

## Security Best Practices

1. **Never commit `.env` files**
2. **Use secrets management** (not plain env vars)
3. **Enable HTTPS** (handled by reverse proxy)
4. **Rotate keys** regularly
5. **Implement rate limiting** at proxy level
6. **Keep Deno updated** (rebuild images)
7. **Use least-privilege** service role key only when needed

---

Need help? Check the [README](./README.md) or open an issue!

