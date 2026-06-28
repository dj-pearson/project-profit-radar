import { useCallback, useEffect, useState } from 'react';
import {
  ListChecks,
  Plus,
  Trash2,
  Check,
  X,
  Package,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { RoleGuard, ROLE_GROUPS } from '@/components/auth/RoleGuard';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import {
  fetchSelectionBoard,
  createCategory,
  deleteCategory,
  createOption,
  deleteOption,
  approveSelection,
  rejectSelection,
} from '@/services/clientSelectionsService';
import {
  computeOverAllowanceDelta,
  isOverAllowance,
  summarizeSelections,
  SELECTION_STATUS_LABELS,
  type SelectionBoardRow,
} from '@/lib/client-selections';

interface ProjectOption {
  id: string;
  name: string;
}

const currency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

/**
 * US-226: builder-side client selections management.
 *
 * Define selection categories + allowances and finish/fixture options per
 * project, then review the client's picks. Approving an over-allowance pick
 * generates a change order for the delta and bumps the project budget.
 */
const ClientSelections = () => {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const companyId = userProfile?.company_id;

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectId, setProjectId] = useState<string>('');
  const [rows, setRows] = useState<SelectionBoardRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const [categoryDialog, setCategoryDialog] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', description: '', allowance: '' });
  const [optionDialogFor, setOptionDialogFor] = useState<string | null>(null);
  const [optForm, setOptForm] = useState({ name: '', description: '', price: '', supplier: '' });

  useEffect(() => {
    if (!companyId) return;
    supabase
      .from('projects')
      .select('id, name')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          logger.error('Failed to load projects for selections', error);
          return;
        }
        const list = (data ?? []) as ProjectOption[];
        setProjects(list);
        setProjectId((current) => current || list[0]?.id || '');
      });
  }, [companyId]);

  const load = useCallback(async () => {
    if (!companyId || !projectId) return;
    setLoading(true);
    try {
      setRows(await fetchSelectionBoard(projectId, companyId));
    } catch (err) {
      logger.error('Failed to load selection board', err as Error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load selections.' });
    } finally {
      setLoading(false);
    }
  }, [companyId, projectId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAddCategory = async () => {
    if (!companyId || !projectId || !catForm.name.trim()) {
      toast({ variant: 'destructive', title: 'Name required', description: 'Enter a category name.' });
      return;
    }
    setBusy('category');
    try {
      await createCategory({
        companyId,
        projectId,
        name: catForm.name.trim(),
        description: catForm.description.trim() || null,
        allowance: Number(catForm.allowance) || 0,
      });
      setCategoryDialog(false);
      setCatForm({ name: '', description: '', allowance: '' });
      await load();
    } catch (err) {
      logger.error('Failed to create category', err as Error);
      toast({ variant: 'destructive', title: 'Error', description: (err as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const handleAddOption = async () => {
    if (!companyId || !optionDialogFor || !optForm.name.trim()) {
      toast({ variant: 'destructive', title: 'Name required', description: 'Enter an option name.' });
      return;
    }
    setBusy('option');
    try {
      await createOption({
        companyId,
        categoryId: optionDialogFor,
        name: optForm.name.trim(),
        description: optForm.description.trim() || null,
        price: Number(optForm.price) || 0,
        supplier: optForm.supplier.trim() || null,
      });
      setOptionDialogFor(null);
      setOptForm({ name: '', description: '', price: '', supplier: '' });
      await load();
    } catch (err) {
      logger.error('Failed to create option', err as Error);
      toast({ variant: 'destructive', title: 'Error', description: (err as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!companyId || !confirm('Delete this category and its options?')) return;
    try {
      await deleteCategory(id, companyId);
      await load();
    } catch (err) {
      logger.error('Failed to delete category', err as Error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete category.' });
    }
  };

  const handleDeleteOption = async (id: string) => {
    if (!companyId) return;
    try {
      await deleteOption(id, companyId);
      await load();
    } catch (err) {
      logger.error('Failed to delete option', err as Error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete option.' });
    }
  };

  const handleApprove = async (row: SelectionBoardRow) => {
    if (!companyId || !user?.id || !row.selection) return;
    const option = row.options.find((o) => o.id === row.selection?.option_id);
    if (!option) return;
    setBusy(row.selection.id);
    try {
      await approveSelection({
        companyId,
        selection: row.selection,
        category: row.category,
        option,
        userId: user.id,
      });
      const delta = computeOverAllowanceDelta(row.category.allowance, option.price);
      toast({
        title: 'Selection approved',
        description: delta > 0 ? `Change order created for ${currency(delta)} and budget updated.` : 'Selection approved.',
      });
      await load();
    } catch (err) {
      logger.error('Failed to approve selection', err as Error);
      toast({ variant: 'destructive', title: 'Error', description: (err as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async (row: SelectionBoardRow) => {
    if (!companyId || !user?.id || !row.selection) return;
    const option = row.options.find((o) => o.id === row.selection?.option_id);
    if (!option) return;
    setBusy(row.selection.id);
    try {
      await rejectSelection({
        companyId,
        selection: row.selection,
        category: row.category,
        option,
        userId: user.id,
      });
      await load();
    } catch (err) {
      logger.error('Failed to reject selection', err as Error);
      toast({ variant: 'destructive', title: 'Error', description: (err as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const summary = summarizeSelections(rows);

  return (
    <RoleGuard allowedRoles={ROLE_GROUPS.PROJECT_EDITORS}>
      <DashboardLayout title="Client Selections">
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold">
                <ListChecks className="h-6 w-6" aria-hidden="true" /> Client Selections
              </h1>
              <p className="text-sm text-muted-foreground">
                Define selection categories and allowances. Approving an over-allowance pick creates a change order and updates the budget.
              </p>
            </div>
            <div className="flex items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="sel-project">Project</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger id="sel-project" className="w-[14rem]">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => setCategoryDialog(true)} disabled={!projectId}>
                <Plus className="mr-1 h-4 w-4" /> Add Category
              </Button>
            </div>
          </div>

          {projectId && (
            <Card>
              <CardContent className="flex flex-wrap gap-x-6 gap-y-1 py-4 text-sm">
                <span>
                  <span className="text-muted-foreground">Allowances: </span>
                  <span className="font-semibold">{currency(summary.totalAllowance)}</span>
                </span>
                <span>
                  <span className="text-muted-foreground">Selected: </span>
                  <span className="font-semibold">{summary.selected}/{summary.categories}</span>
                </span>
                <span>
                  <span className="text-muted-foreground">Pending approval: </span>
                  <span className="font-semibold">{summary.pending}</span>
                </span>
                {summary.totalOverage > 0 && (
                  <span>
                    <span className="text-muted-foreground">Over allowance: </span>
                    <span className="font-semibold text-amber-600">{currency(summary.totalOverage)}</span>
                  </span>
                )}
              </CardContent>
            </Card>
          )}

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : !projectId ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">Select a project to manage its selections.</CardContent></Card>
          ) : rows.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground">No categories yet. Add one to get started.</CardContent></Card>
          ) : (
            <div className="space-y-4">
              {rows.map((row) => {
                const selectedOption = row.selection
                  ? row.options.find((o) => o.id === row.selection?.option_id)
                  : null;
                return (
                  <Card key={row.category.id}>
                    <CardHeader className="pb-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-base">{row.category.name}</CardTitle>
                          {row.category.description && (
                            <p className="text-sm text-muted-foreground">{row.category.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Allowance {currency(row.category.allowance)}</Badge>
                          <Button variant="ghost" size="sm" onClick={() => setOptionDialogFor(row.category.id)}>
                            <Plus className="mr-1 h-3.5 w-3.5" /> Option
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCategory(row.category.id)}
                            aria-label={`Delete category ${row.category.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Client's pick awaiting / showing approval */}
                      {row.selection && selectedOption && (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/40 p-3">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Client chose: </span>
                            <span className="font-medium">{selectedOption.name}</span>{' '}
                            <Badge variant="secondary">{SELECTION_STATUS_LABELS[row.selection.status]}</Badge>
                            {isOverAllowance(row.category.allowance, selectedOption.price) && (
                              <span className="ml-2 text-amber-600">
                                +{currency(computeOverAllowanceDelta(row.category.allowance, selectedOption.price))} over
                              </span>
                            )}
                          </div>
                          {row.selection.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleApprove(row)} disabled={busy === row.selection.id}>
                                <Check className="mr-1 h-3.5 w-3.5" /> Approve
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleReject(row)} disabled={busy === row.selection.id}>
                                <X className="mr-1 h-3.5 w-3.5" /> Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Options list */}
                      {row.options.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No options yet — add finishes/fixtures for the client to choose.</p>
                      ) : (
                        <div className="divide-y rounded-md border">
                          {row.options.map((o) => (
                            <div key={o.id} className="flex items-center justify-between gap-2 p-2">
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                <div>
                                  <span className="font-medium">{o.name}</span>
                                  {o.supplier && <span className="ml-2 text-xs text-muted-foreground">{o.supplier}</span>}
                                  {o.description && <p className="text-xs text-muted-foreground">{o.description}</p>}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold">{currency(o.price)}</span>
                                {isOverAllowance(row.category.allowance, o.price) && (
                                  <span className="text-xs text-amber-600">
                                    +{currency(computeOverAllowanceDelta(row.category.allowance, o.price))}
                                  </span>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteOption(o.id)}
                                  aria-label={`Delete option ${o.name}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Add category dialog */}
        <Dialog open={categoryDialog} onOpenChange={setCategoryDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Selection Category</DialogTitle>
              <DialogDescription>Define a category (e.g. Flooring) and its budget allowance.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="cat-name">Name</Label>
                <Input id="cat-name" value={catForm.name} onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))} placeholder="Flooring" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cat-desc">Description</Label>
                <Textarea id="cat-desc" rows={2} value={catForm.description} onChange={(e) => setCatForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cat-allowance">Allowance ($)</Label>
                <Input id="cat-allowance" type="number" min="0" value={catForm.allowance} onChange={(e) => setCatForm((f) => ({ ...f, allowance: e.target.value }))} placeholder="5000" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCategoryDialog(false)} disabled={busy === 'category'}>Cancel</Button>
              <Button onClick={handleAddCategory} disabled={busy === 'category'}>{busy === 'category' ? 'Adding…' : 'Add Category'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add option dialog */}
        <Dialog open={!!optionDialogFor} onOpenChange={(o) => !o && setOptionDialogFor(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Option</DialogTitle>
              <DialogDescription>Add a finish/fixture option with its price.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="opt-name">Name</Label>
                <Input id="opt-name" value={optForm.name} onChange={(e) => setOptForm((f) => ({ ...f, name: e.target.value }))} placeholder="Hardwood — Oak" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="opt-price">Price ($)</Label>
                <Input id="opt-price" type="number" min="0" value={optForm.price} onChange={(e) => setOptForm((f) => ({ ...f, price: e.target.value }))} placeholder="6500" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="opt-supplier">Supplier</Label>
                <Input id="opt-supplier" value={optForm.supplier} onChange={(e) => setOptForm((f) => ({ ...f, supplier: e.target.value }))} placeholder="Optional" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="opt-desc">Description</Label>
                <Textarea id="opt-desc" rows={2} value={optForm.description} onChange={(e) => setOptForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOptionDialogFor(null)} disabled={busy === 'option'}>Cancel</Button>
              <Button onClick={handleAddOption} disabled={busy === 'option'}>{busy === 'option' ? 'Adding…' : 'Add Option'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </RoleGuard>
  );
};

export default ClientSelections;
