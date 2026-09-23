import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// US-345: the browser must never select QuickBooks token columns. The
// authenticated role can no longer read them (20260923180000), so a regression
// here would also break the component outright with a permission error.
const TOKEN_COLUMN = /\b(access_token|refresh_token)(_encrypted)?\b/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === '__tests__' ? [] : sourceFiles(p);
    return /\.(ts|tsx)$/.test(name) && !p.endsWith('types.ts') ? [p] : [];
  });
}

describe('browser reads of quickbooks_integrations', () => {
  const hits = sourceFiles(join(process.cwd(), 'src'))
    .map((file) => ({ file, src: readFileSync(file, 'utf8') }))
    .flatMap(({ file, src }) => {
      const out: { file: string; select: string }[] = [];
      const re = /from\(\s*['"]quickbooks_integrations['"]\s*\)\s*(?:\/\/[^\n]*\s*)*\.select\(\s*(['"`])([^'"`]*)\1/g;
      for (const m of src.matchAll(re)) out.push({ file, select: m[2] });
      return out;
    });

  it('finds the two integration components', () => {
    const files = hits.map((h) => h.file.split(/[\\/]/).pop());
    expect(files).toEqual(expect.arrayContaining(['QuickBooksIntegration.tsx', 'QuickBooksSyncStatus.tsx']));
  });

  it('never selects * or a token column', () => {
    for (const { file, select } of hits) {
      expect(select.trim(), file).not.toBe('*');
      expect(select, file).not.toMatch(TOKEN_COLUMN);
    }
  });
});
