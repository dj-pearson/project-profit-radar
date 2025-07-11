import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  Zap, 
  Play, 
  Pause, 
  Settings,
  Clock,
  CheckCircle,
  Mail,
  Bell,
  Database,
  GitBranch
} from 'lucide-react';

export default function AutomatedWorkflows() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("workflows");

  // Mock data
  const workflows = [
    {
      id: "WF-001",
      name: "Project Approval Process",
      description: "Automates project approval workflow from estimate to contract",
      status: "active",
      trigger: "estimate_submitted",
      last_run: "2024-04-10T14:30:00Z",
      total_runs: 156,
      success_rate: 98.5,
      created_by: "System Admin",
      steps: [
        "Send approval request to PM",
        "Notify client of estimate",
        "Wait for client approval",
        "Generate contract",
        "Send to legal review"
      ]
    },
    {
      id: "WF-002",
      name: "Invoice Generation & Reminder",
      description: "Automatically generates invoices and sends payment reminders",
      status: "active",
      trigger: "project_milestone_complete",
      last_run: "2024-04-12T09:15:00Z",
      total_runs: 89,
      success_rate: 96.2,
      created_by: "Finance Team",
      steps: [
        "Generate invoice",
        "Send to client",
        "Schedule payment reminder",
        "Update accounting system",
        "Notify project manager"
      ]
    },
    {
      id: "WF-003",
      name: "Safety Incident Response",
      description: "Immediate response workflow for safety incidents",
      status: "active",
      trigger: "safety_incident_reported",
      last_run: "2024-04-08T16:45:00Z",
      total_runs: 12,
      success_rate: 100,
      created_by: "Safety Manager",
      steps: [
        "Notify safety manager",
        "Send incident report",
        "Schedule investigation",
        "Alert OSHA if required",
        "Update safety records"
      ]
    },
    {
      id: "WF-004",
      name: "Equipment Maintenance Alert",
      description: "Schedules and tracks equipment maintenance",
      status: "paused",
      trigger: "equipment_hours_threshold",
      last_run: "2024-04-05T11:20:00Z",
      total_runs: 45,
      success_rate: 94.4,
      created_by: "Equipment Manager",
      steps: [
        "Check equipment hours",
        "Schedule maintenance",
        "Notify technician",
        "Order parts if needed",
        "Update maintenance logs"
      ]
    }
  ];

  const templates = [
    {
      id: "1",
      name: "Client Onboarding",
      category: "Client Management",
      description: "Standard client onboarding process with document collection",
      usage_count: 23,
      steps: 8
    },
    {
      id: "2",
      name: "Change Order Approval",
      category: "Project Management",
      description: "Approval workflow for project change orders",
      usage_count: 67,
      steps: 5
    },
    {
      id: "3",
      name: "Vendor Payment Process",
      category: "Finance",
      description: "Automated vendor payment and approval workflow",
      usage_count: 112,
      steps: 6
    },
    {
      id: "4",
      name: "Quality Control Checklist",
      category: "Quality",
      description: "Automated quality control and inspection process",
      usage_count: 89,
      steps: 10
    }
  ];

  const automations = [
    {
      id: "1",
      name: "Daily Progress Reports",
      type: "scheduled",
      frequency: "daily",
      next_run: "2024-04-13T08:00:00Z",
      description: "Automatically generates and sends daily progress reports"
    },
    {
      id: "2",
      name: "Overdue Invoice Alerts",
      type: "conditional",
      frequency: "when triggered",
      next_run: null,
      description: "Sends alerts when invoices become overdue"
    },
    {
      id: "3",
      name: "Weekly Safety Reminders",
      type: "scheduled",
      frequency: "weekly",
      next_run: "2024-04-15T09:00:00Z",
      description: "Sends weekly safety reminders to all team members"
    }
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: "default" as const, label: "Active", icon: Play },
      paused: { variant: "secondary" as const, label: "Paused", icon: Pause },
      draft: { variant: "outline" as const, label: "Draft", icon: Settings },
      error: { variant: "destructive" as const, label: "Error", icon: Zap }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config?.icon || Zap;
    return (
      <Badge variant={config?.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config?.label || status}
      </Badge>
    );
  };

  const getTriggerIcon = (trigger: string) => {
    const triggerIcons = {
      estimate_submitted: Mail,
      project_milestone_complete: CheckCircle,
      safety_incident_reported: Bell,
      equipment_hours_threshold: Clock
    };
    return triggerIcons[trigger as keyof typeof triggerIcons] || Zap;
  };

  return (
    <DashboardLayout title="Automated Workflows">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Automated Workflows</h1>
            <p className="text-muted-foreground">Create and manage automated business processes</p>
          </div>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Workflow
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Workflow</DialogTitle>
                  <DialogDescription>
                    Create an automated workflow to streamline your business processes
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="workflow-name">Workflow Name</Label>
                    <Input id="workflow-name" placeholder="Enter workflow name" />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input id="description" placeholder="Brief description of the workflow" />
                  </div>
                  <div>
                    <Label htmlFor="trigger">Trigger Event</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select what triggers this workflow" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="project_created">Project Created</SelectItem>
                        <SelectItem value="estimate_submitted">Estimate Submitted</SelectItem>
                        <SelectItem value="invoice_overdue">Invoice Overdue</SelectItem>
                        <SelectItem value="milestone_complete">Milestone Complete</SelectItem>
                        <SelectItem value="manual">Manual Trigger</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="template">Use Template</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a template (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="blank">Start from Blank</SelectItem>
                        <SelectItem value="client-onboarding">Client Onboarding</SelectItem>
                        <SelectItem value="change-order">Change Order Approval</SelectItem>
                        <SelectItem value="vendor-payment">Vendor Payment Process</SelectItem>
                        <SelectItem value="quality-control">Quality Control Checklist</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="workflows">Active Workflows</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="automations">Automations</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search workflows, templates, or automations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <TabsContent value="workflows" className="space-y-4">
            <div className="grid gap-4">
              {workflows.map((workflow) => {
                const TriggerIcon = getTriggerIcon(workflow.trigger);
                return (
                  <Card key={workflow.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Zap className="h-5 w-5" />
                            {workflow.name}
                          </CardTitle>
                          <CardDescription>
                            {workflow.description}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(workflow.status)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div className="flex items-center gap-2">
                          <TriggerIcon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium text-muted-foreground">Trigger</div>
                            <div className="capitalize">{workflow.trigger.replace('_', ' ')}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium text-muted-foreground">Last Run</div>
                            <div>{new Date(workflow.last_run).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium text-muted-foreground">Total Runs</div>
                            <div className="font-semibold">{workflow.total_runs}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium text-muted-foreground">Success Rate</div>
                            <div className="text-green-600 font-semibold">{workflow.success_rate}%</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <div className="text-sm font-medium text-muted-foreground mb-2">Workflow Steps:</div>
                        <div className="text-sm text-muted-foreground">
                          {workflow.steps.slice(0, 3).join(' → ')}
                          {workflow.steps.length > 3 && ` → ... (+${workflow.steps.length - 3} more)`}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="text-sm">
                          <span className="font-medium">Created by: </span>
                          <span>{workflow.created_by}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button size="sm">
                            <GitBranch className="h-4 w-4 mr-2" />
                            View Flow
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <div className="grid gap-4">
              {templates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">
                          {template.name}
                        </CardTitle>
                        <CardDescription>
                          {template.description}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">
                        {template.category}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-muted-foreground">
                        {template.usage_count} times used • {template.steps} steps
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          Preview
                        </Button>
                        <Button size="sm">
                          Use Template
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="automations" className="space-y-4">
            <div className="grid gap-4">
              {automations.map((automation) => (
                <Card key={automation.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Clock className="h-5 w-5" />
                          {automation.name}
                        </CardTitle>
                        <CardDescription>
                          {automation.description}
                        </CardDescription>
                      </div>
                      <Badge variant={automation.type === 'scheduled' ? 'default' : 'secondary'} className="capitalize">
                        {automation.type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="text-sm">
                        <span className="font-medium">Frequency: </span>
                        <span className="capitalize">{automation.frequency}</span>
                        {automation.next_run && (
                          <>
                            <span className="mx-2">•</span>
                            <span className="font-medium">Next run: </span>
                            <span>{new Date(automation.next_run).toLocaleString()}</span>
                          </>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4 mr-2" />
                          Configure
                        </Button>
                        <Button size="sm">
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <div className="text-sm text-muted-foreground">Currently running</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1,247</div>
                  <div className="text-sm text-green-600">+18% this month</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">97.2%</div>
                  <div className="text-sm text-green-600">Above target</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">145h</div>
                  <div className="text-sm text-muted-foreground">This month</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}