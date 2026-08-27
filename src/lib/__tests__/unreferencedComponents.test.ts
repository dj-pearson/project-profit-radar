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

describe('the duplicate hub pages and the superseded sidebar', () => {
  const DELETED = [
    'src/pages/AdminHub.tsx',
    'src/pages/FinancialHub.tsx',
    'src/pages/OperationsHub.tsx',
    'src/pages/PeopleHub.tsx',
    'src/pages/ProjectsHub.tsx',
    'src/components/AppSidebar.tsx',
    'src/components/hub/HubPageLayout.tsx',
  ];

  it.each(DELETED)('%s is gone', (file) => {
    expect(existsSync(file)).toBe(false);
  });

  it('left the hub pages the routes actually load', () => {
    for (const hub of ['AdminHub', 'FinancialHub', 'OperationsHub', 'PeopleHub', 'ProjectsHub']) {
      expect(existsSync(`src/pages/hubs/${hub}.tsx`), `hubs/${hub} is missing`).toBe(true);
      expect(readFileSync('src/utils/lazyRoutes.tsx', 'utf8')).toContain(`import('@/pages/hubs/${hub}')`);
    }
  });

  it('left the sidebar DashboardLayout mounts', () => {
    expect(existsSync('src/components/navigation/SimplifiedSidebar.tsx')).toBe(true);
    expect(readFileSync('src/components/layout/DashboardLayout.tsx', 'utf8')).toContain('<SimplifiedSidebar />');
  });

  it('left HubNavigationSection, which the live hubs still use', () => {
    // HubPageLayout went because the five duplicates were its only importers.
    // Its neighbour did not: deleting dead code exposes more of it, and the
    // difference has to be checked rather than assumed.
    expect(existsSync('src/components/hub/HubNavigationSection.tsx')).toBe(true);
    expect(readFileSync('src/pages/hubs/PeopleHub.tsx', 'utf8')).toContain('HubNavigationSection');
  });

  it('recorded the ten paths the old sidebar was the last place to name', () => {
    // Deleting a hardcoded sidebar removes the only written record of what it
    // could reach. All ten are routed and render real pages (US-315).
    const prd = JSON.parse(readFileSync('prd.json', 'utf8')) as {
      userStories: Array<{ id: string; notes?: string; description?: string }>;
    };
    const story = prd.userStories.find((s) => s.id === 'US-315');
    expect(story, 'US-315 was not filed').toBeDefined();
    const text = `${story!.description ?? ''}${story!.notes ?? ''}`;
    for (const path of ['/material-orchestration', '/payment-center', '/trade-handoff', '/workflow-testing']) {
      expect(text, `${path} is not recorded anywhere`).toContain(path);
    }
  });
});
