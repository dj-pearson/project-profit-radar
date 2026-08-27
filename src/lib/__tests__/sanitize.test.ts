/**
 * @vitest-environment jsdom
 *
 * This file must run under jsdom, not the suite default (happy-dom).
 * happy-dom's NodeIterator does not implement the DOM spec's pre-removing
 * steps, so removing the current node ends the iteration. DOMPurify walks the
 * tree with createNodeIterator and removes as it goes, which means under
 * happy-dom it stops scanning at the first node it strips and leaves the rest
 * of the document -- <script> included -- in the output. Every assertion in
 * here about a payload being removed is meaningless under happy-dom. See the
 * guard in scripts/check-sanitizer-test-env.mjs.
 */
import { describe, it, expect } from 'vitest';
import {
  sanitizeHtml,
  stripHtml,
  encodeUrl,
  encodeWhatsAppUrl,
  sanitizeInput,
  sanitizeEmail,
  sanitizePhone,
  maskSensitiveData,
  sanitizeSqlInput,
} from '../security/sanitize';

describe('Security: sanitize utilities', () => {
  describe('sanitizeHtml()', () => {
    it('allows safe tags', () => {
      expect(sanitizeHtml('<b>bold</b>')).toBe('<b>bold</b>');
      expect(sanitizeHtml('<em>emphasis</em>')).toBe('<em>emphasis</em>');
    });

    it('strips script tags', () => {
      expect(sanitizeHtml('<script>alert("xss")</script>')).toBe('');
    });

    it('strips event handlers', () => {
      const input = '<img onerror="alert(1)" src="x">';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onerror');
    });

    it('strips disallowed tags', () => {
      expect(sanitizeHtml('<div>content</div>')).toBe('content');
      expect(sanitizeHtml('<iframe src="evil.com"></iframe>')).toBe('');
    });

    it('handles empty string', () => {
      expect(sanitizeHtml('')).toBe('');
    });

    it('accepts custom allowed tags', () => {
      const result = sanitizeHtml('<div>hello</div>', { allowedTags: ['div'] });
      expect(result).toBe('<div>hello</div>');
    });
  });

  describe('sanitizeHtml() URL-scheme hardening (US-203)', () => {
    it('removes javascript: hrefs', () => {
      const result = sanitizeHtml('<a href="javascript:alert(1)">x</a>');
      expect(result).not.toContain('javascript');
    });

    it('removes data:text/html hrefs (regex pass alone missed these)', () => {
      const result = sanitizeHtml('<a href="data:text/html,<script>alert(1)</script>">x</a>');
      expect(result).not.toContain('data:');
    });

    it('removes entity-encoded javascript: hrefs', () => {
      const result = sanitizeHtml('<a href="&#106;avascript:alert(1)">x</a>');
      expect(result).not.toContain('javascript');
    });

    it('removes blob: hrefs', () => {
      const result = sanitizeHtml('<a href="blob:https://brikly.net/abc">x</a>');
      expect(result).not.toContain('blob:');
    });

    it('preserves safe https and relative hrefs', () => {
      expect(sanitizeHtml('<a href="https://brikly.net/x">x</a>')).toContain('href="https://brikly.net/x"');
      expect(sanitizeHtml('<a href="/projects">x</a>')).toContain('href="/projects"');
      expect(sanitizeHtml('<a href="mailto:hi@brikly.net">x</a>')).toContain('mailto:hi@brikly.net');
    });

    it('forces rel=noopener noreferrer on target=_blank links', () => {
      const result = sanitizeHtml('<a href="https://brikly.net" target="_blank">x</a>');
      expect(result).toContain('rel="noopener noreferrer"');
    });

    it('allows data:image src on media but blocks data:text', () => {
      const ok = sanitizeHtml('<img src="data:image/png;base64,iVBORw0KGgo=">', {
        allowedTags: ['img'],
        allowedAttributes: ['src'],
      });
      expect(ok).toContain('data:image/png');
      const bad = sanitizeHtml('<img src="data:text/html,<script>1</script>">', {
        allowedTags: ['img'],
        allowedAttributes: ['src'],
      });
      expect(bad).not.toContain('data:text');
    });
  });

  describe('stripHtml()', () => {
    it('removes script tags', () => {
      expect(stripHtml('<script>alert(1)</script>')).toBe('');
    });

    it('handles empty string', () => {
      expect(stripHtml('')).toBe('');
    });

    it('returns plain text unchanged', () => {
      expect(stripHtml('no tags here')).toBe('no tags here');
    });
  });

  describe('encodeUrl()', () => {
    it('encodes special characters', () => {
      expect(encodeUrl('hello world')).toBe('hello%20world');
      expect(encodeUrl('a&b=c')).toBe('a%26b%3Dc');
    });

    it('handles empty string', () => {
      expect(encodeUrl('')).toBe('');
    });
  });

  describe('encodeWhatsAppUrl()', () => {
    it('generates a valid WhatsApp URL', () => {
      const result = encodeWhatsAppUrl('+1 (555) 123-4567', 'Hello!');
      expect(result).toBe('https://wa.me/15551234567?text=Hello!');
    });

    it('strips non-digit characters from phone', () => {
      const result = encodeWhatsAppUrl('(123) 456-7890', 'Hi');
      expect(result).toContain('wa.me/1234567890');
    });
  });

  describe('sanitizeInput()', () => {
    it('trims whitespace', () => {
      expect(sanitizeInput('  hello  ')).toBe('hello');
    });

    it('removes angle brackets', () => {
      expect(sanitizeInput('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
    });

    it('truncates to 5000 characters', () => {
      const long = 'a'.repeat(6000);
      expect(sanitizeInput(long).length).toBe(5000);
    });

    it('handles empty string', () => {
      expect(sanitizeInput('')).toBe('');
    });
  });

  describe('sanitizeEmail()', () => {
    it('lowercases and trims', () => {
      expect(sanitizeEmail('  User@Example.COM  ')).toBe('user@example.com');
    });

    it('truncates to 255 characters', () => {
      const long = 'a'.repeat(300) + '@example.com';
      expect(sanitizeEmail(long).length).toBe(255);
    });
  });

  describe('sanitizePhone()', () => {
    it('preserves valid phone characters', () => {
      expect(sanitizePhone('+1 (555) 123-4567')).toBe('+1 (555) 123-4567');
    });

    it('strips invalid characters', () => {
      expect(sanitizePhone('555-abc-1234')).toBe('555--1234');
    });

    it('truncates to 20 characters', () => {
      const long = '1'.repeat(30);
      expect(sanitizePhone(long).length).toBe(20);
    });
  });

  describe('maskSensitiveData()', () => {
    it('masks all but last N characters', () => {
      expect(maskSensitiveData('1234567890', 4)).toBe('******7890');
    });

    it('masks entire string when shorter than visible chars', () => {
      expect(maskSensitiveData('abc', 4)).toBe('***');
    });

    it('defaults to 4 visible characters', () => {
      expect(maskSensitiveData('secret-token')).toBe('********oken');
    });

    it('handles empty string', () => {
      expect(maskSensitiveData('')).toBe('');
    });
  });

  describe('sanitizeSqlInput()', () => {
    it('removes SQL special characters', () => {
      expect(sanitizeSqlInput("Robert'; DROP TABLE users;--")).toBe('Robert DROP TABLE users--');
    });

    it('trims whitespace', () => {
      expect(sanitizeSqlInput('  hello  ')).toBe('hello');
    });

    it('truncates to 100 characters', () => {
      const long = 'a'.repeat(200);
      expect(sanitizeSqlInput(long).length).toBe(100);
    });
  });
});
