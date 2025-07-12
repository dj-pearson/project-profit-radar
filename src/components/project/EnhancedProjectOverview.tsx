import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import {
  DollarSign,
  Calendar,
  Users,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  Wrench,
  FileText,
  BarChart3
} from 'lucide-react';

interface ProjectData {
  id: string;
  name: string;
  description: string;
  status: string;
  budget: number;
  start_date: string;
  end_date: string;
  completion_percentage: number;
  client_name: string;
  project_type: string;
}

interface ProjectMetrics {
  financial: {
    budget: number;
    actual_costs: number;
    invoiced: number;
    payments_received: number;
    profit_margin: number;
    change_orders_value: number;
    remaining_budget: number;
  };
  schedule: {
    days_elapsed: number;
    days_remaining: number;
    schedule_variance: number;
    critical_path_delay: number;
  };
  performance: {
    tasks_completed: number;
    tasks_total: number;
    open_rfis: number;
    pending_submittals: number;
    punch_list_items: number;
  };
  resources: {
    crew_count: number;
    equipment_items: number;
    subcontractors: number;
    materials_on_order: number;
  };
}

interface EnhancedProjectOverviewProps {
  projectId: string;
}

const EnhancedProjectOverview: React.FC<EnhancedProjectOverviewProps> = ({ projectId }) => {
  const { userProfile } = useAuth();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [metrics, setMetrics] = useState<ProjectMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<Array<{type: string, message: string}>>([]);

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      setLoading(true);

      // Load project basic data
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Load job costs for financial metrics
      const { data: jobCosts, error: jobCostsError } = await supabase
        .from('job_costs')
        .select('*')
        .eq('project_id', projectId);

      if (jobCostsError) throw jobCostsError;

      // Load contractor payments
      const { data: contractorPayments, error: contractorError } = await supabase
        .from('contractor_payments')
        .select('*')
        .eq('project_id', projectId);

      if (contractorError) throw contractorError;

      // Load change orders
      const { data: changeOrders, error: changeOrdersError } = await supabase
        .from('change_orders')
        .select('*')
        .eq('project_id', projectId);

      if (changeOrdersError) throw changeOrdersError;

      // Load tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId);

      if (tasksError) throw tasksError;

      // Load RFIs
      const { data: rfis, error: rfisError } = await supabase
        .from('rfis')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'submitted');

      // Load submittals
      const { data: submittals, error: submittalsError } = await supabase
        .from('submittals')
        .select('*')
        .eq('project_id', projectId)
        .in('status', ['submitted', 'under_review']);

      // Load punch list items
      const { data: punchItems, error: punchError } = await supabase
        .from('punch_list_items')
        .select('*')
        .eq('project_id', projectId)
        .neq('status', 'completed');

      // Calculate metrics
      const totalJobCosts = (jobCosts || []).reduce((sum, cost) => sum + (cost.total_cost || 0), 0);
      const totalContractorPayments = (contractorPayments || []).reduce((sum, payment) => sum + payment.amount, 0);
      const actualCosts = totalJobCosts + totalContractorPayments;
      
      const changeOrdersValue = (changeOrders || []).reduce((sum, co) => sum + co.amount, 0);
      const adjustedBudget = projectData.budget + changeOrdersValue;
      const remainingBudget = adjustedBudget - actualCosts;
      const profitMargin = adjustedBudget > 0 ? ((adjustedBudget - actualCosts) / adjustedBudget) * 100 : 0;

      // Schedule calculations
      const startDate = new Date(projectData.start_date);
      const endDate = new Date(projectData.end_date);
      const today = new Date();
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysElapsed = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const expectedProgress = totalDays > 0 ? (daysElapsed / totalDays) * 100 : 0;
      const scheduleVariance = projectData.completion_percentage - expectedProgress;

      // Task metrics
      const completedTasks = (tasks || []).filter(task => task.status === 'completed').length;
      const totalTasks = (tasks || []).length;

      const calculatedMetrics: ProjectMetrics = {
        financial: {
          budget: projectData.budget,
          actual_costs: actualCosts,
          invoiced: 0, // TODO: Calculate from invoices
          payments_received: 0, // TODO: Calculate from payments
          profit_margin: profitMargin,
          change_orders_value: changeOrdersValue,
          remaining_budget: remainingBudget
        },
        schedule: {
          days_elapsed: Math.max(0, daysElapsed),
          days_remaining: Math.max(0, daysRemaining),
          schedule_variance: scheduleVariance,
          critical_path_delay: 0 // TODO: Calculate from critical path analysis
        },
        performance: {
          tasks_completed: completedTasks,
          tasks_total: totalTasks,
          open_rfis: (rfis || []).length,
          pending_submittals: (submittals || []).length,
          punch_list_items: (punchItems || []).length
        },
        resources: {
          crew_count: 0, // TODO: Calculate from crew assignments
          equipment_items: 0, // TODO: Calculate from equipment
          subcontractors: (contractorPayments || []).length,
          materials_on_order: 0 // TODO: Calculate from purchase orders
        }
      };

      setMetrics(calculatedMetrics);

      // Generate alerts
      const projectAlerts = [];
      
      if (profitMargin < 5) {
        projectAlerts.push({
          type: 'warning',
          message: `Profit margin is ${profitMargin.toFixed(1)}% - below recommended 5% minimum`
        });
      }

      if (scheduleVariance < -10) {
        projectAlerts.push({
          type: 'warning',
          message: `Project is ${Math.abs(scheduleVariance).toFixed(1)}% behind schedule`
        });
      }

      if (remainingBudget < 0) {
        projectAlerts.push({
          type: 'error',
          message: `Project is over budget by $${Math.abs(remainingBudget).toLocaleString()}`
        });
      }

      if ((rfis || []).length > 5) {
        projectAlerts.push({
          type: 'warning',
          message: `${(rfis || []).length} open RFIs requiring attention`
        });
      }

      setAlerts(projectAlerts);

    } catch (error: any) {
      console.error('Error loading project data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load project overview data"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'on_hold':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getHealthScore = () => {
    if (!metrics) return { score: 0, label: 'Unknown', color: 'gray' };
    
    let score = 100;
    
    // Financial health (40% weight)
    if (metrics.financial.profit_margin < 0) score -= 40;
    else if (metrics.financial.profit_margin < 5) score -= 20;
    else if (metrics.financial.profit_margin < 10) score -= 10;
    
    // Schedule health (30% weight)
    if (metrics.schedule.schedule_variance < -20) score -= 30;
    else if (metrics.schedule.schedule_variance < -10) score -= 15;
    else if (metrics.schedule.schedule_variance < -5) score -= 8;
    
    // Performance health (30% weight)
    const taskCompletionRate = metrics.performance.tasks_total > 0 
      ? (metrics.performance.tasks_completed / metrics.performance.tasks_total) * 100 
      : 0;
    
    if (taskCompletionRate < project?.completion_percentage! - 10) score -= 20;
    if (metrics.performance.open_rfis > 10) score -= 5;
    if (metrics.performance.punch_list_items > 20) score -= 5;
    
    score = Math.max(0, Math.min(100, score));
    
    let label = 'Excellent';
    let color = 'green';
    
    if (score < 60) {
      label = 'Critical';
      color = 'red';
    } else if (score < 75) {
      label = 'Warning';
      color = 'yellow';
    } else if (score < 90) {
      label = 'Good';
      color = 'blue';
    }
    
    return { score, label, color };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!project || !metrics) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Unable to load project overview data.
        </AlertDescription>
      </Alert>
    );
  }

  const health = getHealthScore();

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground">{project.description}</p>
          <div className="flex items-center gap-4 mt-2">
            <Badge className={getStatusColor(project.status)}>
              {project.status.replace('_', ' ')}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Client: {project.client_name}
            </span>
            <span className="text-sm text-muted-foreground">
              Type: {project.project_type}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{health.score}/100</div>
          <Badge variant="outline" className={`border-${health.color}-500 text-${health.color}-700`}>
            {health.label}
          </Badge>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <Alert key={index} className={alert.type === 'error' ? 'border-red-500' : 'border-yellow-500'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Financial Overview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Financial Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Budget:</span>
                <span className="font-bold">${metrics.financial.budget.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Spent:</span>
                <span>${metrics.financial.actual_costs.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Remaining:</span>
                <span className={metrics.financial.remaining_budget >= 0 ? 'text-green-600' : 'text-red-600'}>
                  ${metrics.financial.remaining_budget.toLocaleString()}
                </span>
              </div>
              <div className="pt-2">
                <div className="flex justify-between text-sm mb-1">
                  <span>Profit Margin:</span>
                  <span className={metrics.financial.profit_margin >= 5 ? 'text-green-600' : 'text-red-600'}>
                    {metrics.financial.profit_margin.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule Overview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedule Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress:</span>
                <span className="font-bold">{project.completion_percentage}%</span>
              </div>
              <Progress value={project.completion_percentage} className="h-2" />
              <div className="flex justify-between text-sm">
                <span>Days Remaining:</span>
                <span>{metrics.schedule.days_remaining}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Schedule Variance:</span>
                <span className={metrics.schedule.schedule_variance >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {metrics.schedule.schedule_variance > 0 ? '+' : ''}{metrics.schedule.schedule_variance.toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Tasks:</span>
                <span>{metrics.performance.tasks_completed}/{metrics.performance.tasks_total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Open RFIs:</span>
                <span className={metrics.performance.open_rfis > 5 ? 'text-red-600' : 'text-green-600'}>
                  {metrics.performance.open_rfis}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Pending Submittals:</span>
                <span>{metrics.performance.pending_submittals}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Punch Items:</span>
                <span className={metrics.performance.punch_list_items > 10 ? 'text-red-600' : 'text-green-600'}>
                  {metrics.performance.punch_list_items}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resource Overview */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Active Crew:</span>
                <span>{metrics.resources.crew_count}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Subcontractors:</span>
                <span>{metrics.resources.subcontractors}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Equipment:</span>
                <span>{metrics.resources.equipment_items}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Materials Pending:</span>
                <span>{metrics.resources.materials_on_order}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm">
          <BarChart3 className="h-4 w-4 mr-2" />
          View P&L
        </Button>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          Generate Report
        </Button>
        <Button variant="outline" size="sm">
          <Wrench className="h-4 w-4 mr-2" />
          Update Schedule
        </Button>
        <Button variant="outline" size="sm">
          <Clock className="h-4 w-4 mr-2" />
          Time Tracking
        </Button>
      </div>
    </div>
  );
};

export default EnhancedProjectOverview;