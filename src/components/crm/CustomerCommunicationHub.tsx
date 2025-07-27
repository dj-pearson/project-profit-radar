import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  MessageSquare,
  Mail,
  Phone,
  Calendar,
  FileText,
  Bell,
  Settings,
  Users,
  Send,
  Plus,
  Eye,
  Download,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface CommunicationLogEntry {
  id: string;
  communication_type: string;
  direction: string;
  subject: string;
  content: string;
  status: string;
  created_at: string;
  participants: any;
  project?: { name: string };
  lead?: { first_name: string; last_name: string; company_name: string };
}

interface CommunicationTemplate {
  id: string;
  name: string;
  category: string;
  communication_type: string;
  subject_template: string;
  content_template: string;
  variables: any;
}

interface NotificationRule {
  id: string;
  name: string;
  trigger_event: string;
  template_id: string;
  recipients: any;
  delay_minutes: number;
  is_active: boolean;
}

export const CustomerCommunicationHub = () => {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('timeline');
  const [communicationLog, setCommunicationLog] = useState<CommunicationLogEntry[]>([]);
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [notificationRules, setNotificationRules] = useState<NotificationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [newMessageContent, setNewMessageContent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  useEffect(() => {
    if (userProfile?.company_id) {
      loadCommunicationData();
    }
  }, [userProfile?.company_id]);

  const loadCommunicationData = async () => {
    try {
      setLoading(true);

      // Load communication log
      const { data: logData, error: logError } = await supabase
        .from('communication_log')
        .select(`
          *,
          projects:project_id (name),
          leads:lead_id (first_name, last_name, company_name)
        `)
        .eq('company_id', userProfile?.company_id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (logError) throw logError;

      // Load templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('communication_templates')
        .select('*')
        .eq('company_id', userProfile?.company_id)
        .eq('is_active', true)
        .order('category', { ascending: true });

      if (templatesError) throw templatesError;

      // Load notification rules
      const { data: rulesData, error: rulesError } = await supabase
        .from('notification_rules')
        .select('*')
        .eq('company_id', userProfile?.company_id)
        .order('name', { ascending: true });

      if (rulesError) throw rulesError;

      setCommunicationLog(logData as CommunicationLogEntry[] || []);
      setTemplates(templatesData as CommunicationTemplate[] || []);
      setNotificationRules(rulesData as NotificationRule[] || []);

    } catch (error: any) {
      console.error('Error loading communication data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load communication data"
      });
    } finally {
      setLoading(false);
    }
  };

  const sendCommunication = async (type: string, projectId?: string, leadId?: string) => {
    if (!newMessageContent.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter message content"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('communication_log')
        .insert({
          company_id: userProfile?.company_id,
          project_id: projectId || null,
          lead_id: leadId || null,
          communication_type: type,
          direction: 'outbound',
          content: newMessageContent,
          status: 'pending',
          created_by: userProfile?.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Communication sent successfully"
      });

      setNewMessageContent('');
      loadCommunicationData();

    } catch (error: any) {
      console.error('Error sending communication:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send communication"
      });
    }
  };

  const createTemplate = async (templateData: Partial<CommunicationTemplate>) => {
    try {
      const { error } = await supabase
        .from('communication_templates')
        .insert({
          name: templateData.name || '',
          category: templateData.category || '',
          communication_type: templateData.communication_type || 'email',
          subject_template: templateData.subject_template || '',
          content_template: templateData.content_template || '',
          variables: JSON.stringify(templateData.variables || []),
          company_id: userProfile?.company_id,
          created_by: userProfile?.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Template created successfully"
      });

      loadCommunicationData();

    } catch (error: any) {
      console.error('Error creating template:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create template"
      });
    }
  };

  const createNotificationRule = async (ruleData: Partial<NotificationRule>) => {
    try {
      const { error } = await supabase
        .from('notification_rules')
        .insert({
          name: ruleData.name || '',
          trigger_event: ruleData.trigger_event || '',
          template_id: ruleData.template_id || null,
          recipients: JSON.stringify(ruleData.recipients || []),
          delay_minutes: ruleData.delay_minutes || 0,
          is_active: ruleData.is_active ?? true,
          company_id: userProfile?.company_id,
          created_by: userProfile?.id
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Notification rule created successfully"
      });

      loadCommunicationData();

    } catch (error: any) {
      console.error('Error creating notification rule:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create notification rule"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'read':
        return <Eye className="h-4 w-4 text-purple-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getCommunicationTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'call':
        return <Phone className="h-4 w-4" />;
      case 'meeting':
        return <Calendar className="h-4 w-4" />;
      case 'portal_message':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading communication hub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Customer Communication Hub</h2>
          <p className="text-muted-foreground">Manage all customer communications in one place</p>
        </div>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Communication Template</DialogTitle>
                <DialogDescription>
                  Create a reusable template for communications
                </DialogDescription>
              </DialogHeader>
              <TemplateForm onSubmit={createTemplate} />
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Bell className="h-4 w-4 mr-2" />
                New Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Notification Rule</DialogTitle>
                <DialogDescription>
                  Set up automated notifications for specific events
                </DialogDescription>
              </DialogHeader>
              <NotificationRuleForm 
                onSubmit={createNotificationRule}
                templates={templates}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Communications</p>
                <p className="text-2xl font-bold">{communicationLog.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email Sent</p>
                <p className="text-2xl font-bold">
                  {communicationLog.filter(c => c.communication_type === 'email' && c.direction === 'outbound').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Templates</p>
                <p className="text-2xl font-bold">{templates.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Rules</p>
                <p className="text-2xl font-bold">
                  {notificationRules.filter(r => r.is_active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="timeline">Communication Timeline</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="automation">Automation Rules</TabsTrigger>
          <TabsTrigger value="compose">Compose</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Communication Timeline</CardTitle>
              <CardDescription>Recent communications with customers</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4">
                  {communicationLog.map((entry) => (
                    <div key={entry.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                      <div className="flex items-center space-x-2">
                        {getCommunicationTypeIcon(entry.communication_type)}
                        {getStatusIcon(entry.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Badge variant={entry.direction === 'outbound' ? 'default' : 'secondary'}>
                              {entry.direction}
                            </Badge>
                            <Badge variant="outline">{entry.communication_type}</Badge>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {new Date(entry.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {entry.subject && (
                          <h4 className="font-medium mt-1">{entry.subject}</h4>
                        )}
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {entry.content}
                        </p>
                        {(entry.project || entry.lead) && (
                          <div className="mt-2">
                            {entry.project && (
                              <Badge variant="outline" className="mr-2">
                                Project: {entry.project.name}
                              </Badge>
                            )}
                            {entry.lead && (
                              <Badge variant="outline">
                                Lead: {entry.lead.first_name} {entry.lead.last_name}
                                {entry.lead.company_name && ` (${entry.lead.company_name})`}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {communicationLog.length === 0 && (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No communications yet</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Communication Templates</CardTitle>
              <CardDescription>Manage reusable communication templates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <Card key={template.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <Badge>{template.category}</Badge>
                      </div>
                      <CardDescription>
                        {template.communication_type.charAt(0).toUpperCase() + template.communication_type.slice(1)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {template.subject_template && (
                        <div className="mb-2">
                          <Label className="text-sm font-medium">Subject:</Label>
                          <p className="text-sm text-muted-foreground">{template.subject_template}</p>
                        </div>
                      )}
                      <div>
                        <Label className="text-sm font-medium">Content:</Label>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {template.content_template}
                        </p>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button size="sm" variant="outline">Edit</Button>
                        <Button size="sm">Use Template</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {templates.length === 0 && (
                  <div className="col-span-full text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No templates created yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Automation Rules</CardTitle>
              <CardDescription>Manage automated communication rules</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notificationRules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">{rule.name}</h4>
                        <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                          {rule.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Trigger: {rule.trigger_event.replace(/_/g, ' ')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Recipients: {Array.isArray(rule.recipients) ? rule.recipients.length : 0} recipient(s)
                      </p>
                      {rule.delay_minutes > 0 && (
                        <p className="text-sm text-muted-foreground">
                          Delay: {rule.delay_minutes} minutes
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch checked={rule.is_active} />
                      <Button size="sm" variant="outline">Edit</Button>
                    </div>
                  </div>
                ))}
                
                {notificationRules.length === 0 && (
                  <div className="text-center py-8">
                    <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No automation rules configured</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compose" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compose Communication</CardTitle>
              <CardDescription>Send a new communication to customers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="template">Use Template (Optional)</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} ({template.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="project">Project (Optional)</Label>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Project options would be loaded here */}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="content">Message Content</Label>
                <Textarea
                  id="content"
                  placeholder="Enter your message..."
                  value={newMessageContent}
                  onChange={(e) => setNewMessageContent(e.target.value)}
                  rows={6}
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={() => sendCommunication('email')}>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
                <Button variant="outline" onClick={() => sendCommunication('portal_message')}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Portal Message
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Template Form Component
const TemplateForm = ({ onSubmit }: { onSubmit: (data: Partial<CommunicationTemplate>) => void }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    communication_type: 'email',
    subject_template: '',
    content_template: '',
    variables: [] as string[]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Template Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="welcome">Welcome</SelectItem>
              <SelectItem value="status_update">Status Update</SelectItem>
              <SelectItem value="invoice">Invoice</SelectItem>
              <SelectItem value="follow_up">Follow Up</SelectItem>
              <SelectItem value="completion">Completion</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div>
        <Label htmlFor="communication_type">Communication Type</Label>
        <Select value={formData.communication_type} onValueChange={(value) => setFormData(prev => ({ ...prev, communication_type: value }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="portal_notification">Portal Notification</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {formData.communication_type === 'email' && (
        <div>
          <Label htmlFor="subject_template">Subject Template</Label>
          <Input
            id="subject_template"
            value={formData.subject_template}
            onChange={(e) => setFormData(prev => ({ ...prev, subject_template: e.target.value }))}
            placeholder="e.g., Project Update: {{project_name}}"
          />
        </div>
      )}
      
      <div>
        <Label htmlFor="content_template">Content Template</Label>
        <Textarea
          id="content_template"
          value={formData.content_template}
          onChange={(e) => setFormData(prev => ({ ...prev, content_template: e.target.value }))}
          placeholder="Enter template content with variables like {{customer_name}}, {{project_name}}, etc."
          rows={6}
          required
        />
      </div>
      
      <Button type="submit" className="w-full">Create Template</Button>
    </form>
  );
};

// Notification Rule Form Component
const NotificationRuleForm = ({ 
  onSubmit, 
  templates 
}: { 
  onSubmit: (data: Partial<NotificationRule>) => void;
  templates: CommunicationTemplate[];
}) => {
  const [formData, setFormData] = useState({
    name: '',
    trigger_event: '',
    template_id: '',
    recipients: [] as string[],
    delay_minutes: 0,
    is_active: true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="rule_name">Rule Name</Label>
        <Input
          id="rule_name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="trigger_event">Trigger Event</Label>
        <Select value={formData.trigger_event} onValueChange={(value) => setFormData(prev => ({ ...prev, trigger_event: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select trigger event" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="project_status_change">Project Status Change</SelectItem>
            <SelectItem value="payment_received">Payment Received</SelectItem>
            <SelectItem value="project_completion">Project Completion</SelectItem>
            <SelectItem value="invoice_generated">Invoice Generated</SelectItem>
            <SelectItem value="lead_qualification">Lead Qualification</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="template">Template</Label>
        <Select value={formData.template_id} onValueChange={(value) => setFormData(prev => ({ ...prev, template_id: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select template" />
          </SelectTrigger>
          <SelectContent>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.name} ({template.category})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="delay">Delay (minutes)</Label>
        <Input
          id="delay"
          type="number"
          value={formData.delay_minutes}
          onChange={(e) => setFormData(prev => ({ ...prev, delay_minutes: parseInt(e.target.value) || 0 }))}
          min="0"
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <Switch
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
        />
        <Label>Active</Label>
      </div>
      
      <Button type="submit" className="w-full">Create Rule</Button>
    </form>
  );
};