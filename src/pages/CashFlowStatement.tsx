import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ErrorState, NoLedgerActivity } from '@/components/ui/EmptyStates';
import { useLedgerActivity, useLedgerPostingEnabled } from '@/hooks/useAccounting';
import { cashFlowStatement, type CashFlowLine, type LedgerActivityRow } from '@/lib/ledgerReporting';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { ArrowRightLeft, Download, Printer, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/utils/accountingUtils';
import { downloadCsv } from '@/lib/exportCsv';
import { cashFlowCsv, statementFilename, type CashFlowItem } from '@/lib/statementCsv';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/format';

const LONG_DATE: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };

interface SectionItem extends CashFlowItem {
  isIndented?: boolean;
}

function CashFlowSection({ title, items, total, totalLabel }: {
  title: string;
  items: SectionItem[];
  total: number;
  totalLabel: string;
}) {
  return (
    <>
      <TableRow>
        <TableCell colSpan={2} className="text-lg font-bold pt-4">
          {title}
        </TableCell>
      </TableRow>

      {items.length === 0 && (
        <TableRow>
          <TableCell colSpan={2} className="pl-8 text-muted-foreground">No movement in this period</TableCell>
        </TableRow>
      )}

      {items.map((item, index) => (
        item.isHeader ? (
          <TableRow key={index} className="bg-muted/30">
            <TableCell colSpan={2} className="font-semibold text-sm pl-8">
              {item.label}
            </TableCell>
          </TableRow>
        ) : (
          <TableRow key={index}>
            <TableCell className={item.isIndented ? 'pl-12' : 'pl-8'}>
              {item.label}
            </TableCell>
            <TableCell className="text-right font-mono">
              {item.amount !== null ? formatCurrency(item.amount) : ''}
            </TableCell>
          </TableRow>
        )
      ))}

      <TableRow className="bg-primary/10 font-semibold">
        <TableCell className="pl-8">{totalLabel}</TableCell>
        <TableCell className="text-right font-mono border-t-2">
          {formatCurrency(total)}
        </TableCell>
      </TableRow>
    </>
  );
}

const indented = (lines: CashFlowLine[]): SectionItem[] =>
  lines.map((l) => ({ label: l.label, amount: l.amount, isIndented: true }));

