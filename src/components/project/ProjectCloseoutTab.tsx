/**
 * Closeout, as a real step on the project hub (US-328).
 *
 * src/pages/ProjectCloseout.tsx was a hardcoded `closeoutChecklist` array with
 * dates like 2026-02-20 baked in, no Supabase import, and no route in
 * src/routes - so US-048 ("project closeout workflow") was marked done against
 * a page nobody could reach showing one imaginary project.
 *
 * This reads project_closeout_items, summarises the punch list and the
 * warranties that closeout actually waits on, and produces the handover
 * bundle the customer gets.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { AlertCircle, ClipboardList, Download, Mail, ListPlus } from 'lucide-react';
import { checklistProgress } from '@/lib/projectStatus';
import { downloadHandoverBundle, type HandoverBundleData } from '@/utils/handoverBundleGenerator';

interface CloseoutItem {
  id: string;
  category: string;
  name: string;
  status: string;
  is_required: boolean;
  completed_at: string | null;
  sort_order: number;
}

interface CloseoutSummary {
  open_punch_items: number;
  total_punch_items: number;
  required_checklist_open: number;
  unpaid_invoice_total: number;
  warranties_registered: number;
  handover_sent_at: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  completed: 'Completed',
  not_applicable: 'N/A',
};

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export function ProjectCloseoutTab({ projectId }: { projectId: string }) {
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const [items, setItems] = useState<CloseoutItem[]>([]);
  const [summary, setSummary] = useState<CloseoutSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [notifying, setNotifying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: rows, error: itemsError }, { data: status, error: statusError }] =
      await Promise.all([
        supabase
          .from('project_closeout_items')
          .select('id, category, name, status, is_required, completed_at, sort_order')
          .eq('project_id', projectId)
          .order('sort_order'),
        supabase
          .from('project_closeout_status')
          .select('open_punch_items, total_punch_items, required_checklist_open, unpaid_invoice_total, warranties_registered, handover_sent_at')
          .eq('project_id', projectId)
          .maybeSingle(),
      ]);

    if (itemsError || statusError) {
      logger.error('Could not load closeout', itemsError || statusError);
      toast({
        variant: 'destructive',
        title: 'Could not load closeout',
        description: (itemsError || statusError)?.message,
      });
    }

    setItems((rows || []) as CloseoutItem[]);
    setSummary((status as CloseoutSummary) || null);
    setLoading(false);
  }, [projectId, toast]);

  useEffect(() => { void load(); }, [load]);

  const progress = useMemo(() => checklistProgress(items), [items]);

  const categories = useMemo(() => {
    const map = new Map<string, CloseoutItem[]>();
    for (const item of items) {
      const list = map.get(item.category) || [];
      list.push(item);
      map.set(item.category, list);
    }
    return [...map.entries()];
  }, [items]);

  const seed = async () => {
    setSeeding(true);
    const { data, error } = await supabase.rpc('seed_project_closeout', { p_project_id: projectId });
    setSeeding(false);
    if (error) {
      toast({ variant: 'destructive', title: 'Could not create the checklist', description: error.message });
      return;
    }
    toast({ title: 'Closeout checklist created', description: `${data ?? 0} item(s). Edit or remove what does not apply.` });
    void load();
  };

  const setItemStatus = async (item: CloseoutItem, status: string) => {
    const previous = items;
    // Optimistic, because a checklist that lags a click feels broken. Reverted
    // on failure rather than left showing a state the database rejected.
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status } : i)));

    const { error } = await supabase
      .from('project_closeout_items')
      .update({ status } as never)
      .eq('id', item.id);

    if (error) {
      setItems(previous);
      toast({ variant: 'destructive', title: 'Could not update that item', description: error.message });
      return;
    }
    void load();
  };

  const exportBundle = async () => {
    setExporting(true);
    try {
      const [project, company, punch, changeOrders, invoices, warranties, documents] = await Promise.all([
        supabase.from('projects')
          .select('name, client_name, site_address, start_date, completed_at, original_contract_value, current_contract_value')
          .eq('id', projectId).single(),
        // The contractor's own name, for the header of the document their
        // customer keeps. userProfile carries no company_name - reading one
        // would silently have branded every handover "Brikly".
        supabase.from('companies')
          .select('name')
          .eq('id', userProfile?.company_id ?? '').maybeSingle(),
        supabase.from('punch_list_items')
          .select('item_number, description, status, date_completed')
          .eq('project_id', projectId).order('item_number'),
        supabase.from('change_orders')
          .select('change_order_number, title, amount, status')
          .eq('project_id', projectId).order('change_order_number'),
        supabase.from('invoices')
          .select('invoice_number, total_amount, amount_due, status')
          .eq('project_id', projectId).order('invoice_number'),
        supabase.from('warranties')
          .select('item_name, manufacturer, warranty_end_date, status')
          .eq('project_id', projectId),
        supabase.from('documents')
          .select('name, created_at')
          .eq('project_id', projectId).order('created_at'),
      ]);

      const failure = [project, punch, changeOrders, invoices, warranties, documents]
        .find((r) => r.error)?.error;
      // The company lookup is deliberately not fatal: a missing name costs a
      // header, not the bundle.
      if (failure) throw new Error(failure.message);

      const bundle: HandoverBundleData = {
        project: project.data as HandoverBundleData['project'],
        companyName: company.data?.name || 'Your company',
        closeoutItems: items.map((i) => ({
          category: i.category,
          name: i.name,
          status: STATUS_LABELS[i.status] || i.status,
          completed_at: i.completed_at,
        })),
        punchItems: (punch.data || []) as HandoverBundleData['punchItems'],
        changeOrders: (changeOrders.data || []) as HandoverBundleData['changeOrders'],
        invoices: (invoices.data || []) as HandoverBundleData['invoices'],
        warranties: (warranties.data || []) as HandoverBundleData['warranties'],
        documents: (documents.data || []) as HandoverBundleData['documents'],
      };

      downloadHandoverBundle(bundle);
      toast({ title: 'Handover bundle downloaded' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not build the bundle';
      logger.error('Handover bundle failed', err);
      toast({ variant: 'destructive', title: 'Could not build the handover bundle', description: message });
    } finally {
      setExporting(false);
    }
  };

  const notifyCustomer = async () => {
    setNotifying(true);
    try {
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('name, client_name, client_email')
        .eq('id', projectId)
        .single();
      if (projectError) throw new Error(projectError.message);
      if (!project.client_email) {
        throw new Error('This project has no customer email address.');
      }

      const { error: sendError } = await supabase.functions.invoke('send-notification', {
        body: {
          type: 'project_handover',
          to: project.client_email,
          subject: `${project.name} is complete`,
          content:
            `Hello ${project.client_name || 'there'},\n\n` +
            `Work on ${project.name} is complete. Your closeout package - the punch list, ` +
            `change orders, warranties and project documents - is available in your customer ` +
            `portal.\n\nThank you for your business.`,
        },
      });
      if (sendError) throw new Error(sendError.message);

      const { error: stampError } = await supabase
        .from('projects')
        .update({ handover_sent_at: new Date().toISOString() } as never)
        .eq('id', projectId);
      if (stampError) {
        // The email went. Losing the timestamp means the button looks unpressed,
        // which is better than claiming a send that did not happen - so say so.
        logger.error('Handover email sent but the timestamp was not saved', stampError);
        toast({
          title: 'Customer notified',
          description: 'The email went out, but recording it failed, so this may prompt again.',
        });
        return;
      }

      toast({ title: 'Customer notified', description: `Sent to ${project.client_email}` });
      void load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not notify the customer';
      logger.error('Handover notification failed', err);
      toast({ variant: 'destructive', title: 'Could not notify the customer', description: message });
    } finally {
      setNotifying(false);
    }
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" aria-hidden="true" />
            Closeout
          </CardTitle>
          <CardDescription>
            What has to be finished before this job is complete, and what the customer gets.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Checklist</p>
              <p className="font-semibold">{progress.completed} of {progress.total}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Punch list open</p>
              <p className="font-semibold">
                {summary?.open_punch_items ?? 0} of {summary?.total_punch_items ?? 0}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Outstanding</p>
              <p className="font-semibold">{money(Number(summary?.unpaid_invoice_total) || 0)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Warranties</p>
              <p className="font-semibold">{summary?.warranties_registered ?? 0} registered</p>
            </div>
          </div>

          {progress.total > 0 && (
            <div>
              <Progress value={progress.percent} aria-label="Closeout progress" />
              <p className="text-xs text-muted-foreground mt-1">
                {progress.percent}% done
                {progress.requiredOpen > 0 && `, ${progress.requiredOpen} required item(s) outstanding`}
              </p>
            </div>
          )}

          {progress.requiredOpen === 0 && progress.total > 0 && (summary?.open_punch_items ?? 0) === 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>
                Nothing is outstanding. This project can be marked complete from the status
                control in the header.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={exportBundle} disabled={exporting}>
              <Download className="h-4 w-4 mr-2" aria-hidden="true" />
              {exporting ? 'Building...' : 'Handover bundle (PDF)'}
            </Button>
            <Button type="button" variant="outline" onClick={notifyCustomer} disabled={notifying}>
              <Mail className="h-4 w-4 mr-2" aria-hidden="true" />
              {notifying ? 'Sending...' : summary?.handover_sent_at ? 'Notify customer again' : 'Notify customer'}
            </Button>
            {summary?.handover_sent_at && (
              <span className="text-xs text-muted-foreground self-center">
                Sent {new Date(summary.handover_sent_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-sm text-muted-foreground">
                No closeout checklist yet. A standard one can be created and then edited.
              </p>
              <Button type="button" onClick={seed} disabled={seeding}>
                <ListPlus className="h-4 w-4 mr-2" aria-hidden="true" />
                {seeding ? 'Creating...' : 'Create a closeout checklist'}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {categories.map(([category, categoryItems]) => (
                <div key={category}>
                  <h3 className="font-medium text-sm mb-2">{category}</h3>
                  <ul className="divide-y">
                    {categoryItems.map((item) => (
                      <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm">
                            {item.name}
                            {item.is_required && (
                              <Badge variant="outline" className="ml-2 text-xs">required</Badge>
                            )}
                          </p>
                          {item.completed_at && (
                            <p className="text-xs text-muted-foreground">
                              Signed off {new Date(item.completed_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <Select value={item.status} onValueChange={(v) => setItemStatus(item, v)}>
                          <SelectTrigger className="w-40" aria-label={`Status for ${item.name}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default ProjectCloseoutTab;
