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
    // At most 20, not exactly 20. This pinned the number and so failed the
    // moment the baseline legitimately fell to 19 - the same inversion the
    // dead-link test had, where an assertion about a shrinking baseline was
    // written as a floor. The claim being made here is that the narrowing took
    // it to 20 and nothing has raised it since; a lower number is the guard
    // working.
    const m = /^const BASELINE = (\d+);$/m.exec(guard);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBeLessThanOrEqual(20);
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

describe('the guard had a second false-positive class: prose in a string', () => {
  it('does not scan user-facing string literals for stand-in wording', () => {
    // ProjectSchedule was flagged by its own correct error toast,
    // 'That dependency would create a cycle.' - in a handler that goes on to
    // await addDependency. A stand-in for work lives in code or in a comment
    // where the work should be, never inside a quoted message.
    const guard = readFileSync(GUARD, 'utf8');
    expect(guard).toContain('function withoutStringLiterals');
    expect(guard).toContain('PRETENDS.test(withoutStringLiterals(body))');
  });

  it('but still scans comments, which is where most real ones live', () => {
    const guard = readFileSync(GUARD, 'utf8');
    expect(guard).toContain('Comments are');
    expect(guard).toContain('deliberately kept');
  });
});

describe('QuickBooksRouting: four fake successes on the money path', () => {
  const SRC = 'src/pages/QuickBooksRouting.tsx';

  it('stops reporting a hardcoded routing count for work that never ran', () => {
    // It waited three seconds on a setTimeout and announced "Successfully
    // routed 12 transactions using 5 rules" - two invented numbers about the
    // customer's accounting data.
    const src = code(SRC);
    expect(src).not.toContain('Successfully routed 12 transactions using 5 rules');
    expect(src).not.toMatch(/setTimeout\(\(\) => \{[\s\S]{0,200}Auto-routing Complete/);
    expect(src).toContain("action: 'process_batch'");
    expect(src).toContain('results.auto_assigned_count');
  });

  it('creates the routing rule it says it created', () => {
    const src = code(SRC);
    expect(src).toMatch(/const \{ error: ruleError \} = await supabase/);
    expect(src).toContain("from('quickbooks_routing_rules' as any)");
    expect(src).toContain('Rule not created');
  });

  it('routes a transaction through the edge function that does the work', () => {
    // quickbooks-route-transactions has had a manual_assign action all along;
    // the page simply never called it.
    const src = code(SRC);
    const calls = src.match(/action: 'manual_assign'/g) ?? [];
    expect(calls.length, 'single and bulk assignment both go through it').toBe(2);
    expect(src).toContain('Transaction not routed');
  });

  it('and bulk assignment counts what it actually assigned', () => {
    const src = code(SRC);
    expect(src).toContain('Assigned ${assigned} transactions to project.');
    expect(src).toContain('Assigned ${assigned} of ${selectedTransactions.length}');
    expect(src).not.toContain('Assigned ${selectedTransactions.length} transactions to project.');
  });
});

describe('InteractiveFloorPlan: safety pins that evaporate on refresh', () => {
  const SRC = 'src/components/visual-project/InteractiveFloorPlan.tsx';

  it('does not claim a floor plan was uploaded when a FileReader read it', () => {
    // No floor plan bucket or table exists in supabase/migrations, and the
    // component is live-routed via appRoutes -> VisualProjectManagementPage.
    const src = code(SRC);
    expect(src).not.toContain('Floor plan uploaded successfully');
    expect(src).toContain('not uploaded or saved anywhere yet');
  });

  it('and does not claim a pinned issue was added to anything durable', () => {
    const src = code(SRC);
    expect(src).not.toContain('"Issue added to floor plan"');
    expect(src).toContain('lost when you leave this screen');
    expect(src).toContain('held in this browser session only');
  });
});

describe('useSimplePresence: three colleagues who do not exist', () => {
  const SRC = 'src/hooks/useSimplePresence.ts';

  it('no longer invents teammates or the sites they are standing on', () => {
    // TeamPresencePanel and UserPresenceIndicator rendered this straight to the
    // screen: "John Smith - online - Job Site Alpha", "Sarah Johnson - away -
    // Job Site Beta", "Mike Davis - busy - Main Office". On a construction
    // platform, who is on site right now is an operational question.
    const src = code(SRC);
    for (const invented of ['John', 'Sarah', 'Johnson', 'Mike', 'Davis', 'Job Site Alpha', 'Job Site Beta']) {
      expect(src, `${invented} is still hardcoded`).not.toContain(invented);
    }
    expect(src).not.toContain('simulatePresenceData');
  });

  it('reads the user_presence table that already existed', () => {
    // collaboration/UserPresence.tsx has read it since migration 20250803232624.
    const src = code(SRC);
    expect(src).toContain("from('user_presence')");
    expect(src).toContain("eq('company_id', userProfile.company_id)");
  });

  it('and an unreadable presence table renders empty rather than invented', () => {
    // Asserted on the code, not the comment: code() strips comments.
    const src = code(SRC);
    expect(src).toContain('setPresenceData([]);');
    expect(src).toContain('setMyPresence(null);');
    // The empty fallback must be in the catch, not somewhere incidental.
    const catchIndex = src.indexOf('} catch (error) {');
    expect(catchIndex).toBeGreaterThan(-1);
    expect(src.indexOf('setPresenceData([]);')).toBeGreaterThan(catchIndex);
  });

  it('writes your own status where other people can see it', () => {
    // updatePresence set local state and toasted "Status Updated"; nobody else
    // ever saw the change. The live table has no location column, so location
    // rides in metadata and the hook's published shape is unchanged.
    const src = code(SRC);
    expect(src).toMatch(/const \{ error \} = await supabase\s*\n\s*\.from\('user_presence'\)\s*\n\s*\.upsert\(/);
    expect(src).toContain("onConflict: 'user_id'");
    expect(src).toContain('metadata: location ? { location } : {}');
    expect(src).toContain('Status not updated');
  });
});

describe('useSimpleNotifications: a fabricated safety incident', () => {
  const SRC = 'src/hooks/useSimpleNotifications.ts';

  it('no longer ships five invented notifications, one of them a safety report', () => {
    // RealtimeNotificationCenter rendered these as the user's own inbox. The
    // urgent one read "Minor incident reported at Job Site Alpha. All team
    // members are safe. Report filed for review." - about an incident that
    // never happened. Another announced a maintenance window tonight.
    const src = code(SRC);
    expect(src).not.toContain('Minor incident reported at Job Site Alpha');
    expect(src).not.toContain('Scheduled maintenance will occur tonight');
    expect(src).not.toContain('is approaching 90% of allocated budget');
    expect(src).not.toContain('simulateNotifications');
  });

  it('reads real_time_notifications, scoped to the recipient', () => {
    const src = code(SRC);
    // Scoping has to be on the SELECT itself. `eq('recipient_id', ...)` also
    // appears in markAsRead, markAllAsRead and the delete, so a bare toContain
    // passes with the read left unscoped - it would return every user's inbox.
    expect(src).toMatch(
      /\.from\('real_time_notifications'\)\s*\n\s*\.select\(`[\s\S]*?`\)\s*\n\s*\.eq\('recipient_id', userProfile\.id\)\s*\n\s*\.order\('created_at'/,
    );
    // An unreadable inbox renders empty rather than invented.
    expect(src).toContain('setNotifications([]);');
    expect(src).toContain('setUnreadCount(0);');
  });

  it('sends, reads and marks notifications for real', () => {
    const src = code(SRC);
    // send
    expect(src).toMatch(/const \{ data: inserted, error \} = await supabase/);
    expect(src).toContain('Notification not sent');
    // mark read, and mark all read
    expect(src).toContain("update({ read_at: readAt })");
    expect(src).toContain("is('read_at', null)");
    expect(src).toContain('Not marked as read');
  });

  it('and proves a delete actually removed the row', () => {
    // RLS denies what no policy permits and returns no error, so a missing
    // DELETE policy would have made the delete a silent no-op under a
    // "deleted" toast - the US-309 shape reintroduced by its own fix.
    const src = code(SRC);
    expect(src).toMatch(/const \{ data: removed, error \} = await supabase/);
    expect(src).toContain("!removed || removed.length === 0");
    expect(src).toContain('The notification is still there');
  });

  it('and the DELETE policy it needs is created by a migration', () => {
    const sql = readFileSync(
      'supabase/migrations/20260827140000_notification_delete_policy.sql',
      'utf8',
    );
    expect(sql).toContain('FOR DELETE');
    expect(sql).toContain('auth.uid() = recipient_id');
  });
});
