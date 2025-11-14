import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Calendar,
  DollarSign,
  MapPin,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  Bell
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  completion_percentage?: number;
  budget_total?: number;
  actual_cost?: number;
  start_date?: string;
  end_date?: string;
  estimated_completion?: string;
  project_address?: any;
  site_address?: string;
}

interface ProjectStats {
  scheduleStatus: 'ahead' | 'on_track' | 'behind';
  budgetStatus: 'under' | 'on_budget' | 'over';
  budgetVariance: number;
  unreadUpdates: number;
  daysRemaining?: number;
}

interface ClientProjectOverviewProps {
  project: Project;
  stats?: ProjectStats;
}

export const ClientProjectOverview: React.FC<ClientProjectOverviewProps> = ({
  project,
  stats
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-600 text-white';
      case 'active':
      case 'in_progress':
        return 'bg-blue-600 text-white';
      case 'on_hold':
        return 'bg-yellow-600 text-white';
      case 'planning':
        return 'bg-purple-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  const getStatusText = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getScheduleStatusIcon = (status?: 'ahead' | 'on_track' | 'behind') => {
    switch (status) {
      case 'ahead':
        return <TrendingUp className="h-5 w-5 text-green-600" />;
      case 'on_track':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'behind':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getBudgetStatusIcon = (status?: 'under' | 'on_budget' | 'over') => {
    switch (status) {
      case 'under':
        return <TrendingDown className="h-5 w-5 text-green-600" />;
      case 'on_budget':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'over':
        return <TrendingUp className="h-5 w-5 text-red-600" />;
      default:
        return <DollarSign className="h-5 w-5 text-gray-500" />;
    }
  };

  const getScheduleStatusText = (status?: 'ahead' | 'on_track' | 'behind') => {
    switch (status) {
      case 'ahead':
        return 'Ahead of Schedule';
      case 'on_track':
        return 'On Track';
      case 'behind':
        return 'Behind Schedule';
      default:
        return 'Status Unknown';
    }
  };

  const getBudgetStatusText = (status?: 'under' | 'on_budget' | 'over', variance?: number) => {
    if (!variance) return 'On Budget';

    const varianceText = formatCurrency(Math.abs(variance));

    switch (status) {
      case 'under':
        return `Under ${varianceText}`;
      case 'on_budget':
        return 'On Budget';
      case 'over':
        return `Over ${varianceText}`;
      default:
        return 'Status Unknown';
    }
  };

  const getAddress = () => {
    if (project.site_address) return project.site_address;
    if (project.project_address) {
      if (typeof project.project_address === 'string') return project.project_address;
      if (typeof project.project_address === 'object') {
        const addr = project.project_address;
        return `${addr.street || ''} ${addr.city || ''}, ${addr.state || ''} ${addr.zip || ''}`.trim();
      }
    }
    return 'Address not specified';
  };

  const completionPercentage = project.completion_percentage || 0;

  return (
    <Card className="overflow-hidden border-2">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <CardTitle className="text-2xl font-bold">{project.name}</CardTitle>
              <Badge className={getStatusColor(project.status)}>
                {getStatusText(project.status)}
              </Badge>
            </div>
            {project.description && (
              <CardDescription className="text-base mt-2">
                {project.description}
              </CardDescription>
            )}
            <div className="flex items-center text-sm text-muted-foreground mt-2">
              <MapPin className="h-4 w-4 mr-1" />
              {getAddress()}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Project Progress</h3>
            <span className="text-2xl font-bold text-blue-600">{completionPercentage}%</span>
          </div>
          <Progress value={completionPercentage} className="h-3" />
          <p className="text-sm text-muted-foreground mt-2">
            {completionPercentage < 25 && "Just getting started"}
            {completionPercentage >= 25 && completionPercentage < 50 && "Making good progress"}
            {completionPercentage >= 50 && completionPercentage < 75 && "More than halfway there"}
            {completionPercentage >= 75 && completionPercentage < 100 && "Almost complete"}
            {completionPercentage === 100 && "Project complete"}
          </p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Schedule Status */}
          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-3">
                {getScheduleStatusIcon(stats?.scheduleStatus)}
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">Schedule</h4>
                  <p className="text-lg font-bold mt-1">
                    {getScheduleStatusText(stats?.scheduleStatus)}
                  </p>
                  {stats?.daysRemaining !== undefined && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.daysRemaining} days remaining
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Budget Status */}
          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-3">
                {getBudgetStatusIcon(stats?.budgetStatus)}
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">Budget</h4>
                  <p className="text-lg font-bold mt-1">
                    {getBudgetStatusText(stats?.budgetStatus, stats?.budgetVariance)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(project.actual_cost)} of {formatCurrency(project.budget_total)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Updates */}
          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-3">
                <Bell className="h-5 w-5 text-blue-600" />
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">Updates</h4>
                  <p className="text-lg font-bold mt-1">
                    {stats?.unreadUpdates || 0} New
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats?.unreadUpdates ? 'Click to view' : 'All caught up'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Project Timeline */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="flex items-start space-x-3">
            <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Start Date</p>
              <p className="text-base font-semibold">{formatDate(project.start_date)}</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Target Completion</p>
              <p className="text-base font-semibold">
                {formatDate(project.estimated_completion || project.end_date)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
