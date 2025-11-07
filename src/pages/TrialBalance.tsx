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
import { ClipboardList, Download, Printer, CheckCircle, AlertCircle } from 'lucide-react';
import { formatCurrency, getAccountTypeLabel } from '@/utils/accountingUtils';

export default function TrialBalance() {
  const { user } = useAuth();
  const companyId = user?.user_metadata?.company_id;

  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

  // Fetch accounts
  const { data: accounts, isLoading } = useChartOfAccounts(companyId);

  // Calculate total debits and credits
  const totalDebits = accounts?.reduce((sum, account) => {
    if (['asset', 'expense', 'cost_of_goods_sold', 'other_expense'].includes(account.account_type)) {
      return sum + Math.abs(Number(account.current_balance) || 0);
    }
    return sum;
  }, 0) || 0;

  const totalCredits = accounts?.reduce((sum, account) => {
    if (['liability', 'equity', 'revenue', 'other_income'].includes(account.account_type)) {
      return sum + Math.abs(Number(account.current_balance) || 0);
    }
    return sum;
  }, 0) || 0;

  const difference = Math.abs(totalDebits - totalCredits);
  const isBalanced = difference < 0.01;

  // Group accounts by type
  const accountsByType = accounts?.reduce((acc: any, account: any) => {
    if (!acc[account.account_type]) {
      acc[account.account_type] = [];
    }
    acc[account.account_type].push(account);
    return acc;
  }, {});

  const accountOrder = [
    'asset',
    'liability',
    'equity',
    'revenue',
    'cost_of_goods_sold',
    'expense',
    'other_income',
    'other_expense',
  ];

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    alert('Export functionality coming soon!');
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-8 w-8" />
            Trial Balance
          </h1>
          <p className="text-muted-foreground mt-1">
            Verify that debits equal credits
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

            {/* Balance Status */}
            <div className="flex items-center gap-2 ml-auto">
              {isBalanced ? (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-semibold">Balanced</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-lg">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-semibold">
                    Out of Balance: {formatCurrency(difference)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trial Balance */}
      <Card>
        <CardHeader>
          <CardTitle>Trial Balance</CardTitle>
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
            <div className="text-center py-8">Loading trial balance...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Number</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountOrder.map((type) => {
                  const typeAccounts = accountsByType?.[type] || [];
                  if (typeAccounts.length === 0) return null;

                  // Calculate subtotals for this type
                  const isDebitType = ['asset', 'expense', 'cost_of_goods_sold', 'other_expense'].includes(type);
                  const subtotal = typeAccounts.reduce(
                    (sum: number, account: any) => sum + Math.abs(Number(account.current_balance) || 0),
                    0
                  );

                  return (
                    <React.Fragment key={type}>
                      {/* Type Header */}
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={5} className="font-semibold">
                          {getAccountTypeLabel(type as any)}
                        </TableCell>
                      </TableRow>

                      {/* Accounts */}
                      {typeAccounts.map((account: any) => {
                        const balance = Math.abs(Number(account.current_balance) || 0);

                        return (
                          <TableRow key={account.id}>
                            <TableCell className="font-mono">
                              {account.account_number}
                            </TableCell>
                            <TableCell>{account.account_name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {account.account_subtype.replace(/_/g, ' ')}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {isDebitType ? formatCurrency(balance) : '-'}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {!isDebitType ? formatCurrency(balance) : '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}

                      {/* Subtotal */}
                      <TableRow className="font-semibold bg-muted/30">
                        <TableCell colSpan={3} className="text-right">
                          Total {getAccountTypeLabel(type as any)}
                        </TableCell>
                        <TableCell className="text-right font-mono border-t">
                          {isDebitType ? formatCurrency(subtotal) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono border-t">
                          {!isDebitType ? formatCurrency(subtotal) : '-'}
                        </TableCell>
                      </TableRow>

                      {/* Spacer */}
                      <TableRow>
                        <TableCell colSpan={5} className="h-2"></TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })}

                {/* Grand Total */}
                <TableRow className="bg-primary/10 font-bold text-lg">
                  <TableCell colSpan={3}>TOTAL</TableCell>
                  <TableCell className="text-right font-mono border-t-4 border-double">
                    {formatCurrency(totalDebits)}
                  </TableCell>
                  <TableCell className="text-right font-mono border-t-4 border-double">
                    {formatCurrency(totalCredits)}
                  </TableCell>
                </TableRow>

                {/* Difference (if any) */}
                {!isBalanced && (
                  <TableRow className="bg-red-50 font-semibold">
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

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
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
            <CardTitle className="text-sm font-medium">Difference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(difference)}
            </div>
            <p className="text-xs text-muted-foreground">
              {isBalanced ? 'In balance' : 'Out of balance'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
