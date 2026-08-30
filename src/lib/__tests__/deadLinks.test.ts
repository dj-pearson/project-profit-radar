import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * US-312. Thirty-four in-app paths were linked from the UI and answered by no
 * route. react-router has a catch-all `<Route path="*">` at the end of the
 * tree, so a link to a path nothing declares does not throw, does not warn and
 * does not fail any test: it renders "Brikly / Page not found". Nothing in the
 * build can tell that apart from a page the user genuinely should not find.
 *
 * The ones that mattered most were not obscure. SecureRoute has redirected to
 * /unauthorized in three places since it was written and nothing ever answered
 * it, so being refused a page looked exactly like a broken link. The admin
 * health page sent signed-out users to /login when the route is /auth. The
 * upgrade CTA went to /subscription rather than /subscription-settings.
 * QuickBooksCallback told the user the connection succeeded and then, two
 * seconds later, navigated them to /settings/integrations, which is /integrations.
 *
 * Enforcement is scripts/check-dead-links.mjs. What is pinned here is the set
 * of repoints that were made, plus the one thing the guard cannot see: whether
 * a declared route is actually mounted.
 */

const ROUTES_DIR = 'src/routes';

function routeFiles(): string[] {
  return readdirSync(ROUTES_DIR)
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => join(ROUTES_DIR, f));
}

/** Every path a <Route> declares, including the multi-line form. */
function declaredRoutes(): Set<string> {
  const out = new Set<string>();
  for (const file of routeFiles()) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/<Route\b((?:[^>]|\n)*?)\/?>/g)) {
      const pm = /path=\{?["'`]([^"'`]+)["'`]/.exec(m[1]);
      if (pm) out.add(pm[1]);
    }
  }
  return out;
}

describe('the access-denied route', () => {
  it('answers /unauthorized, which SecureRoute has always redirected to', () => {
    expect(declaredRoutes().has('/unauthorized')).toBe(true);
  });

  it('is actually mounted in allRoutes, not merely declared', () => {
    // The guard counts <Route> elements wherever they appear, so a route
    // exported and never composed would still look answered to it.
    const src = readFileSync(join(ROUTES_DIR, 'index.tsx'), 'utf8');
    const allRoutes = src.slice(src.indexOf('export const allRoutes'));
    expect(allRoutes).toContain('{accessDeniedRoute}');
    expect(allRoutes.indexOf('{accessDeniedRoute}')).toBeLessThan(allRoutes.indexOf('{notFoundRoute}'));
  });

  it('carries the refused path so the page can name it', () => {
    const src = readFileSync('src/components/security/SecureRoute.tsx', 'utf8');
    const redirects = [...src.matchAll(/<Navigate to="\/unauthorized"([^/]*)\/>/g)];
    expect(redirects.length, 'SecureRoute no longer redirects to /unauthorized').toBe(3);
    for (const r of redirects) {
      expect(r[1]).toContain('state={{ from: location.pathname }}');
    }
  });

  it('does not say the page is missing, because it is not', () => {
    // Comments stripped: the header explains the 404 this replaced, and that
    // explanation is not what the user reads.
    const page = readFileSync('src/pages/AccessDenied.tsx', 'utf8')
      .split('\n')
      .filter((line) => {
        const t = line.trim();
        return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
      })
      .join('\n');
    expect(page).not.toMatch(/not found|404/i);
    expect(page).toContain('do not have access');
  });
});

describe('the repointed links', () => {
  const REPOINTS: Array<[string, string, string]> = [
    ['src/pages/admin/SystemHealth.tsx', '/login', '/auth'],
    ['src/components/subscription/UpgradePrompt.tsx', '/subscription', '/subscription-settings'],
    ['src/pages/QuickBooksCallback.tsx', '/settings/integrations', '/integrations'],
    // src/components/crm/CRMDashboard.tsx was here. It was deleted in the US-314
    // burn-down - an unreachable duplicate of the routed pages/CRMDashboard - which
    // settles its links more firmly than a repoint does.
    ['src/pages/settings/CustomDomain.tsx', '/help', '/support'],
    ['src/hooks/useKeyboardShortcuts.ts', '/settings', '/user-settings'],
  ];

  it.each(REPOINTS)('%s no longer links to %s', (file, dead, live) => {
    const src = readFileSync(file, 'utf8');
    // The quoted path exactly: /leads must not match inside /crm/leads.
    expect(src).not.toMatch(new RegExp(`(['"\`])${dead}\\1`));
    expect(src).toContain(live);
  });

  it('the QuickBooks success redirect and its retry button go to the same place', () => {
    // The redirect fires two seconds after "Successfully connected to
    // QuickBooks!", so landing on a 404 undid the whole handshake in the
    // user's eyes.
    const src = readFileSync('src/pages/QuickBooksCallback.tsx', 'utf8');
    const targets = [...src.matchAll(/navigate\('([^']+)'/g)].map((m) => m[1]);
    // It also has a "back to dashboard" escape, which is fine; what matters is
    // that no target is the /settings/integrations path that had no route.
    expect(targets).toContain('/integrations');
    expect(targets).not.toContain('/settings/integrations');
    expect(targets.filter((t) => t.startsWith('/integrations')).length).toBe(2);
  });
});

describe('the guard', () => {
  const GUARD = 'scripts/check-dead-links.mjs';

  it('is wired into pre-commit and CI', () => {
    expect(readFileSync('.husky/pre-commit', 'utf8')).toContain('check-dead-links.mjs');
    expect(readFileSync('.github/workflows/ci.yml', 'utf8')).toContain('check-dead-links.mjs');
  });

  it('gives every baselined path a written reason', () => {
    const src = readFileSync(GUARD, 'utf8');
    const baseline = src.slice(src.indexOf('const BASELINE = new Map(['), src.indexOf(']);'));
    // Every entry, and every entry carrying a reason of real length. Comparing
    // the two is the actual assertion. This used to require at least 16 entries,
    // which inverted it: the baseline is meant to shrink, so deleting the five
    // links that lived in the unreachable CRM dashboard (US-314) failed a test
    // whose point was that reasons exist, not that dead links do.
    const all = [...baseline.matchAll(/^ {2}\['\/[A-Za-z0-9/_-]*',/gm)];
    const reasoned = [...baseline.matchAll(/^ {2}\['\/[A-Za-z0-9/_-]*',\s*'([^']{40,})/gm)];
    expect(all.length).toBeGreaterThan(0);
    expect(reasoned.length).toBe(all.length);
  });

  it('says out loud that it cannot see whether a route is mounted', () => {
    // Collapse the comment wrapping before looking for the sentence.
    const prose = readFileSync(GUARD, 'utf8').replace(/\n\s*\*\s*/g, ' ');
    expect(prose).toContain('not where they are mounted');
  });
});
