import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useJournalEntries, useChartOfAccounts, useCreateJournalEntry, usePostJournalEntry } from '@/hooks/useAccounting';
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
import { Plus, Trash2, Calculator, FileText, CheckCircle } from 'lucide-react';
import { formatCurrency, validateJournalEntry } from '@/utils/accountingUtils';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface JournalEntryLine {
  id: string;
  accountId: string;
  accountName?: string;
  debitAmount: number;
  creditAmount: number;
  description: string;
}

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

  // Form state
  const [formData, setFormData] = useState({
    entryDate: new Date().toISOString().split('T')[0],
    description: '',
    memo: '',
    lines: [] as JournalEntryLine[],
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Add a new line
  const addLine = () => {
    const newLine: JournalEntryLine = {
      id: Math.random().toString(36).substr(2, 9),
      accountId: '',
      debitAmount: 0,
      creditAmount: 0,
      description: '',
    };
    setFormData({
      ...formData,
      lines: [...formData.lines, newLine],
    });
  };

  // Remove a line
  const removeLine = (lineId: string) => {
    setFormData({
      ...formData,
      lines: formData.lines.filter(line => line.id !== lineId),
    });
  };

  // Update a line
  const updateLine = (lineId: string, updates: Partial<JournalEntryLine>) => {
    setFormData({
      ...formData,
      lines: formData.lines.map(line =>
        line.id === lineId ? { ...line, ...updates } : line
      ),
    });
  };

  // Calculate totals
  const calculateTotals = () => {
    const totalDebits = formData.lines.reduce((sum, line) => sum + (Number(line.debitAmount) || 0), 0);
    const totalCredits = formData.lines.reduce((sum, line) => sum + (Number(line.creditAmount) || 0), 0);
    const difference = totalDebits - totalCredits;
    const isBalanced = Math.abs(difference) < 0.01;

    return { totalDebits, totalCredits, difference, isBalanced };
  };

  const totals = calculateTotals();

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const validation = validateJournalEntry({
      entryDate: formData.entryDate,
      description: formData.description,
      lines: formData.lines.map(l => ({
        accountId: l.accountId,
        debitAmount: Number(l.debitAmount) || 0,
        creditAmount: Number(l.creditAmount) || 0,
        description: l.description,
      })),
    });

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }

    setValidationErrors([]);

    // Submit
    await createEntry.mutateAsync({
      companyId,
      entryDate: formData.entryDate,
      description: formData.description,
      memo: formData.memo,
      lines: formData.lines.map(line => ({
        accountId: line.accountId,
        debitAmount: Number(line.debitAmount) || 0,
        creditAmount: Number(line.creditAmount) || 0,
        description: line.description,
      })),
    });

    // Reset form
    setFormData({
      entryDate: new Date().toISOString().split('T')[0],
      description: '',
      memo: '',
      lines: [],
    });
    setIsCreateDialogOpen(false);
  };

  const handlePostEntry = async (entryId: string) => {
    if (confirm('Are you sure you want to post this journal entry? This will update account balances.')) {
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
              onClick={() => {
                setFormData({
                  entryDate: new Date().toISOString().split('T')[0],
                  description: '',
                  memo: '',
                  lines: [
                    {
                      id: Math.random().toString(36).substr(2, 9),
                      accountId: '',
                      debitAmount: 0,
                      creditAmount: 0,
                      description: '',
                    },
                    {
                      id: Math.random().toString(36).substr(2, 9),
                      accountId: '',
                      debitAmount: 0,
                      creditAmount: 0,
                      description: '',
                    },
                  ],
                });
                setValidationErrors([]);
              }}
            >
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              New Journal Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" aria-describedby="journal-entry-description">
            <form onSubmit={handleSubmit} aria-label="Create journal entry form">
              <DialogHeader>
                <DialogTitle>Create Journal Entry</DialogTitle>
                <DialogDescription id="journal-entry-description">
                  Create a manual journal entry with balanced debits and credits
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      <ul className="list-disc pl-4">
                        {validationErrors.map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Header Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="entryDate">Entry Date *</Label>
                    <Input
                      id="entryDate"
                      type="date"
                      value={formData.entryDate}
                      onChange={(e) =>
                        setFormData({ ...formData, entryDate: e.target.value })
                      }
                      required
                      aria-required="true"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="E.g., Monthly depreciation"
                      required
                      aria-required="true"
                    />
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

                {/* Journal Entry Lines */}
                <fieldset className="space-y-2">
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
                        {formData.lines.map((line, index) => (
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
                                <SelectTrigger className="w-full" aria-label={`Select account for line ${index + 1}`}>
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
                            </TableCell>
                            <TableCell>
                              <Input
                                value={line.description}
                                onChange={(e) =>
                                  updateLine(line.id, { description: e.target.value })
                                }
                                placeholder="Line description"
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
                              />
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
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeLine(line.id)}
                                disabled={formData.lines.length <= 2}
                                aria-label={`Remove line ${index + 1}`}
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
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

                  {!totals.isBalanced && (
                    <Alert variant="destructive" role="alert">
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
                <Button type="submit" disabled={!totals.isBalanced || formData.lines.length < 2}>
                  Create Entry
                </Button>
              </DialogFooter>
            </form>
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
              <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-8 bg-muted animate-pulse rounded" />)}</div>
            ) : journalEntries && journalEntries.length > 0 ? (
              <Table aria-label="Journal entries">
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Entry Number</TableHead>
                    <TableHead scope="col">Date</TableHead>
                    <TableHead scope="col">Description</TableHead>
                    <TableHead scope="col" className="text-right">Amount</TableHead>
                    <TableHead scope="col">Status</TableHead>
                    <TableHead scope="col" className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journalEntries.map((entry: any) => {
                    const totalDebits = entry.lines?.reduce(
                      (sum: number, line: any) => sum + Number(line.debit_amount || 0),
                      0
                    ) || 0;

                    return (
                      <TableRow key={entry.id}>
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
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
