/**
 * Punch list completion summary logic (US-104).
 *
 * Pure aggregation of punch_list_items by status/priority so the project
 * closeout view can show a completion progress bar and counts. Unit testable.
 */

export type PunchStatus = 'open' | 'in_progress' | 'completed' | 'verified' | 'closed';

export interface PunchItemLike {
  status?: string | null;
  priority?: string | null;
}

/** Statuses that count as "done" for the completion bar. */
const DONE_STATUSES = new Set(['completed', 'verified', 'closed']);

export interface PunchListSummary {
  total: number;
  open: number;
  inProgress: number;
  completed: number;
  verified: number;
  closed: number;
  critical: number;
  /** Verified items as a percentage of all items (0–100). */
  verifiedPercent: number;
  /** Completed/verified/closed items as a percentage of all items (0–100). */
  completionPercent: number;
}

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

/** Summarize punch list items into counts and completion percentages. */
export function summarizePunchList(items: PunchItemLike[]): PunchListSummary {
  let open = 0;
  let inProgress = 0;
  let completed = 0;
  let verified = 0;
  let closed = 0;
  let critical = 0;

  for (const item of items) {
    switch ((item.status ?? '').toLowerCase()) {
      case 'open':
        open += 1;
        break;
      case 'in_progress':
        inProgress += 1;
        break;
      case 'completed':
        completed += 1;
        break;
      case 'verified':
        verified += 1;
        break;
      case 'closed':
        closed += 1;
        break;
    }
    if ((item.priority ?? '').toLowerCase() === 'critical') critical += 1;
  }

  const total = items.length;
  const doneCount = items.filter((i) => DONE_STATUSES.has((i.status ?? '').toLowerCase())).length;

  return {
    total,
    open,
    inProgress,
    completed,
    verified,
    closed,
    critical,
    verifiedPercent: pct(verified, total),
    completionPercent: pct(doneCount, total),
  };
}
