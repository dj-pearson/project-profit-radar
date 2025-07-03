import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Mail, 
  Users, 
  Send, 
  Calendar, 
  BarChart3, 
  Settings, 
  Plus,
  Eye,
  MousePointer,
  TrendingUp,
  Target
} from 'lucide-react';

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  content: string;
  status: 'draft' | 'scheduled' | 'sent' | 'active';
  type: 'newsletter' | 'promotional' | 'transactional' | 'onboarding';
  recipients_count: number;
  sent_count: number;
  open_rate: number;
  click_rate: number;
  scheduled_at?: string;
  created_at: string;
}

interface EmailList {
  id: string;
  name: string;
  description: string;
  subscribers_count: number;
  created_at: string;
  is_active: boolean;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: string;
  preview_image?: string;
}

const EmailMarketingIntegration = () => {
  const { userProfile } = useAuth();
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [emailLists, setEmailLists] = useState<EmailList[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('campaigns');

  // Campaign form states
  const [campaignName, setCampaignName] = useState('');
  const [campaignSubject, setCampaignSubject] = useState('');
  const [campaignContent, setCampaignContent] = useState('');
  const [campaignType, setCampaignType] = useState<string>('newsletter');
  const [selectedList, setSelectedList] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);

  // List form states
  const [listName, setListName] = useState('');
  const [listDescription, setListDescription] = useState('');

  useEffect(() => {
    loadEmailData();
  }, []);

  const loadEmailData = async () => {
    setLoading(true);
    try {
      // Mock data until we create the email marketing tables
      const mockCampaigns: EmailCampaign[] = [
        {
          id: '1',
          name: 'Monthly Construction Newsletter',
          subject: 'Latest Updates from BuildDesk',
          content: 'Welcome to our monthly newsletter...',
          status: 'sent',
          type: 'newsletter',
          recipients_count: 1250,
          sent_count: 1248,
          open_rate: 68.5,
          click_rate: 12.3,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          name: 'New Feature Announcement',
          subject: 'Introducing Advanced Project Analytics',
          content: 'We are excited to announce...',
          status: 'scheduled',
          type: 'promotional',
          recipients_count: 890,
          sent_count: 0,
          open_rate: 0,
          click_rate: 0,
          scheduled_at: new Date(Date.now() + 86400000).toISOString(),
          created_at: new Date().toISOString()
        }
      ];

      const mockLists: EmailList[] = [
        {
          id: '1',
          name: 'All Subscribers',
          description: 'All BuildDesk newsletter subscribers',
          subscribers_count: 1250,
          created_at: new Date().toISOString(),
          is_active: true
        },
        {
          id: '2',
          name: 'Premium Users',
          description: 'Users with premium subscriptions',
          subscribers_count: 450,
          created_at: new Date().toISOString(),
          is_active: true
        }
      ];

      const mockTemplates: EmailTemplate[] = [
        {
          id: '1',
          name: 'Newsletter Template',
          subject: 'BuildDesk Newsletter - {{month}} {{year}}',
          content: 'Professional newsletter template with header and footer',
          type: 'newsletter'
        },
        {
          id: '2',
          name: 'Feature Announcement',
          subject: 'New Feature: {{feature_name}}',
          content: 'Announce new features with screenshots and benefits',
          type: 'promotional'
        }
      ];

      setCampaigns(mockCampaigns);
      setEmailLists(mockLists);
      setTemplates(mockTemplates);
    } catch (error) {
      console.error('Error loading email data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async () => {
    if (!campaignName || !campaignSubject || !campaignContent || !selectedList) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields"
      });
      return;
    }

    try {
      const newCampaign: EmailCampaign = {
        id: Date.now().toString(),
        name: campaignName,
        subject: campaignSubject,
        content: campaignContent,
        status: isScheduled ? 'scheduled' : 'draft',
        type: campaignType as any,
        recipients_count: emailLists.find(l => l.id === selectedList)?.subscribers_count || 0,
        sent_count: 0,
        open_rate: 0,
        click_rate: 0,
        scheduled_at: isScheduled ? scheduledDate : undefined,
        created_at: new Date().toISOString()
      };

      setCampaigns([newCampaign, ...campaigns]);
      
      // Reset form
      setCampaignName('');
      setCampaignSubject('');
      setCampaignContent('');
      setSelectedList('');
      setScheduledDate('');
      setIsScheduled(false);

      toast({
        title: "Campaign Created",
        description: `Campaign "${newCampaign.name}" has been created successfully`
      });
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create campaign"
      });
    }
  };

  const createList = async () => {
    if (!listName || !listDescription) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields"
      });
      return;
    }

    try {
      const newList: EmailList = {
        id: Date.now().toString(),
        name: listName,
        description: listDescription,
        subscribers_count: 0,
        created_at: new Date().toISOString(),
        is_active: true
      };

      setEmailLists([newList, ...emailLists]);
      setListName('');
      setListDescription('');

      toast({
        title: "List Created",
        description: `Email list "${newList.name}" has been created successfully`
      });
    } catch (error) {
      console.error('Error creating list:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create email list"
      });
    }
  };

  const sendCampaign = async (campaignId: string) => {
    try {
      setCampaigns(campaigns.map(campaign => 
        campaign.id === campaignId 
          ? { ...campaign, status: 'sent' as const, sent_count: campaign.recipients_count }
          : campaign
      ));

      toast({
        title: "Campaign Sent",
        description: "Your email campaign has been sent successfully"
      });
    } catch (error) {
      console.error('Error sending campaign:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send campaign"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: 'secondary',
      scheduled: 'default',
      sent: 'secondary',
      active: 'default'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      newsletter: Mail,
      promotional: Target,
      transactional: Send,
      onboarding: Users
    };
    return icons[type as keyof typeof icons] || Mail;
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
        <h2 className="text-2xl font-semibold">Email Marketing</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="lists">Email Lists</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          {/* Create Campaign */}
          <Card>
            <CardHeader>
              <CardTitle>Create New Campaign</CardTitle>
              <CardDescription>Design and send email campaigns to your subscribers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="campaign-name">Campaign Name</Label>
                  <Input
                    id="campaign-name"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="Enter campaign name"
                  />
                </div>
                <div>
                  <Label htmlFor="campaign-type">Campaign Type</Label>
                  <Select value={campaignType} onValueChange={setCampaignType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newsletter">Newsletter</SelectItem>
                      <SelectItem value="promotional">Promotional</SelectItem>
                      <SelectItem value="transactional">Transactional</SelectItem>
                      <SelectItem value="onboarding">Onboarding</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="campaign-subject">Subject Line</Label>
                <Input
                  id="campaign-subject"
                  value={campaignSubject}
                  onChange={(e) => setCampaignSubject(e.target.value)}
                  placeholder="Enter email subject"
                />
              </div>

              <div>
                <Label htmlFor="campaign-content">Email Content</Label>
                <Textarea
                  id="campaign-content"
                  value={campaignContent}
                  onChange={(e) => setCampaignContent(e.target.value)}
                  placeholder="Write your email content here..."
                  rows={6}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email-list">Email List</Label>
                  <Select value={selectedList} onValueChange={setSelectedList}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select email list" />
                    </SelectTrigger>
                    <SelectContent>
                      {emailLists.map(list => (
                        <SelectItem key={list.id} value={list.id}>
                          {list.name} ({list.subscribers_count} subscribers)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Schedule Options</Label>
                  <div className="flex items-center space-x-2 mt-2">
                    <Switch
                      checked={isScheduled}
                      onCheckedChange={setIsScheduled}
                    />
                    <Label className="text-sm">Schedule for later</Label>
                  </div>
                  {isScheduled && (
                    <Input
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="mt-2"
                    />
                  )}
                </div>
              </div>

              <div className="flex space-x-2">
                <Button onClick={createCampaign}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </Button>
                <Button variant="outline">
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Campaigns List */}
          <div className="grid gap-4">
            {campaigns.map((campaign) => {
              const TypeIcon = getTypeIcon(campaign.type);
              return (
                <Card key={campaign.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <TypeIcon className="h-4 w-4" />
                        <CardTitle>{campaign.name}</CardTitle>
                        {getStatusBadge(campaign.status)}
                      </div>
                      <div className="flex space-x-2">
                        {campaign.status === 'draft' && (
                          <Button
                            size="sm"
                            onClick={() => sendCampaign(campaign.id)}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Send Now
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription>{campaign.subject}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold">{campaign.recipients_count}</div>
                        <div className="text-sm text-muted-foreground">Recipients</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{campaign.sent_count}</div>
                        <div className="text-sm text-muted-foreground">Sent</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{campaign.open_rate}%</div>
                        <div className="text-sm text-muted-foreground">Open Rate</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{campaign.click_rate}%</div>
                        <div className="text-sm text-muted-foreground">Click Rate</div>
                      </div>
                    </div>
                    {campaign.status === 'sent' && (
                      <div className="mt-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Delivery Progress</span>
                          <span>{campaign.sent_count}/{campaign.recipients_count}</span>
                        </div>
                        <Progress value={(campaign.sent_count / campaign.recipients_count) * 100} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="lists" className="space-y-4">
          {/* Create List */}
          <Card>
            <CardHeader>
              <CardTitle>Create Email List</CardTitle>
              <CardDescription>Organize your subscribers into targeted lists</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="list-name">List Name</Label>
                <Input
                  id="list-name"
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  placeholder="Enter list name"
                />
              </div>
              <div>
                <Label htmlFor="list-description">Description</Label>
                <Textarea
                  id="list-description"
                  value={listDescription}
                  onChange={(e) => setListDescription(e.target.value)}
                  placeholder="Describe this email list"
                  rows={3}
                />
              </div>
              <Button onClick={createList}>
                <Plus className="h-4 w-4 mr-2" />
                Create List
              </Button>
            </CardContent>
          </Card>

          {/* Email Lists */}
          <div className="grid gap-4">
            {emailLists.map((list) => (
              <Card key={list.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{list.name}</CardTitle>
                      <CardDescription>{list.description}</CardDescription>
                    </div>
                    <Badge variant={list.is_active ? "default" : "secondary"}>
                      {list.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-lg font-semibold">{list.subscribers_count}</span>
                      <span className="text-muted-foreground">subscribers</span>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Subscribers
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle>{template.name}</CardTitle>
                  <CardDescription>{template.subject}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">{template.content}</p>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button variant="outline" size="sm">
                      Use Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Subscribers</p>
                    <p className="text-2xl font-bold">1,250</p>
                  </div>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-center text-xs text-green-600 mt-2">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +12% from last month
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Average Open Rate</p>
                    <p className="text-2xl font-bold">68.5%</p>
                  </div>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-center text-xs text-green-600 mt-2">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +3.2% from last month
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Average Click Rate</p>
                    <p className="text-2xl font-bold">12.3%</p>
                  </div>
                  <MousePointer className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-center text-xs text-green-600 mt-2">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +1.8% from last month
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Campaigns Sent</p>
                    <p className="text-2xl font-bold">24</p>
                  </div>
                  <Send className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-center text-xs text-muted-foreground mt-2">
                  This month
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmailMarketingIntegration;