import { useState } from 'react';
import { useBillPaymentsPage, NO_COMPANY_MESSAGE, type PayablesVendor } from '@/hooks/useAccountingPages';
import { ErrorState } from '@/components/common/ErrorState';
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
import { Checkbox } from '@/components/ui/checkbox';
import { CreditCard, Plus, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/utils/accountingUtils';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  billPaymentFormSchema,
  emptyBillPayment,
  type BillPaymentFormValues,
} from '@/lib/validations/accounting';

interface BillRecord {
  id: string;
  bill_number: string;
  vendor_id: string;
  vendor?: { id: string; name: string } | null;
  total_amount: number;
  amount_due: number;
  amount_paid: number | null;
  due_date: string;
  status: string;
  line_items?: unknown[];
}

interface BillPaymentRecord {
  id: string;
  payment_number: string;
  payment_date: string;
  vendor?: { name: string } | null;
  total_amount: number;
  payment_method: string;
  applications?: { amount_applied: number; bill: { bill_number: string } | null }[];
}

interface BillToPayApplication {
  billId: string;
  billNumber: string;
  vendorName: string;
  totalAmount: number;
  amountDue: number;
  amountToPay: number;
}

export default function BillPayments() {
  const page = useBillPaymentsPage();
  const { companyId, loadError } = page;
  const createPayment = page.create;

  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');

  const { data: bills } = page.bills;
  const { data: accounts } = page.accounts;
  const { data: vendors } = page.vendors;
  const { data: payments, isLoading: paymentsLoading } = page.payments;

  // Form state (US-268: react-hook-form + billPaymentFormSchema)
  const form = useForm<BillPaymentFormValues>({
    resolver: zodResolver(billPaymentFormSchema),
    defaultValues: emptyBillPayment(),
  });
  const billsToPayArray = form.watch('billsToPayArray');
  const paymentMethod = form.watch('paymentMethod');
  const billErrors = form.formState.errors.billsToPayArray;
  const billsMessage =
    (billErrors as { message?: string } | undefined)?.message ?? billErrors?.root?.message;
  const setBillsToPay = (next: BillToPayApplication[]) =>
    form.setValue('billsToPayArray', next, { shouldValidate: form.formState.isSubmitted });

  // Filter bills by selected vendor
  const filteredBills = selectedVendorId
    ? bills?.filter((bill: BillRecord) => bill.vendor_id === selectedVendorId)
    : bills;

  // Calculate total payment amount
  const totalPaymentAmount = billsToPayArray.reduce(
    (sum, app) => sum + app.amountToPay,
    0
  );

  // Toggle bill selection
  const toggleBillSelection = (bill: BillRecord, isSelected: boolean) => {
    if (isSelected) {
      const newApp: BillToPayApplication = {
        billId: bill.id,
        billNumber: bill.bill_number,
        vendorName: bill.vendor?.name || 'Unknown',
        totalAmount: bill.total_amount,
        amountDue: bill.amount_due,
        amountToPay: bill.amount_due, // Default to full amount
      };
      setBillsToPay([...billsToPayArray, newApp]);
    } else {
      setBillsToPay(billsToPayArray.filter(app => app.billId !== bill.id));
    }
  };

  // Update amount to pay for a bill
  const updateAmountToPay = (billId: string, amount: number) => {
    setBillsToPay(
      billsToPayArray.map(app =>
        app.billId === billId ? { ...app, amountToPay: amount } : app
      ),
    );
  };

  const handleSubmit = async (values: BillPaymentFormValues) => {
    if (!companyId) {
      toast.error(NO_COMPANY_MESSAGE);
      return;
    }
    // The vendor comes from the first bill; the dialog pays one vendor at a time.
    const firstBill = bills?.find((b: BillRecord) => b.id === values.billsToPayArray[0]?.billId);
    try {
      await createPayment.mutateAsync({
        vendorId: firstBill?.vendor_id,
        paymentDate: values.paymentDate,
        paymentMethod: values.paymentMethod,
        bankAccountId: values.bankAccountId,
        checkNumber: values.checkNumber,
        referenceNumber: values.referenceNumber,
        memo: values.memo,
        totalAmount: totalPaymentAmount,
        applications: values.billsToPayArray.map((app) => ({ billId: app.billId, amountToPay: app.amountToPay })),
      });
    } catch (error) {
      toast.error(`Failed to create payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return;
    }
    toast.success('Bill payment created successfully');
    setIsPayDialogOpen(false);
    form.reset(emptyBillPayment());
    setSelectedVendorId('');
  };

  // Bank accounts for selection
  const bankAccounts = accounts?.filter(a => a.is_bank_account) || [];

  // Calculate metrics
  const totalUnpaidBills = bills?.reduce((sum: number, bill: BillRecord) => sum + Number(bill.amount_due || 0), 0) || 0;
  const numberOfUnpaidBills = bills?.filter((bill: BillRecord) => Number(bill.amount_due) > 0).length || 0;

  return (
    <main className="container mx-auto py-6 space-y-6" role="main" aria-label="Bill Payments">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CreditCard className="h-8 w-8" aria-hidden="true" />
            Bill Payments
          </h1>
          <p className="text-muted-foreground mt-1">
            Pay vendor bills and track payment history
          </p>
        </div>

        <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
          <DialogTrigger asChild>
            <Button aria-label="Open pay bills dialog">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Pay Bills
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" aria-describedby="pay-bills-description">
            <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} noValidate aria-label="Pay bills form">
              <DialogHeader>
                <DialogTitle>Pay Bills</DialogTitle>
                <DialogDescription id="pay-bills-description">
                  Select bills to pay and enter payment details
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Payment Details */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="paymentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="check">Check</SelectItem>
                            <SelectItem value="ach">ACH</SelectItem>
                            <SelectItem value="wire">Wire Transfer</SelectItem>
                            <SelectItem value="credit_card">Credit Card</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="bankAccountId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank Account</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select bank account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {bankAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.account_number} - {account.account_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {paymentMethod === 'check' && (
                    <FormField
                      control={form.control}
                      name="checkNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Check Number</FormLabel>
                          <FormControl>
                            <Input placeholder="1001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {paymentMethod !== 'check' && (
                    <FormField
                      control={form.control}
                      name="referenceNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reference Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Transaction reference" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                {/* Vendor Filter */}
                <div className="space-y-2">
                  <Label htmlFor="vendorFilter">Filter by Vendor (Optional)</Label>
                  <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="All vendors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Vendors</SelectItem>
                      {vendors?.map((vendor: PayablesVendor) => (
                        <SelectItem key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Bills to Pay */}
                <div className="space-y-2">
                  <Label>Select Bills to Pay</Label>
                  <div className="border rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                          <TableHead className="w-[50px]"></TableHead>
                          <TableHead>Bill #</TableHead>
                          <TableHead>Vendor</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead className="text-right">Amount Due</TableHead>
                          <TableHead className="text-right">Amount to Pay</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBills && filteredBills.length > 0 ? (
                          filteredBills.map((bill: BillRecord) => {
                            const isSelected = billsToPayArray.some(
                              app => app.billId === bill.id
                            );
                            const appIndex = billsToPayArray.findIndex(
                              app => app.billId === bill.id
                            );
                            const application = appIndex >= 0 ? billsToPayArray[appIndex] : undefined;
                            const amountError = appIndex >= 0 ? billErrors?.[appIndex]?.amountToPay?.message : undefined;
                            const amountErrorId = `bill-pay-${bill.id}-amount-error`;

                            return (
                              <TableRow key={bill.id}>
                                <TableCell>
                                  <Checkbox
                                    aria-label={`Pay bill ${bill.bill_number}`}
                                    checked={isSelected}
                                    onCheckedChange={(checked) =>
                                      toggleBillSelection(bill, checked as boolean)
                                    }
                                  />
                                </TableCell>
                                <TableCell className="font-mono">{bill.bill_number}</TableCell>
                                <TableCell>{bill.vendor?.name || 'Unknown'}</TableCell>
                                <TableCell>
                                  {new Date(bill.due_date).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  {formatCurrency(bill.amount_due)}
                                </TableCell>
                                <TableCell>
                                  {isSelected ? (
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      max={bill.amount_due}
                                      value={application?.amountToPay || 0}
                                      onChange={(e) =>
                                        updateAmountToPay(bill.id, Number(e.target.value))
                                      }
                                      className="text-right"
                                      aria-label={`Amount to pay on bill ${bill.bill_number}`}
                                      aria-invalid={amountError ? true : undefined}
                                      aria-describedby={amountError ? amountErrorId : undefined}
                                    />
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                  {amountError && (
                                    <p id={amountErrorId} className="text-sm font-medium text-destructive mt-1">
                                      {amountError}
                                    </p>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground">
                              No open bills to pay
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {billsMessage && (
                    <p role="alert" className="text-sm font-medium text-destructive">{billsMessage}</p>
                  )}
                </div>

                {/* Total Payment */}
                {billsToPayArray.length > 0 && (
                  <div className="bg-primary/10 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-lg">Total Payment Amount:</span>
                      <span className="font-bold text-2xl">
                        {formatCurrency(totalPaymentAmount)}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Paying {billsToPayArray.length} bill(s)
                    </div>
                  </div>
                )}

                {/* Memo */}
                <FormField
                  control={form.control}
                  name="memo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Memo (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Payment notes..." rows={2} {...field} />
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
                  onClick={() => setIsPayDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={billsToPayArray.length === 0 || form.formState.isSubmitting}
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  Process Payment - {formatCurrency(totalPaymentAmount)}
                </Button>
              </DialogFooter>
            </form>
            </Form>
          </DialogContent>
        </Dialog>
      </header>

      {/* Metrics */}
      <section aria-label="Payment metrics" className="grid gap-4 md:grid-cols-3">
        <Card role="region" aria-label="Total unpaid bills">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Unpaid Bills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" aria-label={`${formatCurrency(totalUnpaidBills)} total unpaid`}>{formatCurrency(totalUnpaidBills)}</div>
            <p className="text-xs text-muted-foreground">{numberOfUnpaidBills} bills</p>
          </CardContent>
        </Card>

        <Card role="region" aria-label="Payments this month">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Payments This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground">0 payments</p>
          </CardContent>
        </Card>

        <Card role="region" aria-label="Average payment">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground">Per payment</p>
          </CardContent>
        </Card>
      </section>

      {/* Payment History */}
      <section aria-label="Payment history">
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>Recent bill payments</CardDescription>
          </CardHeader>
          <CardContent>
            {loadError ? (
              <ErrorState
                title="Bill payments could not be loaded"
                error={loadError}
                onRetry={() => {
                  void page.bills.refetch();
                  void page.accounts.refetch();
                  void page.vendors.refetch();
                  void page.payments.refetch();
                }}
              />
            ) : paymentsLoading ? (
              <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-8" />)}</div>
            ) : payments && payments.length > 0 ? (
              <Table aria-label="Payment history">
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Payment #</TableHead>
                    <TableHead scope="col">Date</TableHead>
                    <TableHead scope="col">Vendor</TableHead>
                    <TableHead scope="col">Method</TableHead>
                    <TableHead scope="col" className="text-right">Amount</TableHead>
                    <TableHead scope="col">Bills Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment: BillPaymentRecord) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono">{payment.payment_number}</TableCell>
                      <TableCell>
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{payment.vendor?.name || 'Unknown'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          <span className="sr-only">Payment method: </span>
                          {payment.payment_method.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <span className="sr-only">Amount: </span>
                        {formatCurrency(payment.total_amount)}
                      </TableCell>
                      <TableCell>
                        {payment.applications?.length || 0} bill(s)
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground" role="status">
                No payments recorded yet
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
