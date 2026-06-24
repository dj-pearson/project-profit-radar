# Documentation Index

Complete guide to all documentation for self-hosted Supabase Edge Functions deployment.

## 🎯 Start Here

| Document | Purpose | Time | Audience |
|----------|---------|------|----------|
| **[../EDGE_FUNCTIONS_SETUP_COMPLETE.md](../EDGE_FUNCTIONS_SETUP_COMPLETE.md)** | Overview of everything created | 10 min | Everyone |
| **[QUICKSTART.md](./QUICKSTART.md)** | Get running in 15 minutes | 5 min | Developers |
| **[START_HERE.md](./START_HERE.md)** | Template introduction | 5 min | First-time users |

## 📚 Main Documentation

### Deployment Guides

| Document | Purpose | Time | When to Use |
|----------|---------|------|-------------|
| **[QUICKSTART.md](./QUICKSTART.md)** | Fast setup for development | 5 min | First deployment, local testing |
| **[COMPLETE_DEPLOYMENT_GUIDE.md](./COMPLETE_DEPLOYMENT_GUIDE.md)** | Comprehensive production guide | 30 min | Production deployment, troubleshooting |
| **[DEPLOYMENT.md](./DEPLOYMENT.md)** | Platform-specific deployment | 15 min | Deploying to Coolify, Railway, Fly.io |
| **[MIGRATION_FROM_CLOUD.md](./MIGRATION_FROM_CLOUD.md)** | Migrate from Supabase Cloud | 45 min | Moving from cloud to self-hosted |
| **[DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md)** | Infrastructure overview | 10 min | Understanding the architecture |

### Technical Documentation

| Document | Purpose | Time | When to Use |
|----------|---------|------|-------------|
| **[README.md](./README.md)** | Features and architecture | 15 min | Understanding capabilities |
| **[TEMPLATE_INFO.md](./TEMPLATE_INFO.md)** | Template structure | 10 min | Customizing the template |
| **[monitoring/README.md](./monitoring/README.md)** | Monitoring stack guide | 20 min | Setting up observability |
| **[../.github/GITHUB_ACTIONS_SETUP.md](../.github/GITHUB_ACTIONS_SETUP.md)** | CI/CD configuration | 25 min | Automating deployments |

## 🗂️ Documentation by Task

### I want to...

#### Get Started Quickly
1. Read: [QUICKSTART.md](./QUICKSTART.md)
2. Run: `.\deploy-functions.ps1`
3. Run: `docker-compose up`
4. Test: `curl http://localhost:8000/_health`

