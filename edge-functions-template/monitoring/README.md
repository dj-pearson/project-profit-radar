# Monitoring Stack for Edge Functions

Complete observability stack with Prometheus, Grafana, Loki, and AlertManager.

## 🚀 Quick Start

```bash
# Start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Access Grafana
open http://localhost:3000
# Default credentials: admin / admin
```

## 📊 Components

### Prometheus (Port 9090)
**Metrics collection and storage**

- Scrapes metrics from edge functions every 15s
- Stores time-series data for 30 days
- Query interface at http://localhost:9090

**Configuration:** `prometheus/prometheus.yml`

### Grafana (Port 3000)
**Visualization and dashboards**

- Pre-configured dashboards
- Alert visualization
- Log explorer integration
- Datasources auto-configured

**Access:** http://localhost:3000 (admin/admin)

**Dashboards:** 
- Edge Functions Overview
- Performance Metrics
- Error Tracking
- Resource Utilization

**Configuration:** `grafana/provisioning/`

### Loki (Port 3100)
**Log aggregation**

- Collects logs from all containers
- Indexed for fast queries
- 7-day retention by default

**Configuration:** `loki/loki-config.yml`

### Promtail
**Log collection agent**

- Scrapes Docker container logs
- Parses and labels logs
- Sends to Loki

**Configuration:** `promtail/promtail-config.yml`

### AlertManager (Port 9093)
**Alert routing and notifications**

- Routes alerts to Slack, email, PagerDuty
- Alert grouping and deduplication
- Silence management

**Access:** http://localhost:9093

**Configuration:** `alertmanager/alertmanager.yml`

### Node Exporter (Port 9100)
**System metrics**

- CPU, memory, disk usage
- Network statistics
- System load

### cAdvisor (Port 8080)
**Container metrics**

- Per-container resource usage
- Container lifecycle events
- Performance statistics

## 📈 Metrics Available

### Edge Functions Metrics
```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# Latency (p95)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Active functions
count(up{job="edge-functions"})
```

### System Metrics
```promql
# CPU usage
rate(container_cpu_usage_seconds_total{name="edge-functions"}[5m])

# Memory usage
container_memory_usage_bytes{name="edge-functions"}

# Disk I/O
rate(container_fs_reads_bytes_total[5m])
```

## 🚨 Alert Rules

### Critical Alerts
- **EdgeFunctionsDown** - Service is unreachable
- **HealthCheckFailing** - Health endpoint failing

### Warning Alerts
- **HighErrorRate** - Error rate >5%
- **HighLatency** - p95 latency >2s
- **HighMemoryUsage** - Memory >90%
- **HighCPUUsage** - CPU >90%
- **LowDiskSpace** - Disk <10% free
- **FrequentRestarts** - Container restarting frequently

**Configuration:** `prometheus/rules/edge-functions-alerts.yml`

## 🔧 Configuration

### Change Retention Period

**Prometheus** (default: 30 days)
```yaml
# docker-compose.monitoring.yml
command:
  - '--storage.tsdb.retention.time=60d'  # 60 days
```

**Loki** (default: 7 days)
```yaml
# loki/loki-config.yml
limits_config:
  retention_period: 336h  # 14 days
```

### Add Slack Notifications

Edit `alertmanager/alertmanager.yml`:
```yaml
global:
  slack_api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'

receivers:
  - name: 'slack'
    slack_configs:
      - channel: '#alerts'
        send_resolved: true
```

### Add Email Notifications

Edit `alertmanager/alertmanager.yml`:
```yaml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@yourdomain.com'
  smtp_auth_username: 'your-email@gmail.com'
  smtp_auth_password: 'your-app-password'

receivers:
  - name: 'email'
    email_configs:
      - to: 'team@yourdomain.com'
```

### Customize Dashboards

1. Access Grafana: http://localhost:3000
2. Navigate to dashboard
3. Click "Dashboard settings" → "JSON Model"
4. Edit and save
5. Export JSON to `grafana/dashboards/`

## 📊 Using Grafana

### View Edge Functions Dashboard

1. Go to http://localhost:3000
2. Login: admin / admin
3. Dashboards → Edge Functions

### Explore Logs

1. Click "Explore" (compass icon)
2. Select "Loki" datasource
3. Query logs:
   ```logql
   {job="edge-functions"}
   ```
