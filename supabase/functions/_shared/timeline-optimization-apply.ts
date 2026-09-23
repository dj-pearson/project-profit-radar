/**
 * What apply-timeline-optimization should write for a given request body.
 *
 * The function used to update timeline_optimizations by optimization_id, but
 * its only caller (src/components/analytics/TimelineOptimization.tsx) never
 * had one to send: generate-timeline-optimization does not persist a row, so
 * the caller only holds company_id and the optimizedSchedule it was shown.
 * That update matched id = undefined and wrote nothing. It also set a
 * `status` column the table does not have.
 *
 * So the function keys on what callers actually send:
 *   - optimization_id  -> mark that existing row applied (kept for any client
 *                         that does hold an id)
 *   - optimizations[]  -> record one applied row per project in the schedule
 *   - neither          -> 400, instead of a 200 that changed nothing
 *
 * Pure (no Deno, no Supabase) so vitest can load it.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface TimelineOptimizationInsert {
  company_id: string;
  project_id: string;
  optimization_type: string;
  estimated_time_saved: number;
  optimizations_applied: unknown[];
  applied_at: string;
  created_by: string | null;
}

export type TimelineApplyPlan =
  | { kind: 'update'; id: string; values: { applied_at: string } }
  | { kind: 'insert'; rows: TimelineOptimizationInsert[] }
  | { kind: 'invalid'; error: string };

export interface TimelineApplyInput {
  optimization_id?: string | null;
  company_id: string;
  optimizations?: unknown;
}

export function planTimelineOptimizationApply(
  body: TimelineApplyInput,
  userId: string | null,
  now: Date = new Date(),
): TimelineApplyPlan {
  const appliedAt = now.toISOString();

  if (body.optimization_id) {
    return { kind: 'update', id: body.optimization_id, values: { applied_at: appliedAt } };
  }

  const items = Array.isArray(body.optimizations) ? body.optimizations : [];
  const rows: TimelineOptimizationInsert[] = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    if (typeof o.projectId !== 'string' || !UUID_RE.test(o.projectId)) continue;
    const saved = Number(o.timeSaved);
    rows.push({
      company_id: body.company_id,
      project_id: o.projectId,
      optimization_type:
        typeof o.optimization_type === 'string' && o.optimization_type.trim()
          ? o.optimization_type.slice(0, 100)
          : 'schedule',
      estimated_time_saved: Number.isFinite(saved) ? Math.round(saved) : 0,
      optimizations_applied: [o],
      applied_at: appliedAt,
      created_by: userId,
    });
  }

  if (rows.length === 0) {
    return {
      kind: 'invalid',
      error: 'Send optimization_id, or optimizations with at least one projectId',
    };
  }
  return { kind: 'insert', rows };
}
