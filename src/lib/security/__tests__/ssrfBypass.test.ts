import { describe, it, expect } from 'vitest';
import {
  validateUrl,
  sanitizeUrl,
  isPrivateIp,
  ALLOWED_EXTERNAL_DOMAINS,
} from '../ssrfPrevention';

// =============================================================================
// SSRF BYPASS ATTEMPTS
//
// A comprehensive catalog of known SSRF bypass techniques. Each entry includes
// a human-readable description so the list doubles as a living reference for
// security audits. Extend this array whenever new bypass vectors surface.
// =============================================================================

export const SSRF_BYPASSES: ReadonlyArray<{
  /** Short label for the bypass technique */
  label: string;
  /** Category of the bypass (used for grouping in tests) */
  category: string;
  /** The malicious URL or IP that should be blocked */
  input: string;
  /** What kind of check this exercises: 'url', 'ip', or 'both' */
  target: 'url' | 'ip' | 'both';
}> = [
  // ---------------------------------------------------------------------------
  // 1. DNS REBINDING
  // ---------------------------------------------------------------------------
  {
    label: 'DNS rebinding: localhost subdomain',
    category: 'dns-rebinding',
    input: 'https://localhost.attacker.com',
    target: 'url',
  },
  {
    label: 'DNS rebinding: 127.0.0.1 in subdomain',
    category: 'dns-rebinding',
    input: 'https://127.0.0.1.nip.io',
    target: 'url',
  },
  {
    label: 'DNS rebinding: spoofed DNS resolving to 169.254.169.254',
    category: 'dns-rebinding',
    input: 'https://169.254.169.254.nip.io',
    target: 'url',
  },

  // ---------------------------------------------------------------------------
  // 2. IPv6 ADDRESS VARIATIONS
  // ---------------------------------------------------------------------------
  {
    label: 'IPv6 mapped IPv4 loopback: ::ffff:127.0.0.1',
    category: 'ipv6',
    input: '::ffff:127.0.0.1',
    target: 'ip',
  },
  {
    label: 'IPv6 loopback: [::1]',
    category: 'ipv6',
    input: '::1',
    target: 'ip',
  },
  {
    label: 'IPv6 loopback full form: 0:0:0:0:0:0:0:1',
    category: 'ipv6',
    input: '0:0:0:0:0:0:0:1',
    target: 'ip',
  },
  {
    label: 'IPv6 mapped IPv4 hex: 0:0:0:0:0:ffff:7f00:0001',
    category: 'ipv6',
    input: '0:0:0:0:0:ffff:7f00:0001',
    target: 'ip',
  },
  {
    label: 'IPv6 unspecified: ::',
    category: 'ipv6',
    input: '::',
    target: 'ip',
  },
  {
    label: 'IPv6 loopback in URL brackets',
    category: 'ipv6',
    input: 'https://[::1]/',
    target: 'url',
  },
  {
    label: 'IPv6 mapped loopback in URL brackets',
    category: 'ipv6',
    input: 'https://[::ffff:127.0.0.1]/',
    target: 'url',
  },
  {
    label: 'IPv6 ULA fd00:: prefix',
    category: 'ipv6',
    input: 'fd00::1',
    target: 'ip',
  },
  {
    label: 'IPv6 link-local fe80::',
    category: 'ipv6',
    input: 'fe80::1',
    target: 'ip',
  },
  {
    label: 'IPv6 AWS EC2 metadata fd00:ec2::254',
    category: 'ipv6',
    input: 'fd00:ec2::254',
    target: 'ip',
  },

  // ---------------------------------------------------------------------------
  // 3. OCTAL IP NOTATION
  // ---------------------------------------------------------------------------
  {
    label: 'Octal IP: 0177.0.0.1 (127.0.0.1)',
    category: 'octal-ip',
    input: '0177.0.0.1',
    target: 'ip',
  },
  {
    label: 'Octal IP: 0177.0.0.01 (127.0.0.1)',
    category: 'octal-ip',
    input: '0177.0.0.01',
    target: 'ip',
  },
  {
    label: 'Octal IP: 0300.0250.0.1 (192.168.0.1)',
    category: 'octal-ip',
    input: '0300.0250.0.01',
    target: 'ip',
  },
  {
    label: 'Octal IP in URL: https://0177.0.0.1/',
    category: 'octal-ip',
    input: 'https://0177.0.0.1/',
    target: 'url',
  },

  // ---------------------------------------------------------------------------
  // 4. HEX IP NOTATION
  // ---------------------------------------------------------------------------
  {
    label: 'Hex IP single integer: 0x7f000001 (127.0.0.1)',
    category: 'hex-ip',
    input: '0x7f000001',
    target: 'ip',
  },
  {
    label: 'Hex IP dotted: 0x7f.0x0.0x0.0x1 (127.0.0.1)',
    category: 'hex-ip',
    input: '0x7f.0x0.0x0.0x1',
    target: 'ip',
  },
  {
    label: 'Hex IP: 0xA9FEA9FE (169.254.169.254)',
    category: 'hex-ip',
    input: '0xA9FEA9FE',
    target: 'ip',
  },

  // ---------------------------------------------------------------------------
  // 5. DECIMAL IP NOTATION
  // ---------------------------------------------------------------------------
  {
    label: 'Decimal IP: 2130706433 (127.0.0.1)',
    category: 'decimal-ip',
    input: '2130706433',
    target: 'ip',
  },
  {
    label: 'Decimal IP: 2851995649 (169.254.169.254 - wrong but plausible)',
    category: 'decimal-ip',
    input: '2852039166',
    target: 'ip',
  },
  {
    label: 'Decimal IP for 10.0.0.1: 167772161',
    category: 'decimal-ip',
    input: '167772161',
    target: 'ip',
  },

  // ---------------------------------------------------------------------------
  // 6. URL PARSER DIFFERENTIALS
  // ---------------------------------------------------------------------------
  {
    label: 'Userinfo bypass: attacker.com@127.0.0.1',
    category: 'url-parser',
    input: 'https://attacker.com@127.0.0.1/',
    target: 'url',
  },
  {
    label: 'Fragment trick: allowed.com#@evil.com',
    category: 'url-parser',
    input: 'https://stripe.com#@127.0.0.1/',
    target: 'url',
  },
  {
    label: 'Backslash trick: https://attacker.com\\@stripe.com',
    category: 'url-parser',
    input: 'https://attacker.com\\@stripe.com',
    target: 'url',
  },
  {
    label: 'Question mark trick: internal host in query',
    category: 'url-parser',
    input: 'https://stripe.com?redirect=https://127.0.0.1/',
    target: 'url',
  },
  {
    label: 'Double-slash after domain to confuse parsers',
    category: 'url-parser',
    input: 'https://attacker.com//127.0.0.1',
    target: 'url',
  },

  // ---------------------------------------------------------------------------
  // 7. DOUBLE URL ENCODING
  // ---------------------------------------------------------------------------
  {
    label: 'Double encoded slash: %252F%252F127.0.0.1',
    category: 'double-encoding',
    input: 'https://example.com/%252F%252F127.0.0.1',
    target: 'url',
  },
  {
    label: 'Double encoded localhost: %256Cocal%2568ost',
    category: 'double-encoding',
    input: 'https://%256Cocal%2568ost/',
    target: 'url',
  },

  // ---------------------------------------------------------------------------
  // 8. REDIRECT-BASED SSRF
  // ---------------------------------------------------------------------------
  {
    label: 'Redirect param: ?redirect=https://127.0.0.1',
    category: 'redirect',
    input: 'https://safe.com/?redirect=https://127.0.0.1',
    target: 'url',
  },
  {
    label: 'Redirect param: ?url=https://169.254.169.254',
    category: 'redirect',
    input: 'https://safe.com/?url=https://169.254.169.254/latest/meta-data/',
    target: 'url',
  },
  {
    label: 'Redirect param: ?next=//127.0.0.1',
    category: 'redirect',
    input: 'https://safe.com/?next=//127.0.0.1',
    target: 'url',
  },
  {
    label: 'Redirect param: ?callback_url=https://10.0.0.1',
    category: 'redirect',
    input: 'https://safe.com/?callback_url=https://10.0.0.1',
    target: 'url',
  },
  {
    label: 'Redirect param: ?return_to=/\\127.0.0.1',
    category: 'redirect',
    input: 'https://safe.com/?return_to=/\\127.0.0.1',
    target: 'url',
  },

  // ---------------------------------------------------------------------------
  // 9. PROTOCOL SMUGGLING
  // ---------------------------------------------------------------------------
  {
    label: 'Gopher protocol: gopher://127.0.0.1:25/',
    category: 'protocol-smuggling',
    input: 'gopher://127.0.0.1:25/',
    target: 'url',
  },
  {
    label: 'File protocol: file:///etc/passwd',
    category: 'protocol-smuggling',
    input: 'file:///etc/passwd',
    target: 'url',
  },
  {
    label: 'Dict protocol: dict://127.0.0.1:11211/',
    category: 'protocol-smuggling',
    input: 'dict://127.0.0.1:11211/',
    target: 'url',
  },
  {
    label: 'FTP protocol: ftp://127.0.0.1/',
    category: 'protocol-smuggling',
    input: 'ftp://127.0.0.1/',
    target: 'url',
  },
  {
    label: 'TFTP protocol: tftp://127.0.0.1/',
    category: 'protocol-smuggling',
    input: 'tftp://127.0.0.1/',
    target: 'url',
  },

  // ---------------------------------------------------------------------------
  // 10. CLOUD METADATA ENDPOINTS
  // ---------------------------------------------------------------------------
  {
    label: 'AWS metadata: https://169.254.169.254/latest/meta-data/',
    category: 'cloud-metadata',
    input: 'https://169.254.169.254/latest/meta-data/',
    target: 'url',
  },
  {
    label: 'GCP metadata: https://metadata.google.internal/computeMetadata/v1/',
    category: 'cloud-metadata',
    input: 'https://metadata.google.internal/computeMetadata/v1/',
    target: 'url',
  },
  {
    label: 'Cloud metadata IP as private IP',
    category: 'cloud-metadata',
    input: '169.254.169.254',
    target: 'ip',
  },
  {
    label: 'AWS metadata HTTP',
    category: 'cloud-metadata',
    input: 'http://169.254.169.254/latest/meta-data/',
    target: 'url',
  },
] as const;

