/**
 * Billing automation rules and payment reminders for /admin/billing-automation (US-266).
 *
 * The page looked up tenant_id twice with unchecked reads and caught every
 * error into console.error, so a failed read showed "No automation rules
 * configured" and zero reminders. "Reminders Sent" and "Pending" counted the
 * 20 newest reminders only. A rule toggle reported nothing either way.
 *
 * Reads throw; the sent and pending cards are head counts over every reminder;
 * the toggle selects the row back. These tables are keyed by tenant_id; the
 * cache key carries the company and user.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTenantId } from './tenantScope';

export interface BillingRule {
  id: string;
  rule_name: string;
  rule_type: string;
  auto_generate: boolean;
  auto_send: boolean;
  is_active: boolean;
  payment_terms_days: number;
}

export interface PaymentReminder {
  id: string;
  reminder_type: string;
  sent_at: string | null;
  status: string;
  delivery_method: string;
}

export interface BillingAutomationData {
  tenantId: string | null;
  rules: BillingRule[];
  reminders: PaymentReminder[];
  sentCount: number;
  pendingCount: number;
}

export const billingAutomationKey = (companyId: string | undefined, userId: string | undefined) =>
  ['billing-automation', companyId, userId] as const;

export async function fetchBillingAutomation(userId: string): Promise<BillingAutomationData> {
  const tenantId = await fetchTenantId(userId);
  if (!tenantId) return { tenantId: null, rules: [], reminders: [], sentCount: 0, pendingCount: 0 };

  const head = { count: 'exact', head: true } as const;
  const [rules, reminders, sent, pending] = await Promise.all([
    supabase.from('billing_automation_rules').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
    supabase.from('payment_reminders').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(20),
    supabase.from('payment_reminders').select('id', head).eq('tenant_id', tenantId).eq('status', 'sent'),
    supabase.from('payment_reminders').select('id', head).eq('tenant_id', tenantId).eq('status', 'pending'),
  ]);
  const failed = [rules, reminders, sent, pending].find((r) => r.error)?.error;
  if (failed) throw failed;
  return {
    tenantId,
    rules: (rules.data ?? []) as unknown as BillingRule[],
    reminders: (reminders.data ?? []) as unknown as PaymentReminder[],
    sentCount: sent.count ?? 0,
    pendingCount: pending.count ?? 0,
  };
}

export async function setBillingRuleActive(id: string, isActive: boolean): Promise<void> {
  const { data, error } = await supabase
    .from('billing_automation_rules')
    .update({ is_active: isActive })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('The rule was not changed. You may not have permission to edit billing rules.');
  }
}

export function useBillingAutomation() {
  const { user, userProfile } = useAuth();
  const userId = user?.id;
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = billingAutomationKey(companyId, userId);

  const query = useQuery({ queryKey: key, queryFn: () => fetchBillingAutomation(userId as string), enabled: !!userId });
  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => setBillingRuleActive(id, isActive),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    setActive: (id: string, isActive: boolean) => toggle.mutateAsync({ id, isActive }),
  };
}
