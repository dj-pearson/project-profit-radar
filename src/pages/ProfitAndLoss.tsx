import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useChartOfAccounts } from '@/hooks/useAccounting';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Separator } from '@/components/ui/separator';
import { TrendingUp, Download, Printer } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/utils/accountingUtils';

export default function ProfitAndLoss() {
  const { user } = useAuth();
  const companyId = user?.user_metadata?.company_id;

  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Fetch accounts
  const { data: accounts, isLoading } = useChartOfAccounts(companyId);

  // Group accounts by type
  const revenueAccounts = accounts?.filter(a => a.account_type === 'revenue') || [];
  const cogsAccounts = accounts?.filter(a => a.account_type === 'cost_of_goods_sold') || [];
  const expenseAccounts = accounts?.filter(a => a.account_type === 'expense') || [];
  const otherIncomeAccounts = accounts?.filter(a => a.account_type === 'other_income') || [];
  const otherExpenseAccounts = accounts?.filter(a => a.account_type === 'other_expense') || [];

  // Calculate totals
  const calculateTotal = (accountList: any[]) => {
    return accountList.reduce((sum, account) => {
      // For revenue and other income, use positive balances
      // For COGS, expenses, and other expenses, use absolute values
      return sum + Math.abs(Number(account.current_balance) || 0);
    }, 0);
  };

  const totalRevenue = calculateTotal(revenueAccounts);
  const totalCOGS = calculateTotal(cogsAccounts);
  const grossProfit = totalRevenue - totalCOGS;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  const totalExpenses = calculateTotal(expenseAccounts);
  const operatingIncome = grossProfit - totalExpenses;
  const operatingMargin = totalRevenue > 0 ? (operatingIncome / totalRevenue) * 100 : 0;

  const totalOtherIncome = calculateTotal(otherIncomeAccounts);
  const totalOtherExpense = calculateTotal(otherExpenseAccounts);
  const netOtherIncome = totalOtherIncome - totalOtherExpense;

  const netIncome = operatingIncome + netOtherIncome;
  const netMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

  // Group expenses by subtype
  const payrollExpenses = expenseAccounts.filter(a =>
    a.account_subtype === 'payroll_expense'
  );
  const overheadExpenses = expenseAccounts.filter(a =>
    a.account_subtype === 'overhead'
  );
  const operatingExpenses = expenseAccounts.filter(a =>
    a.account_subtype === 'operating_expense'
  );
  const adminExpenses = expenseAccounts.filter(a =>
    a.account_subtype === 'administrative_expense'
  );

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    alert('Export functionality coming soon!');
  };

  const AccountSection = ({ title, accounts, showTotal = false, totalLabel = '' }: any) => {
    const sectionTotal = calculateTotal(accounts);

    return (
      <>
        {accounts.length > 0 && (
          <>
            <TableRow className="bg-muted/50">
              <TableCell colSpan={3} className="font-semibold">
                {title}
              </TableCell>
            </TableRow>
            {accounts.map((account: any) => {
              const balance = Math.abs(Number(account.current_balance) || 0);
              const percentage = totalRevenue > 0 ? (balance / totalRevenue) * 100 : 0;

              return (
                <TableRow key={account.id}>
                  <TableCell className="pl-8">
                    {account.account_number} - {account.account_name}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(balance)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatPercentage(percentage)}
                  </TableCell>
                </TableRow>
              );
            })}
            {showTotal && (
              <TableRow className="font-semibold">
                <TableCell className="pl-8">{totalLabel || `Total ${title}`}</TableCell>
                <TableCell className="text-right font-mono border-t-2">
                  {formatCurrency(sectionTotal)}
                </TableCell>
                <TableCell className="text-right border-t-2">
                  {formatPercentage(totalRevenue > 0 ? (sectionTotal / totalRevenue) * 100 : 0)}
                </TableCell>
              </TableRow>
            )}
          </>
        )}
      </>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-8 w-8" />
            Profit & Loss
          </h1>
          <p className="text-muted-foreground mt-1">
            Income statement showing revenue, expenses, and profitability
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
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
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* P&L Statement */}
      <Card>
        <CardHeader>
          <CardTitle>Profit & Loss Statement</CardTitle>
          <CardDescription>
            {new Date(startDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}{' '}
            to{' '}
            {new Date(endDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading P&L statement...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">% of Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* REVENUE */}
                <TableRow>
                  <TableCell colSpan={3} className="text-xl font-bold pt-4">
                    REVENUE
                  </TableCell>
                </TableRow>

                <AccountSection title="Income" accounts={revenueAccounts} />

                <TableRow className="bg-primary/10 font-bold">
                  <TableCell className="text-lg">Total Revenue</TableCell>
                  <TableCell className="text-right font-mono text-lg border-t-4 border-double">
                    {formatCurrency(totalRevenue)}
                  </TableCell>
                  <TableCell className="text-right text-lg border-t-4 border-double">
                    100.0%
                  </TableCell>
                </TableRow>

                {/* Spacer */}
                <TableRow>
                  <TableCell colSpan={3} className="h-4"></TableCell>
                </TableRow>

                {/* COST OF GOODS SOLD */}
                <TableRow>
                  <TableCell colSpan={3} className="text-xl font-bold">
                    COST OF GOODS SOLD
                  </TableCell>
                </TableRow>

                <AccountSection
                  title="Direct Costs"
                  accounts={cogsAccounts}
                  showTotal
                  totalLabel="Total Cost of Goods Sold"
                />

                {/* Spacer */}
                <TableRow>
                  <TableCell colSpan={3} className="h-4"></TableCell>
                </TableRow>

                {/* GROSS PROFIT */}
                <TableRow className="bg-green-50 font-bold text-lg">
                  <TableCell>GROSS PROFIT</TableCell>
                  <TableCell className="text-right font-mono border-t-4 border-double">
                    {formatCurrency(grossProfit)}
                  </TableCell>
                  <TableCell className="text-right border-t-4 border-double">
                    {formatPercentage(grossMargin)}
                  </TableCell>
                </TableRow>

                {/* Spacer */}
                <TableRow>
                  <TableCell colSpan={3} className="h-4"></TableCell>
                </TableRow>

                {/* OPERATING EXPENSES */}
                <TableRow>
                  <TableCell colSpan={3} className="text-xl font-bold">
                    OPERATING EXPENSES
                  </TableCell>
                </TableRow>

                <AccountSection title="Payroll Expenses" accounts={payrollExpenses} />
                <AccountSection title="Overhead" accounts={overheadExpenses} />
                <AccountSection title="Operating Expenses" accounts={operatingExpenses} />
                <AccountSection title="Administrative Expenses" accounts={adminExpenses} />

                <TableRow className="font-semibold">
                  <TableCell className="text-lg">Total Operating Expenses</TableCell>
                  <TableCell className="text-right font-mono text-lg border-t-2">
                    {formatCurrency(totalExpenses)}
                  </TableCell>
                  <TableCell className="text-right text-lg border-t-2">
                    {formatPercentage(totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0)}
                  </TableCell>
                </TableRow>

                {/* Spacer */}
                <TableRow>
                  <TableCell colSpan={3} className="h-4"></TableCell>
                </TableRow>

                {/* OPERATING INCOME */}
                <TableRow className="bg-blue-50 font-bold text-lg">
                  <TableCell>OPERATING INCOME</TableCell>
                  <TableCell className="text-right font-mono border-t-4 border-double">
                    {formatCurrency(operatingIncome)}
                  </TableCell>
                  <TableCell className="text-right border-t-4 border-double">
                    {formatPercentage(operatingMargin)}
                  </TableCell>
                </TableRow>

                {/* Spacer */}
                <TableRow>
                  <TableCell colSpan={3} className="h-4"></TableCell>
                </TableRow>

                {/* OTHER INCOME/EXPENSE */}
                <TableRow>
                  <TableCell colSpan={3} className="text-xl font-bold">
                    OTHER INCOME & EXPENSES
                  </TableCell>
                </TableRow>

                <AccountSection title="Other Income" accounts={otherIncomeAccounts} />
                <AccountSection title="Other Expenses" accounts={otherExpenseAccounts} />

                {(otherIncomeAccounts.length > 0 || otherExpenseAccounts.length > 0) && (
                  <TableRow className="font-semibold">
                    <TableCell>Net Other Income</TableCell>
                    <TableCell className="text-right font-mono border-t-2">
                      {formatCurrency(netOtherIncome)}
                    </TableCell>
                    <TableCell className="text-right border-t-2">
                      {formatPercentage(totalRevenue > 0 ? (netOtherIncome / totalRevenue) * 100 : 0)}
                    </TableCell>
                  </TableRow>
                )}

                {/* Spacer */}
                <TableRow>
                  <TableCell colSpan={3} className="h-4"></TableCell>
                </TableRow>

                {/* NET INCOME */}
                <TableRow className="bg-primary/10 font-bold text-xl">
                  <TableCell>NET INCOME</TableCell>
                  <TableCell className="text-right font-mono border-t-4 border-double">
                    {formatCurrency(netIncome)}
                  </TableCell>
                  <TableCell className="text-right border-t-4 border-double">
                    {formatPercentage(netMargin)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Key Metrics Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(grossProfit)}</div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(grossMargin)} margin
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Operating Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(operatingIncome)}</div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(operatingMargin)} margin
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(netIncome)}</div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(netMargin)} margin
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses + totalCOGS)}</div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(totalRevenue > 0 ? ((totalExpenses + totalCOGS) / totalRevenue) * 100 : 0)} of revenue
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
