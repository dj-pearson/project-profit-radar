import React, { useState } from 'react';
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
  Edit
} from 'lucide-react';

export default function EmailMarketing() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("campaigns");

  // Mock data
  const campaigns = [
    {
      id: "1",
      name: "Spring Construction Services",
      subject: "Get Ready for Spring Construction Projects",
      status: "sent",
      sent_date: "2024-04-08",
      recipients: 245,
      open_rate: 32.5,
      click_rate: 8.2,
      replies: 5
    },
    {
      id: "2",
      name: "Monthly Newsletter - April",
      subject: "BuildDesk April Newsletter - Project Updates & Tips",
      status: "draft",
      created_date: "2024-04-10",
      recipients: 312,
      open_rate: 0,
      click_rate: 0,
      replies: 0
    },
    {
      id: "3",
      name: "Safety Training Reminder",
      subject: "Important: Upcoming Safety Training Sessions",
      status: "scheduled",
      scheduled_date: "2024-04-15",
      recipients: 89,
      open_rate: 0,
      click_rate: 0,
      replies: 0
    }
  ];

  const templates = [
    {
      id: "1",
      name: "Project Completion Notification",
      category: "Project Updates",
      last_used: "2024-03-25",
      usage_count: 15
    },
    {
      id: "2",
      name: "Quote Follow-up",
      category: "Sales",
      last_used: "2024-04-02",
      usage_count: 23
    },
    {
      id: "3",
      name: "Safety Reminder",
      category: "Safety",
      last_used: "2024-04-01",
      usage_count: 8
    }
  ];

  const lists = [
    {
      id: "1",
      name: "Active Clients",
      subscriber_count: 156,
      last_updated: "2024-04-09",
      source: "CRM Import"
    },
    {
      id: "2",
      name: "Prospects",
      subscriber_count: 89,
      last_updated: "2024-04-08",
      source: "Website Signup"
    },
    {
      id: "3",
      name: "Vendors & Suppliers",
      subscriber_count: 67,
      last_updated: "2024-04-05",
      source: "Manual Entry"
    }
  ];

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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="lists">Email Lists</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
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
            <div className="grid gap-4">
              {campaigns.map((campaign) => (
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
                          <div className="font-semibold">{campaign.recipients}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-muted-foreground">Open Rate</div>
                          <div>{campaign.open_rate}%</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <MousePointer className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-muted-foreground">Click Rate</div>
                          <div>{campaign.click_rate}%</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-muted-foreground">
                            {campaign.status === 'sent' ? 'Sent' : campaign.status === 'scheduled' ? 'Scheduled' : 'Created'}
                          </div>
                          <div>
                            {campaign.status === 'sent' && new Date(campaign.sent_date).toLocaleDateString()}
                            {campaign.status === 'scheduled' && new Date(campaign.scheduled_date).toLocaleDateString()}
                            {campaign.status === 'draft' && new Date(campaign.created_date).toLocaleDateString()}
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
              ))}
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
                          {template.category}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">
                        Used {template.usage_count} times
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-muted-foreground">
                        Last used: {new Date(template.last_used).toLocaleDateString()}
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
          </TabsContent>

          <TabsContent value="lists" className="space-y-4">
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
                          {list.subscriber_count} subscribers • Source: {list.source}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-muted-foreground">
                        Last updated: {new Date(list.last_updated).toLocaleDateString()}
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
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12</div>
                  <div className="text-sm text-muted-foreground">This month</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Average Open Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">28.3%</div>
                  <div className="flex items-center text-sm text-green-600">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    +5.2% vs last month
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Average Click Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">6.8%</div>
                  <div className="flex items-center text-sm text-green-600">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    +1.3% vs last month
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">312</div>
                  <div className="text-sm text-muted-foreground">Across all lists</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}