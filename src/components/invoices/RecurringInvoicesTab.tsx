import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pause, Play, Pencil, Trash2, RefreshCw, Repeat } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import {
  computeNextRunDate, remainingLabel, templateTotal,
  type RecurrenceFrequency, type RecurringLineItem,
} from '@/lib/reports/recurringInvoices';

interface RecurringInvoiceRow {
  id: string;
  name: string;
  client_name: string | null;
  frequency: RecurrenceFrequency;
  start_date: string;
  end_date: string | null;
  occurrence_limit: number | null;
  occurrences_generated: number;
  next_run_date: string | null;
  status: 'active' | 'paused' | 'completed';
  line_items: RecurringLineItem[];
  notes: string | null;
}

interface FormState {
  id?: string;
  name: string;
  client_name: string;
  frequency: RecurrenceFrequency;
  start_date: string;
  end_date: string;
  occurrence_limit: string;
  description: string;
  quantity: string;
  unit_price: string;
  notes: string;
}

const emptyForm = (): FormState => ({
  name: '',
  client_name: '',
  frequency: 'monthly',
  start_date: new Date().toISOString().slice(0, 10),
  end_date: '',
  occurrence_limit: '',
  description: '',
  quantity: '1',
  unit_price: '',
  notes: '',
});

const FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
};

