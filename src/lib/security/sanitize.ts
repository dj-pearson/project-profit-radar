import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(
  html: string,
  options?: {
    allowedTags?: string[];
    allowedAttributes?: string[];
  }
): string {
  const defaultConfig = {
    ALLOWED_TAGS: options?.allowedTags || ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: options?.allowedAttributes || ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  };

  return DOMPurify.sanitize(html, defaultConfig);
}

/**
 * Strip all HTML tags from a string
 */
export function stripHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Encode text for safe URL usage
 */
export function encodeUrl(text: string): string {
  return encodeURIComponent(text);
}

/**
 * Encode text for safe WhatsApp URL
 */
export function encodeWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

/**
 * Decode HTML entities to their character equivalents for sanitization.
 * Handles named entities (&lt; &gt; &amp; &quot; &apos;) and
 * numeric entities (&#60; &#x3C; etc).
 */
function decodeHtmlEntities(input: string): string {
  return input
    // Named entities
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    // Decimal numeric entities for < and >
    .replace(/&#0*60;?/g, '<')
    .replace(/&#0*62;?/g, '>')
    .replace(/&#0*34;?/g, '"')
    .replace(/&#0*39;?/g, "'")
    // Hex numeric entities for < and >
    .replace(/&#x0*3[cC];?/g, '<')
    .replace(/&#x0*3[eE];?/g, '>')
    .replace(/&#x0*22;?/g, '"')
    .replace(/&#x0*27;?/g, "'");
}

/**
 * Decode URL-encoded characters that could be used for XSS
 */
function decodeUrlEncodedXss(input: string): string {
  let decoded = input;
  // Handle double-encoding: %253C -> %3C -> <
  // Run up to 3 passes to catch multi-layer encoding
  for (let i = 0; i < 3; i++) {
    const previous = decoded;
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      // Invalid encoding, stop decoding
      break;
    }
    if (decoded === previous) break;
  }
  return decoded;
}

/**
 * Sanitize user input for display.
 *
 * Handles raw angle brackets, HTML-entity-encoded payloads,
 * URL-encoded payloads, and double-encoded attack vectors.
 */
export function sanitizeInput(input: string): string {
  let sanitized = input.trim();

  // Decode URL-encoded characters first (handles double-encoding)
  sanitized = decodeUrlEncodedXss(sanitized);

  // Decode HTML entities
  sanitized = decodeHtmlEntities(sanitized);

  // Remove angle brackets and other dangerous characters
  sanitized = sanitized.replace(/[<>]/g, '');

  // Limit length
  return sanitized.slice(0, 5000);
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string {
  return email
    .trim()
    .toLowerCase()
    .slice(0, 255);
}

/**
 * Validate and sanitize phone number
 */
export function sanitizePhone(phone: string): string {
  return phone
    .trim()
    .replace(/[^\d\s\-\+\(\)]/g, '')
    .slice(0, 20);
}

/**
 * Mask sensitive data for logging
 */
export function maskSensitiveData(data: string, visibleChars = 4): string {
  if (data.length <= visibleChars) {
    return '*'.repeat(data.length);
  }
  return '*'.repeat(data.length - visibleChars) + data.slice(-visibleChars);
}

/**
 * Sanitize SQL-like input (for search queries)
 */
export function sanitizeSqlInput(input: string): string {
  return input
    .replace(/['";]/g, '') // Remove SQL special characters
    .trim()
    .slice(0, 100);
}
