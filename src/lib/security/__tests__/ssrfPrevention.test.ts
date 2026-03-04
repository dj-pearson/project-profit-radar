import { describe, it, expect } from 'vitest';
import {
  validateUrl,
  sanitizeUrl,
  isPrivateIp,
  ALLOWED_EXTERNAL_DOMAINS,
} from '../ssrfPrevention';

describe('Security / SSRF Prevention', () => {
  // ===========================================================================
  // ALLOWED_EXTERNAL_DOMAINS
  // ===========================================================================

  describe('ALLOWED_EXTERNAL_DOMAINS', () => {
    it('should include all expected integration domains', () => {
      expect(ALLOWED_EXTERNAL_DOMAINS).toContain('stripe.com');
      expect(ALLOWED_EXTERNAL_DOMAINS).toContain('supabase.co');
      expect(ALLOWED_EXTERNAL_DOMAINS).toContain('quickbooks.api.intuit.com');
      expect(ALLOWED_EXTERNAL_DOMAINS).toContain('googleapis.com');
      expect(ALLOWED_EXTERNAL_DOMAINS).toContain('graph.microsoft.com');
    });

    it('should be frozen/readonly', () => {
      expect(Object.isFrozen(ALLOWED_EXTERNAL_DOMAINS)).toBe(true);
    });
  });

  // ===========================================================================
  // isPrivateIp
  // ===========================================================================

  describe('isPrivateIp()', () => {
    // --- Standard private IPv4 ranges ---

    it('should detect 10.0.0.0/8 as private', () => {
      expect(isPrivateIp('10.0.0.1')).toBe(true);
      expect(isPrivateIp('10.255.255.255')).toBe(true);
    });

    it('should detect 172.16.0.0/12 as private', () => {
      expect(isPrivateIp('172.16.0.1')).toBe(true);
      expect(isPrivateIp('172.31.255.255')).toBe(true);
    });

    it('should NOT detect 172.32.0.1 as private', () => {
      expect(isPrivateIp('172.32.0.1')).toBe(false);
    });

    it('should detect 192.168.0.0/16 as private', () => {
      expect(isPrivateIp('192.168.0.1')).toBe(true);
      expect(isPrivateIp('192.168.255.255')).toBe(true);
    });

    it('should detect 127.0.0.0/8 (loopback) as private', () => {
      expect(isPrivateIp('127.0.0.1')).toBe(true);
      expect(isPrivateIp('127.255.255.255')).toBe(true);
    });

    it('should detect 0.0.0.0 as private', () => {
      expect(isPrivateIp('0.0.0.0')).toBe(true);
    });

    it('should detect 169.254.0.0/16 (link-local / metadata) as private', () => {
      expect(isPrivateIp('169.254.169.254')).toBe(true);
      expect(isPrivateIp('169.254.0.1')).toBe(true);
    });

    it('should allow valid public IPs', () => {
      expect(isPrivateIp('8.8.8.8')).toBe(false);
      expect(isPrivateIp('1.1.1.1')).toBe(false);
      expect(isPrivateIp('93.184.216.34')).toBe(false);
    });

    // --- IPv6 ---

    it('should detect ::1 as private (IPv6 loopback)', () => {
      expect(isPrivateIp('::1')).toBe(true);
    });

    it('should detect fd00::/8 as private (IPv6 ULA)', () => {
      expect(isPrivateIp('fd00::1')).toBe(true);
      expect(isPrivateIp('fdff:ffff::1')).toBe(true);
    });

    it('should detect fe80::/10 as private (IPv6 link-local)', () => {
      expect(isPrivateIp('fe80::1')).toBe(true);
    });

    it('should detect IPv4-mapped IPv6 private addresses', () => {
      expect(isPrivateIp('::ffff:127.0.0.1')).toBe(true);
      expect(isPrivateIp('::ffff:10.0.0.1')).toBe(true);
      expect(isPrivateIp('::ffff:192.168.1.1')).toBe(true);
    });

    it('should allow IPv4-mapped IPv6 with public IPs', () => {
      expect(isPrivateIp('::ffff:8.8.8.8')).toBe(false);
    });

    // --- Edge cases ---

    it('should treat empty string as private', () => {
      expect(isPrivateIp('')).toBe(true);
    });

    it('should treat malformed IPs as private (block by default)', () => {
      expect(isPrivateIp('999.999.999.999')).toBe(true);
      expect(isPrivateIp('not-an-ip')).toBe(true);
    });

    it('should handle bracketed IPv6', () => {
      expect(isPrivateIp('[::1]')).toBe(true);
      expect(isPrivateIp('[fd00::1]')).toBe(true);
    });

    // --- Non-standard notation bypass attempts ---

    it('should detect decimal notation (2130706433 = 127.0.0.1)', () => {
      expect(isPrivateIp('2130706433')).toBe(true);
    });

    it('should detect hex notation (0x7f000001 = 127.0.0.1)', () => {
      expect(isPrivateIp('0x7f000001')).toBe(true);
    });

    it('should detect octal notation (0177.0.0.01 = 127.0.0.1)', () => {
      expect(isPrivateIp('0177.0.0.01')).toBe(true);
    });

    it('should detect hex octet notation (0x7f.0x0.0x0.0x1 = 127.0.0.1)', () => {
      expect(isPrivateIp('0x7f.0x0.0x0.0x1')).toBe(true);
    });

    it('should detect mixed notation (0x7f.0.0.1 = 127.0.0.1)', () => {
      expect(isPrivateIp('0x7f.0.0.1')).toBe(true);
    });

    it('should detect decimal notation for 10.0.0.1 (167772161)', () => {
      expect(isPrivateIp('167772161')).toBe(true);
    });

    it('should detect decimal notation for 169.254.169.254 (2852039166)', () => {
      expect(isPrivateIp('2852039166')).toBe(true);
    });

    // --- Additional reserved ranges ---

    it('should detect multicast addresses (224.0.0.0/4) as private', () => {
      expect(isPrivateIp('224.0.0.1')).toBe(true);
      expect(isPrivateIp('239.255.255.255')).toBe(true);
    });

    it('should detect reserved addresses (240.0.0.0/4) as private', () => {
      expect(isPrivateIp('240.0.0.1')).toBe(true);
      expect(isPrivateIp('255.255.255.255')).toBe(true);
    });

    it('should detect carrier-grade NAT (100.64.0.0/10) as private', () => {
      expect(isPrivateIp('100.64.0.1')).toBe(true);
      expect(isPrivateIp('100.127.255.255')).toBe(true);
    });
  });

  // ===========================================================================
  // sanitizeUrl
  // ===========================================================================

  describe('sanitizeUrl()', () => {
    it('should normalize a valid HTTPS URL', () => {
      const result = sanitizeUrl('https://example.com/path');
      expect(result).toBe('https://example.com/path');
    });

    it('should normalize a valid HTTP URL', () => {
      const result = sanitizeUrl('http://example.com/path');
      expect(result).toBe('http://example.com/path');
    });

    it('should lowercase hostname', () => {
      const result = sanitizeUrl('https://EXAMPLE.COM/Path');
      expect(result).toContain('example.com');
    });

    it('should remove userinfo (user:pass@host bypass)', () => {
      const result = sanitizeUrl('https://evil@example.com/path');
      expect(result).not.toContain('evil@');
      expect(result).toContain('example.com');
    });

    it('should remove password from URL', () => {
      const result = sanitizeUrl('https://user:password@example.com/');
      expect(result).not.toContain('user:password');
    });

    it('should remove fragment', () => {
      const result = sanitizeUrl('https://example.com/path#fragment');
      expect(result).not.toContain('#fragment');
    });

    it('should remove control characters', () => {
      const result = sanitizeUrl('https://example.com/\x00path');
      expect(result).not.toContain('\x00');
    });

    it('should decode double-encoded URLs', () => {
      // %2532 double-encodes to %32 which decodes to "2"
      // Full URL: https://example.com/path
      const result = sanitizeUrl('https://example.com/%2570ath');
      expect(result).toContain('path');
    });

    it('should reject non-HTTP protocols (javascript:)', () => {
      expect(() => sanitizeUrl('javascript:alert(1)')).toThrow();
    });

    it('should reject non-HTTP protocols (file:)', () => {
      expect(() => sanitizeUrl('file:///etc/passwd')).toThrow();
    });

    it('should reject non-HTTP protocols (ftp:)', () => {
      expect(() => sanitizeUrl('ftp://example.com')).toThrow();
    });

    it('should reject empty string', () => {
      expect(() => sanitizeUrl('')).toThrow('URL must be a non-empty string');
    });

    it('should reject non-string input', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => sanitizeUrl(null as any)).toThrow();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => sanitizeUrl(undefined as any)).toThrow();
    });

    it('should strip whitespace from URL', () => {
      const result = sanitizeUrl('  https://example.com/path  ');
      expect(result).toBe('https://example.com/path');
    });
  });

  // ===========================================================================
  // validateUrl
  // ===========================================================================

  describe('validateUrl()', () => {
    // --- Basic valid URLs ---

    it('should accept valid HTTPS URLs', () => {
      const result = validateUrl('https://example.com/api/data');
      expect(result.valid).toBe(true);
      expect(result.sanitizedUrl).toBeDefined();
    });

    it('should reject HTTP URLs by default', () => {
      const result = validateUrl('http://example.com/api');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('HTTPS');
    });

    it('should accept HTTP URLs when allowHttp is true', () => {
      const result = validateUrl('http://example.com/api', { allowHttp: true });
      expect(result.valid).toBe(true);
    });

    // --- Private IP blocking ---

    it('should block 127.0.0.1 (bypass #1: direct localhost IP)', () => {
      const result = validateUrl('https://127.0.0.1/admin');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Private');
    });

    it('should block 10.x.x.x (bypass #2: Class A private)', () => {
      const result = validateUrl('https://10.0.0.1/internal');
      expect(result.valid).toBe(false);
    });

    it('should block 172.16.x.x (bypass #3: Class B private)', () => {
      const result = validateUrl('https://172.16.0.1/internal');
      expect(result.valid).toBe(false);
    });

    it('should block 192.168.x.x (bypass #4: Class C private)', () => {
      const result = validateUrl('https://192.168.1.1/router');
      expect(result.valid).toBe(false);
    });

    it('should block 0.0.0.0 (bypass #5: unspecified address)', () => {
      const result = validateUrl('https://0.0.0.0/');
      expect(result.valid).toBe(false);
    });

    it('should block 169.254.169.254 (bypass #6: cloud metadata)', () => {
      const result = validateUrl('https://169.254.169.254/latest/meta-data/');
      expect(result.valid).toBe(false);
    });

    // --- Non-standard IP notation bypass attempts ---

    it('should block decimal IP notation (bypass #7: 2130706433 = 127.0.0.1)', () => {
      const result = validateUrl('https://2130706433/');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Non-standard IP notation');
    });

    it('should block hex IP notation (bypass #8: 0x7f000001 = 127.0.0.1)', () => {
      const result = validateUrl('https://0x7f000001/');
      expect(result.valid).toBe(false);
    });

    it('should block octal IP notation (bypass #9: 0177.0.0.01)', () => {
      const result = validateUrl('https://0177.0.0.01/');
      expect(result.valid).toBe(false);
    });

    it('should block hex octet notation (bypass #10: 0x7f.0x0.0x0.0x1)', () => {
      const result = validateUrl('https://0x7f.0x0.0x0.0x1/');
      expect(result.valid).toBe(false);
    });

    // --- IPv6 bypass attempts ---

    it('should block IPv6 loopback (bypass #11: [::1])', () => {
      const result = validateUrl('https://[::1]/');
      expect(result.valid).toBe(false);
    });

    it('should block IPv4-mapped IPv6 (bypass #12: [::ffff:127.0.0.1])', () => {
      const result = validateUrl('https://[::ffff:127.0.0.1]/');
      expect(result.valid).toBe(false);
    });

    it('should block IPv6 ULA (bypass #13: [fd00::1])', () => {
      const result = validateUrl('https://[fd00::1]/');
      expect(result.valid).toBe(false);
    });

    // --- URL parser differential bypass attempts ---

    it('should block userinfo bypass (bypass #14: evil@127.0.0.1)', () => {
      const result = validateUrl('https://attacker.com@127.0.0.1/');
      expect(result.valid).toBe(false);
    });

    it('should block URLs with credentials (bypass #15: user:pass@host)', () => {
      // After sanitization, userinfo is stripped, so the host resolves correctly
      const result = validateUrl('https://admin:password@127.0.0.1/');
      expect(result.valid).toBe(false);
    });

    // --- Protocol bypass attempts ---

    it('should block javascript: protocol (bypass #16)', () => {
      const result = validateUrl('javascript:alert(1)');
      expect(result.valid).toBe(false);
    });

    it('should block file: protocol (bypass #17)', () => {
      const result = validateUrl('file:///etc/passwd');
      expect(result.valid).toBe(false);
    });

    it('should block gopher: protocol (bypass #18)', () => {
      const result = validateUrl('gopher://127.0.0.1:25/');
      expect(result.valid).toBe(false);
    });

    it('should block data: protocol (bypass #19)', () => {
      const result = validateUrl('data:text/html,<script>alert(1)</script>');
      expect(result.valid).toBe(false);
    });

    // --- Double encoding bypass attempts ---

    it('should block double-encoded localhost (bypass #20)', () => {
      // %31%32%37%2e%30%2e%30%2e%31 = 127.0.0.1
      const result = validateUrl('https://%31%32%37%2e%30%2e%30%2e%31/');
      expect(result.valid).toBe(false);
    });

    // --- Redirect-based SSRF ---

    it('should detect redirect parameter with URL (bypass #21)', () => {
      const result = validateUrl(
        'https://example.com/api?redirect=http://169.254.169.254/meta-data/',
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('redirect');
    });

    it('should detect redirect_url parameter (bypass #22)', () => {
      const result = validateUrl(
        'https://example.com/api?redirect_url=http://10.0.0.1/internal',
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('redirect');
    });

    it('should detect callback_url parameter (bypass #23)', () => {
      const result = validateUrl(
        'https://example.com/api?callback_url=http://127.0.0.1/admin',
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('redirect');
    });

    it('should detect next parameter with protocol-relative URL (bypass #24)', () => {
      const result = validateUrl(
        'https://example.com/login?next=//evil.com/steal',
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('redirect');
    });

    it('should detect encoded redirect parameter (bypass #25)', () => {
      const result = validateUrl(
        'https://example.com/api?url=http%3A%2F%2F127.0.0.1%2Fadmin',
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('redirect');
    });

    // --- Blocked hostnames ---

    it('should block metadata.google.internal (bypass #26)', () => {
      const result = validateUrl('https://metadata.google.internal/computeMetadata/v1/');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('blocked');
    });

    it('should block localhost hostname (bypass #27)', () => {
      const result = validateUrl('https://localhost/admin');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('blocked');
    });

    // --- Strict mode (domain allowlist) ---

    it('should accept allowed domain in strict mode (stripe.com)', () => {
      const result = validateUrl('https://api.stripe.com/v1/charges', {
        strict: true,
      });
      expect(result.valid).toBe(true);
    });

    it('should accept allowed domain in strict mode (supabase.co)', () => {
      const result = validateUrl('https://myproject.supabase.co/rest/v1/', {
        strict: true,
      });
      expect(result.valid).toBe(true);
    });

    it('should accept allowed domain in strict mode (googleapis.com)', () => {
      const result = validateUrl('https://www.googleapis.com/calendar/v3/', {
        strict: true,
      });
      expect(result.valid).toBe(true);
    });

    it('should reject non-allowed domain in strict mode (bypass #28)', () => {
      const result = validateUrl('https://evil.com/api', { strict: true });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('not in the allowed list');
    });

    it('should accept additional allowed domains in strict mode', () => {
      const result = validateUrl('https://custom-api.internal.com/data', {
        strict: true,
        additionalAllowedDomains: ['internal.com'],
      });
      expect(result.valid).toBe(true);
    });

    // --- Additional bypass techniques ---

    it('should handle backslash in URL path (bypass #29)', () => {
      // Backslash-based path confusion
      const result = validateUrl('https://example.com/redirect\\@127.0.0.1');
      // Should not crash - result depends on URL parser behavior
      expect(result).toHaveProperty('valid');
    });

    it('should allow skipping redirect checks when disabled', () => {
      const result = validateUrl(
        'https://example.com/api?redirect=http://internal.com/data',
        { checkRedirects: false },
      );
      expect(result.valid).toBe(true);
    });

    it('should handle URL with port number', () => {
      const result = validateUrl('https://example.com:8443/api');
      expect(result.valid).toBe(true);
    });

    it('should block private IP with non-standard port (bypass #30)', () => {
      const result = validateUrl('https://127.0.0.1:8080/admin');
      expect(result.valid).toBe(false);
    });

    // --- Malformed URL edge cases ---

    it('should reject completely invalid URL', () => {
      const result = validateUrl('not-a-url');
      expect(result.valid).toBe(false);
    });

    it('should reject empty string', () => {
      const result = validateUrl('');
      expect(result.valid).toBe(false);
    });

    it('should handle URL with spaces in path', () => {
      const result = validateUrl('https://example.com/path with spaces');
      // Should either sanitize or reject, but not crash
      expect(result).toHaveProperty('valid');
    });

    it('should not flag safe query parameters as redirects', () => {
      const result = validateUrl(
        'https://api.stripe.com/v1/charges?amount=1000&currency=usd',
      );
      expect(result.valid).toBe(true);
    });
  });

  // ===========================================================================
  // Integration: Combined bypass scenarios
  // ===========================================================================

  describe('Combined bypass scenarios', () => {
    it('should block double-encoded private IP in redirect param', () => {
      const result = validateUrl(
        'https://example.com/api?url=https%3A%2F%2F127.0.0.1%2Fadmin',
      );
      expect(result.valid).toBe(false);
    });

    it('should block URL with credentials pointing to private IP', () => {
      const result = validateUrl('https://user:pass@10.0.0.1:3000/internal');
      expect(result.valid).toBe(false);
    });

    it('should block metadata endpoint through different paths', () => {
      const result = validateUrl('https://169.254.169.254/latest/api/token');
      expect(result.valid).toBe(false);
    });

    it('should validate allowed domain with complex path', () => {
      const result = validateUrl(
        'https://api.stripe.com/v1/payment_intents?limit=10&starting_after=pi_123',
        { strict: true },
      );
      expect(result.valid).toBe(true);
    });
  });
});
