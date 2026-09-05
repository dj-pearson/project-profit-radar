/**
 * Retainage release from what was actually withheld (US-327).
 *
 * This screen used to declare `const totalInvoiceValue = 100000`, find prior
 * releases with .ilike('notes', '%retention%'), and never write
 * invoices.retention_percentage or retention_amount even though both columns
 * exist. So the withheld balance lived nowhere and the release amount was a
 * percentage of a constant.
 *
 * Now it reads project_retainage, which sums what the progress invoices
 * actually held back and what earlier release invoices already paid out. That
 * view is the one retainage model; retention_items and retention_tracking are
 * deprecated by the same migration and were never written to by anything.
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
import { Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { computeRetainageBalance, cents } from '@/lib/progressBilling';

interface RetainageRow {
  project_id: string;
  project_name: string;
  retainage_percentage: number;
  contract_value: number;
  withheld_to_date: number;
  released_to_date: number;
  retainage_balance: number;
}

interface ProjectContact {
  id: string;
  client_id: string | null;
  client_name: string | null;
  client_email: string | null;
  status: string | null;
}

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const RetentionManager: React.FC = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const [rows, setRows] = useState<RetainageRow[]>([]);
  const [contacts, setContacts] = useState<Record<string, ProjectContact>>({});
  const [selectedProject, setSelectedProject] = useState('');
  const [releaseAmount, setReleaseAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingRows, setLoadingRows] = useState(true);

  const load = useCallback(async () => {
    if (!userProfile?.company_id) return;
    setLoadingRows(true);

    const [{ data: retainage, error: retainageError }, { data: projects, error: projectError }] =
      await Promise.all([
        supabase
          .from('project_retainage')
          .select('project_id, project_name, retainage_percentage, contract_value, withheld_to_date, released_to_date, retainage_balance')
          .eq('company_id', userProfile.company_id)
          .gt('withheld_to_date', 0)
          .order('retainage_balance', { ascending: false }),
        supabase
          .from('projects')
          .select('id, client_id, client_name, client_email, status')
          .eq('company_id', userProfile.company_id),
      ]);

    if (retainageError || projectError) {
      logger.error('Could not load retainage', retainageError || projectError);
      toast({
        variant: 'destructive',
        title: 'Could not load retainage',
        description: (retainageError || projectError)?.message,
      });
    }

    setRows((retainage || []) as RetainageRow[]);
    setContacts(Object.fromEntries(
      ((projects || []) as ProjectContact[]).map((p) => [p.id, p])
    ));
    setLoadingRows(false);
  }, [userProfile?.company_id, toast]);

  useEffect(() => { void load(); }, [load]);

  const selected = useMemo(
    () => rows.find((r) => r.project_id === selectedProject) || null,
    [rows, selectedProject]
  );

  const balance = useMemo(
    () => computeRetainageBalance({
      withheldToDate: selected?.withheld_to_date ?? 0,
      releasedToDate: selected?.released_to_date ?? 0,
    }),
    [selected]
  );

  useEffect(() => {
    // Default to releasing everything held. Partial releases are typed over it.
    setReleaseAmount(balance.balance > 0 ? String(balance.balance) : '');
  }, [balance.balance]);

  const requested = cents(Number(releaseAmount) || 0);
  const overRelease = requested > balance.balance;

  const createReleaseInvoice = async () => {
    if (!selected || !userProfile?.company_id) return;
    const contact = contacts[selected.project_id];

    if (requested <= 0) {
      toast({
        variant: 'destructive',
        title: 'Enter an amount',
        description: 'Nothing is being released.',
      });
      return;
    }
    if (overRelease) {
      toast({
        variant: 'destructive',
        title: 'More than was withheld',
        description: `Only ${money(balance.balance)} is still held on this job.`,
      });
      return;
    }
    if (!dueDate) {
      toast({
        variant: 'destructive',
        title: 'A due date is needed',
        description: 'Retainage is normally due on final acceptance.',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: invoice, error } = await supabase
        .from('invoices')
        .insert({
          company_id: userProfile.company_id,
          project_id: selected.project_id,
          client_id: contact?.client_id ?? null,
          client_name: contact?.client_name || 'Unknown client',
          client_email: contact?.client_email || '',
          invoice_type: 'retention_release',
          subtotal: requested,
          total_amount: requested,
          amount_due: requested,
          current_amount_due: requested,
          due_date: dueDate,
          notes: `Retainage release on ${selected.project_name}`,
          terms: 'Retainage is due upon final completion and acceptance.',
        } as never)
        .select('id, invoice_number')
        .single();

      if (error) throw error;

      const { error: lineError } = await supabase
        .from('invoice_line_items')
        .insert({
          invoice_id: invoice.id,
          description: `Retainage released (${selected.retainage_percentage}% withheld on ${money(selected.withheld_to_date)} of billings)`,
          quantity: 1,
          unit_price: requested,
          total_price: requested,
        } as never);

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
        throw new Error(`Could not write the invoice line: ${lineError.message}`);
      }

      toast({
        title: 'Retainage release invoiced',
        description: `${invoice.invoice_number} for ${money(requested)}`,
      });
      setSelectedProject('');
      setDueDate('');
      void load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create the release invoice';
      logger.error('Retainage release failed', err);
      toast({ variant: 'destructive', title: 'Could not release retainage', description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" aria-hidden="true" />
            Retainage held
          </CardTitle>
          <CardDescription>
            What the progress invoices actually withheld, less what has already been released.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingRows ? (
            <Skeleton className="h-32 w-full" />
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No retainage is being held. It accrues as progress invoices are billed on
              projects whose terms set a retainage percentage.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-3 font-medium">Project</th>
                    <th className="py-2 px-3 font-medium text-right">Rate</th>
                    <th className="py-2 px-3 font-medium text-right">Withheld</th>
                    <th className="py-2 px-3 font-medium text-right">Released</th>
                    <th className="py-2 pl-3 font-medium text-right">Still held</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.project_id} className="border-b last:border-0">
                      <td className="py-2 pr-3">{row.project_name}</td>
                      <td className="py-2 px-3 text-right">{row.retainage_percentage}%</td>
                      <td className="py-2 px-3 text-right">{money(row.withheld_to_date)}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">
                        {money(row.released_to_date)}
                      </td>
                      <td className="py-2 pl-3 text-right">
                        <Badge variant={row.retainage_balance > 0 ? 'default' : 'outline'}>
                          {money(row.retainage_balance)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Release retainage</CardTitle>
          <CardDescription>
            Creates an invoice for the withheld balance. Normally issued at final acceptance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="retainage-project">Project</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger id="retainage-project">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {rows.filter((r) => r.retainage_balance > 0).map((r) => (
                    <SelectItem key={r.project_id} value={r.project_id}>
                      {r.project_name} - {money(r.retainage_balance)} held
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="retainage-amount">Amount to release</Label>
              <Input
                id="retainage-amount"
                type="number"
                min={0}
                step="0.01"
                value={releaseAmount}
                onChange={(e) => setReleaseAmount(e.target.value)}
                disabled={!selected}
              />
            </div>
            <div>
              <Label htmlFor="retainage-due">Due date</Label>
              <Input
                id="retainage-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={!selected}
              />
            </div>
          </div>

          {selected && (
            <div className="text-sm text-muted-foreground">
              {money(balance.withheldToDate)} withheld, {money(balance.releasedToDate)} already
              released, {money(balance.balance)} still held.
            </div>
          )}

          {overRelease && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>
                That is more than the {money(balance.balance)} still held on this job.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={createReleaseInvoice}
              disabled={loading || !selected || requested <= 0 || overRelease}
            >
              {loading ? 'Creating...' : 'Create release invoice'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RetentionManager;
