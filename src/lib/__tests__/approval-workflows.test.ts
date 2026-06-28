/**
 * US-087: approval workflow rule helpers
 */
import { describe, it, expect } from 'vitest';
import {
  nextStepOrder,
  sortSteps,
  renumberSteps,
  evaluateCondition,
  workflowApplies,
  describeCondition,
  describeStepApprover,
  validateWorkflow,
  type ApprovalStep,
  type ApprovalCondition,
} from '@/lib/approval-workflows';

const step = (over: Partial<ApprovalStep> & { id: string; order: number }): ApprovalStep => ({
  approverType: 'role',
  approverRole: 'admin',
  ...over,
});

const cond = (over: Partial<ApprovalCondition> & { id: string }): ApprovalCondition => ({
  field: 'amount',
  operator: 'gt',
  value: 5000,
  ...over,
});

describe('step ordering (US-087)', () => {
  it('computes the next order as max + 1', () => {
    expect(nextStepOrder([])).toBe(1);
    expect(nextStepOrder([step({ id: 'a', order: 1 }), step({ id: 'b', order: 3 })])).toBe(4);
  });

  it('sorts steps by ascending order', () => {
    const sorted = sortSteps([step({ id: 'b', order: 2 }), step({ id: 'a', order: 1 })]);
    expect(sorted.map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('renumbers to a contiguous 1..n sequence', () => {
    const renumbered = renumberSteps([step({ id: 'a', order: 5 }), step({ id: 'b', order: 9 })]);
    expect(renumbered.map((s) => s.order)).toEqual([1, 2]);
  });
});

describe('condition evaluation (US-087)', () => {
  it('compares amount with each operator', () => {
    expect(evaluateCondition(cond({ id: '1', operator: 'gt', value: 5000 }), { amount: 6000 })).toBe(true);
    expect(evaluateCondition(cond({ id: '1', operator: 'gt', value: 5000 }), { amount: 5000 })).toBe(false);
    expect(evaluateCondition(cond({ id: '1', operator: 'gte', value: 5000 }), { amount: 5000 })).toBe(true);
    expect(evaluateCondition(cond({ id: '1', operator: 'lt', value: 100 }), { amount: 50 })).toBe(true);
    expect(evaluateCondition(cond({ id: '1', operator: 'lte', value: 100 }), { amount: 100 })).toBe(true);
    expect(evaluateCondition(cond({ id: '1', operator: 'eq', value: 100 }), { amount: 100 })).toBe(true);
  });

  it('treats a missing amount as not matching', () => {
    expect(evaluateCondition(cond({ id: '1', operator: 'gt', value: 5000 }), { amount: null })).toBe(false);
    expect(evaluateCondition(cond({ id: '1', operator: 'gt', value: 5000 }), {})).toBe(false);
  });

  it('matches project_type case-insensitively on eq only', () => {
    const c = cond({ id: '1', field: 'project_type', operator: 'eq', value: 'Commercial' });
    expect(evaluateCondition(c, { project_type: 'commercial' })).toBe(true);
    expect(evaluateCondition(c, { project_type: 'Residential' })).toBe(false);
    expect(evaluateCondition({ ...c, operator: 'gt' }, { project_type: 'commercial' })).toBe(false);
  });
});

describe('workflowApplies (US-087)', () => {
  it('applies to everything when there are no conditions', () => {
    expect(workflowApplies({ conditions: [] }, { amount: 1 })).toBe(true);
  });

  it('requires ALL conditions to hold (AND)', () => {
    const conditions = [
      cond({ id: '1', field: 'amount', operator: 'gt', value: 5000 }),
      cond({ id: '2', field: 'project_type', operator: 'eq', value: 'commercial' }),
    ];
    expect(workflowApplies({ conditions }, { amount: 6000, project_type: 'commercial' })).toBe(true);
    expect(workflowApplies({ conditions }, { amount: 6000, project_type: 'residential' })).toBe(false);
    expect(workflowApplies({ conditions }, { amount: 100, project_type: 'commercial' })).toBe(false);
  });
});

describe('descriptions (US-087)', () => {
  it('describes an amount condition with currency formatting', () => {
    expect(describeCondition(cond({ id: '1', operator: 'gt', value: 5000 }))).toBe('Amount > $5,000');
  });

  it('describes a project_type condition', () => {
    expect(
      describeCondition(cond({ id: '1', field: 'project_type', operator: 'eq', value: 'Commercial' }))
    ).toBe('Project type = "Commercial"');
  });

  it('prefers an explicit approver label, falling back to role/user', () => {
    expect(describeStepApprover(step({ id: 'a', order: 1, approverLabel: 'Jane Doe' }))).toBe('Jane Doe');
    expect(describeStepApprover(step({ id: 'a', order: 1, approverRole: 'project_manager' }))).toBe('project_manager');
    expect(
      describeStepApprover(step({ id: 'a', order: 1, approverType: 'user', approverRole: null, approverUserId: null }))
    ).toBe('Unassigned');
  });
});

describe('validateWorkflow (US-087)', () => {
  it('passes a well-formed draft', () => {
    const errors = validateWorkflow({
      name: 'CO approvals',
      entity_type: 'change_order',
      steps: [step({ id: 'a', order: 1, approverRole: 'project_manager' })],
      conditions: [cond({ id: '1', operator: 'gt', value: 5000 })],
    });
    expect(errors).toEqual([]);
  });

  it('flags missing name, entity type, and steps', () => {
    const errors = validateWorkflow({ name: '  ', entity_type: '', steps: [], conditions: [] });
    expect(errors).toContain('Workflow name is required.');
    expect(errors).toContain('Entity type is required.');
    expect(errors).toContain('Add at least one approval step.');
  });

  it('rejects a project_type condition with a non-eq operator', () => {
    const errors = validateWorkflow({
      name: 'X',
      entity_type: 'invoice',
      steps: [step({ id: 'a', order: 1, approverRole: 'admin' })],
      conditions: [cond({ id: '1', field: 'project_type', operator: 'gt', value: 'commercial' })],
    });
    expect(errors.some((e) => e.includes('project type only supports'))).toBe(true);
  });

  it('flags an unassigned approver and a non-numeric amount', () => {
    const errors = validateWorkflow({
      name: 'X',
      entity_type: 'invoice',
      steps: [step({ id: 'a', order: 1, approverType: 'user', approverUserId: null })],
      conditions: [cond({ id: '1', field: 'amount', value: 'abc' as unknown as number })],
    });
    expect(errors.some((e) => e.includes('select an approver user'))).toBe(true);
    expect(errors.some((e) => e.includes('numeric amount'))).toBe(true);
  });
});
