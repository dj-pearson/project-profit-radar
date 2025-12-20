import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PaymentStats {
  total_revenue: number;
  pending_payments: number;
  failed_payments: number;
  successful_payments: number;
  monthly_recurring: number;
}

export interface RecentPayment {
  id: string;
  amount: number;
  status: string;
  client_name: string;
  created_at: string;
  payment_method: string;
}

export function usePaymentStats() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  return useQuery({
    queryKey: ['payment-stats', companyId],
    queryFn: async (): Promise<PaymentStats> => {
      if (!companyId) throw new Error('No company ID available');

      // Fetch all invoices
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('total_amount, amount_paid, status, paid_at')
        .eq('company_id', companyId);

      if (error) throw error;

      // Calculate stats from invoices
      const paidInvoices = invoices?.filter(inv => inv.status === 'paid') || [];
      const pendingInvoices = invoices?.filter(inv => inv.status === 'pending' || inv.status === 'sent') || [];
      const overdueInvoices = invoices?.filter(inv => inv.status === 'overdue') || [];

      // Total revenue from paid invoices
      const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.amount_paid || inv.total_amount || 0), 0);

      // Calculate monthly recurring (simplified - sum of last month's payments)
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const recentPayments = paidInvoices.filter(inv => {
        if (!inv.paid_at) return false;
        return new Date(inv.paid_at) >= lastMonth;
      });
      const monthlyRevenue = recentPayments.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0);

      return {
        total_revenue: Math.round(totalRevenue * 100), // Convert to cents for consistency
        pending_payments: pendingInvoices.length,
        failed_payments: overdueInvoices.length, // Treat overdue as "failed"
        successful_payments: paidInvoices.length,
        monthly_recurring: Math.round(monthlyRevenue * 100),
      };
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecentPayments() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  return useQuery({
    queryKey: ['recent-payments', companyId],
    queryFn: async (): Promise<RecentPayment[]> => {
      if (!companyId) throw new Error('No company ID available');

      // Fetch recent invoices with payment info
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('id, total_amount, amount_paid, status, client_name, paid_at, created_at, payment_method')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Transform to RecentPayment format
      return (invoices || []).map(inv => ({
        id: inv.id,
        amount: Math.round((inv.amount_paid || inv.total_amount || 0) * 100), // Convert to cents
        status: inv.status === 'paid' ? 'succeeded' : inv.status === 'overdue' ? 'failed' : 'pending',
        client_name: inv.client_name || 'Unknown Client',
        created_at: inv.paid_at || inv.created_at,
        payment_method: inv.payment_method || 'invoice',
      }));
    },
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
}
