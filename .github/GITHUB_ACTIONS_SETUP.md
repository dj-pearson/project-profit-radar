# GitHub Actions Setup Guide

Complete guide to configuring GitHub Actions for automated edge functions deployment.

## 📋 Overview

The workflow automates:
- ✅ Linting and validation
- ✅ Docker image building
- ✅ Security scanning
- ✅ Deployment to staging/production
- ✅ Health check verification
- ✅ Automatic rollback on failure

## 🔐 Required Secrets

Configure these secrets in your GitHub repository:

**Settings → Secrets and variables → Actions → New repository secret**

### Staging Environment

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `STAGING_HOST` | Staging server hostname or IP | `staging.yourdomain.com` |
| `STAGING_USER` | SSH username | `ubuntu` |
| `STAGING_SSH_KEY` | Private SSH key for authentication | `-----BEGIN RSA PRIVATE KEY-----...` |
| `STAGING_URL` | Full staging URL for health checks | `https://staging-api.yourdomain.com` |

### Production Environment

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `PRODUCTION_HOST` | Production server hostname or IP | `api.yourdomain.com` |
| `PRODUCTION_USER` | SSH username | `ubuntu` |
| `PRODUCTION_SSH_KEY` | Private SSH key for authentication | `-----BEGIN RSA PRIVATE KEY-----...` |
| `PRODUCTION_URL` | Full production URL for health checks | `https://api.yourdomain.com` |

### Optional Secrets

| Secret Name | Description | When Needed |
|-------------|-------------|-------------|
| `SLACK_WEBHOOK_URL` | Slack webhook for notifications | If using Slack notifications |
| `DOCKER_REGISTRY_TOKEN` | Custom registry access token | If not using ghcr.io |
| `SENTRY_DSN` | Sentry error tracking DSN | If using Sentry |

## 🔑 Generating SSH Keys

### 1. Generate SSH Key Pair

On your local machine:

```bash
# Generate new SSH key (no passphrase)
ssh-keygen -t rsa -b 4096 -C "github-actions" -f ~/.ssh/github-actions -N ""

# This creates:
# - ~/.ssh/github-actions (private key) ← Add to GitHub secrets
# - ~/.ssh/github-actions.pub (public key) ← Add to server
```

### 2. Add Public Key to Server

```bash
# Copy public key to staging server
ssh-copy-id -i ~/.ssh/github-actions.pub user@staging.yourdomain.com

# Copy public key to production server
ssh-copy-id -i ~/.ssh/github-actions.pub user@production.yourdomain.com

# Or manually:
cat ~/.ssh/github-actions.pub | ssh user@server.com "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### 3. Add Private Key to GitHub

```bash
# Display private key
cat ~/.ssh/github-actions

# Copy the entire output (including header/footer)
# Add to GitHub: Settings → Secrets → STAGING_SSH_KEY
```

### 4. Test SSH Connection

```bash
# Test staging
ssh -i ~/.ssh/github-actions user@staging.yourdomain.com "echo 'Connection successful'"

# Test production
ssh -i ~/.ssh/github-actions user@production.yourdomain.com "echo 'Connection successful'"
```

## ⚙️ Server Setup

### Prerequisites on Each Server

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version
```

### Create Deployment Directory

```bash
# On staging and production servers
sudo mkdir -p /opt/edge-functions
sudo chown $USER:$USER /opt/edge-functions
cd /opt/edge-functions

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  edge-functions:
    image: ghcr.io/YOUR_ORG/edge-functions:latest
    container_name: supabase-edge-functions
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    env_file:
      - .env
EOF

# Create .env file
cat > .env << 'EOF'
SUPABASE_URL=https://your-instance.yourdomain.com
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
EOF
```

## 🚀 GitHub Workflow Configuration

The workflow file is already created at `.github/workflows/edge-functions-deploy.yml`

### Workflow Triggers

```yaml
on:
  push:
    branches:
      - main        # Auto-deploy to production (with approval)
      - develop     # Auto-deploy to staging
  pull_request:    # Build and test only
  workflow_dispatch:  # Manual trigger
```

### Customizing Workflow

#### Change Container Registry

Default: GitHub Container Registry (ghcr.io)

To use Docker Hub:
```yaml
env:
  REGISTRY: docker.io
  IMAGE_NAME: your-dockerhub-username/edge-functions
```

To use AWS ECR:
```yaml
env:
  REGISTRY: 123456789.dkr.ecr.us-east-1.amazonaws.com
  IMAGE_NAME: edge-functions
```

#### Add Build Arguments

```yaml
- name: Build and push Docker image
  uses: docker/build-push-action@v5
  with:
    build-args: |
      CUSTOM_ARG=value
      ANOTHER_ARG=value
```

#### Change Deployment Paths

```yaml
- name: Deploy to staging server
  uses: appleboy/ssh-action@v1.0.0
  with:
    script: |
      cd /opt/edge-functions  # Change this path
      docker-compose pull
      docker-compose up -d
```

#### Add Slack Notifications

Add this job at the end:
```yaml
- name: Notify Slack
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
    text: 'Edge Functions Deployment: ${{ job.status }}'
```

## 🧪 Testing the Workflow

### 1. Test Locally First

