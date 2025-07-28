import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Workflow, Play, Pause, Users, Clock, Mail, MessageSquare, GitBranch, Plus, Edit, Trash2 } from "lucide-react";

interface WorkflowStep {
  id: string;
  type: "email" | "wait" | "condition" | "action";
  title: string;
  description: string;
  delay?: number;
  delayUnit?: "minutes" | "hours" | "days";
  conditions?: any;
}

interface LeadWorkflow {
  id: string;
  name: string;
  description: string;
  trigger: string;
  status: "active" | "inactive" | "draft";
  steps: WorkflowStep[];
  stats: {
    enrolled: number;
    completed: number;
    active: number;
  };
}

const mockWorkflows: LeadWorkflow[] = [
  {
    id: "1",
    name: "New Lead Welcome Series",
    description: "Automated nurturing for new website leads",
    trigger: "Lead Form Submission",
    status: "active",
    steps: [
      { id: "1", type: "email", title: "Welcome Email", description: "Send welcome email immediately" },
      { id: "2", type: "wait", title: "Wait 2 Days", description: "Wait period", delay: 2, delayUnit: "days" },
      { id: "3", type: "email", title: "Company Overview", description: "Send company capabilities overview" },
      { id: "4", type: "wait", title: "Wait 3 Days", description: "Wait period", delay: 3, delayUnit: "days" },
      { id: "5", type: "condition", title: "Check Engagement", description: "Did they open the last email?" },
      { id: "6", type: "email", title: "Case Study", description: "Send relevant case study" }
    ],
    stats: { enrolled: 145, completed: 67, active: 78 }
  },
  {
    id: "2",
    name: "Qualified Lead Follow-up",
    description: "Sales follow-up sequence for qualified leads",
    trigger: "Lead Qualification Score > 70",
    status: "active",
    steps: [
      { id: "1", type: "action", title: "Assign to Sales Rep", description: "Auto-assign to available sales rep" },
      { id: "2", type: "email", title: "Personal Introduction", description: "Sales rep introduction email" },
      { id: "3", type: "wait", title: "Wait 1 Day", description: "Wait period", delay: 1, delayUnit: "days" },
      { id: "4", type: "action", title: "Schedule Call", description: "Send calendar link for consultation" }
    ],
    stats: { enrolled: 89, completed: 45, active: 44 }
  }
];

const triggerOptions = [
  { value: "form_submission", label: "Lead Form Submission" },
  { value: "website_visit", label: "Website Visit" },
  { value: "email_click", label: "Email Link Click" },
  { value: "score_threshold", label: "Lead Score Threshold" },
  { value: "status_change", label: "Lead Status Change" },
  { value: "manual", label: "Manual Enrollment" }
];

const stepTypes = [
  { value: "email", label: "Send Email", icon: Mail },
  { value: "wait", label: "Wait/Delay", icon: Clock },
  { value: "condition", label: "If/Then Branch", icon: GitBranch },
  { value: "action", label: "Action", icon: Play }
];

