import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import type { EstimateSnapshot } from '@/lib/estimate-versions';

/**
 * US-096: persistence for estimate version snapshots (estimate_versions table).
 */

export interface EstimateVersionRow {
  id: string;
  version_number: number;
  created_at: string;
  created_by: string | null;
  snapshot: EstimateSnapshot;
  editorName?: string;
}

/**
 * Write a new version snapshot for an estimate. The version number is the
 * current max + 1 (starts at 1). Best-effort: never throws to the caller so a
 * snapshot failure can't break the estimate save.
 */
export async function createEstimateVersion(params: {
  estimateId: string;
  companyId: string;
  userId?: string | null;
  snapshot: EstimateSnapshot;
}): Promise<void> {
  // version_number is allocated client-side as max+1. A UNIQUE(estimate_id,
  // version_number) constraint guards against duplicates; on a concurrent-save
  // conflict (Postgres 23505) we recompute and retry once. Any other error is
  // not retryable, so we log and give up immediately (best-effort).
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data: existing } = await supabase
        .from('estimate_versions')
        .select('version_number')
        .eq('estimate_id', params.estimateId)
        .eq('company_id', params.companyId)
        .order('version_number', { ascending: false })
        .limit(1);
      const nextVersion = (existing?.[0]?.version_number ?? 0) + 1;

      const { error } = await supabase.from('estimate_versions').insert([
        {
          estimate_id: params.estimateId,
          company_id: params.companyId,
          version_number: nextVersion,
          created_by: params.userId ?? null,
          snapshot: params.snapshot as unknown as Record<string, unknown>,
        },
      ]);
      if (!error) return;
      // Only a unique-violation is worth retrying; bail on anything else.
      if (error.code !== '23505' || attempt === 1) {
        logger.warn('Estimate version snapshot failed', { error: error.message, code: error.code });
        return;
      }
    } catch (err) {
      logger.warn('Estimate version snapshot threw', err as Error);
      return;
    }
  }
}

/**
 * Fetch all versions for an estimate (newest first) with editor display names.
 * Scoped by companyId for site isolation (in addition to RLS).
 */
export async function fetchEstimateVersions(
  estimateId: string,
  companyId?: string | null
): Promise<EstimateVersionRow[]> {
  if (!companyId) return [];
  const { data, error } = await supabase
    .from('estimate_versions')
    .select('id, version_number, created_at, created_by, snapshot')
    .eq('estimate_id', estimateId)
    .eq('company_id', companyId)
    .order('version_number', { ascending: false });
  // Surface failures so the UI can show an error state instead of conflating a
  // load error with "no versions yet".
  if (error) throw new Error(error.message);
  if (!data) return [];

  const rows = data as unknown as EstimateVersionRow[];

  const editorIds = Array.from(new Set(rows.map((r) => r.created_by).filter(Boolean))) as string[];
  if (editorIds.length) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name')
      .in('id', editorIds);
    const nameById = new Map(
      (profiles ?? []).map((p) => [p.id, `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Unknown'])
    );
    rows.forEach((r) => {
      r.editorName = r.created_by ? nameById.get(r.created_by) ?? 'Unknown' : 'Unknown';
    });
  }
  return rows;
}
