import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useChartOfAccounts } from '@/hooks/useAccounting';
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
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Printer, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/utils/accountingUtils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Separator } from '@/components/ui/separator';

export default function GeneralLedger() {
  const { user } = useAuth();
  const companyId = user?.user_metadata?.company_id;

  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [groupBy, setGroupBy] = useState<'month' | 'none'>('month');

  // Fetch accounts
  const { data: accounts, isLoading: accountsLoading } = useChartOfAccounts(companyId);

  // Fetch journal entry lines for selected account
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['general-ledger', selectedAccountId, startDate, endDate],
    queryFn: async () => {
      if (!selectedAccountId) return [];

      const { data, error } = await supabase
        .from('journal_entry_lines')
        .select(`
          *,
          journal_entry:journal_entries(
            id,
            entry_number,
            entry_date,
            description,
            transaction_status,
            memo
          )
        `)
        .eq('account_id', selectedAccountId)
        .gte('journal_entry.entry_date', startDate)
        .lte('journal_entry.entry_date', endDate)
        .order('journal_entry(entry_date)', { ascending: true });

      if (error) throw error;

      // Filter out draft entries and sort properly
      const filtered = data
        ?.filter((line: any) => line.journal_entry?.transaction_status === 'posted')
        .sort((a: any, b: any) => {
          const dateA = new Date(a.journal_entry.entry_date).getTime();
          const dateB = new Date(b.journal_entry.entry_date).getTime();
          return dateA - dateB;
        });

      return filtered || [];
    },
    enabled: !!selectedAccountId && !!companyId,
  });

  // Get selected account details
  const selectedAccount = accounts?.find(a => a.id === selectedAccountId);

  // Calculate running balance
  const transactionsWithBalance = transactions?.map((tx: any, index: number) => {
    const debit = Number(tx.debit_amount) || 0;
    const credit = Number(tx.credit_amount) || 0;

    // Calculate running balance based on account's normal balance
    const isDebitAccount = ['asset', 'expense', 'cost_of_goods_sold', 'other_expense'].includes(
      selectedAccount?.account_type || ''
    );

    const previousBalance = index === 0 ? 0 : transactionsWithBalance[index - 1].runningBalance;
    const change = isDebitAccount ? debit - credit : credit - debit;
    const runningBalance = previousBalance + change;

    return {
      ...tx,
      debit,
      credit,
      runningBalance,
    };
  });

  // Group transactions by month if needed
  const groupedTransactions = groupBy === 'month' && transactionsWithBalance
    ? transactionsWithBalance.reduce((acc: any, tx: any) => {
        const date = new Date(tx.journal_entry.entry_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

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
    alert('Export functionality coming soon!');
  };

  const isLoading = accountsLoading || transactionsLoading;

  // Calculate totals
  const totalDebits = transactionsWithBalance?.reduce((sum: number, tx: any) => sum + tx.debit, 0) || 0;
  const totalCredits = transactionsWithBalance?.reduce((sum: number, tx: any) => sum + tx.credit, 0) || 0;
  const endingBalance = transactionsWithBalance?.[transactionsWithBalance.length - 1]?.runningBalance || 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8" />
            General Ledger
          </h1>
          <p className="text-muted-foreground mt-1">
            View all transactions for any account
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} disabled={!selectedAccountId}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={!selectedAccountId}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="account">Account</Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger>
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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <div className="space-y-2">
              <Label htmlFor="groupBy">Group By</Label>
              <Select value={groupBy} onValueChange={(value: any) => setGroupBy(value)}>
                <SelectTrigger className="w-[180px]">
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
                <Badge variant="outline" className="text-sm">
                  {selectedAccount.account_type.replace(/_/g, ' ')} - {selectedAccount.account_subtype.replace(/_/g, ' ')}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Account Summary */}
      {selectedAccount && (
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
              <p className="text-xs text-muted-foreground">As of {endDate}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transactions */}
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
            <div className="text-center py-8 text-muted-foreground">
              Please select an account to view its general ledger
            </div>
          ) : isLoading ? (
            <div className="text-center py-8">Loading transactions...</div>
          ) : transactionsWithBalance && transactionsWithBalance.length > 0 ? (
            <div className="space-y-6">
              {groupBy === 'month' && groupedTransactions ? (
                // Grouped by month
                Object.entries(groupedTransactions).map(([monthKey, monthData]: [string, any]) => (
                  <div key={monthKey} className="space-y-2">
                    <div className="flex items-center gap-2 sticky top-0 bg-background py-2">
                      <ChevronRight className="h-4 w-4" />
                      <h3 className="font-semibold">{monthData.label}</h3>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Entry #</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Debit</TableHead>
                          <TableHead className="text-right">Credit</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthData.transactions.map((tx: any) => (
                          <TableRow key={tx.id}>
                            <TableCell>
                              {new Date(tx.journal_entry.entry_date).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-mono">
                              {tx.journal_entry.entry_number}
                            </TableCell>
                            <TableCell>
                              <div>{tx.journal_entry.description}</div>
                              {tx.description && (
                                <div className="text-sm text-muted-foreground">
                                  {tx.description}
                                </div>
                              )}
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Entry #</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactionsWithBalance.map((tx: any) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          {new Date(tx.journal_entry.entry_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-mono">
                          {tx.journal_entry.entry_number}
                        </TableCell>
                        <TableCell>
                          <div>{tx.journal_entry.description}</div>
                          {tx.description && (
                            <div className="text-sm text-muted-foreground">
                              {tx.description}
                            </div>
                          )}
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

                    {/* Totals Row */}
                    <TableRow className="bg-muted/50 font-bold">
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
                  </TableBody>
                </Table>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found for the selected date range
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
