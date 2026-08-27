import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

/**
 * US-314. 237 files under src/components and src/pages - 86,913 lines - were
 * imported by no other module. Vite tree-shakes them out of the bundle, so
 * nothing breaks and nothing complains. They sit in the tree looking like
 * features, and they get read that way: src/pages/DrawingViewer.tsx makes
 * US-225 look half-built when it is a static mock with six hardcoded layers.
 *
 * Enforcement is scripts/check-unreferenced-components.mjs, which holds a count
 * baseline. These cases pin the specific deletions and the one wiring fix, plus
 * the properties of the guard that make the count trustworthy.
 */

const GUARD = 'scripts/check-unreferenced-components.mjs';

describe('the four offline components nothing rendered', () => {
  const DELETED = [
    'src/components/mobile/OfflineManager.tsx',
    'src/components/offline/OfflineManager.tsx',
    'src/components/offline/OfflineCapabilities.tsx',
    'src/components/pwa/OfflineBanner.tsx',
  ];

  it.each(DELETED)('%s is gone', (file) => {
    expect(existsSync(file)).toBe(false);
  });

  it('left the one App actually mounts in place', () => {
    // components/OfflineIndicator re-exports OfflineBanner and
    // SyncQueueIndicator from offline/OfflineIndicator, and App mounts them.
    expect(existsSync('src/components/offline/OfflineIndicator.tsx')).toBe(true);
    const reexport = readFileSync('src/components/OfflineIndicator.tsx', 'utf8');
    expect(reexport).toContain("from '@/components/offline/OfflineIndicator'");
  });

  it('and the live sync path is untouched', () => {
    expect(existsSync('src/hooks/useOfflineSync.ts')).toBe(true);
  });
});

describe('the sync-queue indicator', () => {
  const app = readFileSync('src/App.tsx', 'utf8');

  it('is rendered, not just imported', () => {
    // It was lazily imported on line 29 and never placed, so a user with
    // actions queued offline had no sign of them and no way to retry.
    expect(app).toContain('const SyncQueueIndicator = lazy(');
    expect(app).toMatch(/<SyncQueueIndicator \/>/);
  });

  it('sits with the other deferred PWA components', () => {
    const pwa = app.slice(app.indexOf('<PWAInstallPrompt />'), app.indexOf('<UpdatePrompt />'));
    expect(pwa).toContain('<SyncQueueIndicator />');
  });

  it('renders nothing when there is nothing queued, which is why this was invisible', () => {
    const src = readFileSync('src/components/offline/OfflineIndicator.tsx', 'utf8');
    const fn = src.slice(src.indexOf('export function SyncQueueIndicator()'));
    expect(fn).toMatch(/if \(pendingCount === 0 && syncStatus === "idle"\) \{\s*return null;/);
  });
});

describe('the guard', () => {
  const src = readFileSync(GUARD, 'utf8');

  it('is wired into pre-commit and CI', () => {
    expect(readFileSync('.husky/pre-commit', 'utf8')).toContain('check-unreferenced-components.mjs');
    expect(readFileSync('.github/workflows/ci.yml', 'utf8')).toContain('check-unreferenced-components.mjs');
  });

  it('counts a lazy route import as a reference', () => {
    // Pages are reached through createLazyRoute(() => import('@/pages/X')), so a
    // guard that only read `from` clauses would call every routed page dead.
    expect(src).toMatch(/\(\?:from\|import\)/);
  });

  it('resolves a directory import to its index', () => {
    expect(src).toContain("basename(stem) === 'index'");
  });

  it('excludes ui primitives and tests, which are imported by name not path', () => {
    expect(src).toContain("src/components/ui/");
    expect(src).toContain('__tests__');
  });

  it('fails in both directions, so the count cannot drift into a ceiling', () => {
    expect(src).toMatch(/orphans\.length > BASELINE[\s\S]*?process\.exit\(1\)/);
    expect(src).toMatch(/orphans\.length < BASELINE[\s\S]*?process\.exit\(1\)/);
  });
});
