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
import { validateJournalEntry } from '@/utils/accountingUtils';

// =====================================================
// CHART OF ACCOUNTS
// =====================================================

export function useChartOfAccounts(companyId?: string) {
    return useQuery({
    queryKey: ['chart-of-accounts', companyId],
    queryFn: async () => {
            let query = supabase
        .from('chart_of_accounts')
        .select('*')
          // CRITICAL: Site isolation
        .eq('is_active', true)
        .order('account_number');

      if (companyId) {
        query = query.eq('company_id', companyId);
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
          // CRITICAL: Site isolation
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
    mutationFn: async (accountData: Record<string, unknown>) => {
            const { data, error } = await supabase
        .from('chart_of_accounts')
        .insert({
          ...accountData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      toast.success('Account created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create account: ${error.message}`);
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
    return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
            const { data, error } = await supabase
        .from('chart_of_accounts')
        .update(updates)
        .eq('id', id)
          // CRITICAL: Site isolation
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
    onError: (error: Error) => {
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
          // CRITICAL: Site isolation
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
          // CRITICAL: Site isolation
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

      // entry_number is assigned by the set_journal_entry_number trigger
      // (US-310). This used to be `rpc('nextval', { sequence_name: ... })`,
      // which is pg_catalog.nextval(regclass): wrong schema for PostgREST to
      // expose and wrong argument shape, so it could never resolve and the
      // `throw seqError` on the next line meant no journal entry has ever been
      // created. Assigning in a BEFORE INSERT trigger is also atomic with the
      // insert, which a client-side read of the sequence is not.
      const { data: headerData, error: headerError } = await supabase
        .from('journal_entries')
        .insert({
          company_id: entry.companyId,
          entry_date: entry.entryDate,
          description: entry.description,
          memo: entry.memo,
          project_id: entry.projectId,
          transaction_status: 'draft',
        })
        .select()
        .single();

      if (headerError) throw headerError;

      // Create journal entry lines with site isolation
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
        // Rollback: delete the header. Read the rollback's own error - a
        // failed rollback leaves a journal entry header with no lines, which
        // is an unbalanced entry sitting in the ledger, and supabase-js
        // returns that error rather than throwing it.
        const { error: rollbackError } = await supabase
          .from('journal_entries')
          .delete()
          .eq('id', headerData.id);
        if (rollbackError) {
          throw new Error(
            `Journal entry lines failed (${linesError.message}) and the header could not be rolled back ` +
              `(${rollbackError.message}). Entry ${headerData.id} is in the ledger with no lines and must be removed by hand.`,
          );
        }
        throw linesError;
      }

      return headerData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast.success('Journal entry created successfully');
    },
    onError: (error: Error) => {
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
          // CRITICAL: Site isolation
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
    onError: (error: Error) => {
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
          // CRITICAL: Site isolation
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
      // bill_number is assigned by the set_bill_number trigger (US-310); see
      // the journal entry mutation above for why the nextval RPC could not work.

      // Calculate totals
      const subtotal = bill.lineItems.reduce((sum, item) => sum + item.amount, 0);

      // Create bill header with site isolation
      const { data: billData, error: billError } = await supabase
        .from('bills')
        .insert({
          company_id: bill.companyId,
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

      // Create line items with site isolation
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
        // Rollback. As above: a failed rollback leaves a bill with no line
        // items, which will not reconcile against anything.
        const { error: rollbackError } = await supabase
          .from('bills')
          .delete()
          .eq('id', billData.id);
        if (rollbackError) {
          throw new Error(
            `Bill line items failed (${linesError.message}) and the bill could not be rolled back ` +
              `(${rollbackError.message}). Bill ${billData.id} exists with no line items and must be removed by hand.`,
          );
        }
        throw linesError;
      }

      return billData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      toast.success('Bill created successfully');
    },
    onError: (error: Error) => {
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
          // CRITICAL: Site isolation
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
          // CRITICAL: Site isolation
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
          // CRITICAL: Site isolation
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
          // CRITICAL: Site isolation
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
          // CRITICAL: Site isolation
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
          // CRITICAL: Site isolation
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

// =====================================================
// LEDGER ACTIVITY (US-334)
// =====================================================

/** PostgREST returns at most 1000 rows per request unless asked for a range. */
const LEDGER_PAGE_SIZE = 1000;

/**
 * Read every page of a query. A statement built from the first 1000 rows of
 * the ledger is wrong without any error, which is worse than failing.
 */
async function readAllPages<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += LEDGER_PAGE_SIZE) {
    const { data, error } = await page(from, from + LEDGER_PAGE_SIZE - 1);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < LEDGER_PAGE_SIZE) return out;
  }
}

/**
 * Posted ledger movement, per account per day.
 *
 * The statements used to sum chart_of_accounts.current_balance, a running
 * total with no date on it, so their date-range inputs were never used in any
 * query and a P&L for March returned the same figures as one for last year.
 * This is what a statement for a period should read.
 *
 * Fetched for a wide window rather than the exact range because a balance
 * sheet needs everything up to its as-at date and a P&L needs only the period;
 * both come from the same rows, filtered in ledgerReporting. Every page is
 * read: the view has a row per account per day per project, so a busy
 * company passes 1000 rows in its first year.
 */
export function useLedgerActivity(companyId?: string, throughDate?: string) {
  return useQuery({
    queryKey: ['ledger-activity', companyId, throughDate],
    queryFn: () =>
      readAllPages((from, to) => {
        let query = supabase
          .from('ledger_account_activity')
          .select('account_id, account_number, account_name, account_type, account_subtype, normal_balance, entry_date, net_change, debits, credits')
          .eq('company_id', companyId as string)
          .order('account_number')
          .order('entry_date')
          .order('project_id', { nullsFirst: true });

        if (throughDate) query = query.lte('entry_date', throughDate);
        return query.range(from, to);
      }),
    enabled: !!companyId,
  });
}

/** One posted journal line with its entry, as the general ledger lists it. */
interface PostedLineRow {
  id: string;
  debit_amount: number | string | null;
  credit_amount: number | string | null;
  description: string | null;
  journal_entries: {
    entry_date: string;
    entry_number: string;
    description: string | null;
    reference_type: string | null;
  } | null;
}

/**
 * Posted lines on one account within a period (US-334).
 *
 * The page used to filter the embedded entry by date without !inner, which
 * PostgREST applies to the embed rather than the rows: every line on the
 * account came back, with a null entry for the ones outside the range, and
 * only the first 1000 of them.
 */
export function useLedgerLines(companyId?: string, accountId?: string, from?: string, to?: string) {
  return useQuery({
    queryKey: ['ledger-lines', companyId, accountId, from, to],
    queryFn: async () => {
      const rows = await readAllPages<PostedLineRow>((start, end) =>
        supabase
          .from('journal_entry_lines')
          .select('id, debit_amount, credit_amount, description, journal_entries!inner(entry_date, entry_number, description, reference_type, transaction_status)')
          .eq('company_id', companyId as string)
          .eq('account_id', accountId as string)
          .eq('journal_entries.transaction_status', 'posted')
          .gte('journal_entries.entry_date', from as string)
          .lte('journal_entries.entry_date', to as string)
          .order('id')
          .range(start, end) as unknown as PromiseLike<{ data: PostedLineRow[] | null; error: unknown }>
      );
      return rows
        .filter((r) => r.journal_entries)
        .map((r) => ({
          id: r.id,
          entry_date: r.journal_entries!.entry_date,
          entry_number: r.journal_entries!.entry_number,
          description: r.journal_entries!.description,
          line_description: r.description,
          reference_type: r.journal_entries!.reference_type,
          debit: Number(r.debit_amount) || 0,
          credit: Number(r.credit_amount) || 0,
        }));
    },
    enabled: !!companyId && !!accountId && !!from && !!to,
  });
}

/** Whether this company has Brikly keeping its books, or QuickBooks (US-334). */
export function useLedgerPostingEnabled(companyId?: string) {
  return useQuery({
    queryKey: ['ledger-posting-enabled', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_settings')
        .select('auto_post_to_ledger')
        .eq('company_id', companyId as string)
        .maybeSingle();
      if (error) throw error;
      return Boolean(data?.auto_post_to_ledger);
    },
    enabled: !!companyId,
  });
}

// set_ledger_posting comes from 20260924180000 and is not in the generated
// types until that migration is applied and `npm run db:types` is re-run.
type UntypedRpc = (
  fn: string,
  args: Record<string, unknown>
) => PromiseLike<{ data: unknown; error: { message: string } | null }>;

/**
 * Turn Brikly's ledger on or off for the company (US-334 AC3). The database
 * allows only admin and accounting users and writes the audit log.
 */
export function useSetLedgerPosting(companyId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await (supabase.rpc as unknown as UntypedRpc)('set_ledger_posting', {
        p_company_id: companyId,
        p_enabled: enabled,
      });
      if (error) throw error;
      return enabled;
    },
    onSuccess: (enabled) => {
      queryClient.invalidateQueries({ queryKey: ['ledger-posting-enabled', companyId] });
      toast.success(enabled
        ? 'Ledger posting is on. New invoices, payments, bills, expenses and approved time now post.'
        : 'Ledger posting is off. Nothing new will post; entries already posted stay.');
    },
    onError: (error: Error) => {
      toast.error(`Ledger posting was not changed: ${error.message}`);
    },
  });
}

/**
 * Post the company's unposted history from a date (US-334 AC4). Safe to run
 * again: a second run posts nothing.
 */
export function useBackfillLedger(companyId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fromDate: string) => {
      const { data, error } = await supabase.rpc('backfill_ledger', {
        p_company_id: companyId as string,
        p_from_date: fromDate,
      });
      if (error) throw error;
      return data ?? [];
    },
    onSuccess: (rows) => {
      queryClient.invalidateQueries({ queryKey: ['ledger-activity'] });
      queryClient.invalidateQueries({ queryKey: ['ledger-lines'] });
      const posted = rows.reduce((s, r) => s + (r.posted ?? 0), 0);
      const skipped = rows.reduce((s, r) => s + (r.skipped ?? 0), 0);
      toast.success(
        `Posted ${posted} document${posted === 1 ? '' : 's'} to the ledger` +
        (skipped > 0 ? `; ${skipped} could not be posted (an account is missing or a bill has no lines).` : '.')
      );
    },
    onError: (error: Error) => {
      toast.error(`History was not posted: ${error.message}`);
    },
  });
}
