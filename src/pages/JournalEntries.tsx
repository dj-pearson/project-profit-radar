import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useJournalEntries, useChartOfAccounts, useCreateJournalEntry, usePostJournalEntry } from '@/hooks/useAccounting';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Plus, Trash2, Calculator, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/utils/accountingUtils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { confirmAction } from "@/components/ui/confirm-dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  buildJournalEntryPayload,
  emptyJournalEntry,
  journalEntryFormSchema,
  newJournalLine,
  type JournalEntryFormValues,
  type JournalEntryLineValues,
} from '@/lib/validations/accounting';

export default function JournalEntries() {
  const { user } = useAuth();
  const companyId = user?.user_metadata?.company_id;

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  // Fetch data
  const { data: journalEntries, isLoading } = useJournalEntries(companyId, {
    status: filterStatus === 'all' ? undefined : filterStatus,
  });
  const { data: accounts } = useChartOfAccounts(companyId);
  const createEntry = useCreateJournalEntry();
  const postEntry = usePostJournalEntry();

  // Form state (US-268: react-hook-form + journalEntryFormSchema)
  const form = useForm<JournalEntryFormValues>({
    resolver: zodResolver(journalEntryFormSchema),
    defaultValues: emptyJournalEntry(),
  });
  const lines = form.watch('lines');
  const lineErrors = form.formState.errors.lines;
  const linesMessage =
    (lineErrors as { message?: string } | undefined)?.message ?? lineErrors?.root?.message;

  const setLines = (next: JournalEntryLineValues[]) =>
    form.setValue('lines', next, { shouldValidate: form.formState.isSubmitted });

  // Add a new line
  const addLine = () => setLines([...lines, newJournalLine()]);

  // Remove a line
  const removeLine = (lineId: string) => setLines(lines.filter(line => line.id !== lineId));

  // Update a line
  const updateLine = (lineId: string, updates: Partial<JournalEntryLineValues>) =>
    setLines(lines.map(line => (line.id === lineId ? { ...line, ...updates } : line)));

  // Calculate totals
  const calculateTotals = () => {
    const totalDebits = lines.reduce((sum, line) => sum + (Number(line.debitAmount) || 0), 0);
    const totalCredits = lines.reduce((sum, line) => sum + (Number(line.creditAmount) || 0), 0);
    const difference = totalDebits - totalCredits;
    const isBalanced = Math.abs(difference) < 0.01;

    return { totalDebits, totalCredits, difference, isBalanced };
  };

  const totals = calculateTotals();

  // Handle form submission
  const handleSubmit = async (values: JournalEntryFormValues) => {
    await createEntry.mutateAsync(buildJournalEntryPayload(companyId, values));

    // Reset form
    form.reset({ ...emptyJournalEntry(), lines: [] });
    setIsCreateDialogOpen(false);
  };

  const handlePostEntry = async (entryId: string) => {
    if (await confirmAction({ title: 'Are you sure you want to post this journal entry?', description: 'This will update account balances.', confirmLabel: 'Post entry' })) {
      await postEntry.mutateAsync(entryId);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      posted: 'bg-green-100 text-green-800',
      voided: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <main className="container mx-auto py-6 space-y-6" role="main" aria-label="Journal Entries">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calculator className="h-8 w-8" aria-hidden="true" />
            Journal Entries
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage manual journal entries
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button
              aria-label="Create new journal entry"
              onClick={() => form.reset(emptyJournalEntry())}
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              New Journal Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" aria-describedby="journal-entry-description">
            <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} noValidate aria-label="Create journal entry form">
              <DialogHeader>
                <DialogTitle>Create Journal Entry</DialogTitle>
                <DialogDescription id="journal-entry-description">
                  Create a manual journal entry with balanced debits and credits
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Header Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="entryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Entry Date *</FormLabel>
                        <FormControl>
                          <Input type="date" aria-required="true" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description *</FormLabel>
                        <FormControl>
                          <Input placeholder="E.g., Monthly depreciation" aria-required="true" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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

                {/* Journal Entry Lines */}
                <fieldset className="space-y-2" aria-describedby={linesMessage ? 'journal-lines-error' : undefined}>
                  <div className="flex items-center justify-between">
                    <legend className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Journal Entry Lines</legend>
                    <Button type="button" onClick={addLine} size="sm" variant="outline" aria-label="Add new journal entry line">
                      <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                      Add Line
                    </Button>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <Table aria-label="Journal entry lines">
                      <TableHeader>
                        <TableRow>
                          <TableHead scope="col" className="w-[250px]">Account</TableHead>
                          <TableHead scope="col">Description</TableHead>
                          <TableHead scope="col" className="text-right w-[120px]">Debit</TableHead>
                          <TableHead scope="col" className="text-right w-[120px]">Credit</TableHead>
                          <TableHead scope="col" className="w-[50px]"><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lines.map((line, index) => {
                          const accountError = lineErrors?.[index]?.accountId?.message;
                          const amountError = lineErrors?.[index]?.debitAmount?.message;
                          const accountErrorId = `journal-line-${line.id}-account-error`;
                          const amountErrorId = `journal-line-${line.id}-amount-error`;
                          return (
                          <TableRow key={line.id}>
                            <TableCell>
                              <Select
                                value={line.accountId}
                                onValueChange={(value) => {
                                  const account = accounts?.find(a => a.id === value);
                                  updateLine(line.id, {
                                    accountId: value,
                                    accountName: account?.account_name,
                                  });
                                }}
                              >
                                <SelectTrigger
                                  className="w-full"
                                  aria-label={`Select account for line ${index + 1}`}
                                  aria-invalid={accountError ? true : undefined}
                                  aria-describedby={accountError ? accountErrorId : undefined}
                                >
                                  <SelectValue placeholder="Select account" />
                                </SelectTrigger>
                                <SelectContent>
                                  {accounts?.map((account) => (
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
                                value={line.description}
                                onChange={(e) =>
                                  updateLine(line.id, { description: e.target.value })
                                }
                                placeholder="Line description"
                                aria-label={`Description for line ${index + 1}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={line.debitAmount || ''}
                                onChange={(e) =>
                                  updateLine(line.id, {
                                    debitAmount: Number(e.target.value),
                                    creditAmount: e.target.value ? 0 : line.creditAmount,
                                  })
                                }
                                className="text-right"
                                disabled={line.creditAmount > 0}
                                aria-label={`Debit for line ${index + 1}`}
                                aria-invalid={amountError ? true : undefined}
                                aria-describedby={amountError ? amountErrorId : undefined}
                              />
                              {amountError && (
                                <p id={amountErrorId} className="text-sm font-medium text-destructive mt-1">
                                  {amountError}
                                </p>
                              )}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={line.creditAmount || ''}
                                onChange={(e) =>
                                  updateLine(line.id, {
                                    creditAmount: Number(e.target.value),
                                    debitAmount: e.target.value ? 0 : line.debitAmount,
                                  })
                                }
                                className="text-right"
                                disabled={line.debitAmount > 0}
                                aria-label={`Credit for line ${index + 1}`}
                                aria-invalid={amountError ? true : undefined}
                                aria-describedby={amountError ? amountErrorId : undefined}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeLine(line.id)}
                                disabled={lines.length <= 2}
                                aria-label={`Remove line ${index + 1}`}
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          );
                        })}
                        {/* Totals Row */}
                        <TableRow className="bg-muted/50 font-semibold">
                          <TableCell colSpan={2} className="text-right">
                            Totals:
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="sr-only">Total debits: </span>
                            {formatCurrency(totals.totalDebits)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="sr-only">Total credits: </span>
                            {formatCurrency(totals.totalCredits)}
                          </TableCell>
                          <TableCell>
                            {totals.isBalanced ? (
                              <CheckCircle className="h-5 w-5 text-green-600" aria-label="Entry is balanced" />
                            ) : (
                              <span className="text-red-600 text-sm" role="alert">
                                Diff: {formatCurrency(Math.abs(totals.difference))}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  {linesMessage && totals.isBalanced && (
                    <p id="journal-lines-error" role="alert" className="text-sm font-medium text-destructive">
                      {linesMessage}
                    </p>
                  )}

                  {!totals.isBalanced && (
                    <Alert variant="destructive" role="alert" id={linesMessage ? 'journal-lines-error' : undefined}>
                      <AlertDescription>
                        Entry is not balanced. Debits must equal credits.
                        Difference: {formatCurrency(Math.abs(totals.difference))}
                      </AlertDescription>
                    </Alert>
                  )}
                </fieldset>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!totals.isBalanced || lines.length < 2 || form.formState.isSubmitting}>
                  Create Entry
                </Button>
              </DialogFooter>
            </form>
            </Form>
          </DialogContent>
        </Dialog>
      </header>

      {/* Filters */}
      <section aria-label="Entry filters">
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4" role="search" aria-label="Filter journal entries">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[200px]" aria-label="Filter by status">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="posted">Posted</SelectItem>
                  <SelectItem value="voided">Voided</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Journal Entries List */}
      <section aria-label="Journal entries list">
        <Card>
          <CardHeader>
            <CardTitle>Journal Entries</CardTitle>
            <CardDescription>
              View and manage all journal entries
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-8" />)}</div>
            ) : journalEntries && journalEntries.length > 0 ? (
              <VirtualizedTable
                aria-label="Journal entries"
                rows={journalEntries}
                getRowKey={(entry: any) => entry.id}
                columnCount={6}
                estimateRowHeight={53}
                header={
                  <>
                    <TableHead scope="col">Entry Number</TableHead>
                    <TableHead scope="col">Date</TableHead>
                    <TableHead scope="col">Description</TableHead>
                    <TableHead scope="col" className="text-right">Amount</TableHead>
                    <TableHead scope="col">Status</TableHead>
                    <TableHead scope="col" className="text-right">Actions</TableHead>
                  </>
                }
                renderCells={(entry: any) => {
                    const totalDebits = entry.lines?.reduce(
                      (sum: number, line: any) => sum + Number(line.debit_amount || 0),
                      0
                    ) || 0;

                    return (
                      <>
                        <TableCell className="font-mono">{entry.entry_number}</TableCell>
                        <TableCell>
                          {new Date(entry.entry_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{entry.description}</TableCell>
                        <TableCell className="text-right font-mono">
                          <span className="sr-only">Amount: </span>
                          {formatCurrency(totalDebits)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadge(entry.transaction_status)} aria-label={`Status: ${entry.transaction_status}`}>
                            {entry.transaction_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.transaction_status === 'draft' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePostEntry(entry.id)}
                              aria-label={`Post entry ${entry.entry_number}`}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                              Post
                            </Button>
                          )}
                        </TableCell>
                      </>
                    );
                }}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground" role="status">
                No journal entries found. Create your first entry to get started.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
