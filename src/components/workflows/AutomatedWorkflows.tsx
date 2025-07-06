import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Zap, 
  Brain, 
  Settings, 
  Play, 
  Pause, 
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Mail,
  Calendar,
  Camera,
  FileText,
  Users,
  TrendingUp
} from 'lucide-react';

interface WorkflowTrigger {
  id: string;
  type: 'schedule' | 'event' | 'condition' | 'webhook';
  name: string;
  config: Record<string, any>;
}

interface WorkflowAction {
  id: string;
  type: 'email' | 'notification' | 'data_update' | 'ai_analysis' | 'api_call';
  name: string;
  config: Record<string, any>;
}

interface AutomatedWorkflow {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'running' | 'error';
  triggers: WorkflowTrigger[];
  actions: WorkflowAction[];
  ai_enabled: boolean;
  run_count: number;
  success_rate: number;
  last_run: string | null;
  created_at: string;
}

interface AIInsight {
  id: string;
  type: 'performance' | 'optimization' | 'prediction' | 'anomaly';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  created_at: string;
}

const AutomatedWorkflows = () => {
  const { userProfile } = useAuth();
  const [workflows, setWorkflows] = useState<AutomatedWorkflow[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('workflows');

  // New workflow form states
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [aiEnabled, setAiEnabled] = useState(true);
  const [selectedTrigger, setSelectedTrigger] = useState('');
  const [selectedAction, setSelectedAction] = useState('');

  useEffect(() => {
    loadWorkflowData();
  }, []);

  const loadWorkflowData = async () => {
    setLoading(true);
    try {
      // Mock data until we create the workflow tables
      const mockWorkflows: AutomatedWorkflow[] = [
        {
          id: '1',
          name: 'Daily Progress Report Generator',
          description: 'Automatically generates and sends daily progress reports to stakeholders',
          status: 'active',
          triggers: [
            {
              id: 't1',
              type: 'schedule',
              name: 'Daily at 6 PM',
              config: { schedule: '0 18 * * *', timezone: 'UTC' }
            }
          ],
          actions: [
            {
              id: 'a1',
              type: 'ai_analysis',
              name: 'Analyze Daily Progress',
              config: { model: 'gpt-4o-mini', prompt: 'analyze_daily_progress' }
            },
            {
              id: 'a2',
              type: 'email',
              name: 'Send Progress Report',
              config: { template: 'daily_progress', recipients: ['stakeholders'] }
            }
          ],
          ai_enabled: true,
          run_count: 45,
          success_rate: 97.8,
          last_run: new Date(Date.now() - 3600000).toISOString(),
          created_at: new Date(Date.now() - 86400000 * 30).toISOString()
        },
        {
          id: '2',
          name: 'Cost Variance Alert System',
          description: 'AI-powered cost monitoring that alerts when projects exceed budget thresholds',
          status: 'active',
          triggers: [
            {
              id: 't2',
              type: 'condition',
              name: 'Budget Variance > 5%',
              config: { condition: 'budget_variance_percent > 5' }
            }
          ],
          actions: [
            {
              id: 'a3',
              type: 'ai_analysis',
              name: 'Analyze Cost Factors',
              config: { model: 'gpt-4o-mini', prompt: 'analyze_cost_variance' }
            },
            {
              id: 'a4',
              type: 'notification',
              name: 'Alert Project Manager',
              config: { urgency: 'high', roles: ['admin', 'project_manager'] }
            }
          ],
          ai_enabled: true,
          run_count: 12,
          success_rate: 100,
          last_run: new Date(Date.now() - 7200000).toISOString(),
          created_at: new Date(Date.now() - 86400000 * 15).toISOString()
        },
        {
          id: '3',
          name: 'Safety Compliance Monitor',
          description: 'Monitors safety compliance and automatically schedules inspections',
          status: 'active',
          triggers: [
            {
              id: 't3',
              type: 'schedule',
              name: 'Weekly Safety Check',
              config: { schedule: '0 9 * * 1', timezone: 'UTC' }
            }
          ],
          actions: [
            {
              id: 'a5',
              type: 'ai_analysis',
              name: 'Analyze Safety Metrics',
              config: { model: 'gpt-4o-mini', prompt: 'analyze_safety_compliance' }
            },
            {
              id: 'a6',
              type: 'api_call',
              name: 'Schedule Inspection',
              config: { api: 'calendar', action: 'create_event' }
            }
          ],
          ai_enabled: true,
          run_count: 8,
          success_rate: 87.5,
          last_run: new Date(Date.now() - 86400000 * 2).toISOString(),
          created_at: new Date(Date.now() - 86400000 * 20).toISOString()
        }
      ];

      const mockInsights: AIInsight[] = [
        {
          id: '1',
          type: 'optimization',
          title: 'Optimize Material Delivery Timing',
          description: 'AI analysis suggests that moving material deliveries to Tuesday mornings could reduce delays by 23%',
          confidence: 89,
          actionable: true,
          created_at: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: '2',
          type: 'prediction',
          title: 'Project Timeline Prediction',
          description: 'Based on current progress patterns, Project Alpha is likely to finish 3 days ahead of schedule',
          confidence: 76,
          actionable: false,
          created_at: new Date(Date.now() - 7200000).toISOString()
        },
        {
          id: '3',
          type: 'anomaly',
          title: 'Unusual Equipment Usage Pattern',
          description: 'Equipment usage on weekends has increased 45% this month. Consider adjusting maintenance schedules.',
          confidence: 92,
          actionable: true,
          created_at: new Date(Date.now() - 14400000).toISOString()
        }
      ];

      setWorkflows(mockWorkflows);
      setInsights(mockInsights);
    } catch (error) {
      console.error('Error loading workflow data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load workflow data"
      });
    } finally {
      setLoading(false);
    }
  };

  const createWorkflow = async () => {
    if (!workflowName || !workflowDescription) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields"
      });
      return;
    }

    try {
      const newWorkflow: AutomatedWorkflow = {
        id: Date.now().toString(),
        name: workflowName,
        description: workflowDescription,
        status: 'inactive',
        triggers: [],
        actions: [],
        ai_enabled: aiEnabled,
        run_count: 0,
        success_rate: 0,
        last_run: null,
        created_at: new Date().toISOString()
      };

      setWorkflows([newWorkflow, ...workflows]);
      
      // Reset form
      setWorkflowName('');
      setWorkflowDescription('');
      setAiEnabled(true);

      toast({
        title: "Workflow Created",
        description: `Workflow "${newWorkflow.name}" has been created successfully`
      });
    } catch (error) {
      console.error('Error creating workflow:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create workflow"
      });
    }
  };

  const toggleWorkflow = async (workflowId: string) => {
    try {
      setWorkflows(workflows.map(workflow => 
        workflow.id === workflowId 
          ? { 
              ...workflow, 
              status: workflow.status === 'active' ? 'inactive' : 'active' 
            }
          : workflow
      ));

      const workflow = workflows.find(w => w.id === workflowId);
      toast({
        title: "Workflow Updated",
        description: `Workflow "${workflow?.name}" has been ${workflow?.status === 'active' ? 'deactivated' : 'activated'}`
      });
    } catch (error) {
      console.error('Error toggling workflow:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update workflow status"
      });
    }
  };

  const runWorkflow = async (workflowId: string) => {
    try {
      const workflow = workflows.find(w => w.id === workflowId);
      if (!workflow) return;

      // Simulate running workflow
      setWorkflows(workflows.map(w => 
        w.id === workflowId 
          ? { 
              ...w, 
              status: 'running',
              run_count: w.run_count + 1,
              last_run: new Date().toISOString()
            }
          : w
      ));

      // Simulate completion after 3 seconds
      setTimeout(() => {
        setWorkflows(prev => prev.map(w => 
          w.id === workflowId 
            ? { ...w, status: 'active' }
            : w
        ));
      }, 3000);

      toast({
        title: "Workflow Running",
        description: `Workflow "${workflow.name}" is now executing`
      });
    } catch (error) {
      console.error('Error running workflow:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to run workflow"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Pause className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      inactive: 'secondary',
      running: 'default',
      error: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'performance':
        return <BarChart3 className="h-4 w-4 text-blue-500" />;
      case 'optimization':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'prediction':
        return <Brain className="h-4 w-4 text-purple-500" />;
      case 'anomaly':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Brain className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Zap className="h-5 w-5" />
        <h2 className="text-2xl font-semibold">Automated Workflows</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="space-y-4">
          {/* Create Workflow */}
          <Card>
            <CardHeader>
              <CardTitle>Create New Workflow</CardTitle>
              <CardDescription>Build automated processes with AI-powered actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="workflow-name">Workflow Name</Label>
                  <Input
                    id="workflow-name"
                    value={workflowName}
                    onChange={(e) => setWorkflowName(e.target.value)}
                    placeholder="Enter workflow name"
                  />
                </div>
                <div>
                  <Label>AI Enhancement</Label>
                  <div className="flex items-center space-x-2 mt-2">
                    <Switch
                      checked={aiEnabled}
                      onCheckedChange={setAiEnabled}
                    />
                    <Label className="text-sm">Enable AI analysis and recommendations</Label>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="workflow-description">Description</Label>
                <Textarea
                  id="workflow-description"
                  value={workflowDescription}
                  onChange={(e) => setWorkflowDescription(e.target.value)}
                  placeholder="Describe what this workflow does..."
                  rows={3}
                />
              </div>

              <Button onClick={createWorkflow}>
                <Plus className="h-4 w-4 mr-2" />
                Create Workflow
              </Button>
            </CardContent>
          </Card>

          {/* Workflows List */}
          <div className="grid gap-4">
            {workflows.map((workflow) => (
              <Card key={workflow.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(workflow.status)}
                      <CardTitle>{workflow.name}</CardTitle>
                      {getStatusBadge(workflow.status)}
                      {workflow.ai_enabled && (
                        <Badge variant="outline" className="bg-gradient-to-r from-purple-50 to-blue-50">
                          <Brain className="h-3 w-3 mr-1" />
                          AI
                        </Badge>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => runWorkflow(workflow.id)}
                        disabled={workflow.status === 'running'}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        {workflow.status === 'running' ? 'Running...' : 'Run'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleWorkflow(workflow.id)}
                      >
                        {workflow.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>{workflow.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-4">
                    <div>
                      <div className="text-2xl font-bold">{workflow.run_count}</div>
                      <div className="text-sm text-muted-foreground">Total Runs</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{workflow.success_rate}%</div>
                      <div className="text-sm text-muted-foreground">Success Rate</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{workflow.triggers.length}</div>
                      <div className="text-sm text-muted-foreground">Triggers</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{workflow.actions.length}</div>
                      <div className="text-sm text-muted-foreground">Actions</div>
                    </div>
                  </div>

                  {workflow.last_run && (
                    <p className="text-sm text-muted-foreground">
                      Last run: {new Date(workflow.last_run).toLocaleString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-4 w-4" />
                <span>AI-Powered Insights</span>
              </CardTitle>
              <CardDescription>
                Intelligent recommendations based on your construction data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights.map((insight) => (
                  <div key={insight.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getInsightIcon(insight.type)}
                        <h4 className="font-medium">{insight.title}</h4>
                        <Badge variant="secondary">
                          {insight.confidence}% confidence
                        </Badge>
                      </div>
                      {insight.actionable && (
                        <Button size="sm" variant="outline">
                          Apply
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {insight.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Generated {new Date(insight.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                name: 'Daily Progress Reports',
                description: 'Automated daily progress tracking and reporting',
                icon: FileText,
                triggers: ['Schedule'],
                actions: ['AI Analysis', 'Email']
              },
              {
                name: 'Budget Monitoring',
                description: 'Real-time budget variance monitoring with alerts',
                icon: BarChart3,
                triggers: ['Data Change'],
                actions: ['AI Analysis', 'Notification']
              },
              {
                name: 'Safety Compliance',
                description: 'Automated safety compliance monitoring',
                icon: AlertCircle,
                triggers: ['Schedule', 'Event'],
                actions: ['AI Analysis', 'Calendar']
              },
              {
                name: 'Client Communication',
                description: 'Automated client updates and notifications',
                icon: Mail,
                triggers: ['Milestone'],
                actions: ['Email', 'SMS']
              },
              {
                name: 'Resource Optimization',
                description: 'AI-powered resource allocation optimization',
                icon: Users,
                triggers: ['AI Prediction'],
                actions: ['AI Analysis', 'Data Update']
              },
              {
                name: 'Photo Documentation',
                description: 'Automated photo organization and tagging',
                icon: Camera,
                triggers: ['Photo Upload'],
                actions: ['AI Analysis', 'Classification']
              }
            ].map((template, index) => (
              <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <template.icon className="h-4 w-4" />
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                  </div>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs">Triggers:</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {template.triggers.map((trigger, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {trigger}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Actions:</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {template.actions.map((action, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {action}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button className="mt-4 w-full" size="sm">
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AutomatedWorkflows;