4. Filter by function:
   ```logql
   {job="edge-functions", function="ai-content-generator"}
   ```

### Create Alerts in Grafana

1. Open dashboard panel
2. Click "Edit"
3. Go to "Alert" tab
4. Configure conditions
5. Save

## 🔍 Common Queries

### Prometheus Queries

**Top 5 slowest functions:**
```promql
topk(5, 
  histogram_quantile(0.95, 
    rate(http_request_duration_seconds_bucket[5m])
  )
)
```

**Functions with errors:**
```promql
sum by (function) (
  rate(http_requests_total{status=~"5.."}[5m])
)
```

**Memory usage by container:**
```promql
container_memory_usage_bytes{name=~".*edge.*"}
```

### Loki Queries

**All errors:**
```logql
{job="edge-functions"} |= "error" or "Error" or "ERROR"
```

**Function execution logs:**
```logql
{job="edge-functions"} | json | function="ai-content-generator"
```

**Slow requests (>2s):**
```logql
{job="edge-functions"} | json | duration > 2000
```

## 🐛 Troubleshooting

### Prometheus Not Scraping

```bash
# Check Prometheus targets
curl http://localhost:9090/targets

# Check if edge functions are reachable
curl http://edge-functions:8000/_health
```

### Grafana Can't Connect to Datasources

```bash
# Check network connectivity
docker exec grafana ping prometheus
docker exec grafana ping loki

# Restart Grafana
docker-compose -f docker-compose.monitoring.yml restart grafana
```

### Loki Not Receiving Logs

```bash
# Check Promtail status
docker logs promtail

# Test Loki API
curl http://localhost:3100/ready
```

### Alerts Not Firing

```bash
# Check AlertManager status
curl http://localhost:9093/api/v1/status

# Check Prometheus alert rules
curl http://localhost:9090/api/v1/rules

# View AlertManager logs
docker logs alertmanager
```

## 📁 Directory Structure

```
monitoring/
├── prometheus/
│   ├── prometheus.yml           # Main config
│   └── rules/
│       └── edge-functions-alerts.yml  # Alert rules
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/
│   │   │   └── datasources.yml  # Auto-configure datasources
│   │   └── dashboards/
│   │       └── dashboards.yml   # Dashboard provider
│   └── dashboards/
│       └── edge-functions.json  # Main dashboard
├── loki/
│   └── loki-config.yml          # Loki config
├── promtail/
│   └── promtail-config.yml      # Log collection config
└── alertmanager/
    └── alertmanager.yml         # Alert routing config
```

## 🎯 Best Practices

1. **Set up alerts immediately**
   - Configure Slack/email early
   - Test alerts to ensure they work
   
2. **Regular dashboard reviews**
   - Check metrics daily
   - Look for trends and anomalies
   
3. **Log retention**
   - Adjust based on compliance needs
   - Balance storage costs vs. retention
   
4. **Alert fatigue**
   - Fine-tune alert thresholds
   - Use alert grouping and inhibition
   
5. **Backup configurations**
   - Version control monitoring configs
   - Document custom dashboards

## 🚀 Advanced Usage

### Add Custom Metrics

In your edge function:
```typescript
// Export metrics endpoint
Deno.serve(async (req) => {
  if (req.url.endsWith('/metrics')) {
    return new Response(
      `# HELP my_metric Description\n` +
      `# TYPE my_metric counter\n` +
      `my_metric{label="value"} 42\n`,
      { headers: { 'Content-Type': 'text/plain' } }
    );
  }
  // ... rest of function
});
```

### Distributed Tracing

Add OpenTelemetry (future enhancement):
```typescript
import { trace } from 'https://deno.land/x/opentelemetry@1.0.0/mod.ts';

const span = trace.startSpan('function-execution');
// ... your code
span.end();
```

### Multi-Cluster Monitoring

For multiple edge function deployments:
```yaml
# prometheus.yml
global:
  external_labels:
    cluster: 'us-east-1'
    environment: 'production'
```

## 📚 Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Loki Documentation](https://grafana.com/docs/loki/)
- [PromQL Cheat Sheet](https://promlabs.com/promql-cheat-sheet/)
- [LogQL Cheat Sheet](https://grafana.com/docs/loki/latest/logql/)

---

**🎉 Happy Monitoring!**

