import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Mail, Users, TrendingUp, Clock, Send, Plus, Edit, Trash2, Target } from "lucide-react";

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  content: string;
  audience: string;
  status: "draft" | "scheduled" | "sent" | "paused";
  scheduledDate?: Date;
  stats: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
  };
}

const mockCampaigns: EmailCampaign[] = [
  {
    id: "1",
    name: "Welcome Series - New Leads",
    subject: "Welcome to BuildDesk - Your Construction Management Solution",
    content: "Thank you for your interest in BuildDesk...",
    audience: "New Leads",
    status: "sent",
    stats: { sent: 1250, delivered: 1225, opened: 588, clicked: 94 }
  },
  {
    id: "2",
    name: "Project Update Newsletter",
    subject: "Monthly Construction Industry Insights",
    content: "This month's construction trends and updates...",
    audience: "All Customers",
    status: "scheduled",
    scheduledDate: new Date("2024-01-20T10:00:00"),
    stats: { sent: 0, delivered: 0, opened: 0, clicked: 0 }
  }
];

const audienceSegments = [
  { id: "new-leads", name: "New Leads", count: 245 },
  { id: "qualified-leads", name: "Qualified Leads", count: 156 },
  { id: "customers", name: "All Customers", count: 1240 },
  { id: "trial-users", name: "Trial Users", count: 89 },
  { id: "inactive-users", name: "Inactive Users", count: 67 }
];

const emailTemplates = [
  { id: "welcome", name: "Welcome Email", category: "Onboarding" },
  { id: "newsletter", name: "Monthly Newsletter", category: "Engagement" },
  { id: "promotion", name: "Feature Announcement", category: "Product" },
  { id: "nurture", name: "Lead Nurturing", category: "Sales" },
  { id: "reactivation", name: "Re-engagement", category: "Retention" }
];

export const EmailMarketingCampaigns = () => {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>(mockCampaigns);
  const [isCreating, setIsCreating] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    subject: "",
    content: "",
    audience: "",
    template: "",
    sendImmediately: false
  });

  const handleCreateCampaign = () => {
    const campaign: EmailCampaign = {
      id: Date.now().toString(),
      name: newCampaign.name,
      subject: newCampaign.subject,
      content: newCampaign.content,
      audience: newCampaign.audience,
      status: newCampaign.sendImmediately ? "sent" : "draft",
      stats: { sent: 0, delivered: 0, opened: 0, clicked: 0 }
    };
    
    setCampaigns([...campaigns, campaign]);
    setNewCampaign({
      name: "",
      subject: "",
      content: "",
      audience: "",
      template: "",
      sendImmediately: false
    });
    setIsCreating(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent": return "bg-success text-success-foreground";
      case "scheduled": return "bg-warning text-warning-foreground";
      case "paused": return "bg-muted text-muted-foreground";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  const calculateOpenRate = (campaign: EmailCampaign) => {
    return campaign.stats.sent > 0 ? ((campaign.stats.opened / campaign.stats.sent) * 100).toFixed(1) : "0";
  };

  const calculateClickRate = (campaign: EmailCampaign) => {
    return campaign.stats.sent > 0 ? ((campaign.stats.clicked / campaign.stats.sent) * 100).toFixed(1) : "0";
  };

  return (
    <div className="space-y-6">
      {/* Email Marketing Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">
                  {campaigns.reduce((sum, c) => sum + c.stats.sent, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Emails Sent</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <div>
                <div className="text-2xl font-bold">
                  {campaigns.length > 0 ? 
                    (campaigns.reduce((sum, c) => sum + parseFloat(calculateOpenRate(c)), 0) / campaigns.length).toFixed(1)
                    : "0"}%
                </div>
                <div className="text-sm text-muted-foreground">Avg Open Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">
                  {campaigns.length > 0 ? 
                    (campaigns.reduce((sum, c) => sum + parseFloat(calculateClickRate(c)), 0) / campaigns.length).toFixed(1)
                    : "0"}%
                </div>
                <div className="text-sm text-muted-foreground">Avg Click Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">
                  {audienceSegments.reduce((sum, s) => sum + s.count, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Subscribers</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="campaigns" className="w-full">
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="create">Create Campaign</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="audiences">Audiences</TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Email Campaigns</h3>
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </div>
          
          {campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-semibold">{campaign.name}</h4>
                    <p className="text-sm text-muted-foreground">{campaign.subject}</p>
                    <Badge className={`mt-2 ${getStatusColor(campaign.status)}`}>
                      {campaign.status}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{campaign.stats.sent}</div>
                    <div className="text-xs text-muted-foreground">Sent</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{calculateOpenRate(campaign)}%</div>
                    <div className="text-xs text-muted-foreground">Open Rate</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{calculateClickRate(campaign)}%</div>
                    <div className="text-xs text-muted-foreground">Click Rate</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{campaign.stats.delivered}</div>
                    <div className="text-xs text-muted-foreground">Delivered</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Create Campaign Tab */}
        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create New Email Campaign</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Campaign Name</label>
                  <Input
                    placeholder="e.g., Monthly Newsletter"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Template</label>
                  <Select value={newCampaign.template} onValueChange={(value) => setNewCampaign({ ...newCampaign, template: value })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choose a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {emailTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} - {template.category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Subject Line</label>
                <Input
                  placeholder="Enter email subject"
                  value={newCampaign.subject}
                  onChange={(e) => setNewCampaign({ ...newCampaign, subject: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Email Content</label>
                <Textarea
                  placeholder="Write your email content here..."
                  value={newCampaign.content}
                  onChange={(e) => setNewCampaign({ ...newCampaign, content: e.target.value })}
                  className="mt-1"
                  rows={8}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Audience</label>
                <Select value={newCampaign.audience} onValueChange={(value) => setNewCampaign({ ...newCampaign, audience: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select audience" />
                  </SelectTrigger>
                  <SelectContent>
                    {audienceSegments.map((segment) => (
                      <SelectItem key={segment.id} value={segment.name}>
                        {segment.name} ({segment.count} contacts)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={newCampaign.sendImmediately}
                  onCheckedChange={(checked) => setNewCampaign({ ...newCampaign, sendImmediately: checked })}
                />
                <label className="text-sm">Send immediately</label>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleCreateCampaign}
                  disabled={!newCampaign.name || !newCampaign.subject || !newCampaign.content || !newCampaign.audience}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {newCampaign.sendImmediately ? "Send Now" : "Save Draft"}
                </Button>
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {emailTemplates.map((template) => (
              <Card key={template.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{template.name}</h4>
                      <Badge variant="secondary" className="mt-1">{template.category}</Badge>
                    </div>
                    <Button size="sm" variant="outline">Use Template</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Audiences Tab */}
        <TabsContent value="audiences" className="space-y-4">
          <div className="space-y-4">
            {audienceSegments.map((segment) => (
              <Card key={segment.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold">{segment.name}</h4>
                      <p className="text-sm text-muted-foreground">{segment.count} contacts</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">View</Button>
                      <Button size="sm" variant="outline">Export</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};