import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * US-311. Fifteen tables are read or written by this codebase and created by no
 * migration. They may exist in the production database because someone typed
 * CREATE TABLE into the SQL editor, which is its own problem (US-248) and is
 * exactly why a staging project built from supabase/migrations cannot be
 * trusted (US-247).
 *
 * The reason it stayed invisible is the shape of the failure. supabase-js
 * returns `{ data: null, error }` rather than throwing, so a `try`/`catch`
 * around the query never fires and `res.data || []` turns a failed read into an
 * empty list. The screen renders "no payments", "no incidents", "no results",
 * which is indistinguishable from a company that genuinely has none.
 *
 * scripts/check-table-definitions.mjs stops the list growing. These cases pin
 * the call sites that were fixed so a missing table is now visible where it
 * matters most: money and safety.
 */

/** File contents with comment lines stripped, so documenting a shape is not using it. */
function code(path: string): string {
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => {
      const t = line.trim();
      return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
    })
    .join('\n');
}

describe('the financial screens', () => {
  const SCREENS = [
    'src/components/financial/ProjectFinancialDashboard.tsx',
    'src/pages/FinancialOverview.tsx',
  ];

  it.each(SCREENS)('%s reads the error on every query before summing', (path) => {
    const src = code(path);
    // Both screens sum `payments` into a revenue figure. Dropping the error and
    // falling back to [] shows a project as having collected nothing.
    expect(src).toMatch(/payments['"]?,\s*\w*[Rr]es\.error|\['payments',\s*\w+Res\.error\]/);
    expect(src).toContain('.error');
    expect(src).toMatch(/throw new Error\(/);
  });

  it('the project dashboard renders a failure instead of returning null', () => {
    // `if (!data) return null` made a failed load and a project with no
    // financial records look identical: blank space.
    const src = code('src/components/financial/ProjectFinancialDashboard.tsx');
    expect(src).toContain('loadError');
    expect(src).toContain('Project financials unavailable');
  });

  it('the overview clears stale figures rather than leaving them under a new period', () => {
    const src = code('src/pages/FinancialOverview.tsx');
    const catchBlock = src.slice(src.indexOf('} catch (error) {'));
    expect(catchBlock).toContain('setPayments([]);');
  });
});

describe('the OSHA compliance screen', () => {
  const PATH = 'src/components/compliance/OSHACompliance.tsx';

  it('reads the error on all three safety queries', () => {
    const src = code(PATH);
    for (const name of ['inspectionsError', 'trainingsError', 'incidentsError']) {
      expect(src, `${name} is not read`).toContain(name);
    }
  });

  it('says the counts are not a safety record when a query failed', () => {
    // Zero incidents because the query failed reads as a clean safety record.
    const src = code(PATH);
    expect(src).toContain('loadErrors');
    expect(src).toContain('not a safety record');
  });
});

describe('writes to tables no migration creates', () => {
  const CASES: Array<[string, string]> = [
    ['supabase/functions/geofencing/index.ts', 'alertError'],
    ['supabase/functions/send-intervention-email/index.ts', 'suppressionLogError'],
    ['src/components/onboarding/FeatureTour.tsx', 'user_tour_progress'],
    ['src/components/search/DashboardSearchTrigger.tsx', 'contactsError'],
  ];

  it.each(CASES)('%s reads the error it used to drop', (path, marker) => {
    expect(code(path)).toContain(marker);
  });

  it('the geofence response says whether the alert was actually stored', () => {
    // It answered breach_detected: true whether or not the row was written.
    expect(code('supabase/functions/geofencing/index.ts')).toContain('alert_recorded');
  });

  it('the tour no longer wraps a non-throwing call in try/catch', () => {
    // supabase-js returns the error, so the catch never fired and a finished
    // tour was never recorded: it reappeared on the next visit.
    const src = code('src/components/onboarding/FeatureTour.tsx');
    const completed = src.slice(src.indexOf('markTourAsCompleted'), src.indexOf('if (!isActive)'));
    expect(completed).not.toMatch(/try\s*\{/);
    expect(completed).toMatch(/const \{ error \} = await supabase/);
  });

  it('the estimate conversion no longer writes project_notes at all', () => {
    // US-322 note: this test used to assert that the conversion READ the error
    // from its project_notes insert and told the caller the notes had not come
    // across. US-318 went further and removed the write: project_notes is
    // created by no migration, and the conversion could never reach that line
    // anyway because the project insert above it failed on unknown columns.
    // Reporting a failure well is second best to not making a doomed call.
    //
    // Where the estimate's notes should go is a product decision (projects
    // .description, or a real note surface), recorded on US-318 rather than
    // silently picked here.
    const src = code('src/services/estimateToProjectConversion.ts');
    expect(src).not.toContain('project_notes');
    expect(src).not.toContain('notesCarriedOver');
  });
});

describe('the guard itself', () => {
  const GUARD = 'scripts/check-table-definitions.mjs';

  it('is wired into pre-commit and CI', () => {
    expect(readFileSync('.husky/pre-commit', 'utf8')).toContain('check-table-definitions.mjs');
    expect(readFileSync('.github/workflows/ci.yml', 'utf8')).toContain('check-table-definitions.mjs');
  });

  it('gives every baselined table a written reason rather than a bare name', () => {
    const src = readFileSync(GUARD, 'utf8');
    const baseline = src.slice(src.indexOf('const BASELINE = new Map(['), src.indexOf(']);'));
    // Every entry, against every entry that carries a real reason. Comparing
    // the two is the assertion; a count floor is not. This required at least 13
    // entries, so removing crm_contacts - a baselined table whose only call site
    // was fixed - failed a test whose point was that reasons exist. Third time
    // this shape has bitten: deadLinks.test.ts required >= 16 dead links and
    // fakeSuccess.test.ts pinned BASELINE = 20 exactly. A baseline that only
    // shrinks must never be asserted with a floor.
    const all = [...baseline.matchAll(/\['([a-z_]+)',/g)];
    const reasoned = [...baseline.matchAll(/\['([a-z_]+)',\s*'([^']{40,})/g)];
    expect(all.length).toBeGreaterThan(0);
    expect(reasoned.length, 'baseline entries without a substantial reason').toBe(all.length);
  });

  it('excludes storage buckets, which are not tables', () => {
    expect(readFileSync(GUARD, 'utf8')).toContain('.storage');
  });
});
