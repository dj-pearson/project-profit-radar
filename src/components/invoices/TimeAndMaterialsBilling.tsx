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
import React, { useEffect, useMemo, useState } from 'react';
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
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { useBillingDefaults } from '@/hooks/useBillingDefaults';
import { useTimeAndMaterialsBilling } from '@/hooks/useTimeAndMaterialsBilling';
import { ErrorState } from '@/components/common/ErrorState';
import { newInvoiceDefaults } from '@/lib/companyBilling';
import { computeTimeAndMaterials } from '@/lib/progressBilling';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const TimeAndMaterialsBilling: React.FC = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  // US-332: due date and terms from the company's payment terms, not 30 days.
  const { defaults: billingDefaults } = useBillingDefaults();

  const [selectedProject, setSelectedProject] = useState('');
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const {
    projects, projectsError, refetchProjects,
    rows, loadingRows, rowsError, refetchRows,
    createInvoice: createInvoiceMutation,
  } = useTimeAndMaterialsBilling(selectedProject);
  const creating = createInvoiceMutation.isPending;

  // A fresh list of unbilled work starts with every row included.
  useEffect(() => { setExcluded(new Set()); }, [rows]);

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

    try {
      const { due_date: dueDate, terms } = newInvoiceDefaults(billingDefaults);
      const { invoiceNumber, stampError } = await createInvoiceMutation.mutateAsync({
        companyId: userProfile.company_id,
        project,
        billable: totals.billable,
        total: totals.total,
        dueDate,
        terms,
      });

      if (stampError) {
        // Loud, because the alternative is billing the same hours next month.
        toast({
          variant: 'destructive',
          title: `Invoice ${invoiceNumber} was created, but the work was not marked billed`,
          description: `It will appear as unbilled again. Reason: ${stampError}`,
        });
      } else {
        toast({
          title: 'Time and materials invoiced',
          description: `${invoiceNumber} for ${money(totals.total)}`,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create the invoice';
      logger.error('T&M invoice failed', err);
      toast({ variant: 'destructive', title: 'Could not create the invoice', description: message });
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
          {projectsError && (
            <ErrorState
              inline
              title="Projects could not be loaded"
              error={projectsError}
              onRetry={() => { void refetchProjects(); }}
            />
          )}
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
            ) : rowsError ? (
              <ErrorState
                inline
                title="Unbilled work could not be loaded"
                error={rowsError}
                onRetry={() => { void refetchRows(); }}
              />
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
