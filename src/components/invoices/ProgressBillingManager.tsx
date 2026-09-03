/**
 * Progress billing off the schedule of values (US-327).
 *
 * This screen used to declare `const totalBudget = 100000` and find its own
 * prior invoices with .ilike('notes', '%progress%'). Every number it showed a
 * contractor was therefore fiction unless the job happened to be worth exactly
 * a hundred thousand dollars.
 *
 * Now: the project's schedule of values is the contract, previously-billed is
 * a sum over invoice lines that name their SOV line, and retainage comes from
 * the project's own terms.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { TrendingUp, AlertCircle, ListPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import {
  computeProgressInvoice, reconcileSovToContract, cents, type SovLine,
} from '@/lib/progressBilling';

interface ProjectRow {
  id: string;
  name: string;
  client_id: string | null;
  client_name: string | null;
  client_email: string | null;
  current_contract_value: number | null;
  original_contract_value: number | null;
  budget: number | null;
  retainage_percentage: number | null;
}

interface SovStatusRow extends SovLine {
  project_id: string;
  percent_billed: number;
  remaining_to_bill: number;
  sort_order: number;
}

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const ProgressBillingManager: React.FC = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [sovLines, setSovLines] = useState<SovStatusRow[]>([]);
  const [percentages, setPercentages] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [loadingSov, setLoadingSov] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const project = useMemo(
    () => projects.find((p) => p.id === selectedProject) || null,
    [projects, selectedProject]
  );

  const loadProjects = useCallback(async () => {
    if (!userProfile?.company_id) return;
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, client_id, client_name, client_email, current_contract_value, original_contract_value, budget, retainage_percentage')
      .eq('company_id', userProfile.company_id)
      .in('status', ['active', 'planning'])
      .order('name');

    if (error) {
      logger.error('Could not load projects for progress billing', error);
      toast({ variant: 'destructive', title: 'Could not load projects', description: error.message });
      return;
    }
    setProjects((data || []) as ProjectRow[]);
  }, [userProfile?.company_id, toast]);

  const loadSov = useCallback(async (projectId: string) => {
    if (!projectId) { setSovLines([]); return; }
    setLoadingSov(true);
    const { data, error } = await supabase
      .from('project_sov_status')
      .select('sov_line_id, project_id, description, scheduled_value, previously_billed, percent_billed, remaining_to_bill, cost_code_id, line_number, sort_order')
      .eq('project_id', projectId)
      .order('sort_order');

    if (error) {
      logger.error('Could not load the schedule of values', error);
      toast({
        variant: 'destructive',
        title: 'Could not load the schedule of values',
        description: error.message,
      });
      setSovLines([]);
    } else {
      const rows = (data || []) as SovStatusRow[];
      setSovLines(rows);
      // Start each line where it already stands, so a period that touches one
      // trade does not silently un-bill the rest.
      setPercentages(
        Object.fromEntries(rows.map((r) => [r.sov_line_id, Number(r.percent_billed) || 0]))
      );
    }
    setLoadingSov(false);
  }, [toast]);

  useEffect(() => { void loadProjects(); }, [loadProjects]);
  useEffect(() => { void loadSov(selectedProject); }, [selectedProject, loadSov]);

  const contractValue = cents(
    project?.current_contract_value ?? project?.original_contract_value ?? project?.budget ?? 0
  );

  const billing = useMemo(
    () => computeProgressInvoice({
      lines: sovLines,
      percentComplete: percentages,
      retainagePercentage: Number(project?.retainage_percentage) || 0,
    }),
    [sovLines, percentages, project?.retainage_percentage]
  );

  const reconciliation = useMemo(
    () => reconcileSovToContract({
      sovTotal: billing.contractTotal,
      contractValue,
      toleranceCents: Math.max(1, sovLines.length),
    }),
    [billing.contractTotal, contractValue, sovLines.length]
  );

  const seedSov = async () => {
    if (!selectedProject) return;
    setSeeding(true);
    const { data, error } = await supabase.rpc('seed_project_sov', { p_project_id: selectedProject });
    setSeeding(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Could not build the schedule of values',
        description: error.message,
      });
      return;
    }
    toast({
      title: 'Schedule of values created',
      description: `${data ?? 0} line(s) from the project budget. Edit the values before you bill.`,
    });
    void loadSov(selectedProject);
  };

  const createProgressInvoice = async () => {
    if (!project || !userProfile?.company_id) return;

    const billable = billing.lines.filter((l) => l.thisPeriod !== 0);
    if (billable.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nothing to bill',
        description: 'Every line is already billed to the percentage entered.',
      });
      return;
    }
    if (billing.thisPeriodGross < 0) {
      toast({
        variant: 'destructive',
        title: 'That is a credit, not a billing',
        description: 'The percentages entered are below what has already been billed. Issue a credit memo instead.',
      });
      return;
    }

    setLoading(true);
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
          invoice_type: 'progress',
          subtotal: billing.thisPeriodGross,
          total_amount: billing.netDue,
          amount_due: billing.netDue,
          retention_percentage: billing.retainagePercentage || null,
          retention_amount: billing.retainageThisPeriod || null,
          previous_amount_billed: billing.previouslyBilled,
          current_amount_due: billing.netDue,
          progress_percentage: billing.contractTotal > 0
            ? cents((billing.completedToDate / billing.contractTotal) * 100)
            : 0,
          due_date: dueDate,
          notes: `Progress billing through ${new Date().toLocaleDateString()}`,
          terms: 'Payment is due within 30 days of invoice date.',
        } as never)
        .select('id, invoice_number')
        .single();

      if (error) throw error;

      const { error: lineError } = await supabase
        .from('invoice_line_items')
        .insert(billable.map((line) => ({
          invoice_id: invoice.id,
          sov_line_id: line.sov_line_id,
          cost_code_id: line.cost_code_id ?? null,
          description: `${line.description} - ${line.percentComplete}% complete`,
          quantity: 1,
          unit_price: line.thisPeriod,
          total_price: line.thisPeriod,
          work_completed_percentage: line.percentComplete,
        })) as never);

      if (lineError) {
        // The invoice without its lines is a header with no detail and a total
        // nothing supports. Better no invoice than that.
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

      toast({
        title: 'Progress invoice created',
        description: `${invoice.invoice_number} for ${money(billing.netDue)}${
          billing.retainageThisPeriod > 0
            ? ` (${money(billing.retainageThisPeriod)} retainage withheld)` : ''
        }`,
      });
      void loadSov(project.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create the progress invoice';
      logger.error('Progress invoice failed', err);
      toast({ variant: 'destructive', title: 'Could not create the invoice', description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" aria-hidden="true" />
            Progress billing
          </CardTitle>
          <CardDescription>
            Bill each schedule-of-values line to its percent complete. What was billed
            before comes from the invoices themselves.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="progress-project">Project</Label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger id="progress-project">
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

          {selectedProject && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Contract value</p>
                <p className="font-semibold">{money(contractValue)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Retainage</p>
                <p className="font-semibold">{billing.retainagePercentage}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Billed to date</p>
                <p className="font-semibold">{money(billing.previouslyBilled)}</p>
              </div>
            </div>
          )}

          {selectedProject && !reconciliation.agrees && sovLines.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>
                The schedule of values totals {money(billing.contractTotal)}, the contract
                is {money(contractValue)}. They differ by {money(Math.abs(reconciliation.difference))}.
                An owner will reject a payment application that does not reconcile.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {selectedProject && (
        <Card>
          <CardHeader>
            <CardTitle>Schedule of values</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSov ? (
              <Skeleton className="h-40 w-full" />
            ) : sovLines.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <p className="text-sm text-muted-foreground">
                  This project has no schedule of values yet. One can be built from its
                  cost-code budget.
                </p>
                <Button type="button" onClick={seedSov} disabled={seeding}>
                  <ListPlus className="h-4 w-4 mr-2" aria-hidden="true" />
                  {seeding ? 'Building...' : 'Build from the project budget'}
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="py-2 pr-3 font-medium">Line</th>
                      <th className="py-2 px-3 font-medium text-right">Scheduled</th>
                      <th className="py-2 px-3 font-medium text-right">Billed</th>
                      <th className="py-2 px-3 font-medium text-right">% complete</th>
                      <th className="py-2 pl-3 font-medium text-right">This period</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billing.lines.map((line) => (
                      <tr key={line.sov_line_id} className="border-b last:border-0">
                        <td className="py-2 pr-3">{line.description}</td>
                        <td className="py-2 px-3 text-right">{money(line.scheduled_value)}</td>
                        <td className="py-2 px-3 text-right text-muted-foreground">
                          {money(line.previously_billed)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step="0.01"
                            className="w-24 ml-auto text-right"
                            aria-label={`Percent complete for ${line.description}`}
                            value={percentages[line.sov_line_id] ?? 0}
                            onChange={(e) => setPercentages((prev) => ({
                              ...prev,
                              [line.sov_line_id]: Number(e.target.value),
                            }))}
                          />
                        </td>
                        <td className="py-2 pl-3 text-right font-medium">
                          {money(line.thisPeriod)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-semibold">
                      <td className="py-2 pr-3">Total</td>
                      <td className="py-2 px-3 text-right">{money(billing.contractTotal)}</td>
                      <td className="py-2 px-3 text-right">{money(billing.previouslyBilled)}</td>
                      <td />
                      <td className="py-2 pl-3 text-right">{money(billing.thisPeriodGross)}</td>
                    </tr>
                  </tfoot>
                </table>

                <div className="mt-4 space-y-1 text-sm max-w-sm ml-auto">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">This period</span>
                    <span>{money(billing.thisPeriodGross)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Retainage withheld ({billing.retainagePercentage}%)
                    </span>
                    <span>-{money(billing.retainageThisPeriod)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-base pt-1">
                    <span>Due this invoice</span>
                    <span>{money(billing.netDue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Remaining on contract</span>
                    <Badge variant="outline">{money(billing.remainingToBill)}</Badge>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <Button type="button" onClick={createProgressInvoice} disabled={loading}>
                    {loading ? 'Creating...' : `Create invoice for ${money(billing.netDue)}`}
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

export default ProgressBillingManager;
