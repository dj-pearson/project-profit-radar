/**
 * Reads and writes behind the keyword research manager (US-266).
 *
 * KeywordManager kept its own copy of keyword_research_data and patched it by
 * hand after each write. A "replace" import deleted the company's keywords,
 * logged a delete error as a warning and inserted the new file on top, so a
 * failed delete left two copies. Blog-selection toggles checked the error but
 * not the row count, and the view was rebuilt from local state rather than
 * from what the database held.
 *
 * The selection (selected keywords, topics) is now derived from the rows, so
 * after a write the screen shows what was saved. Reads throw; a replace stops
 * if the delete fails; toggles select back and fail on zero rows.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { KeywordData } from '@/components/admin/keyword-manager/keywordData';

export interface KeywordRows {
  keywords: KeywordData[];
  /** Keywords flagged selected_for_blog_generation, in the same order as `keywords`. */
  selected: KeywordData[];
}

export const keywordResearchKey = (companyId: string | undefined) => ['keyword-research', companyId] as const;

const BATCH = 100;

export async function fetchKeywordResearch(companyId: string): Promise<KeywordRows> {
  const { data, error } = await supabase
    .from('keyword_research_data')
    .select('*')
    .eq('company_id', companyId)
    .order('search_volume', { ascending: false });
  if (error) throw error;

  const keywords: KeywordData[] = [];
  const selected: KeywordData[] = [];
  for (const row of data ?? []) {
    const k: KeywordData = {
      keyword: row.keyword,
      searchVolume: row.search_volume,
      difficulty: row.difficulty,
      cpc: row.cpc,
      intent: row.search_intent as KeywordData['intent'],
      category: row.category,
      priority: row.priority as KeywordData['priority'],
      currentRank: row.current_rank,
      targetRank: row.target_rank,
      // used_count is not a column (the table has blog_generation_count); this
      // reads it the way the component always did, so it stays 0.
      usedCount: (row as { used_count?: number | null }).used_count || 0,
    } as KeywordData;
    keywords.push(k);
    if (row.selected_for_blog_generation === true) selected.push(k);
  }
  return { keywords, selected };
}

/**
 * Imports keywords. `append` upserts and skips keywords already present;
 * otherwise the company's keywords are deleted first, and the import stops if
 * that delete fails rather than inserting a second copy on top.
 */
export async function importKeywords(companyId: string, keywords: KeywordData[], append: boolean): Promise<void> {
  if (!append) {
    const { error } = await supabase.from('keyword_research_data').delete().eq('company_id', companyId);
    if (error) throw error;
  }

  for (let i = 0; i < keywords.length; i += BATCH) {
    const records = keywords.slice(i, i + BATCH).map((k) => ({
      company_id: companyId,
      keyword: k.keyword,
      search_volume: k.searchVolume,
      difficulty: k.difficulty,
      cpc: k.cpc || null,
      search_intent: k.intent,
      category: k.category || 'general',
      priority: k.priority,
      current_rank: k.currentRank || null,
      target_rank: k.targetRank || null,
    }));
    const { error } = append
      ? await supabase
          .from('keyword_research_data')
          .upsert(records, { onConflict: 'company_id,keyword', ignoreDuplicates: true })
          .select('id')
      : await supabase.from('keyword_research_data').insert(records).select('id');
    if (error) {
      throw new Error(
        `Rows ${i + 1}-${i + records.length} were not saved (${error.message}). ` +
          `${i} of ${keywords.length} keywords were saved before this.`,
      );
    }
  }
}

/** Replaces the blog selection with `keywords`. */
export async function setBlogSelection(companyId: string, keywords: string[], now = new Date()): Promise<void> {
  const stamp = now.toISOString();
  const { error: clearError } = await supabase
    .from('keyword_research_data')
    .update({ selected_for_blog_generation: false, updated_at: stamp })
    .eq('company_id', companyId);
  if (clearError) throw clearError;
  if (keywords.length === 0) return;

  const { data, error } = await supabase
    .from('keyword_research_data')
    .update({ selected_for_blog_generation: true, updated_at: stamp })
    .eq('company_id', companyId)
    .in('keyword', keywords)
    .select('id');
  if (error) throw error;
  if ((data?.length ?? 0) < keywords.length) {
    throw new Error(`Only ${data?.length ?? 0} of ${keywords.length} keywords were selected. You may not have permission to change the rest.`);
  }
}

/** Selects or clears every keyword the company has. Returns how many rows changed. */
export async function setAllKeywordsSelected(companyId: string, selected: boolean, now = new Date()): Promise<number> {
  const { data, error } = await supabase
    .from('keyword_research_data')
    .update({ selected_for_blog_generation: selected, updated_at: now.toISOString() })
    .eq('company_id', companyId)
    .select('id');
  if (error) throw error;
  return data?.length ?? 0;
}

export async function setKeywordSelected(companyId: string, keyword: string, selected: boolean, now = new Date()): Promise<void> {
  const { data, error } = await supabase
    .from('keyword_research_data')
    .update({ selected_for_blog_generation: selected, updated_at: now.toISOString() })
    .eq('company_id', companyId)
    .eq('keyword', keyword)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error(`"${keyword}" was not updated. You may not have permission to change it.`);
  }
}

/** Deletes the named keywords, or every keyword for the company when `keywords` is omitted. Returns the count removed. */
export async function deleteKeywords(companyId: string, keywords?: string[]): Promise<number> {
  let query = supabase.from('keyword_research_data').delete().eq('company_id', companyId);
  if (keywords) query = query.in('keyword', keywords);
  const { data, error } = await query.select('id');
  if (error) throw error;
  const removed = data?.length ?? 0;
  if (keywords && removed < keywords.length) {
    throw new Error(`Only ${removed} of ${keywords.length} keywords were deleted. You may not have permission to delete the rest.`);
  }
  return removed;
}

export function useKeywordResearch() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = keywordResearchKey(companyId);

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchKeywordResearch(companyId as string),
    enabled: !!companyId,
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });
  const needCompany = () => {
    if (!companyId) throw new Error('Your profile is not linked to a company.');
    return companyId;
  };

  const importMutation = useMutation({
    mutationFn: ({ keywords, append }: { keywords: KeywordData[]; append: boolean }) =>
      importKeywords(needCompany(), keywords, append),
    onSettled: invalidate,
  });
  const selection = useMutation({
    mutationFn: (keywords: string[]) => setBlogSelection(needCompany(), keywords),
    onSettled: invalidate,
  });
  const all = useMutation({
    mutationFn: (selected: boolean) => setAllKeywordsSelected(needCompany(), selected),
    onSettled: invalidate,
  });
  const toggle = useMutation({
    mutationFn: ({ keyword, selected }: { keyword: string; selected: boolean }) =>
      setKeywordSelected(needCompany(), keyword, selected),
    onSettled: invalidate,
  });
  const remove = useMutation({
    mutationFn: (keywords?: string[]) => deleteKeywords(needCompany(), keywords),
    onSettled: invalidate,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error as Error | null,
    refetch: query.refetch,
    importKeywords: (keywords: KeywordData[], append: boolean) => importMutation.mutateAsync({ keywords, append }),
    setBlogSelection: (keywords: string[]) => selection.mutateAsync(keywords),
    setAllSelected: (selected: boolean) => all.mutateAsync(selected),
    setKeywordSelected: (keyword: string, selected: boolean) => toggle.mutateAsync({ keyword, selected }),
    deleteKeywords: (keywords?: string[]) => remove.mutateAsync(keywords),
    isWriting: importMutation.isPending || selection.isPending || all.isPending || toggle.isPending || remove.isPending,
  };
}
