/**
 * Reads and writes behind the pSEO admin dashboard (US-266).
 *
 * PSEOAdminDashboard loaded pages, the generation queue and five dimension
 * tables in a useEffect and dropped any read error on the floor: a failed read
 * of pseo_pages rendered "0 pages" and the Matrix tab offered every
 * combination again as new. The seed button awaited five upserts without
 * reading one error and then announced "All dimensions seeded".
 *
 * Reads now throw, so the page shows the error. Updates select the id back
 * and throw when RLS filtered the write to fewer rows than asked for.
 *
 * The pSEO tables are platform-wide, not company-scoped; the key still carries
 * company_id so a user switch never serves one account's cache to another.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { DimensionType, PSEOGenerationQueueItem, PSEOPage } from '@/types/pseo';

export type PSEODimensionItem = {
  id: string;
  display_name: string;
  url_slug: string;
  is_active: boolean;
  context_object?: Record<string, unknown>;
  competitor_profile?: Record<string, unknown>;
  geo_level?: string;
  created_at: string;
};

export const PSEO_DIMENSION_TABLES: Record<DimensionType, string> = {
  contractor_types: 'pseo_contractor_types',
  pain_points: 'pseo_pain_points',
  geographies: 'pseo_geographies',
  business_sizes: 'pseo_business_sizes',
  competitors: 'pseo_competitors',
};

export interface PSEOAdminData {
  pages: PSEOPage[];
  queue: PSEOGenerationQueueItem[];
  dimensions: Record<DimensionType, PSEODimensionItem[]>;
}

export const pseoAdminKey = (companyId: string | undefined) => ['pseo-admin', companyId] as const;

// The pSEO tables are not in the generated types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = (name: string) => supabase.from(name as any);

export async function fetchPSEOAdmin(): Promise<PSEOAdminData> {
  const { data: pages, error: pagesError } = await table('pseo_pages')
    .select('*')
    .order('created_at', { ascending: false });
  if (pagesError) throw pagesError;

  const { data: queue, error: queueError } = await table('pseo_generation_queue')
    .select('*')
    .order('tier', { ascending: true });
  if (queueError) throw queueError;

  const dimensions = {} as Record<DimensionType, PSEODimensionItem[]>;
  for (const [key, name] of Object.entries(PSEO_DIMENSION_TABLES)) {
    const { data, error } = await table(name).select('*').order('display_name');
    if (error) throw error;
    dimensions[key as DimensionType] = (data ?? []) as unknown as PSEODimensionItem[];
  }

  return {
    pages: (pages ?? []) as unknown as PSEOPage[],
    queue: (queue ?? []) as unknown as PSEOGenerationQueueItem[],
    dimensions,
  };
}

function expectRows(data: unknown[] | null, expected: number, what: string) {
  const got = data?.length ?? 0;
  if (got < expected) {
    throw new Error(
      expected === 1
        ? `The ${what} was not changed. You may not have permission to edit it.`
        : `Only ${got} of ${expected} ${what}s were changed. You may not have permission to edit the rest.`,
    );
  }
}

export async function insertDimension(dimension: DimensionType, item: Partial<PSEODimensionItem>): Promise<void> {
  const { data, error } = await table(PSEO_DIMENSION_TABLES[dimension]).insert(item as never).select('id');
  if (error) throw error;
  expectRows(data, 1, 'dimension');
}

export async function updateDimension(
  dimension: DimensionType,
  id: string,
  patch: Partial<PSEODimensionItem>,
): Promise<void> {
  const { data, error } = await table(PSEO_DIMENSION_TABLES[dimension]).update(patch as never).eq('id', id).select('id');
  if (error) throw error;
  expectRows(data, 1, 'dimension');
}

/** Upserts every dimension table; stops at the first table that fails and names it. */
export async function seedDimensions(rows: Record<DimensionType, Record<string, unknown>[]>): Promise<void> {
  for (const [key, list] of Object.entries(rows)) {
    const name = PSEO_DIMENSION_TABLES[key as DimensionType];
    const { error } = await table(name).upsert(list as never, { onConflict: 'id' }).select('id');
    if (error) throw new Error(`Seeding ${name} failed: ${error.message}`);
  }
}

export async function updateQueueItem(id: string, patch: Record<string, unknown>): Promise<void> {
  const { data, error } = await table('pseo_generation_queue').update(patch as never).eq('id', id).select('id');
  if (error) throw error;
  expectRows(data, 1, 'queue item');
}

export async function deleteQueueItem(id: string): Promise<void> {
  const { data, error } = await table('pseo_generation_queue').delete().eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('The queue item was not removed. You may not have permission to remove it.');
  }
}

/** ignoreDuplicates returns only the rows it inserted, so a short result is not a failure here. */
export async function addToQueue(rows: Record<string, unknown>[]): Promise<number> {
  const { data, error } = await table('pseo_generation_queue')
    .upsert(rows as never, { onConflict: 'combination_key', ignoreDuplicates: true })
    .select('id');
  if (error) throw error;
  return data?.length ?? 0;
}

export async function savePageDraft(row: Record<string, unknown>): Promise<void> {
  const { data, error } = await table('pseo_pages').upsert(row as never, { onConflict: 'combination_key' }).select('id');
  if (error) throw error;
  expectRows(data, 1, 'page');
}

export async function updatePages(ids: string[], patch: Record<string, unknown>): Promise<void> {
  const { data, error } = await table('pseo_pages').update(patch as never).in('id', ids).select('id');
  if (error) throw error;
  expectRows(data, ids.length, 'page');
}

export function usePSEOAdmin() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = pseoAdminKey(companyId);

  const query = useQuery({ queryKey: key, queryFn: fetchPSEOAdmin, enabled: !!userProfile });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });
  const write = useMutation({ mutationFn: (fn: () => Promise<unknown>) => fn(), onSettled: invalidate });
  const run = <T,>(fn: () => Promise<T>) => write.mutateAsync(fn) as Promise<T>;

  return {
    pages: query.data?.pages ?? [],
    queue: query.data?.queue ?? [],
    dimensions: query.data?.dimensions,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    insertDimension: (d: DimensionType, item: Partial<PSEODimensionItem>) => run(() => insertDimension(d, item)),
    updateDimension: (d: DimensionType, id: string, patch: Partial<PSEODimensionItem>) =>
      run(() => updateDimension(d, id, patch)),
    seedDimensions: (rows: Record<DimensionType, Record<string, unknown>[]>) => run(() => seedDimensions(rows)),
    updateQueueItem: (id: string, patch: Record<string, unknown>) => run(() => updateQueueItem(id, patch)),
    deleteQueueItem: (id: string) => run(() => deleteQueueItem(id)),
    addToQueue: (rows: Record<string, unknown>[]) => run(() => addToQueue(rows)),
    savePageDraft: (row: Record<string, unknown>) => run(() => savePageDraft(row)),
    updatePages: (ids: string[], patch: Record<string, unknown>) => run(() => updatePages(ids, patch)),
  };
}
