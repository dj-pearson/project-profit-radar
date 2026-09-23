import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateWorkflowCondition } from './workflow-condition.ts';
import { buildHistoricalTrends } from './benchmark-history.ts';
import { forecastBudgets, forecastCompletion, scheduledTrend } from './predictive-forecasts.ts';
import { budgetRisk, scheduleRisk, scoreProjectRisk } from './risk-scoring.ts';
import {
  backlinksUnavailableResponse,
  BACKLINKS_NOT_CONFIGURED_CODE,
  BACKLINKS_PROVIDER_FAILED_CODE,
  isProviderConfigured,
} from './backlinks.ts';

const fn = (name: string) => readFileSync(join(process.cwd(), 'supabase/functions', name, 'index.ts'), 'utf8');

describe('execute-workflow condition steps are evaluated, not coin-flipped', () => {
  const data = { status: 'won', amount: '1200', tags: ['vip'], deal: { stage: 'closed' } };

  it('supports the WorkflowBuilder operators against trigger_data', () => {
    expect(evaluateWorkflowCondition({ field: 'status', operator: 'equals', value: 'won' }, data)).toMatchObject({ ok: true, met: true });
    expect(evaluateWorkflowCondition({ field: 'status', operator: 'not_equals', value: 'won' }, data)).toMatchObject({ ok: true, met: false });
    expect(evaluateWorkflowCondition({ field: 'amount', operator: 'greater_than', value: 1000 }, data)).toMatchObject({ ok: true, met: true });
    expect(evaluateWorkflowCondition({ field: 'amount', operator: 'less_than', value: 1000 }, data)).toMatchObject({ ok: true, met: false });
    expect(evaluateWorkflowCondition({ field: 'tags', operator: 'contains', value: 'vip' }, data)).toMatchObject({ ok: true, met: true });
    expect(evaluateWorkflowCondition({ field: 'deal.stage', operator: 'equals', value: 'closed' }, data)).toMatchObject({ ok: true, met: true });
  });

  it('is deterministic', () => {
    const c = { field: 'status', operator: 'equals', value: 'won' };
    const runs = new Set(Array.from({ length: 20 }, () => JSON.stringify(evaluateWorkflowCondition(c, data))));
    expect(runs.size).toBe(1);
  });

  it('refuses what it cannot evaluate instead of picking a branch', () => {
    expect(evaluateWorkflowCondition('status is won', data)).toMatchObject({ ok: false });
    expect(evaluateWorkflowCondition({ operator: 'equals', value: 1 }, data)).toMatchObject({ ok: false });
    expect(evaluateWorkflowCondition({ field: 'status', operator: 'matches', value: 1 }, data)).toMatchObject({ ok: false });
    expect(evaluateWorkflowCondition({ field: 'status', operator: 'greater_than', value: 3 }, data)).toMatchObject({ ok: false });
  });

  it('the step fails with the reason when evaluation fails', () => {
    const src = fn('execute-workflow');
    expect(src).toMatch(/evaluateWorkflowCondition\(condition, execution\.trigger_data\)/);
    expect(src).toMatch(/success: false,\s*\n\s*error: evaluation\.error/);
  });
});

