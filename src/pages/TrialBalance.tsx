import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ErrorState, NoLedgerActivity } from '@/components/ui/EmptyStates';
import { useLedgerActivity, useLedgerPostingEnabled } from '@/hooks/useAccounting';
import {
  fiscalYearStartFor,
  trialBalanceAsAt,
  type LedgerActivityRow,
  type TrialBalanceRow,
} from '@/lib/ledgerReporting';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ClipboardList, Download, Printer, CheckCircle, AlertCircle } from 'lucide-react';
import { formatCurrency, getAccountTypeLabel, type AccountType } from '@/utils/accountingUtils';
import { downloadCsv } from '@/lib/exportCsv';
import { trialBalanceCsv, statementFilename } from '@/lib/statementCsv';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/format';

const LONG_DATE: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };

const ACCOUNT_ORDER: AccountType[] = [
  'asset',
  'liability',
  'equity',
  'revenue',
  'cost_of_goods_sold',
  'expense',
  'other_income',
  'other_expense',
];

export default function TrialBalance() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const companyId = user?.user_metadata?.company_id;

  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

  // Posted ledger lines up to the as-at date (US-334). This used to sum
  // chart_of_accounts.current_balance, which has no date, and take Math.abs of
  // each one - so the as-at input did nothing and a contra account was added
  // to the side it should have reduced.
  const { data: activity, isLoading, isError, refetch } = useLedgerActivity(companyId, asOfDate);
  const { data: postingEnabled } = useLedgerPostingEnabled(companyId);

  const tb = trialBalanceAsAt(
    (activity ?? []) as LedgerActivityRow[],
    asOfDate,
    fiscalYearStartFor(asOfDate)
  );
  const difference = Math.abs(tb.totalDebits - tb.totalCredits);

  const rowsByType = tb.rows.reduce<Record<string, TrialBalanceRow[]>>((acc, row) => {
    (acc[row.account_type] ??= []).push(row);
    return acc;
  }, {});

  const handlePrint = () => {
    window.print();
  };

  // Same rows, same debit/credit split the table renders.
  const handleExport = () => {
    const rows = ACCOUNT_ORDER.flatMap((type) =>
      (rowsByType[type] ?? []).map((row) => ({
        account_number: row.account_number,
        account_name: row.account_name,
        account_type: row.account_type,
        account_subtype: row.account_subtype,
        debit: row.debit || null,
        credit: row.credit || null,
      })));
    downloadCsv(
      statementFilename('trial-balance', asOfDate),
      trialBalanceCsv(rows, { debits: tb.totalDebits, credits: tb.totalCredits })
    );
  };

  return (
    <main className="container mx-auto py-6 space-y-6" role="main" aria-label="Trial Balance">
      {postingEnabled === false && (
        <Alert>
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>
            Brikly is not posting to a ledger for this company, so this trial balance
            reflects only journal entries entered by hand - your books are in
            QuickBooks. An admin can turn on ledger posting from the{' '}
            <Link to="/finance/general-ledger" className="underline">General Ledger</Link> page.
          </AlertDescription>
        </Alert>
      )}
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-8 w-8" aria-hidden="true" />
            Trial Balance
          </h1>
          <p className="text-muted-foreground mt-1">
            Every account&apos;s posted balance, debits against credits
          </p>
        </div>

        <div className="flex gap-2" role="toolbar" aria-label="Report actions">
          <Button variant="outline" onClick={handlePrint} aria-label="Print trial balance">
            <Printer className="mr-2 h-4 w-4" aria-hidden="true" />
            Print
          </Button>
          <Button variant="outline" onClick={handleExport} aria-label="Export trial balance">
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            Export
          </Button>
        </div>
      </header>

      {/* Filters */}
      <section aria-label="Report filters">
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="asOfDate">As of Date</Label>
                <Input
                  id="asOfDate"
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="w-[200px]"
                  aria-label="Select date for trial balance"
                />
              </div>

              {/* Balance status: only once the ledger has loaded, so a failed
                  read never shows as "Balanced" on zero totals. */}
              {!isLoading && !isError && tb.rows.length > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                {tb.isBalanced ? (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg" role="status" aria-live="polite">
                    <CheckCircle className="h-5 w-5" aria-hidden="true" />
                    <span className="font-semibold">Balanced</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg" role="alert">
                    <AlertCircle className="h-5 w-5" aria-hidden="true" />
                    <span className="font-semibold">
                      Out of Balance: {formatCurrency(difference)}
                    </span>
                  </div>
                )}
              </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {isError ? (
        <ErrorState
          title="The trial balance did not load"
          description="We could not read your ledger, so no figures are shown rather than showing zeros. Try again, or contact support if it keeps failing."
          onRetry={() => { void refetch(); }}
        />
      ) : !isLoading && tb.rows.length === 0 ? (
        <NoLedgerActivity
          title="Nothing is posted to this date"
          description="The trial balance lists posted ledger balances. Record a journal entry, or turn on ledger posting from the General Ledger page to post invoices, bills and expenses automatically."
          onCreate={() => navigate('/finance/journal-entries')}
        />
      ) : (
      <>
      {/* Trial Balance */}
      <section aria-label="Trial balance report">
        <Card>
          <CardHeader>
            <CardTitle>Trial Balance</CardTitle>
            <CardDescription>
              As of {formatDate(`${asOfDate}T00:00:00`, LONG_DATE)}. Balance-sheet accounts from the start of the ledger; income and
              expense accounts for the fiscal year to date.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-8" />)}</div>
            ) : (
              <Table aria-label="Trial Balance">
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Account Number</TableHead>
                    <TableHead scope="col">Account Name</TableHead>
                    <TableHead scope="col">Type</TableHead>
                    <TableHead scope="col" className="text-right">Debit</TableHead>
                    <TableHead scope="col" className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {ACCOUNT_ORDER.map((type) => {
                  const typeRows = rowsByType[type] ?? [];
                  if (typeRows.length === 0) return null;

                  const subtotalDebit = typeRows.reduce((sum, r) => sum + r.debit, 0);
                  const subtotalCredit = typeRows.reduce((sum, r) => sum + r.credit, 0);

                  return (
                    <React.Fragment key={type}>
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={5} className="font-semibold">
                          {getAccountTypeLabel(type)}
                        </TableCell>
                      </TableRow>

                      {typeRows.map((row) => (
                        <TableRow key={row.account_id}>
                          <TableCell className="font-mono">{row.account_number}</TableCell>
                          <TableCell>{row.account_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {(row.account_subtype ?? '').replace(/_/g, ' ')}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {row.debit ? formatCurrency(row.debit) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {row.credit ? formatCurrency(row.credit) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}

                      <TableRow className="font-semibold bg-muted/30">
                        <TableCell colSpan={3} className="text-right">
                          Total {getAccountTypeLabel(type)}
                        </TableCell>
                        <TableCell className="text-right font-mono border-t">
                          {subtotalDebit ? formatCurrency(subtotalDebit) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono border-t">
                          {subtotalCredit ? formatCurrency(subtotalCredit) : '-'}
                        </TableCell>
                      </TableRow>

                      <TableRow>
                        <TableCell colSpan={5} className="h-2"></TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })}

                <TableRow className="bg-primary/10 font-bold text-lg">
                  <TableCell colSpan={3}>TOTAL</TableCell>
                  <TableCell className="text-right font-mono border-t-4 border-double">
                    {formatCurrency(tb.totalDebits)}
                  </TableCell>
                  <TableCell className="text-right font-mono border-t-4 border-double">
                    {formatCurrency(tb.totalCredits)}
                  </TableCell>
                </TableRow>

                {!tb.isBalanced && (
                  <TableRow className="bg-red-50 font-semibold" role="row" aria-label="Out of balance warning">
                    <TableCell colSpan={3} className="text-red-800">
                      DIFFERENCE (OUT OF BALANCE)
                    </TableCell>
                    <TableCell
                      colSpan={2}
                      className="text-right font-mono text-red-800"
                    >
                      {formatCurrency(difference)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      </section>

      {/* Summary */}
      <section aria-label="Trial balance summary">
        <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Debits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(tb.totalDebits)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(tb.totalCredits)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Difference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${tb.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(difference)}
            </div>
            <p className="text-xs text-muted-foreground">
              {tb.isBalanced ? 'In balance' : 'Out of balance'}
            </p>
          </CardContent>
        </Card>
        </div>
      </section>
      </>
      )}
    </main>
  );
}
