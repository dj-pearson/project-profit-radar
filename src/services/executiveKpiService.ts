import { supabase } from '@/integrations/supabase/client';

/**
 * US-233: company-wide data fetch for the executive KPI dashboard. All queries
 * are company_id-scoped for site isolation. The metric math lives in the pure,
 * tested lib (src/lib/executive-kpis.ts); this module only does I/O.
 */

export interface ExecutiveInvoice {
  issue_date: string | null;
  total_amount: number | null;
  status: string | null;
}
export interface ExecutiveExpense {
  expense_date: string | null;
  amount: number | null;
}
export interface ExecutiveEstimate {
  status: string | null;
}
export interface ExecutiveProject {
  budget: number | null;
  total_budget: number | null;
  status: string | null;
}

export interface ExecutiveData {
  invoices: ExecutiveInvoice[];
  expenses: ExecutiveExpense[];
  estimates: ExecutiveEstimate[];
  projects: ExecutiveProject[];
}

/**
 * Fetch invoices, expenses, estimates (since `sinceISO`) and all projects for a
 * company. Estimates/invoices/expenses drive the trend + forecast; projects are
 * the current backlog/avg-size snapshot.
 */
export async function fetchExecutiveData(companyId: string, sinceISO: string): Promise<ExecutiveData> {
  const [invoicesRes, expensesRes, estimatesRes, projectsRes] = await Promise.all([
    supabase
      .from('invoices')
      .select('issue_date, total_amount, status')
      .eq('company_id', companyId)
      .gte('issue_date', sinceISO),
    supabase
      .from('expenses')
      .select('expense_date, amount')
      .eq('company_id', companyId)
      .gte('expense_date', sinceISO),
    supabase
      .from('estimates')
      .select('status')
      .eq('company_id', companyId)
      .gte('estimate_date', sinceISO),
    supabase
      .from('projects')
      .select('budget, total_budget, status')
      .eq('company_id', companyId),
  ]);

  if (invoicesRes.error) throw new Error(invoicesRes.error.message);
  if (expensesRes.error) throw new Error(expensesRes.error.message);
  if (estimatesRes.error) throw new Error(estimatesRes.error.message);
  if (projectsRes.error) throw new Error(projectsRes.error.message);

  return {
    invoices: (invoicesRes.data ?? []) as ExecutiveInvoice[],
    expenses: (expensesRes.data ?? []) as ExecutiveExpense[],
    estimates: (estimatesRes.data ?? []) as ExecutiveEstimate[],
    projects: (projectsRes.data ?? []) as ExecutiveProject[],
  };
}
