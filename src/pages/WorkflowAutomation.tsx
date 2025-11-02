import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Workflow,
  Play,
  Pause,
  Plus,
  Trash2,
  Edit,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Target,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface WorkflowData {
  id: string;
  name: string;
  description: string;
  category: string;
  is_active: boolean;
  is_template: boolean;
  execution_count: number;
  success_count: number;
  failure_count: number;
  last_executed_at: string;
  created_at: string;
}

interface WorkflowStats {
  total_workflows: number;
  active_workflows: number;
  total_executions: number;
  success_rate: number;
}

export const WorkflowAutomation = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [workflows, setWorkflows] = useState<WorkflowData[]>([]);
  const [templates, setTemplates] = useState<WorkflowData[]>([]);
  const [stats, setStats] = useState<WorkflowStats | null>(null);

  useEffect(() => {
    loadWorkflowData();
  }, []);

  const loadWorkflowData = async () => {
    setLoading(true);
    try {
      // Load user workflows
      const { data: workflowsData, error: workflowsError } = await supabase
        .from('workflows')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_template', false)
        .order('created_at', { ascending: false });

      if (workflowsError) throw workflowsError;
      setWorkflows(workflowsData || []);

      // Load templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('workflows')
        .select('*')
        .eq('is_template', true)
        .order('name');

      if (templatesError) throw templatesError;
      setTemplates(templatesData || []);

      // Calculate stats
      const totalWorkflows = workflowsData?.length || 0;
      const activeWorkflows = workflowsData?.filter(w => w.is_active).length || 0;
      const totalExecutions = workflowsData?.reduce((sum, w) => sum + (w.execution_count || 0), 0) || 0;
      const totalSuccess = workflowsData?.reduce((sum, w) => sum + (w.success_count || 0), 0) || 0;
      const successRate = totalExecutions > 0 ? (totalSuccess / totalExecutions) * 100 : 0;

      setStats({
        total_workflows: totalWorkflows,
        active_workflows: activeWorkflows,
        total_executions: totalExecutions,
        success_rate: successRate,
      });
    } catch (error) {
      console.error('Failed to load workflow data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load workflow data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleWorkflowStatus = async (workflowId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('workflows')
        .update({ is_active: !currentStatus })
        .eq('id', workflowId);

      if (error) throw error;

      toast({
        title: currentStatus ? 'Workflow Paused' : 'Workflow Activated',
        description: currentStatus ? 'Workflow has been paused.' : 'Workflow is now active.',
      });

      loadWorkflowData();
    } catch (error) {
      console.error('Failed to toggle workflow status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update workflow status.',
        variant: 'destructive',
      });
    }
  };

  const duplicateWorkflow = async (workflowId: string, name: string) => {
    try {
      // Get workflow data
      const { data: workflow, error: workflowError } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', workflowId)
        .single();

      if (workflowError) throw workflowError;

      // Create duplicate
      const { error: insertError } = await supabase.from('workflows').insert({
        user_id: user?.id,
        name: `${name} (Copy)`,
        description: workflow.description,
        category: workflow.category,
        is_active: false,
        execution_order: workflow.execution_order,
      });

      if (insertError) throw insertError;

      toast({
        title: 'Workflow Duplicated',
        description: 'A copy of the workflow has been created.',
      });

      loadWorkflowData();
    } catch (error) {
      console.error('Failed to duplicate workflow:', error);
      toast({
        title: 'Error',
        description: 'Failed to duplicate workflow.',
        variant: 'destructive',
      });
    }
  };

  const deleteWorkflow = async (workflowId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const { error } = await supabase
        .from('workflows')
        .delete()
        .eq('id', workflowId);

      if (error) throw error;

      toast({
        title: 'Workflow Deleted',
        description: 'The workflow has been deleted.',
      });

      loadWorkflowData();
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete workflow.',
        variant: 'destructive',
      });
    }
  };

  const useTemplate = async (templateId: string, templateName: string) => {
    try {
      const { data: template, error: templateError } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;

      const { error: insertError } = await supabase.from('workflows').insert({
        user_id: user?.id,
        name: templateName,
        description: template.description,
        category: template.category,
        is_active: false,
      });

      if (insertError) throw insertError;

      toast({
        title: 'Template Added',
        description: 'Workflow template has been added to your workflows.',
      });

      loadWorkflowData();
    } catch (error) {
      console.error('Failed to use template:', error);
      toast({
        title: 'Error',
        description: 'Failed to add template.',
        variant: 'destructive',
      });
    }
  };

  const getCategoryBadge = (category: string) => {
    const config = {
      user_engagement: { color: 'bg-blue-500', label: 'User Engagement' },
      project_automation: { color: 'bg-green-500', label: 'Project Automation' },
      financial: { color: 'bg-purple-500', label: 'Financial' },
      notifications: { color: 'bg-orange-500', label: 'Notifications' },
    };

    const { color, label } = config[category as keyof typeof config] || { color: 'bg-gray-500', label: category };
    return <Badge className={`${color} text-white`}>{label}</Badge>;
  };

  const getSuccessRate = (workflow: WorkflowData) => {
    if (workflow.execution_count === 0) return 0;
    return Math.round((workflow.success_count / workflow.execution_count) * 100);
  };

  if (loading) {
    return (
      <DashboardLayout title="Workflow Automation">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Workflow className="w-12 h-12 text-construction-orange animate-pulse mx-auto mb-4" />
            <p className="text-muted-foreground">Loading workflows...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Workflow Automation">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-construction-dark">Workflow Automation</h1>
            <p className="text-muted-foreground">
              Create automated workflows to streamline your business processes
            </p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Workflow
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Workflows</p>
                  <p className="text-2xl font-bold mt-2">{stats?.total_workflows || 0}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Workflow className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold mt-2">{stats?.active_workflows || 0}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Executions</p>
                  <p className="text-2xl font-bold mt-2">{stats?.total_executions || 0}</p>
                </div>
                <div className="bg-orange-100 p-3 rounded-lg">
                  <Zap className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold mt-2">{stats?.success_rate.toFixed(0) || 0}%</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="my-workflows">
          <TabsList>
            <TabsTrigger value="my-workflows">My Workflows ({workflows.length})</TabsTrigger>
            <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
          </TabsList>

          {/* My Workflows Tab */}
          <TabsContent value="my-workflows" className="space-y-4">
            {workflows.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Workflow className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    You haven't created any workflows yet
                  </p>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Workflow
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {workflows.map((workflow) => (
                  <Card key={workflow.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{workflow.name}</h3>
                            {getCategoryBadge(workflow.category)}
                            {workflow.is_active ? (
                              <Badge className="bg-green-500 text-white">Active</Badge>
                            ) : (
                              <Badge className="bg-gray-500 text-white">Paused</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{workflow.description}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Executions</p>
                          <p className="font-semibold">{workflow.execution_count}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Success Rate</p>
                          <p className="font-semibold">{getSuccessRate(workflow)}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Successes</p>
                          <p className="font-semibold text-green-600">{workflow.success_count}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Failures</p>
                          <p className="font-semibold text-red-600">{workflow.failure_count}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={workflow.is_active ? 'outline' : 'default'}
                          onClick={() => toggleWorkflowStatus(workflow.id, workflow.is_active)}
                        >
                          {workflow.is_active ? (
                            <>
                              <Pause className="w-4 h-4 mr-2" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Activate
                            </>
                          )}
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => duplicateWorkflow(workflow.id, workflow.name)}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteWorkflow(workflow.id, workflow.name)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>

                      {workflow.last_executed_at && (
                        <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Last executed: {new Date(workflow.last_executed_at).toLocaleString()}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <Card key={template.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      {getCategoryBadge(template.category)}
                    </div>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => useTemplate(template.id, template.name)}
                    >
                      <Target className="w-4 h-4 mr-2" />
                      Use Template
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default WorkflowAutomation;
