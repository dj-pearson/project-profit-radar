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
import { VirtualizedTable } from '@/components/ui/virtual-table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Receipt } from 'lucide-react';
import { formatCurrency } from '@/utils/accountingUtils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  billFormSchema,
  buildBillPayload,
  emptyBill,
  newBillLineItem,
  type BillFormValues,
  type BillLineItemValues,
} from '@/lib/validations/accounting';

interface Vendor {
  id: string;
  name: string;
  address: string | null;
  company_id: string;
  contact_person: string | null;
  created_at: string;
  created_by: string | null;
  email: string | null;
  is_active: boolean;
  notes: string | null;
  payment_terms: string | null;
  phone: string | null;
  tax_id: string | null;
  updated_at: string;
}

interface Bill {
  id: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  status: string | null;
  total_amount: number;
  amount_due: number | null;
  amount_paid: number | null;
  vendor_id: string;
  vendor?: { id: string; name: string };
  memo: string | null;
  company_id: string;
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

  // Form state (US-268: react-hook-form + billFormSchema)
  const form = useForm<BillFormValues>({
    resolver: zodResolver(billFormSchema),
    defaultValues: emptyBill([]),
  });
  const lineItems = form.watch('lineItems');
  const lineItemErrors = form.formState.errors.lineItems;
  const lineItemsMessage =
    (lineItemErrors as { message?: string } | undefined)?.message ?? lineItemErrors?.root?.message;

  const setLineItems = (next: BillLineItemValues[]) =>
    form.setValue('lineItems', next, { shouldValidate: form.formState.isSubmitted });

  // Add line item
  const addLineItem = () => setLineItems([...lineItems, newBillLineItem()]);

  // Remove line item
  const removeLineItem = (itemId: string) => setLineItems(lineItems.filter(item => item.id !== itemId));

  // Update line item
  const updateLineItem = (itemId: string, updates: Partial<BillLineItemValues>) => {
    setLineItems(
      lineItems.map(item => {
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
    );
  };

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    return { subtotal, total: subtotal }; // Tax would be added here
  };

  const totals = calculateTotals();

  // Handle form submission
  const handleSubmit = async (values: BillFormValues) => {
    await createBill.mutateAsync(buildBillPayload(companyId, values));

    // Reset form
    form.reset(emptyBill([]));
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
  const totalAP = bills?.reduce((sum: number, bill: Bill) => sum + Number(bill.amount_due || 0), 0) || 0;
  const overdueBills = bills?.filter((bill: Bill) => bill.status === 'overdue').length || 0;
  const openBills = bills?.filter((bill: Bill) => ['open', 'partial', 'overdue'].includes(bill.status || '')).length || 0;

  return (
    <main className="container mx-auto py-6 space-y-6" role="main" aria-label="Accounts Payable">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Receipt className="h-8 w-8" aria-hidden="true" />
            Accounts Payable
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage vendor bills and payments
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button
              aria-label="Create new bill"
              onClick={() => form.reset(emptyBill())}
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              New Bill
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="create-bill-description">
            <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} noValidate aria-label="Create bill form">
              <DialogHeader>
                <DialogTitle>Create Bill</DialogTitle>
                <DialogDescription id="create-bill-description">
                  Enter a new vendor bill
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Header Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="vendorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vendor</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select vendor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {vendors?.map((vendor: Vendor) => (
                              <SelectItem key={vendor.id} value={vendor.id}>
                                {vendor.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vendorRefNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vendor Invoice #</FormLabel>
                        <FormControl>
                          <Input placeholder="INV-12345" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="billDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bill Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                        {lineItems.map((item, index) => {
                          const accountError = lineItemErrors?.[index]?.expenseAccountId?.message;
                          const accountErrorId = `bill-line-${item.id}-account-error`;
                          return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Select
                                value={item.expenseAccountId}
                                onValueChange={(value) =>
                                  updateLineItem(item.id, { expenseAccountId: value })
                                }
                              >
                                <SelectTrigger
                                  className="w-full"
                                  aria-label={`Expense account for line ${index + 1}`}
                                  aria-invalid={accountError ? true : undefined}
                                  aria-describedby={accountError ? accountErrorId : undefined}
                                >
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
                              {accountError && (
                                <p id={accountErrorId} className="text-sm font-medium text-destructive mt-1">
                                  {accountError}
                                </p>
                              )}
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
                                disabled={lineItems.length <= 1}
                                aria-label={`Remove line ${index + 1}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          );
                        })}
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
                  {lineItemsMessage && (
                    <p role="alert" className="text-sm font-medium text-destructive">{lineItemsMessage}</p>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="memo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Memo (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional notes..." rows={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={lineItems.length === 0 || form.formState.isSubmitting}>
                  Create Bill
                </Button>
              </DialogFooter>
            </form>
            </Form>
          </DialogContent>
        </Dialog>
      </header>

      {/* Metrics */}
      <section aria-label="Accounts payable metrics" className="grid gap-4 md:grid-cols-3">
        <Card role="region" aria-label="Total accounts payable">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total AP</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" aria-label={`${formatCurrency(totalAP)} total accounts payable`}>{formatCurrency(totalAP)}</div>
            <p className="text-xs text-muted-foreground">{openBills} open bills</p>
          </CardContent>
        </Card>

        <Card role="region" aria-label="Overdue bills">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overdue Bills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" aria-label={`${overdueBills} overdue bills`}>{overdueBills}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card role="region" aria-label="This month's payments">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground">Bills paid</p>
          </CardContent>
        </Card>
      </section>

      {/* Filters */}
      <section aria-label="Bill filters">
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4" role="search" aria-label="Filter bills">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[200px]" aria-label="Filter by status">
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
      </section>

      {/* Bills List */}
      <section aria-label="Bills list">
        <Card>
          <CardHeader>
            <CardTitle>Bills</CardTitle>
            <CardDescription>All vendor bills</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-8" />)}</div>
            ) : bills && bills.length > 0 ? (
              <VirtualizedTable
                aria-label="Vendor bills"
                rows={bills}
                getRowKey={(bill: Bill) => bill.id}
                columnCount={7}
                estimateRowHeight={53}
                header={
                  <>
                    <TableHead scope="col">Bill Number</TableHead>
                    <TableHead scope="col">Vendor</TableHead>
                    <TableHead scope="col">Date</TableHead>
                    <TableHead scope="col">Due Date</TableHead>
                    <TableHead scope="col" className="text-right">Amount</TableHead>
                    <TableHead scope="col" className="text-right">Amount Due</TableHead>
                    <TableHead scope="col">Status</TableHead>
                  </>
                }
                renderCells={(bill: Bill) => (
                    <>
                      <TableCell className="font-mono">{bill.bill_number}</TableCell>
                      <TableCell>{bill.vendor?.name || 'Unknown'}</TableCell>
                      <TableCell>{new Date(bill.bill_date).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(bill.due_date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right font-mono">
                        <span className="sr-only">Total amount: </span>
                        {formatCurrency(bill.total_amount)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <span className="sr-only">Amount due: </span>
                        {formatCurrency(bill.amount_due)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(bill.status)} aria-label={`Status: ${bill.status}`}>
                          {bill.status}
                        </Badge>
                      </TableCell>
                    </>
                )}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground" role="status">
                No bills found. Create your first bill to get started.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
