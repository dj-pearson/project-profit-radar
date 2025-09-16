import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Workflow, Play, Pause, Settings, Plus, Trash2, 
  Clock, Bell, Mail, Calendar, CheckCircle, AlertCircle 
} from 'lucide-react';

interface WorkflowTrigger {
  id: string;
  type: 'time_based' | 'event_based' | 'manual';
  condition: string;
  parameters: Record<string, any>;
}

interface WorkflowAction {
  id: string;
  type: 'email' | 'notification' | 'task_creation' | 'status_update' | 'approval_request';
  parameters: Record<string, any>;
  delay?: number; // minutes
}

interface WorkflowRule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  triggers: WorkflowTrigger[];
  actions: WorkflowAction[];
  executionCount: number;
  lastExecuted?: Date;
  createdDate: Date;
}

export const WorkflowAutomation: React.FC = () => {
  const [workflows, setWorkflows] = useState<WorkflowRule[]>([
    {
      id: '1',
      name: 'Daily Progress Reports',
      description: 'Automatically request daily progress reports from field supervisors',
      isActive: true,
      triggers: [{
        id: 'trigger-1',
        type: 'time_based',
        condition: 'daily_at_5pm',
        parameters: { hour: 17, minute: 0 }
      }],
      actions: [{
        id: 'action-1',
        type: 'notification',
        parameters: {
          recipients: 'field_supervisors',
          message: 'Please submit your daily progress report'
        }
      }],
      executionCount: 45,
      lastExecuted: new Date('2024-01-12T17:00:00'),
      createdDate: new Date('2024-01-01')
    },
    {
      id: '2',
      name: 'Budget Alert System',
      description: 'Alert project managers when costs exceed 90% of budget',
      isActive: true,
      triggers: [{
        id: 'trigger-2',
        type: 'event_based',
        condition: 'cost_threshold_exceeded',
        parameters: { threshold: 0.9 }
      }],
      actions: [
        {
          id: 'action-2a',
          type: 'email',
          parameters: {
            recipients: 'project_managers',
            subject: 'Budget Alert: Project approaching budget limit',
            template: 'budget_alert'
          }
        },
        {
          id: 'action-2b',
          type: 'approval_request',
          parameters: {
            approvers: 'senior_management',
            action: 'budget_increase_request'
          },
          delay: 15
        }
      ],
      executionCount: 3,
      lastExecuted: new Date('2024-01-10T09:30:00'),
      createdDate: new Date('2024-01-01')
    }
  ]);

  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);

  const toggleWorkflow = (workflowId: string) => {
    setWorkflows(prev => prev.map(w => 
      w.id === workflowId ? { ...w, isActive: !w.isActive } : w
    ));
  };

  const deleteWorkflow = (workflowId: string) => {
    setWorkflows(prev => prev.filter(w => w.id !== workflowId));
  };

  const renderWorkflowCard = (workflow: WorkflowRule) => (
    <Card key={workflow.id} className="p-4">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium">{workflow.name}</h4>
            <Badge variant={workflow.isActive ? 'default' : 'secondary'}>
              {workflow.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{workflow.description}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Switch 
            checked={workflow.isActive}
            onCheckedChange={() => toggleWorkflow(workflow.id)}
          />
          <Button size="icon" variant="ghost" onClick={() => deleteWorkflow(workflow.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
        <div>
          <span className="text-muted-foreground">Triggers:</span>
          <p className="font-medium">{workflow.triggers.length}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Actions:</span>
          <p className="font-medium">{workflow.actions.length}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Executions:</span>
          <p className="font-medium">{workflow.executionCount}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Last Run:</span>
          <p className="font-medium">
            {workflow.lastExecuted?.toLocaleDateString() || 'Never'}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setSelectedWorkflow(workflow.id)}>
          <Settings className="h-4 w-4 mr-1" />
          Configure
        </Button>
        <Button size="sm" variant="ghost">
          <Play className="h-4 w-4 mr-1" />
          Test Run
        </Button>
      </div>
    </Card>
  );

  const renderTriggerBuilder = () => (
    <Card>
      <CardHeader>
        <CardTitle>Workflow Triggers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-3 cursor-pointer hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="font-medium">Time-Based</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Schedule workflows to run at specific times
            </p>
          </Card>

          <Card className="p-3 cursor-pointer hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="font-medium">Event-Based</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Trigger when specific events occur
            </p>
          </Card>

          <Card className="p-3 cursor-pointer hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              <span className="font-medium">Manual</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Start workflows manually when needed
            </p>
          </Card>
        </div>
      </CardContent>
    </Card>
  );

  const renderActionBuilder = () => (
    <Card>
      <CardHeader>
        <CardTitle>Workflow Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-3 cursor-pointer hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span className="font-medium">Send Email</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Send automated emails to team members
            </p>
          </Card>

          <Card className="p-3 cursor-pointer hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="font-medium">Push Notification</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Send mobile notifications
            </p>
          </Card>

          <Card className="p-3 cursor-pointer hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">Create Task</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Automatically create new tasks
            </p>
          </Card>

          <Card className="p-3 cursor-pointer hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">Update Status</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Change project or task status
            </p>
          </Card>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Workflow Automation</h2>
          <p className="text-muted-foreground">
            Automate repetitive tasks and streamline processes
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Workflows</p>
                <p className="text-2xl font-bold">
                  {workflows.filter(w => w.isActive).length}
                </p>
              </div>
              <Workflow className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Executions</p>
                <p className="text-2xl font-bold">
                  {workflows.reduce((sum, w) => sum + w.executionCount, 0)}
                </p>
              </div>
              <Play className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold text-green-600">98.5%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Time Saved</p>
                <p className="text-2xl font-bold">124h</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="workflows" className="space-y-4">
        <TabsList>
          <TabsTrigger value="workflows">My Workflows</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="builder">Workflow Builder</TabsTrigger>
          <TabsTrigger value="logs">Execution Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="workflows">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {workflows.map(renderWorkflowCard)}
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4">
              <h4 className="font-medium mb-2">Project Milestone Notifications</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Automatically notify clients when project milestones are reached
              </p>
              <Button variant="outline" size="sm">Use Template</Button>
            </Card>

            <Card className="p-4">
              <h4 className="font-medium mb-2">Safety Inspection Reminders</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Schedule regular safety inspection reminders for all active projects
              </p>
              <Button variant="outline" size="sm">Use Template</Button>
            </Card>

            <Card className="p-4">
              <h4 className="font-medium mb-2">Invoice Generation</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Automatically generate and send invoices based on project progress
              </p>
              <Button variant="outline" size="sm">Use Template</Button>
            </Card>

            <Card className="p-4">
              <h4 className="font-medium mb-2">Equipment Maintenance Alerts</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Track equipment usage and schedule maintenance reminders
              </p>
              <Button variant="outline" size="sm">Use Template</Button>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="builder" className="space-y-6">
          {renderTriggerBuilder()}
          {renderActionBuilder()}
          
          <Card>
            <CardHeader>
              <CardTitle>Create New Workflow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Workflow Name</label>
                  <Input placeholder="Enter workflow name..." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="communication">Communication</SelectItem>
                      <SelectItem value="project-management">Project Management</SelectItem>
                      <SelectItem value="safety">Safety & Compliance</SelectItem>
                      <SelectItem value="financial">Financial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button>Save Workflow</Button>
                <Button variant="outline">Test & Save</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Execution History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {workflows.map(workflow => (
                  <div key={workflow.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <span className="font-medium">{workflow.name}</span>
                      <p className="text-sm text-muted-foreground">
                        Last executed: {workflow.lastExecuted?.toLocaleString() || 'Never'}
                      </p>
                    </div>
                    <Badge variant="default">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Success
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};