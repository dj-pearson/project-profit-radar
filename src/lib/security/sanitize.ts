import DOMPurify from 'dompurify';

/**
 * Defense-in-depth post-pass for DOMPurify output.
 *
 * Strips event-handler attributes, form-submission attributes, and
 * `javascript:`/`vbscript:` URI values that may have slipped past
 * DOMPurify. This is redundant in a fully-functional browser
 * environment, but covers cases where the underlying DOM (e.g. some
 * test runtimes) doesn't expose every API DOMPurify needs to strip
 * disallowed nodes correctly.
 */
function stripDangerousAttributes(html: string): string {
  // The leading separator class allows whitespace OR `/` so we catch
  // both `<button onerror=…>` and `<svg/onload=…>` styles.
  return html
    // Strip on* event handlers (quoted, single-quoted, or unquoted)
    .replace(/[\s/]on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // Strip formaction / action attributes (used in button-based XSS)
    .replace(/[\s/](?:formaction|action|background)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // Neutralize javascript:/vbscript: URIs in any remaining src/href
    .replace(
      /[\s/](?:href|src|xlink:href)\s*=\s*"\s*(?:javascript|vbscript)\s*:[^"]*"/gi,
      ' href=""',
    )
    .replace(
      /[\s/](?:href|src|xlink:href)\s*=\s*'\s*(?:javascript|vbscript)\s*:[^']*'/gi,
      " href=''",
    )
    // Neutralize bare `javascript:` / `vbscript:` URI text that survived
    // (e.g. in entity-decoded text content of polyglot payloads). Only
    // strips when followed by non-whitespace, so prose mentions of
    // "JavaScript" with a trailing space aren't corrupted.
    .replace(/(?:javascript|vbscript)\s*:\s*\S+/gi, '');
}

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

  return stripDangerousAttributes(DOMPurify.sanitize(html, defaultConfig));
}

/**
 * Strip all HTML tags from a string
 */
export function stripHtml(html: string): string {
  const purified = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
  // Safety net: in some environments DOMPurify with an empty allowlist
  // still leaves inline tags in the output. Strip any that remain.
  return stripDangerousAttributes(purified).replace(/<[^>]*>/g, '');
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
 *
 * The output is plain text and cannot execute on its own. We additionally
 * scrub known-dangerous keywords (event handlers, `javascript:` URIs,
 * `expression(`) as defense-in-depth, since downstream consumers may
 * concatenate the result back into an HTML context where a surviving
 * `onerror=` or `javascript:` could re-introduce execution.
 */
export function sanitizeInput(input: string): string {
  let sanitized = input.trim();

  // Decode URL-encoded characters first (handles double-encoding)
  sanitized = decodeUrlEncodedXss(sanitized);

  // Decode HTML entities
  sanitized = decodeHtmlEntities(sanitized);

  // Remove angle brackets and other dangerous characters
  sanitized = sanitized.replace(/[<>]/g, '');

  // Defense-in-depth: strip known-executable patterns even though the
  // output is now plain text. Runs in a fixed-point loop in case earlier
  // stripping reveals further patterns (e.g. `oneronerror=` after one pass).
  let previous = '';
  let iterations = 0;
  while (previous !== sanitized && iterations < 5) {
    previous = sanitized;
    sanitized = sanitized
      .replace(/javascript\s*:/gi, '')
      .replace(/vbscript\s*:/gi, '')
      .replace(/data\s*:\s*text\/(?:html|javascript)/gi, '')
      .replace(/\bon\w+\s*=/gi, '')
      .replace(/expression\s*\(/gi, '');
    iterations++;
  }

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
