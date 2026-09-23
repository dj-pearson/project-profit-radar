/**
 * Closeout, as a real step on the project hub (US-328).
 *
 * src/pages/ProjectCloseout.tsx was a hardcoded `closeoutChecklist` array with
 * dates like 2026-02-20 baked in, no Supabase import, and no route in
 * src/routes - so US-048 ("project closeout workflow") was marked done against
 * a page nobody could reach showing one imaginary project.
 *
 * This reads project_closeout_items (through useProjectCloseout), summarises the punch list and the
 * warranties that closeout actually waits on, and produces the handover
 * bundle the customer gets.
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useProjectCloseout, type CloseoutItem } from '@/hooks/useProjectCloseout';
import { ErrorState } from '@/components/common/ErrorState';
import { logger } from '@/lib/logger';
import { AlertCircle, ClipboardList, Download, Mail, ListPlus } from 'lucide-react';
import { checklistProgress } from '@/lib/projectStatus';
import { downloadHandoverBundle, type HandoverBundleData } from '@/utils/handoverBundleGenerator';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  completed: 'Completed',
  not_applicable: 'N/A',
};

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export function ProjectCloseoutTab({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const {
    items, summary, isLoading: loading, error: loadError, refetch,
    seed: seedChecklist, isSeeding: seeding,
    setItemStatus: saveItemStatus,
    notifyCustomer: sendHandover, isNotifying: notifying,
    loadBundleSources,
  } = useProjectCloseout(projectId);
  const [exporting, setExporting] = useState(false);

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
    let created: number;
    try {
      created = await seedChecklist();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not create the checklist',
        description: error instanceof Error ? error.message : undefined,
      });
      return;
    }
    toast({ title: 'Closeout checklist created', description: `${created} item(s). Edit or remove what does not apply.` });
  };

  const setItemStatus = async (item: CloseoutItem, status: string) => {
    // Optimistic in the hook, reverted there when the write fails.
    try {
      await saveItemStatus(item.id, status);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not update that item',
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const exportBundle = async () => {
    setExporting(true);
    try {
      const sources = await loadBundleSources();
      const bundle: HandoverBundleData = {
        ...sources,
        closeoutItems: items.map((i) => ({
          category: i.category,
          name: i.name,
          status: STATUS_LABELS[i.status] || i.status,
          completed_at: i.completed_at,
        })),
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
    try {
      const { to, stamped } = await sendHandover();
      if (!stamped) {
        // The email went. Losing the timestamp means the button looks unpressed,
        // which is better than claiming a send that did not happen - so say so.
        toast({
          title: 'Customer notified',
          description: 'The email went out, but recording it failed, so this may prompt again.',
        });
        return;
      }
      toast({ title: 'Customer notified', description: `Sent to ${to}` });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not notify the customer';
      logger.error('Handover notification failed', err);
      toast({ variant: 'destructive', title: 'Could not notify the customer', description: message });
    }
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (loadError) {
    // Not the empty checklist: its "Create" button would seed a second one.
    return (
      <ErrorState
        inline
        title="Could not load closeout"
        error={loadError}
        onRetry={() => { void refetch(); }}
      />
    );
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
