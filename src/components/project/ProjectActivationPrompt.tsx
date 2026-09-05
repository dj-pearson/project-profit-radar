/**
 * "The crew is on site - is this job still in planning?" (US-328)
 *
 * Every project was created in planning and nothing moved it, so the honest
 * fix is not only a control the PM can find but a nudge at the moment the
 * status has visibly gone stale: someone has clocked approved hours or filed a
 * daily report on a job the product still calls planning.
 *
 * It asks rather than flipping the status behind their back. Status drives
 * what the customer sees and what the dashboard counts, so silently changing
 * it is a decision the product should not make on its own.
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { PlayCircle } from 'lucide-react';
import { shouldPromptToActivate } from '@/lib/projectStatus';

interface ProjectActivationPromptProps {
  projectId: string;
  status: string | null;
  startDate?: string | null;
  onChanged?: () => void;
}

export function ProjectActivationPrompt({
  projectId, status, startDate, onChanged,
}: ProjectActivationPromptProps) {
  const { toast } = useToast();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [saving, setSaving] = useState(false);

  const check = useCallback(async () => {
    // Cheap: head counts, not rows. This runs on every hub visit.
    const [time, reports] = await Promise.all([
      supabase
        .from('time_entries')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('approval_status', 'approved'),
      supabase
        .from('daily_reports')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId),
    ]);

    const failure = time.error || reports.error;
    if (failure) {
      logger.error('Could not check whether work has started', failure);
      return;
    }

    setShow(shouldPromptToActivate({
      status,
      hasApprovedTimeEntries: (time.count ?? 0) > 0,
      hasDailyReports: (reports.count ?? 0) > 0,
    }));
  }, [projectId, status]);

  useEffect(() => { void check(); }, [check]);

  const activate = async () => {
    setSaving(true);
    // No start date is the common case on a job that drifted into work without
    // ever being scheduled, so pass the reason up front rather than making the
    // PM hit a refusal first.
    const { error } = await supabase.rpc('set_project_status', {
      p_project_id: projectId,
      p_status: 'active',
      p_override_reason: startDate
        ? null
        : 'Work has already been logged on this job; activated without a start date.',
    });
    setSaving(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Could not mark this project active',
        description: error.message,
      });
      return;
    }
    toast({ title: 'Project is now active' });
    setShow(false);
    onChanged?.();
  };

  if (!show || dismissed) return null;

  return (
    <Alert>
      <PlayCircle className="h-4 w-4" aria-hidden="true" />
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>
          Hours and daily reports have been logged on this job, but it is still marked
          planning. That keeps it out of the active count and out of at-risk checks.
        </span>
        <span className="flex gap-2">
          <Button size="sm" onClick={activate} disabled={saving}>
            {saving ? 'Saving...' : 'Mark active'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
            Not now
          </Button>
        </span>
      </AlertDescription>
    </Alert>
  );
}

export default ProjectActivationPrompt;
