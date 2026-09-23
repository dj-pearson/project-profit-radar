/**
 * Condition steps for execute-workflow.
 *
 * The step used to pick its branch with `Math.random() > 0.5` and save the
 * result to workflow_step_executions as `condition_met`, so the same workflow
 * on the same record took the true branch half the time. This evaluates the
 * condition against the execution's trigger_data instead, with the operators
 * the WorkflowBuilder offers (equals, not_equals, greater_than, less_than,
 * contains). A condition this cannot evaluate - no field, an unknown
 * operator, a shape it does not recognise - is an error, not a coin flip.
 *
 * Pure on purpose, so vitest can load it.
 */

export const CONDITION_OPERATORS = ['equals', 'not_equals', 'greater_than', 'less_than', 'contains'] as const;
export type ConditionOperator = (typeof CONDITION_OPERATORS)[number];

export type ConditionResult =
  | { ok: true; met: boolean; field: string; operator: ConditionOperator; actual: unknown }
  | { ok: false; error: string };

/** Reads `a.b.c` out of an object. Missing segments give undefined. */
export function readPath(data: unknown, path: string): unknown {
  let cur: unknown = data;
  for (const seg of path.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

function toNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * `condition` is `{ field, operator, value }`. Anything else (a free-text
 * string, a missing field) cannot be evaluated and says so.
 */
export function evaluateWorkflowCondition(
  condition: unknown,
  triggerData: Record<string, unknown> | null | undefined,
): ConditionResult {
  if (!condition || typeof condition !== 'object' || Array.isArray(condition)) {
    return { ok: false, error: 'Condition must be an object with field, operator and value' };
  }
  const { field, operator, value } = condition as Record<string, unknown>;
  if (typeof field !== 'string' || field.trim() === '') {
    return { ok: false, error: 'Condition has no field to evaluate' };
  }
  if (typeof operator !== 'string' || !(CONDITION_OPERATORS as readonly string[]).includes(operator)) {
    return { ok: false, error: `Unsupported condition operator: ${String(operator)}` };
  }
  const op = operator as ConditionOperator;
  const actual = readPath(triggerData ?? {}, field.trim());

  let met: boolean;
  switch (op) {
    case 'equals':
      met = actual === value || (actual != null && value != null && String(actual) === String(value));
      break;
    case 'not_equals':
      met = !(actual === value || (actual != null && value != null && String(actual) === String(value)));
      break;
    case 'greater_than':
    case 'less_than': {
      const a = toNumber(actual);
      const b = toNumber(value);
      if (a === null || b === null) {
        return { ok: false, error: `Cannot compare ${field} numerically: ${String(actual)} vs ${String(value)}` };
      }
      met = op === 'greater_than' ? a > b : a < b;
      break;
    }
    case 'contains':
      if (Array.isArray(actual)) met = actual.some((x) => x === value || String(x) === String(value));
      else if (typeof actual === 'string') met = value != null && actual.includes(String(value));
      else met = false;
      break;
  }
  return { ok: true, met, field: field.trim(), operator: op, actual };
}
