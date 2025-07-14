import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmailIntegrationSettings } from '@/components/email/EmailIntegrationSettings';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Plus, 
  Search, 
  Mail, 
  Send, 
  Users, 
  Eye,
  MousePointer,
  TrendingUp,
  Calendar,
  Edit,
  Settings
} from 'lucide-react';

export default function EmailMarketing() {
  const { userProfile } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("campaigns");
  const [loading, setLoading] = useState(true);
  
  // Real data states
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [lists, setLists] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState({
    totalCampaigns: 0,
    avgOpenRate: 0,
    avgClickRate: 0,
    totalSubscribers: 0
  });

  useEffect(() => {
    if (userProfile?.company_id) {
      loadEmailData();
    }
  }, [userProfile?.company_id]);

  const loadEmailData = async () => {
    if (!userProfile?.company_id) return;

    setLoading(true);
    try {
      // Load campaigns
      const { data: campaignData, error: campaignError } = await supabase
        .from('email_campaigns')
        .select(`
          *,
          email_lists!recipient_list_id(name, subscriber_count),
          email_integrations(provider_name)
        `)
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false });

      if (campaignError) throw campaignError;

      // Load templates
      const { data: templateData, error: templateError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('usage_count', { ascending: false });

      if (templateError) throw templateError;

      // Load email lists
      const { data: listData, error: listError } = await supabase
        .from('email_lists')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (listError) throw listError;

      setCampaigns(campaignData || []);
      setTemplates(templateData || []);
      setLists(listData || []);

      // Calculate analytics
      const totalCampaigns = campaignData?.length || 0;
      const totalSubscribers = listData?.reduce((sum, list) => sum + (list.subscriber_count || 0), 0) || 0;
      
      const sentCampaigns = campaignData?.filter(c => c.status === 'sent') || [];
      const avgOpenRate = sentCampaigns.length > 0 
        ? sentCampaigns.reduce((sum, c) => sum + (c.total_opened / Math.max(c.total_sent, 1) * 100), 0) / sentCampaigns.length
        : 0;
      const avgClickRate = sentCampaigns.length > 0 
        ? sentCampaigns.reduce((sum, c) => sum + (c.total_clicked / Math.max(c.total_sent, 1) * 100), 0) / sentCampaigns.length
        : 0;

      setAnalytics({
        totalCampaigns,
        avgOpenRate: Math.round(avgOpenRate * 10) / 10,
        avgClickRate: Math.round(avgClickRate * 10) / 10,
        totalSubscribers
      });

    } catch (error) {
      console.error('Error loading email data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load email marketing data"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      sent: { variant: "default" as const, label: "Sent", icon: Send },
      draft: { variant: "outline" as const, label: "Draft", icon: Edit },
      scheduled: { variant: "secondary" as const, label: "Scheduled", icon: Calendar }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config?.icon || Mail;
    return (
      <Badge variant={config?.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config?.label || status}
      </Badge>
    );
  };

  return (
    <DashboardLayout title="Email Marketing">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Email Marketing</h1>
            <p className="text-muted-foreground">Create and manage email campaigns for clients and prospects</p>
          </div>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Campaign
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Email Campaign</DialogTitle>
                  <DialogDescription>
                    Create a new email marketing campaign
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="campaign-name">Campaign Name</Label>
                    <Input id="campaign-name" placeholder="Enter campaign name" />
                  </div>
                  <div>
                    <Label htmlFor="subject">Email Subject</Label>
                    <Input id="subject" placeholder="Enter email subject line" />
                  </div>
                  <div>
                    <Label htmlFor="list">Recipient List</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select recipient list" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active-clients">Active Clients (156)</SelectItem>
                        <SelectItem value="prospects">Prospects (89)</SelectItem>
                        <SelectItem value="vendors">Vendors & Suppliers (67)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="template">Template</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a template" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newsletter">Monthly Newsletter</SelectItem>
                        <SelectItem value="project-update">Project Update</SelectItem>
                        <SelectItem value="promotion">Service Promotion</SelectItem>
                        <SelectItem value="blank">Start from Blank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="content">Email Content</Label>
                    <Textarea 
                      id="content" 
                      placeholder="Write your email content here..."
                      rows={6}
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="lists">Email Lists</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
          </TabsList>

          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search campaigns, templates, or lists..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <TabsContent value="campaigns" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : campaigns.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-64">
                  <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Email Campaigns</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Create your first email campaign to start reaching your audience
                  </p>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Campaign
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {campaigns.map((campaign) => {
                  const openRate = campaign.total_sent > 0 
                    ? Math.round((campaign.total_opened / campaign.total_sent) * 100 * 10) / 10
                    : 0;
                  const clickRate = campaign.total_sent > 0 
                    ? Math.round((campaign.total_clicked / campaign.total_sent) * 100 * 10) / 10
                    : 0;
                  
                  return (
                    <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Mail className="h-5 w-5" />
                              {campaign.name}
                            </CardTitle>
                            <CardDescription>
                              {campaign.subject}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(campaign.status)}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium text-muted-foreground">Recipients</div>
                              <div className="font-semibold">{campaign.total_recipients || 0}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium text-muted-foreground">Open Rate</div>
                              <div>{openRate}%</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <MousePointer className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium text-muted-foreground">Click Rate</div>
                              <div>{clickRate}%</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium text-muted-foreground">
                                {campaign.status === 'sent' ? 'Sent' : campaign.status === 'scheduled' ? 'Scheduled' : 'Created'}
                              </div>
                              <div>
                                {campaign.status === 'sent' && campaign.sent_at && new Date(campaign.sent_at).toLocaleDateString()}
                                {campaign.status === 'scheduled' && campaign.scheduled_at && new Date(campaign.scheduled_at).toLocaleDateString()}
                                {campaign.status === 'draft' && new Date(campaign.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex justify-end gap-2">
                          {campaign.status === 'draft' && (
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          )}
                          <Button size="sm">
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : templates.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-64">
                  <Edit className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Email Templates</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Create email templates to streamline your campaigns
                  </p>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Template
                  </Button>
                </CardContent>
              </Card>
            ) : (
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
                            {template.category || template.template_type}
                          </CardDescription>
                        </div>
                        <Badge variant="outline">
                          Used {template.usage_count || 0} times
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-muted-foreground">
                          {template.last_used_at 
                            ? `Last used: ${new Date(template.last_used_at).toLocaleDateString()}`
                            : 'Never used'
                          }
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Template
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
            )}
          </TabsContent>

          <TabsContent value="lists" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : lists.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-64">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Email Lists</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Create email lists to organize your subscribers
                  </p>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create List
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {lists.map((list) => (
                  <Card key={list.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            {list.name}
                          </CardTitle>
                          <CardDescription>
                            {list.subscriber_count || 0} subscribers
                            {list.description && ` • ${list.description}`}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-muted-foreground">
                          Created: {new Date(list.created_at).toLocaleDateString()}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-2" />
                            Manage
                          </Button>
                          <Button size="sm">
                            View Subscribers
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalCampaigns}</div>
                  <div className="text-sm text-muted-foreground">All time</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Average Open Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.avgOpenRate}%</div>
                  <div className="text-sm text-muted-foreground">Across all campaigns</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Average Click Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.avgClickRate}%</div>
                  <div className="text-sm text-muted-foreground">Across all campaigns</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalSubscribers}</div>
                  <div className="text-sm text-muted-foreground">Across all lists</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-4">
            <EmailIntegrationSettings />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}