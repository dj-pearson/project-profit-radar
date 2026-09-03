/**
 * Bill approved hours and billable expenses (US-327).
 *
 * There was no time-and-materials path at all: approved time entries never
 * became invoice lines, so a cost-plus job was billed by typing the hours into
 * an invoice by hand, from a timesheet report, with nothing stopping the same
 * week going out twice.
 *
 * Each source row is stamped with the invoice it went on, so a second pull for
 * the same period cannot bill the same hour again. Rows with no billing rate
 * are listed and excluded rather than billed at zero or at cost.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Receipt, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { computeTimeAndMaterials, type UnbilledWorkRow } from '@/lib/progressBilling';

interface ProjectRow {
  id: string;
  name: string;
  client_id: string | null;
  client_name: string | null;
  client_email: string | null;
}

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const TimeAndMaterialsBilling: React.FC = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [rows, setRows] = useState<UnbilledWorkRow[]>([]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [loadingRows, setLoadingRows] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadProjects = useCallback(async () => {
    if (!userProfile?.company_id) return;
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, client_id, client_name, client_email')
      .eq('company_id', userProfile.company_id)
      .in('status', ['active', 'planning', 'completed'])
      .order('name');

    if (error) {
      logger.error('Could not load projects for T&M billing', error);
      return;
    }
    setProjects((data || []) as ProjectRow[]);
  }, [userProfile?.company_id]);

  const loadWork = useCallback(async (projectId: string) => {
    if (!projectId) { setRows([]); return; }
    setLoadingRows(true);
    const { data, error } = await supabase
      .from('project_unbilled_work')
      .select('source_type, source_id, description, work_date, quantity, unit_price, cost_code_id')
      .eq('project_id', projectId)
      .order('work_date');

    if (error) {
      logger.error('Could not load unbilled work', error);
      toast({
        variant: 'destructive',
        title: 'Could not load unbilled work',
        description: error.message,
      });
      setRows([]);
    } else {
      setRows((data || []) as UnbilledWorkRow[]);
      setExcluded(new Set());
    }
    setLoadingRows(false);
  }, [toast]);

  useEffect(() => { void loadProjects(); }, [loadProjects]);
  useEffect(() => { void loadWork(selectedProject); }, [selectedProject, loadWork]);

  const included = useMemo(
    () => rows.filter((r) => !excluded.has(r.source_id)),
    [rows, excluded]
  );
  const totals = useMemo(() => computeTimeAndMaterials(included), [included]);

  const project = projects.find((p) => p.id === selectedProject) || null;

  const createInvoice = async () => {
    if (!project || !userProfile?.company_id) return;
    if (totals.billable.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nothing to bill',
        description: 'No approved, priced work is waiting on this job.',
      });
      return;
    }

    setCreating(true);
    try {
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];

      const { data: invoice, error } = await supabase
        .from('invoices')
        .insert({
          company_id: userProfile.company_id,
          project_id: project.id,
          client_id: project.client_id,
          client_name: project.client_name || 'Unknown client',
          client_email: project.client_email || '',
          invoice_type: 'time_and_materials',
          subtotal: totals.total,
          total_amount: totals.total,
          amount_due: totals.total,
          current_amount_due: totals.total,
          due_date: dueDate,
          notes: `Time and materials: ${totals.billable.length} item(s)`,
          terms: 'Payment is due within 30 days of invoice date.',
        } as never)
        .select('id, invoice_number')
        .single();

      if (error) throw error;

      const { error: lineError } = await supabase
        .from('invoice_line_items')
        .insert(totals.billable.map((row) => ({
          invoice_id: invoice.id,
          cost_code_id: row.cost_code_id ?? null,
          description: `${row.work_date} - ${row.description}`,
          quantity: row.quantity,
          unit_price: row.unit_price as number,
          total_price: row.lineTotal,
        })) as never);

      if (lineError) {
        // Rolling back the header. If this delete also fails the header is
        // orphaned - a total with no detail behind it - so say so loudly
        // rather than reporting only the original failure.
        const { error: rollbackError } = await supabase
          .from('invoices').delete().eq('id', invoice.id);
        if (rollbackError) {
          logger.error('Invoice header left orphaned after its lines failed', {
            invoiceId: invoice.id, rollbackError,
          });
          throw new Error(
            `Invoice ${invoice.invoice_number} was created without its lines and could ` +
            `not be removed. Void it manually. (${rollbackError.message})`
          );
        }
        throw new Error(`Could not write the invoice lines: ${lineError.message}`);
      }

      // Stamp the sources. Until this runs the same hours are still billable,
      // which is the safe direction: a failure here means the work can be
      // billed again, not that it was silently lost.
      const timeIds = totals.billable.filter((r) => r.source_type === 'time').map((r) => r.source_id);
      const expenseIds = totals.billable.filter((r) => r.source_type === 'expense').map((r) => r.source_id);

      const stamps = await Promise.all([
        timeIds.length
          ? supabase.from('time_entries').update({ billed_invoice_id: invoice.id } as never).in('id', timeIds)
          : Promise.resolve({ error: null }),
        expenseIds.length
          ? supabase.from('expenses').update({ billed_invoice_id: invoice.id } as never).in('id', expenseIds)
          : Promise.resolve({ error: null }),
      ]);

      const stampError = stamps.find((s) => s.error)?.error;
      if (stampError) {
        // Loud, because the alternative is billing the same hours next month.
        logger.error('T&M invoice created but sources were not marked billed', stampError);
        toast({
          variant: 'destructive',
          title: `Invoice ${invoice.invoice_number} was created, but the work was not marked billed`,
          description: `It will appear as unbilled again. Reason: ${stampError.message}`,
        });
      } else {
        toast({
          title: 'Time and materials invoiced',
          description: `${invoice.invoice_number} for ${money(totals.total)}`,
        });
      }

      void loadWork(project.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create the invoice';
      logger.error('T&M invoice failed', err);
      toast({ variant: 'destructive', title: 'Could not create the invoice', description: message });
    } finally {
      setCreating(false);
    }
  };

  const toggle = (id: string) => setExcluded((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" aria-hidden="true" />
            Time and materials
          </CardTitle>
          <CardDescription>
            Approved hours and billable expenses that have not been invoiced yet, priced
            at the customer's billing rates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="tm-project">Project</Label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger id="tm-project">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}{p.client_name ? ` - ${p.client_name}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {totals.unpriced.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>
                {totals.unpriced.length} item(s) have no billing rate and are excluded.
                Set a billing rate on the employee or a default on the project, then reload.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {selectedProject && (
        <Card>
          <CardHeader>
            <CardTitle>Unbilled work</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRows ? (
              <Skeleton className="h-40 w-full" />
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Nothing is waiting to be billed. Hours appear here once they are approved,
                expenses once they are marked billable and approved.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="py-2 pr-3 font-medium">Bill</th>
                      <th className="py-2 px-3 font-medium">Date</th>
                      <th className="py-2 px-3 font-medium">Description</th>
                      <th className="py-2 px-3 font-medium text-right">Qty</th>
                      <th className="py-2 px-3 font-medium text-right">Rate</th>
                      <th className="py-2 pl-3 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const priced = row.unit_price != null && row.unit_price > 0;
                      const lineTotal = priced ? (row.quantity || 0) * (row.unit_price as number) : 0;
                      return (
                        <tr key={row.source_id} className="border-b last:border-0">
                          <td className="py-2 pr-3">
                            <Checkbox
                              checked={!excluded.has(row.source_id)}
                              disabled={!priced}
                              onCheckedChange={() => toggle(row.source_id)}
                              aria-label={`Include ${row.description}`}
                            />
                          </td>
                          <td className="py-2 px-3">{row.work_date}</td>
                          <td className="py-2 px-3">
                            {row.description}
                            <span className="text-xs text-muted-foreground ml-2">
                              {row.source_type === 'time' ? 'labor' : 'expense'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right">{row.quantity}</td>
                          <td className="py-2 px-3 text-right">
                            {priced ? money(row.unit_price as number) : 'no rate set'}
                          </td>
                          <td className="py-2 pl-3 text-right">
                            {priced ? money(lineTotal) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="mt-4 space-y-1 text-sm max-w-sm ml-auto">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Labor</span>
                    <span>{money(totals.laborTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expenses</span>
                    <span>{money(totals.expenseTotal)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-base pt-1">
                    <span>Invoice total</span>
                    <span>{money(totals.total)}</span>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    onClick={createInvoice}
                    disabled={creating || totals.billable.length === 0}
                  >
                    {creating ? 'Creating...' : `Invoice ${money(totals.total)}`}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TimeAndMaterialsBilling;
