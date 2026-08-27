import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * US-300. Twenty-eight writes in the web app discarded their result.
 * supabase-js returns the error rather than throwing it, so a `try`/`catch`
 * around the call never fires and the code carries on as if the write landed.
 *
 * The pattern is always the same and always invisible: the UI updates its own
 * state, or shows its success toast, on the strength of having called the
 * database rather than on what the database said. Deleting a template removed
 * it from the list and left it in the table, so it came back on reload. "Mark
 * Complete" left the task open and said nothing at all. Merging two contacts
 * reassigned their activities and then deleted the contacts whether or not the
 * reassignment worked.
 *
 * All 28 now read the error. The web half reached zero first; the edge-function
 * half followed on 2026-08-27, so the whole backlog is now zero and the guard is
 * a hard rule rather than a ratchet.
 */

const GUARD = 'scripts/check-silent-writes.mjs';

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

describe('the destructive writes', () => {
  it('deleting a template does not update the list until the delete succeeds', () => {
    const src = code('src/components/tasks/TaskTemplatesDialog.tsx');
    // Both deletes: read the error, tell the user, and return before touching
    // local state. The old shape removed the row from state either way.
    expect(src).toMatch(/const \{ error \} = await supabase[\s\S]{0,120}\.from\('project_templates'\)[\s\S]{0,80}\.delete\(\)/);
    expect(src).toMatch(/const \{ error \} = await supabase[\s\S]{0,120}\.from\('task_templates'\)[\s\S]{0,80}\.delete\(\)/);
    expect(src).not.toMatch(/try \{\s*await supabase/);
  });

  it('merging contacts stops before the delete if the activities did not move', () => {
    // The worst of the 28: a failed reassignment fell through to deleting the
    // secondary contacts, taking their history with them.
    const src = code('src/hooks/useCRM.ts');
    expect(src).toContain('reassignError');
    expect(src).toContain('so nothing was merged');
    // The check has to come before the delete in the merge, not after it.
    // `.in('id', secondaryIds)` also appears elsewhere in this file, so the
    // delete is located from the reassign onwards rather than from the start.
    const reassign = src.indexOf('if (reassignError)');
    expect(reassign).toBeGreaterThan(-1);
    const deleteSecondary = src.indexOf(".delete()", reassign);
    expect(deleteSecondary).toBeGreaterThan(reassign);
    expect(src.slice(reassign, deleteSecondary)).toContain("from('contacts')");
  });
});

describe('the writes behind a success message', () => {
  it('marking a task complete reports a failure instead of doing nothing', () => {
    const src = code('src/components/tasks/TaskDetailView.tsx');
    expect(src).toMatch(/const \{ data, error \} = await supabase/);
    expect(src).toContain('Could not complete this task');
    expect(src).toContain('Could not reopen this task');
  });

  it('call notes only claim to be saved when they were', () => {
    // `.then(() => toast("saved"))` resolves with { data, error } whether or not
    // the write succeeded.
    const src = code('src/components/crm/ClickToCall.tsx');
    expect(src).toMatch(/\.then\(\(\{ error \}\) =>/);
    expect(src).toContain('Call notes not saved');
  });

  it('an RFI response does not report success when the RFI stayed open', () => {
    const src = code('src/pages/RFIs.tsx');
    expect(src).toContain('closeError');
    expect(src).toContain('could not be closed');
  });

  it('a social post does not claim to be scheduled for a platform it was not queued to', () => {
    const src = code('src/components/social-media/PostComposer.tsx');
    expect(src).toContain('resultError');
    expect(src).toContain('was not queued');
  });

  it('dismissing the onboarding checklist does not hide it before the dismissal saves', () => {
    const src = code('src/components/onboarding/OnboardingChecklist.tsx');
    const dismiss = src.slice(src.indexOf('const dismissChecklist'));
    expect(dismiss.indexOf('if (error)')).toBeLessThan(dismiss.indexOf('setIsDismissed(true)'));
  });
});

describe('the best-effort writes', () => {
  const BEST_EFFORT: Array<[string, string]> = [
    ['src/lib/analytics.ts', 'eventError'],
    ['src/hooks/useActivityTracking.tsx', 'timelineError'],
    ['src/hooks/useBehavioralTriggers.ts', 'eventError'],
    ['src/utils/dosProtection.ts', 'logError'],
    ['src/components/collaboration/UserPresence.tsx', 'Presence heartbeat failed'],
  ];

  it.each(BEST_EFFORT)('%s reads the error even though it does not act on it', (file, marker) => {
    // Best-effort is a reason not to fail the user's action. It is not a reason
    // to be unable to tell a table that rejects every write from one that
    // accepts them.
    expect(code(file)).toContain(marker);
  });
});

describe('the backlog', () => {
  it('has come all the way down and can only stay down', () => {
    const src = readFileSync(GUARD, 'utf8');
    const baseline = Number.parseInt(/const BASELINE = (\d+);/.exec(src)?.[1] ?? '-1', 10);
    // This was `toBeGreaterThan(0)` while the backlog was being worked off,
    // deliberately unpinned so each fix would not break it. The backlog reached
    // zero on 2026-08-27, so the guard is a hard rule now rather than a ratchet
    // and the assertion is exact: 0, and never anything else.
    expect(baseline).toBe(0);
  });

  it('and the guard still fails on a regression', () => {
    const src = readFileSync(GUARD, 'utf8');
    expect(src).toMatch(/hits\.length > BASELINE[\s\S]{0,800}process\.exit\(1\)/);
  });
});
