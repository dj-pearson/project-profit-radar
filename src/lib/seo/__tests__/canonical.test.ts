import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { SITE_ORIGIN, toCanonicalUrl } from '@/lib/seo/canonical';

describe('toCanonicalUrl (US-381)', () => {
  it('uses https://brikly.net as the origin', () => {
    expect(SITE_ORIGIN).toBe('https://brikly.net');
  });

  it.each([
    ['/pricing', 'https://brikly.net/pricing'],
    ['pricing', 'https://brikly.net/pricing'],
    ['  /faq  ', 'https://brikly.net/faq'],
    ['/', 'https://brikly.net/'],
    ['//brikly.net/x', 'https://brikly.net/x'],
    ['https://brikly.net/features', 'https://brikly.net/features'],
  ])('%s -> %s', (input, expected) => {
    expect(toCanonicalUrl(input)).toBe(expected);
  });

  it('falls back to the given path, then the origin root', () => {
    expect(toCanonicalUrl(undefined, '/tools')).toBe('https://brikly.net/tools');
    expect(toCanonicalUrl('', '/tools')).toBe('https://brikly.net/tools');
    expect(toCanonicalUrl(null)).toBe('https://brikly.net/');
  });
});

// Source scan: the components normalize relative values, so the only way a
// bad canonical ships is a hardcoded literal in a raw <Helmet> block, an
// absolute URL on the wrong host, or a new component that skips the helper.
const SRC = join(process.cwd(), 'src');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === '__tests__' || name === 'node_modules') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

const files = walk(SRC).map((f) => ({ path: relative(process.cwd(), f), text: readFileSync(f, 'utf8') }));

describe('canonical source scan (US-381)', () => {
  it('every literal <link rel="canonical" href="..."> is absolute on brikly.net', () => {
    const bad: string[] = [];
    for (const { path, text } of files) {
      for (const m of text.matchAll(/rel=["']canonical["']\s+href=["']([^"']*)["']/g)) {
        if (m[1] !== SITE_ORIGIN && !m[1].startsWith(`${SITE_ORIGIN}/`)) bad.push(`${path}: ${m[1]}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('absolute canonicalUrl props point at brikly.net', () => {
    const bad: string[] = [];
    for (const { path, text } of files) {
      for (const m of text.matchAll(/canonicalUrl=["'`](https?:[^"'`]*)["'`]/g)) {
        if (m[1] !== SITE_ORIGIN && !m[1].startsWith(`${SITE_ORIGIN}/`)) bad.push(`${path}: ${m[1]}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('every dynamic canonical href goes through toCanonicalUrl', () => {
    const bad: string[] = [];
    for (const { path, text } of files) {
      for (const m of text.matchAll(/rel=["']canonical["']\s+href=\{([^}]*)\}/g)) {
        const expr = m[1].trim();
        // Allowed: a direct toCanonicalUrl(...) call, or a variable that the
        // same file assigns from toCanonicalUrl(...).
        const direct = expr.startsWith('toCanonicalUrl(');
        const viaVar =
          /^[A-Za-z_$][\w$]*$/.test(expr) &&
          new RegExp(`\\b${expr}\\s*=\\s*(?:[\\s\\S]{0,120}?)toCanonicalUrl\\(`).test(text);
        if (!direct && !viaVar) bad.push(`${path}: href={${expr}}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
