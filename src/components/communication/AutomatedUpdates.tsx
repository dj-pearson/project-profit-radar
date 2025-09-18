import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Zap, 
  Clock, 
  Users, 
  FileText, 
  Settings, 
  Play, 
  Pause, 
  Plus,
  Edit,
  Trash2,
  Send,
  Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger_type: string;
  trigger_conditions: any;
  recipient_rules: any;
  template_id: string;
  is_active: boolean;
  last_triggered?: string;
  trigger_count: number;
  created_at: string;
}

interface UpdateTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  template_type: string;
  variables: string[];
}

interface AutomatedUpdatesProps {
  userProfile: any;
  className?: string;
}

export const AutomatedUpdates: React.FC<AutomatedUpdatesProps> = ({ 
  userProfile, 
  className 
}) => {
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [templates, setTemplates] = useState<UpdateTemplate[]>([]);
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    trigger_type: 'milestone_completion',
    trigger_conditions: {},
    recipient_rules: {},
    template_id: '',
    is_active: true
  });

  const triggerTypes = [
    { value: 'milestone_completion', label: 'Milestone Completion' },
    { value: 'budget_threshold', label: 'Budget Threshold' },
    { value: 'schedule_delay', label: 'Schedule Delay' },
    { value: 'quality_issue', label: 'Quality Issue' },
    { value: 'daily_progress', label: 'Daily Progress' },
    { value: 'weekly_summary', label: 'Weekly Summary' },
    { value: 'client_request', label: 'Client Request' }
  ];

  useEffect(() => {
    if (userProfile?.company_id) {
      loadAutomationRules();
      loadTemplates();
    }
  }, [userProfile?.company_id]);

  const loadAutomationRules = async () => {
    if (!userProfile?.company_id) return;

    try {
      const { data, error } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAutomationRules(data || []);
    } catch (error) {
      console.error('Error loading automation rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    // Mock templates for now
    setTemplates([
      {
        id: '1',
        name: 'Milestone Completion',
        subject: 'Milestone Completed: {{milestone_name}}',
        content: 'Good news! We have completed the {{milestone_name}} milestone for {{project_name}}. The project is now {{completion_percentage}}% complete.',
        template_type: 'milestone',
        variables: ['milestone_name', 'project_name', 'completion_percentage']
      },
      {
        id: '2',
        name: 'Budget Alert',
        subject: 'Budget Alert: {{project_name}}',
        content: 'The budget for {{project_name}} has reached {{budget_percentage}}% of the total budget. Current spending: {{current_amount}} of {{total_budget}}.',
        template_type: 'budget',
        variables: ['project_name', 'budget_percentage', 'current_amount', 'total_budget']
      },
      {
        id: '3',
        name: 'Weekly Progress Summary',
        subject: 'Weekly Progress Update: {{project_name}}',
        content: 'Here\'s your weekly progress update for {{project_name}}:\n\nCompleted this week:\n{{completed_tasks}}\n\nScheduled for next week:\n{{upcoming_tasks}}\n\nOverall progress: {{completion_percentage}}%',
        template_type: 'weekly',
        variables: ['project_name', 'completed_tasks', 'upcoming_tasks', 'completion_percentage']
      }
    ]);
  };

  const createAutomationRule = async () => {
    if (!userProfile?.company_id || !newRule.name.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('automation_rules')
        .insert({
          ...newRule,
          company_id: userProfile.company_id,
          created_by: userProfile.id
        })
        .select()
        .single();

      if (error) throw error;

      setAutomationRules(prev => [data, ...prev]);
      setShowCreateForm(false);
      setNewRule({
        name: '',
        description: '',
        trigger_type: 'milestone_completion',
        trigger_conditions: {},
        recipient_rules: {},
        template_id: '',
        is_active: true
      });
      toast.success('Automation rule created successfully');
    } catch (error) {
      console.error('Error creating automation rule:', error);
      toast.error('Failed to create automation rule');
    }
  };

  const toggleRuleStatus = async (ruleId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('automation_rules')
        .update({ is_active: isActive })
        .eq('id', ruleId);

      if (error) throw error;

      setAutomationRules(prev =>
        prev.map(rule =>
          rule.id === ruleId ? { ...rule, is_active: isActive } : rule
        )
      );

      toast.success(`Automation rule ${isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error updating rule status:', error);
      toast.error('Failed to update rule status');
    }
  };

  const deleteRule = async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from('automation_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      setAutomationRules(prev => prev.filter(rule => rule.id !== ruleId));
      toast.success('Automation rule deleted');
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error('Failed to delete rule');
    }
  };

  const testRule = async (ruleId: string) => {
    try {
      // Mock test execution
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Test update sent successfully');
    } catch (error) {
      console.error('Error testing rule:', error);
      toast.error('Failed to test rule');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Automated Updates</h2>
          <p className="text-muted-foreground">
            Set up automatic communications to keep stakeholders informed
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Rule
        </Button>
      </div>

      <Tabs defaultValue="rules" className="w-full">
        <TabsList>
          <TabsTrigger value="rules">Automation Rules</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          {showCreateForm && (
            <Card>
              <CardHeader>
                <CardTitle>Create Automation Rule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rule-name">Rule Name</Label>
                    <Input
                      id="rule-name"
                      value={newRule.name}
                      onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Weekly Progress Updates"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="trigger-type">Trigger Type</Label>
                    <Select
                      value={newRule.trigger_type}
                      onValueChange={(value) => setNewRule(prev => ({ ...prev, trigger_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {triggerTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newRule.description}
                    onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe when and how this rule should trigger..."
                  />
                </div>

                <div>
                  <Label htmlFor="template">Message Template</Label>
                  <Select
                    value={newRule.template_id}
                    onValueChange={(value) => setNewRule(prev => ({ ...prev, template_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="active"
                      checked={newRule.is_active}
                      onCheckedChange={(checked) => setNewRule(prev => ({ ...prev, is_active: checked }))}
                    />
                    <Label htmlFor="active">Active</Label>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createAutomationRule}>
                      Create Rule
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4">
            {automationRules.length === 0 ? (
              <Card className="p-8 text-center">
                <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No automation rules yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first automation rule to start sending automatic updates
                </p>
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Rule
                </Button>
              </Card>
            ) : (
              automationRules.map((rule) => (
                <Card key={rule.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{rule.name}</h3>
                          <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant="outline">
                            {triggerTypes.find(t => t.value === rule.trigger_type)?.label}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {rule.description}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Triggered {rule.trigger_count} times
                          </span>
                          {rule.last_triggered && (
                            <span>
                              Last: {new Date(rule.last_triggered).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testRule(rule.id)}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleRuleStatus(rule.id, !rule.is_active)}
                        >
                          {rule.is_active ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRule(rule)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteRule(rule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Badge variant="outline">{template.template_type}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-sm mb-1">Subject</h4>
                      <p className="text-sm text-muted-foreground">{template.subject}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm mb-1">Content</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {template.content}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-sm mb-1">Variables</h4>
                      <div className="flex flex-wrap gap-1">
                        {template.variables.map((variable) => (
                          <Badge key={variable} variant="secondary" className="text-xs">
                            {`{{${variable}}}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Communication History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No history yet</h3>
                <p className="text-muted-foreground">
                  Automated communications will appear here once rules start triggering
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};