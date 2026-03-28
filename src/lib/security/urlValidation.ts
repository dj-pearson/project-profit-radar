/**
 * URL Validation Utility for Open Redirect Prevention
 *
 * Validates URLs returned from API responses before redirecting,
 * preventing open redirect attacks from compromised or malicious APIs.
 */

/**
 * Trusted domains for external redirects.
 * Only URLs with hostnames matching these domains (or subdomains) are allowed.
 */
export const TRUSTED_REDIRECT_DOMAINS: string[] = [
  // Payment
  'checkout.stripe.com',
  'billing.stripe.com',
  // Accounting
  'appcenter.intuit.com',
  'quickbooks.api.intuit.com',
  // Google OAuth / Calendar
  'accounts.google.com',
  'calendar.google.com',
  // Microsoft OAuth / Calendar
  'login.microsoftonline.com',
  'outlook.office365.com',
  'outlook.office.com',
];

/**
 * Check if a hostname matches a trusted domain (exact match or subdomain)
 */
export function isTrustedDomain(hostname: string, trustedDomains?: string[]): boolean {
  const domains = trustedDomains || TRUSTED_REDIRECT_DOMAINS;
  const normalizedHost = hostname.toLowerCase();

  return domains.some(domain => {
    const normalizedDomain = domain.toLowerCase();
    return (
      normalizedHost === normalizedDomain ||
      normalizedHost.endsWith('.' + normalizedDomain)
    );
  });
}

export interface RedirectValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a URL before using it for redirection.
 *
 * Checks:
 * 1. URL is parseable
 * 2. Protocol is https (or http for localhost in dev)
 * 3. Hostname matches trusted domains list, OR is the app's own domain
 * 4. No javascript: or data: protocol
 * 5. No protocol-relative URLs
 */
export function validateRedirectUrl(
  url: string | undefined | null,
  options?: {
    /** Additional trusted domains beyond the default list */
    additionalDomains?: string[];
    /** Allow the app's own origin (default: true) */
    allowSameOrigin?: boolean;
  }
): RedirectValidationResult {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'No URL provided.' };
  }

  const trimmedUrl = url.trim();

  // Block protocol-relative URLs
  if (trimmedUrl.startsWith('//')) {
    return { valid: false, error: 'Protocol-relative URLs are not allowed.' };
  }

  // Block dangerous protocols
  const lowerUrl = trimmedUrl.toLowerCase();
  if (lowerUrl.startsWith('javascript:') || lowerUrl.startsWith('data:') || lowerUrl.startsWith('vbscript:')) {
    return { valid: false, error: 'Dangerous URL protocol.' };
  }

  // Allow relative paths (same-origin navigation)
  if (trimmedUrl.startsWith('/') && !trimmedUrl.startsWith('//')) {
    return { valid: true };
  }

  // Parse the URL
  let parsed: URL;
  try {
    parsed = new URL(trimmedUrl);
  } catch {
    return { valid: false, error: 'Invalid URL format.' };
  }

  // Only allow https (and http for localhost in development)
  if (parsed.protocol !== 'https:') {
    const isDev = typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (!(isDev && parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'))) {
      return { valid: false, error: 'Only HTTPS URLs are allowed.' };
    }
  }

  // Check same-origin
  const allowSameOrigin = options?.allowSameOrigin !== false;
  if (allowSameOrigin && typeof window !== 'undefined') {
    if (parsed.origin === window.location.origin) {
      return { valid: true };
    }
  }

  // Check trusted domains
  const allDomains = [
    ...TRUSTED_REDIRECT_DOMAINS,
    ...(options?.additionalDomains || []),
  ];

  if (isTrustedDomain(parsed.hostname, allDomains)) {
    return { valid: true };
  }

  return {
    valid: false,
    error: `Redirect to "${parsed.hostname}" is not allowed. Only trusted domains are permitted.`,
  };
}
