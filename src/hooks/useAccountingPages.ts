/**
 * Reads and writes behind the four ledger pages: /finance/chart-of-accounts,
 * /finance/journal-entries, /finance/accounts-payable and
 * /finance/bill-payments (US-266).
 *
 * The pages took their company from user.user_metadata.company_id, which the
 * signup paths do not set, so for most users every query was disabled and the
 * pages showed empty tables with working Create buttons. They read
 * userProfile.company_id through these hooks now, and each hook reports a
 * load error instead of rendering "no rows".
 *
 * Bill payments were written from the page: the application insert was not
 * read back, so a payment whose applications RLS dropped reported success and
 * the bills kept their balance.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { vendorsKey } from '@/hooks/useVendors';
import {
  useBills,
  useChartOfAccounts,
  useCreateAccount,
  useCreateBill,
  useCreateJournalEntry,
  useJournalEntries,
  usePostJournalEntry,
  useUpdateAccount,
} from '@/hooks/useAccounting';

export const NO_COMPANY_MESSAGE = 'Your profile is not linked to a company, so there is nowhere to save this.';

function useCompanyId(): string | undefined {
  const { userProfile } = useAuth();
  return userProfile?.company_id ?? undefined;
}

/** The first error among the page's reads, for ErrorState. */
function firstError(...errors: Array<unknown>): Error | null {
  const found = errors.find(Boolean);
  if (!found) return null;
  return found instanceof Error ? found : new Error(String((found as { message?: unknown }).message ?? found));
}

// ---------------------------------------------------------------------------
// Vendors (picker)
// ---------------------------------------------------------------------------

export interface PayablesVendor {
  id: string;
  name: string;
}

/** Under the vendors prefix, so a vendor added on /vendors refreshes the pickers. */
export const payablesVendorsKey = (companyId: string | undefined) =>
  [...vendorsKey(companyId), 'payables'] as const;

export async function fetchPayablesVendors(companyId: string): Promise<PayablesVendor[]> {
  const { data, error } = await supabase
    .from('vendors')
    .select('id, name')
    .eq('company_id', companyId)
    .order('name');
  if (error) throw error;
  return (data ?? []) as PayablesVendor[];
}

function usePayablesVendors(companyId: string | undefined) {
  return useQuery({
    queryKey: payablesVendorsKey(companyId),
    queryFn: () => fetchPayablesVendors(companyId as string),
    enabled: !!companyId,
  });
}

// ---------------------------------------------------------------------------
// Chart of accounts
// ---------------------------------------------------------------------------

export function useChartOfAccountsPage() {
  const companyId = useCompanyId();
  const accounts = useChartOfAccounts(companyId);
  const create = useCreateAccount(companyId);
  const update = useUpdateAccount(companyId);
  return { companyId, accounts, create, update, loadError: firstError(accounts.error) };
}

// ---------------------------------------------------------------------------
// Journal entries
// ---------------------------------------------------------------------------

export function useJournalEntriesPage(status?: string) {
  const companyId = useCompanyId();
  const entries = useJournalEntries(companyId, { status });
  const accounts = useChartOfAccounts(companyId);
  const create = useCreateJournalEntry();
  const post = usePostJournalEntry(companyId);
  return { companyId, entries, accounts, create, post, loadError: firstError(entries.error, accounts.error) };
}

// ---------------------------------------------------------------------------
// Accounts payable
// ---------------------------------------------------------------------------

export function useAccountsPayablePage(status?: string) {
  const companyId = useCompanyId();
  const bills = useBills(companyId, { status });
  const accounts = useChartOfAccounts(companyId);
  const vendors = usePayablesVendors(companyId);
  const create = useCreateBill();
  return {
    companyId,
    bills,
    accounts,
    vendors,
    create,
    loadError: firstError(bills.error, accounts.error, vendors.error),
  };
}

// ---------------------------------------------------------------------------
// Bill payments
// ---------------------------------------------------------------------------

export interface BillPaymentApplicationInput {
  billId: string;
  amountToPay: number;
}

