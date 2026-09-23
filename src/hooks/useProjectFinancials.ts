/**
 * Figures behind the project Financials section (US-364; moved onto a query for US-266).
 *
 * The reads and the sums are the ones ProjectFinancialDashboard ran in a
 * useEffect. supabase-js returns an error rather than throwing it, so every
 * read is checked and a failure throws one error naming each table that
 * failed; the dashboard shows that instead of a row of zeros.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { captureException } from '@/lib/sentry';

export interface ProjectFinancialData {
  contractValue: number;
  billedToDate: number;
  collected: number;
  outstanding: number;
  totalCosts: number;
  netProfit: number;
  profitMargin: number;
  previousProfitMargin: number;
  monthlyCashFlow: Array<{ month: string; income: number; expenses: number }>;
}

export const projectFinancialsKey = (companyId: string | undefined, projectId: string) =>
  ['project-financials', companyId, projectId] as const;

export async function fetchProjectFinancials(companyId: string, projectId: string): Promise<ProjectFinancialData> {
  const [invoicesRes, expensesRes, projectRes] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, total_amount, status, created_at')
      .eq('company_id', companyId)
      .eq('project_id', projectId),
    supabase
      .from('expenses')
      .select('amount, expense_date')
      .eq('company_id', companyId)
      .eq('project_id', projectId),
    supabase
      .from('projects')
      .select('budget')
      .eq('id', projectId)
      .eq('company_id', companyId)
      .single(),
  ]);

  // supabase-js returns the error rather than throwing it, so each read
  // is checked explicitly; `res.data || []` alone would turn a failed
  // read into a project that had been billed and spent nothing.
  const failed = [
    ['invoices', invoicesRes.error],
    ['expenses', expensesRes.error],
    ['projects', projectRes.error],
  ].filter(([, error]) => error) as Array<[string, { message: string }]>;

  const invoices = invoicesRes.data || [];

  // There is no `payments` table (US-311/US-364). Payments live in
  // invoice_payments, which carries invoice_id but no project_id, so
  // they are scoped to the project through its invoices.
  let payments: Array<{ payment_amount: number; payment_date: string }> = [];
  if (failed.length === 0 && invoices.length > 0) {
    const paymentsRes = await supabase
      .from('invoice_payments')
      .select('payment_amount, payment_date')
      .eq('company_id', companyId)
      .in('invoice_id', invoices.map(inv => inv.id));
    if (paymentsRes.error) failed.push(['invoice_payments', paymentsRes.error]);
    payments = paymentsRes.data || [];
  }

  if (failed.length > 0) {
    throw new Error(
      `Could not load project financials: ${failed.map(([t, e]) => `${t} (${e.message})`).join('; ')}`,
    );
  }

  const expenses = expensesRes.data || [];
  const project = projectRes.data;

  const contractValue = project?.budget || 0;
  const billedToDate = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
  const collected = payments.reduce((sum, p) => sum + (p.payment_amount || 0), 0);
  const outstanding = billedToDate - collected;
  const totalCosts = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit = collected - totalCosts;
  const profitMargin = billedToDate > 0 ? (netProfit / billedToDate) * 100 : 0;

  // Build monthly cash flow data for last 6 months
  const months: Array<{ month: string; income: number; expenses: number }> = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    const monthIncome = payments
      .filter(p => p.payment_date?.startsWith(monthKey))
      .reduce((sum, p) => sum + (p.payment_amount || 0), 0);

    const monthExpenses = expenses
      .filter(e => e.expense_date?.startsWith(monthKey))
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    months.push({ month: monthStr, income: monthIncome, expenses: monthExpenses });
  }

  return {
    contractValue,
    billedToDate,
    collected,
    outstanding,
    totalCosts,
    netProfit,
    profitMargin,
    previousProfitMargin: profitMargin * 0.95,
    monthlyCashFlow: months,
  };
}

export function useProjectFinancials(projectId: string) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const ready = !!companyId && !!projectId;
  const query = useQuery({
    queryKey: projectFinancialsKey(companyId, projectId),
    queryFn: async () => {
      try {
        return await fetchProjectFinancials(companyId as string, projectId);
      } catch (error) {
        captureException(error instanceof Error ? error : new Error(String(error)), { context: 'ProjectFinancialDashboard.loadFinancialData' });
        throw error;
      }
    },
    enabled: ready,
  });
  return {
    data: query.data ?? null,
    isLoading: query.isLoading || !ready,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