export const LeadNurturingWorkflows = () => {
  const [workflows, setWorkflows] = useState<LeadWorkflow[]>(mockWorkflows);
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({
    name: "",
    description: "",
    trigger: "",
    steps: [] as WorkflowStep[]
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-success text-success-foreground";
      case "inactive": return "bg-muted text-muted-foreground";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  const getStepIcon = (type: string) => {
    switch (type) {
      case "email": return <Mail className="h-4 w-4" />;
      case "wait": return <Clock className="h-4 w-4" />;
      case "condition": return <GitBranch className="h-4 w-4" />;
      case "action": return <Play className="h-4 w-4" />;
      default: return <Workflow className="h-4 w-4" />;
    }
  };

  const addStep = (type: string) => {
    const stepTitles = {
      email: "Send Email",
      wait: "Wait Period",
      condition: "If/Then Condition", 
      action: "Perform Action"
    };

    const newStep: WorkflowStep = {
      id: Date.now().toString(),
      type: type as any,
      title: stepTitles[type as keyof typeof stepTitles],
      description: `Configure ${type} step`
    };

    setNewWorkflow({
      ...newWorkflow,
      steps: [...newWorkflow.steps, newStep]
    });
  };

  const handleCreateWorkflow = () => {
    const workflow: LeadWorkflow = {
      id: Date.now().toString(),
      name: newWorkflow.name,
      description: newWorkflow.description,
      trigger: newWorkflow.trigger,
      status: "draft",
      steps: newWorkflow.steps,
      stats: { enrolled: 0, completed: 0, active: 0 }
    };
    
    setWorkflows([...workflows, workflow]);
    setNewWorkflow({ name: "", description: "", trigger: "", steps: [] });
    setIsCreating(false);
  };

  return (
    <div className="space-y-6">
      {/* Workflow Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Workflow className="h-4 w-4 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{workflows.filter(w => w.status === "active").length}</div>
                <div className="text-sm text-muted-foreground">Active Workflows</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-2xl font-bold">
                  {workflows.reduce((sum, w) => sum + w.stats.enrolled, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Leads Enrolled</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Play className="h-4 w-4 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">
                  {workflows.reduce((sum, w) => sum + w.stats.active, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Currently Active</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">
                  {workflows.length > 0 ? 
                    Math.round((workflows.reduce((sum, w) => sum + w.stats.completed, 0) / workflows.reduce((sum, w) => sum + w.stats.enrolled, 0)) * 100)
                    : 0}%
                </div>
                <div className="text-sm text-muted-foreground">Completion Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="workflows" className="w-full">
        <TabsList>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="create">Create Workflow</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Workflows Tab */}
        <TabsContent value="workflows" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Lead Nurturing Workflows</h3>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Workflow
            </Button>
          </div>
          
          {workflows.map((workflow) => (
            <Card key={workflow.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-semibold">{workflow.name}</h4>
                    <p className="text-sm text-muted-foreground mb-2">{workflow.description}</p>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(workflow.status)}>{workflow.status}</Badge>
                      <span className="text-sm text-muted-foreground">Trigger: {workflow.trigger}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      {workflow.status === "active" ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Workflow Steps Preview */}
                <div className="mb-4">
                  <h5 className="text-sm font-medium mb-2">Workflow Steps ({workflow.steps.length})</h5>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {workflow.steps.map((step, index) => (
                      <div key={step.id} className="flex items-center gap-2 min-w-fit">
                        <div className="flex items-center gap-1 bg-muted rounded px-2 py-1">
                          {getStepIcon(step.type)}
                          <span className="text-xs">{step.title}</span>
                        </div>
                        {index < workflow.steps.length - 1 && (
                          <div className="w-4 h-px bg-border"></div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{workflow.stats.enrolled}</div>
                    <div className="text-xs text-muted-foreground">Enrolled</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">{workflow.stats.active}</div>
                    <div className="text-xs text-muted-foreground">Active</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{workflow.stats.completed}</div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Create Workflow Tab */}
        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create New Workflow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Workflow Name</label>
                  <Input
                    placeholder="e.g., New Lead Welcome Series"
                    value={newWorkflow.name}
                    onChange={(e) => setNewWorkflow({ ...newWorkflow, name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Trigger</label>
                  <Select value={newWorkflow.trigger} onValueChange={(value) => setNewWorkflow({ ...newWorkflow, trigger: value })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select trigger" />
                    </SelectTrigger>
                    <SelectContent>
                      {triggerOptions.map((option) => (
                        <SelectItem key={option.value} value={option.label}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Describe what this workflow does..."
                  value={newWorkflow.description}
                  onChange={(e) => setNewWorkflow({ ...newWorkflow, description: e.target.value })}
                  className="mt-1"
                  rows={3}
                />
              </div>

              {/* Workflow Steps Builder */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-medium">Workflow Steps</label>
                  <div className="flex gap-1">
                    {stepTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <Button
                          key={type.value}
                          size="sm"
                          variant="outline"
                          onClick={() => addStep(type.value)}
                        >
                          <Icon className="h-3 w-3 mr-1" />
                          {type.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  {newWorkflow.steps.map((step, index) => (
                    <div key={step.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="text-sm font-medium text-muted-foreground">
                        {index + 1}
                      </div>
                      {getStepIcon(step.type)}
                      <div className="flex-1">
                        <div className="font-medium">{step.title}</div>
                        <div className="text-sm text-muted-foreground">{step.description}</div>
                      </div>
                      <Button size="sm" variant="outline">Configure</Button>
                      <Button size="sm" variant="outline">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  
                  {newWorkflow.steps.length === 0 && (
                    <div className="text-center p-8 border border-dashed rounded-lg">
                      <Workflow className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Add steps to your workflow using the buttons above
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleCreateWorkflow}
                  disabled={!newWorkflow.name || !newWorkflow.trigger || newWorkflow.steps.length === 0}
                >
                  Create Workflow
                </Button>
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Workflow Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workflows.map((workflow) => {
                    const completionRate = workflow.stats.enrolled > 0 
                      ? Math.round((workflow.stats.completed / workflow.stats.enrolled) * 100)
                      : 0;
                    
                    return (
                      <div key={workflow.id} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">{workflow.name}</span>
                          <span className="text-sm text-muted-foreground">{completionRate}%</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${completionRate}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>15 leads enrolled in Welcome Series</span>
                    <span className="text-muted-foreground">2h ago</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>8 leads completed Qualification workflow</span>
                    <span className="text-muted-foreground">4h ago</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <span>New workflow "Trial Follow-up" created</span>
                    <span className="text-muted-foreground">1d ago</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};