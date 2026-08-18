import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  CONTACT,
  POSTAL_ADDRESS,
  hasPostalAddress,
  postalAddressInline,
  postalAddressLines,
} from '@/config/companyContact';

/**
 * Guards against placeholder contact data reaching production again.
 *
 * The address "123 Construction Way, Suite 100, Builder City, BC 12345" shipped
 * in nine places, including the footer of every outbound email (where CAN-SPAM
 * requires a valid postal address) and the DMCA policy's designated-agent block
 * (where the safe harbor depends on notices actually arriving).
 */
describe('company contact config', () => {
  it('reports no address rather than inventing one when unset', () => {
    if (POSTAL_ADDRESS === null) {
      expect(hasPostalAddress()).toBe(false);
      expect(postalAddressLines()).toEqual([]);
      expect(postalAddressInline()).toBe('');
    } else {
      expect(hasPostalAddress()).toBe(true);
      expect(postalAddressLines().length).toBeGreaterThan(0);
    }
  });

  it('holds no placeholder text in the configured address', () => {
    const inline = postalAddressInline().toLowerCase();
    for (const marker of ['123 construction way', 'builder city', 'your address', 'todo', 'xxx', 'lorem']) {
      expect(inline, `placeholder "${marker}" in configured address`).not.toContain(marker);
    }
  });

  it('uses real brikly.net contact channels', () => {
    for (const [key, value] of Object.entries(CONTACT)) {
      if (key === 'legalName' || key === 'website') continue;
      expect(value, `${key} should be a brikly.net address`).toMatch(/@brikly\.net$/);
    }
  });
});

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__' || entry === 'test') continue;
      sourceFiles(full, acc);
    } else if (/\.(tsx?|ts)$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

/** Remove block and line comments so a quoted example is not mistaken for output. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')   // /* ... */ and {/* ... */}
    .replace(/<!--[\s\S]*?-->/g, '')      // HTML comments in template strings
    .replace(/^\s*\/\/.*$/gm, '');        // // line comments
}

describe('no placeholder postal address in shipped source', () => {
  it('does not render 123 Construction Way anywhere', () => {
    const offenders = sourceFiles('src').filter((f) =>
      stripComments(readFileSync(f, 'utf8')).includes('123 Construction Way'),
    );
    expect(offenders, 'placeholder address in renderable code').toEqual([]);
  });

  it('does not render Builder City anywhere', () => {
    const offenders = sourceFiles('src').filter((f) =>
      stripComments(readFileSync(f, 'utf8')).includes('Builder City'),
    );
    expect(offenders, 'placeholder city in renderable code').toEqual([]);
  });
});
