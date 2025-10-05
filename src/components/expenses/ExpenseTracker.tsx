import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { usePaginatedQuery } from '@/hooks/useSupabaseQuery';
import { useInsertMutation, useUpdateMutation, useDeleteMutation } from '@/hooks/useSupabaseMutation';
import { LoadingState, TableSkeleton } from '@/components/common/LoadingState';
import { ErrorState, EmptyState } from '@/components/common/ErrorState';
import { Pagination } from '@/components/common/Pagination';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Receipt, DollarSign, Calendar, Tag, FileText, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { expenseSchema, type ExpenseInput } from '@/lib/validations';

interface Expense {
  id: string;
  company_id: string;
  project_id?: string;
  category_id?: string;
  vendor_name?: string;
  amount: number;
  expense_date: string;
  payment_method?: string;
  payment_status?: string;
  description: string;
  receipt_file_path?: string;
  is_billable?: boolean;
  tax_amount?: number;
  created_at: string;
}

const EXPENSE_CATEGORIES = [
  'Materials',
  'Labor',
  'Equipment Rental',
  'Subcontractor',
  'Permits & Fees',
  'Insurance',
  'Utilities',
  'Office Supplies',
  'Marketing',
  'Travel',
  'Fuel',
  'Maintenance',
  'Professional Services',
  'Other',
];

const PAYMENT_METHODS = [
  'Cash',
  'Check',
  'Credit Card',
  'Debit Card',
  'Wire Transfer',
  'ACH',
  'Company Account',
];

