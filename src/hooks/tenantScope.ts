/**
 * The tenant_id behind the tenant-scoped admin tables (US-266).
 *
 * Several admin pages (safety automation, risk prediction, auto scheduling)
 * read tables keyed by tenant_id rather than company_id, and each looked the
 * tenant up again before every query, ignoring the error. A failed lookup read
 * as "no tenant" and the page rendered empty. This reads it once and throws.
 */
import { supabase } from '@/integrations/supabase/client';

export async function fetchTenantId(userId: string): Promise<string | null> {
  const { data, error } = await supabase.from('user_profiles').select('tenant_id').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data?.tenant_id ?? null;
}

export const NO_TENANT_MESSAGE = 'Your profile is not linked to a tenant, so there is nowhere to record this.';
