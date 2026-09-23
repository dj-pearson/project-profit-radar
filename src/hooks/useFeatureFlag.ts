/**
 * Read one runtime feature flag for the signed-in user's company (US-281).
 *
 * Cached for a minute per company and key, so every component asking about
 * the same flag shares one request. A failed read never throws into the UI:
 * it resolves to the flag's `onReadError`, its documented safe side. While
 * loading, `enabled` is the registry default, so nothing flickers off for the
 * common case of no override row.
 *
 * This is display only. The edge function enforces the flag whatever the web
 * app believes.
 */
import { useQuery } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  FEATURE_FLAGS, resolveFlag,
  type FeatureFlagKey, type FeatureFlagRow, type FlagDecision,
} from '@/lib/featureFlags';

// feature_flags is newer than the generated types (20260924160000), so the
// table is not in the Database union yet.
const db = () => supabase as unknown as SupabaseClient;

export const featureFlagKey = (companyId: string | undefined, key: FeatureFlagKey) =>
  ['feature-flag', companyId, key] as const;

export async function fetchFeatureFlagRows(key: FeatureFlagKey): Promise<FeatureFlagRow[]> {
  // RLS returns the global rows and this company's rows only.
  const { data, error } = await db()
    .from('feature_flags')
    .select('company_id, enabled')
    .eq('flag_key', key);
  if (error) throw error;
  return Array.isArray(data) ? (data as FeatureFlagRow[]) : [];
}

export interface FeatureFlagState extends FlagDecision {
  isLoading: boolean;
}

export function useFeatureFlag(key: FeatureFlagKey): FeatureFlagState {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;

  const query = useQuery({
    queryKey: featureFlagKey(companyId, key),
    enabled: !!companyId,
    staleTime: 60_000,
    retry: 1,
    queryFn: () => fetchFeatureFlagRows(key),
  });

  if (query.isError) {
    return { enabled: FEATURE_FLAGS[key].onReadError, source: 'read_error', isLoading: false };
  }
  if (!query.data) {
    return { enabled: FEATURE_FLAGS[key].default, source: 'default', isLoading: query.isLoading };
  }
  return { ...resolveFlag(key, query.data, companyId), isLoading: false };
}
