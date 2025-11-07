import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useChartOfAccounts, useCreateAccount, useUpdateAccount } from '@/hooks/useAccounting';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, BookOpen } from 'lucide-react';
import { formatCurrency, getAccountTypeLabel } from '@/utils/accountingUtils';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

export default function ChartOfAccounts() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);

  // Get company ID from user profile
  const companyId = user?.user_metadata?.company_id;

  // Fetch accounts
  const { data: accounts, isLoading } = useChartOfAccounts(companyId);
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();

  // Form state
  const [formData, setFormData] = useState({
    accountNumber: '',
    accountName: '',
    accountType: 'asset',
    accountSubtype: 'bank',
    description: '',
    isActive: true,
    allowManualEntries: true,
  });

  // Filter accounts
  const filteredAccounts = accounts?.filter((account: any) => {
    const matchesSearch =
      account.account_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.account_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType =
      filterType === 'all' || account.account_type === filterType;

    return matchesSearch && matchesType;
  });

  // Group accounts by type
  const accountsByType = filteredAccounts?.reduce((acc: any, account: any) => {
    if (!acc[account.account_type]) {
      acc[account.account_type] = [];
    }
    acc[account.account_type].push(account);
    return acc;
  }, {});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const accountData = {
      company_id: companyId,
      account_number: formData.accountNumber,
      account_name: formData.accountName,
      account_type: formData.accountType,
      account_subtype: formData.accountSubtype,
      description: formData.description,
      is_active: formData.isActive,
      allow_manual_entries: formData.allowManualEntries,
      normal_balance: ['asset', 'expense', 'cost_of_goods_sold', 'other_expense'].includes(
        formData.accountType
      )
        ? 'debit'
        : 'credit',
    };

    if (editingAccount) {
      await updateAccount.mutateAsync({
        id: editingAccount.id,
        updates: accountData,
      });
    } else {
      await createAccount.mutateAsync(accountData);
    }

    // Reset form
    setFormData({
      accountNumber: '',
      accountName: '',
      accountType: 'asset',
      accountSubtype: 'bank',
      description: '',
      isActive: true,
      allowManualEntries: true,
    });
    setEditingAccount(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (account: any) => {
    setEditingAccount(account);
    setFormData({
      accountNumber: account.account_number,
      accountName: account.account_name,
      accountType: account.account_type,
      accountSubtype: account.account_subtype,
      description: account.description || '',
      isActive: account.is_active,
      allowManualEntries: account.allow_manual_entries,
    });
    setIsDialogOpen(true);
  };

  const getAccountTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      asset: 'bg-blue-100 text-blue-800',
      liability: 'bg-red-100 text-red-800',
      equity: 'bg-purple-100 text-purple-800',
      revenue: 'bg-green-100 text-green-800',
      cost_of_goods_sold: 'bg-orange-100 text-orange-800',
      expense: 'bg-amber-100 text-amber-800',
      other_income: 'bg-teal-100 text-teal-800',
      other_expense: 'bg-rose-100 text-rose-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-8 w-8" />
            Chart of Accounts
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your account structure and classifications
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingAccount(null);
              setFormData({
                accountNumber: '',
                accountName: '',
                accountType: 'asset',
                accountSubtype: 'bank',
                description: '',
                isActive: true,
                allowManualEntries: true,
              });
            }}>
              <Plus className="mr-2 h-4 w-4" />
              New Account
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingAccount ? 'Edit Account' : 'Create New Account'}
                </DialogTitle>
                <DialogDescription>
                  {editingAccount
                    ? 'Update account details'
                    : 'Add a new account to your chart of accounts'}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input
                      id="accountNumber"
                      value={formData.accountNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, accountNumber: e.target.value })
                      }
                      placeholder="1000"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accountName">Account Name</Label>
                    <Input
                      id="accountName"
                      value={formData.accountName}
                      onChange={(e) =>
                        setFormData({ ...formData, accountName: e.target.value })
                      }
                      placeholder="Cash"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="accountType">Account Type</Label>
                    <Select
                      value={formData.accountType}
                      onValueChange={(value) =>
                        setFormData({ ...formData, accountType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asset">Asset</SelectItem>
                        <SelectItem value="liability">Liability</SelectItem>
                        <SelectItem value="equity">Equity</SelectItem>
                        <SelectItem value="revenue">Revenue</SelectItem>
                        <SelectItem value="cost_of_goods_sold">
                          Cost of Goods Sold
                        </SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="other_income">Other Income</SelectItem>
                        <SelectItem value="other_expense">Other Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accountSubtype">Subtype</Label>
                    <Select
                      value={formData.accountSubtype}
                      onValueChange={(value) =>
                        setFormData({ ...formData, accountSubtype: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {formData.accountType === 'asset' && (
                          <>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="bank">Bank</SelectItem>
                            <SelectItem value="accounts_receivable">
                              Accounts Receivable
                            </SelectItem>
                            <SelectItem value="other_current_asset">
                              Other Current Asset
                            </SelectItem>
                            <SelectItem value="fixed_asset">Fixed Asset</SelectItem>
                            <SelectItem value="other_asset">Other Asset</SelectItem>
                          </>
                        )}
                        {formData.accountType === 'liability' && (
                          <>
                            <SelectItem value="accounts_payable">
                              Accounts Payable
                            </SelectItem>
                            <SelectItem value="credit_card">Credit Card</SelectItem>
                            <SelectItem value="other_current_liability">
                              Other Current Liability
                            </SelectItem>
                            <SelectItem value="long_term_liability">
                              Long Term Liability
                            </SelectItem>
                          </>
                        )}
                        {formData.accountType === 'expense' && (
                          <>
                            <SelectItem value="operating_expense">
                              Operating Expense
                            </SelectItem>
                            <SelectItem value="administrative_expense">
                              Administrative Expense
                            </SelectItem>
                            <SelectItem value="payroll_expense">
                              Payroll Expense
                            </SelectItem>
                            <SelectItem value="overhead">Overhead</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Optional account description"
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isActive: checked })
                      }
                    />
                    <Label htmlFor="isActive">Active</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="allowManualEntries"
                      checked={formData.allowManualEntries}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, allowManualEntries: checked })
                      }
                    />
                    <Label htmlFor="allowManualEntries">
                      Allow Manual Entries
                    </Label>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingAccount ? 'Update Account' : 'Create Account'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search accounts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="asset">Assets</SelectItem>
                <SelectItem value="liability">Liabilities</SelectItem>
                <SelectItem value="equity">Equity</SelectItem>
                <SelectItem value="revenue">Revenue</SelectItem>
                <SelectItem value="cost_of_goods_sold">COGS</SelectItem>
                <SelectItem value="expense">Expenses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Accounts Table */}
      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">Loading accounts...</div>
          </CardContent>
        </Card>
      ) : accountsByType && Object.keys(accountsByType).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(accountsByType).map(([type, typeAccounts]: [string, any]) => (
            <Card key={type}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{getAccountTypeLabel(type as any)}</span>
                  <Badge className={getAccountTypeColor(type)}>
                    {typeAccounts.length} accounts
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Number</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead>Subtype</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {typeAccounts.map((account: any) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-mono">
                          {account.account_number}
                        </TableCell>
                        <TableCell className="font-medium">
                          {account.account_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {account.account_subtype.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(account.current_balance || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(account)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              No accounts found. Create your first account to get started.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
