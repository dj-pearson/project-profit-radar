/**
 * US-370: WorkflowTester "ran" steps by rolling Math.random() (90% success),
 * invented durations and message ids, and toasted "Test completed". It now
 * executes nothing and shows the run order derived from the edges.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { WorkflowTester } from '../WorkflowTester';

afterEach(() => vi.restoreAllMocks());

const nodes = [
  { id: 'trigger', data: { label: 'Trigger' } },
  { id: 'b', data: { label: 'Send SMS', actionType: 'send_sms' } },
  { id: 'a', data: { label: 'Send email', actionType: 'send_email' } },
  { id: 'orphan', data: { actionType: 'webhook' } },
];
const edges = [
  { id: 'e1', source: 'trigger', target: 'a' },
  { id: 'e2', source: 'a', target: 'b' },
];

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('WorkflowTester (US-370)', () => {
  it('lists steps in edge order from the trigger and flags unconnected ones', () => {
    render(<WorkflowTester nodes={nodes} edges={edges} />);
    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toEqual([
      'Step 1: Send emailnot run',
      'Step 2: Send SMSnot run',
      'webhooknot connected',
    ]);
  });

  it('reports no success, duration or output, and does not use Math.random', () => {
    const spy = vi.spyOn(Math, 'random');
    render(<WorkflowTester nodes={nodes} edges={edges} />);
    expect(spy).not.toHaveBeenCalled();
    expect(screen.queryByText(/success/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Duration/)).not.toBeInTheDocument();
    expect(screen.getByText(/Test runs aren't available yet/)).toBeInTheDocument();
  });

  it('shows an empty state when only the trigger exists', () => {
    render(<WorkflowTester nodes={[nodes[0]]} edges={[]} />);
    expect(screen.getByText('No steps yet')).toBeInTheDocument();
  });

  it('source has no Math.random or simulated outcome', () => {
    const src = stripComments(readFileSync(resolve(__dirname, '../WorkflowTester.tsx'), 'utf8'));
    expect(src).not.toMatch(/Math\.random\(|simulateStep|getSimulatedOutput|Test completed/);
  });
});