#### Deploy to Production
1. Read: [COMPLETE_DEPLOYMENT_GUIDE.md](./COMPLETE_DEPLOYMENT_GUIDE.md)
2. Follow: [Production Deployment](./COMPLETE_DEPLOYMENT_GUIDE.md#docker-deployment) section
3. Configure: [Monitoring Setup](./COMPLETE_DEPLOYMENT_GUIDE.md#monitoring-setup)
4. Review: [Production Checklist](./COMPLETE_DEPLOYMENT_GUIDE.md#production-checklist)

#### Migrate from Cloud Supabase
1. Read: [MIGRATION_FROM_CLOUD.md](./MIGRATION_FROM_CLOUD.md)
2. Follow: Phase-by-phase migration plan
3. Review: [Rollback Procedures](./MIGRATION_FROM_CLOUD.md#rollback-procedures)
4. Track: [Success Metrics](./MIGRATION_FROM_CLOUD.md#success-metrics)

#### Set Up Monitoring
1. Read: [monitoring/README.md](./monitoring/README.md)
2. Run: `docker-compose -f docker-compose.monitoring.yml up -d`
3. Access: Grafana at http://localhost:3000
4. Configure: [Alert Rules](./monitoring/README.md#alert-rules)

#### Automate Deployments
1. Read: [../.github/GITHUB_ACTIONS_SETUP.md](../.github/GITHUB_ACTIONS_SETUP.md)
2. Configure: [GitHub Secrets](../.github/GITHUB_ACTIONS_SETUP.md#required-secrets)
3. Set up: [Server Prerequisites](../.github/GITHUB_ACTIONS_SETUP.md#server-setup)
4. Test: [Workflow Testing](../.github/GITHUB_ACTIONS_SETUP.md#testing-the-workflow)

#### Troubleshoot Issues
1. Check: [COMPLETE_DEPLOYMENT_GUIDE.md - Troubleshooting](./COMPLETE_DEPLOYMENT_GUIDE.md#troubleshooting)
2. Review: [monitoring/README.md - Troubleshooting](./monitoring/README.md#troubleshooting)
3. Check: [Common Issues](./QUICKSTART.md#common-issues)

## 📖 Documentation by Role

### Developers

**Essential Reading:**
1. [QUICKSTART.md](./QUICKSTART.md) - Get development environment running
2. [README.md](./README.md) - Understand architecture and features
3. [COMPLETE_DEPLOYMENT_GUIDE.md - Function Deployment](./COMPLETE_DEPLOYMENT_GUIDE.md#function-deployment)

**Optional:**
- [TEMPLATE_INFO.md](./TEMPLATE_INFO.md) - Customizing functions
- [monitoring/README.md](./monitoring/README.md) - Understanding metrics

### DevOps Engineers

**Essential Reading:**
1. [COMPLETE_DEPLOYMENT_GUIDE.md](./COMPLETE_DEPLOYMENT_GUIDE.md) - Full deployment process
2. [monitoring/README.md](./monitoring/README.md) - Monitoring infrastructure
3. [../.github/GITHUB_ACTIONS_SETUP.md](../.github/GITHUB_ACTIONS_SETUP.md) - CI/CD pipeline

**Optional:**
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Platform-specific deployments
- [MIGRATION_FROM_CLOUD.md](./MIGRATION_FROM_CLOUD.md) - Migration strategies

### Project Managers

**Essential Reading:**
1. [../EDGE_FUNCTIONS_SETUP_COMPLETE.md](../EDGE_FUNCTIONS_SETUP_COMPLETE.md) - Project overview
2. [DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md) - Infrastructure summary
3. [MIGRATION_FROM_CLOUD.md - Migration Timeline](./MIGRATION_FROM_CLOUD.md#phase-1-preparation-week-1)

**Optional:**
- [COMPLETE_DEPLOYMENT_GUIDE.md - Production Checklist](./COMPLETE_DEPLOYMENT_GUIDE.md#production-checklist)

### System Administrators

**Essential Reading:**
1. [COMPLETE_DEPLOYMENT_GUIDE.md](./COMPLETE_DEPLOYMENT_GUIDE.md) - Infrastructure setup
2. [monitoring/README.md](./monitoring/README.md) - Monitoring and alerts
3. [../.github/GITHUB_ACTIONS_SETUP.md - Server Setup](../.github/GITHUB_ACTIONS_SETUP.md#server-setup)

**Optional:**
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Platform configurations

## 🔧 Scripts & Tools Documentation

### Deployment Scripts

| Script | Platform | Purpose | Documentation |
|--------|----------|---------|---------------|
| `deploy-functions.ps1` | Windows | Copy functions to template | [Usage](./COMPLETE_DEPLOYMENT_GUIDE.md#function-deployment) |
| `deploy-functions.sh` | Linux/Mac | Copy functions to template | [Usage](./COMPLETE_DEPLOYMENT_GUIDE.md#function-deployment) |
| `build.ps1` | Windows | Build Docker images | [Usage](./COMPLETE_DEPLOYMENT_GUIDE.md#production-build) |
| `build.sh` | Linux/Mac | Build Docker images | [Usage](./COMPLETE_DEPLOYMENT_GUIDE.md#production-build) |
| `env-setup.ps1` | Windows | Manage environments | [Usage](./COMPLETE_DEPLOYMENT_GUIDE.md#environment-configuration) |
| `env-setup.sh` | Linux/Mac | Manage environments | [Usage](./COMPLETE_DEPLOYMENT_GUIDE.md#environment-configuration) |

### Usage Examples

```powershell
# Deploy functions
.\deploy-functions.ps1 -Clean

# Build image
.\build.ps1 -Tag v1.0.0 -Push

# Configure environment
.\env-setup.ps1 -Environment production -Validate -Export
```

## 📁 Configuration Files

### Docker Configuration

| File | Purpose | Documentation |
|------|---------|---------------|
| `Dockerfile` | Development image | [README.md](./README.md) |
| `Dockerfile.production` | Production image | [COMPLETE_DEPLOYMENT_GUIDE.md](./COMPLETE_DEPLOYMENT_GUIDE.md) |
| `docker-compose.yml` | Development stack | [QUICKSTART.md](./QUICKSTART.md) |
| `docker-compose.production.yml` | Production stack | [COMPLETE_DEPLOYMENT_GUIDE.md](./COMPLETE_DEPLOYMENT_GUIDE.md) |
| `docker-compose.monitoring.yml` | Monitoring stack | [monitoring/README.md](./monitoring/README.md) |
| `.dockerignore` | Build exclusions | - |

### Monitoring Configuration

| File | Purpose | Documentation |
|------|---------|---------------|
| `monitoring/prometheus/prometheus.yml` | Metrics collection | [monitoring/README.md](./monitoring/README.md) |
| `monitoring/prometheus/rules/*.yml` | Alert rules | [monitoring/README.md](./monitoring/README.md) |
| `monitoring/grafana/dashboards/*.json` | Dashboards | [monitoring/README.md](./monitoring/README.md) |
| `monitoring/loki/loki-config.yml` | Log aggregation | [monitoring/README.md](./monitoring/README.md) |
| `monitoring/alertmanager/alertmanager.yml` | Alert routing | [monitoring/README.md](./monitoring/README.md) |

### CI/CD Configuration

| File | Purpose | Documentation |
|------|---------|---------------|
| `.github/workflows/edge-functions-deploy.yml` | Deployment workflow | [../.github/GITHUB_ACTIONS_SETUP.md](../.github/GITHUB_ACTIONS_SETUP.md) |

## 🎓 Learning Paths

### Path 1: Local Development (Day 1)
1. [QUICKSTART.md](./QUICKSTART.md)
2. [README.md](./README.md)
3. Deploy and test locally
4. Experiment with functions

### Path 2: Production Deployment (Week 1)
1. [COMPLETE_DEPLOYMENT_GUIDE.md](./COMPLETE_DEPLOYMENT_GUIDE.md)
2. [monitoring/README.md](./monitoring/README.md)
3. [Production Checklist](./COMPLETE_DEPLOYMENT_GUIDE.md#production-checklist)
4. Deploy to production

### Path 3: CI/CD Setup (Week 2)
1. [../.github/GITHUB_ACTIONS_SETUP.md](../.github/GITHUB_ACTIONS_SETUP.md)
2. Configure GitHub secrets
3. Test workflow
4. Automate deployments

### Path 4: Cloud Migration (Month 1)
1. [MIGRATION_FROM_CLOUD.md](./MIGRATION_FROM_CLOUD.md)
2. Export cloud data
3. Parallel deployment
4. Complete migration

## 🔍 Quick Reference

### Common Commands

```bash
# Development
docker-compose up
docker-compose logs -f
curl http://localhost:8000/_health

# Production
docker-compose -f docker-compose.production.yml up -d
docker-compose -f docker-compose.production.yml ps
docker-compose -f docker-compose.production.yml logs -f

# Monitoring
docker-compose -f docker-compose.monitoring.yml up -d
open http://localhost:3000  # Grafana
open http://localhost:9090  # Prometheus

# Deployment
.\deploy-functions.ps1
.\build.ps1 -Tag v1.0.0
```

### Important URLs

| Service | Development | Production |
|---------|-------------|------------|
| Edge Functions | http://localhost:8000 | https://api.yourdomain.com |
| Health Check | http://localhost:8000/_health | https://api.yourdomain.com/_health |
| Grafana | http://localhost:3000 | https://grafana.yourdomain.com |
| Prometheus | http://localhost:9090 | https://prometheus.yourdomain.com |

## 📞 Getting Help

### Check Documentation
1. Find your task in "Documentation by Task" above
2. Follow the recommended reading
3. Review troubleshooting sections

### Common Issues
- [Troubleshooting Guide](./COMPLETE_DEPLOYMENT_GUIDE.md#troubleshooting)
- [Monitoring Troubleshooting](./monitoring/README.md#troubleshooting)
- [CI/CD Troubleshooting](../.github/GITHUB_ACTIONS_SETUP.md#troubleshooting)

### Additional Resources
- [Supabase Documentation](https://supabase.com/docs)
- [Deno Manual](https://deno.land/manual)
- [Docker Documentation](https://docs.docker.com)

---

## 📊 Documentation Statistics

- **Total Documents:** 11
- **Total Reading Time:** ~3-4 hours (comprehensive)
- **Quick Start Time:** 15 minutes
- **Languages:** PowerShell, Bash, Docker, YAML, Markdown
- **Last Updated:** December 2025

---

**💡 Tip:** Bookmark this page and use it as your navigation hub for all edge functions documentation!

