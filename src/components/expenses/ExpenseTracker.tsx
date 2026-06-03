import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
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
import { useToast } from '@/hooks/use-toast';
import { usePaginatedQuery } from '@/hooks/useSupabaseQuery';
import { useInsertMutation, useUpdateMutation, useDeleteMutation } from '@/hooks/useSupabaseMutation';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { LoadingState, TableSkeleton } from '@/components/common/LoadingState';
import { ErrorState, EmptyState } from '@/components/common/ErrorState';
import { Pagination } from '@/components/common/Pagination';
import { AccessibleModal } from '@/components/accessibility/AccessibleModal';
import { Plus, Edit, Trash2, Receipt, DollarSign, Calendar, Tag, FileText, AlertCircle, Loader2, CheckCircle2, XCircle, Download, X } from 'lucide-react';
import { format } from 'date-fns';
import { expenseSchema, type ExpenseInput } from '@/lib/validations';
import { AccessibleTable, type TableColumn, type SortDirection } from '@/components/accessibility/AccessibleTable';

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

  // US-089: sort, filter, selection, and bulk-action state.
  const [sortColumn, setSortColumn] = useState<string>('expense_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('descending');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [amountMin, setAmountMin] = useState<string>('');
  const [amountMax, setAmountMax] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCategorizeDialog, setShowCategorizeDialog] = useState(false);
  const [categorizeChoice, setCategorizeChoice] = useState<string>('');
  const [bulkBusy, setBulkBusy] = useState(false);

  // Lookup data for the category + project filters / categorize dialog.
  const { data: categories = [] } = useQuery({
    queryKey: ['expense_categories', userProfile?.company_id],
    enabled: !!userProfile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('id, name')
        .eq('company_id', userProfile!.company_id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-for-expense-filter', userProfile?.company_id],
    enabled: !!userProfile?.company_id && !projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('company_id', userProfile!.company_id)
        .order('name');
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
  });

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
  const effectiveProjectId = projectId || (projectFilter !== 'all' ? projectFilter : undefined);
  const queryFilters: Record<string, string> = { company_id: userProfile?.company_id ?? '' };
  if (effectiveProjectId) queryFilters.project_id = effectiveProjectId;
  if (categoryFilter !== 'all') queryFilters.category_id = categoryFilter;

  const {
    data: expensesData,
    isLoading,
    error,
    refetch,
  } = usePaginatedQuery<Expense>({
    queryKey: ['expenses'],
    tableName: 'expenses',
    filters: queryFilters,
    rangeFilters: [{ column: 'amount', gte: amountMin || undefined, lte: amountMax || undefined }],
    orderBy: { column: sortColumn, ascending: sortDirection !== 'descending' },
    page,
    pageSize,
  });

  const expenses = expensesData?.data ?? [];

  // MARK: sorting + selection helpers

  const handleSort = (column: string, direction: SortDirection) => {
    // Server-side ordering needs a concrete column; treat 'none' as the default date sort.
    if (direction === 'none') {
      setSortColumn('expense_date');
      setSortDirection('descending');
    } else {
      setSortColumn(column);
      setSortDirection(direction);
    }
    setPage(1);
  };

  const allSelected = expenses.length > 0 && expenses.every((e) => selectedIds.has(e.id));
  const someSelected = expenses.some((e) => selectedIds.has(e.id)) && !allSelected;

  const toggleOne = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelectedIds((prev) => (expenses.every((e) => prev.has(e.id)) ? new Set() : new Set(expenses.map((e) => e.id))));

  const clearSelection = () => setSelectedIds(new Set());

  const resetFilters = () => {
    setCategoryFilter('all');
    setProjectFilter('all');
    setAmountMin('');
    setAmountMax('');
    setPage(1);
  };

  const hasActiveFilters = categoryFilter !== 'all' || projectFilter !== 'all' || amountMin !== '' || amountMax !== '';

  // MARK: bulk actions

  const bulkSetStatus = async (status: 'approved' | 'rejected') => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      const patch =
        status === 'approved'
          ? { payment_status: 'approved', approved_at: new Date().toISOString(), approved_by: userProfile?.id ?? null }
          : { payment_status: 'rejected', approved_at: null, approved_by: null };
      const { error } = await supabase.from('expenses').update(patch).in('id', ids);
      if (error) throw error;
      toast({ title: 'Expenses updated', description: `${ids.length} expense(s) ${status}.` });
      clearSelection();
      refetch();
    } catch (err) {
      logger.error('Bulk expense status update failed', err instanceof Error ? err : undefined);
      toast({ title: 'Error', description: 'Failed to update expenses.', variant: 'destructive' });
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkCategorize = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || !categorizeChoice) return;
    setBulkBusy(true);
    try {
      const { error } = await supabase.from('expenses').update({ category_id: categorizeChoice }).in('id', ids);
      if (error) throw error;
      const name = categories.find((c) => c.id === categorizeChoice)?.name ?? 'category';
      toast({ title: 'Expenses categorized', description: `${ids.length} expense(s) set to ${name}.` });
      clearSelection();
      setShowCategorizeDialog(false);
      setCategorizeChoice('');
      refetch();
    } catch (err) {
      logger.error('Bulk expense categorize failed', err instanceof Error ? err : undefined);
      toast({ title: 'Error', description: 'Failed to categorize expenses.', variant: 'destructive' });
    } finally {
      setBulkBusy(false);
    }
  };

  const exportSelectedCsv = () => {
    const selected = expenses.filter((e) => selectedIds.has(e.id));
    if (selected.length === 0) return;
    const catName = (id?: string) => categories.find((c) => c.id === id)?.name ?? '';
    const headers = ['Date', 'Vendor', 'Description', 'Category', 'Amount', 'Payment Method', 'Status'];
    const rows = selected.map((e) => [
      e.expense_date ?? '',
      e.vendor_name ?? '',
      e.description ?? '',
      catName(e.category_id),
      e.amount ?? '',
      e.payment_method ?? '',
      e.payment_status ?? '',
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: `${selected.length} expense(s) exported to CSV.` });
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
      key: 'select',
      header: 'Select',
      width: '2.5rem',
      headerRender: () => (
        <Checkbox
          checked={allSelected ? true : someSelected ? 'indeterminate' : false}
          onCheckedChange={toggleAll}
          aria-label={allSelected ? 'Deselect all expenses' : 'Select all expenses'}
        />
      ),
      render: (_value, expense) => (
        <Checkbox
          checked={selectedIds.has(expense.id)}
          onCheckedChange={() => toggleOne(expense.id)}
          aria-label={`Select expense from ${expense.vendor_name || 'unknown vendor'}`}
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
      sortable: true,
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
          variant={value === 'paid' ? 'default' : value === 'approved' ? 'secondary' : value === 'rejected' ? 'destructive' : 'outline'}
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
          {/* Filters: category, project, amount range */}
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Category</Label>
              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
                <SelectTrigger className="w-44" aria-label="Filter by category"><SelectValue placeholder="All categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {!projectId && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Project</Label>
                <Select value={projectFilter} onValueChange={(v) => { setProjectFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-44" aria-label="Filter by project"><SelectValue placeholder="All projects" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All projects</SelectItem>
                    {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Amount range</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="Min"
                  className="w-28"
                  value={amountMin}
                  onChange={(e) => { setAmountMin(e.target.value); setPage(1); }}
                  aria-label="Minimum amount"
                />
                <span className="text-muted-foreground" aria-hidden="true">–</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="Max"
                  className="w-28"
                  value={amountMax}
                  onChange={(e) => { setAmountMax(e.target.value); setPage(1); }}
                  aria-label="Maximum amount"
                />
              </div>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>Clear filters</Button>
            )}
          </div>

          {/* Bulk actions toolbar — shown when at least one expense is selected */}
          {selectedIds.size > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
              <span className="text-sm font-medium">{selectedIds.size} selected</span>
              <div className="flex-1" />
              <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => bulkSetStatus('approved')}>
                <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />Approve Selected
              </Button>
              <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => bulkSetStatus('rejected')}>
                <XCircle className="mr-2 h-4 w-4" aria-hidden="true" />Reject Selected
              </Button>
              <Button size="sm" variant="outline" disabled={bulkBusy} onClick={exportSelectedCsv}>
                <Download className="mr-2 h-4 w-4" aria-hidden="true" />Export Selected
              </Button>
              <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => setShowCategorizeDialog(true)}>
                <Tag className="mr-2 h-4 w-4" aria-hidden="true" />Categorize Selected
              </Button>
              <Button size="sm" variant="ghost" onClick={clearSelection} aria-label="Clear selection">
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          )}

          {isLoading ? (
            <TableSkeleton rows={5} columns={7} />
          ) : expenses.length === 0 ? (
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
                data={expenses}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
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

      {/* Bulk Categorize Modal */}
      <AccessibleModal
        isOpen={showCategorizeDialog}
        onClose={() => { setShowCategorizeDialog(false); setCategorizeChoice(''); }}
        title={`Categorize ${selectedIds.size} expense${selectedIds.size > 1 ? 's' : ''}`}
        description="Choose a category to apply to the selected expenses."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => { setShowCategorizeDialog(false); setCategorizeChoice(''); }}>
              Cancel
            </Button>
            <Button disabled={!categorizeChoice || bulkBusy} onClick={bulkCategorize} className="gap-2">
              {bulkBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              Apply
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <Label htmlFor="bulk-category">Category</Label>
          <Select value={categorizeChoice} onValueChange={setCategorizeChoice}>
            <SelectTrigger id="bulk-category"><SelectValue placeholder="Select a category" /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {categories.length === 0 && (
            <p className="text-sm text-muted-foreground">No categories defined yet.</p>
          )}
        </div>
      </AccessibleModal>
    </div>
  );
}
