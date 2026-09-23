/**
 * Period figures for /financial-overview (US-266).
 *
 * Moved out of FinancialOverview's useState + useEffect loader, unchanged in
 * what it reads. The key carries the period start, so switching period is a
 * cache lookup the second time rather than four queries.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FinancialOverviewData {
  invoices: Array<{ amount: number; status: string; created_at: string; project_id: string }>;
  expenses: Array<{ amount: number; date: string; project_id: string }>;
  payments: Array<{ amount: number; payment_date: string; project_id: string }>;
  projects: Array<{ id: string; name: string; budget: number; status: string }>;
}

export const financialOverviewKey = (companyId: string | undefined, startStr: string) =>
  ['financial-overview', companyId, startStr] as const;

export async function fetchFinancialOverview(companyId: string, startStr: string): Promise<FinancialOverviewData> {
  // There is no `payments` table (US-311): recorded payments live in
  // invoice_payments, the table ProjectFinancialDashboard already reads. It
  // carries invoice_id and no project_id, so each payment is attributed to
  // a project through its invoice. invoices has total_amount (not amount)
  // and expenses has expense_date (not date); the aliases keep the shapes
  // the summaries were written against.
  const [invRes, expRes, payRes, projRes] = await Promise.all([
    supabase.from('invoices').select('amount:total_amount, status, created_at, project_id')
      .eq('company_id', companyId)
      .gte('created_at', startStr),
    supabase.from('expenses').select('amount, date:expense_date, project_id')
      .eq('company_id', companyId)
      .gte('expense_date', startStr),
    supabase.from('invoice_payments').select('payment_amount, payment_date, invoice_id')
      .eq('company_id', companyId)
      .gte('payment_date', startStr),
    supabase.from('projects').select('id, name, budget, status')
      .eq('company_id', companyId),
  ]);

  // supabase-js returns the error rather than throwing it, so each read is
  // checked explicitly; `res.data || []` alone would render a failed read
  // as revenue of zero.
  const failed = [
    ['invoices', invRes.error],
    ['expenses', expRes.error],
    ['invoice_payments', payRes.error],
    ['projects', projRes.error],
  ].filter(([, error]) => error) as Array<[string, { message: string }]>;

  // A payment in the period can be against an invoice issued before it, so
  // the project lookup cannot reuse the period-filtered invoice list.
  const paymentRows = payRes.data || [];
  const invoiceIds = [...new Set(paymentRows.map((p) => p.invoice_id).filter(Boolean))];
  const projectByInvoice = new Map<string, string>();
  if (failed.length === 0 && invoiceIds.length > 0) {
    const payInvRes = await supabase.from('invoices').select('id, project_id')
      .eq('company_id', companyId)
      .in('id', invoiceIds);
    if (payInvRes.error) failed.push(['invoices (for payments)', payInvRes.error]);
    for (const inv of payInvRes.data || []) {
      if (inv.project_id) projectByInvoice.set(inv.id, inv.project_id);
    }
  }

  if (failed.length > 0) {
    throw new Error(failed.map(([t, e]) => `${t}: ${e.message}`).join('; '));
  }

  return {
    invoices: (invRes.data || []) as FinancialOverviewData['invoices'],
    expenses: (expRes.data || []) as FinancialOverviewData['expenses'],
    payments: paymentRows.map((p) => ({
      amount: Number(p.payment_amount) || 0,
      payment_date: p.payment_date,
      project_id: projectByInvoice.get(p.invoice_id) ?? '',
    })),
    projects: (projRes.data || []) as FinancialOverviewData['projects'],
  };
}

export function useFinancialOverview(startStr: string) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  return useQuery({
    queryKey: financialOverviewKey(companyId, startStr),
    queryFn: () => fetchFinancialOverview(companyId as string, startStr),
    enabled: !!companyId,
  });
}
