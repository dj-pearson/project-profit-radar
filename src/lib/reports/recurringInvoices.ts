/**
 * Recurring invoice scheduling logic (US-068).
 *
 * Pure date math for computing the next run date and remaining occurrences of a
 * recurring invoice config. No React / Supabase so it is unit testable.
 */

export type RecurrenceFrequency = 'weekly' | 'biweekly' | 'monthly';

export interface RecurringConfig {
  frequency: RecurrenceFrequency;
  start_date: string;
  end_date?: string | null;
  occurrence_limit?: number | null;
  occurrences_generated?: number | null;
  status?: string | null;
}

export interface RecurringLineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

/** Advance a date by one period of the given frequency. Returns a new Date. */
export function advanceByFrequency(date: Date, frequency: RecurrenceFrequency): Date {
  const next = new Date(date.getTime());
  switch (frequency) {
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
  }
  return next;
}

/** Remaining occurrences given the cap and how many have been generated. Null = unlimited. */
export function remainingOccurrences(config: RecurringConfig): number | null {
  if (config.occurrence_limit == null) return null;
  return Math.max(config.occurrence_limit - (config.occurrences_generated ?? 0), 0);
}

/**
 * Next run date for a config, as an ISO date (YYYY-MM-DD), or null when the
 * schedule is exhausted (past end_date or hit the occurrence cap or paused).
 *
 * `from` lets tests pin "today"; defaults to now.
 */
export function computeNextRunDate(
  config: RecurringConfig,
  from: Date = new Date()
): string | null {
  if (config.status === 'paused' || config.status === 'completed') return null;

  const remaining = remainingOccurrences(config);
  if (remaining !== null && remaining <= 0) return null;

  const start = new Date(config.start_date);
  if (Number.isNaN(start.getTime())) return null;
  const end = config.end_date ? new Date(config.end_date) : null;

  // Walk forward from start until we pass `from`. The first occurrence on/after
  // the start date that is also >= today is the next run.
  let candidate = new Date(start.getTime());
  const fromMidnight = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  let guard = 0;
  while (candidate.getTime() < fromMidnight.getTime() && guard < 1000) {
    candidate = advanceByFrequency(candidate, config.frequency);
    guard += 1;
  }

  if (end && candidate.getTime() > end.getTime()) return null;
  return candidate.toISOString().slice(0, 10);
}

/** Human label for remaining occurrences ("Unlimited" when uncapped). */
export function remainingLabel(config: RecurringConfig): string {
  const remaining = remainingOccurrences(config);
  if (remaining === null) return 'Unlimited';
  return `${remaining} remaining`;
}

/** Sum of a line-item template (quantity × unit price). */
export function templateTotal(lineItems: RecurringLineItem[]): number {
  return lineItems.reduce((sum, li) => sum + (li.quantity || 0) * (li.unit_price || 0), 0);
}
