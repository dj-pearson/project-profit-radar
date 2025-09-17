import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, 
  DollarSign, 
  Shield, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectHealth {
  id: string;
  name: string;
  overallHealth: 'excellent' | 'good' | 'warning' | 'critical';
  budget: {
    spent: number;
    total: number;
    variance: number;
  };
  schedule: {
    completion: number;
    daysRemaining: number;
    onTrack: boolean;
  };
  safety: {
    incidents: number;
    score: number;
    lastIncident?: string;
  };
}

interface ProjectHealthIndicatorProps {
  projects: ProjectHealth[];
  className?: string;
}

export const ProjectHealthIndicator = ({ projects, className }: ProjectHealthIndicatorProps) => {
  const getHealthColor = (health: ProjectHealth['overallHealth']) => {
    switch (health) {
      case 'excellent':
        return 'bg-green-500 text-white';
      case 'good':
        return 'bg-blue-500 text-white';
      case 'warning':
        return 'bg-yellow-500 text-white';
      case 'critical':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getHealthIcon = (health: ProjectHealth['overallHealth']) => {
    switch (health) {
      case 'excellent':
        return <CheckCircle className="h-4 w-4" />;
      case 'good':
        return <CheckCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'critical':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Project Health Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {projects.map((project) => (
          <div key={project.id} className="border rounded-lg p-4 space-y-3">
            {/* Project Header */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-base">{project.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {project.schedule.daysRemaining} days remaining
                </p>
              </div>
              <Badge className={cn("flex items-center gap-1", getHealthColor(project.overallHealth))}>
                {getHealthIcon(project.overallHealth)}
                <span className="capitalize">{project.overallHealth}</span>
              </Badge>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Budget Health */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  Budget
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Spent: {formatCurrency(project.budget.spent)}</span>
                    <span>Total: {formatCurrency(project.budget.total)}</span>
                  </div>
                  <Progress 
                    value={(project.budget.spent / project.budget.total) * 100} 
                    className="h-2"
                  />
                  <p className={cn(
                    "text-xs font-medium",
                    project.budget.variance > 0 ? "text-red-600" : "text-green-600"
                  )}>
                    {project.budget.variance > 0 ? '+' : ''}{project.budget.variance}% variance
                  </p>
                </div>
              </div>

              {/* Schedule Health */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  Schedule
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Complete</span>
                    <span>{project.schedule.completion}%</span>
                  </div>
                  <Progress value={project.schedule.completion} className="h-2" />
                  <p className={cn(
                    "text-xs font-medium flex items-center gap-1",
                    project.schedule.onTrack ? "text-green-600" : "text-red-600"
                  )}>
                    <Clock className="h-3 w-3" />
                    {project.schedule.onTrack ? 'On Track' : 'Behind Schedule'}
                  </p>
                </div>
              </div>

              {/* Safety Health */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Shield className="h-4 w-4 text-orange-600" />
                  Safety
                </div>
                <div className="space-y-1">
                  <div className="text-xs">
                    <span className="font-medium">Score: </span>
                    <span className={cn(
                      "font-bold",
                      project.safety.score >= 90 ? "text-green-600" :
                      project.safety.score >= 70 ? "text-yellow-600" : "text-red-600"
                    )}>
                      {project.safety.score}/100
                    </span>
                  </div>
                  <Progress 
                    value={project.safety.score} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    {project.safety.incidents} incidents this month
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};