```bash
# Ensure scripts work locally
cd edge-functions-template
.\deploy-functions.ps1
.\build.ps1 -Tag test
docker run -p 8000:8000 --env-file .env supabase-edge-functions:test
```

### 2. Test SSH Connection

```bash
# From your local machine
ssh -i ~/.ssh/github-actions user@staging.yourdomain.com "cd /opt/edge-functions && docker-compose ps"
```

### 3. Test Workflow with Pull Request

```bash
# Create feature branch
git checkout -b test-workflow

# Make a small change
echo "# Test" >> README.md

# Commit and push
git add .
git commit -m "test: workflow validation"
git push origin test-workflow

# Create PR on GitHub
# Workflow should run build and test only
```

### 4. Test Staging Deployment

```bash
# Push to develop branch
git checkout develop
git merge test-workflow
git push origin develop

# Workflow should:
# 1. Build image
# 2. Push to registry
# 3. Deploy to staging
# 4. Run health checks
```

### 5. Test Production Deployment

```bash
# Push to main branch
git checkout main
git merge develop
git push origin main

# Workflow will:
# 1. Wait for approval (environment protection rule)
# 2. Deploy to production
# 3. Run health checks
# 4. Rollback if health checks fail
```

## 🛡️ Security Best Practices

### 1. Environment Protection Rules

Configure in GitHub: Settings → Environments

**Staging:**
- No approvals required
- Auto-deploy on develop branch

**Production:**
- Required approvers: 1-2 people
- Deployment branch: main only
- Protection rules enforced

### 2. Secret Management

```bash
# Never commit secrets
echo ".env" >> .gitignore
echo "*.key" >> .gitignore

# Use environment-specific secrets
# Prefix with environment name: PROD_*, STAGING_*
```

### 3. SSH Key Security

```bash
# Use separate keys for different environments
ssh-keygen -t rsa -b 4096 -f ~/.ssh/github-actions-staging
ssh-keygen -t rsa -b 4096 -f ~/.ssh/github-actions-production

# Restrict key permissions on server
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys

# Disable password authentication (after SSH keys work)
sudo vim /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart sshd
```

### 4. Container Registry Access

**GitHub Container Registry:**
- Uses `GITHUB_TOKEN` automatically
- No additional configuration needed

**Docker Hub:**
```bash
# Add secrets
DOCKER_USERNAME=your-username
DOCKER_PASSWORD=your-token
```

**AWS ECR:**
```bash
# Add secrets
AWS_ACCESS_KEY_ID=your-key-id
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
```

## 🔄 Workflow Stages

### Stage 1: Lint (Always)
- Validates function code
- Checks formatting
- Runs on all branches

### Stage 2: Build (Always)
- Copies functions to template
- Builds Docker image
- Pushes to registry
- Runs basic tests

### Stage 3: Security Scan (Always)
- Scans image with Trivy
- Checks for vulnerabilities
- Uploads results to GitHub Security

### Stage 4: Deploy Staging (develop branch)
- SSH to staging server
- Pull latest image
- Restart containers
- Verify health checks

### Stage 5: Deploy Production (main branch)
- Wait for manual approval
- SSH to production server
- Pull latest image
- Restart containers
- Verify health checks
- Rollback on failure

## 📊 Monitoring Deployments

### View Workflow Runs

**GitHub:** Actions tab → Edge Functions Deploy

### Check Deployment Logs

```bash
# On server
docker logs supabase-edge-functions -f

# Or via SSH
ssh user@server "docker logs supabase-edge-functions --tail 100"
```

### Health Check Status

```bash
# From workflow
curl https://api.yourdomain.com/_health

# Should return:
{
  "status": "healthy",
  "timestamp": "2025-12-17T...",
  "functions": ["function1", "function2", ...]
}
```

## 🐛 Troubleshooting

### SSH Connection Failed

```bash
# Check SSH key format
head -n 1 ~/.ssh/github-actions
# Should be: -----BEGIN RSA PRIVATE KEY-----

# Test connection manually
ssh -i ~/.ssh/github-actions -v user@server.com

# Check authorized_keys on server
ssh user@server "cat ~/.ssh/authorized_keys | grep github-actions"
```

### Docker Build Failed

```bash
# Check build logs in Actions tab
# Common issues:
# - Missing dependencies
# - Syntax errors in Dockerfile
# - Network timeouts

# Test locally
cd edge-functions-template
docker build -f Dockerfile.production -t test .
```

### Deployment Failed

```bash
# Check server logs
ssh user@server "docker logs supabase-edge-functions"

# Check docker-compose
ssh user@server "cd /opt/edge-functions && docker-compose ps"

# Verify environment variables
ssh user@server "docker exec supabase-edge-functions env | grep SUPABASE"
```

### Health Check Failed

```bash
# Test health endpoint directly
curl -v https://api.yourdomain.com/_health

# Check if service is running
ssh user@server "docker ps | grep edge-functions"

# Check if port is accessible
telnet api.yourdomain.com 8000
```

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [SSH Action](https://github.com/appleboy/ssh-action)
- [Trivy Security Scanner](https://github.com/aquasecurity/trivy-action)

---

**🎉 CI/CD Setup Complete!**

Your edge functions will now automatically deploy on every push to develop (staging) and main (production) branches.

