import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plus, 
  Edit, 
  Send, 
  MessageSquare, 
  Camera, 
  FileText, 
  Calendar,
  Settings,
  Zap,
  CheckCircle,
  AlertTriangle,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';

interface AutomatedClientUpdate {
  trigger: 'phase_completion' | 'delay_detected' | 'budget_variance' | 'milestone_reached';
  template: string;
  recipients: string[];
  attachments: 'progress_photos' | 'updated_timeline' | 'budget_summary';
  delivery_method: 'email' | 'portal_notification' | 'sms';
}

interface AutomationRule {
  id: string;
  company_id: string;
  project_id?: string;
  trigger_type: string;
  trigger_conditions: any;
  template_id: string;
  is_active: boolean;
  created_at: string;
  template?: {
    id: string;
    name: string;
    subject: string;
    content: string;
  };
}

interface CommunicationTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  trigger_type: string;
  variables: string[];
}

export const SmartClientUpdates: React.FC = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('rules');

  const [ruleForm, setRuleForm] = useState({
    trigger_type: '',
    project_id: '',
    template_id: '',
    is_active: true,
    trigger_conditions: {}
  });

  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    content: '',
    trigger_type: '',
    variables: [] as string[]
  });

  useEffect(() => {
    loadData();
  }, [userProfile?.company_id]);

  const loadData = async () => {
    if (!userProfile?.company_id) return;

    try {
      // Load automation rules
      const { data: rulesData, error: rulesError } = await supabase
        .from('automation_rules')
        .select(`
          *,
          template:template_id(id, name, subject, content)
        `)
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false });

      if (rulesError) throw rulesError;

      // Load templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('communication_templates')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('name');

      if (templatesError) throw templatesError;

      // Load projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name')
        .eq('company_id', userProfile.company_id)
        .eq('status', 'active')
        .order('name');

      if (projectsError) throw projectsError;

      setAutomationRules(rulesData || []);
      setTemplates(templatesData || []);
      setProjects(projectsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load automation data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async () => {
    if (!userProfile?.company_id) return;

    try {
      const { data, error } = await supabase
        .from('automation_rules')
        .insert({
          ...ruleForm,
          company_id: userProfile.company_id,
          created_by: userProfile.id
        })
        .select()
        .single();

      if (error) throw error;

      setDialogOpen(false);
      resetRuleForm();
      await loadData();

      toast({
        title: "Automation Rule Created",
        description: "Your automation rule has been created successfully.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error creating rule",
        description: error.message,
      });
    }
  };

  const handleCreateTemplate = async () => {
    if (!userProfile?.company_id) return;

    try {
      const { data, error } = await supabase
        .from('communication_templates')
        .insert({
          ...templateForm,
          company_id: userProfile.company_id,
          created_by: userProfile.id
        })
        .select()
        .single();

      if (error) throw error;

      setTemplateDialogOpen(false);
      resetTemplateForm();
      await loadData();

      toast({
        title: "Template Created",
        description: "Your communication template has been created successfully.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error creating template",
        description: error.message,
      });
    }
  };

  const handleToggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('automation_rules')
        .update({ is_active: isActive })
        .eq('id', ruleId);

      if (error) throw error;

      await loadData();
      toast({
        title: "Rule Updated",
        description: `Automation rule ${isActive ? 'enabled' : 'disabled'}.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating rule",
        description: error.message,
      });
    }
  };

  const resetRuleForm = () => {
    setRuleForm({
      trigger_type: '',
      project_id: '',
      template_id: '',
      is_active: true,
      trigger_conditions: {}
    });
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      name: '',
      subject: '',
      content: '',
      trigger_type: '',
      variables: []
    });
  };

  const getTriggerIcon = (triggerType: string) => {
    switch (triggerType) {
      case 'phase_completion': return <CheckCircle className="h-4 w-4" />;
      case 'delay_detected': return <AlertTriangle className="h-4 w-4" />;
      case 'budget_variance': return <DollarSign className="h-4 w-4" />;
      case 'milestone_reached': return <Calendar className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const getTriggerLabel = (triggerType: string) => {
    switch (triggerType) {
      case 'phase_completion': return 'Phase Completion';
      case 'delay_detected': return 'Delay Detected';
      case 'budget_variance': return 'Budget Variance';
      case 'milestone_reached': return 'Milestone Reached';
      default: return triggerType;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading automation settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Smart Client Updates</h2>
          <p className="text-muted-foreground">
            Automate client communications based on project events
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => resetTemplateForm()}>
                <FileText className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
          </Dialog>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetRuleForm()}>
                <Plus className="h-4 w-4 mr-2" />
                New Rule
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="rules">Automation Rules</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="logs">Communication Log</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Automation Rules</CardTitle>
              <CardDescription>
                Configure automatic client communications based on project events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {automationRules.length === 0 ? (
                <div className="text-center py-8">
                  <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No automation rules yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first automation rule to start sending smart client updates
                  </p>
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Rule
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Trigger</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {automationRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTriggerIcon(rule.trigger_type)}
                            {getTriggerLabel(rule.trigger_type)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {rule.project_id 
                            ? projects.find(p => p.id === rule.project_id)?.name || 'Unknown Project'
                            : 'All Projects'
                          }
                        </TableCell>
                        <TableCell>
                          {rule.template?.name || 'Template not found'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={rule.is_active}
                              onCheckedChange={(checked) => handleToggleRule(rule.id, checked)}
                            />
                            <Badge variant={rule.is_active ? "default" : "secondary"}>
                              {rule.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Communication Templates</CardTitle>
              <CardDescription>
                Create reusable templates for automated client communications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {templates.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first template to use in automation rules
                  </p>
                  <Button onClick={() => setTemplateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Template
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {templates.map((template) => (
                    <Card key={template.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            <CardDescription>
                              {getTriggerLabel(template.trigger_type)} • {template.subject}
                            </CardDescription>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {template.content}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Communication Log</CardTitle>
              <CardDescription>
                View all automated communications sent to clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Communication log coming soon</h3>
                <p className="text-muted-foreground">
                  This will show all automated communications sent to your clients
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Rule Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Automation Rule</DialogTitle>
            <DialogDescription>
              Set up automatic client communications based on project events
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="trigger_type">Trigger Event</Label>
                <Select
                  value={ruleForm.trigger_type}
                  onValueChange={(value) => setRuleForm(prev => ({ ...prev, trigger_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select trigger" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phase_completion">Phase Completion</SelectItem>
                    <SelectItem value="delay_detected">Delay Detected</SelectItem>
                    <SelectItem value="budget_variance">Budget Variance</SelectItem>
                    <SelectItem value="milestone_reached">Milestone Reached</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="project_id">Project (Optional)</Label>
                <Select
                  value={ruleForm.project_id}
                  onValueChange={(value) => setRuleForm(prev => ({ ...prev, project_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Projects</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="template_id">Template</Label>
              <Select
                value={ruleForm.template_id}
                onValueChange={(value) => setRuleForm(prev => ({ ...prev, template_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {templates
                    .filter(t => !ruleForm.trigger_type || t.trigger_type === ruleForm.trigger_type)
                    .map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={ruleForm.is_active}
                onCheckedChange={(checked) => setRuleForm(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="is_active">Enable this rule</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateRule}
                disabled={!ruleForm.trigger_type || !ruleForm.template_id}
              >
                Create Rule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Communication Template</DialogTitle>
            <DialogDescription>
              Create a reusable template for automated client communications
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="template_name">Template Name</Label>
                <Input
                  id="template_name"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Phase Completion Update"
                />
              </div>
              <div>
                <Label htmlFor="template_trigger">Trigger Type</Label>
                <Select
                  value={templateForm.trigger_type}
                  onValueChange={(value) => setTemplateForm(prev => ({ ...prev, trigger_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select trigger type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phase_completion">Phase Completion</SelectItem>
                    <SelectItem value="delay_detected">Delay Detected</SelectItem>
                    <SelectItem value="budget_variance">Budget Variance</SelectItem>
                    <SelectItem value="milestone_reached">Milestone Reached</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="template_subject">Email Subject</Label>
              <Input
                id="template_subject"
                value={templateForm.subject}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="e.g., {{project_name}} - Phase Complete"
              />
            </div>

            <div>
              <Label htmlFor="template_content">Message Content</Label>
              <Textarea
                id="template_content"
                value={templateForm.content}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Dear {{client_name}}, &#10;&#10;We're excited to share that we've completed the {{phase_name}} phase of your {{project_name}} project..."
                rows={8}
              />
            </div>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Available Variables</h4>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <code>{'{{client_name}}'}</code>
                  <code>{'{{project_name}}'}</code>
                  <code>{'{{phase_name}}'}</code>
                  <code>{'{{completion_date}}'}</code>
                  <code>{'{{budget_status}}'}</code>
                  <code>{'{{timeline_status}}'}</code>
                </div>
              </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateTemplate}
                disabled={!templateForm.name || !templateForm.subject || !templateForm.content || !templateForm.trigger_type}
              >
                Create Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SmartClientUpdates;
