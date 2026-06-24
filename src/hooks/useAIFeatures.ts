import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AIFeaturesState {
  /** True while loading the workspace setting. */
  loading: boolean;
  /** Workspace admin has enabled AI-assisted features. */
  enabled: boolean;
  /** Workspace admin has allowed sending inputs to AI providers. */
  allowExternalProviders: boolean;
  /**
   * Convenience flag for callers that only want to know: "can I invoke an
   * AI feature right now?". True only when both toggles are on.
   */
  canUseExternalAI: boolean;
}

/**
 * Reads the workspace-level AI controls set in CompanySettings and exposes
 * them to AI-bearing components. Use this to gate UI entry points and to
 * short-circuit client-side calls to AI edge functions.
 *
 * The hook intentionally defaults to `enabled: true` while loading so that
 * switching pages does not flicker existing AI panels. Call sites that block
 * sensitive operations (e.g., sending Customer Content to Anthropic) should
 * wait for `loading === false` before acting.
 */
export const useAIFeatures = (): AIFeaturesState => {
  const { userProfile } = useAuth();
  const [state, setState] = useState<AIFeaturesState>({
    loading: true,
    enabled: true,
    allowExternalProviders: true,
    canUseExternalAI: true,
  });

  useEffect(() => {
    let cancelled = false;
    const companyId = userProfile?.company_id;
    if (!companyId) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    (async () => {
      try {
        const { data } = await supabase
          .from('company_settings')
          .select('enable_ai_features, enable_ai_data_sharing')
          .eq('company_id', companyId)
          .maybeSingle();

        if (cancelled) return;
        const enabled = data?.enable_ai_features ?? true;
        const allowExternalProviders = data?.enable_ai_data_sharing ?? true;
        setState({
          loading: false,
          enabled,
          allowExternalProviders,
          canUseExternalAI: enabled && allowExternalProviders,
        });
      } catch {
        if (!cancelled) {
          // Fail-open to avoid blocking users when the setting row is
          // missing in a freshly provisioned workspace.
          setState({
            loading: false,
            enabled: true,
            allowExternalProviders: true,
            canUseExternalAI: true,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userProfile?.company_id]);

  return state;
};
