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
  Mail, 
  Send, 
  Users, 
  Settings, 
  Plus,
  BarChart3,
  Calendar,
  Zap,
  Target,
  TrendingUp,
  Eye,
  Edit
} from 'lucide-react';

interface EmailProvider {
  id: string;
  name: string;
  connected: boolean;
  config?: {
    apiKey?: string;
    domain?: string;
    webhookUrl?: string;
  };
}

interface EmailAutomation {
  id: string;
  name: string;
  type: 'drip_campaign' | 'trigger_based' | 'behavioral' | 'milestone';
  status: 'active' | 'inactive' | 'draft';
  trigger: {
    event: string;
    conditions: Record<string, any>;
  };
  emails: {
    subject: string;
    template: string;
    delay_hours: number;
  }[];
  stats: {
    sent: number;
    opened: number;
    clicked: number;
    converted: number;
  };
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  variables: string[];
  category: 'onboarding' | 'marketing' | 'transactional' | 'notification';
  preview_image?: string;
}

const EnhancedEmailIntegration = () => {
  const { userProfile } = useAuth();
  const [providers, setProviders] = useState<EmailProvider[]>([]);
  const [automations, setAutomations] = useState<EmailAutomation[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('providers');

  // Form states
  const [automationName, setAutomationName] = useState('');
  const [automationType, setAutomationType] = useState('trigger_based');
  const [selectedProvider, setSelectedProvider] = useState('');

  useEffect(() => {
    loadEmailIntegrationData();
  }, []);

  const loadEmailIntegrationData = async () => {
    setLoading(true);
    try {
      // Mock data for email providers
      const mockProviders: EmailProvider[] = [
        {
          id: 'resend',
          name: 'Resend',
          connected: true,
          config: {
            domain: 'builddesk.app',
            webhookUrl: 'https://api.builddesk.app/webhooks/resend'
          }
        },
        {
          id: 'sendgrid',
          name: 'SendGrid',
          connected: false
        },
        {
          id: 'mailgun',
          name: 'Mailgun',
          connected: false
        }
      ];

      // Mock email automations
      const mockAutomations: EmailAutomation[] = [
        {
          id: '1',
          name: 'New Client Onboarding',
          type: 'drip_campaign',
          status: 'active',
          trigger: {
            event: 'client_created',
            conditions: { client_type: 'new' }
          },
          emails: [
            { subject: 'Welcome to BuildDesk!', template: 'welcome', delay_hours: 0 },
            { subject: 'Getting Started Guide', template: 'getting_started', delay_hours: 24 },
            { subject: 'Your First Project Setup', template: 'first_project', delay_hours: 72 }
          ],
          stats: { sent: 156, opened: 134, clicked: 89, converted: 45 }
        },
        {
          id: '2',
          name: 'Project Milestone Updates',
          type: 'trigger_based',
          status: 'active',
          trigger: {
            event: 'project_milestone_completed',
            conditions: { notify_client: true }
          },
          emails: [
            { subject: 'Project Milestone Completed', template: 'milestone_update', delay_hours: 0 }
          ],
          stats: { sent: 89, opened: 76, clicked: 34, converted: 12 }
        },
        {
          id: '3',
          name: 'Payment Reminder Sequence',
          type: 'behavioral',
          status: 'active',
          trigger: {
            event: 'invoice_overdue',
            conditions: { days_overdue: 7 }
          },
          emails: [
            { subject: 'Payment Reminder', template: 'payment_reminder_1', delay_hours: 0 },
            { subject: 'Second Payment Notice', template: 'payment_reminder_2', delay_hours: 168 },
            { subject: 'Final Payment Notice', template: 'payment_reminder_3', delay_hours: 336 }
          ],
          stats: { sent: 34, opened: 28, clicked: 15, converted: 8 }
        }
      ];

      // Mock email templates
      const mockTemplates: EmailTemplate[] = [
        {
          id: '1',
          name: 'Welcome Email',
          subject: 'Welcome to BuildDesk, {{client_name}}!',
          html: '<h1>Welcome to BuildDesk</h1><p>Dear {{client_name}}, we are excited to work with you on your construction project.</p>',
          variables: ['client_name', 'project_name', 'company_name'],
          category: 'onboarding'
        },
        {
          id: '2',
          name: 'Project Update',
          subject: 'Project {{project_name}} - Progress Update',
          html: '<h2>Project Progress Update</h2><p>Your project {{project_name}} is {{progress_percentage}}% complete.</p>',
          variables: ['project_name', 'progress_percentage', 'estimated_completion'],
          category: 'notification'
        },
        {
          id: '3',
          name: 'Invoice Generated',
          subject: 'Invoice #{{invoice_number}} - Amount Due: ${{amount}}',
          html: '<h2>New Invoice</h2><p>A new invoice has been generated for your project.</p>',
          variables: ['invoice_number', 'amount', 'due_date', 'project_name'],
          category: 'transactional'
        }
      ];

      setProviders(mockProviders);
      setAutomations(mockAutomations);
      setTemplates(mockTemplates);
    } catch (error) {
      console.error('Error loading email integration data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load email integration data"
      });
    } finally {
      setLoading(false);
    }
  };

  const connectProvider = async (providerId: string) => {
    try {
      // This would implement actual API connection
      setProviders(providers.map(provider => 
        provider.id === providerId 
          ? { ...provider, connected: true }
          : provider
      ));

      toast({
        title: "Provider Connected",
        description: `Successfully connected to ${providers.find(p => p.id === providerId)?.name}`
      });
    } catch (error) {
      console.error('Error connecting provider:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to connect email provider"
      });
    }
  };

  const createAutomation = async () => {
    if (!automationName || !selectedProvider) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields"
      });
      return;
    }

    try {
      const newAutomation: EmailAutomation = {
        id: Date.now().toString(),
        name: automationName,
        type: automationType as any,
        status: 'draft',
        trigger: {
          event: 'manual',
          conditions: {}
        },
        emails: [],
        stats: { sent: 0, opened: 0, clicked: 0, converted: 0 }
      };

      setAutomations([newAutomation, ...automations]);
      setAutomationName('');

      toast({
        title: "Automation Created",
        description: `Email automation "${newAutomation.name}" has been created`
      });
    } catch (error) {
      console.error('Error creating automation:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create email automation"
      });
    }
  };

  const toggleAutomation = async (automationId: string) => {
    try {
      setAutomations(automations.map(automation => 
        automation.id === automationId 
          ? { 
              ...automation, 
              status: automation.status === 'active' ? 'inactive' : 'active'
            }
          : automation
      ));

      const automation = automations.find(a => a.id === automationId);
      toast({
        title: "Automation Updated",
        description: `Automation "${automation?.name}" has been ${automation?.status === 'active' ? 'deactivated' : 'activated'}`
      });
    } catch (error) {
      console.error('Error toggling automation:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update automation status"
      });
    }
  };

  const getAutomationIcon = (type: string) => {
    switch (type) {
      case 'drip_campaign':
        return <Calendar className="h-4 w-4" />;
      case 'trigger_based':
        return <Zap className="h-4 w-4" />;
      case 'behavioral':
        return <Target className="h-4 w-4" />;
      case 'milestone':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Mail className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      inactive: 'secondary',
      draft: 'outline'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {status.toUpperCase()}
      </Badge>
    );
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
        <Mail className="h-5 w-5" />
        <h2 className="text-2xl font-semibold">Enhanced Email Integration</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="automations">Automations</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Service Providers</CardTitle>
              <CardDescription>
                Connect and manage your email service providers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {providers.map((provider) => (
                  <div key={provider.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center">
                        <Mail className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium">{provider.name}</h4>
                        {provider.connected && provider.config?.domain && (
                          <p className="text-sm text-muted-foreground">
                            Domain: {provider.config.domain}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={provider.connected ? "default" : "secondary"}>
                        {provider.connected ? "Connected" : "Not Connected"}
                      </Badge>
                      {provider.connected ? (
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => connectProvider(provider.id)}
                        >
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Email Automation</CardTitle>
              <CardDescription>
                Set up automated email sequences for your construction business
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="automation-name">Automation Name</Label>
                  <Input
                    id="automation-name"
                    value={automationName}
                    onChange={(e) => setAutomationName(e.target.value)}
                    placeholder="Enter automation name"
                  />
                </div>
                <div>
                  <Label htmlFor="automation-type">Type</Label>
                  <Select value={automationType} onValueChange={setAutomationType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="drip_campaign">Drip Campaign</SelectItem>
                      <SelectItem value="trigger_based">Trigger Based</SelectItem>
                      <SelectItem value="behavioral">Behavioral</SelectItem>
                      <SelectItem value="milestone">Milestone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={createAutomation}>
                <Plus className="h-4 w-4 mr-2" />
                Create Automation
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {automations.map((automation) => {
              const AutomationIcon = getAutomationIcon(automation.type);
              return (
                <Card key={automation.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {AutomationIcon}
                        <CardTitle>{automation.name}</CardTitle>
                        {getStatusBadge(automation.status)}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleAutomation(automation.id)}
                        >
                          {automation.status === 'active' ? 'Pause' : 'Activate'}
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription>
                      {automation.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} • {automation.emails.length} emails
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold">{automation.stats.sent}</div>
                        <div className="text-sm text-muted-foreground">Sent</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">
                          {automation.stats.sent > 0 ? Math.round((automation.stats.opened / automation.stats.sent) * 100) : 0}%
                        </div>
                        <div className="text-sm text-muted-foreground">Open Rate</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">
                          {automation.stats.sent > 0 ? Math.round((automation.stats.clicked / automation.stats.sent) * 100) : 0}%
                        </div>
                        <div className="text-sm text-muted-foreground">Click Rate</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">
                          {automation.stats.sent > 0 ? Math.round((automation.stats.converted / automation.stats.sent) * 100) : 0}%
                        </div>
                        <div className="text-sm text-muted-foreground">Conversion</div>
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
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{template.name}</CardTitle>
                      <CardDescription>{template.subject}</CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <Badge variant="outline">{template.category}</Badge>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-sm">Variables:</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {template.variables.map((variable, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
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

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Total Emails Sent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {automations.reduce((sum, auto) => sum + auto.stats.sent, 0)}
                </div>
                <p className="text-sm text-muted-foreground">This month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Average Open Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(
                    automations.reduce((sum, auto) => {
                      return sum + (auto.stats.sent > 0 ? (auto.stats.opened / auto.stats.sent) : 0);
                    }, 0) / automations.length * 100
                  )}%
                </div>
                <p className="text-sm text-muted-foreground">Across all campaigns</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Click Through Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(
                    automations.reduce((sum, auto) => {
                      return sum + (auto.stats.sent > 0 ? (auto.stats.clicked / auto.stats.sent) : 0);
                    }, 0) / automations.length * 100
                  )}%
                </div>
                <p className="text-sm text-muted-foreground">Average CTR</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Conversions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {automations.reduce((sum, auto) => sum + auto.stats.converted, 0)}
                </div>
                <p className="text-sm text-muted-foreground">Total conversions</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance by Automation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {automations.map((automation) => (
                  <div key={automation.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{automation.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {automation.stats.sent} emails sent
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Open Rate</span>
                          <span>{automation.stats.sent > 0 ? Math.round((automation.stats.opened / automation.stats.sent) * 100) : 0}%</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${automation.stats.sent > 0 ? (automation.stats.opened / automation.stats.sent) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Click Rate</span>
                          <span>{automation.stats.sent > 0 ? Math.round((automation.stats.clicked / automation.stats.sent) * 100) : 0}%</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${automation.stats.sent > 0 ? (automation.stats.clicked / automation.stats.sent) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Conversion</span>
                          <span>{automation.stats.sent > 0 ? Math.round((automation.stats.converted / automation.stats.sent) * 100) : 0}%</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${automation.stats.sent > 0 ? (automation.stats.converted / automation.stats.sent) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
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

export default EnhancedEmailIntegration;