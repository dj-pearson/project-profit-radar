/**
 * Move a project through its statuses (US-328).
 *
 * There was no control anywhere. Projects were created in planning and stayed
 * there, so the dashboard's active count, the at-risk flags and what the
 * customer saw were all reading a field nobody could change.
 *
 * The rules are enforced in set_project_status(); this asks the same questions
 * first so the reason a transition is blocked is on screen before the click,
 * and collects the override reason when the contractor decides to proceed
 * anyway.
 */
import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { ChevronDown } from 'lucide-react';
import {
  PROJECT_STATUSES, PROJECT_STATUS_LABELS, checkTransition, normalizeProjectStatus,
  type CloseoutState, type ProjectStatus,
} from '@/lib/projectStatus';

interface ProjectStatusControlProps {
  projectId: string;
  status: string | null;
  startDate?: string | null;
  onChanged?: (status: ProjectStatus) => void;
}

const VARIANTS: Record<ProjectStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  planning: 'secondary',
  active: 'default',
  on_hold: 'outline',
  completed: 'secondary',
  closed: 'outline',
  cancelled: 'destructive',
};

export function ProjectStatusControl({
  projectId, status, startDate, onChanged,
}: ProjectStatusControlProps) {
  const { toast } = useToast();
  const current = normalizeProjectStatus(status);

  const [state, setState] = useState<CloseoutState>({
    openPunchItems: 0,
    requiredChecklistOpen: 0,
    unpaidInvoiceTotal: 0,
    hasStartDate: Boolean(startDate),
  });
  const [pending, setPending] = useState<ProjectStatus | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const loadState = useCallback(async () => {
    const { data, error } = await supabase
      .from('project_closeout_status')
      .select('open_punch_items, required_checklist_open, unpaid_invoice_total')
      .eq('project_id', projectId)
      .maybeSingle();

    if (error) {
      // Not fatal: the RPC enforces the same rules, so a failure here costs the
      // explanation but not the guard.
      logger.error('Could not read closeout state for the status control', error);
      return;
    }
    setState({
      openPunchItems: Number(data?.open_punch_items) || 0,
      requiredChecklistOpen: Number(data?.required_checklist_open) || 0,
      unpaidInvoiceTotal: Number(data?.unpaid_invoice_total) || 0,
      hasStartDate: Boolean(startDate),
    });
  }, [projectId, startDate]);

  useEffect(() => { void loadState(); }, [loadState]);

  const apply = async (next: ProjectStatus, overrideReason?: string) => {
    setSaving(true);
    const { error } = await supabase.rpc('set_project_status', {
      p_project_id: projectId,
      p_status: next,
      p_override_reason: overrideReason || null,
    });
    setSaving(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: `Could not mark this project ${PROJECT_STATUS_LABELS[next].toLowerCase()}`,
        description: error.message,
      });
      return;
    }

    toast({ title: `Project is now ${PROJECT_STATUS_LABELS[next].toLowerCase()}` });
    setPending(null);
    setReason('');
    onChanged?.(next);
    void loadState();
  };

  const select = (next: ProjectStatus) => {
    const check = checkTransition(current, next, state);
    if (check.allowed) {
      void apply(next);
      return;
    }
    if (!check.overridable) {
      toast({ variant: 'destructive', title: 'Not possible', description: check.reason });
      return;
    }
    setPending(next);
  };

  const pendingCheck = pending ? checkTransition(current, pending, state) : null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1 px-2" disabled={saving}>
            <Badge variant={VARIANTS[current]}>{PROJECT_STATUS_LABELS[current]}</Badge>
            <ChevronDown className="h-3 w-3 opacity-60" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {PROJECT_STATUSES.filter((s) => s !== current).map((s) => {
            const check = checkTransition(current, s, state);
            return (
              <DropdownMenuItem key={s} onSelect={() => select(s)}>
                <span className="flex flex-col">
                  <span>{PROJECT_STATUS_LABELS[s]}</span>
                  {!check.allowed && check.reason && (
                    <span className="text-xs text-muted-foreground">{check.reason}</span>
                  )}
                </span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={pending !== null} onOpenChange={(open) => { if (!open) { setPending(null); setReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Mark this project {pending ? PROJECT_STATUS_LABELS[pending].toLowerCase() : ''} anyway?
            </DialogTitle>
            <DialogDescription>{pendingCheck?.reason}</DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="status-override-reason">Why</Label>
            <Textarea
              id="status-override-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="The owner accepted the two remaining items in writing."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Recorded in the audit trail against this project.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPending(null); setReason(''); }}>
              Cancel
            </Button>
            <Button
              onClick={() => pending && apply(pending, reason.trim())}
              disabled={saving || reason.trim().length < 5}
            >
              {saving ? 'Saving...' : 'Change status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ProjectStatusControl;
