/**
 * US-328: projects never left planning, and closeout was a mock page.
 *
 * projectService created every project in 'planning' and nothing anywhere
 * moved it. The one function that looked like it did could not:
 *
 *   const updates: Partial<Project> = { completion_percentage, updated_at };
 *   if (percentage === 100) updates.status = 'completed';
 *   else if (percentage > 0 && updates.status === 'planning') ...
 *
 * `updates` is a fresh local object that never carries a status, so the
 * planning-to-active branch read a field it had just failed to set and was
 * dead. The function had no callers either way.
 *
 * The transition rules exist twice on purpose: in set_project_status() where
 * they are enforced for every client, and in src/lib/projectStatus.ts so the
 * screen can say WHY before the user clicks. The last describe block asserts
 * the two agree.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import {
  PROJECT_STATUSES,
  WORKING_STATUSES,
  FINISHED_STATUSES,
  checkTransition,
  checklistProgress,
  normalizeProjectStatus,
  shouldPromptToActivate,
  type CloseoutState,
} from '../projectStatus';

const clear: CloseoutState = {
  openPunchItems: 0,
  requiredChecklistOpen: 0,
  unpaidInvoiceTotal: 0,
  hasStartDate: true,
};

const strip = (path: string) =>
  readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('--'))
    .join('\n');

describe('one status set (US-328)', () => {
  it('is the six the migration constrains, in that order', () => {
    expect([...PROJECT_STATUSES]).toEqual([
      'planning', 'active', 'on_hold', 'completed', 'closed', 'cancelled',
    ]);
  });

  it('counts only active as active', () => {
    // useDashboardData returned projects.length, so every project counted and
    // the number looked plausible while the status it summarised was never
    // written.
    expect([...WORKING_STATUSES]).toEqual(['active']);
    expect(WORKING_STATUSES).not.toContain('planning');
  });

  it('treats completed, closed and cancelled as finished', () => {
    expect([...FINISHED_STATUSES]).toEqual(['completed', 'closed', 'cancelled']);
  });

  it("reads 'in_progress' as active", () => {
    // ProjectPipeline and CashFlowSnapshot filtered on it although nothing ever
    // wrote it, so that pipeline stage was permanently empty.
    expect(normalizeProjectStatus('in_progress')).toBe('active');
    expect(normalizeProjectStatus('in-progress')).toBe('active');
  });

  it('falls back to planning rather than throwing on junk', () => {
    expect(normalizeProjectStatus(null)).toBe('planning');
    expect(normalizeProjectStatus('')).toBe('planning');
    expect(normalizeProjectStatus('Whatever')).toBe('planning');
    expect(normalizeProjectStatus(42)).toBe('planning');
  });
});

describe('going active (US-328)', () => {
  it('needs a start date', () => {
    const check = checkTransition('planning', 'active', { ...clear, hasStartDate: false });
    expect(check.allowed).toBe(false);
    expect(check.overridable).toBe(true);
    expect(check.reason).toMatch(/start date/);
  });

  it('is allowed once there is one', () => {
    expect(checkTransition('planning', 'active', clear).allowed).toBe(true);
  });

  it('does not care about the punch list', () => {
    // Punch items exist on jobs that are underway; blocking activation on them
    // would be backwards.
    expect(checkTransition('planning', 'active', { ...clear, openPunchItems: 9 }).allowed).toBe(true);
  });
});

describe('marking complete (US-328)', () => {
  it('is blocked by an open punch list, overridably', () => {
    const check = checkTransition('active', 'completed', { ...clear, openPunchItems: 3 });
    expect(check.allowed).toBe(false);
    expect(check.overridable).toBe(true);
    expect(check.reason).toBe('3 punch list items still open.');
  });

  it('says "item" for one and "items" for several', () => {
    expect(checkTransition('active', 'completed', { ...clear, openPunchItems: 1 }).reason)
      .toBe('1 punch list item still open.');
  });

  it('is blocked by outstanding required closeout items', () => {
    const check = checkTransition('active', 'completed', { ...clear, requiredChecklistOpen: 2 });
    expect(check.allowed).toBe(false);
    expect(check.reason).toMatch(/2 required closeout items outstanding/);
  });

  it('does not care about unpaid invoices - that is closing, not completing', () => {
    // The work being finished and the money being in are two different
    // milestones, which is why completed_at and closed_at are separate columns.
    expect(checkTransition('active', 'completed', { ...clear, unpaidInvoiceTotal: 48_000 }).allowed)
      .toBe(true);
  });

  it('is allowed with nothing outstanding', () => {
    expect(checkTransition('active', 'completed', clear).allowed).toBe(true);
  });
});

describe('closing the job (US-328)', () => {
  it('needs the money in, overridably', () => {
    const check = checkTransition('completed', 'closed', { ...clear, unpaidInvoiceTotal: 12.5 });
    expect(check.allowed).toBe(false);
    expect(check.overridable).toBe(true);
    expect(check.reason).toMatch(/\$12\.50 is still outstanding/);
  });

  it('is allowed once nothing is owed', () => {
    expect(checkTransition('completed', 'closed', clear).allowed).toBe(true);
  });
});

describe('cancelling (US-328)', () => {
  it('is always allowed, from any status', () => {
    // A job that fell through must not be stuck open because nobody ever
    // started its punch list.
    for (const from of PROJECT_STATUSES) {
      if (from === 'cancelled') continue;
      const check = checkTransition(from, 'cancelled', {
        openPunchItems: 40, requiredChecklistOpen: 12, unpaidInvoiceTotal: 90_000, hasStartDate: false,
      });
      expect(check.allowed).toBe(true);
    }
  });

  it('needs a reason to reopen', () => {
    const check = checkTransition('cancelled', 'active', clear);
    expect(check.allowed).toBe(false);
    expect(check.overridable).toBe(true);
  });

  it('refuses a no-op without offering an override', () => {
    const check = checkTransition('active', 'active', clear);
    expect(check.allowed).toBe(false);
    expect(check.overridable).toBe(false);
  });
});

describe('prompting the PM when work has started (US-328)', () => {
  it('prompts a planning project with approved hours', () => {
    expect(shouldPromptToActivate({
      status: 'planning', hasApprovedTimeEntries: true, hasDailyReports: false,
    })).toBe(true);
  });

  it('prompts a planning project with a daily report', () => {
    expect(shouldPromptToActivate({
      status: 'planning', hasApprovedTimeEntries: false, hasDailyReports: true,
    })).toBe(true);
  });

  it('stays quiet on a planning project nobody has worked', () => {
    expect(shouldPromptToActivate({
      status: 'planning', hasApprovedTimeEntries: false, hasDailyReports: false,
    })).toBe(false);
  });

  it('stays quiet once the project is already active', () => {
    expect(shouldPromptToActivate({
      status: 'active', hasApprovedTimeEntries: true, hasDailyReports: true,
    })).toBe(false);
  });

  it('stays quiet on a job that was cancelled', () => {
    expect(shouldPromptToActivate({
      status: 'cancelled', hasApprovedTimeEntries: true, hasDailyReports: true,
    })).toBe(false);
  });
});

describe('closeout checklist progress (US-328)', () => {
  it('counts not_applicable as done', () => {
    // A job with no mechanical work should not sit at 80% forever because it
    // has no mechanical inspection to pass.
    const p = checklistProgress([
      { status: 'completed', is_required: true },
      { status: 'not_applicable', is_required: true },
      { status: 'pending', is_required: true },
      { status: 'in_progress', is_required: false },
    ]);
    expect(p.total).toBe(4);
    expect(p.percent).toBe(50);
    expect(p.completed).toBe(1);
  });

  it('counts only required items as blocking', () => {
    const p = checklistProgress([
      { status: 'pending', is_required: false },
      { status: 'pending', is_required: true },
    ]);
    expect(p.requiredOpen).toBe(1);
  });

  it('treats a missing is_required as required, not optional', () => {
    // The safer default: a row whose flag did not come back should block, not
    // wave a job through closeout.
    expect(checklistProgress([{ status: 'pending' }]).requiredOpen).toBe(1);
  });

  it('is 0% rather than NaN on an empty checklist', () => {
    expect(checklistProgress([]).percent).toBe(0);
  });
});

describe('the database enforces the same rules (US-328)', () => {
  const sql = strip('supabase/migrations/20260903150000_project_status_and_closeout.sql');

  it('constrains status to the same six values', () => {
    for (const status of PROJECT_STATUSES) {
      expect(sql).toMatch(new RegExp(`'${status}'`));
    }
    expect(sql).toMatch(/ADD CONSTRAINT projects_status_check/);
  });

  it('normalises existing rows before constraining them', () => {
    // Otherwise the migration fails on the first row somebody set by hand.
    const constraintAt = sql.indexOf('ADD CONSTRAINT projects_status_check');
    const normaliseAt = sql.indexOf("UPDATE public.projects SET status = 'planning'");
    expect(normaliseAt).toBeGreaterThan(-1);
    expect(normaliseAt).toBeLessThan(constraintAt);
  });

  it('enforces the start date, the punch list and the money', () => {
    const fn = sql.slice(sql.indexOf('FUNCTION public.set_project_status'));
    expect(fn).toMatch(/needs a start date/);
    expect(fn).toMatch(/punch list item/);
    expect(fn).toMatch(/still outstanding on this job/);
  });

  it('requires a reason for an override and audits it', () => {
    const fn = sql.slice(sql.indexOf('FUNCTION public.set_project_status'));
    expect(fn).toMatch(/v_override\s+boolean := p_override_reason IS NOT NULL/);
    expect(fn).toMatch(/INSERT INTO public\.audit_logs/);
    expect(fn).toMatch(/project\.status_changed/);
  });

  it('scopes the RPC to the caller company', () => {
    const fn = sql.slice(sql.indexOf('FUNCTION public.set_project_status'));
    expect(fn).toMatch(/company_id <> public\.get_user_company\(auth\.uid\(\)\)/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.set_project_status/);
  });

  it('records completed and closed as separate moments', () => {
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS completed_at/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS closed_at/);
  });

  it('is additive: no drops, no NOT NULL added to an existing column', () => {
    expect(sql).not.toMatch(/DROP TABLE/);
    expect(sql).not.toMatch(/DROP COLUMN/);
    expect(sql).not.toMatch(/ALTER COLUMN[\s\S]{0,40}SET NOT NULL/);
  });

  it('keeps concurrent indexes in their own file', () => {
    expect(sql).not.toMatch(/CONCURRENTLY/);
    expect(strip('supabase/migrations/20260903160000_project_closeout_indexes.sql'))
      .toMatch(/CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_company_status/);
  });
});

describe('closeout is real, and US-048 is answered (US-328)', () => {
  it('deleted the hardcoded page nothing routed', () => {
    // 217 lines, a closeoutChecklist array with dates like 2026-02-20 baked in,
    // no Supabase import, and no route in src/routes.
    expect(existsSync('src/pages/ProjectCloseout.tsx')).toBe(false);
  });

  it('is a project hub section instead', () => {
    const content = strip('src/components/project/ProjectContent.tsx');
    expect(content).toMatch(/closeout: renderCloseout/);
    expect(existsSync('src/components/project/ProjectCloseoutTab.tsx')).toBe(true);
  });

  it('appears in both the tab bar and the sub-sidebar', () => {
    // Those two lists disagreed about what the hub contains; a new section has
    // to land in both or it is reachable from one navigation and not the other.
    expect(strip('src/pages/ProjectDetail.tsx')).toMatch(/id: 'closeout'/);
    expect(strip('src/components/project/ProjectSubSidebar.tsx')).toMatch(/id: 'closeout'/);
  });

  it('reads persisted items rather than an array in the file', () => {
    const tab = strip('src/components/project/ProjectCloseoutTab.tsx');
    expect(tab).toMatch(/from\('project_closeout_items'\)/);
    expect(tab).toMatch(/from\('project_closeout_status'\)/);
    expect(tab).not.toMatch(/const closeoutChecklist/);
  });

  it('produces a handover bundle and notifies the customer', () => {
    const tab = strip('src/components/project/ProjectCloseoutTab.tsx');
    expect(tab).toMatch(/downloadHandoverBundle/);
    expect(tab).toMatch(/handover_sent_at/);
    expect(existsSync('src/utils/handoverBundleGenerator.ts')).toBe(true);
  });
});

describe('the screens that were reading the wrong thing (US-328)', () => {
  it('the dashboard no longer counts every project as active', () => {
    const hook = strip('src/hooks/useDashboardData.tsx');
    expect(hook).not.toMatch(/activeProjects: projects\?\.length/);
    expect(hook).toMatch(/WORKING_STATUSES/);
  });

  it('projectService no longer pretends to move the status', () => {
    const svc = strip('src/services/projectService.ts');
    expect(svc).not.toMatch(/updates\.status = 'completed'/);
    expect(svc).not.toMatch(/updates\.status === 'planning'/);
  });

  it('the health badge exempts closed and cancelled, not just completed', () => {
    const badge = strip('src/components/projects/ProjectHealthBadge.tsx');
    expect(badge).not.toMatch(/project\.status !== 'completed'/);
    expect(badge).toMatch(/FINISHED_STATUSES/);
  });

  it('the project hub header offers the control on desktop and mobile', () => {
    const detail = strip('src/pages/ProjectDetail.tsx');
    expect(detail.match(/<ProjectStatusControl/g) || []).toHaveLength(2);
  });
});
