import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBills, useChartOfAccounts } from '@/hooks/useAccounting';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

interface VendorRecord {
  id: string;
  name: string;
  [key: string]: unknown;
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

interface PaymentFormData {
  paymentDate: string;
  paymentMethod: string;
  bankAccountId: string;
  checkNumber: string;
  referenceNumber: string;
  memo: string;
  billsToPayArray: BillToPayApplication[];
  totalAmount?: number;
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
  const { user } = useAuth();
  const companyId = user?.user_metadata?.company_id;
  const queryClient = useQueryClient();

  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');

  // Fetch open bills
  const { data: bills } = useBills(companyId, {
    status: 'open',
  });

  // Fetch accounts (for bank account selection)
  const { data: accounts } = useChartOfAccounts(companyId);

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

  // Fetch bill payments
  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['bill-payments', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bill_payments')
        .select(`
          *,
          vendor:vendors(name),
          applications:bill_payment_applications(
            amount_applied,
            bill:bills(bill_number)
          )
        `)
        .eq('company_id', companyId)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  // Form state
  const [formData, setFormData] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'check',
    bankAccountId: '',
    checkNumber: '',
    referenceNumber: '',
    memo: '',
    billsToPayArray: [] as BillToPayApplication[],
  });

  // Filter bills by selected vendor
  const filteredBills = selectedVendorId
    ? bills?.filter((bill: BillRecord) => bill.vendor_id === selectedVendorId)
    : bills;