export default function CashFlowStatement() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const companyId = userProfile?.company_id ?? undefined;

  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Posted ledger movement to the end of the period (US-334). Every figure on
  // this page used to be a hardcoded 0 with a comment saying what it "would
  // come from", and the opening cash summed Math.abs of undated balances.
  const { data: activity, isLoading, isError, refetch } = useLedgerActivity(companyId, endDate);
  const { data: postingEnabled } = useLedgerPostingEnabled(companyId);

  const flow = cashFlowStatement((activity ?? []) as LedgerActivityRow[], startDate, endDate);

  const operatingActivities: SectionItem[] = [
    { label: 'Net Income', amount: flow.netIncome },
    ...(flow.operating.length > 0
      ? [{ label: 'Adjustments and changes in operating assets and liabilities:', amount: null, isHeader: true }]
      : []),
    ...indented(flow.operating),
  ];
  const investingActivities = indented(flow.investing);
  const financingActivities = indented(flow.financing);

  const handlePrint = () => {
    window.print();
  };

  // Exports exactly what the page shows, section by section.
  const handleExport = () => {
    const csv = cashFlowCsv(
      [
        { title: 'Operating Activities', items: operatingActivities, total: flow.operatingTotal, totalLabel: 'Net Cash Provided by Operating Activities' },
        { title: 'Investing Activities', items: investingActivities, total: flow.investingTotal, totalLabel: 'Net Cash Used in Investing Activities' },
        { title: 'Financing Activities', items: financingActivities, total: flow.financingTotal, totalLabel: 'Net Cash Provided by Financing Activities' },
      ],
      [
        { label: 'Net Increase (Decrease) in Cash', amount: flow.netChange },
        { label: 'Cash at Beginning of Period', amount: flow.beginningCash },
        { label: 'Cash at End of Period', amount: flow.endingCash },
      ]
    );
    downloadCsv(statementFilename('cash-flow', startDate, endDate), csv);
  };

  const metric = (label: string, amount: number) => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          {amount >= 0 ? (
            <TrendingUp className="h-4 w-4 text-green-600" aria-hidden="true" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" aria-hidden="true" />
          )}
          <div className={`text-2xl font-bold ${amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(amount)}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <main className="container mx-auto py-6 space-y-6" role="main" aria-label="Cash Flow Statement">
      {postingEnabled === false && (
        <Alert>
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>
            Brikly is not posting to a ledger for this company, so this statement
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
            <ArrowRightLeft className="h-8 w-8" aria-hidden="true" />
            Cash Flow Statement
          </h1>
          <p className="text-muted-foreground mt-1">
            Cash inflows and outflows from operating, investing, and financing activities
          </p>
        </div>

        <div className="flex gap-2" role="toolbar" aria-label="Report actions">
          <Button variant="outline" onClick={handlePrint} aria-label="Print cash flow statement">
            <Printer className="mr-2 h-4 w-4" aria-hidden="true" />
            Print
          </Button>
          <Button variant="outline" onClick={handleExport} aria-label="Export cash flow statement">
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
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-[200px]"
                  aria-label="Select start date for report"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-[200px]"
                  aria-label="Select end date for report"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {isError ? (
        <ErrorState
          title="The cash flow statement did not load"
          description="We could not read your ledger, so no figures are shown rather than showing zeros. Try again, or contact support if it keeps failing."
          onRetry={() => { void refetch(); }}
        />
      ) : !isLoading && activity && activity.length === 0 ? (
        <NoLedgerActivity onCreate={() => navigate('/finance/journal-entries')} />
      ) : (
      <>
      {/* Cash Flow Metrics */}
      <section aria-label="Cash flow metrics">
        <div className="grid gap-4 md:grid-cols-4">
          {metric('Operating Activities', flow.operatingTotal)}
          {metric('Investing Activities', flow.investingTotal)}
          {metric('Financing Activities', flow.financingTotal)}
          {metric('Net Change in Cash', flow.netChange)}
        </div>
      </section>

      {!isLoading && !flow.reconciles && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>
            The activities above do not add up to the change in your cash and bank accounts
            (off by {formatCurrency(flow.difference)}). Every posted entry should balance, so an
            entry entered by hand is likely one-sided. The trial balance will show it.
          </AlertDescription>
        </Alert>
      )}

      {/* Statement */}
      <section aria-label="Statement of cash flows">
        <Card>
          <CardHeader>
            <CardTitle>Statement of Cash Flows</CardTitle>
            <CardDescription>
              {formatDate(`${startDate}T00:00:00`, LONG_DATE)} to {formatDate(`${endDate}T00:00:00`, LONG_DATE)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-8" />)}</div>
            ) : (
              <Table aria-label="Cash Flow Statement">
              <TableBody>
                <CashFlowSection
                  title="CASH FLOWS FROM OPERATING ACTIVITIES"
                  items={operatingActivities}
                  total={flow.operatingTotal}
                  totalLabel="Net Cash Provided by Operating Activities"
                />

                <TableRow>
                  <TableCell colSpan={2} className="h-4"></TableCell>
                </TableRow>

                <CashFlowSection
                  title="CASH FLOWS FROM INVESTING ACTIVITIES"
                  items={investingActivities}
                  total={flow.investingTotal}
                  totalLabel="Net Cash Used in Investing Activities"
                />

                <TableRow>
                  <TableCell colSpan={2} className="h-4"></TableCell>
                </TableRow>

                <CashFlowSection
                  title="CASH FLOWS FROM FINANCING ACTIVITIES"
                  items={financingActivities}
                  total={flow.financingTotal}
                  totalLabel="Net Cash Provided by Financing Activities"
                />

                <TableRow>
                  <TableCell colSpan={2} className="h-4"></TableCell>
                </TableRow>

                <TableRow className="bg-blue-50 font-bold text-lg">
                  <TableCell>NET INCREASE (DECREASE) IN CASH</TableCell>
                  <TableCell className="text-right font-mono border-t-4 border-double">
                    {formatCurrency(flow.netChange)}
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell colSpan={2} className="h-4"></TableCell>
                </TableRow>

                <TableRow>
                  <TableCell className="pl-8">Cash at Beginning of Period</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(flow.beginningCash)}
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell className="pl-8">Cash at End of Period</TableCell>
                  <TableCell className="text-right font-mono border-t-2">
                    {formatCurrency(flow.endingCash)}
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell colSpan={2} className="h-4"></TableCell>
                </TableRow>

                <TableRow className="bg-primary/10 font-bold text-xl">
                  <TableCell>CASH AND CASH EQUIVALENTS, END OF PERIOD</TableCell>
                  <TableCell className="text-right font-mono border-t-4 border-double">
                    {formatCurrency(flow.endingCash)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      </section>
      </>
      )}

      {/* Supplemental Information */}
      <aside aria-label="Supplemental cash flow information">
        <Card>
        <CardHeader>
          <CardTitle>How this statement is built</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Indirect method, from posted ledger entries: net income for the period, then the change
              in every balance-sheet account other than cash and bank.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Operating:</strong> receivables, payables, credit cards, accrued wages, sales tax
                and other current accounts, and depreciation
              </li>
              <li>
                <strong>Investing:</strong> fixed and other long-term assets
              </li>
              <li>
                <strong>Financing:</strong> long-term debt, owner contributions and draws
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
      </aside>
    </main>
  );
}
