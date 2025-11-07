import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useChartOfAccounts, useAccountBalances } from '@/hooks/useAccounting';
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
import { BarChart3, Download, Printer } from 'lucide-react';
import { formatCurrency } from '@/utils/accountingUtils';

export default function BalanceSheet() {
  const { user } = useAuth();
  const companyId = user?.user_metadata?.company_id;

  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

  // Fetch accounts
  const { data: accounts, isLoading } = useChartOfAccounts(companyId);

  // Group accounts by type
  const assetAccounts = accounts?.filter(a => a.account_type === 'asset') || [];
  const liabilityAccounts = accounts?.filter(a => a.account_type === 'liability') || [];
  const equityAccounts = accounts?.filter(a => a.account_type === 'equity') || [];

  // Calculate totals
  const calculateTotal = (accountList: any[]) => {
    return accountList.reduce((sum, account) => {
      return sum + (Number(account.current_balance) || 0);
    }, 0);
  };

  const totalAssets = calculateTotal(assetAccounts);
  const totalLiabilities = calculateTotal(liabilityAccounts);
  const totalEquity = calculateTotal(equityAccounts);

  // Calculate net income (would come from P&L in real implementation)
  const currentYearEarnings = 0; // Placeholder

  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity + currentYearEarnings;
  const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01;

  // Group assets by subtype
  const currentAssets = assetAccounts.filter(a =>
    ['cash', 'bank', 'accounts_receivable', 'other_current_asset'].includes(a.account_subtype)
  );
  const fixedAssets = assetAccounts.filter(a =>
    ['fixed_asset', 'accumulated_depreciation'].includes(a.account_subtype)
  );
  const otherAssets = assetAccounts.filter(a =>
    a.account_subtype === 'other_asset'
  );

  // Group liabilities by subtype
  const currentLiabilities = liabilityAccounts.filter(a =>
    ['accounts_payable', 'credit_card', 'other_current_liability'].includes(a.account_subtype)
  );
  const longTermLiabilities = liabilityAccounts.filter(a =>
    a.account_subtype === 'long_term_liability'
  );

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // In a real implementation, this would export to PDF or Excel
    alert('Export functionality coming soon!');
  };

  const AccountSection = ({ title, accounts, showTotal = false }: any) => {
    const sectionTotal = calculateTotal(accounts);

    return (
      <>
        <TableRow className="bg-muted/50">
          <TableCell colSpan={2} className="font-semibold">
            {title}
          </TableCell>
        </TableRow>
        {accounts.map((account: any) => (
          <TableRow key={account.id}>
            <TableCell className="pl-8">
              {account.account_number} - {account.account_name}
            </TableCell>
            <TableCell className="text-right font-mono">
              {formatCurrency(account.current_balance || 0)}
            </TableCell>
          </TableRow>
        ))}
        {showTotal && accounts.length > 0 && (
          <TableRow className="font-semibold">
            <TableCell className="pl-8">Total {title}</TableCell>
            <TableCell className="text-right font-mono border-t-2">
              {formatCurrency(sectionTotal)}
            </TableCell>
          </TableRow>
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
            <BarChart3 className="h-8 w-8" />
            Balance Sheet
          </h1>
          <p className="text-muted-foreground mt-1">
            Assets = Liabilities + Equity
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
              <Label htmlFor="asOfDate">As of Date</Label>
              <Input
                id="asOfDate"
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="w-[200px]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balance Sheet */}
      <Card>
        <CardHeader>
          <CardTitle>Balance Sheet</CardTitle>
          <CardDescription>
            As of {new Date(asOfDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading balance sheet...</div>
          ) : (
            <div className="space-y-8">
              {/* ASSETS */}
              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead colSpan={2} className="text-xl font-bold">
                        ASSETS
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AccountSection
                      title="Current Assets"
                      accounts={currentAssets}
                      showTotal
                    />
                    <AccountSection
                      title="Fixed Assets"
                      accounts={fixedAssets}
                      showTotal
                    />
                    {otherAssets.length > 0 && (
                      <AccountSection
                        title="Other Assets"
                        accounts={otherAssets}
                        showTotal
                      />
                    )}

                    {/* Total Assets */}
                    <TableRow className="bg-primary/10">
                      <TableCell className="text-lg font-bold">
                        TOTAL ASSETS
                      </TableCell>
                      <TableCell className="text-right font-mono text-lg font-bold border-t-4 border-double">
                        {formatCurrency(totalAssets)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <Separator />

              {/* LIABILITIES AND EQUITY */}
              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead colSpan={2} className="text-xl font-bold">
                        LIABILITIES AND EQUITY
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Liabilities */}
                    <TableRow>
                      <TableCell colSpan={2} className="text-lg font-semibold pt-4">
                        Liabilities
                      </TableCell>
                    </TableRow>

                    <AccountSection
                      title="Current Liabilities"
                      accounts={currentLiabilities}
                      showTotal
                    />

                    {longTermLiabilities.length > 0 && (
                      <AccountSection
                        title="Long-term Liabilities"
                        accounts={longTermLiabilities}
                        showTotal
                      />
                    )}

                    {/* Total Liabilities */}
                    <TableRow className="font-semibold">
                      <TableCell className="text-lg">Total Liabilities</TableCell>
                      <TableCell className="text-right font-mono text-lg border-t-2">
                        {formatCurrency(totalLiabilities)}
                      </TableCell>
                    </TableRow>

                    {/* Spacer */}
                    <TableRow>
                      <TableCell colSpan={2} className="h-4"></TableCell>
                    </TableRow>

                    {/* Equity */}
                    <TableRow>
                      <TableCell colSpan={2} className="text-lg font-semibold">
                        Equity
                      </TableCell>
                    </TableRow>

                    <AccountSection title="Owner's Equity" accounts={equityAccounts} />

                    {/* Current Year Earnings */}
                    <TableRow>
                      <TableCell className="pl-8">Current Year Earnings</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(currentYearEarnings)}
                      </TableCell>
                    </TableRow>

                    {/* Total Equity */}
                    <TableRow className="font-semibold">
                      <TableCell className="text-lg">Total Equity</TableCell>
                      <TableCell className="text-right font-mono text-lg border-t-2">
                        {formatCurrency(totalEquity + currentYearEarnings)}
                      </TableCell>
                    </TableRow>

                    {/* Spacer */}
                    <TableRow>
                      <TableCell colSpan={2} className="h-4"></TableCell>
                    </TableRow>

                    {/* Total Liabilities and Equity */}
                    <TableRow className="bg-primary/10">
                      <TableCell className="text-lg font-bold">
                        TOTAL LIABILITIES AND EQUITY
                      </TableCell>
                      <TableCell className="text-right font-mono text-lg font-bold border-t-4 border-double">
                        {formatCurrency(totalLiabilitiesAndEquity)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Balance Check */}
              {!isBalanced && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                  <p className="font-semibold">⚠️ Balance Sheet is Out of Balance</p>
                  <p className="text-sm">
                    Assets: {formatCurrency(totalAssets)} <br />
                    Liabilities + Equity: {formatCurrency(totalLiabilitiesAndEquity)} <br />
                    Difference: {formatCurrency(Math.abs(totalAssets - totalLiabilitiesAndEquity))}
                  </p>
                </div>
              )}

              {isBalanced && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
                  <p className="font-semibold">✓ Balance Sheet is Balanced</p>
                  <p className="text-sm">
                    Assets = Liabilities + Equity = {formatCurrency(totalAssets)}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