  // Calculate total payment amount
  const totalPaymentAmount = formData.billsToPayArray.reduce(
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
      setFormData({
        ...formData,
        billsToPayArray: [...formData.billsToPayArray, newApp],
      });
    } else {
      setFormData({
        ...formData,
        billsToPayArray: formData.billsToPayArray.filter(app => app.billId !== bill.id),
      });
    }
  };

  // Update amount to pay for a bill
  const updateAmountToPay = (billId: string, amount: number) => {
    setFormData({
      ...formData,
      billsToPayArray: formData.billsToPayArray.map(app =>
        app.billId === billId ? { ...app, amountToPay: amount } : app
      ),
    });
  };

  // Create bill payment mutation
  const createPayment = useMutation({
    mutationFn: async (paymentData: PaymentFormData) => {
      // payment_number is assigned by the set_bill_payment_number trigger
      // (US-310). This used to be `rpc('nextval', { sequence_name: ... })`,
      // which is pg_catalog.nextval(regclass): wrong schema for PostgREST to
      // expose and wrong argument shape, so it could never resolve and the
      // `throw seqError` on the next line meant no bill payment has ever been
      // recorded.

      // Get vendor ID from first bill
      const firstBill = bills?.find((b: BillRecord) => b.id === paymentData.billsToPayArray[0].billId);

      // Create payment
      const { data: payment, error: paymentError } = await supabase
        .from('bill_payments')
        .insert({
          company_id: companyId,
          payment_date: paymentData.paymentDate,
          vendor_id: firstBill?.vendor_id,
          total_amount: paymentData.totalAmount,
          payment_method: paymentData.paymentMethod,
          check_number: paymentData.checkNumber,
          reference_number: paymentData.referenceNumber,
          bank_account_id: paymentData.bankAccountId,
          memo: paymentData.memo,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Create payment applications
      const applications = paymentData.billsToPayArray.map((app: BillToPayApplication) => ({
        bill_payment_id: payment.id,
        bill_id: app.billId,
        company_id: companyId,
        amount_applied: app.amountToPay,
      }));

      const { error: appsError } = await supabase
        .from('bill_payment_applications')
        .insert(applications);

      if (appsError) throw appsError;

      // Update bill amounts_paid.
      //
      // This used to fall back to a direct update when the RPC failed, reading
      // amount_paid off the client's loaded copy of the bill and writing back
      // the sum. No migration defined apply_bill_payment, so that fallback was
      // the only path - and two payments applied to the same bill at once both
      // read the same amount_paid and both write the same total, losing one of
      // them in a ledger. apply_bill_payment now exists and does the
      // read-modify-write inside one UPDATE, under the row lock (US-310), so
      // the fallback is gone rather than kept as a lossy second chance.
      for (const app of paymentData.billsToPayArray) {
        const { error: updateError } = await supabase.rpc('apply_bill_payment', {
          p_bill_id: app.billId,
          p_amount: app.amountToPay,
        });

        if (updateError) {
          throw new Error(
            `Payment recorded but bill ${app.billId} could not be updated (${updateError.message}). ` +
              `The bill still shows the old balance and must be reconciled by hand.`,
          );
        }
      }

      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['bill-payments'] });
      toast.success('Bill payment created successfully');
      setIsPayDialogOpen(false);
      // Reset form
      setFormData({
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'check',
        bankAccountId: '',
        checkNumber: '',
        referenceNumber: '',
        memo: '',
        billsToPayArray: [],
      });
      setSelectedVendorId('');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to create payment: ${message}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.billsToPayArray.length === 0) {
      toast.error('Please select at least one bill to pay');
      return;
    }

    await createPayment.mutateAsync({
      ...formData,
      totalAmount: totalPaymentAmount,
    });
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
            <form onSubmit={handleSubmit} aria-label="Pay bills form">
              <DialogHeader>
                <DialogTitle>Pay Bills</DialogTitle>
                <DialogDescription id="pay-bills-description">
                  Select bills to pay and enter payment details
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Payment Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="paymentDate">Payment Date</Label>
                    <Input
                      id="paymentDate"
                      type="date"
                      value={formData.paymentDate}
                      onChange={(e) =>
                        setFormData({ ...formData, paymentDate: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Select
                      value={formData.paymentMethod}
                      onValueChange={(value) =>
                        setFormData({ ...formData, paymentMethod: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="ach">ACH</SelectItem>
                        <SelectItem value="wire">Wire Transfer</SelectItem>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankAccountId">Bank Account</Label>
                    <Select
                      value={formData.bankAccountId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, bankAccountId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select bank account" />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.account_number} - {account.account_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.paymentMethod === 'check' && (
                    <div className="space-y-2">
                      <Label htmlFor="checkNumber">Check Number</Label>
                      <Input
                        id="checkNumber"
                        value={formData.checkNumber}
                        onChange={(e) =>
                          setFormData({ ...formData, checkNumber: e.target.value })
                        }
                        placeholder="1001"
                      />
                    </div>
                  )}

                  {formData.paymentMethod !== 'check' && (
                    <div className="space-y-2">
                      <Label htmlFor="referenceNumber">Reference Number</Label>
                      <Input
                        id="referenceNumber"
                        value={formData.referenceNumber}
                        onChange={(e) =>
                          setFormData({ ...formData, referenceNumber: e.target.value })
                        }
                        placeholder="Transaction reference"
                      />
                    </div>
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
                      {vendors?.map((vendor: VendorRecord) => (
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
                            const isSelected = formData.billsToPayArray.some(
                              app => app.billId === bill.id
                            );
                            const application = formData.billsToPayArray.find(
                              app => app.billId === bill.id
                            );

                            return (
                              <TableRow key={bill.id}>
                                <TableCell>
                                  <Checkbox
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
                                    />
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
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
                </div>

                {/* Total Payment */}
                {formData.billsToPayArray.length > 0 && (
                  <div className="bg-primary/10 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-lg">Total Payment Amount:</span>
                      <span className="font-bold text-2xl">
                        {formatCurrency(totalPaymentAmount)}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Paying {formData.billsToPayArray.length} bill(s)
                    </div>
                  </div>
                )}

                {/* Memo */}
                <div className="space-y-2">
                  <Label htmlFor="memo">Memo (Optional)</Label>
                  <Textarea
                    id="memo"
                    value={formData.memo}
                    onChange={(e) =>
                      setFormData({ ...formData, memo: e.target.value })
                    }
                    placeholder="Payment notes..."
                    rows={2}
                  />
                </div>
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
                  disabled={formData.billsToPayArray.length === 0 || !formData.bankAccountId}
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  Process Payment - {formatCurrency(totalPaymentAmount)}
                </Button>
              </DialogFooter>
            </form>
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
            {paymentsLoading ? (
              <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-8 bg-muted animate-pulse rounded" />)}</div>
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
