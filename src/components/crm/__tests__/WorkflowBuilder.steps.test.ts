import { describe, it, expect, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

import { buildWorkflowSteps, workflowNodesFromSteps } from '../WorkflowBuilder';

describe('buildWorkflowSteps (US-365)', () => {
  it('serialises canvas nodes to the { name, type, config } shape execute-workflow reads, dropping the trigger', () => {
    const steps = buildWorkflowSteps([
      { id: 'trigger', type: 'input', data: { label: 'Trigger' }, position: { x: 250, y: 50 } },
      { id: 'send_email-1', type: 'default', data: { label: 'Send Email', actionType: 'send_email', config: { template: 'welcome' } }, position: { x: 10, y: 20 } },
      { id: 'wait-2', type: 'default', data: { label: 'Wait/Delay', actionType: 'wait' }, position: { x: 30, y: 40 } },
    ]);

    expect(steps).toEqual([
      { name: 'Send Email', type: 'send_email', config: { template: 'welcome' }, step_order: 0, position: { x: 10, y: 20 } },
      { name: 'Wait/Delay', type: 'wait', config: {}, step_order: 1, position: { x: 30, y: 40 } },
    ]);
  });
});

describe('workflowNodesFromSteps', () => {
  it('rebuilds the canvas a saved workflow was saved from, so reopening it by id is not blank', () => {
    const canvas = [
      { id: 'trigger', type: 'input', data: { label: 'Trigger' }, position: { x: 250, y: 50 } },
      { id: 'send_email-1', type: 'default', data: { label: 'Send Email', actionType: 'send_email', config: { template: 'welcome' } }, position: { x: 10, y: 20 } },
    ];
    const nodes = workflowNodesFromSteps('record_created', buildWorkflowSteps(canvas));
    expect(nodes).toHaveLength(2);
    expect(nodes[0].id).toBe('trigger');
    expect(nodes[1].data).toEqual({ label: 'Send Email', actionType: 'send_email', config: { template: 'welcome' } });
    expect(nodes[1].position).toEqual({ x: 10, y: 20 });
    expect(buildWorkflowSteps(nodes)).toEqual(buildWorkflowSteps(canvas));
  });

  it('treats a non-array workflow_steps as no steps', () => {
    expect(workflowNodesFromSteps('manual', null)).toHaveLength(1);
  });
});
