import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useChartOfAccounts, useLedgerActivity, useLedgerLines } from '@/hooks/useAccounting';
import {
  accountRegister,
  openingBalance,
  type AccountType,
  type LedgerActivityRow,
  type RegisterLine,
} from '@/lib/ledgerReporting';
import { sourceLabel } from '@/lib/ledgerPostingRules';
import { LedgerPostingPanel } from '@/components/financial/LedgerPostingPanel';
import { formatDate } from '@/lib/format';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { VirtualizedTable } from '@/components/ui/virtual-table';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Printer, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/utils/accountingUtils';
import { downloadCsv } from '@/lib/exportCsv';
import { generalLedgerCsv, statementFilename } from '@/lib/statementCsv';
import { Separator } from '@/components/ui/separator';
import { ErrorState, NoLedgerActivity } from '@/components/ui/EmptyStates';
import { Skeleton } from '@/components/ui/skeleton';

const MONTH: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long' };

/** A calendar date from the ledger, shown without a timezone shift. */
const showDate = (date: string, options?: Intl.DateTimeFormatOptions) =>
  formatDate(`${date}T00:00:00`, options);

interface MonthGroup {
  label: string;
  transactions: RegisterLine[];
}

export default function GeneralLedger() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const companyId = userProfile?.company_id ?? undefined;

  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [groupBy, setGroupBy] = useState<'month' | 'none'>('month');

  // Fetch accounts
  const {
    data: accounts,
    isLoading: accountsLoading,
    isError: accountsError,
    refetch: refetchAccounts,
  } = useChartOfAccounts(companyId);

  // Posted lines on the account within the period (US-334). The old query
  // filtered the embedded entry by date without !inner, which PostgREST
  // applies to the embed and not the rows, and it started the running balance
  // at zero, so a bank account's March "ending balance" was March's movement.
  const {
    data: transactions,
    isLoading: transactionsLoading,
    isError: transactionsError,
    refetch: refetchTransactions,
  } = useLedgerLines(companyId, selectedAccountId || undefined, startDate, endDate);

  // Everything before the period, for the balance brought forward.
  const {
    data: priorActivity,
    isLoading: priorLoading,
    isError: priorError,
    refetch: refetchPrior,
  } = useLedgerActivity(selectedAccountId ? companyId : undefined, startDate);

  // Get selected account details
  const selectedAccount = accounts?.find(a => a.id === selectedAccountId);

  const broughtForward = selectedAccountId
    ? openingBalance((priorActivity ?? []) as LedgerActivityRow[], selectedAccountId, startDate)
    : 0;
  const register = accountRegister(
    transactions ?? [],
    (selectedAccount?.account_type ?? 'asset') as AccountType,
    broughtForward
  );
  const transactionsWithBalance = register.lines;

  // Group transactions by month if needed
  const groupedTransactions = groupBy === 'month' && transactionsWithBalance
    ? transactionsWithBalance.reduce<Record<string, MonthGroup>>((acc, tx) => {
        const monthKey = tx.entry_date.slice(0, 7);
        const monthLabel = showDate(`${monthKey}-01`, MONTH);

        if (!acc[monthKey]) {
          acc[monthKey] = {
            label: monthLabel,
            transactions: [],
          };
        }
        acc[monthKey].transactions.push(tx);
        return acc;
      }, {})
    : null;

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const rows = [
      {
        entry_date: startDate,
        entry_number: '',
        description: 'Balance brought forward',
        debit: 0,
        credit: 0,
        runningBalance: broughtForward,
      },
      ...transactionsWithBalance.map((tx) => ({
        entry_date: tx.entry_date,
        entry_number: tx.entry_number,
        description: [sourceLabel(tx.reference_type), tx.description, tx.line_description !== tx.description ? tx.line_description : null]
          .filter(Boolean).join(' - '),
        debit: tx.debit,
        credit: tx.credit,
        runningBalance: tx.runningBalance,
      })),
    ];
    const stem = `general-ledger-${selectedAccount?.account_number ?? 'account'}`;
    downloadCsv(statementFilename(stem, startDate, endDate), generalLedgerCsv(rows));
  };

  const isLoading = accountsLoading || transactionsLoading || priorLoading;
  const isError = accountsError || transactionsError || priorError;
  const retry = () => {
    if (accountsError) return refetchAccounts();
    if (priorError) return refetchPrior();
    return refetchTransactions();
  };

  const totalDebits = register.totalDebits;
  const totalCredits = register.totalCredits;
  const endingBalance = register.closingBalance;

  return (
    <main className="container mx-auto py-6 space-y-6" role="main" aria-label="General Ledger">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8" aria-hidden="true" />
            General Ledger
          </h1>
          <p className="text-muted-foreground mt-1">
            View all transactions for any account
          </p>
        </div>

        <div className="flex gap-2" role="toolbar" aria-label="Report actions">
          <Button variant="outline" onClick={handlePrint} disabled={!selectedAccountId} aria-label="Print general ledger">
            <Printer className="mr-2 h-4 w-4" aria-hidden="true" />
            Print
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={!selectedAccountId} aria-label="Export general ledger">
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            Export
          </Button>
        </div>
      </header>

      <section aria-label="Ledger posting">
        <LedgerPostingPanel companyId={companyId} />
      </section>

      {/* Filters */}
      <section aria-label="Ledger filters">
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="account">Account</Label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger aria-label="Select an account to view">
                    <SelectValue placeholder="Select an account" />
                  </SelectTrigger>
                <SelectContent>
                  {accounts?.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_number} - {account.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  aria-label="Select start date for transactions"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  aria-label="Select end date for transactions"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <div className="space-y-2">
                <Label htmlFor="groupBy">Group By</Label>
                <Select value={groupBy} onValueChange={(value: 'month' | 'none') => setGroupBy(value)}>
                  <SelectTrigger className="w-[180px]" aria-label="Select grouping option">
                    <SelectValue />
                  </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (All Transactions)</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

              {selectedAccount && (
                <div className="ml-auto">
                  <Badge variant="outline" className="text-sm" aria-label={`Account type: ${selectedAccount.account_type.replace(/_/g, ' ')}, subtype: ${selectedAccount.account_subtype.replace(/_/g, ' ')}`}>
                    {selectedAccount.account_type.replace(/_/g, ' ')} - {selectedAccount.account_subtype.replace(/_/g, ' ')}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {isError ? (
        <ErrorState
          title="The general ledger did not load"
          description="We could not read your ledger, so no figures are shown rather than showing zeros. Try again, or contact support if it keeps failing."
          onRetry={() => { void retry(); }}
        />
      ) : accounts && accounts.length === 0 ? (
        <NoLedgerActivity
          title="No chart of accounts yet"
          description="Set up your chart of accounts before running this report."
          actionLabel="Set Up Chart of Accounts"
          onCreate={() => navigate('/finance/chart-of-accounts')}
        />
      ) : (
      <>
      {/* Account Summary */}
      {selectedAccount && (
        <section aria-label="Account summary">
          <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Account</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">
                {selectedAccount.account_number}
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedAccount.account_name}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Debits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalDebits)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalCredits)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ending Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(endingBalance)}</div>
              <p className="text-xs text-muted-foreground">
                As of {endDate}; brought forward {formatCurrency(broughtForward)}
              </p>
            </CardContent>
          </Card>
          </div>
        </section>
      )}

      {/* Transactions */}
      <section aria-label="Account transactions">
        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>
              {selectedAccount
                ? `Showing transactions for ${selectedAccount.account_number} - ${selectedAccount.account_name}`
                : 'Select an account to view transactions'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedAccountId ? (
              <div className="text-center py-8 text-muted-foreground" role="status">
                Please select an account to view its general ledger
              </div>
            ) : isLoading ? (
              <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-8" />)}</div>
            ) : transactionsWithBalance && transactionsWithBalance.length > 0 ? (
            <div className="space-y-6">
              {groupBy === 'month' && groupedTransactions ? (
                // Grouped by month
                Object.entries(groupedTransactions).map(([monthKey, monthData]: [string, MonthGroup]) => (
                  <div key={monthKey} className="space-y-2" role="region" aria-label={`Transactions for ${monthData.label}`}>
                    <div className="flex items-center gap-2 sticky top-0 bg-background py-2">
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      <h3 className="font-semibold">{monthData.label}</h3>
                    </div>

                    <Table aria-label={`${monthData.label} transactions`}>
                      <TableHeader>
                        <TableRow>
                          <TableHead scope="col">Date</TableHead>
                          <TableHead scope="col">Entry #</TableHead>
                          <TableHead scope="col">Description</TableHead>
                          <TableHead scope="col" className="text-right">Debit</TableHead>
                          <TableHead scope="col" className="text-right">Credit</TableHead>
                          <TableHead scope="col" className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthData.transactions.map((tx: RegisterLine) => (
                          <TableRow key={tx.id}>
                            <TableCell>
                              {showDate(tx.entry_date)}
                            </TableCell>
                            <TableCell className="font-mono">
                              {tx.entry_number}
                            </TableCell>
                            <TableCell>
                              <div>{tx.description}</div>
                              <div className="text-sm text-muted-foreground">
                                {sourceLabel(tx.reference_type)}
                                {tx.line_description && tx.line_description !== tx.description ? ` - ${tx.line_description}` : ''}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {tx.debit > 0 ? formatCurrency(tx.debit) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {tx.credit > 0 ? formatCurrency(tx.credit) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold">
                              {formatCurrency(tx.runningBalance)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    <Separator className="my-4" />
                  </div>
                ))
              ) : (
                // All transactions
                <VirtualizedTable
                  aria-label="All transactions"
                  rows={transactionsWithBalance}
                  getRowKey={(tx: RegisterLine) => tx.id}
                  columnCount={6}
                  estimateRowHeight={53}
                  header={
                    <>
                      <TableHead scope="col">Date</TableHead>
                      <TableHead scope="col">Entry #</TableHead>
                      <TableHead scope="col">Description</TableHead>
                      <TableHead scope="col" className="text-right">Debit</TableHead>
                      <TableHead scope="col" className="text-right">Credit</TableHead>
                      <TableHead scope="col" className="text-right">Balance</TableHead>
                    </>
                  }
                  renderCells={(tx: RegisterLine) => (
                      <>
                        <TableCell>
                          {showDate(tx.entry_date)}
                        </TableCell>
                        <TableCell className="font-mono">
                          {tx.entry_number}
                        </TableCell>
                        <TableCell>
                          <div>{tx.description}</div>
                          <div className="text-sm text-muted-foreground">
                            {sourceLabel(tx.reference_type)}
                            {tx.line_description && tx.line_description !== tx.description ? ` - ${tx.line_description}` : ''}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {tx.debit > 0 ? formatCurrency(tx.debit) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {tx.credit > 0 ? formatCurrency(tx.credit) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatCurrency(tx.runningBalance)}
                        </TableCell>
                      </>
                  )}
                  footerRowCount={1}
                  footer={
                    // Totals stay outside the virtual window so they are always in the DOM.
                    <TableRow className="bg-muted/50 font-bold" aria-rowindex={transactionsWithBalance.length + 2}>
                      <TableCell colSpan={3} className="text-right">
                        TOTALS
                      </TableCell>
                      <TableCell className="text-right font-mono border-t-2">
                        {formatCurrency(totalDebits)}
                      </TableCell>
                      <TableCell className="text-right font-mono border-t-2">
                        {formatCurrency(totalCredits)}
                      </TableCell>
                      <TableCell className="text-right font-mono border-t-2">
                        {formatCurrency(endingBalance)}
                      </TableCell>
                    </TableRow>
                  }
                />
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground" role="status">
              No transactions found for the selected date range
            </div>
          )}
        </CardContent>
      </Card>
      </section>
      </>
      )}
    </main>
  );
}
