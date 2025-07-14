import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
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
  HelpCircle, 
  MessageSquare, 
  Phone, 
  Mail,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Calendar
} from 'lucide-react';

export default function Support() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTab, setSelectedTab] = useState("tickets");

  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load support tickets"
      });
    } finally {
      setLoading(false);
    }
  };

  const knowledgeBase = [
    {
      id: "1",
      title: "Getting Started with BuildDesk",
      category: "Getting Started",
      views: 1250,
      helpful_votes: 95,
      last_updated: "2024-04-05"
    },
    {
      id: "2",
      title: "QuickBooks Integration Setup Guide",
      category: "Integrations",
      views: 890,
      helpful_votes: 78,
      last_updated: "2024-04-03"
    },
    {
      id: "3",
      title: "Mobile App User Guide",
      category: "Mobile",
      views: 675,
      helpful_votes: 62,
      last_updated: "2024-04-01"
    },
    {
      id: "4",
      title: "Troubleshooting Common Issues",
      category: "Troubleshooting",
      views: 1100,
      helpful_votes: 88,
      last_updated: "2024-03-28"
    }
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      open: { variant: "destructive" as const, label: "Open", icon: AlertTriangle },
      in_progress: { variant: "secondary" as const, label: "In Progress", icon: Clock },
      resolved: { variant: "default" as const, label: "Resolved", icon: CheckCircle },
      closed: { variant: "outline" as const, label: "Closed", icon: CheckCircle }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config?.icon || Clock;
    return (
      <Badge variant={config?.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config?.label || status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { variant: "outline" as const, label: "Low" },
      medium: { variant: "secondary" as const, label: "Medium" },
      high: { variant: "destructive" as const, label: "High" },
      critical: { variant: "destructive" as const, label: "Critical" }
    };
    
    const config = priorityConfig[priority as keyof typeof priorityConfig];
    return <Badge variant={config?.variant}>{config?.label || priority}</Badge>;
  };

  return (
    <DashboardLayout title="Support Center">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Support Center</h1>
            <p className="text-muted-foreground">Manage customer support tickets and help resources</p>
          </div>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Ticket
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Support Ticket</DialogTitle>
                  <DialogDescription>
                    Create a new customer support ticket
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customer-name">Customer Name</Label>
                      <Input id="customer-name" placeholder="Enter customer name" />
                    </div>
                    <div>
                      <Label htmlFor="customer-email">Customer Email</Label>
                      <Input id="customer-email" type="email" placeholder="customer@email.com" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="title">Issue Title</Label>
                    <Input id="title" placeholder="Brief description of the issue" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General Support</SelectItem>
                          <SelectItem value="technical">Technical Issue</SelectItem>
                          <SelectItem value="billing">Billing</SelectItem>
                          <SelectItem value="integration">Integration</SelectItem>
                          <SelectItem value="mobile">Mobile App</SelectItem>
                          <SelectItem value="reporting">Reporting</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea 
                      id="description" 
                      placeholder="Detailed description of the issue..."
                      rows={4}
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
            <TabsTrigger value="tickets">Support Tickets</TabsTrigger>
            <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
            <TabsTrigger value="contact">Contact Options</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tickets, knowledge base, or customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <TabsContent value="tickets" className="space-y-4">
            {loading ? (
              <div className="text-center py-8">Loading tickets...</div>
            ) : (
              <div className="grid gap-4">
                {tickets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No support tickets found
                  </div>
                ) : (
                  tickets.map((ticket) => (
                    <Card key={ticket.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <MessageSquare className="h-5 w-5" />
                              {ticket.subject}
                            </CardTitle>
                            <CardDescription>
                              {ticket.ticket_number} • {ticket.description}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            {getPriorityBadge(ticket.priority)}
                            {getStatusBadge(ticket.status)}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium text-muted-foreground">Customer</div>
                              <div>{ticket.customer_name}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium text-muted-foreground">Email</div>
                              <div className="truncate">{ticket.customer_email}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium text-muted-foreground">Created</div>
                              <div>{new Date(ticket.created_at).toLocaleDateString()}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium text-muted-foreground">Last Update</div>
                              <div>{new Date(ticket.updated_at).toLocaleDateString()}</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div className="text-sm">
                            <span className="font-medium">Source: </span>
                            <span className="capitalize">{ticket.source}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Reply
                            </Button>
                            <Button size="sm">
                              View Details
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="knowledge" className="space-y-4">
            <div className="grid gap-4">
              {knowledgeBase.map((article) => (
                <Card key={article.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <HelpCircle className="h-5 w-5" />
                          {article.title}
                        </CardTitle>
                        <CardDescription>
                          {article.category}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">
                        {article.views} views
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-muted-foreground">
                        {article.helpful_votes} helpful votes • Last updated {new Date(article.last_updated).toLocaleDateString()}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          Edit Article
                        </Button>
                        <Button size="sm">
                          View Article
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="contact" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="text-center">
                <CardHeader>
                  <Mail className="h-12 w-12 mx-auto text-primary" />
                  <CardTitle>Email Support</CardTitle>
                  <CardDescription>Get help via email</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">support@build-desk.com</p>
                    <p className="text-xs text-muted-foreground">Response within 24 hours</p>
                    <Button 
                      className="w-full"
                      onClick={() => window.open('mailto:support@build-desk.com', '_blank')}
                    >
                      Send Email
                    </Button>
                  </div>
                </CardContent>
              </Card>


              <Card className="text-center">
                <CardHeader>
                  <MessageSquare className="h-12 w-12 mx-auto text-primary" />
                  <CardTitle>Live Chat</CardTitle>
                  <CardDescription>Chat with support</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Available Now</p>
                    <p className="text-xs text-muted-foreground">Click the chat icon in bottom right</p>
                    <Button 
                      className="w-full"
                      onClick={() => {
                        // This will activate the chat widget in the bottom right
                        const chatButton = document.querySelector('[data-chat-trigger]') as HTMLElement;
                        if (chatButton) {
                          chatButton.click();
                        } else {
                          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                        }
                      }}
                    >
                      Start Chat
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">8</div>
                  <div className="text-sm text-muted-foreground">Requires attention</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Average Response Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">4.2h</div>
                  <div className="text-sm text-green-600">-25% from last month</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">94%</div>
                  <div className="text-sm text-green-600">+3% from last month</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Customer Satisfaction</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">4.8/5</div>
                  <div className="text-sm text-muted-foreground">Based on 156 ratings</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}