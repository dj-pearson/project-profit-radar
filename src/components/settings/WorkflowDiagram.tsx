import { ArrowRight, CheckCircle2, UserCog } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  describeStepApprover,
  sortSteps,
  type ApprovalStep,
} from '@/lib/approval-workflows';

interface WorkflowDiagramProps {
  steps: ApprovalStep[];
  className?: string;
}

/**
 * US-087: visual workflow diagram — renders the approval chain as connected
 * nodes (Submitted → step → step → Approved) with arrows between them.
 */
export function WorkflowDiagram({ steps, className }: WorkflowDiagramProps) {
  const ordered = sortSteps(steps);

  return (
    <div
      className={cn('flex flex-wrap items-stretch gap-2', className)}
      role="list"
      aria-label="Approval workflow steps"
    >
      <Node label="Submitted" sublabel="Start" tone="muted" />
      {ordered.length === 0 ? (
        <>
          <Arrow />
          <Node label="No steps yet" sublabel="Add a step" tone="dashed" />
        </>
      ) : (
        ordered.map((step) => (
          <div key={step.id} className="flex items-stretch gap-2" role="listitem">
            <Arrow />
            <Node
              label={`Step ${step.order}`}
              sublabel={describeStepApprover(step)}
              icon={<UserCog className="h-3.5 w-3.5" aria-hidden="true" />}
              tone="primary"
            />
          </div>
        ))
      )}
      <Arrow />
      <Node
        label="Approved"
        sublabel="End"
        icon={<CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
        tone="success"
      />
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex items-center text-muted-foreground" aria-hidden="true">
      <ArrowRight className="h-4 w-4" />
    </div>
  );
}

const TONE_CLASSES: Record<string, string> = {
  muted: 'border-border bg-muted/40 text-foreground',
  primary: 'border-primary/40 bg-primary/10 text-foreground',
  success: 'border-green-500/40 bg-green-500/10 text-foreground',
  dashed: 'border-dashed border-muted-foreground/40 bg-transparent text-muted-foreground',
};

function Node({
  label,
  sublabel,
  icon,
  tone = 'muted',
}: {
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  tone?: keyof typeof TONE_CLASSES | string;
}) {
  return (
    <div
      className={cn(
        'flex min-w-[7rem] flex-col justify-center rounded-md border px-3 py-2 text-center shadow-sm',
        TONE_CLASSES[tone] ?? TONE_CLASSES.muted
      )}
    >
      <span className="flex items-center justify-center gap-1 text-xs font-semibold">
        {icon}
        {label}
      </span>
      {sublabel && <span className="mt-0.5 truncate text-[11px] text-muted-foreground">{sublabel}</span>}
    </div>
  );
}

export default WorkflowDiagram;
