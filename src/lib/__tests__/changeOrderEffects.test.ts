/**
 * US-323: an approved change order has to change something.
 *
 * Approval flipped two flags and closed a task. It never touched the project's
 * contract value, its budget lines or any date, so budget vs actual was
 * measured against the original contract forever - on a platform whose own
 * marketing says 85% of jobs carry changes. A contractor who had approved
 * $40,000 of extras was reading a job that looked $40,000 over budget.
 *
 * The arithmetic is a Postgres trigger, so what is checkable here without a
 * database is that the trigger exists and does the four things it must, and
 * that the two application-level holes are closed: a project manager could set
 * the customer's approval, and the approval task was matched by ilike on the
 * change order number, so CO-1 closed CO-10's and CO-100's tasks too.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const MIGRATION = 'supabase/migrations/20260903060000_change_order_effects.sql';
const FUNCTION = 'supabase/functions/change-orders/index.ts';

const sql = readFileSync(MIGRATION, 'utf8');

/** Comments stripped, so a file describing the old shape does not match it. */
const code = readFileSync(FUNCTION, 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((line) => !line.trim().startsWith('//'))
  .join('\n');

describe('approval moves the contract (US-323)', () => {
  it('keeps the original contract value and moves a separate current one', () => {
    // Adding change orders to projects.budget would destroy the only record of
    // what was originally agreed, which is the number a dispute turns on.
    expect(sql).toMatch(/original_contract_value/);
    expect(sql).toMatch(/current_contract_value/);
    expect(sql).toMatch(/SET current_contract_value = COALESCE\(current_contract_value/);
  });

  it('backfills existing jobs rather than waiting for their next change order', () => {
    expect(sql).toMatch(/UPDATE public\.projects[\s\S]*?SET original_contract_value/);
    expect(sql).toMatch(/SUM\(co\.amount\)/);
  });

  it('moves the budget line for the change order cost code', () => {
    expect(sql).toMatch(/UPDATE public\.project_budgets/);
    expect(sql).toMatch(/SET budgeted_amount = COALESCE\(budgeted_amount, 0\) \+ v_delta/);
    expect(sql).toMatch(/INSERT INTO public\.project_budgets/);
  });

  it('reverses every effect when approval is withdrawn', () => {
    // A contract that stays inflated after a change order is rejected is worse
    // than one that never moved.
    expect(sql).toMatch(/v_delta := CASE WHEN v_is_approved THEN COALESCE\(NEW\.amount, 0\) ELSE -COALESCE\(NEW\.amount, 0\) END/);
    expect(sql).toMatch(/v_days\s+:= CASE WHEN v_is_approved THEN COALESCE\(NEW\.impact_days, 0\) ELSE -COALESCE\(NEW\.impact_days, 0\) END/);
  });

  it('pushes the end date by impact_days and records the revised date', () => {
    expect(sql).toMatch(/end_date = CASE/);
    expect(sql).toMatch(/end_date \+ v_days/);
    expect(sql).toMatch(/NEW\.revised_completion_date/);
  });

  it('persists status instead of leaving the client to derive it', () => {
    // ChangeOrders.tsx computed a badge from the two flags and only ever wrote
    // 'rejected', so nothing server-side could tell an approved change order
    // from a pending one.
    expect(sql).toMatch(/NEW\.status := 'approved'/);
    expect(sql).toMatch(/NEW\.status := 'pending'/);
  });

  it('requires both sides before anything moves', () => {
    expect(sql).toMatch(/COALESCE\(NEW\.internal_approved, false\) AND COALESCE\(NEW\.client_approved, false\)/);
  });

  it('warns rather than guessing when a change order has no cost code', () => {
    expect(sql).toMatch(/RAISE WARNING 'change order % approved with no cost code/);
  });
});

describe('the approval holes are closed (US-323)', () => {
  it('refuses to let staff approve on the customer\'s behalf', () => {
    // The client branch accepted the same three roles as the internal branch,
    // so one person could set both flags and move the contract value.
    expect(code).toMatch(/approvalType === 'client'/);
    expect(code).toMatch(/The client approves their own change orders/);
    // and no longer writes the client's flag
    const clientBranch = code.slice(
      code.indexOf("approvalType === 'client'"),
      code.indexOf("approvalType === 'client'") + 800
    );
    expect(clientBranch).not.toMatch(/client_approved:\s*approved/);
  });

  it('closes the approval task by foreign key, not by name matching', () => {
    expect(code).not.toMatch(/\.ilike\(/);
    expect(code).toMatch(/approval_task_id/);
    expect(sql).toMatch(/approval_task_id UUID REFERENCES public\.tasks\(id\)/);
  });

  it('links the approval task when the change order is created', () => {
    expect(code).toMatch(/update\(\{ approval_task_id: createdTasks\[0\]\.id \}\)/);
  });
});
