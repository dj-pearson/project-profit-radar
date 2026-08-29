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

describe('the mock-data feature shells', () => {
  const REPORT = 'docs/UNREFERENCED_COMPONENTS.md';

  /** Every file the report lists, so the assertions below read the real set. */
  function listed(): string[] {
    return readFileSync(REPORT, 'utf8')
      .split('\n')
      .filter((line) => line.startsWith('| ') && line.includes('`'))
      .map((line) => /`([^`]+)`/.exec(line)?.[1] ?? '')
      .filter(Boolean);
  }

  it('the report exists and says it is generated', () => {
    const doc = readFileSync(REPORT, 'utf8');
    expect(doc).toContain('scripts/report-unreferenced-components.mjs');
    expect(doc).toContain('Do not edit by hand');
  });

  it('the only orphans still holding named mock data are the seven in dead islands', () => {
    // The deletion criterion was `const mockX = ...` in a file with no data
    // access that nothing imports: 34 files, 17,835 lines, holding invented
    // business records - "ABC Electrical Services", "John Smith", fake phone
    // numbers - rendered as if they were the customer's.
    //
    // That sweep was complete for the files it could see, and it could only see
    // 194 of 272: the guard counted inbound imports rather than reachability, so
    // a mock shell imported by another dead file was invisible to it. Fixing
    // that surfaced these seven. They are not a regression and not an oversight
    // in the sweep - they were never in its input.
    //
    // Five of the original seven are gone, deleted as two whole islands rather
    // than as files: pages/MarketingAutomation plus the three marketing shells it
    // imported, and four of the five components under forms/. Deleting an island
    // is all-or-nothing - removing only the two mock shells under forms/ would
    // have left StreamlinedDataEntry and the barrel importing files that no
    // longer existed.
    //
    // The two that remain each need a decision that is not a sweep.
    // NotificationCenter is the more interesting one: US-076 ("build real-time
    // notification center with event integration") is marked done, and this is a
    // 495-line shell holding mockNotifications.
    const KNOWN = [
      'src/components/communication/NotificationCenter.tsx',
      'src/components/enterprise/EnterpriseDashboard.tsx',
    ];
    // `dummy` is deliberately not in this pattern. hero/BriklyHero3D declares
    // `const dummy = useMemo(() => new THREE.Object3D(), [])`, which is the
    // standard instanced-mesh idiom and not mock data at all - matching on the
    // name alone called a 3D scene a fake-data shell.
    const holding = listed()
      .filter((f) =>
        /\bconst\s+(mock|sample|demo|fake)[A-Za-z0-9_]*\s*[:=]/i.test(readFileSync(f, 'utf8')),
      )
      .sort();
    expect(holding).toEqual(KNOWN);
  });

  it('the largest of them is gone', () => {
    // 852 lines, zero data access, const mockSubs with named contractors.
    expect(existsSync('src/components/subcontractors/SubcontractorCoordination.tsx')).toBe(false);
  });

  it('which retires two US-296 AC4 handlers that were never wireable', () => {
    // updatePerformanceRating and verifyInsurance lived in that file. Binding
    // them to a control was never the fix; the screen had no data and no route.
    const prd = JSON.parse(readFileSync('prd.json', 'utf8')) as {
      userStories: Array<{ id: string; notes?: string }>;
    };
    const notes = prd.userStories.find((s) => s.id === 'US-296')?.notes ?? '';
    expect(notes).toContain('updatePerformanceRating');
    expect(notes).toContain('was never the fix');
  });

  it('kept the orphans that read real data, because those are decisions not junk', () => {
    // A 379-line orphan with five supabase calls and a live twin is an
    // unanswered question about which one is the product.
    expect(existsSync('src/components/integrations/APIKeyManager.tsx')).toBe(true);
    expect(existsSync('src/components/financial/LaborBurdenCalculator.tsx')).toBe(false);
  });

  it('the report separates them rather than lumping them together', () => {
    const doc = readFileSync(REPORT, 'utf8');
    for (const verdict of ['mock', 'duplicate?', 'unwired feature', 'review']) {
      expect(doc).toContain(`| ${verdict} |`);
    }
  });
});