export function ExpenseTracker({ projectId }: { projectId?: string }) {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Form with validation
  const {
    register,
    handleSubmit: handleFormSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      vendor_name: '',
      amount: 0,
      tax_amount: 0,
      expense_date: format(new Date(), 'yyyy-MM-dd'),
      payment_method: 'Credit Card',
      payment_status: 'pending',
      description: '',
      is_billable: false,
    }
  });

  const formValues = watch();

  // Fetch expenses
  const {
    data: expensesData,
    isLoading,
    error,
    refetch,
  } = usePaginatedQuery<Expense>({
    queryKey: ['expenses'],
    tableName: 'expenses',
    filters: projectId ? { project_id: projectId, company_id: userProfile?.company_id } : { company_id: userProfile?.company_id },
    orderBy: { column: 'expense_date', ascending: false },
    page,
    pageSize,
  });

  // Mutations
  const createExpense = useInsertMutation<Expense>({
    tableName: 'expenses',
    invalidateQueries: [['expenses']],
    successMessage: 'Expense recorded successfully',
  });

  const updateExpense = useUpdateMutation<Expense>({
    tableName: 'expenses',
    invalidateQueries: [['expenses']],
    successMessage: 'Expense updated successfully',
  });

  const deleteExpense = useDeleteMutation({
    tableName: 'expenses',
    invalidateQueries: [['expenses']],
    successMessage: 'Expense deleted successfully',
  });

  const onSubmit = async (data: ExpenseInput) => {
    if (!userProfile?.company_id) {
      toast({
        title: 'Error',
        description: 'User profile not loaded',
        variant: 'destructive',
      });
      return;
    }

    const expenseData = {
      company_id: userProfile.company_id,
      project_id: projectId || data.project_id || null,
      vendor_name: data.vendor_name,
      amount: data.amount,
      tax_amount: data.tax_amount || 0,
      expense_date: data.expense_date,
      payment_method: data.payment_method,
      payment_status: data.payment_status || 'pending',
      description: data.description || '',
      is_billable: data.is_billable || false,
      created_by: userProfile.id,
    };

    if (editingExpense) {
      updateExpense.mutate(
        { id: editingExpense.id, data: expenseData },
        {
          onSuccess: () => {
            setIsDialogOpen(false);
            resetForm();
          },
        }
      );
    } else {
      createExpense.mutate(expenseData as any, {
        onSuccess: () => {
          setIsDialogOpen(false);
          resetForm();
        },
      });
    }
  };

  const resetForm = () => {
    reset({
      vendor_name: '',
      amount: 0,
      tax_amount: 0,
      expense_date: format(new Date(), 'yyyy-MM-dd'),
      payment_method: 'Credit Card',
      payment_status: 'pending',
      description: '',
      is_billable: false,
    });
    setEditingExpense(null);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    reset({
      vendor_name: expense.vendor_name || '',
      amount: expense.amount,
      tax_amount: expense.tax_amount || 0,
      expense_date: expense.expense_date,
      payment_method: (expense.payment_method as any) || 'Credit Card',
      payment_status: (expense.payment_status as any) || 'pending',
      description: expense.description || '',
      is_billable: expense.is_billable || false,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      deleteExpense.mutate(id);
    }
  };

  const totalExpenses = expensesData?.data.reduce((sum, exp) => sum + exp.amount, 0) || 0;
  const totalPages = expensesData?.count ? Math.ceil(expensesData.count / pageSize) : 1;

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalExpenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {expensesData?.count || 0} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {expensesData?.data.filter((e) => e.payment_status === 'pending').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {expensesData?.data
                .filter((e) => new Date(e.expense_date).getMonth() === new Date().getMonth())
                .reduce((sum, e) => sum + e.amount, 0)
                .toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">Current month total</p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Expense Tracking</CardTitle>
              <CardDescription>
                Record and manage all project and company expenses
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                {Object.keys(errors).length > 0 && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Please fix the validation errors below
                    </AlertDescription>
                  </Alert>
                )}
                <form onSubmit={handleFormSubmit(onSubmit)}>
                  <DialogHeader>
                    <DialogTitle>
                      {editingExpense ? 'Edit Expense' : 'Record New Expense'}
                    </DialogTitle>
                    <DialogDescription>
                      Enter the expense details below
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="vendor_name">Vendor *</Label>
                        <Input
                          id="vendor_name"
                          placeholder="Vendor name"
                          {...register('vendor_name')}
                        />
                        {errors.vendor_name && (
                          <p className="text-sm text-destructive">{errors.vendor_name.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="amount">Amount *</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...register('amount', { valueAsNumber: true })}
                        />
                        {errors.amount && (
                          <p className="text-sm text-destructive">{errors.amount.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="tax_amount">Tax Amount</Label>
                        <Input
                          id="tax_amount"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...register('tax_amount', { valueAsNumber: true })}
                        />
                        {errors.tax_amount && (
                          <p className="text-sm text-destructive">{errors.tax_amount.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="expense_date">Date *</Label>
                        <Input
                          id="expense_date"
                          type="date"
                          {...register('expense_date')}
                        />
                        {errors.expense_date && (
                          <p className="text-sm text-destructive">{errors.expense_date.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="payment_method">Payment Method *</Label>
                        <Select
                          value={formValues.payment_method}
                          onValueChange={(value: any) => setValue('payment_method', value)}
                        >
                          <SelectTrigger id="payment_method">
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_METHODS.map((method) => (
                              <SelectItem key={method} value={method}>
                                {method}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.payment_method && (
                          <p className="text-sm text-destructive">{errors.payment_method.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="payment_status">Payment Status</Label>
                        <Select
                          value={formValues.payment_status}
                          onValueChange={(value: any) => setValue('payment_status', value)}
                        >
                          <SelectTrigger id="payment_status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="reimbursed">Reimbursed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_billable"
                        {...register('is_billable')}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="is_billable" className="text-sm font-normal">
                        This expense is billable to client
                      </Label>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Additional details..."
                        {...register('description')}
                        rows={3}
                      />
                      {errors.description && (
                        <p className="text-sm text-destructive">{errors.description.message}</p>
                      )}
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createExpense.isPending || updateExpense.isPending}
                    >
                      {editingExpense ? 'Update' : 'Create'} Expense
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} columns={7} />
          ) : expensesData?.data.length === 0 ? (
            <EmptyState
              title="No expenses recorded"
              description="Start tracking expenses by clicking the button above"
              icon={Receipt}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm font-medium text-muted-foreground">
                      <th className="p-4">Date</th>
                      <th className="p-4">Vendor</th>
                      <th className="p-4">Description</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Payment</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expensesData?.data.map((expense) => (
                      <tr key={expense.id} className="border-b hover:bg-muted/50">
                        <td className="p-4 text-sm">
                          {format(new Date(expense.expense_date), 'MMM dd, yyyy')}
                        </td>
                        <td className="p-4 text-sm">{expense.vendor_name || 'N/A'}</td>
                        <td className="p-4 text-sm text-muted-foreground max-w-xs truncate">
                          {expense.description || 'No description'}
                        </td>
                        <td className="p-4 text-sm font-medium">
                          ${expense.amount.toLocaleString()}
                          {expense.is_billable && (
                            <Badge variant="secondary" className="ml-2 text-xs">Billable</Badge>
                          )}
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {expense.payment_method || 'N/A'}
                        </td>
                        <td className="p-4">
                          <Badge
                            variant={
                              expense.payment_status === 'paid'
                                ? 'default'
                                : expense.payment_status === 'approved'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {expense.payment_status}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(expense)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(expense.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={expensesData?.count}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
