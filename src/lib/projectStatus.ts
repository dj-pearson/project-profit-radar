/**
 * Project status: one set, and the rules for moving between them (US-328).
 *
 * Every project in the product was in planning forever. projectService created
 * them there and nothing moved them, because the one function that looked like
 * it did read a field it had just failed to set:
 *
 *   const updates: Partial<Project> = { completion_percentage, updated_at };
 *   ...
 *   else if (percentage > 0 && updates.status === 'planning')   // always false
 *
 * The rules live here as pure functions and in set_project_status() in the
 * database. Two copies is deliberate: the database is the enforcement, because
 * iOS and the edge functions write too, and this one exists so the screen can
 * explain WHY a transition is blocked before the user attempts it. Anything
 * this module allows, the RPC must allow; the tests assert the two agree by
 * reading the SQL.
 */

export const PROJECT_STATUSES = [
  'planning',
  'active',
  'on_hold',
  'completed',
  'closed',
  'cancelled',
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: 'Planning',
  active: 'Active',
  on_hold: 'On hold',
  completed: 'Completed',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

/** Statuses that mean the crew is expected on site. What "active" counts. */
export const WORKING_STATUSES: readonly ProjectStatus[] = ['active'];

/** Statuses after which no further work or billing is expected. */
export const FINISHED_STATUSES: readonly ProjectStatus[] = ['completed', 'closed', 'cancelled'];

export function isProjectStatus(value: unknown): value is ProjectStatus {
  return typeof value === 'string' && (PROJECT_STATUSES as readonly string[]).includes(value);
}

/**
 * Normalise a status read from the database.
 *
 * 'in_progress' is here because ProjectPipeline and CashFlowSnapshot filtered
 * on it although nothing ever wrote it, so any row carrying it came from a
 * hand edit or an import. Anything else unrecognised reads as planning, which
 * is where the product put every project anyway.
 */
export function normalizeProjectStatus(value: unknown): ProjectStatus {
  if (isProjectStatus(value)) return value;
  if (value === 'in_progress' || value === 'in-progress' || value === 'started') return 'active';
  return 'planning';
}

export interface CloseoutState {
  /** Punch list items not completed, closed or verified. */
  openPunchItems: number;
  /** Required closeout checklist items not completed or marked not applicable. */
  requiredChecklistOpen: number;
  /** Amount still due across this job's non-cancelled, unpaid invoices. */
  unpaidInvoiceTotal: number;
  hasStartDate: boolean;
}

export interface TransitionCheck {
  allowed: boolean;
  /** Blocked, but a user with a reason may proceed anyway. */
  overridable: boolean;
  /** Why it is blocked, phrased for the person looking at the screen. */
  reason?: string;
}

/**
 * May this project move to this status?
 *
 * Cancelled is always reachable, unconditionally: a job that fell through must
 * not be stuck open because nobody ever started its punch list.
 */
export function checkTransition(
  from: ProjectStatus,
  to: ProjectStatus,
  state: CloseoutState
): TransitionCheck {
  if (from === to) {
    return { allowed: false, overridable: false, reason: `Already ${PROJECT_STATUS_LABELS[to].toLowerCase()}` };
  }

  if (to === 'cancelled') return { allowed: true, overridable: false };

  if (from === 'cancelled') {
    return {
      allowed: false,
      overridable: true,
      reason: 'This job was cancelled. Reopening it needs a reason.',
    };
  }

  if (to === 'active' && !state.hasStartDate) {
    return {
      allowed: false,
      overridable: true,
      reason: 'Set a start date first, or say why the job is running without one.',
    };
  }

  if (to === 'completed') {
    if (state.openPunchItems > 0) {
      return {
        allowed: false,
        overridable: true,
        reason: `${state.openPunchItems} punch list item${state.openPunchItems === 1 ? '' : 's'} still open.`,
      };
    }
    if (state.requiredChecklistOpen > 0) {
      return {
        allowed: false,
        overridable: true,
        reason: `${state.requiredChecklistOpen} required closeout item${
          state.requiredChecklistOpen === 1 ? '' : 's'
        } outstanding.`,
      };
    }
  }

  if (to === 'closed' && state.unpaidInvoiceTotal > 0) {
    return {
      allowed: false,
      overridable: true,
      reason: `${state.unpaidInvoiceTotal.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      })} is still outstanding on this job.`,
    };
  }

  return { allowed: true, overridable: false };
}

/**
 * Should the PM be asked to mark this project active?
 *
 * A superintendent clocking in or filing a daily report is the crew being on
 * site, which is what active means. Rather than flipping the status behind
 * their back - the status drives what the customer sees - this returns the
 * prompt and the screen asks.
 */
export function shouldPromptToActivate(params: {
  status: unknown;
  hasApprovedTimeEntries: boolean;
  hasDailyReports: boolean;
}): boolean {
  return (
    normalizeProjectStatus(params.status) === 'planning' &&
    (params.hasApprovedTimeEntries || params.hasDailyReports)
  );
}

export interface ChecklistProgress {
  total: number;
  completed: number;
  requiredOpen: number;
  percent: number;
}

/**
 * Progress across the closeout checklist.
 *
 * not_applicable counts as done: a job with no mechanical work should not sit
 * at 90% forever because it has no mechanical inspection to pass.
 */
export function checklistProgress(
  items: Array<{ status: string; is_required?: boolean }>
): ChecklistProgress {
  const total = items.length;
  const done = items.filter((i) => i.status === 'completed' || i.status === 'not_applicable').length;
  const requiredOpen = items.filter(
    (i) => i.is_required !== false && i.status !== 'completed' && i.status !== 'not_applicable'
  ).length;

  return {
    total,
    completed: items.filter((i) => i.status === 'completed').length,
    requiredOpen,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}
