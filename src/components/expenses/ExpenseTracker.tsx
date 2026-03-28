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
import { AccessibleModal } from '@/components/accessibility/AccessibleModal';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit, Trash2, Receipt, DollarSign, Calendar, Tag, FileText, AlertCircle, Loader2, Download, CheckCircle, XCircle, FolderOpen } from 'lucide-react';
import { format } from 'date-fns';
import { expenseSchema, type ExpenseInput } from '@/lib/validations';
import { AccessibleTable, type TableColumn } from '@/components/accessibility/AccessibleTable';
import { supabase } from '@/integrations/supabase/client';

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
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [bulkCategory, setBulkCategory] = useState<string>('');

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

  const confirmDelete = (id: string) => {
    deleteExpense.mutate(id, {
      onSuccess: () => setDeletingExpenseId(null),
    });
  };

  // Filtered expenses
  const filteredExpenses = (expensesData?.data || []).filter((exp) => {
    if (categoryFilter !== 'all' && exp.description !== categoryFilter) return false;
    return true;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredExpenses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredExpenses.map((e) => e.id)));
    }
  };

  const handleBulkStatusUpdate = async (status: string) => {
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from('expenses')
      .update({ payment_status: status })
      .in('id', ids);

    if (error) {
      toast({ title: 'Error', description: `Failed to update expenses: ${error.message}`, variant: 'destructive' });
      return;
    }

    toast({ title: 'Success', description: `${ids.length} expense(s) marked as ${status}` });
    setSelectedIds(new Set());
    refetch();
  };

  const handleBulkExport = () => {
    const selected = filteredExpenses.filter((exp) => selectedIds.has(exp.id));
    const csvRows = [
      ['Date', 'Vendor', 'Description', 'Amount', 'Payment Method', 'Status'].join(','),
      ...selected.map((exp) =>
        [exp.expense_date, exp.vendor_name || '', `"${(exp.description || '').replace(/"/g, '""')}"`, exp.amount, exp.payment_method || '', exp.payment_status || ''].join(',')
      ),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: `${selected.length} expense(s) exported to CSV` });
  };

  const handleBulkCategorize = async () => {
    if (!bulkCategory) return;
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from('expenses')
      .update({ description: bulkCategory })
      .in('id', ids);

    if (error) {
      toast({ title: 'Error', description: `Failed to categorize expenses: ${error.message}`, variant: 'destructive' });
      return;
    }

    toast({ title: 'Success', description: `${ids.length} expense(s) categorized as ${bulkCategory}` });
    setSelectedIds(new Set());
    setBulkCategory('');
    refetch();
  };

  const totalExpenses = expensesData?.data.reduce((sum, exp) => sum + exp.amount, 0) || 0;
  const totalPages = expensesData?.count ? Math.ceil(expensesData.count / pageSize) : 1;

  const expenseColumns: TableColumn<Expense>[] = [
    {
      key: 'select' as any,
      header: 'Select',
      headerRender: () => (
        <Checkbox
          checked={filteredExpenses.length > 0 && selectedIds.size === filteredExpenses.length}
          onCheckedChange={toggleSelectAll}
          aria-label="Select all expenses"
        />
      ),
      render: (_value: any, row: Expense) => (
        <Checkbox
          checked={selectedIds.has(row.id)}
          onCheckedChange={() => toggleSelect(row.id)}
          aria-label={`Select expense from ${row.vendor_name || 'unknown vendor'}`}
        />
      ),
    },
    {
      key: 'expense_date',
      header: 'Date',
      sortable: true,
      render: (value) => format(new Date(value), 'MMM dd, yyyy'),
    },
    {
      key: 'vendor_name',
      header: 'Vendor',
      sortable: true,
      render: (value) => value || 'N/A',
    },
    {
      key: 'description',
      header: 'Description',
      hideOnMobile: true,
      render: (value) => (
        <span className="text-muted-foreground max-w-xs truncate block">
          {value || 'No description'}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      align: 'right',
      render: (value, row) => (
        <span className="font-medium">
          ${Number(value).toLocaleString()}
          {row.is_billable && (
            <Badge variant="secondary" className="ml-2 text-xs" aria-label="Billable expense">Billable</Badge>
          )}
        </span>
      ),
    },
    {
      key: 'payment_method',
      header: 'Payment',
      hideOnMobile: true,
      render: (value) => <span className="text-muted-foreground">{value || 'N/A'}</span>,
    },
    {
      key: 'payment_status',
      header: 'Status',
      render: (value) => (
        <Badge
          variant={value === 'paid' ? 'default' : value === 'approved' ? 'secondary' : 'outline'}
          aria-label={`Payment status: ${value}`}
        >
          {value}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      headerRender: () => <span className="sr-only">Actions</span>,
      render: (_value, expense) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => handleEdit(expense)} aria-label={`Edit expense from ${expense.vendor_name || 'unknown vendor'}`}>
            <Edit className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDeletingExpenseId(expense.id)} aria-label={`Delete expense from ${expense.vendor_name || 'unknown vendor'}`}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      ),
    },
  ];

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
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Category Filter */}
          <div className="flex items-center gap-3 flex-wrap mb-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="category-filter" className="text-sm whitespace-nowrap">Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger id="category-filter" className="w-[180px]">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {selectedIds.size > 0 && (
            <Card className="border-primary/20 bg-primary/5 mb-4">
              <CardContent className="py-3 flex items-center justify-between flex-wrap gap-2">
                <span className="text-sm font-medium">{selectedIds.size} selected</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => handleBulkStatusUpdate('approved')}>
                    <CheckCircle className="mr-1 h-4 w-4" />
                    Approve Selected
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleBulkStatusUpdate('rejected')}>
                    <XCircle className="mr-1 h-4 w-4" />
                    Reject Selected
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleBulkExport}>
                    <Download className="mr-1 h-4 w-4" />
                    Export Selected
                  </Button>
                  <div className="flex items-center gap-1">
                    <Select value={bulkCategory} onValueChange={setBulkCategory}>
                      <SelectTrigger className="w-[150px] h-8 text-sm">
                        <SelectValue placeholder="Category..." />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={handleBulkCategorize} disabled={!bulkCategory}>
                      <FolderOpen className="mr-1 h-4 w-4" />
                      Categorize
                    </Button>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Clear</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <TableSkeleton rows={5} columns={7} />
          ) : filteredExpenses.length === 0 ? (
            <EmptyState
              title="No expenses recorded"
              description="Start tracking expenses by clicking the button above"
              icon={Receipt}
            />
          ) : (
            <>
              <AccessibleTable<Expense>
                caption="Expenses"
                hideCaption
                columns={expenseColumns}
                data={filteredExpenses}
              />

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

      {/* Create/Edit Expense Modal */}
      <AccessibleModal
        isOpen={isDialogOpen}
        onClose={() => { setIsDialogOpen(false); resetForm(); }}
        title={editingExpense ? 'Edit Expense' : 'Record New Expense'}
        description="Enter the expense details below"
        size="lg"
        footer={
          <>
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
              form="expense-form"
              disabled={createExpense.isPending || updateExpense.isPending}
              className="gap-2"
            >
              {(createExpense.isPending || updateExpense.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {createExpense.isPending || updateExpense.isPending
                ? 'Saving...'
                : editingExpense ? 'Update Expense' : 'Create Expense'}
            </Button>
          </>
        }
      >
        {Object.keys(errors).length > 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please fix the validation errors below
            </AlertDescription>
          </Alert>
        )}
        <form id="expense-form" onSubmit={handleFormSubmit(onSubmit)}>
          <div className="grid gap-4">
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
        </form>
      </AccessibleModal>

      {/* Delete Confirmation Modal */}
      <AccessibleModal
        isOpen={!!deletingExpenseId}
        onClose={() => setDeletingExpenseId(null)}
        title="Delete Expense"
        description="Are you sure you want to delete this expense? This action cannot be undone."
        size="sm"
        disableClickOutside
        footer={
          <>
            <Button variant="outline" onClick={() => setDeletingExpenseId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deletingExpenseId && confirmDelete(deletingExpenseId)}
            >
              Delete
            </Button>
          </>
        }
      />
    </div>
  );
}
