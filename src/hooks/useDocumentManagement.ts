/**
 * Reads and writes behind /documents and /projects/:id/documents (US-266).
 *
 * DocumentManagement loaded documents, folders and projects in a useEffect and
 * reloaded by hand after each write. The folder and project reads swallowed
 * their errors, so a failed read left the upload dialog with no folders and
 * looked like a company that had never made one. Bulk tagging ran one update
 * per document inside Promise.all and never read the results, so a tag RLS
 * refused was reported as added.
 *
 * Writes select the ids back and fail when fewer rows came back than were
 * asked for.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { TablesInsert } from '@/integrations/supabase/types';

export interface DocumentCategoryOption {
  id: string;
  name: string;
  description: string;
}

export interface DocumentProjectOption {
  id: string;
  name: string;
  client_name: string;
}

export const documentsKey = (companyId: string | undefined) => ['documents', companyId] as const;
export const managedDocumentsKey = (companyId: string | undefined, projectId: string | undefined) =>
  [...documentsKey(companyId), 'management', projectId ?? 'company'] as const;
export const documentCategoriesKey = (companyId: string | undefined) =>
  ['document-categories', companyId, 'active'] as const;
export const documentProjectOptionsKey = (companyId: string | undefined) =>
  ['projects', companyId, 'active-options'] as const;

/** Project documents when projectId is set, company-level documents (no project) otherwise. */
export async function fetchManagedDocuments<Row>(companyId: string, projectId?: string): Promise<Row[]> {
  let query = supabase
    .from('documents')
    .select(`
      *,
      document_categories(name),
      user_profiles!documents_uploaded_by_fkey(first_name, last_name, email)
    `)
    .eq('company_id', companyId);
  query = projectId ? query.eq('project_id', projectId) : query.is('project_id', null);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Row[];
}

export async function fetchDocumentCategories(companyId: string): Promise<DocumentCategoryOption[]> {
  const { data, error } = await supabase
    .from('document_categories')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return (data ?? []) as DocumentCategoryOption[];
}

export async function fetchDocumentProjectOptions(companyId: string): Promise<DocumentProjectOption[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, client_name')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .order('name');
  if (error) throw error;
  return (data ?? []) as DocumentProjectOption[];
}

function requireAll(data: unknown[] | null, expected: number, what: string) {
  const got = data?.length ?? 0;
  if (got < expected) {
    throw new Error(
      got === 0
        ? `No documents were ${what}. You may not have permission to change them.`
        : `Only ${got} of ${expected} documents were ${what}. You may not have permission to change the rest.`,
    );
  }
}

/** The row as the page builds it; site_id is filled in by the database. */
export async function insertDocumentRecord(row: Record<string, unknown>): Promise<void> {
  const { data, error } = await supabase
    .from('documents')
    .insert([row as unknown as TablesInsert<'documents'>])
    .select('id');
  if (error) throw error;
  requireAll(data, 1, 'saved');
}

export async function deleteDocumentRecords(ids: string[]): Promise<void> {
  const { data, error } = await supabase.from('documents').delete().in('id', ids).select('id');
  if (error) throw error;
  requireAll(data, ids.length, 'deleted');
}

export async function moveDocumentsToCategory(ids: string[], categoryId: string): Promise<void> {
  const { data, error } = await supabase
    .from('documents')
    .update({ category_id: categoryId })
    .in('id', ids)
    .select('id');
  if (error) throw error;
  requireAll(data, ids.length, 'moved');
}

/** One update per document (each has its own tag list); every result is read. */
export async function tagDocuments(docs: { id: string; tags?: string[] | null }[], tag: string): Promise<void> {
  const results = await Promise.all(
    docs.map((d) =>
      supabase
        .from('documents')
        .update({ tags: Array.from(new Set([...(d.tags ?? []), tag])) })
        .eq('id', d.id)
        .select('id'),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
  requireAll(results.flatMap((r) => r.data ?? []), docs.length, 'tagged');
}

export function useDocumentManagement<Row>(projectId?: string) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();

  const documents = useQuery({
    queryKey: managedDocumentsKey(companyId, projectId),
    queryFn: () => fetchManagedDocuments<Row>(companyId as string, projectId),
    enabled: !!companyId,
  });
  const categories = useQuery({
    queryKey: documentCategoriesKey(companyId),
    queryFn: () => fetchDocumentCategories(companyId as string),
    enabled: !!companyId,
  });
  const projects = useQuery({
    queryKey: documentProjectOptionsKey(companyId),
    queryFn: () => fetchDocumentProjectOptions(companyId as string),
    enabled: !!companyId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: documentsKey(companyId) });

  const insert = useMutation({ mutationFn: insertDocumentRecord, onSettled: invalidate });
  const remove = useMutation({ mutationFn: deleteDocumentRecords, onSettled: invalidate });
  const move = useMutation({
    mutationFn: ({ ids, categoryId }: { ids: string[]; categoryId: string }) => moveDocumentsToCategory(ids, categoryId),
    onSettled: invalidate,
  });
  const tag = useMutation({
    mutationFn: ({ docs, tag: t }: { docs: { id: string; tags?: string[] | null }[]; tag: string }) => tagDocuments(docs, t),
    onSettled: invalidate,
  });

  return {
    documents: documents.data ?? [],
    isLoading: documents.isLoading || !companyId,
    error: documents.error as Error | null,
    refetch: documents.refetch,
    categories: categories.data ?? [],
    projects: projects.data ?? [],
    optionsError: (categories.error ?? projects.error) as Error | null,
    refetchOptions: () => {
      void categories.refetch();
      void projects.refetch();
    },
    invalidate,
    insert,
    remove,
    move,
    tag,
  };
}
