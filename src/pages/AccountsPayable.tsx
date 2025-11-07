import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBills, useCreateBill, useChartOfAccounts } from '@/hooks/useAccounting';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Trash2, Receipt, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/utils/accountingUtils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface BillLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  expenseAccountId: string;
}

export default function AccountsPayable() {
  const { user } = useAuth();
  const companyId = user?.user_metadata?.company_id;

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  // Fetch data
  const { data: bills, isLoading } = useBills(companyId, {
    status: filterStatus === 'all' ? undefined : filterStatus,
  });
  const { data: accounts } = useChartOfAccounts(companyId);
  const createBill = useCreateBill();

  // Fetch vendors
  const { data: vendors } = useQuery({
    queryKey: ['vendors', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('company_id', companyId)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Form state
  const [formData, setFormData] = useState({
    vendorId: '',
    billDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    vendorRefNumber: '',
    memo: '',
    lineItems: [] as BillLineItem[],
  });

  // Add line item
  const addLineItem = () => {
    const newItem: BillLineItem = {
      id: Math.random().toString(36).substr(2, 9),
      description: '',
      quantity: 1,
      unitPrice: 0,
      amount: 0,
      expenseAccountId: '',
    };
    setFormData({
      ...formData,
      lineItems: [...formData.lineItems, newItem],
    });
  };

  // Remove line item
  const removeLineItem = (itemId: string) => {
    setFormData({
      ...formData,
      lineItems: formData.lineItems.filter(item => item.id !== itemId),
    });
  };

  // Update line item
  const updateLineItem = (itemId: string, updates: Partial<BillLineItem>) => {
    setFormData({
      ...formData,
      lineItems: formData.lineItems.map(item => {
        if (item.id === itemId) {
          const updated = { ...item, ...updates };
          // Recalculate amount if quantity or unit price changed
          if ('quantity' in updates || 'unitPrice' in updates) {
            updated.amount = updated.quantity * updated.unitPrice;
          }
          return updated;
        }
        return item;
      }),
    });
  };

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = formData.lineItems.reduce((sum, item) => sum + item.amount, 0);
    return { subtotal, total: subtotal }; // Tax would be added here
  };

  const totals = calculateTotals();

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await createBill.mutateAsync({
      companyId,
      vendorId: formData.vendorId,
      billDate: formData.billDate,
      dueDate: formData.dueDate,
      vendorRefNumber: formData.vendorRefNumber,
      memo: formData.memo,
      lineItems: formData.lineItems.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
        expenseAccountId: item.expenseAccountId,
      })),
    });

    // Reset form
    setFormData({
      vendorId: '',
      billDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      vendorRefNumber: '',
      memo: '',
      lineItems: [],
    });
    setIsCreateDialogOpen(false);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      open: 'bg-blue-100 text-blue-800',
      partial: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      void: 'bg-red-100 text-red-800',
      overdue: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Calculate AP metrics
  const totalAP = bills?.reduce((sum: number, bill: any) => sum + Number(bill.amount_due || 0), 0) || 0;
  const overdueBills = bills?.filter((bill: any) => bill.status === 'overdue').length || 0;
  const openBills = bills?.filter((bill: any) => ['open', 'partial', 'overdue'].includes(bill.status)).length || 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Receipt className="h-8 w-8" />
            Accounts Payable
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage vendor bills and payments
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setFormData({
                vendorId: '',
                billDate: new Date().toISOString().split('T')[0],
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                vendorRefNumber: '',
                memo: '',
                lineItems: [{
                  id: Math.random().toString(36).substr(2, 9),
                  description: '',
                  quantity: 1,
                  unitPrice: 0,
                  amount: 0,
                  expenseAccountId: '',
                }],
              });
            }}>
              <Plus className="mr-2 h-4 w-4" />
              New Bill
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Create Bill</DialogTitle>
                <DialogDescription>
                  Enter a new vendor bill
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Header Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vendorId">Vendor</Label>
                    <Select
                      value={formData.vendorId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, vendorId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors?.map((vendor: any) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vendorRefNumber">Vendor Invoice #</Label>
                    <Input
                      id="vendorRefNumber"
                      value={formData.vendorRefNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, vendorRefNumber: e.target.value })
                      }
                      placeholder="INV-12345"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="billDate">Bill Date</Label>
                    <Input
                      id="billDate"
                      type="date"
                      value={formData.billDate}
                      onChange={(e) =>
                        setFormData({ ...formData, billDate: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) =>
                        setFormData({ ...formData, dueDate: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                {/* Line Items */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Line Items</Label>
                    <Button type="button" onClick={addLineItem} size="sm" variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Line
                    </Button>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Expense Account</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-[100px]">Qty</TableHead>
                          <TableHead className="w-[120px]">Unit Price</TableHead>
                          <TableHead className="text-right w-[120px]">Amount</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {formData.lineItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Select
                                value={item.expenseAccountId}
                                onValueChange={(value) =>
                                  updateLineItem(item.id, { expenseAccountId: value })
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Select account" />
                                </SelectTrigger>
                                <SelectContent>
                                  {accounts?.filter(a =>
                                    ['expense', 'cost_of_goods_sold', 'other_expense'].includes(a.account_type)
                                  ).map((account) => (
                                    <SelectItem key={account.id} value={account.id}>
                                      {account.account_number} - {account.account_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                value={item.description}
                                onChange={(e) =>
                                  updateLineItem(item.id, { description: e.target.value })
                                }
                                placeholder="Item description"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateLineItem(item.id, { quantity: Number(e.target.value) })
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unitPrice}
                                onChange={(e) =>
                                  updateLineItem(item.id, { unitPrice: Number(e.target.value) })
                                }
                              />
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(item.amount)}
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeLineItem(item.id)}
                                disabled={formData.lineItems.length <= 1}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Totals Row */}
                        <TableRow className="bg-muted/50 font-semibold">
                          <TableCell colSpan={4} className="text-right">
                            Total:
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(totals.total)}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="memo">Memo (Optional)</Label>
                  <Textarea
                    id="memo"
                    value={formData.memo}
                    onChange={(e) =>
                      setFormData({ ...formData, memo: e.target.value })
                    }
                    placeholder="Additional notes..."
                    rows={2}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!formData.vendorId || formData.lineItems.length === 0}>
                  Create Bill
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total AP</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAP)}</div>
            <p className="text-xs text-muted-foreground">{openBills} open bills</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overdue Bills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueBills}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground">Bills paid</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="partial">Partially Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bills List */}
      <Card>
        <CardHeader>
          <CardTitle>Bills</CardTitle>
          <CardDescription>All vendor bills</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading bills...</div>
          ) : bills && bills.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill Number</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Amount Due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.map((bill: any) => (
                  <TableRow key={bill.id}>
                    <TableCell className="font-mono">{bill.bill_number}</TableCell>
                    <TableCell>{bill.vendor?.name || 'Unknown'}</TableCell>
                    <TableCell>{new Date(bill.bill_date).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(bill.due_date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(bill.total_amount)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(bill.amount_due)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadge(bill.status)}>
                        {bill.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No bills found. Create your first bill to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
