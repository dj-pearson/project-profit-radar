# Cloudflare Pages Security Configuration

This document provides instructions for configuring security headers and settings in Cloudflare Pages to complement the application-level security measures.

## Required Security Headers

Add these headers in **Cloudflare Pages** > **Settings** > **Functions** > **Custom Headers**:

### 1. HTTP Strict Transport Security (HSTS)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Purpose:** Forces HTTPS connections for 1 year, includes all subdomains

### 2. Content Security Policy (CSP)

**Production:**
```
Content-Security-Policy: default-src 'self'; script-src 'self' https://api.ipify.org https://*.posthog.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://api.ipify.org https://*.supabase.co https://*.posthog.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests;
```

**Development/Preview:**
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.ipify.org https://*.posthog.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://api.ipify.org https://*.supabase.co https://*.posthog.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;
```

### 3. X-Frame-Options

```
X-Frame-Options: DENY
```

**Purpose:** Prevents clickjacking by disallowing iframe embedding

### 4. X-Content-Type-Options

```
X-Content-Type-Options: nosniff
```

**Purpose:** Prevents MIME-sniffing attacks

### 5. X-XSS-Protection

```
X-XSS-Protection: 1; mode=block
```

**Purpose:** Enables browser XSS protection (legacy browsers)

### 6. Referrer-Policy

```
Referrer-Policy: strict-origin-when-cross-origin
```

**Purpose:** Controls referrer information sent with requests

### 7. Permissions-Policy

```
Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()
```

**Purpose:** Restricts access to browser features and APIs

## Cloudflare WAF (Web Application Firewall)

### Recommended Rules

1. **Enable OWASP Core Ruleset**
   - Path: Security > WAF > Managed Rules
   - Enable: OWASP ModSecurity Core Rule Set

2. **Rate Limiting Rules**

   **Login Protection:**
   ```
   (http.request.uri.path contains "/auth" and http.request.method eq "POST")
   Rate: 5 requests per 1 minute
   Action: Block for 10 minutes
   ```

   **API Protection:**
   ```
   (http.request.uri.path contains "/api/" and http.request.method in {"POST" "PUT" "DELETE"})
   Rate: 100 requests per 1 minute
   Action: Challenge
   ```

   **General Protection:**
   ```
   (true)
   Rate: 1000 requests per 1 minute
   Action: Challenge
   ```

3. **Geographic Restrictions** (Optional)
   - Block traffic from countries with no business presence
   - Recommend: Allow US, Canada, UK, EU

4. **Bot Management**
   - Enable: Bot Fight Mode (Free)
   - Or: Super Bot Fight Mode (Pro+)

## Page Rules

### 1. Always Use HTTPS

```
URL: http://*build-desk.com/*
Setting: Always Use HTTPS
```

### 2. Security Level

```
URL: *build-desk.com/*
Setting: Security Level = High
```

### 3. Browser Integrity Check

```
URL: *build-desk.com/*
Setting: Browser Integrity Check = On
```

## DDoS Protection

Cloudflare automatically provides:
- ✅ L3/L4 DDoS protection (all plans)
- ✅ L7 DDoS protection (all plans)
- ✅ Advanced DDoS protection (automatic)

**Recommended Settings:**
- Security Level: High
- Challenge Passage: 30 minutes
- Browser Integrity Check: ON

## SSL/TLS Configuration

### Recommended Settings

1. **SSL/TLS Encryption Mode**
   - Setting: Full (strict)
   - Validates origin server certificate

2. **Minimum TLS Version**
   - Setting: TLS 1.2 minimum
   - TLS 1.3 recommended

3. **Opportunistic Encryption**
   - Setting: ON
   - Enables HTTP/2 and HTTP/3

4. **TLS 1.3**
   - Setting: ON
   - Better performance and security

5. **Automatic HTTPS Rewrites**
   - Setting: ON
   - Converts HTTP links to HTTPS

6. **Certificate Transparency Monitoring**
   - Setting: ON
   - Alerts for certificate issues

## Firewall Rules

### Custom Firewall Rules

**1. Block Known Malicious IPs:**
```
(ip.geoip.country in {"CN" "RU" "KP"} and not cf.threat_score le 10)
Action: Block
```

**2. Challenge Suspicious Traffic:**
```
(cf.threat_score gt 14)
Action: Managed Challenge
```

**3. Block Common Attack Patterns:**
```
(http.request.uri.path contains "wp-admin" or http.request.uri.path contains "phpMyAdmin" or http.request.uri.path contains ".env" or http.request.uri.path contains ".git")
Action: Block
```

**4. Require CAPTCHA for Admin Routes:**
```
(http.request.uri.path contains "/admin" and not cf.client.bot)
Action: Managed Challenge
```

## Environment Variables

Set these in Cloudflare Pages environment variables:

### Production
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-production-key
ENVIRONMENT=production
NODE_ENV=production
```

### Preview/Staging
```
VITE_SUPABASE_URL=https://your-staging-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-staging-key
ENVIRONMENT=staging
NODE_ENV=development
```

### Security-Specific
```
ENABLE_CSP_REPORTING=true
CSP_REPORT_URI=https://your-csp-reporting-endpoint.com/report
```

## Cache Configuration

### Cache Rules

**1. Cache Static Assets:**
```
URL: *build-desk.com/*.{css,js,jpg,png,gif,ico,woff,woff2}
Cache Level: Cache Everything
Edge Cache TTL: 1 month
Browser Cache TTL: 1 week
```

**2. Don't Cache API Routes:**
```
URL: *build-desk.com/api/*
Cache Level: Bypass
```

**3. Don't Cache Auth Routes:**
```
URL: *build-desk.com/auth*
Cache Level: Bypass
```

## Security Monitoring

### Recommended Tools

1. **Cloudflare Analytics**
   - Monitor: Security events
   - Track: Blocked requests, challenges served
   - Alert: Unusual traffic patterns

2. **Security Events**
   - Enable: Security Event Logging
   - Export: To SIEM tool (optional)

3. **Rate Limiting Analytics**
   - Monitor: Rate limit hits
   - Adjust: Thresholds based on traffic

## Access Control (Cloudflare Access)

For admin routes, consider Cloudflare Access:

```
Application: BuildDesk Admin
Domain: build-desk.com/admin
Policies:
  - Email domain: @yourdomain.com
  - MFA: Required
  - Session duration: 8 hours
```

## DNS Security

### DNSSEC
```
Status: Enabled
DS Records: Published
```

### DNS Records
```
A     @              <Cloudflare IP>  Proxied
AAAA  @              <Cloudflare IP>  Proxied
CNAME www            build-desk.com   Proxied
TXT   @              v=spf1 -all
TXT   _dmarc         v=DMARC1; p=reject; rua=mailto:dmarc@yourdomain.com
```

## Compliance

### PCI-DSS
- ✅ TLS 1.2+
- ✅ HSTS enabled
- ✅ No card data stored (Stripe handles)

### GDPR
- ✅ Data encryption in transit (HTTPS)
- ✅ Privacy-respecting analytics
- ⚠️ Configure data retention in Cloudflare Logs

### SOC 2
- ✅ Access logging enabled
- ✅ DDoS protection
- ✅ WAF enabled

## Testing & Validation

### Security Headers Check
```bash
curl -I https://build-desk.com | grep -i "strict-transport\|content-security\|x-frame\|x-content-type"
```

### SSL Labs Test
- URL: https://www.ssllabs.com/ssltest/analyze.html?d=build-desk.com
- Target Grade: A+

### Security Headers Test
- URL: https://securityheaders.com/?q=build-desk.com
- Target Grade: A+

### CSP Test
- URL: https://csp-evaluator.withgoogle.com/
- Paste your CSP policy

## Deployment Checklist

Before deploying security changes:

- [ ] Test CSP in development environment
- [ ] Verify HSTS doesn't break preview URLs
- [ ] Test rate limiting thresholds
- [ ] Verify API endpoints still accessible
- [ ] Test authentication flow
- [ ] Check third-party integrations (Stripe, PostHog)
- [ ] Monitor error rates after deployment
- [ ] Review Cloudflare analytics for 24 hours

## Incident Response

### High Traffic Alert
1. Check Cloudflare Analytics > Security
2. Review blocked requests
3. Adjust rate limits if needed
4. Enable "I'm Under Attack" mode if DDoS

### False Positives
1. Check Firewall Events
2. Identify legitimate traffic blocked
3. Create exception rule
4. Monitor for 24 hours

### Security Breach
1. Enable "I'm Under Attack" mode
2. Review access logs
3. Rotate API keys/secrets
4. Force logout all users (Supabase)
5. Document incident
6. Notify affected users (GDPR)

## Support Resources

- Cloudflare Docs: https://developers.cloudflare.com/
- Security Headers: https://securityheaders.com/
- CSP Evaluator: https://csp-evaluator.withgoogle.com/
- SSL Labs: https://www.ssllabs.com/

---

**Last Updated:** 2025-11-09
**Maintained By:** Security Team
**Review Frequency:** Monthly
