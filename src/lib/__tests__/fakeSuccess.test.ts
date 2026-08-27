import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

/**
 * US-309: a success message over an operation that performed no write.
 *
 * Distinct from US-300's silent writes, where a write's error is discarded.
 * Here there is no write to fail - the screen simply says it worked. The user
 * acts on a claim that is false, and on a compliance screen that claim carries
 * regulatory weight.
 */

const GUARD = 'scripts/check-fake-success.mjs';

/** Comment lines stripped, so a file documenting the old shape is not using it. */
function code(path: string): string {
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => {
      const t = line.trim();
      return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
    })
    .join('\n');
}

describe('the guard itself had a false-positive class', () => {
  it('does not treat the JSX placeholder attribute as a stand-in for work', () => {
    // `placeholder` matched the input hint text on every form, which put 16
    // files into the backlog that could never have been real hits - among them
    // ResetPassword, which awaits supabase.auth.updateUser, checks the error,
    // and shows success only on the else branch. A baseline entry is meant to
    // mean somebody looked at it.
    const guard = readFileSync(GUARD, 'utf8');
    expect(guard).toContain('\\bplaceholder\\b(?!\\s*[=:])');
  });

  it('and that fix is what lowered the baseline, not fixed screens', () => {
    // Stated in the guard so nobody reads 43 -> 27 as 16 repairs.
    const guard = readFileSync(GUARD, 'utf8');
    expect(guard).toContain('not a stand-in for work');
    expect(guard).toMatch(/^const BASELINE = 25;$/m);
  });

  it('still fires on a real stand-in', () => {
    // The narrowing must not have removed the check's teeth.
    const guard = readFileSync(GUARD, 'utf8');
    for (const token of ['for now', 'not implemented', 'simulat', 'setTimeout']) {
      expect(guard).toContain(token);
    }
  });

  it('and the guard runs clean at its baseline', () => {
    const result = spawnSync('node', [GUARD], { encoding: 'utf8' });
    expect(result.status).toBe(0);
  });
});

describe('PunchList: two live handlers that wrote nothing', () => {
  const SRC = 'src/pages/PunchList.tsx';

  it('marking an item in progress, complete or verified actually writes', () => {
    // It said "Status updated successfully" and wrote nothing, then loadData()
    // re-read the row and the badge snapped back. /punch-list is a live route,
    // and a punch list is the snag list for handover.
    const src = code(SRC);
    expect(src).toMatch(/const \{ error \} = await supabase\s*\n\s*\.from\('punch_list_items'\)\s*\n\s*\.update\(updates\)/);
    expect(src).toContain('status: newStatus');
  });

  it('and stamps who completed or verified it, which the schema has columns for', () => {
    const src = code(SRC);
    expect(src).toContain("updates.date_completed = today");
    expect(src).toContain('updates.completed_by = user?.id ?? null');
    expect(src).toContain("updates.date_verified = today");
    expect(src).toContain('updates.verified_by = user?.id ?? null');
  });

  it('adding a comment stores it and the card renders it', () => {
    // There is no comments table for punch list items, only the item's own
    // notes column. Appending there is only honest if the notes are shown -
    // otherwise it is a write nobody can read.
    const src = code(SRC);
    expect(src).toMatch(/\.update\(\{ notes: nextNotes/);
    expect(src).toContain('{item.notes}');
  });

  it('and neither handler claims success on a failed write', () => {
    const src = code(SRC);
    expect(src).toContain('Status not updated');
    expect(src).toContain('Comment not added');
  });
});

describe('EnvironmentalPermitting: fabricated regulatory records on a live route', () => {
  const SRC = 'src/pages/EnvironmentalPermitting.tsx';

  it('no longer hardcodes permits, assessments or monitoring data', () => {
    // Worse than a fake success. Behind RouteGuard at /environmental-permitting
    // this rendered a Clean Water Act Section 404 permit marked approved,
    // compliant and expiring 2026-01-15, an EPA NPDES storm water permit, and
    // an Endangered Species Act consultation - none of them real, all of them
    // presented as this company's records.
    const src = code(SRC);
    expect(src).not.toContain('ENV-2024-0001');
    expect(src).not.toContain('Clean Water Act Section 404 Permit');
    expect(src).not.toContain('NPDES Storm Water Permit');
    expect(src).not.toMatch(/const permits = \[/);
    expect(src).not.toMatch(/const assessments = \[/);
    expect(src).not.toMatch(/const monitoringData = \[/);
  });

  it('reads the three real tables, scoped to the company', () => {
    const src = code(SRC);
    for (const table of [
      'environmental_permits',
      'environmental_assessments',
      'environmental_monitoring',
    ]) {
      expect(src, table).toContain(`.from('${table}')`);
    }
    const scoped = src.match(/\.eq\('company_id', userProfile!\.company_id\)/g) ?? [];
    expect(scoped.length, 'all three queries must be company-scoped').toBe(3);
  });

  it('and renders empty as empty rather than as somebody else records', () => {
    const src = code(SRC);
    expect(src).toContain('No environmental permits recorded');
    expect(src).toContain('permitsLoading');
  });

  it('its three save handlers write and report their errors', () => {
    const src = code(SRC);
    const updates = src.match(/const \{ error \} = await supabase/g) ?? [];
    expect(updates.length).toBe(3);
    expect(src).toContain('Permit not updated');
    expect(src).toContain('Assessment not updated');
    expect(src).toContain('Monitoring data not updated');
  });
});
