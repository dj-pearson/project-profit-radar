/**
 * Reads and writes behind /crm/contacts (US-266).
 *
 * CRMContacts loaded through useLoadingState and reloaded by hand after each
 * write. Bulk tagging ran one update per contact inside Promise.all and never
 * read the results, so a tag RLS refused was toasted as added. Every write
 * here selects its ids back and fails when fewer rows came back than asked.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { TablesInsert } from '@/integrations/supabase/types';

export const crmContactsKey = (companyId: string | undefined) => ['contacts', companyId, 'crm'] as const;

export async function fetchCRMContacts<Row>(companyId: string): Promise<Row[]> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Row[];
}

function requireAll(got: number, expected: number, what: string) {
  if (got < expected) {
    throw new Error(
      got === 0
        ? `No contacts were ${what}. You may not have permission to change them.`
        : `Only ${got} of ${expected} contacts were ${what}. You may not have permission to change the rest.`,
    );
  }
}

export async function insertCRMContact(row: TablesInsert<'contacts'>): Promise<void> {
  const { data, error } = await supabase.from('contacts').insert([row]).select('id');
  if (error) throw error;
  requireAll(data?.length ?? 0, 1, 'created');
}

export async function tagCRMContacts(contacts: { id: string; tags?: string[] | null }[], tag: string): Promise<void> {
  const results = await Promise.all(
    contacts.map((c) =>
      supabase
        .from('contacts')
        .update({ tags: Array.from(new Set([...(c.tags ?? []), tag])) })
        .eq('id', c.id)
        .select('id'),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
  requireAll(results.reduce((n, r) => n + (r.data?.length ?? 0), 0), contacts.length, 'tagged');
}

export async function deleteCRMContacts(ids: string[]): Promise<void> {
  const { data, error } = await supabase.from('contacts').delete().in('id', ids).select('id');
  if (error) throw error;
  requireAll(data?.length ?? 0, ids.length, 'deleted');
}

export function useCRMContacts<Row>({ enabled = true }: { enabled?: boolean } = {}) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: crmContactsKey(companyId),
    queryFn: () => fetchCRMContacts<Row>(companyId as string),
    enabled: enabled && !!companyId,
  });

  // The two-part prefix, so contact pickers keyed under ['contacts', companyId]
  // see a new contact too.
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['contacts', companyId] });

  const create = useMutation({ mutationFn: insertCRMContact, onSettled: invalidate });
  const tag = useMutation({
    mutationFn: ({ contacts, tag: t }: { contacts: { id: string; tags?: string[] | null }[]; tag: string }) =>
      tagCRMContacts(contacts, t),
    onSettled: invalidate,
  });
  const remove = useMutation({ mutationFn: deleteCRMContacts, onSettled: invalidate });

  // A profile with no company has no contacts to read; say so rather than
  // showing the "add your first contact" empty state.
  const noCompany = enabled && !!userProfile && !companyId
    ? new Error('No company associated with user')
    : null;

  return {
    contacts: query.data ?? [],
    isLoading: query.isLoading,
    error: (query.error as Error | null) ?? noCompany,
    refetch: query.refetch,
    create,
    tag,
    remove,
  };
}
