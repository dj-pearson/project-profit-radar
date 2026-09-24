/**
 * The import_sessions row behind the smart import wizard (US-266).
 *
 * Two id checks made this flow a no-op. FieldMappingStep saved the chosen
 * mappings only when `sessionId.length === 36 && !sessionId.includes('-')`,
 * which no UUID satisfies, so they were never saved; the wizard then read
 * field_mappings back from the row (error unread), got nothing, and validated
 * the file with no mappings at all. The wizard marked the session complete
 * only when the id had no '-', so every session stayed "analyzing" forever.
 * The mappings now travel from the step to the wizard directly and are saved
 * on the row as a record; whether a row exists is a flag, not a guess from
 * the id's shape. Every call here throws on an error or zero rows.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FieldSuggestion {
  id: string;
  source_field: string;
  suggested_target_field: string;
  confidence_score: number;
  data_sample: string[];
}

export const importFieldSuggestionsKey = (companyId: string | undefined, sessionId: string) =>
  ['import-session', companyId, sessionId, 'suggestions'] as const;

export async function createImportSession(
  companyId: string,
  userId: string,
  file: { name: string; size: number; type: string },
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('import_sessions')
    .insert({
      file_name: file.name,
      file_size: file.size,
      file_type: file.type || 'text/csv',
      status: 'analyzing',
      company_id: companyId,
      created_by: userId,
    })
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('The import session was not created.');
  return data;
}

/** Run the analyzer on a session, then read the session it filled in. */
export async function analyzeImportSession(
  companyId: string,
  sessionId: string,
  csvData: string,
  fileName: string,
): Promise<Record<string, unknown>> {
  const { error: analysisError } = await supabase.functions.invoke('smart-data-analyzer', {
    body: { sessionId, csvData, fileName },
  });
  if (analysisError) throw analysisError;
  const { data, error } = await supabase
    .from('import_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('company_id', companyId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('The analysed import session could not be read back.');
  return data as Record<string, unknown>;
}

export async function fetchFieldSuggestions(sessionId: string): Promise<FieldSuggestion[]> {
  const { data, error } = await supabase
    .from('import_field_suggestions')
    .select('*')
    .eq('import_session_id', sessionId)
    .order('confidence_score', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as FieldSuggestion[];
}

export async function updateImportSession(
  companyId: string,
  sessionId: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { data, error } = await supabase
    .from('import_sessions')
    .update(patch as never)
    .eq('id', sessionId)
    .eq('company_id', companyId)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('The import session was not updated.');
}

function useCompany() {
  const { user, userProfile } = useAuth();
  return { companyId: userProfile?.company_id ?? undefined, userId: user?.id };
}

/** Suggestions for a saved session; disabled for a manual (unsaved) one. */
export function useFieldSuggestions(sessionId: string, persisted: boolean) {
  const { companyId } = useCompany();
  return useQuery({
    queryKey: importFieldSuggestionsKey(companyId, sessionId),
    queryFn: () => fetchFieldSuggestions(sessionId),
    enabled: persisted && !!sessionId,
  });
}

export function useImportSession() {
  const { companyId, userId } = useCompany();
  const need = () => {
    if (!userId) throw new Error('User not authenticated');
    if (!companyId) throw new Error('User company not found');
    return { companyId, userId };
  };
  const create = useMutation({
    mutationFn: (file: { name: string; size: number; type: string }) => {
      const { companyId: c, userId: u } = need();
      return createImportSession(c, u, file);
    },
  });
  const analyze = useMutation({
    mutationFn: (v: { sessionId: string; csvData: string; fileName: string }) =>
      analyzeImportSession(need().companyId, v.sessionId, v.csvData, v.fileName),
  });
  const update = useMutation({
    mutationFn: (v: { sessionId: string; patch: Record<string, unknown> }) =>
      updateImportSession(need().companyId, v.sessionId, v.patch),
  });
  return { companyId, userId, create, analyze, update };
}
