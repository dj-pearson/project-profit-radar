import React from 'react';
import { FINISHED_STATUSES, normalizeProjectStatus } from '@/lib/projectStatus';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectHealthProps {
  budget?: number | null;
  spent?: number;
  completion_percentage?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string;
  /** US-223: days the current schedule has slipped past its baseline finish. */
  scheduleSlipDays?: number;
  className?: string;
}

type HealthLevel = 'healthy' | 'at_risk' | 'critical';

interface HealthResult {
  level: HealthLevel;
  reasons: string[];
}

function computeHealth(project: ProjectHealthProps): HealthResult {
  const reasons: string[] = [];
  let worstLevel: HealthLevel = 'healthy';

  const setLevel = (level: HealthLevel) => {
    if (level === 'critical') worstLevel = 'critical';
    else if (level === 'at_risk' && worstLevel !== 'critical') worstLevel = 'at_risk';
  };

  // Budget check
  if (project.budget && project.budget > 0 && project.spent !== undefined) {
    const variance = (project.spent - project.budget) / project.budget;
    if (variance > 0.10) {
      setLevel('critical');
      reasons.push(`Budget exceeded by ${Math.round(variance * 100)}%`);
    } else if (variance > 0.05) {
      setLevel('at_risk');
      reasons.push(`Budget nearing limit (${Math.round(variance * 100)}% over)`);
    }
  }

  // Schedule check
  if (project.end_date && !FINISHED_STATUSES.includes(normalizeProjectStatus(project.status))) {
    const now = new Date();
    const endDate = new Date(project.end_date);
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining < -7) {
      setLevel('critical');
      reasons.push(`${Math.abs(daysRemaining)} days past deadline`);
    } else if (daysRemaining < 0) {
      setLevel('at_risk');
      reasons.push(`${Math.abs(daysRemaining)} days past deadline`);
    } else if (daysRemaining < 7 && (project.completion_percentage ?? 0) < 90) {
      setLevel('at_risk');
      reasons.push(`Only ${daysRemaining} days left with ${project.completion_percentage ?? 0}% complete`);
    }
  }

  // Schedule slip vs baseline (US-223): critical-path finish drift.
  if (project.scheduleSlipDays !== undefined && project.scheduleSlipDays > 0 && !FINISHED_STATUSES.includes(normalizeProjectStatus(project.status))) {
    const slip = project.scheduleSlipDays;
    if (slip > 14) {
      setLevel('critical');
      reasons.push(`${slip} days behind baseline schedule`);
    } else if (slip > 7) {
      setLevel('at_risk');
      reasons.push(`${slip} days behind baseline schedule`);
    }
  }

  // Completion vs expected progress
  if (project.start_date && project.end_date && !FINISHED_STATUSES.includes(normalizeProjectStatus(project.status))) {
    const start = new Date(project.start_date).getTime();
    const end = new Date(project.end_date).getTime();
    const now = Date.now();
    const totalDuration = end - start;

    if (totalDuration > 0 && now > start) {
      const expectedProgress = Math.min(100, Math.round(((now - start) / totalDuration) * 100));
      const actualProgress = project.completion_percentage ?? 0;
      const gap = expectedProgress - actualProgress;

      if (gap > 25) {
        setLevel('critical');
        reasons.push(`${gap}% behind expected progress`);
      } else if (gap > 15) {
        setLevel('at_risk');
        reasons.push(`${gap}% behind expected progress`);
      }
    }
  }

  if (reasons.length === 0) {
    reasons.push('Project is on track');
  }

  return { level: worstLevel, reasons };
}

const HEALTH_CONFIG = {
  healthy: {
    label: 'Healthy',
    icon: CheckCircle,
    badgeClass: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  },
  at_risk: {
    label: 'At Risk',
    icon: AlertTriangle,
    badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  },
  critical: {
    label: 'Critical',
    icon: AlertCircle,
    badgeClass: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  },
};

export const ProjectHealthBadge: React.FC<ProjectHealthProps> = (props) => {
  const { level, reasons } = computeHealth(props);
  const config = HEALTH_CONFIG[level];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn('gap-1 cursor-default', config.badgeClass, props.className)}
            aria-label={`Health: ${config.label}`}
          >
            <Icon className="h-3 w-3" aria-hidden="true" />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <ul className="text-xs space-y-1">
            {reasons.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export { computeHealth, type HealthLevel, type HealthResult };
export default ProjectHealthBadge;
