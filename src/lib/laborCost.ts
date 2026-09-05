/**
 * What an hour of labor costs (US-321).
 *
 * The authoritative computation runs in Postgres, in the trigger that posts an
 * approved time entry to job_costs, because several approval paths exist and
 * posting must not depend on which one was used. This module is the same
 * formula for the client: previewing a timesheet before approving it, showing
 * a running cost on a job, or checking a number a report shows.
 *
 * Keep the two in step. The SQL is
 * `ROUND(hours * rate * (1 + burden), 2)` in post_labor_cost_on_approval().
 *
 * What this deliberately will not do is invent a rate. Two components used to
 * multiply hours by a hardcoded 65 and write the result to job_costs as
 * though it were fact; the numbers looked like answers and nobody could
 * explain them. An absent rate returns null so a caller has to decide what to
 * show, which is nearly always "rates are not configured" rather than a
 * plausible-looking figure.
 */

export interface LaborCostInput {
  /** Hours worked. */
  hours: number | null | undefined;
  /** Base rate before burden. */
  hourlyRate: number | null | undefined;
  /** Burden as a fraction: 0.25 is 25%. */
  burdenRate?: number | null;
}

/**
 * Returns the burdened labor cost in currency units, rounded to cents, or null
 * when no rate is known.
 */
export function computeLaborCost({
  hours,
  hourlyRate,
  burdenRate,
}: LaborCostInput): number | null {
  if (hourlyRate === null || hourlyRate === undefined || hourlyRate <= 0) {
    return null;
  }

  const h = hours ?? 0;
  if (h <= 0) return 0;

  const burden = burdenRate ?? 0;
  return Math.round(h * hourlyRate * (1 + burden) * 100) / 100;
}

/**
 * The burdened rate on its own, for showing "at $50.00/hr" next to an entry.
 */
export function burdenedHourlyRate(
  hourlyRate: number | null | undefined,
  burdenRate?: number | null
): number | null {
  if (hourlyRate === null || hourlyRate === undefined || hourlyRate <= 0) return null;
  return Math.round(hourlyRate * (1 + (burdenRate ?? 0)) * 100) / 100;
}
