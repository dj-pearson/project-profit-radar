import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Milestone {
  id: string;
  title: string;
  description?: string;
  status: 'completed' | 'in_progress' | 'pending' | 'blocked';
  targetDate?: string;
  completedDate?: string;
  progress?: number;
  phase?: string;
}

interface ClientProgressTimelineProps {
  milestones: Milestone[];
  showPhases?: boolean;
}

export const ClientProgressTimeline: React.FC<ClientProgressTimelineProps> = ({
  milestones,
  showPhases = true
}) => {
  const getMilestoneIcon = (status: Milestone['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-6 w-6 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-6 w-6 text-blue-600 animate-pulse" />;
      case 'blocked':
        return <AlertCircle className="h-6 w-6 text-red-600" />;
      case 'pending':
      default:
        return <Circle className="h-6 w-6 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: Milestone['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-600 text-white">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-600 text-white">In Progress</Badge>;
      case 'blocked':
        return <Badge className="bg-red-600 text-white">Blocked</Badge>;
      case 'pending':
      default:
        return <Badge variant="outline" className="text-gray-600">Not Started</Badge>;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isOverdue = (targetDate?: string, status?: Milestone['status']) => {
    if (!targetDate || status === 'completed') return false;
    return new Date(targetDate) < new Date();
  };

  // Group milestones by phase if needed
  const groupedMilestones = showPhases
    ? milestones.reduce((acc, milestone) => {
        const phase = milestone.phase || 'General';
        if (!acc[phase]) acc[phase] = [];
        acc[phase].push(milestone);
        return acc;
      }, {} as Record<string, Milestone[]>)
    : { 'All Milestones': milestones };

  const renderMilestone = (milestone: Milestone, index: number, isLast: boolean) => {
    const overdue = isOverdue(milestone.targetDate, milestone.status);

    return (
      <div key={milestone.id} className="relative">
        {/* Timeline connector line */}
        {!isLast && (
          <div
            className={cn(
              "absolute left-3 top-8 bottom-0 w-0.5",
              milestone.status === 'completed' ? 'bg-green-600' : 'bg-gray-300'
            )}
            style={{ height: 'calc(100% + 1rem)' }}
          />
        )}

        <div className="flex items-start space-x-4 pb-8">
          {/* Icon */}
          <div className="relative z-10 flex-shrink-0">
            {getMilestoneIcon(milestone.status)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1">
                <h4 className="font-semibold text-base mb-1">{milestone.title}</h4>
                {milestone.description && (
                  <p className="text-sm text-muted-foreground">{milestone.description}</p>
                )}
              </div>
              {getStatusBadge(milestone.status)}
            </div>

            {/* Progress bar for in-progress items */}
            {milestone.status === 'in_progress' && milestone.progress !== undefined && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">Progress</span>
                  <span className="text-xs font-semibold text-blue-600">{milestone.progress}%</span>
                </div>
                <Progress value={milestone.progress} className="h-2" />
              </div>
            )}

            {/* Dates */}
            <div className="flex items-center gap-4 text-sm">
              {milestone.completedDate && (
                <div className="flex items-center text-green-600">
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  <span>Completed {formatDate(milestone.completedDate)}</span>
                </div>
              )}
              {!milestone.completedDate && milestone.targetDate && (
                <div className={cn(
                  "flex items-center",
                  overdue ? "text-red-600 font-medium" : "text-muted-foreground"
                )}>
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>
                    {overdue ? 'Overdue: ' : 'Target: '}
                    {formatDate(milestone.targetDate)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const completedCount = milestones.filter(m => m.status === 'completed').length;
  const totalCount = milestones.length;
  const overallProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Project Milestones</CardTitle>
            <CardDescription>
              Track key milestones and project phases
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{completedCount}/{totalCount}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
        </div>
        {/* Overall Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm font-semibold text-blue-600">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>
      </CardHeader>

      <CardContent>
        {milestones.length === 0 ? (
          <div className="text-center py-12">
            <Circle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Milestones Yet</h3>
            <p className="text-muted-foreground">
              Milestones will appear here as your project progresses
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedMilestones).map(([phase, phaseMilestones]) => (
              <div key={phase}>
                {showPhases && Object.keys(groupedMilestones).length > 1 && (
                  <h3 className="text-lg font-semibold mb-4 pb-2 border-b">
                    {phase}
                  </h3>
                )}
                <div>
                  {phaseMilestones.map((milestone, index) =>
                    renderMilestone(
                      milestone,
                      index,
                      index === phaseMilestones.length - 1
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
