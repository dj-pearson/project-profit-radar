/**
 * Accounting Hooks for Enterprise Finance Module
 *
 * Provides React hooks for:
 * - Chart of Accounts management
 * - Journal Entries
 * - Bills and Bill Payments (AP)
 * - Credit Memos (AR)
 * - Bank Reconciliation
 * - Financial Reports
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { validateJournalEntry, JournalEntry } from '@/utils/accountingUtils';

// =====================================================
// CHART OF ACCOUNTS
// =====================================================

export function useChartOfAccounts(companyId?: string) {
  return useQuery({
    queryKey: ['chart-of-accounts', companyId],
    queryFn: async () => {
      const query = supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('is_active', true)
        .order('account_number');

      if (companyId) {
        query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

export function useAccount(accountId: string) {
  return useQuery({
    queryKey: ['account', accountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('id', accountId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!accountId,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountData: any) => {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .insert(accountData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast.success('Account created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create account: ${error.message}`);
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['account'] });
      toast.success('Account updated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to update account: ${error.message}`);
    },
  });
}

// =====================================================
// JOURNAL ENTRIES
// =====================================================

export function useJournalEntries(companyId?: string, filters?: {
  startDate?: string;
  endDate?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ['journal-entries', companyId, filters],
    queryFn: async () => {
      let query = supabase
        .from('journal_entries')
        .select(`
          *,
          lines:journal_entry_lines(
            *,
            account:chart_of_accounts(account_number, account_name)
          )
        `)
        .order('entry_date', { ascending: false });

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      if (filters?.startDate) {
        query = query.gte('entry_date', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('entry_date', filters.endDate);
      }

      if (filters?.status) {
        query = query.eq('transaction_status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

export function useJournalEntry(entryId: string) {
  return useQuery({
    queryKey: ['journal-entry', entryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('journal_entries')
        .select(`
          *,
          lines:journal_entry_lines(
            *,
            account:chart_of_accounts(id, account_number, account_name, account_type)
          )
        `)
        .eq('id', entryId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!entryId,
  });
}

export function useCreateJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: {
      companyId: string;
      entryDate: string;
      description: string;
      memo?: string;
      projectId?: string;
      lines: Array<{
        accountId: string;
        debitAmount: number;
        creditAmount: number;
        description?: string;
        projectId?: string;
        costCodeId?: string;
      }>;
    }) => {
      // Validate entry before submission
      const validation = validateJournalEntry({
        entryDate: entry.entryDate,
        description: entry.description,
        lines: entry.lines.map(l => ({
          accountId: l.accountId,
          debitAmount: l.debitAmount,
          creditAmount: l.creditAmount,
          description: l.description,
        })),
      });

      if (!validation.isValid) {
        throw new Error(validation.errors.join('; '));
      }

      // Generate entry number
      const { data: seqData, error: seqError } = await supabase
        .rpc('nextval', { sequence_name: 'journal_entry_number_seq' });

      if (seqError) throw seqError;

      const entryNumber = `JE-${String(seqData).padStart(6, '0')}`;

      // Create journal entry header
      const { data: headerData, error: headerError } = await supabase
        .from('journal_entries')
        .insert({
          company_id: entry.companyId,
          entry_number: entryNumber,
          entry_date: entry.entryDate,
          description: entry.description,
          memo: entry.memo,
          project_id: entry.projectId,
          transaction_status: 'draft',
        })
        .select()
        .single();

      if (headerError) throw headerError;

      // Create journal entry lines
      const lines = entry.lines.map((line, index) => ({
        journal_entry_id: headerData.id,
        company_id: entry.companyId,
        line_number: index + 1,
        account_id: line.accountId,
        debit_amount: line.debitAmount || 0,
        credit_amount: line.creditAmount || 0,
        description: line.description,
        project_id: line.projectId || entry.projectId,
        cost_code_id: line.costCodeId,
      }));

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(lines);

      if (linesError) {
        // Rollback: delete the header
        await supabase.from('journal_entries').delete().eq('id', headerData.id);
        throw linesError;
      }

      return headerData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast.success('Journal entry created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create journal entry: ${error.message}`);
    },
  });
}

export function usePostJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entryId: string) => {
      const { data, error } = await supabase
        .from('journal_entries')
        .update({
          transaction_status: 'posted',
          posting_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', entryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entry'] });
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['account-balances'] });
      toast.success('Journal entry posted successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to post journal entry: ${error.message}`);
    },
  });
}

// =====================================================
// BILLS (ACCOUNTS PAYABLE)
// =====================================================

export function useBills(companyId?: string, filters?: {
  status?: string;
  vendorId?: string;
}) {
  return useQuery({
    queryKey: ['bills', companyId, filters],
    queryFn: async () => {
      let query = supabase
        .from('bills')
        .select(`
          *,
          vendor:vendors(id, name),
          line_items:bill_line_items(
            *,
            expense_account:chart_of_accounts(account_number, account_name)
          )
        `)
        .order('bill_date', { ascending: false });

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.vendorId) {
        query = query.eq('vendor_id', filters.vendorId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

export function useCreateBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bill: {
      companyId: string;
      vendorId: string;
      billDate: string;
      dueDate: string;
      vendorRefNumber?: string;
      lineItems: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        amount: number;
        expenseAccountId: string;
        projectId?: string;
        costCodeId?: string;
      }>;
      memo?: string;
      projectId?: string;
    }) => {
      // Generate bill number
      const { data: seqData, error: seqError } = await supabase
        .rpc('nextval', { sequence_name: 'bill_number_seq' });

      if (seqError) throw seqError;

      const billNumber = `BILL-${String(seqData).padStart(6, '0')}`;

      // Calculate totals
      const subtotal = bill.lineItems.reduce((sum, item) => sum + item.amount, 0);

      // Create bill header
      const { data: billData, error: billError } = await supabase
        .from('bills')
        .insert({
          company_id: bill.companyId,
          bill_number: billNumber,
          vendor_id: bill.vendorId,
          vendor_ref_number: bill.vendorRefNumber,
          bill_date: bill.billDate,
          due_date: bill.dueDate,
          subtotal,
          total_amount: subtotal, // Tax will be added by trigger
          status: 'open',
          project_id: bill.projectId,
          memo: bill.memo,
        })
        .select()
        .single();

      if (billError) throw billError;

      // Create line items
      const lineItems = bill.lineItems.map((item, index) => ({
        bill_id: billData.id,
        company_id: bill.companyId,
        line_number: index + 1,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        amount: item.amount,
        expense_account_id: item.expenseAccountId,
        project_id: item.projectId || bill.projectId,
        cost_code_id: item.costCodeId,
      }));

      const { error: linesError } = await supabase
        .from('bill_line_items')
        .insert(lineItems);

      if (linesError) {
        // Rollback
        await supabase.from('bills').delete().eq('id', billData.id);
        throw linesError;
      }

      return billData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      toast.success('Bill created successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to create bill: ${error.message}`);
    },
  });
}

// =====================================================
// FISCAL PERIODS
// =====================================================

export function useFiscalPeriods(companyId?: string, fiscalYearId?: string) {
  return useQuery({
    queryKey: ['fiscal-periods', companyId, fiscalYearId],
    queryFn: async () => {
      let query = supabase
        .from('fiscal_periods')
        .select('*')
        .order('period_number');

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      if (fiscalYearId) {
        query = query.eq('fiscal_year_id', fiscalYearId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

export function useCurrentFiscalPeriod(companyId?: string) {
  return useQuery({
    queryKey: ['current-fiscal-period', companyId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('fiscal_periods')
        .select('*')
        .eq('company_id', companyId)
        .lte('start_date', today)
        .gte('end_date', today)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

// =====================================================
// ACCOUNT BALANCES
// =====================================================

export function useAccountBalances(companyId?: string, fiscalPeriodId?: string) {
  return useQuery({
    queryKey: ['account-balances', companyId, fiscalPeriodId],
    queryFn: async () => {
      let query = supabase
        .from('account_balances')
        .select(`
          *,
          account:chart_of_accounts(
            account_number,
            account_name,
            account_type,
            account_subtype
          )
        `)
        .order('account(account_number)');

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      if (fiscalPeriodId) {
        query = query.eq('fiscal_period_id', fiscalPeriodId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

// =====================================================
// BANK RECONCILIATION
// =====================================================

export function useBankAccounts(companyId?: string) {
  return useQuery({
    queryKey: ['bank-accounts', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select(`
          *,
          account:chart_of_accounts(account_number, account_name)
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('bank_name');

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

export function useBankTransactions(bankAccountId: string, filters?: {
  startDate?: string;
  endDate?: string;
  reconciled?: boolean;
}) {
  return useQuery({
    queryKey: ['bank-transactions', bankAccountId, filters],
    queryFn: async () => {
      let query = supabase
        .from('bank_transactions')
        .select('*')
        .eq('bank_account_id', bankAccountId)
        .order('transaction_date', { ascending: false });

      if (filters?.startDate) {
        query = query.gte('transaction_date', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('transaction_date', filters.endDate);
      }

      if (filters?.reconciled !== undefined) {
        query = query.eq('is_reconciled', filters.reconciled);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!bankAccountId,
  });
}

// =====================================================
// FINANCIAL REPORTS
// =====================================================

export function useTrialBalance(companyId: string, asOfDate: string) {
  return useQuery({
    queryKey: ['trial-balance', companyId, asOfDate],
    queryFn: async () => {
      // This would typically call a database function or view
      // For now, we'll fetch from account_balances
      const { data, error } = await supabase
        .from('account_balances')
        .select(`
          *,
          account:chart_of_accounts(*)
        `)
        .eq('company_id', companyId);

      if (error) throw error;
      return data;
    },
    enabled: !!companyId && !!asOfDate,
  });
}

// =====================================================
// EXPORT ALL
// =====================================================

export default {
  useChartOfAccounts,
  useAccount,
  useCreateAccount,
  useUpdateAccount,
  useJournalEntries,
  useJournalEntry,
  useCreateJournalEntry,
  usePostJournalEntry,
  useBills,
  useCreateBill,
  useFiscalPeriods,
  useCurrentFiscalPeriod,
  useAccountBalances,
  useBankAccounts,
  useBankTransactions,
  useTrialBalance,
};
