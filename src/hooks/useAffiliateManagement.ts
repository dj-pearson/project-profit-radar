/**
 * Affiliate programs and codes for the root-admin AffiliateManagement card (US-266).
 *
 * The card read both tables inside one try and toasted a failure over empty
 * lists, with no error in place. Program saves reported success when RLS
 * filtered the update to zero rows. Reads throw now and the card shows the
 * error; writes select the row back. Platform tables (root admin only); the key
 * carries the company and user.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AffiliateProgram {
  id: string;
  name: string;
  referrer_reward_months: number;
  referee_reward_months: number;
  min_subscription_duration_months: number;
  is_active: boolean;
}

export interface AffiliateCode {
  id: string;
  affiliate_code: string;
  company_id: string;
  total_referrals: number;
  successful_referrals: number;
  total_rewards_earned: number;
  is_active: boolean;
  companies: { name: string } | null;
}

export type AffiliateProgramPatch = Partial<Omit<AffiliateProgram, 'id'>>;

export const affiliateKey = (companyId: string | undefined, userId: string | undefined) =>
  ['affiliates', companyId, userId] as const;

function requireRows(data: unknown[] | null, message: string) {
  if (!data || data.length === 0) throw new Error(message);
}

export async function fetchAffiliates(): Promise<{ programs: AffiliateProgram[]; codes: AffiliateCode[] }> {
  const [programs, codes] = await Promise.all([
    supabase.from('affiliate_programs').select('*').order('created_at', { ascending: false }),
    supabase.from('affiliate_codes').select('*, companies ( name )').order('total_referrals', { ascending: false }),
  ]);
  if (programs.error) throw programs.error;
  if (codes.error) throw codes.error;
  return {
    programs: (programs.data ?? []) as unknown as AffiliateProgram[],
    codes: (codes.data ?? []) as unknown as AffiliateCode[],
  };
}

export async function updateAffiliateProgram(id: string, patch: AffiliateProgramPatch, now: Date = new Date()): Promise<void> {
  const { data, error } = await supabase
    .from('affiliate_programs')
    .update({ ...patch, updated_at: now.toISOString() })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  requireRows(data, 'The program was not updated. You may not have permission to edit affiliate programs.');
}

export async function createAffiliateProgram(): Promise<void> {
  const { data, error } = await supabase
    .from('affiliate_programs')
    .insert({
      name: 'New Program',
      referrer_reward_months: 1,
      referee_reward_months: 1,
      min_subscription_duration_months: 1,
      is_active: false,
    })
    .select('id');
  if (error) throw error;
  requireRows(data, 'The program was not created. You may not have permission to add affiliate programs.');
}

export function useAffiliateManagement({ enabled }: { enabled: boolean }) {
  const { user, userProfile } = useAuth();
  const userId = user?.id;
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = affiliateKey(companyId, userId);

  const query = useQuery({ queryKey: key, queryFn: fetchAffiliates, enabled: enabled && !!userId });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: AffiliateProgramPatch }) => updateAffiliateProgram(id, patch),
    onSettled: invalidate,
  });
  const create = useMutation({ mutationFn: createAffiliateProgram, onSettled: invalidate });

  return {
    programs: query.data?.programs ?? [],
    codes: query.data?.codes ?? [],
    isFetching: query.isFetching,
    error: query.error as Error | null,
    refetch: query.refetch,
    update: (id: string, patch: AffiliateProgramPatch) => update.mutateAsync({ id, patch }),
    create: () => create.mutateAsync(),
  };
}
