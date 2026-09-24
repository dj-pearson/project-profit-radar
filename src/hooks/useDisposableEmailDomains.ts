/**
 * The disposable email blocklist for /admin/disposable-email-domains (US-266).
 *
 * The page read the table in one request, which PostgREST caps at 1000 rows;
 * a seeded blocklist is larger than that, so the counts and the search stopped
 * at 1000 without saying so. It reads in pages now until the table is done.
 * Bulk add reported "Added N domain(s)" for every valid entry, including the
 * ones ignored as already present; it reports the rows actually inserted.
 * Toggle and delete reported success on a write RLS filtered to zero rows.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DisposableEmailDomain {
  id: string;
  domain: string;
  is_active: boolean;
  source: 'seed' | 'manual' | 'import';
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const disposableDomainsKey = (companyId: string | undefined, userId: string | undefined) =>
  ['disposable-email-domains', companyId, userId] as const;

export const DOMAIN_READ_PAGE = 1000;

// disposable_email_domains is not in the generated types yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = () => (supabase as any).from('disposable_email_domains');

function requireRows(data: unknown[] | null, message: string) {
  if (!data || data.length === 0) throw new Error(message);
}

export async function fetchDisposableDomains(): Promise<DisposableEmailDomain[]> {
  const all: DisposableEmailDomain[] = [];
  for (let from = 0; ; from += DOMAIN_READ_PAGE) {
    const { data, error } = await table()
      .select('*')
      .order('created_at', { ascending: false })
      .order('id')
      .range(from, from + DOMAIN_READ_PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as DisposableEmailDomain[];
    all.push(...rows);
    if (rows.length < DOMAIN_READ_PAGE) return all;
  }
}

/** Returns how many were inserted; entries already on the list are skipped, not counted. */
export async function addDisposableDomains(userId: string, domains: string[]): Promise<number> {
  const rows = domains.map((domain) => ({ domain, source: 'manual', is_active: true, created_by: userId }));
  const { data, error } = await table()
    .upsert(rows, { onConflict: 'domain', ignoreDuplicates: true })
    .select('id');
  if (error) throw error;
  return (data ?? []).length;
}

/** Throws the Postgres error as-is, so the caller can tell 23505 (already listed) apart. */
export async function addDisposableDomain(userId: string, domain: string, notes: string | null): Promise<void> {
  const { data, error } = await table()
    .insert({ domain, notes, source: 'manual', is_active: true, created_by: userId })
    .select('id');
  if (error) throw error;
  requireRows(data, 'The domain was not added. You may not have permission to edit the blocklist.');
}

export async function setDisposableDomainActive(id: string, isActive: boolean): Promise<void> {
  const { data, error } = await table().update({ is_active: isActive }).eq('id', id).select('id');
  if (error) throw error;
  requireRows(data, 'The domain was not changed. You may not have permission to edit the blocklist.');
}

export async function deleteDisposableDomain(id: string): Promise<void> {
  const { data, error } = await table().delete().eq('id', id).select('id');
  if (error) throw error;
  requireRows(data, 'The domain was not removed. You may not have permission to edit the blocklist.');
}

export function useDisposableEmailDomains({ enabled }: { enabled: boolean }) {
  const { user, userProfile } = useAuth();
  const userId = user?.id;
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = disposableDomainsKey(companyId, userId);

  const query = useQuery({ queryKey: key, queryFn: fetchDisposableDomains, enabled: enabled && !!userId });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });
  const requireUser = () => {
    const id = userProfile?.id ?? userId;
    if (!id) throw new Error('Not authenticated');
    return id;
  };

  const addMany = useMutation({ mutationFn: (domains: string[]) => addDisposableDomains(requireUser(), domains), onSettled: invalidate });
  const addOne = useMutation({
    mutationFn: ({ domain, notes }: { domain: string; notes: string | null }) => addDisposableDomain(requireUser(), domain, notes),
    onSettled: invalidate,
  });
  const setActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => setDisposableDomainActive(id, isActive),
    onSettled: invalidate,
  });
  const remove = useMutation({ mutationFn: deleteDisposableDomain, onSettled: invalidate });

  return {
    domains: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    addMany: (domains: string[]) => addMany.mutateAsync(domains),
    addOne: (domain: string, notes: string | null) => addOne.mutateAsync({ domain, notes }),
    setActive: (id: string, isActive: boolean) => setActive.mutateAsync({ id, isActive }),
    remove: (id: string) => remove.mutateAsync(id),
  };
}
