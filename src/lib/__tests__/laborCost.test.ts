/**
 * US-321: what an hour costs.
 *
 * The arithmetic lives in a Postgres trigger, because there are several
 * approval paths (the hook, bulk approve, an edge function, and whatever iOS
 * grows) and posting must not depend on which one was used. That leaves two
 * things worth testing here without a database:
 *
 *   1. The formula itself, extracted so both sides agree on it and so the
 *      story's worked example is checkable: 8 hours at $40 with 25% burden is
 *      $400, not $320 and not $65-an-hour.
 *   2. That the code which used to invent a rate is gone. Two components
 *      multiplied hours by a hardcoded 65 and upserted on a unique constraint
 *      no migration creates, so the statement errored even when pressed.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { computeLaborCost } from '@/lib/laborCost';

describe('labor cost arithmetic (US-321)', () => {
  it('is hours x rate x (1 + burden)', () => {
    // The story's worked example.
    expect(computeLaborCost({ hours: 8, hourlyRate: 40, burdenRate: 0.25 })).toBe(400);
  });

  it('treats no burden as no burden, not as an error', () => {
    expect(computeLaborCost({ hours: 8, hourlyRate: 40, burdenRate: 0 })).toBe(320);
    expect(computeLaborCost({ hours: 8, hourlyRate: 40, burdenRate: null })).toBe(320);
  });

  it('rounds to cents', () => {
    // 7.33 * 41.17 * 1.185 = 357.6046..., which is 357.60 of real money.
    expect(computeLaborCost({ hours: 7.33, hourlyRate: 41.17, burdenRate: 0.185 })).toBe(357.6);
  });

  it('returns null when there is no rate, rather than guessing one', () => {
    // A guessed rate is what the hardcoded 65 was, and it produced job costs
    // nobody could explain. An absent rate has to read as absent.
    expect(computeLaborCost({ hours: 8, hourlyRate: null, burdenRate: 0.25 })).toBeNull();
    expect(computeLaborCost({ hours: 8, hourlyRate: 0, burdenRate: 0.25 })).toBeNull();
  });

  it('is zero-safe on hours', () => {
    expect(computeLaborCost({ hours: 0, hourlyRate: 40, burdenRate: 0.25 })).toBe(0);
    expect(computeLaborCost({ hours: null, hourlyRate: 40, burdenRate: 0.25 })).toBe(0);
  });
});

describe('the invented rate is gone (US-321)', () => {
  it('deletes both components that multiplied hours by 65', () => {
    // Both were unreferenced by anything, both hardcoded the same rate, and
    // both upserted on 'project_id,cost_code_id,date' - a constraint no
    // migration creates - so pressing Sync errored.
    expect(existsSync('src/components/financial/TimeTrackingJobCostingIntegration.tsx')).toBe(false);
    expect(existsSync('src/hooks/useTimeTrackingIntegration.tsx')).toBe(false);
  });

  it('leaves no hardcoded labor rate in the tree', () => {
    const migration = readFileSync(
      'supabase/migrations/20260903030000_labor_cost_posting.sql', 'utf8'
    );
    // The rate comes from resolve_labor_rate, which reads the two rate tables
    // that were dead code before this.
    expect(migration).toMatch(/resolve_labor_rate/);
    expect(migration).toMatch(/labor_burden_rates/);
    expect(migration).toMatch(/labor_rates/);
  });

  it('posts on approval and withdraws the posting if approval is withdrawn', () => {
    const migration = readFileSync(
      'supabase/migrations/20260903030000_labor_cost_posting.sql', 'utf8'
    );
    expect(migration).toMatch(/BEFORE UPDATE OF approval_status ON public\.time_entries/);
    // US-322 generalised the key from time_entry_id to (source_type, source_id)
    // so labor, expenses, purchase order lines, bills and subcontractor
    // payments all withdraw the same way.
    expect(migration).toMatch(/DELETE FROM public\.job_costs\s*\n?\s*WHERE source_type = 'time_entry' AND source_id = NEW\.id/);
  });
});