export interface NewBillPayment {
  vendorId: string | undefined;
  paymentDate: string;
  paymentMethod: string;
  bankAccountId: string;
  checkNumber: string;
  referenceNumber: string;
  memo: string;
  totalAmount: number;
  applications: BillPaymentApplicationInput[];
}

export const billPaymentsKey = (companyId: string | undefined) => ['bill-payments', companyId] as const;

export async function fetchBillPayments(companyId: string) {
  const { data, error } = await supabase
    .from('bill_payments')
    .select(`
      *,
      vendor:vendors(name),
      applications:bill_payment_applications(
        amount_applied,
        bill:bills(bill_number)
      )
    `)
    .eq('company_id', companyId)
    .order('payment_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createBillPayment(companyId: string, p: NewBillPayment): Promise<{ id: string }> {
  // payment_number is assigned by the set_bill_payment_number trigger
  // (US-310). This used to be `rpc('nextval', { sequence_name: ... })`,
  // which is pg_catalog.nextval(regclass): wrong schema for PostgREST to
  // expose and wrong argument shape, so it could never resolve and no bill
  // payment had ever been recorded.
  const { data: payment, error: paymentError } = await supabase
    .from('bill_payments')
    .insert({
      company_id: companyId,
      payment_date: p.paymentDate,
      vendor_id: p.vendorId,
      total_amount: p.totalAmount,
      payment_method: p.paymentMethod,
      check_number: p.checkNumber,
      reference_number: p.referenceNumber,
      bank_account_id: p.bankAccountId,
      memo: p.memo,
    } as never)
    .select()
    .single();
  if (paymentError) throw paymentError;
  if (!payment) throw new Error('The payment was not recorded.');

  const applications = p.applications.map((app) => ({
    bill_payment_id: payment.id,
    bill_id: app.billId,
    company_id: companyId,
    amount_applied: app.amountToPay,
  }));

  const { data: applied, error: appsError } = await supabase
    .from('bill_payment_applications')
    .insert(applications)
    .select('id');
  if (appsError) throw appsError;
  if ((applied?.length ?? 0) !== applications.length) {
    throw new Error(
      `Payment ${payment.id} was recorded but only ${applied?.length ?? 0} of ${applications.length} bill applications were saved. ` +
        'The bills still show their old balance and the payment must be reconciled by hand.',
    );
  }

  // apply_bill_payment does the read-modify-write of amount_paid inside one
  // UPDATE under the row lock (US-310). The old client-side fallback read
  // amount_paid off the loaded bill, so two payments at once lost one.
  for (const app of p.applications) {
    const { error: updateError } = await supabase.rpc('apply_bill_payment', {
      p_bill_id: app.billId,
      p_amount: app.amountToPay,
    });
    if (updateError) {
      throw new Error(
        `Payment recorded but bill ${app.billId} could not be updated (${updateError.message}). ` +
          `The bill still shows the old balance and must be reconciled by hand.`,
      );
    }
  }

  return payment as { id: string };
}

export function useBillPaymentsPage() {
  const companyId = useCompanyId();
  const queryClient = useQueryClient();
  const bills = useBills(companyId, { status: 'open' });
  const accounts = useChartOfAccounts(companyId);
  const vendors = usePayablesVendors(companyId);
  const payments = useQuery({
    queryKey: billPaymentsKey(companyId),
    queryFn: () => fetchBillPayments(companyId as string),
    enabled: !!companyId,
  });

  const create = useMutation({
    mutationFn: (p: NewBillPayment) => {
      if (!companyId) throw new Error(NO_COMPANY_MESSAGE);
      return createBillPayment(companyId, p);
    },
    // Settled, not success: a payment can land and a later step fail, and
    // the page has to show what is actually in the ledger either way.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['bills', companyId] });
      void queryClient.invalidateQueries({ queryKey: billPaymentsKey(companyId) });
      void queryClient.invalidateQueries({ queryKey: ['chart-of-accounts', companyId] });
    },
  });

  return {
    companyId,
    bills,
    accounts,
    vendors,
    payments,
    create,
    loadError: firstError(bills.error, accounts.error, vendors.error, payments.error),
  };
}
