import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Filter, 
  Plus, 
  Play, 
  Pause,
  CheckCircle,
  XCircle,
  Settings,
  Users,
  Target,
  ArrowRight,
  Edit,
  Trash2
} from 'lucide-react';

interface QualificationWorkflow {
  id: string;
  workflow_name: string;
  description?: string;
  trigger_events: any;
  qualification_criteria: any;
  workflow_steps: any;
  qualified_status: string;
  disqualified_status: string;
  auto_route_qualified: boolean;
  auto_route_to_user?: string;
  is_active: boolean;
  requires_approval: boolean;
  created_at: string;
}

interface WorkflowCriteria {
  field: string;
  operator: string;
  value: string | number;
  weight: number;
}

interface WorkflowStep {
  id: string;
  type: string;
  action: string;
  conditions: Record<string, any>;
  auto_execute: boolean;
  delay_minutes?: number;
}

export const LeadQualificationWorkflows: React.FC = () => {
  const [workflows, setWorkflows] = useState<QualificationWorkflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<QualificationWorkflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  const [newWorkflow, setNewWorkflow] = useState({
    workflow_name: '',
    description: '',
    qualified_status: 'qualified',
    disqualified_status: 'disqualified',
    auto_route_qualified: false,
    requires_approval: false
  });

  const [criteriaList, setCriteriaList] = useState<WorkflowCriteria[]>([
    { field: 'estimated_budget', operator: 'gte', value: 25000, weight: 30 }
  ]);

  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([
    {
      id: '1',
      type: 'score_check',
      action: 'qualify_if_score_above',
      conditions: { minimum_score: 70 },
      auto_execute: true
    }
  ]);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      const { data, error } = await supabase
        .from('lead_qualification_workflows')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkflows((data || []).map(workflow => ({
        ...workflow,
        trigger_events: Array.isArray(workflow.trigger_events) ? workflow.trigger_events : [],
        qualification_criteria: typeof workflow.qualification_criteria === 'object' ? workflow.qualification_criteria : {},
        workflow_steps: Array.isArray(workflow.workflow_steps) ? workflow.workflow_steps : []
      })));
    } catch (error: any) {
      toast({
        title: "Error loading workflows",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createWorkflow = async () => {
    try {
      setIsCreating(true);
      
      const qualificationCriteria = {
        criteria: criteriaList,
        minimum_total_score: 70,
        required_fields: ['estimated_budget', 'decision_maker'],
        disqualifying_factors: ['no_budget', 'no_authority']
      };

      const { data, error } = await supabase
        .from('lead_qualification_workflows')
        .insert({
          workflow_name: newWorkflow.workflow_name,
          description: newWorkflow.description,
          company_id: profile?.company_id || '',
          qualification_criteria: JSON.stringify(qualificationCriteria),
          workflow_steps: JSON.stringify(workflowSteps),
          trigger_events: JSON.stringify(['lead_created', 'lead_updated', 'score_calculated']),
          is_active: true,
          requires_approval: newWorkflow.requires_approval || false,
          auto_route_qualified: newWorkflow.auto_route_qualified || false
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Workflow created",
        description: `${newWorkflow.workflow_name} has been created successfully`
      });

      setNewWorkflow({
        workflow_name: '',
        description: '',
        qualified_status: 'qualified',
        disqualified_status: 'disqualified',
        auto_route_qualified: false,
        requires_approval: false
      });

      await loadWorkflows();
    } catch (error: any) {
      toast({
        title: "Error creating workflow",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const toggleWorkflowStatus = async (workflowId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('lead_qualification_workflows')
        .update({ is_active: !isActive })
        .eq('id', workflowId);

      if (error) throw error;

      toast({
        title: isActive ? "Workflow paused" : "Workflow activated",
        description: isActive ? "Workflow has been paused" : "Workflow is now active"
      });

      await loadWorkflows();
    } catch (error: any) {
      toast({
        title: "Error updating workflow",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const addCriteria = () => {
    setCriteriaList([
      ...criteriaList,
      { field: 'company_name', operator: 'exists', value: '', weight: 10 }
    ]);
  };

  const updateCriteria = (index: number, field: keyof WorkflowCriteria, value: any) => {
    const updated = [...criteriaList];
    updated[index] = { ...updated[index], [field]: value };
    setCriteriaList(updated);
  };

  const removeCriteria = (index: number) => {
    setCriteriaList(criteriaList.filter((_, i) => i !== index));
  };

  const addWorkflowStep = () => {
    const newStep: WorkflowStep = {
      id: Date.now().toString(),
      type: 'notification',
      action: 'send_notification',
      conditions: {},
      auto_execute: true
    };
    setWorkflowSteps([...workflowSteps, newStep]);
  };

  const updateWorkflowStep = (index: number, field: keyof WorkflowStep, value: any) => {
    const updated = [...workflowSteps];
    updated[index] = { ...updated[index], [field]: value };
    setWorkflowSteps(updated);
  };

  const removeWorkflowStep = (index: number) => {
    setWorkflowSteps(workflowSteps.filter((_, i) => i !== index));
  };

  const fieldOptions = [
    { value: 'estimated_budget', label: 'Estimated Budget' },
    { value: 'company_name', label: 'Company Name' },
    { value: 'decision_maker', label: 'Decision Maker' },
    { value: 'financing_secured', label: 'Financing Secured' },
    { value: 'project_timeline', label: 'Project Timeline' },
    { value: 'lead_temperature', label: 'Lead Temperature' },
    { value: 'score', label: 'Lead Score' }
  ];

  const operatorOptions = [
    { value: 'eq', label: 'Equals' },
    { value: 'neq', label: 'Not Equals' },
    { value: 'gt', label: 'Greater Than' },
    { value: 'gte', label: 'Greater Than or Equal' },
    { value: 'lt', label: 'Less Than' },
    { value: 'lte', label: 'Less Than or Equal' },
    { value: 'exists', label: 'Has Value' },
    { value: 'not_exists', label: 'No Value' },
    { value: 'contains', label: 'Contains' }
  ];

  if (loading) {
    return <div className="p-6">Loading qualification workflows...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lead Qualification Workflows</h1>
          <p className="text-muted-foreground">Automated lead qualification and routing</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Workflow
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Qualification Workflow</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="workflow_name">Workflow Name</Label>
                    <Input
                      id="workflow_name"
                      value={newWorkflow.workflow_name}
                      onChange={(e) => setNewWorkflow(prev => ({ ...prev, workflow_name: e.target.value }))}
                      placeholder="e.g., High-Value Lead Qualification"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={newWorkflow.description}
                      onChange={(e) => setNewWorkflow(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe this workflow"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="qualified_status">Qualified Status</Label>
                    <Input
                      id="qualified_status"
                      value={newWorkflow.qualified_status}
                      onChange={(e) => setNewWorkflow(prev => ({ ...prev, qualified_status: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="disqualified_status">Disqualified Status</Label>
                    <Input
                      id="disqualified_status"
                      value={newWorkflow.disqualified_status}
                      onChange={(e) => setNewWorkflow(prev => ({ ...prev, disqualified_status: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="auto_route_qualified"
                      checked={newWorkflow.auto_route_qualified}
                      onCheckedChange={(checked) => setNewWorkflow(prev => ({ ...prev, auto_route_qualified: checked }))}
                    />
                    <Label htmlFor="auto_route_qualified">Auto-route qualified leads</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="requires_approval"
                      checked={newWorkflow.requires_approval}
                      onCheckedChange={(checked) => setNewWorkflow(prev => ({ ...prev, requires_approval: checked }))}
                    />
                    <Label htmlFor="requires_approval">Require approval</Label>
                  </div>
                </div>
              </div>

              {/* Qualification Criteria */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Qualification Criteria</h3>
                  <Button variant="outline" size="sm" onClick={addCriteria}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Criteria
                  </Button>
                </div>
                <div className="space-y-2">
                  {criteriaList.map((criteria, index) => (
                    <div key={index} className="flex items-center space-x-2 p-3 border rounded-lg">
                      <Select
                        value={criteria.field}
                        onValueChange={(value) => updateCriteria(index, 'field', value)}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {fieldOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={criteria.operator}
                        onValueChange={(value) => updateCriteria(index, 'operator', value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {operatorOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!['exists', 'not_exists'].includes(criteria.operator) && (
                        <Input
                          value={criteria.value}
                          onChange={(e) => updateCriteria(index, 'value', e.target.value)}
                          placeholder="Value"
                          className="w-32"
                        />
                      )}
                      <Input
                        type="number"
                        value={criteria.weight}
                        onChange={(e) => updateCriteria(index, 'weight', parseInt(e.target.value))}
                        placeholder="Weight"
                        className="w-20"
                        min="0"
                        max="100"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeCriteria(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Workflow Steps */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Workflow Steps</h3>
                  <Button variant="outline" size="sm" onClick={addWorkflowStep}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Step
                  </Button>
                </div>
                <div className="space-y-2">
                  {workflowSteps.map((step, index) => (
                    <div key={step.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        {index + 1}
                      </div>
                      <Select
                        value={step.type}
                        onValueChange={(value) => updateWorkflowStep(index, 'type', value)}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="score_check">Score Check</SelectItem>
                          <SelectItem value="notification">Send Notification</SelectItem>
                          <SelectItem value="assignment">Assign to User</SelectItem>
                          <SelectItem value="status_change">Change Status</SelectItem>
                          <SelectItem value="tag_assignment">Add Tags</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={step.action}
                        onChange={(e) => updateWorkflowStep(index, 'action', e.target.value)}
                        placeholder="Action description"
                        className="flex-1"
                      />
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={step.auto_execute}
                          onCheckedChange={(checked) => updateWorkflowStep(index, 'auto_execute', checked)}
                        />
                        <Label className="text-xs">Auto</Label>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeWorkflowStep(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={createWorkflow} disabled={isCreating} className="w-full">
                {isCreating ? "Creating..." : "Create Workflow"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {workflows.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Filter className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No workflows yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first qualification workflow to start automating lead qualification
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          workflows.map((workflow) => (
            <Card key={workflow.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <span>{workflow.workflow_name}</span>
                      <Badge variant={workflow.is_active ? "default" : "secondary"}>
                        {workflow.is_active ? "Active" : "Paused"}
                      </Badge>
                      {workflow.requires_approval && (
                        <Badge variant="outline">Requires Approval</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{workflow.description}</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleWorkflowStatus(workflow.id, workflow.is_active)}
                    >
                      {workflow.is_active ? (
                        <>
                          <Pause className="h-4 w-4 mr-2" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Activate
                        </>
                      )}
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Trigger Events</div>
                    <div className="font-medium">{workflow.trigger_events.length}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Workflow Steps</div>
                    <div className="font-medium">{workflow.workflow_steps.length}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Qualified Status</div>
                    <Badge variant="outline">{workflow.qualified_status}</Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Auto Route</div>
                    <div className="flex items-center justify-center">
                      {workflow.auto_route_qualified ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Qualification Criteria: {Object.keys(workflow.qualification_criteria).length} conditions
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Created: {new Date(workflow.created_at).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};