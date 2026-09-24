/**
 * Knowledge base articles and categories for the admin editor (US-266).
 *
 * The page loaded categories and articles separately and toasted a failure
 * over an empty list that read "No articles found... create your first
 * article". Publish, feature and delete reported success when RLS filtered the
 * write to zero rows. The author came from a second auth.getUser() round trip.
 *
 * Reads throw, writes select the row back, the author is the signed-in user
 * from the auth context. These are platform tables (no company scope); the key
 * carries the company and user so one account's cache is never served to
 * another.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface KbCategory {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  icon: string | null;
  sort_order: number | null;
}

export interface KbArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  article_type: string;
  difficulty_level: string;
  estimated_read_time: number;
  view_count: number;
  is_published: boolean;
  is_featured: boolean;
  tags: string[];
  published_at: string | null;
  category_id: string;
  knowledge_base_categories?: { name: string; slug: string } | null;
}

export interface NewKbArticle {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  article_type: string;
  category_id: string;
  difficulty_level: string;
  estimated_read_time: number;
  tags: string[];
  is_published: boolean;
  is_featured: boolean;
}

export const knowledgeBaseAdminKey = (companyId: string | undefined, userId: string | undefined) =>
  ['knowledge-base-admin', companyId, userId] as const;

function requireRows(data: unknown[] | null, message: string) {
  if (!data || data.length === 0) throw new Error(message);
}

export async function fetchKnowledgeBaseAdmin(): Promise<{ articles: KbArticle[]; categories: KbCategory[] }> {
  const [categories, articles] = await Promise.all([
    supabase.from('knowledge_base_categories').select('*').order('sort_order'),
    supabase
      .from('knowledge_base_articles')
      .select('*, knowledge_base_categories ( name, slug )')
      .order('created_at', { ascending: false }),
  ]);
  if (categories.error) throw categories.error;
  if (articles.error) throw articles.error;
  return {
    categories: (categories.data ?? []) as unknown as KbCategory[],
    articles: (articles.data ?? []) as unknown as KbArticle[],
  };
}

export async function updateKbArticle(
  id: string,
  patch: { is_published?: boolean; published_at?: string | null; is_featured?: boolean }
): Promise<void> {
  const { data, error } = await supabase.from('knowledge_base_articles').update(patch).eq('id', id).select('id');
  if (error) throw error;
  requireRows(data, 'The article was not changed. You may not have permission to edit it.');
}

export async function deleteKbArticle(id: string): Promise<void> {
  const { data, error } = await supabase.from('knowledge_base_articles').delete().eq('id', id).select('id');
  if (error) throw error;
  requireRows(data, 'The article was not deleted. You may not have permission to delete it.');
}

export async function createKbArticle(authorId: string, article: NewKbArticle, now: Date = new Date()): Promise<void> {
  const { data, error } = await supabase
    .from('knowledge_base_articles')
    .insert({
      ...article,
      category_id: article.category_id || null,
      author_id: authorId,
      published_at: article.is_published ? now.toISOString() : null,
    })
    .select('id');
  if (error) throw error;
  requireRows(data, 'The article was not created. You may not have permission to add articles.');
}

export function useKnowledgeBaseAdmin() {
  const { user, userProfile } = useAuth();
  const userId = user?.id;
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = knowledgeBaseAdminKey(companyId, userId);

  const query = useQuery({ queryKey: key, queryFn: fetchKnowledgeBaseAdmin, enabled: !!userId });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateKbArticle>[1] }) => updateKbArticle(id, patch),
    onSettled: invalidate,
  });
  const remove = useMutation({ mutationFn: deleteKbArticle, onSettled: invalidate });
  const create = useMutation({
    mutationFn: (article: NewKbArticle) => {
      if (!userId) throw new Error('Not authenticated');
      return createKbArticle(userId, article);
    },
    onSettled: invalidate,
  });

  return {
    articles: query.data?.articles ?? [],
    categories: query.data?.categories ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    update: (id: string, patch: Parameters<typeof updateKbArticle>[1]) => update.mutateAsync({ id, patch }),
    remove: (id: string) => remove.mutateAsync(id),
    create: (article: NewKbArticle) => create.mutateAsync(article),
  };
}
