import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CashFlowData {
  current_cash: number;
  daily_burn_rate: number;
  runway_days: number;
  trend: 'improving' | 'declining' | 'stable';
  last_30_days_change: number;
  total_receivables: number;
  total_payables: number;
  forecast_30: number;
  forecast_60: number;
  forecast_90: number;
}

export interface CashFlowItem {
  id: string;
  date: string;
  type: 'inflow' | 'outflow';
  amount: number;
  description: string;
  category: string;
  status: 'pending' | 'completed';
}

export function useCashFlowData() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  return useQuery({
    queryKey: ['cash-flow-data', companyId],
    queryFn: async (): Promise<CashFlowData> => {
      if (!companyId) throw new Error('No company ID available');

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      // Fetch unpaid invoices (receivables)
      const { data: receivables, error: recError } = await supabase
        .from('invoices')
        .select('total_amount, amount_paid, status, due_date')
        .eq('company_id', companyId)
        .in('status', ['sent', 'pending', 'overdue', 'partial']);

      if (recError) throw recError;

      // Fetch unpaid expenses (payables)
      const { data: payables, error: payError } = await supabase
        .from('expenses')
        .select('amount, payment_status, expense_date')
        .eq('company_id', companyId)
        .in('payment_status', ['pending', 'unpaid']);

      if (payError) throw payError;

      // Fetch paid invoices in last 30 days (inflows)
      const { data: recentInflows, error: inflowError } = await supabase
        .from('invoices')
        .select('amount_paid, paid_at')
        .eq('company_id', companyId)
        .eq('status', 'paid')
        .gte('paid_at', thirtyDaysAgo.toISOString());

      if (inflowError) throw inflowError;

      // Fetch expenses in last 30 days (outflows)
      const { data: recentOutflows, error: outflowError } = await supabase
        .from('expenses')
        .select('amount, expense_date')
        .eq('company_id', companyId)
        .gte('expense_date', thirtyDaysAgo.toISOString());

      if (outflowError) throw outflowError;

      // Fetch expenses from 30-60 days ago for trend comparison
      const { data: previousOutflows, error: prevError } = await supabase
        .from('expenses')
        .select('amount')
        .eq('company_id', companyId)
        .gte('expense_date', sixtyDaysAgo.toISOString())
        .lt('expense_date', thirtyDaysAgo.toISOString());

      if (prevError) throw prevError;

      // Calculate totals
      const totalReceivables = receivables?.reduce((sum, inv) => {
        const remaining = (inv.total_amount || 0) - (inv.amount_paid || 0);
        return sum + remaining;
      }, 0) || 0;

      const totalPayables = payables?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;

      // Calculate cash flows
      const last30DaysInflow = recentInflows?.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0) || 0;
      const last30DaysOutflow = recentOutflows?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;
      const prev30DaysOutflow = previousOutflows?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;

      // Calculate daily averages (using 30 days)
      const dailyInflow = last30DaysInflow / 30;
      const dailyOutflow = last30DaysOutflow / 30;
      const dailyBurnRate = Math.max(0, dailyOutflow - dailyInflow);

      // Estimate current cash (net of last 30 days activity + receivables collected assumption)
      const netCashFlow = last30DaysInflow - last30DaysOutflow;
      const estimatedCash = Math.max(0, totalReceivables * 0.3 + netCashFlow); // Conservative estimate

      // Calculate runway
      const runwayDays = dailyBurnRate > 0 ? Math.floor(estimatedCash / dailyBurnRate) : 999;

      // Calculate trend
      const currentBurnRate = last30DaysOutflow;
      const previousBurnRate = prev30DaysOutflow || last30DaysOutflow;
      const burnRateChange = previousBurnRate > 0
        ? ((currentBurnRate - previousBurnRate) / previousBurnRate) * 100
        : 0;

      let trend: 'improving' | 'declining' | 'stable' = 'stable';
      if (burnRateChange > 10) trend = 'declining';
      else if (burnRateChange < -10) trend = 'improving';

      // Forecast calculations (simple linear projection)
      const monthlyNetCashFlow = (dailyInflow - dailyOutflow) * 30;
      const forecast30 = Math.max(0, estimatedCash + monthlyNetCashFlow);
      const forecast60 = Math.max(0, estimatedCash + monthlyNetCashFlow * 2);
      const forecast90 = Math.max(0, estimatedCash + monthlyNetCashFlow * 3);

      return {
        current_cash: Math.round(estimatedCash),
        daily_burn_rate: Math.round(dailyBurnRate),
        runway_days: Math.min(runwayDays, 999),
        trend,
        last_30_days_change: Math.round(burnRateChange),
        total_receivables: Math.round(totalReceivables),
        total_payables: Math.round(totalPayables),
        forecast_30: Math.round(forecast30),
        forecast_60: Math.round(forecast60),
        forecast_90: Math.round(forecast90),
      };
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCashFlowActivity() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  return useQuery({
    queryKey: ['cash-flow-activity', companyId],
    queryFn: async (): Promise<CashFlowItem[]> => {
      if (!companyId) throw new Error('No company ID available');

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const thirtyDaysAhead = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Fetch recent and upcoming invoices
      const { data: invoices, error: invError } = await supabase
        .from('invoices')
        .select('id, invoice_number, client_name, total_amount, amount_paid, status, paid_at, due_date')
        .eq('company_id', companyId)
        .or(`paid_at.gte.${thirtyDaysAgo.toISOString()},due_date.lte.${thirtyDaysAhead.toISOString()}`)
        .order('due_date', { ascending: false })
        .limit(10);

      if (invError) throw invError;

      // Fetch recent expenses
      const { data: expenses, error: expError } = await supabase
        .from('expenses')
        .select('id, description, amount, expense_date, payment_status, vendor_name')
        .eq('company_id', companyId)
        .gte('expense_date', thirtyDaysAgo.toISOString())
        .order('expense_date', { ascending: false })
        .limit(10);

      if (expError) throw expError;

      // Transform to CashFlowItem format
      const items: CashFlowItem[] = [];

      // Add invoice items (inflows)
      invoices?.forEach(inv => {
        const isPaid = inv.status === 'paid';
        items.push({
          id: `inv-${inv.id}`,
          date: isPaid ? (inv.paid_at || inv.due_date) : inv.due_date,
          type: 'inflow',
          amount: isPaid ? (inv.amount_paid || inv.total_amount) : inv.total_amount,
          description: `Invoice ${inv.invoice_number}${inv.client_name ? ` - ${inv.client_name}` : ''}`,
          category: isPaid ? 'Payment Received' : 'Expected Payment',
          status: isPaid ? 'completed' : 'pending',
        });
      });

      // Add expense items (outflows)
      expenses?.forEach(exp => {
        const isCompleted = exp.payment_status === 'paid' || exp.payment_status === 'completed';
        items.push({
          id: `exp-${exp.id}`,
          date: exp.expense_date,
          type: 'outflow',
          amount: exp.amount,
          description: exp.description || exp.vendor_name || 'Expense',
          category: exp.vendor_name || 'Expense',
          status: isCompleted ? 'completed' : 'pending',
        });
      });

      // Sort by date descending
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return items.slice(0, 15);
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
}
