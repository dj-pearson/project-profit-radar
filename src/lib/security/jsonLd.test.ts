import { describe, it, expect } from 'vitest';
import { jsonLdSafe } from './jsonLd';

describe('jsonLdSafe (US-245)', () => {
  it('neutralizes a </script> breakout payload in a string field', () => {
    const out = jsonLdSafe({ name: 'x</script><script>alert(1)</script>' });
    expect(out).not.toContain('</script>');
    expect(out).not.toContain('<');
    expect(out).not.toContain('>');
  });

  it('escapes < > & without changing the parsed value', () => {
    const data = { q: 'a & b < c > d', nested: { v: '</SCRIPT>' } };
    const out = jsonLdSafe(data);
    expect(out).not.toMatch(/[<>&]/);
    expect(JSON.parse(out)).toEqual(data);
  });

  it('escapes the U+2028 line separator to a \\u2028 sequence', () => {
    const out = jsonLdSafe({ v: String.fromCharCode(0x2028) });
    expect(out).toContain('\\u2028');
    expect(out).not.toContain(String.fromCharCode(0x2028));
  });

  it('handles null/undefined by emitting an empty object', () => {
    expect(jsonLdSafe(null)).toBe('{}');
    expect(jsonLdSafe(undefined)).toBe('{}');
  });
});