describe('generate-performance-benchmarks history comes from projects', () => {
  const now = new Date('2026-09-15T00:00:00Z');
  const projects = [
    { status: 'completed', created_at: '2026-01-10', end_date: '2026-03-20' },
    { status: 'active', created_at: '2026-02-01' },
    { status: 'completed', created_at: '2026-05-01', end_date: '2026-08-01' },
  ];

  it('computes completion rate per month, null before the first project', () => {
    const h = buildHistoricalTrends(projects, 89.5, now);
    expect(h).toHaveLength(12);
    expect(h[0]).toEqual({ month: 'Oct', performance: null, industry: 89.5 });
    const byMonth = Object.fromEntries(h.map((p) => [p.month, p.performance]));
    expect(byMonth.Jan).toBe(0); // 1 project, none done
    expect(byMonth.Mar).toBe(50); // 2 projects, 1 done
    expect(byMonth.Sep).toBe(66.7); // 3 projects, 2 done
    expect(buildHistoricalTrends(projects, undefined, now)[11].industry).toBeNull();
  });

  it('the function has no random prompt values or noise', () => {
    const src = fn('generate-performance-benchmarks');
    expect(src).not.toMatch(/Math\.random\(/);
    expect(src).toMatch(/buildHistoricalTrends\(/);
  });
});

describe('generate-predictive-analytics forecasts from project data', () => {
  const now = new Date('2026-06-01T00:00:00Z');
  const p = {
    id: 'p1', name: 'Garage', status: 'active',
    start_date: '2026-01-01', end_date: '2026-06-01',
    budget: 100000, completion_percentage: 50,
    job_costs: [{ total_cost: 30000 }, { total_cost: 30000 }],
  };

  it('projects completion linearly and leaves out projects without progress', () => {
    const [c] = forecastCompletion([p, { ...p, id: 'p2', completion_percentage: 0 }], now);
    expect(forecastCompletion([p, { ...p, id: 'p2', completion_percentage: 0 }], now)).toHaveLength(1);
    // 151 days elapsed at 50% -> 302 days total -> 2026-10-30.
    expect(c).toMatchObject({ projectId: 'p1', predictedEndDate: '2026-10-30', originalEndDate: '2026-06-01', confidenceScore: null, delayRisk: 'high' });
    expect(c.delayDays).toBe(151);
  });

  it('forecasts cost as cost to date over percent complete', () => {
    expect(forecastBudgets([p])).toEqual([expect.objectContaining({ predictedFinalCost: 120000, variancePercentage: 20, overrunRisk: 'medium' })]);
    expect(forecastBudgets([{ ...p, job_costs: [], actual_cost: null }])).toEqual([]);
  });

  it('trend is contract value on the books, with no invented market call', () => {
    const t = scheduledTrend([p], [p, { start_date: '2026-06-10' }], now);
    expect(t).toHaveLength(12);
    expect(t[0]).toMatchObject({ month: '2026-06', predictedRevenue: 100000, predictedProjects: 1, marketTrend: null, confidence: null });
    expect(t[1].predictedRevenue).toBe(0);
  });

  it('the function has no Math.random and an empty resource series', () => {
    const src = fn('generate-predictive-analytics');
    expect(src).not.toMatch(/Math\.random\(/);
    expect(src).toMatch(/resourceDemandForecast = \[\]/);
  });
});

describe('generate-risk-assessment scores from budget and schedule', () => {
  const now = new Date('2026-06-01T00:00:00Z');
  const p = { id: 'p', name: 'X', budget: 100000, start_date: '2026-01-01', end_date: '2026-12-31', completion_percentage: 20 };

  it('scores spend and time ahead of progress', () => {
    expect(budgetRisk(p, 50000)).toEqual({ score: 80, overrunPoints: 30 });
    expect(budgetRisk({ ...p, budget: 0 }, 50000)).toBeNull();
    const s = scheduleRisk(p, now)!;
    expect(s.score).toBe(71); // 41.4% elapsed - 20% done
    expect(scheduleRisk({ ...p, end_date: null }, now)).toBeNull();
  });

  it('leaves out risks it cannot score', () => {
    const r = scoreProjectRisk({ id: 'q', name: 'Q' }, 0, now);
    expect(r).toEqual({ projectId: 'q', projectName: 'Q', riskScore: null, topRisks: [] });
    expect(scoreProjectRisk(p, 50000, now).topRisks.map((t) => t.type)).toEqual(['Budget Overrun', 'Schedule Delay']);
  });

  it('the function has no Math.random and no invented trend', () => {
    const src = fn('generate-risk-assessment');
    expect(src).not.toMatch(/Math\.random\(/);
    expect(src).toMatch(/riskTrends = \[\]/);
  });
});

describe('sync-backlinks has no simulated backlinks', () => {
  it('needs a configured provider', () => {
    expect(isProviderConfigured('ahrefs', 'k')).toBe(true);
    expect(isProviderConfigured('ahrefs', ' ')).toBe(false);
    expect(isProviderConfigured('moz', 'k')).toBe(false);
  });

  it('answers not-configured and provider failure with an error envelope', async () => {
    const a = await backlinksUnavailableResponse({}).json();
    expect(a).toMatchObject({ success: false, code: BACKLINKS_NOT_CONFIGURED_CODE });
    expect(a.error).toMatch(/AHREFS_API_KEY/);
    const b = await backlinksUnavailableResponse({}, 'Ahrefs returned 401').json();
    expect(b).toMatchObject({ success: false, code: BACKLINKS_PROVIDER_FAILED_CODE });
    expect(typeof b.timestamp).toBe('string');
    const c = await backlinksUnavailableResponse({}, null, true).json();
    expect(c).toMatchObject({ success: false, code: BACKLINKS_NOT_CONFIGURED_CODE });
    expect(c.error).toMatch(/Moz backlink provider is not implemented/);
  });

  it('the function returns before any upsert when unconfigured', () => {
    const src = fn('sync-backlinks');
    expect(src).not.toMatch(/Math\.random\(/);
    expect(src).not.toMatch(/simulatedBacklinks|'example\.com'|provider_used = 'simulated'/);
    expect(src.indexOf('.upsert(')).toBeGreaterThan(src.indexOf('backlinksUnavailableResponse(corsHeaders)'));
  });
});

describe('measured-or-null fields', () => {
  it('bing-search-api reports no per-page or per-query stats it does not have', () => {
    const src = fn('bing-search-api');
    expect(src).not.toMatch(/Math\.random\(/);
    expect(src).toMatch(/metrics_available: false/);
  });

  it('monitor-performance-budget does not evaluate timings it did not measure', () => {
    const src = fn('monitor-performance-budget');
    expect(src).not.toMatch(/Math\.random\(/);
    expect(src).toMatch(/timing_metrics_available: false/);
    expect(src).toMatch(/loadTimeMs !== null && loadTimeMs >/);
  });

  it('seo-analytics has no random trend change', () => {
    const src = fn('seo-analytics');
    expect(src).not.toMatch(/Math\.random\(/);
    expect(src).toMatch(/change: null/);
  });

  it('generate-timeline-optimization claims no savings without an optimizer', () => {
    const src = fn('generate-timeline-optimization');
    expect(src).not.toMatch(/Math\.random\(/);
    expect(src).toMatch(/optimizedSchedule = \[\]/);
    expect(src).toMatch(/optimizationAvailable = false/);
  });
});