// =============================================================================
// TESTS
// =============================================================================

describe('SSRF Bypass Prevention', () => {
  // -------------------------------------------------------------------------
  // Verify the SSRF_BYPASSES constant is well-formed and has enough entries
  // -------------------------------------------------------------------------
  describe('SSRF_BYPASSES constant', () => {
    it('should contain at least 30 bypass test cases', () => {
      expect(SSRF_BYPASSES.length).toBeGreaterThanOrEqual(30);
    });

    it('should cover all 10 required categories', () => {
      const categories = new Set(SSRF_BYPASSES.map((b) => b.category));
      expect(categories.has('dns-rebinding')).toBe(true);
      expect(categories.has('ipv6')).toBe(true);
      expect(categories.has('octal-ip')).toBe(true);
      expect(categories.has('hex-ip')).toBe(true);
      expect(categories.has('decimal-ip')).toBe(true);
      expect(categories.has('url-parser')).toBe(true);
      expect(categories.has('double-encoding')).toBe(true);
      expect(categories.has('redirect')).toBe(true);
      expect(categories.has('protocol-smuggling')).toBe(true);
      expect(categories.has('cloud-metadata')).toBe(true);
    });

    it('should have unique labels', () => {
      const labels = SSRF_BYPASSES.map((b) => b.label);
      expect(new Set(labels).size).toBe(labels.length);
    });
  });

  // -------------------------------------------------------------------------
  // ALLOWED_EXTERNAL_DOMAINS sanity check
  // -------------------------------------------------------------------------
  describe('ALLOWED_EXTERNAL_DOMAINS', () => {
    it('should contain expected domains', () => {
      expect(ALLOWED_EXTERNAL_DOMAINS).toContain('stripe.com');
      expect(ALLOWED_EXTERNAL_DOMAINS).toContain('supabase.co');
      expect(ALLOWED_EXTERNAL_DOMAINS).toContain('quickbooks.api.intuit.com');
      expect(ALLOWED_EXTERNAL_DOMAINS).toContain('googleapis.com');
      expect(ALLOWED_EXTERNAL_DOMAINS).toContain('graph.microsoft.com');
    });
  });

  // -------------------------------------------------------------------------
  // 1. DNS REBINDING
  // -------------------------------------------------------------------------
  describe('DNS rebinding', () => {
    const cases = SSRF_BYPASSES.filter((b) => b.category === 'dns-rebinding');

    it.each(cases)('should block: $label', ({ input }) => {
      // In strict mode, DNS rebinding domains should not be in the allowlist
      const result = validateUrl(input, { strict: true });
      expect(result.valid).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 2. IPv6 ADDRESS VARIATIONS
  // -------------------------------------------------------------------------
  describe('IPv6 address variations', () => {
    const ipCases = SSRF_BYPASSES.filter(
      (b) => b.category === 'ipv6' && b.target === 'ip',
    );

    it.each(ipCases)('isPrivateIp should detect: $label', ({ input }) => {
      expect(isPrivateIp(input)).toBe(true);
    });

    const urlCases = SSRF_BYPASSES.filter(
      (b) => b.category === 'ipv6' && b.target === 'url',
    );

    it.each(urlCases)('validateUrl should block: $label', ({ input }) => {
      const result = validateUrl(input, { allowHttp: true });
      expect(result.valid).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 3. OCTAL IP NOTATION
  // -------------------------------------------------------------------------
  describe('Octal IP notation', () => {
    const ipCases = SSRF_BYPASSES.filter(
      (b) => b.category === 'octal-ip' && b.target === 'ip',
    );

    it.each(ipCases)('isPrivateIp should detect: $label', ({ input }) => {
      expect(isPrivateIp(input)).toBe(true);
    });

    const urlCases = SSRF_BYPASSES.filter(
      (b) => b.category === 'octal-ip' && b.target === 'url',
    );

    it.each(urlCases)('validateUrl should block: $label', ({ input }) => {
      const result = validateUrl(input, { allowHttp: true });
      expect(result.valid).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 4. HEX IP NOTATION
  // -------------------------------------------------------------------------
  describe('Hex IP notation', () => {
    const ipCases = SSRF_BYPASSES.filter(
      (b) => b.category === 'hex-ip' && b.target === 'ip',
    );

    it.each(ipCases)('isPrivateIp should detect: $label', ({ input }) => {
      expect(isPrivateIp(input)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 5. DECIMAL IP NOTATION
  // -------------------------------------------------------------------------
  describe('Decimal IP notation', () => {
    const ipCases = SSRF_BYPASSES.filter(
      (b) => b.category === 'decimal-ip' && b.target === 'ip',
    );

    it.each(ipCases)('isPrivateIp should detect: $label', ({ input }) => {
      expect(isPrivateIp(input)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 6. URL PARSER DIFFERENTIALS
  // -------------------------------------------------------------------------
  describe('URL parser differentials', () => {
    const cases = SSRF_BYPASSES.filter((b) => b.category === 'url-parser');

    it.each(cases)('should block or neutralize: $label', ({ input }) => {
      // When strict mode is on, these should all fail validation
      const strictResult = validateUrl(input, { strict: true });
      expect(strictResult.valid).toBe(false);
    });

    it('should strip userinfo from URLs', () => {
      // sanitizeUrl removes userinfo, so the resulting hostname should be 127.0.0.1
      const sanitized = sanitizeUrl('https://attacker.com@127.0.0.1/');
      const parsed = new URL(sanitized);
      // After sanitization the username should be removed
      expect(parsed.username).toBe('');
    });
  });

  // -------------------------------------------------------------------------
  // 7. DOUBLE URL ENCODING
  // -------------------------------------------------------------------------
  describe('Double URL encoding', () => {
    const cases = SSRF_BYPASSES.filter((b) => b.category === 'double-encoding');

    it.each(cases)('should block: $label', ({ input }) => {
      const result = validateUrl(input, { strict: true });
      expect(result.valid).toBe(false);
    });

    it('should iteratively decode double-encoded payloads', () => {
      // %2532 double-encodes '2' -- sanitizeUrl should fully decode
      const doubleEncoded = 'https://example.com/%252F%252Flocalhost';
      // Should either throw or the result should be safe
      const strictResult = validateUrl(doubleEncoded, { strict: true });
      expect(strictResult.valid).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 8. REDIRECT-BASED SSRF
  // -------------------------------------------------------------------------
  describe('Redirect-based SSRF', () => {
    const cases = SSRF_BYPASSES.filter((b) => b.category === 'redirect');

    it.each(cases)('should detect redirect param: $label', ({ input }) => {
      const result = validateUrl(input, { allowHttp: true, checkRedirects: true });
      expect(result.valid).toBe(false);
    });

    it('should pass when redirect checking is disabled and host is safe', () => {
      const result = validateUrl(
        'https://stripe.com/?redirect=https://127.0.0.1',
        { strict: true, checkRedirects: false },
      );
      // The host (stripe.com) is allowed, and redirect checking is off
      expect(result.valid).toBe(true);
    });

    it('should detect encoded redirect parameters', () => {
      const encoded = 'https://safe.com/?url=' + encodeURIComponent('https://127.0.0.1');
      const result = validateUrl(encoded, { allowHttp: true, checkRedirects: true });
      expect(result.valid).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 9. PROTOCOL SMUGGLING
  // -------------------------------------------------------------------------
  describe('Protocol smuggling', () => {
    const cases = SSRF_BYPASSES.filter((b) => b.category === 'protocol-smuggling');

    it.each(cases)('should block non-HTTP protocol: $label', ({ input }) => {
      const result = validateUrl(input, { allowHttp: true });
      expect(result.valid).toBe(false);
    });

    it('should reject gopher:// even when allowHttp is true', () => {
      const result = validateUrl('gopher://127.0.0.1:25/', { allowHttp: true });
      expect(result.valid).toBe(false);
    });

    it('should reject file:// protocol', () => {
      const result = validateUrl('file:///etc/passwd');
      expect(result.valid).toBe(false);
    });

    it('should reject dict:// protocol', () => {
      const result = validateUrl('dict://127.0.0.1:11211/');
      expect(result.valid).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 10. CLOUD METADATA ENDPOINTS
  // -------------------------------------------------------------------------
  describe('Cloud metadata endpoints', () => {
    it('should block AWS metadata IP via validateUrl', () => {
      const result = validateUrl('https://169.254.169.254/latest/meta-data/', {
        allowHttp: true,
      });
      expect(result.valid).toBe(false);
    });

    it('should block AWS metadata IP via HTTP', () => {
      const result = validateUrl('http://169.254.169.254/latest/meta-data/', {
        allowHttp: true,
      });
      expect(result.valid).toBe(false);
    });

    it('should block GCP metadata hostname', () => {
      const result = validateUrl(
        'https://metadata.google.internal/computeMetadata/v1/',
      );
      expect(result.valid).toBe(false);
    });

    it('should detect 169.254.169.254 as private IP', () => {
      expect(isPrivateIp('169.254.169.254')).toBe(true);
    });

    it('should detect link-local range as private', () => {
      expect(isPrivateIp('169.254.0.1')).toBe(true);
      expect(isPrivateIp('169.254.255.255')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // ADDITIONAL isPrivateIp EDGE CASES
  // -------------------------------------------------------------------------
  describe('isPrivateIp edge cases', () => {
    it('should treat empty string as private', () => {
      expect(isPrivateIp('')).toBe(true);
    });

    it('should treat whitespace-only as private', () => {
      expect(isPrivateIp('   ')).toBe(true);
    });

    it('should detect 10.x.x.x range', () => {
      expect(isPrivateIp('10.0.0.1')).toBe(true);
      expect(isPrivateIp('10.255.255.255')).toBe(true);
    });

    it('should detect 172.16-31.x.x range', () => {
      expect(isPrivateIp('172.16.0.1')).toBe(true);
      expect(isPrivateIp('172.31.255.255')).toBe(true);
    });

    it('should detect 192.168.x.x range', () => {
      expect(isPrivateIp('192.168.0.1')).toBe(true);
      expect(isPrivateIp('192.168.255.255')).toBe(true);
    });

    it('should detect 127.x.x.x loopback range', () => {
      expect(isPrivateIp('127.0.0.1')).toBe(true);
      expect(isPrivateIp('127.255.255.255')).toBe(true);
    });

    it('should detect 0.0.0.0', () => {
      expect(isPrivateIp('0.0.0.0')).toBe(true);
    });

    it('should allow valid public IPs', () => {
      expect(isPrivateIp('8.8.8.8')).toBe(false);
      expect(isPrivateIp('1.1.1.1')).toBe(false);
      expect(isPrivateIp('93.184.216.34')).toBe(false);
    });

    it('should detect multicast range (224-239.x.x.x)', () => {
      expect(isPrivateIp('224.0.0.1')).toBe(true);
      expect(isPrivateIp('239.255.255.255')).toBe(true);
    });

    it('should detect reserved range (240+)', () => {
      expect(isPrivateIp('240.0.0.1')).toBe(true);
      expect(isPrivateIp('255.255.255.255')).toBe(true);
    });

    it('should treat malformed IPs as private (block by default)', () => {
      expect(isPrivateIp('999.999.999.999')).toBe(true);
      expect(isPrivateIp('abc.def.ghi.jkl')).toBe(true);
    });

    it('should handle bracketed IPv6 addresses', () => {
      expect(isPrivateIp('[::1]')).toBe(true);
      expect(isPrivateIp('[::ffff:127.0.0.1]')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // ADDITIONAL validateUrl BEHAVIOR
  // -------------------------------------------------------------------------
  describe('validateUrl additional behavior', () => {
    it('should allow valid HTTPS URL to allowed domain in strict mode', () => {
      const result = validateUrl('https://api.stripe.com/v1/charges', {
        strict: true,
      });
      expect(result.valid).toBe(true);
      expect(result.sanitizedUrl).toBeDefined();
    });

    it('should reject HTTP when allowHttp is false (default)', () => {
      const result = validateUrl('http://stripe.com/');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('HTTPS');
    });

    it('should allow HTTP when allowHttp is true', () => {
      const result = validateUrl('http://stripe.com/', {
        strict: true,
        allowHttp: true,
      });
      expect(result.valid).toBe(true);
    });

    it('should reject non-allowed domain in strict mode', () => {
      const result = validateUrl('https://evil.com/', { strict: true });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('not in the allowed list');
    });

    it('should allow additional domains when specified', () => {
      const result = validateUrl('https://custom-api.example.com/', {
        strict: true,
        additionalAllowedDomains: ['example.com'],
      });
      expect(result.valid).toBe(true);
    });

    it('should reject completely invalid input', () => {
      const result = validateUrl('not-a-url');
      expect(result.valid).toBe(false);
    });

    it('should reject empty string', () => {
      const result = validateUrl('');
      expect(result.valid).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // sanitizeUrl BEHAVIOR
  // -------------------------------------------------------------------------
  describe('sanitizeUrl', () => {
    it('should throw on empty string', () => {
      expect(() => sanitizeUrl('')).toThrow();
    });

    it('should throw on non-HTTP protocols', () => {
      expect(() => sanitizeUrl('ftp://example.com')).toThrow();
      expect(() => sanitizeUrl('file:///etc/passwd')).toThrow();
    });

    it('should strip control characters', () => {
      const sanitized = sanitizeUrl('https://example.com/\x00\x0D\x0A');
      expect(sanitized).not.toContain('\x00');
      expect(sanitized).not.toContain('\x0D');
      expect(sanitized).not.toContain('\x0A');
    });

    it('should remove fragments', () => {
      const sanitized = sanitizeUrl('https://example.com/path#fragment');
      expect(sanitized).not.toContain('#fragment');
    });

    it('should remove userinfo', () => {
      const sanitized = sanitizeUrl('https://user:pass@example.com/');
      const parsed = new URL(sanitized);
      expect(parsed.username).toBe('');
      expect(parsed.password).toBe('');
    });

    it('should handle double encoding', () => {
      // %2568 double-encodes 'h'
      // After full decode, this should resolve or throw
      const input = 'https://example%252Ecom/';
      // sanitizeUrl iteratively decodes, so this should produce https://example.com/
      const sanitized = sanitizeUrl(input);
      expect(sanitized).toContain('example.com');
    });
  });

  // -------------------------------------------------------------------------
  // COMPREHENSIVE RUN: every SSRF_BYPASSES entry against the relevant function
  // -------------------------------------------------------------------------
  describe('All bypass attempts must be blocked', () => {
    const ipBypassCases = SSRF_BYPASSES.filter(
      (b) => b.target === 'ip' || b.target === 'both',
    );

    const urlBypassCases = SSRF_BYPASSES.filter(
      (b) => b.target === 'url' || b.target === 'both',
    );

    if (ipBypassCases.length > 0) {
      it.each(ipBypassCases)(
        'isPrivateIp blocks: $label',
        ({ input }) => {
          expect(isPrivateIp(input)).toBe(true);
        },
      );
    }

    if (urlBypassCases.length > 0) {
      it.each(urlBypassCases)(
        'validateUrl blocks: $label',
        ({ input }) => {
          // Use strict mode and allow HTTP so protocol checks don't mask the result
          const result = validateUrl(input, { strict: true, allowHttp: true });
          expect(result.valid).toBe(false);
        },
      );
    }
  });
});
