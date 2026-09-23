import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { planTimelineOptimizationApply } from './timeline-optimization-apply.ts';

const COMPANY = '11111111-1111-4111-8111-111111111111';
const PROJECT = '22222222-2222-4222-8222-222222222222';
const OPT_ID = '33333333-3333-4333-8333-333333333333';
const USER = '44444444-4444-4444-8444-444444444444';
const NOW = new Date('2026-09-23T10:00:00Z');

describe('apply-timeline-optimization plan', () => {
  it('records one applied row per project for the body the web caller sends', () => {
    const plan = planTimelineOptimizationApply({
      company_id: COMPANY,
      optimizations: [
        { projectId: PROJECT, projectName: 'Main St', timeSaved: 4.6, optimization_type: 'resource' },
        { projectId: 'not-a-uuid', timeSaved: 2 },
      ],
    }, USER, NOW);

    expect(plan.kind).toBe('insert');
    if (plan.kind !== 'insert') return;
    expect(plan.rows).toHaveLength(1);
    expect(plan.rows[0]).toMatchObject({
      company_id: COMPANY,
      project_id: PROJECT,
      optimization_type: 'resource',
      estimated_time_saved: 5,
      applied_at: NOW.toISOString(),
      created_by: USER,
    });
  });

  it('marks an existing row applied when optimization_id is sent', () => {
    const plan = planTimelineOptimizationApply({ optimization_id: OPT_ID, company_id: COMPANY }, USER, NOW);
    expect(plan).toEqual({ kind: 'update', id: OPT_ID, values: { applied_at: NOW.toISOString() } });
  });

  it('refuses a body with nothing to apply instead of updating id = undefined', () => {
    expect(planTimelineOptimizationApply({ company_id: COMPANY }, USER, NOW).kind).toBe('invalid');
    expect(planTimelineOptimizationApply({ company_id: COMPANY, optimizations: [] }, USER, NOW).kind).toBe('invalid');
    expect(planTimelineOptimizationApply({ company_id: COMPANY, optimizations: 'x' }, USER, NOW).kind).toBe('invalid');
  });

  it('the function no longer writes the nonexistent status column or keys on a raw optimization_id', () => {
    const src = readFileSync('supabase/functions/apply-timeline-optimization/index.ts', 'utf8');
    expect(src).toContain('planTimelineOptimizationApply(');
    expect(src).not.toMatch(/status:\s*'applied'/);
    expect(src).not.toMatch(/\.eq\('id',\s*optimization_id\)/);
    expect(src).toMatch(/errorResponse\(plan\.error,\s*400/);
  });
});
