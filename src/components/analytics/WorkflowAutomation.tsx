import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Play,
  Pause, 
  Settings, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Plus,
  BarChart3,
  Zap,
  Timer
} from "lucide-react";

interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  trigger_type: string;
  trigger_config: any;
  workflow_steps: any;
  created_at: string;
}

interface WorkflowExecution {
  id: string;
  workflow_id: string;
  status: string;
  started_at: string;
  completed_at?: string;
  total_steps: number;
  completed_steps: number;
  execution_log: any;
}

interface WorkflowAnalytics {
  workflow_id: string;
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  average_execution_time_ms: number;
  total_time_saved_hours: number;
}

export default function WorkflowAutomation() {
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [analytics, setAnalytics] = useState<WorkflowAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadWorkflowData();
  }, []);

  const loadWorkflowData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadWorkflows(),
        loadExecutions(),
        loadAnalytics()
      ]);
    } catch (error) {
      console.error('Error loading workflow data:', error);
      toast({
        title: "Error",
        description: "Failed to load workflow data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadWorkflows = async () => {
    const { data, error } = await supabase
      .from('workflow_definitions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    setWorkflows(data || []);
  };

  const loadExecutions = async () => {
    const { data, error } = await supabase
      .from('workflow_executions')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    setExecutions(data || []);
  };

  const loadAnalytics = async () => {
    const { data, error } = await supabase
      .from('workflow_analytics')
      .select('*')
      .gte('period_start', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (error) throw error;
    setAnalytics(data || []);
  };

  const executeWorkflow = async (workflowId: string) => {
    try {
      setExecuting(workflowId);
      
      const { error } = await supabase.functions.invoke('execute-workflow', {
        body: { 
          workflowId,
          triggerData: { 
            triggered_by: 'manual',
            triggered_at: new Date().toISOString()
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Workflow Started",
        description: "Workflow execution has been initiated",
      });

      // Refresh executions
      await loadExecutions();
    } catch (error) {
      console.error('Error executing workflow:', error);
      toast({
        title: "Execution Failed",
        description: "Failed to start workflow execution",
        variant: "destructive",
      });
    } finally {
      setExecuting(null);
    }
  };

  const toggleWorkflow = async (workflowId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('workflow_definitions')
        .update({ is_active: !isActive })
        .eq('id', workflowId);

      if (error) throw error;

      toast({
        title: isActive ? "Workflow Disabled" : "Workflow Enabled",
        description: `Workflow has been ${isActive ? 'disabled' : 'enabled'}`,
      });

      await loadWorkflows();
    } catch (error) {
      console.error('Error toggling workflow:', error);
      toast({
        title: "Error",
        description: "Failed to update workflow status",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success text-success-foreground';
      case 'running': return 'bg-warning text-warning-foreground';
      case 'failed': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'running': return <Clock className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getTriggerDisplayName = (triggerType: string, config: any) => {
    switch (triggerType) {
      case 'schedule':
        return `Daily at ${config.time || '18:00'}`;
      case 'event':
        return `On ${config.event_type || 'event'}`;
      case 'condition':
        return `When condition met`;
      default:
        return triggerType;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading workflow automation...</p>
        </div>
      </div>
    );
  }

  const totalExecutions = analytics.reduce((sum, a) => sum + a.total_executions, 0);
  const successfulExecutions = analytics.reduce((sum, a) => sum + a.successful_executions, 0);
  const totalTimeSaved = analytics.reduce((sum, a) => sum + Number(a.total_time_saved_hours), 0);
  const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Workflow Automation</h2>
          <p className="text-muted-foreground">
            Automate repetitive tasks and processes
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workflows.filter(w => w.is_active).length}</div>
            <p className="text-xs text-muted-foreground">
              {workflows.length} total workflows
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Executions (30d)</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExecutions}</div>
            <p className="text-xs text-muted-foreground">
              {successRate.toFixed(1)}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTimeSaved.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate.toFixed(1)}%</div>
            <Progress value={successRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="workflows" className="space-y-4">
        <TabsList>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="executions">Recent Executions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="space-y-4">
          <div className="grid gap-4">
            {workflows.map((workflow) => (
              <Card key={workflow.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        {workflow.name}
                        <Badge variant={workflow.is_active ? "default" : "secondary"}>
                          {workflow.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {workflow.description}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleWorkflow(workflow.id, workflow.is_active)}
                      >
                        {workflow.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => executeWorkflow(workflow.id)}
                        disabled={executing === workflow.id || !workflow.is_active}
                      >
                        {executing === workflow.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        {executing === workflow.id ? "Executing..." : "Run Now"}
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Trigger: {getTriggerDisplayName(workflow.trigger_type, workflow.trigger_config)}</span>
                      <span>Steps: {Array.isArray(workflow.workflow_steps) ? workflow.workflow_steps.length : 0}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(workflow.workflow_steps) && workflow.workflow_steps.map((step: any, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {step.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="executions" className="space-y-4">
          <div className="grid gap-4">
            {executions.map((execution) => {
              const workflow = workflows.find(w => w.id === execution.workflow_id);
              const progress = execution.total_steps > 0 ? (execution.completed_steps / execution.total_steps) * 100 : 0;
              
              return (
                <Card key={execution.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                          {workflow?.name || 'Unknown Workflow'}
                          <Badge className={getStatusColor(execution.status)}>
                            {getStatusIcon(execution.status)}
                            {execution.status}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          Started: {new Date(execution.started_at).toLocaleString()}
                          {execution.completed_at && (
                            <span> • Completed: {new Date(execution.completed_at).toLocaleString()}</span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>Progress</span>
                          <span>{execution.completed_steps}/{execution.total_steps} steps</span>
                        </div>
                        <Progress value={progress} />
                      </div>
                      
                      {Array.isArray(execution.execution_log) && execution.execution_log.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Recent Activity</h4>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {execution.execution_log.slice(-5).map((log: any, index: number) => (
                              <div key={index} className="flex items-center gap-2 text-xs">
                                <span className="text-muted-foreground">
                                  {new Date(log.timestamp).toLocaleTimeString()}
                                </span>
                                <span className={
                                  log.level === 'error' ? 'text-destructive' :
                                  log.level === 'success' ? 'text-success' :
                                  'text-foreground'
                                }>
                                  {log.message}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4">
            {workflows.map((workflow) => {
              const workflowAnalytics = analytics.filter(a => a.workflow_id === workflow.id);
              const totalExecs = workflowAnalytics.reduce((sum, a) => sum + a.total_executions, 0);
              const successfulExecs = workflowAnalytics.reduce((sum, a) => sum + a.successful_executions, 0);
              const timeSaved = workflowAnalytics.reduce((sum, a) => sum + Number(a.total_time_saved_hours), 0);
              const successRateWorkflow = totalExecs > 0 ? (successfulExecs / totalExecs) * 100 : 0;

              return (
                <Card key={workflow.id}>
                  <CardHeader>
                    <CardTitle>{workflow.name}</CardTitle>
                    <CardDescription>Performance metrics (30 days)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{totalExecs}</div>
                        <div className="text-xs text-muted-foreground">Executions</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{successRateWorkflow.toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">Success Rate</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{timeSaved.toFixed(1)}h</div>
                        <div className="text-xs text-muted-foreground">Time Saved</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {workflowAnalytics[0]?.average_execution_time_ms 
                            ? Math.round(workflowAnalytics[0].average_execution_time_ms / 1000) 
                            : 0}s
                        </div>
                        <div className="text-xs text-muted-foreground">Avg Duration</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}