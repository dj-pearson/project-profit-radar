import { describe, it, expect } from 'vitest';
import {
  describeAuditUrl,
  BLOCKED_HOSTS,
} from '../../../../supabase/functions/_shared/audit-url-rules';

/**
 * US-241 / SSRF surface.
 *
 * Twelve SEO edge functions take a URL out of the request body and fetch it:
 * analyze-content, analyze-images, analyze-internal-links,
 * analyze-semantic-keywords, check-broken-links, check-mobile-first,
 * check-security-headers, monitor-performance-budget, optimize-page-content,
 * seo-audit, validate-structured-data and crawl-site. The only check any of
 * them made was `if (!url)`.
 *
 * All twelve enforce `role !== 'root_admin'` and return 403 - verified in each
 * file, not inferred from the word appearing - so this is an unvalidated fetch
 * behind the highest privilege level rather than an open SSRF. It still
 * matters: the edge runtime holds the service-role key, and manage-schedules
 * STORES a target_url that run-scheduled-audit fetches later, so one bad value
 * becomes a recurring request.
 */

describe('hosts an audit target may never be', () => {
  const BLOCKED = [
    ['http://169.254.169.254/latest/meta-data/', 'cloud metadata, the one that matters most'],
    ['http://localhost:8000/admin', 'loopback by name'],
    ['http://127.0.0.1/', 'loopback by address'],
    ['http://127.1.2.3/', 'the whole 127/8 block, not just .0.1'],
    ['http://10.0.0.5/internal', 'RFC1918 class A'],
    ['http://192.168.1.1/', 'RFC1918 class C'],
    ['http://172.16.0.1/', 'RFC1918 class B, low end'],
    ['http://172.31.255.255/', 'RFC1918 class B, high end'],
    ['http://[::1]/', 'IPv6 loopback'],
    ['http://[fd00::1]/', 'IPv6 unique-local'],
    ['http://db.internal/', '.internal'],
    ['http://printer.local/', '.local'],
    ['http://0.0.0.0/', 'the unspecified address'],
  ] as const;

  it.each(BLOCKED)('%s is refused (%s)', (url) => {
    expect(describeAuditUrl(url)).toMatch(/loopback, private or link-local/);
  });

  it('does not block 172.15 or 172.32, which are public', () => {
    // The RFC1918 class B range is 172.16-172.31. A regex of /^172\./ would be
    // wrong in the other direction and take real customer sites offline.
    expect(describeAuditUrl('https://172.15.0.1/')).toBeNull();
    expect(describeAuditUrl('https://172.32.0.1/')).toBeNull();
  });

  it('does not block a hostname that merely contains a blocked word', () => {
    expect(describeAuditUrl('https://localhost.example.com/')).toBeNull();
    expect(describeAuditUrl('https://internal-tools.example.com/')).toBeNull();
  });
});

describe('schemes and credentials', () => {
  it.each([
    'file:///etc/passwd',
    'gopher://example.com/',
    'data:text/html,<script>alert(1)</script>',
  ])('%s is refused for its scheme', (url) => {
    expect(describeAuditUrl(url)).toMatch(/is not fetchable/);
  });

  it('refuses credentials in the URL, which would be sent and then logged', () => {
    expect(describeAuditUrl('https://user:pass@example.com/')).toBe('must not carry credentials');
  });

  it('refuses anything that is not an absolute URL', () => {
    for (const v of ['/relative/path', 'example.com', '', 'not a url']) {
      expect(describeAuditUrl(v)).toBe('must be an absolute URL');
    }
  });
});

describe('ordinary audit targets still pass', () => {
  it.each([
    'https://brikly.net/',
    'https://www.example.com/pricing?utm_source=x',
    'http://example.co.uk/a/b/c',
    'https://example.com:8443/deep/path#frag',
  ])('%s is accepted', (url) => {
    expect(describeAuditUrl(url)).toBeNull();
  });
});

describe('the twelve callers actually use it', () => {
  const CALLERS = [
    'analyze-content',
    'analyze-images',
    'analyze-internal-links',
    'analyze-semantic-keywords',
    'check-broken-links',
    'check-mobile-first',
    'check-security-headers',
    'crawl-site',
    'monitor-performance-budget',
    'optimize-page-content',
    'seo-audit',
    'validate-structured-data',
  ] as const;

  it.each(CALLERS)('%s validates its body against a schema built on auditUrl', async (name) => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(`supabase/functions/${name}/index.ts`, 'utf8');
    expect(src).toContain("from \"../_shared/audit-url.ts\"");
    expect(src).toMatch(/await validateBody\(req, \w+Schema/);
    expect(src, 'the url field is not the shared one').toMatch(/(?:url|start_url): auditUrl/);
  });

  it('the blocklist is not empty, which is how this stops protecting silently', () => {
    expect(BLOCKED_HOSTS.length).toBeGreaterThanOrEqual(10);
  });
});
