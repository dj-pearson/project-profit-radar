import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePaginatedQuery } from '@/hooks/useSupabaseQuery';
import { useInsertMutation, useUpdateMutation, useDeleteMutation } from '@/hooks/useSupabaseMutation';
import { TableSkeleton } from '@/components/common/LoadingState';
import { ErrorState, EmptyState } from '@/components/common/ErrorState';
import { Pagination } from '@/components/common/Pagination';
import { AccessibleModal } from '@/components/accessibility/AccessibleModal';
import { Plus, Edit, Trash2, Receipt, DollarSign, Calendar, AlertCircle, Loader2, CheckCircle2, XCircle, Download, FolderInput, X } from 'lucide-react';
import { format } from 'date-fns';
import { expenseSchema, type ExpenseInput } from '@/lib/validations';
import { AccessibleTable, type TableColumn } from '@/components/accessibility/AccessibleTable';

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

  // Sorting / filtering / bulk-selection state (US-089).
  const [sortColumn, setSortColumn] = useState('expense_date');
  const [sortAsc, setSortAsc] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [categorizeValue, setCategorizeValue] = useState('');

  const resetPage = () => setPage(1);

  // Projects for the project filter dropdown.
  const { data: projectsList } = usePaginatedQuery<{ id: string; name: string }>({
    queryKey: ['expense-filter-projects'],
    tableName: 'projects',
    select: 'id,name',
    filters: { company_id: userProfile?.company_id },
    orderBy: { column: 'name', ascending: true },
    page: 1,
    pageSize: 200,
    showErrorToast: false,
  });

  // Expense categories (category_id is a UUID FK to expense_categories).
  const { data: categoriesList } = usePaginatedQuery<{ id: string; name: string }>({
    queryKey: ['expense-filter-categories'],
    tableName: 'expense_categories',
    select: 'id,name',
    filters: { company_id: userProfile?.company_id },
    orderBy: { column: 'name', ascending: true },
    page: 1,
    pageSize: 200,
    showErrorToast: false,
  });
  const expenseCategories = categoriesList?.data || [];

  // Fetch expenses (server-side sort + equality + amount-range filters).
  const {
    data: expensesData,
    isLoading,
    error,
    refetch,
  } = usePaginatedQuery<Expense>({
    queryKey: ['expenses'],
    tableName: 'expenses',
    filters: {
      company_id: userProfile?.company_id,
      ...(projectId ? { project_id: projectId } : projectFilter !== 'all' ? { project_id: projectFilter } : {}),
      ...(categoryFilter !== 'all' ? { category_id: categoryFilter } : {}),
    },
    rangeFilters: [{ column: 'amount', gte: amountMin || undefined, lte: amountMax || undefined }],
    orderBy: { column: sortColumn, ascending: sortAsc },
    page,
    pageSize,
  });

  const pageExpenses = expensesData?.data || [];
  const allPageSelected = pageExpenses.length > 0 && pageExpenses.every((e) => selectedIds.has(e.id));

  const runBulkPaymentStatus = async (status: 'approved' | 'rejected') => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBulkLoading(true);
    try {
      const { error: err } = await supabase.from('expenses').update({ payment_status: status }).in('id', ids);
      if (err) throw err;
      toast({ title: 'Expenses updated', description: `${ids.length} ${status}.` });
      setSelectedIds(new Set());
      refetch();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Bulk update failed', description: err.message });
    } finally {
      setBulkLoading(false);
    }
  };

  const runBulkCategorize = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0 || !categorizeValue) return;
    setBulkLoading(true);
    try {
      const { error: err } = await supabase.from('expenses').update({ category_id: categorizeValue }).in('id', ids);
      if (err) throw err;
      const catName = (categoriesList?.data || []).find((c) => c.id === categorizeValue)?.name || 'the selected category';
      toast({ title: 'Expenses categorized', description: `${ids.length} set to ${catName}.` });
      setSelectedIds(new Set());
      setCategorizeValue('');
      refetch();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Categorize failed', description: err.message });
    } finally {
      setBulkLoading(false);
    }
  };

  const bulkExportExpenses = () => {
    const rows = pageExpenses.filter((e) => selectedIds.has(e.id));
    if (rows.length === 0) return;
    const headers = ['Date', 'Vendor', 'Description', 'Amount', 'Payment Method', 'Status'];
    const csv = [
      headers.join(','),
      ...rows.map((r) =>
        [r.expense_date, r.vendor_name, r.description, r.amount, r.payment_method, r.payment_status]
          .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
          .join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

  const totalExpenses = expensesData?.data.reduce((sum, exp) => sum + exp.amount, 0) || 0;
  const totalPages = expensesData?.count ? Math.ceil(expensesData.count / pageSize) : 1;

  const expenseColumns: TableColumn<Expense>[] = [
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
      sortable: true,
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

  const filterBar = (
    <div className="flex flex-wrap items-end gap-3 mb-4">
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Category</label>
        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); resetPage(); }}>
          <SelectTrigger className="w-[160px]" aria-label="Filter by category"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {expenseCategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {!projectId && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Project</label>
          <Select value={projectFilter} onValueChange={(v) => { setProjectFilter(v); resetPage(); }}>
            <SelectTrigger className="w-[170px]" aria-label="Filter by project"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {(projectsList?.data || []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Min $</label>
        <Input type="number" inputMode="decimal" value={amountMin} onChange={(e) => { setAmountMin(e.target.value); resetPage(); }} className="w-[110px]" aria-label="Minimum amount" />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Max $</label>
        <Input type="number" inputMode="decimal" value={amountMax} onChange={(e) => { setAmountMax(e.target.value); resetPage(); }} className="w-[110px]" aria-label="Maximum amount" />
      </div>
      {(categoryFilter !== 'all' || projectFilter !== 'all' || amountMin || amountMax) && (
        <Button variant="ghost" size="sm" onClick={() => { setCategoryFilter('all'); setProjectFilter('all'); setAmountMin(''); setAmountMax(''); resetPage(); }}>
          <X className="h-4 w-4 mr-1" /> Clear
        </Button>
      )}
    </div>
  );

  const bulkToolbar = selectedIds.size > 0 && (
    <div role="region" aria-label="Bulk actions" className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-lg border bg-muted/40">
      <span className="text-sm font-medium">{selectedIds.size} selected</span>
      <Button size="sm" variant="outline" disabled={bulkLoading} onClick={() => runBulkPaymentStatus('approved')}>
        <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
      </Button>
      <Button size="sm" variant="outline" disabled={bulkLoading} onClick={() => runBulkPaymentStatus('rejected')}>
        <XCircle className="h-4 w-4 mr-1" /> Reject
      </Button>
      <Button size="sm" variant="outline" disabled={bulkLoading} onClick={bulkExportExpenses}>
        <Download className="h-4 w-4 mr-1" /> Export
      </Button>
      <div className="flex items-center gap-1">
        <Select value={categorizeValue} onValueChange={setCategorizeValue}>
          <SelectTrigger className="w-[150px] h-8" aria-label="Category to apply"><SelectValue placeholder="Categorize as…" /></SelectTrigger>
          <SelectContent>
            {expenseCategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" disabled={bulkLoading || !categorizeValue} onClick={runBulkCategorize}>
          <FolderInput className="h-4 w-4 mr-1" /> Apply
        </Button>
      </div>
      <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelectedIds(new Set())}>Clear</Button>
    </div>
  );

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
          {filterBar}
          {bulkToolbar}
          {isLoading ? (
            <TableSkeleton rows={5} columns={7} />
          ) : pageExpenses.length === 0 ? (
            <EmptyState
              title="No expenses found"
              description="Adjust your filters or start tracking expenses with the button above"
              icon={Receipt}
            />
          ) : (
            <>
              <AccessibleTable<Expense>
                caption="Expenses"
                hideCaption
                columns={expenseColumns}
                data={pageExpenses}
                onSort={(column, direction) => { setSortColumn(column); setSortAsc(direction === 'ascending'); resetPage(); }}
                sortColumn={sortColumn}
                sortDirection={sortAsc ? 'ascending' : 'descending'}
                selectable
                selectedRows={[...selectedIds]}
                onSelectionChange={(ids) => setSelectedIds(new Set(ids as string[]))}
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
