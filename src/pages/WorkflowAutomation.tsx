import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Workflow, Play, Pause, Plus, Trash2, Edit, Copy, CheckCircle, Clock, Zap, Target, TrendingUp } from 'lucide-react';
import { ErrorState } from '@/components/common/ErrorState';
import { useWorkflowAutomation, type WorkflowData } from '@/hooks/useWorkflowAutomation';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessiblePageWrapper } from '@/components/accessibility/AccessiblePageWrapper';
import { confirmAction } from "@/components/ui/confirm-dialog";
import { DataTablePageSkeleton } from '@/components/ui/skeletons';

export const WorkflowAutomation = () => {
  const { toast } = useToast();
  const automation = useWorkflowAutomation();
  const loading = automation.isLoading;
  const workflows = automation.data?.workflows ?? [];
  const templates = automation.data?.templates ?? [];
  const stats = automation.data?.stats ?? null;
  const loadWorkflowData = () => { void automation.refetch(); };

  const failed = (what: string, error: unknown) =>
    toast({
      title: 'Error',
      description: `Failed to ${what}: ${error instanceof Error ? error.message : String(error)}`,
      variant: 'destructive',
    });

  const toggleWorkflowStatus = async (workflowId: string, currentStatus: boolean) => {
    try {
      await automation.setActive(workflowId, !currentStatus);
      toast({
        title: currentStatus ? 'Workflow Paused' : 'Workflow Activated',
        description: currentStatus ? 'Workflow has been paused.' : 'Workflow is now active.',
      });
    } catch (error) {
      failed('update workflow status', error);
    }
  };

  const duplicateWorkflow = async (workflowId: string, name: string) => {
    try {
      await automation.duplicate(workflowId, name);
      toast({
        title: 'Workflow Duplicated',
        description: 'A copy of the workflow has been created.',
      });
    } catch (error) {
      failed('duplicate workflow', error);
    }
  };

  const deleteWorkflow = async (workflowId: string, name: string) => {
    if (!(await confirmAction({ title: `Are you sure you want to delete "${name}"?`, destructive: true }))) return;

    try {
      await automation.remove(workflowId);
      toast({
        title: 'Workflow Deleted',
        description: 'The workflow has been deleted.',
      });
    } catch (error) {
      failed('delete workflow', error);
    }
  };

  const applyTemplate = async (templateId: string, templateName: string) => {
    try {
      await automation.applyTemplate(templateId, templateName);
      toast({
        title: 'Template Added',
        description: 'Workflow template has been added to your workflows.',
      });
    } catch (error) {
      failed('add template', error);
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
      <AccessiblePageWrapper pageTitle="Workflow Automation">
      <DashboardLayout hasAccessibleWrapper title="Workflow Automation">
        <DataTablePageSkeleton label="Loading workflows" />
      </DashboardLayout>
      </AccessiblePageWrapper>
    );
  }

  if (automation.error) {
    return (
      <AccessiblePageWrapper pageTitle="Workflow Automation">
      <DashboardLayout hasAccessibleWrapper title="Workflow Automation">
        <ErrorState
          title="Workflows could not be loaded"
          error={automation.error}
          onRetry={loadWorkflowData}
        />
      </DashboardLayout>
      </AccessiblePageWrapper>
    );
  }

  return (
    <AccessiblePageWrapper pageTitle="Workflow Automation">
    <DashboardLayout hasAccessibleWrapper
      title="Workflow Automation"
      description="Create automated workflows to streamline your business processes"
      headerActions={
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Workflow
        </Button>
      }
    >
      <div className="space-y-6">
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
                      onClick={() => applyTemplate(template.id, template.name)}
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
    </AccessiblePageWrapper>
  );
};

export default WorkflowAutomation;
