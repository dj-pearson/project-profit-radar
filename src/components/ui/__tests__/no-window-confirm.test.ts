import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * US-374: destructive actions ask through the shared ConfirmDialog
 * (src/components/ui/confirm-dialog.tsx), never through the browser's
 * window.confirm, which is unstyled, blocks the thread and is suppressed in
 * some embedded webviews (so the delete silently never runs, or runs unasked).
 *
 * ALLOWLIST holds files another workstream owns (SEO/blog admin) that still
 * call confirm(). Remove an entry once that file is converted; the second case
 * fails if an entry goes stale.
 */
const ALLOWLIST = new Set([
  'src/components/admin/KeywordManager.tsx',
  'src/pages/BlogManager.tsx',
]);

// window.confirm(...) or a bare global confirm('...') / confirm(`...`).
const PATTERN = /\bwindow\.confirm\s*\(|(?<![\w.$])confirm\s*\(\s*['"`]/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name === 'node_modules' || name === '__tests__') continue;
      walk(path, out);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) {
      out.push(path);
    }
  }
  return out;
}

function offenders(): string[] {
  return walk('src').filter((file) =>
    readFileSync(file, 'utf8')
      .split('\n')
      .some((line) => !/^\s*(\/\/|\*)/.test(line) && PATTERN.test(line)),
  );
}

describe('no window.confirm in src', () => {
  it('routes every confirmation through the shared ConfirmDialog', () => {
    const found = offenders().filter((f) => !ALLOWLIST.has(f));
    expect(found, `use confirmAction()/useConfirm() from @/components/ui/confirm-dialog instead:\n${found.join('\n')}`).toEqual([]);
  });

  it('has no stale allowlist entries', () => {
    const found = new Set(offenders());
    expect([...ALLOWLIST].filter((f) => !found.has(f))).toEqual([]);
  });
});
