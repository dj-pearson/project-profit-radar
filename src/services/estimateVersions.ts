import { supabase } from '@/integrations/supabase/client';
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
  try {
    const { data: existing } = await supabase
      .from('estimate_versions')
      .select('version_number')
      .eq('estimate_id', params.estimateId)
      .order('version_number', { ascending: false })
      .limit(1);
    const nextVersion = (existing?.[0]?.version_number ?? 0) + 1;

    await supabase.from('estimate_versions').insert([
      {
        estimate_id: params.estimateId,
        company_id: params.companyId,
        version_number: nextVersion,
        created_by: params.userId ?? null,
        snapshot: params.snapshot as unknown as Record<string, unknown>,
      },
    ]);
  } catch {
    /* snapshotting is best-effort */
  }
}

/** Fetch all versions for an estimate (newest first) with editor display names. */
export async function fetchEstimateVersions(estimateId: string): Promise<EstimateVersionRow[]> {
  const { data, error } = await supabase
    .from('estimate_versions')
    .select('id, version_number, created_at, created_by, snapshot')
    .eq('estimate_id', estimateId)
    .order('version_number', { ascending: false });
  if (error || !data) return [];

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
