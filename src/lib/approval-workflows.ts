/**
 * US-087: Configurable approval workflows.
 *
 * Pure, I/O-free helpers so the workflow rules (step ordering, condition
 * evaluation, validation) are unit-testable independent of Supabase and the UI.
 * The persisted shape stores `steps` and `conditions` as JSONB columns.
 */

export type ApprovalEntityType = 'timesheet' | 'change_order' | 'invoice' | 'expense';

export const ENTITY_TYPES: { value: ApprovalEntityType; label: string }[] = [
  { value: 'timesheet', label: 'Timesheet' },
  { value: 'change_order', label: 'Change Order' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'expense', label: 'Expense' },
];

export type ApproverType = 'role' | 'user';

export interface ApprovalStep {
  /** Stable client id for list keys / reordering. */
  id: string;
  /** 1-based position in the chain. */
  order: number;
  approverType: ApproverType;
  /** Role name when approverType === 'role'. */
  approverRole?: string | null;
  /** User id when approverType === 'user'. */
  approverUserId?: string | null;
  /** Human label for display (role label or user name). */
  approverLabel?: string | null;
}

export type ConditionField = 'amount' | 'project_type';
export type ConditionOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq';

export interface ApprovalCondition {
  id: string;
  field: ConditionField;
  operator: ConditionOperator;
  /** Numeric for `amount`, string for `project_type`. */
  value: number | string;
}

export interface ApprovalWorkflow {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  entity_type: ApprovalEntityType;
  steps: ApprovalStep[];
  conditions: ApprovalCondition[];
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  eq: '=',
};

export const CONDITION_FIELD_LABELS: Record<ConditionField, string> = {
  amount: 'Amount',
  project_type: 'Project type',
};

/** Next 1-based order value for a new step appended to the chain. */
export function nextStepOrder(steps: ApprovalStep[]): number {
  return steps.reduce((max, s) => Math.max(max, s.order), 0) + 1;
}

/** Steps sorted by ascending order (stable for equal orders). */
export function sortSteps(steps: ApprovalStep[]): ApprovalStep[] {
  return [...steps].sort((a, b) => a.order - b.order);
}

/** Re-number steps to a contiguous 1..n sequence after add/remove/reorder. */
export function renumberSteps(steps: ApprovalStep[]): ApprovalStep[] {
  return sortSteps(steps).map((s, i) => ({ ...s, order: i + 1 }));
}

function compare(op: ConditionOperator, left: number, right: number): boolean {
  switch (op) {
    case 'gt':
      return left > right;
    case 'gte':
      return left >= right;
    case 'lt':
      return left < right;
    case 'lte':
      return left <= right;
    case 'eq':
      return left === right;
    default:
      return false;
  }
}

/**
 * Evaluate a single condition against an entity context. `amount` compares
 * numerically; `project_type` matches case-insensitively (only `eq` is
 * meaningful for a string field).
 */
export function evaluateCondition(
  condition: ApprovalCondition,
  context: { amount?: number | null; project_type?: string | null }
): boolean {
  if (condition.field === 'amount') {
    const actual = context.amount;
    if (actual == null) return false;
    return compare(condition.operator, actual, Number(condition.value));
  }
  // project_type: string equality (case-insensitive)
  const actual = (context.project_type ?? '').trim().toLowerCase();
  const expected = String(condition.value).trim().toLowerCase();
  return condition.operator === 'eq' ? actual === expected : false;
}

/**
 * Whether a workflow applies to a given entity. A workflow with no conditions
 * always applies; otherwise ALL conditions must hold (AND semantics).
 */
export function workflowApplies(
  workflow: Pick<ApprovalWorkflow, 'conditions'>,
  context: { amount?: number | null; project_type?: string | null }
): boolean {
  if (!workflow.conditions.length) return true;
  return workflow.conditions.every((c) => evaluateCondition(c, context));
}

/** Human-readable description of a condition, e.g. "Amount > $5000". */
export function describeCondition(c: ApprovalCondition): string {
  const field = CONDITION_FIELD_LABELS[c.field];
  const op = OPERATOR_LABELS[c.operator];
  const value = c.field === 'amount' ? `$${Number(c.value).toLocaleString()}` : `"${c.value}"`;
  return `${field} ${op} ${value}`;
}

/** Display label for a step's approver. */
export function describeStepApprover(step: ApprovalStep): string {
  if (step.approverLabel) return step.approverLabel;
  if (step.approverType === 'role') return step.approverRole ?? 'Role';
  return step.approverUserId ? 'Specific user' : 'Unassigned';
}

/**
 * Validate a draft workflow before save. Returns a list of human-readable
 * errors; an empty array means the draft is valid.
 */
export function validateWorkflow(draft: {
  name: string;
  entity_type: ApprovalEntityType | '';
  steps: ApprovalStep[];
  conditions: ApprovalCondition[];
}): string[] {
  const errors: string[] = [];
  if (!draft.name.trim()) errors.push('Workflow name is required.');
  if (!draft.entity_type) errors.push('Entity type is required.');
  if (draft.steps.length === 0) errors.push('Add at least one approval step.');

  draft.steps.forEach((s, i) => {
    if (s.approverType === 'role' && !s.approverRole) {
      errors.push(`Step ${i + 1}: select an approver role.`);
    }
    if (s.approverType === 'user' && !s.approverUserId) {
      errors.push(`Step ${i + 1}: select an approver user.`);
    }
  });

  draft.conditions.forEach((c, i) => {
    if (c.field === 'amount' && (c.value === '' || Number.isNaN(Number(c.value)))) {
      errors.push(`Condition ${i + 1}: enter a numeric amount.`);
    }
    if (c.field === 'project_type' && !String(c.value).trim()) {
      errors.push(`Condition ${i + 1}: enter a project type.`);
    }
  });

  return errors;
}
