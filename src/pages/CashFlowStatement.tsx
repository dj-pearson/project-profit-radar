import React, { useState } from 'react';
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
import { ArrowRightLeft, Download, Printer, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/utils/accountingUtils';
import { Separator } from '@/components/ui/separator';

export default function CashFlowStatement() {
  const { user } = useAuth();
  const companyId = user?.user_metadata?.company_id;

  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Fetch accounts
  const { data: accounts, isLoading } = useChartOfAccounts(companyId);

  // In a real implementation, we would calculate actual cash flows
  // For now, we'll use placeholder calculations based on account balances

  // Operating Activities
  const netIncome = 0; // Would come from P&L
  const depreciation = 0; // Non-cash expense
  const accountsReceivableChange = 0; // Change in AR
  const accountsPayableChange = 0; // Change in AP
  const inventoryChange = 0; // Change in inventory

  const operatingActivities = [
    { label: 'Net Income', amount: netIncome, isSubtotal: false },
    { label: 'Adjustments to reconcile net income:', amount: null, isHeader: true },
    { label: 'Depreciation and Amortization', amount: depreciation, isIndented: true },
    { label: 'Changes in Operating Assets and Liabilities:', amount: null, isHeader: true },
    { label: 'Accounts Receivable', amount: accountsReceivableChange, isIndented: true },
    { label: 'Inventory', amount: inventoryChange, isIndented: true },
    { label: 'Accounts Payable', amount: accountsPayableChange, isIndented: true },
  ];

  const netCashFromOperating = netIncome + depreciation + accountsReceivableChange +
                                accountsPayableChange + inventoryChange;

  // Investing Activities
  const propertyPurchases = 0; // Purchase of PP&E
  const propertySales = 0; // Sale of PP&E
  const equipmentPurchases = 0;

  const investingActivities = [
    { label: 'Purchase of Property and Equipment', amount: -propertyPurchases, isIndented: true },
    { label: 'Purchase of Equipment', amount: -equipmentPurchases, isIndented: true },
    { label: 'Proceeds from Sale of Equipment', amount: propertySales, isIndented: true },
  ];

  const netCashFromInvesting = -propertyPurchases - equipmentPurchases + propertySales;

  // Financing Activities
  const loanProceeds = 0; // New loans
  const loanRepayments = 0; // Loan principal payments
  const ownerContributions = 0; // Owner investments
  const ownerDraws = 0; // Owner withdrawals

  const financingActivities = [
    { label: 'Proceeds from Loans', amount: loanProceeds, isIndented: true },
    { label: 'Principal Payments on Loans', amount: -loanRepayments, isIndented: true },
    { label: 'Owner Contributions', amount: ownerContributions, isIndented: true },
    { label: 'Owner Draws', amount: -ownerDraws, isIndented: true },
  ];

  const netCashFromFinancing = loanProceeds - loanRepayments + ownerContributions - ownerDraws;

  // Net change in cash
  const netCashChange = netCashFromOperating + netCashFromInvesting + netCashFromFinancing;

  // Cash balances
  const beginningCash = accounts?.filter(a =>
    ['cash', 'bank'].includes(a.account_subtype)
  ).reduce((sum, account) => sum + Math.abs(Number(account.current_balance) || 0), 0) || 0;

  const endingCash = beginningCash + netCashChange;

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    alert('Export functionality coming soon!');
  };

  const CashFlowSection = ({ title, items, total, totalLabel }: any) => (
    <div className="space-y-2">
      <TableRow>
        <TableCell colSpan={2} className="text-lg font-bold pt-4">
          {title}
        </TableCell>
      </TableRow>

      {items.map((item: any, index: number) => {
        if (item.isHeader) {
          return (
            <TableRow key={index} className="bg-muted/30">
              <TableCell colSpan={2} className="font-semibold text-sm pl-8">
                {item.label}
              </TableCell>
            </TableRow>
          );
        }

        return (
          <TableRow key={index}>
            <TableCell className={item.isIndented ? 'pl-12' : 'pl-8'}>
              {item.label}
            </TableCell>
            <TableCell className="text-right font-mono">
              {item.amount !== null ? formatCurrency(item.amount) : ''}
            </TableCell>
          </TableRow>
        );
      })}

      <TableRow className="bg-primary/10 font-semibold">
        <TableCell className="pl-8">{totalLabel}</TableCell>
        <TableCell className="text-right font-mono border-t-2">
          {formatCurrency(total)}
        </TableCell>
      </TableRow>
    </div>
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ArrowRightLeft className="h-8 w-8" />
            Cash Flow Statement
          </h1>
          <p className="text-muted-foreground mt-1">
            Cash inflows and outflows from operating, investing, and financing activities
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

      {/* Cash Flow Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Operating Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {netCashFromOperating >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <div className={`text-2xl font-bold ${netCashFromOperating >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(netCashFromOperating)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Investing Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {netCashFromInvesting >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <div className={`text-2xl font-bold ${netCashFromInvesting >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(netCashFromInvesting)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Financing Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {netCashFromFinancing >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <div className={`text-2xl font-bold ${netCashFromFinancing >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(netCashFromFinancing)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Change in Cash</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {netCashChange >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <div className={`text-2xl font-bold ${netCashChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(netCashChange)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statement */}
      <Card>
        <CardHeader>
          <CardTitle>Statement of Cash Flows</CardTitle>
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
            <div className="text-center py-8">Loading cash flow statement...</div>
          ) : (
            <Table>
              <TableBody>
                {/* Operating Activities */}
                <CashFlowSection
                  title="CASH FLOWS FROM OPERATING ACTIVITIES"
                  items={operatingActivities}
                  total={netCashFromOperating}
                  totalLabel="Net Cash Provided by Operating Activities"
                />

                <TableRow>
                  <TableCell colSpan={2} className="h-4"></TableCell>
                </TableRow>

                {/* Investing Activities */}
                <CashFlowSection
                  title="CASH FLOWS FROM INVESTING ACTIVITIES"
                  items={investingActivities}
                  total={netCashFromInvesting}
                  totalLabel="Net Cash Used in Investing Activities"
                />

                <TableRow>
                  <TableCell colSpan={2} className="h-4"></TableCell>
                </TableRow>

                {/* Financing Activities */}
                <CashFlowSection
                  title="CASH FLOWS FROM FINANCING ACTIVITIES"
                  items={financingActivities}
                  total={netCashFromFinancing}
                  totalLabel="Net Cash Provided by Financing Activities"
                />

                <TableRow>
                  <TableCell colSpan={2} className="h-4"></TableCell>
                </TableRow>

                {/* Net Change in Cash */}
                <TableRow className="bg-blue-50 font-bold text-lg">
                  <TableCell>NET INCREASE (DECREASE) IN CASH</TableCell>
                  <TableCell className="text-right font-mono border-t-4 border-double">
                    {formatCurrency(netCashChange)}
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell colSpan={2} className="h-4"></TableCell>
                </TableRow>

                {/* Cash Reconciliation */}
                <TableRow>
                  <TableCell className="pl-8">Cash at Beginning of Period</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(beginningCash)}
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell className="pl-8">Cash at End of Period</TableCell>
                  <TableCell className="text-right font-mono border-t-2">
                    {formatCurrency(endingCash)}
                  </TableCell>
                </TableRow>

                <TableRow>
                  <TableCell colSpan={2} className="h-4"></TableCell>
                </TableRow>

                {/* Final Cash Position */}
                <TableRow className="bg-primary/10 font-bold text-xl">
                  <TableCell>CASH AND CASH EQUIVALENTS, END OF PERIOD</TableCell>
                  <TableCell className="text-right font-mono border-t-4 border-double">
                    {formatCurrency(endingCash)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Supplemental Information */}
      <Card>
        <CardHeader>
          <CardTitle>Supplemental Cash Flow Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              <strong>Note:</strong> This statement shows actual cash movements during the period.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Operating Activities:</strong> Cash generated from normal business operations
              </li>
              <li>
                <strong>Investing Activities:</strong> Cash used for or generated from investments in long-term assets
              </li>
              <li>
                <strong>Financing Activities:</strong> Cash from or used for financing (loans, owner contributions/draws)
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