const RecurringInvoicesTab: React.FC = () => {
  const { userProfile, user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RecurringInvoiceRow[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    if (!userProfile?.company_id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('recurring_invoices')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRows(
        (data ?? []).map((r: Record<string, unknown>) => ({
          ...(r as object),
          line_items: Array.isArray(r.line_items) ? (r.line_items as RecurringLineItem[]) : [],
        })) as RecurringInvoiceRow[]
      );
    } catch (error) {
      logger.error('Error loading recurring invoices', error instanceof Error ? error : undefined);
      toast({ title: 'Error', description: 'Failed to load recurring invoices', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile?.company_id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.company_id]);

  const openCreate = () => {
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (row: RecurringInvoiceRow) => {
    const first = row.line_items[0];
    setForm({
      id: row.id,
      name: row.name,
      client_name: row.client_name ?? '',
      frequency: row.frequency,
      start_date: row.start_date,
      end_date: row.end_date ?? '',
      occurrence_limit: row.occurrence_limit != null ? String(row.occurrence_limit) : '',
      description: first?.description ?? '',
      quantity: first ? String(first.quantity) : '1',
      unit_price: first ? String(first.unit_price) : '',
      notes: row.notes ?? '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!userProfile?.company_id) return;
    if (!form.name.trim() || !form.start_date) {
      toast({ title: 'Missing fields', description: 'Name and start date are required.', variant: 'destructive' });
      return;
    }
    const lineItems: RecurringLineItem[] = form.description.trim()
      ? [{ description: form.description.trim(), quantity: Number(form.quantity) || 1, unit_price: Number(form.unit_price) || 0 }]
      : [];

    const payload = {
      company_id: userProfile.company_id,
      name: form.name.trim(),
      client_name: form.client_name.trim() || null,
      frequency: form.frequency,
      start_date: form.start_date,
      end_date: form.end_date || null,
      occurrence_limit: form.occurrence_limit ? Number(form.occurrence_limit) : null,
      line_items: lineItems,
      notes: form.notes.trim() || null,
      next_run_date: computeNextRunDate({
        frequency: form.frequency,
        start_date: form.start_date,
        end_date: form.end_date || null,
        occurrence_limit: form.occurrence_limit ? Number(form.occurrence_limit) : null,
        occurrences_generated: 0,
        status: 'active',
      }),
    };

    try {
      setSaving(true);
      if (form.id) {
        const { error } = await supabase.from('recurring_invoices').update(payload).eq('id', form.id);
        if (error) throw error;
        toast({ title: 'Updated', description: 'Recurring invoice updated.' });
      } else {
        const { error } = await supabase.from('recurring_invoices').insert({ ...payload, created_by: user?.id ?? null });
        if (error) throw error;
        toast({ title: 'Created', description: 'Recurring invoice scheduled.' });
      }
      setDialogOpen(false);
      load();
    } catch (error) {
      logger.error('Error saving recurring invoice', error instanceof Error ? error : undefined);
      toast({ title: 'Error', description: 'Failed to save recurring invoice', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (row: RecurringInvoiceRow) => {
    const nextStatus = row.status === 'active' ? 'paused' : 'active';
    try {
      const { error } = await supabase
        .from('recurring_invoices')
        .update({
          status: nextStatus,
          next_run_date: nextStatus === 'active'
            ? computeNextRunDate({ ...row, status: 'active' })
            : null,
        })
        .eq('id', row.id);
      if (error) throw error;
      toast({ title: nextStatus === 'active' ? 'Resumed' : 'Paused', description: `${row.name} ${nextStatus === 'active' ? 'resumed' : 'paused'}.` });
      load();
    } catch (error) {
      logger.error('Error toggling recurring invoice', error instanceof Error ? error : undefined);
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from('recurring_invoices').delete().eq('id', deleteId);
      if (error) throw error;
      toast({ title: 'Deleted', description: 'Recurring invoice removed.' });
      setDeleteId(null);
      load();
    } catch (error) {
      logger.error('Error deleting recurring invoice', error instanceof Error ? error : undefined);
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    }
  };

  const setField = (key: keyof FormState, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const previewNextRun = useMemo(
    () => computeNextRunDate({
      frequency: form.frequency,
      start_date: form.start_date,
      end_date: form.end_date || null,
      occurrence_limit: form.occurrence_limit ? Number(form.occurrence_limit) : null,
      occurrences_generated: 0,
      status: 'active',
    }),
    [form.frequency, form.start_date, form.end_date, form.occurrence_limit]
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Repeat className="h-5 w-5 text-construction-orange" aria-hidden="true" />
            Recurring Invoices
          </h2>
          <p className="text-sm text-muted-foreground">Automate retainer and progress billing schedules</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-construction-orange hover:bg-construction-orange/90" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Create Recurring Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{form.id ? 'Edit' : 'Create'} Recurring Invoice</DialogTitle>
                <DialogDescription>
                  Define a billing schedule. {previewNextRun ? `Next invoice would generate on ${previewNextRun}.` : 'Schedule is currently inactive.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="ri-name">Name *</Label>
                  <Input id="ri-name" value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Monthly retainer — Acme" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ri-client">Client name</Label>
                  <Input id="ri-client" value={form.client_name} onChange={(e) => setField('client_name', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="ri-freq">Frequency</Label>
                    <Select value={form.frequency} onValueChange={(v) => setField('frequency', v)}>
                      <SelectTrigger id="ri-freq"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Biweekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="ri-limit">Occurrences (blank = until end date)</Label>
                    <Input id="ri-limit" type="number" min="1" value={form.occurrence_limit} onChange={(e) => setField('occurrence_limit', e.target.value)} placeholder="e.g. 12" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="ri-start">Start date *</Label>
                    <Input id="ri-start" type="date" value={form.start_date} onChange={(e) => setField('start_date', e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="ri-end">End date (optional)</Label>
                    <Input id="ri-end" type="date" value={form.end_date} onChange={(e) => setField('end_date', e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Template line item</Label>
                  <Input value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Description (e.g. Monthly retainer)" />
                  <div className="grid grid-cols-2 gap-4">
                    <Input type="number" min="0" step="0.01" value={form.quantity} onChange={(e) => setField('quantity', e.target.value)} placeholder="Qty" aria-label="Quantity" />
                    <Input type="number" min="0" step="0.01" value={form.unit_price} onChange={(e) => setField('unit_price', e.target.value)} placeholder="Unit price" aria-label="Unit price" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ri-notes">Notes</Label>
                  <Textarea id="ri-notes" value={form.notes} onChange={(e) => setField('notes', e.target.value)} rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configurations</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Repeat className="h-10 w-10 mb-3 opacity-50" aria-hidden="true" />
              <p className="font-medium">No recurring invoices yet</p>
              <p className="text-sm">Create one to automate retainer or progress billing.</p>
              <Button className="mt-4" size="sm" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Create Recurring Invoice
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Next Invoice</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Generated</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {row.name}
                      {row.client_name && <div className="text-xs text-muted-foreground">{row.client_name}</div>}
                    </TableCell>
                    <TableCell>{FREQUENCY_LABELS[row.frequency]}</TableCell>
                    <TableCell>{row.status === 'active' && row.next_run_date ? new Date(row.next_run_date).toLocaleDateString() : '—'}</TableCell>
                    <TableCell className="text-right">{formatCurrency(templateTotal(row.line_items))}</TableCell>
                    <TableCell className="text-right">{row.occurrences_generated}</TableCell>
                    <TableCell>{remainingLabel(row)}</TableCell>
                    <TableCell>
                      <Badge variant={row.status === 'active' ? 'default' : row.status === 'paused' ? 'secondary' : 'outline'}>
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {row.status !== 'completed' && (
                          <Button variant="ghost" size="icon" onClick={() => toggleStatus(row)} aria-label={row.status === 'active' ? 'Pause' : 'Resume'}>
                            {row.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => openEdit(row)} aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(row.id)} aria-label="Delete">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete recurring invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This stops future automatic invoice generation for this schedule. Already-generated invoices are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RecurringInvoicesTab;
