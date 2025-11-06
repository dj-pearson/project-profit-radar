import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Download,
  Calendar,
  Mail,
  Phone,
  Building,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Filter,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { formatDistanceToNow } from 'date-fns';

interface Lead {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  phone?: string;
  lead_score: number;
  lead_status: 'new' | 'contacted' | 'qualified' | 'demo_scheduled' | 'converted' | 'lost';
  lead_source?: string;
  created_at: string;
  last_activity_at?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

interface DemoRequest {
  id: string;
  lead_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  demo_type: string;
  preferred_date?: string;
  preferred_time?: string;
  status: 'requested' | 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
  leads?: Lead;
}

interface SalesContact {
  id: string;
  lead_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  inquiry_type: string;
  budget_range?: string;
  timeline?: string;
  status: 'new' | 'in_progress' | 'resolved';
  created_at: string;
  leads?: Lead;
}

export const LeadManagement = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('leads');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [demoRequests, setDemoRequests] = useState<DemoRequest[]>([]);
  const [salesContacts, setSalesContacts] = useState<SalesContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadActivities, setLeadActivities] = useState<any[]>([]);

  // Check if user is admin
  useEffect(() => {
    if (!userProfile) return;
    if (userProfile.role !== 'root_admin' && userProfile.role !== 'admin') {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to access this page.',
        variant: 'destructive',
      });
      navigate('/dashboard');
    }
  }, [userProfile, navigate, toast]);

  // Load data
  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'leads') {
        const { data, error } = await supabase
          .from('leads')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100) as any;

        if (error) throw error;
        setLeads(data as any || []);
      } else if (activeTab === 'demos') {
        const { data, error } = await supabase
          .from('demo_requests')
          .select(`
            *,
            leads (*)
          `)
          .order('created_at', { ascending: false })
          .limit(100) as any;

        if (error) throw error;
        setDemoRequests(data as any || []);
      } else if (activeTab === 'sales') {
        const { data, error } = await supabase
          .from('sales_contact_requests')
          .select(`
            *,
            leads (*)
          `)
          .order('created_at', { ascending: false })
          .limit(100) as any;

        if (error) throw error;
        setSalesContacts(data as any || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Load lead activities when lead is selected
  const loadLeadActivities = async (leadId: string) => {
    try {
      const { data, error } = await supabase
        .from('lead_activities')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeadActivities(data || []);
    } catch (error) {
      console.error('Failed to load lead activities:', error);
    }
  };

  // Update lead status
  const updateLeadStatus = async (leadId: string, status: Lead['lead_status']) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ lead_status: status })
        .eq('id', leadId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Lead status updated successfully.',
      });

      loadData();
    } catch (error) {
      console.error('Failed to update lead status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update lead status.',
        variant: 'destructive',
      });
    }
  };

  // Update demo request status
  const updateDemoStatus = async (demoId: string, status: DemoRequest['status']) => {
    try {
      const { error } = await supabase
        .from('demo_requests')
        .update({ status })
        .eq('id', demoId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Demo request status updated successfully.',
      });

      loadData();
    } catch (error) {
      console.error('Failed to update demo status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update demo status.',
        variant: 'destructive',
      });
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    let data: any[] = [];
    let headers: string[] = [];

    if (activeTab === 'leads') {
      headers = ['Email', 'Name', 'Company', 'Score', 'Status', 'Source', 'Created'];
      data = filteredLeads.map(lead => [
        lead.email,
        `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
        lead.company_name || '',
        lead.lead_score,
        lead.lead_status,
        lead.lead_source || '',
        new Date(lead.created_at).toLocaleDateString(),
      ]);
    } else if (activeTab === 'demos') {
      headers = ['Email', 'Name', 'Company', 'Demo Type', 'Preferred Date', 'Status', 'Created'];
      data = filteredDemos.map(demo => [
        demo.email,
        `${demo.first_name || ''} ${demo.last_name || ''}`.trim(),
        demo.company_name || '',
        demo.demo_type,
        demo.preferred_date || '',
        demo.status,
        new Date(demo.created_at).toLocaleDateString(),
      ]);
    } else if (activeTab === 'sales') {
      headers = ['Email', 'Name', 'Company', 'Inquiry Type', 'Budget', 'Timeline', 'Status', 'Created'];
      data = filteredSalesContacts.map(contact => [
        contact.email,
        `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
        contact.company_name || '',
        contact.inquiry_type,
        contact.budget_range || '',
        contact.timeline || '',
        contact.status,
        new Date(contact.created_at).toLocaleDateString(),
      ]);
    }

    const csvContent = [
      headers.join(','),
      ...data.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Success',
      description: 'Data exported successfully.',
    });
  };

  // Filter data
  const filteredLeads = leads.filter(lead => {
    const matchesSearch =
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.company_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || lead.lead_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const filteredDemos = demoRequests.filter(demo => {
    const matchesSearch =
      demo.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      demo.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      demo.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      demo.company_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || demo.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const filteredSalesContacts = salesContacts.filter(contact => {
    const matchesSearch =
      contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.company_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || contact.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Get lead score badge color
  const getLeadScoreBadge = (score: number) => {
    if (score >= 70) return <Badge className="bg-green-500">Hot ({score})</Badge>;
    if (score >= 40) return <Badge className="bg-yellow-500">Warm ({score})</Badge>;
    return <Badge variant="secondary">Cold ({score})</Badge>;
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: any }> = {
      new: { color: 'bg-blue-500', icon: AlertCircle },
      contacted: { color: 'bg-purple-500', icon: Mail },
      qualified: { color: 'bg-green-500', icon: CheckCircle },
      demo_scheduled: { color: 'bg-orange-500', icon: Calendar },
      converted: { color: 'bg-green-600', icon: CheckCircle },
      lost: { color: 'bg-gray-500', icon: XCircle },
      requested: { color: 'bg-blue-500', icon: Clock },
      scheduled: { color: 'bg-orange-500', icon: Calendar },
      completed: { color: 'bg-green-500', icon: CheckCircle },
      cancelled: { color: 'bg-red-500', icon: XCircle },
      in_progress: { color: 'bg-yellow-500', icon: Clock },
      resolved: { color: 'bg-green-500', icon: CheckCircle },
    };

    const config = statusConfig[status] || { color: 'bg-gray-500', icon: AlertCircle };
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <DashboardLayout title="Lead Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-construction-dark">Lead Management</h1>
            <p className="text-muted-foreground">Manage leads, demos, and sales inquiries</p>
          </div>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by email, name, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {activeTab === 'leads' && (
                    <>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="demo_scheduled">Demo Scheduled</SelectItem>
                      <SelectItem value="converted">Converted</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </>
                  )}
                  {activeTab === 'demos' && (
                    <>
                      <SelectItem value="requested">Requested</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </>
                  )}
                  {activeTab === 'sales' && (
                    <>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="leads">
              Leads ({leads.length})
            </TabsTrigger>
            <TabsTrigger value="demos">
              Demo Requests ({demoRequests.length})
            </TabsTrigger>
            <TabsTrigger value="sales">
              Sales Contacts ({salesContacts.length})
            </TabsTrigger>
          </TabsList>

          {/* Leads Table */}
          <TabsContent value="leads">
            <Card>
              <CardHeader>
                <CardTitle>All Leads</CardTitle>
                <CardDescription>
                  Showing {filteredLeads.length} of {leads.length} leads
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : filteredLeads.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No leads found
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Contact</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLeads.map((lead) => (
                          <TableRow key={lead.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {lead.first_name} {lead.last_name}
                                </span>
                                <span className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {lead.email}
                                </span>
                                {lead.phone && (
                                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {lead.phone}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {lead.company_name && (
                                <span className="flex items-center gap-1">
                                  <Building className="w-3 h-3" />
                                  {lead.company_name}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>{getLeadScoreBadge(lead.lead_score)}</TableCell>
                            <TableCell>{getStatusBadge(lead.lead_status)}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {lead.lead_source && (
                                  <div>{lead.lead_source}</div>
                                )}
                                {lead.utm_source && (
                                  <div className="text-xs text-muted-foreground">
                                    {lead.utm_source}/{lead.utm_medium}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedLead(lead);
                                  loadLeadActivities(lead.id);
                                }}
                              >
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Demo Requests Table */}
          <TabsContent value="demos">
            <Card>
              <CardHeader>
                <CardTitle>Demo Requests</CardTitle>
                <CardDescription>
                  Showing {filteredDemos.length} of {demoRequests.length} demo requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : filteredDemos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No demo requests found
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Contact</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Demo Type</TableHead>
                          <TableHead>Preferred Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDemos.map((demo) => (
                          <TableRow key={demo.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {demo.first_name} {demo.last_name}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {demo.email}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>{demo.company_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{demo.demo_type}</Badge>
                            </TableCell>
                            <TableCell>
                              {demo.preferred_date && (
                                <div className="text-sm">
                                  <div>{demo.preferred_date}</div>
                                  {demo.preferred_time && (
                                    <div className="text-xs text-muted-foreground">
                                      {demo.preferred_time}
                                    </div>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>{getStatusBadge(demo.status)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(demo.created_at), { addSuffix: true })}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={demo.status}
                                onValueChange={(value) => updateDemoStatus(demo.id, value as DemoRequest['status'])}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="requested">Requested</SelectItem>
                                  <SelectItem value="scheduled">Scheduled</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sales Contacts Table */}
          <TabsContent value="sales">
            <Card>
              <CardHeader>
                <CardTitle>Sales Contact Requests</CardTitle>
                <CardDescription>
                  Showing {filteredSalesContacts.length} of {salesContacts.length} sales contacts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : filteredSalesContacts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No sales contacts found
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Contact</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Inquiry Type</TableHead>
                          <TableHead>Budget</TableHead>
                          <TableHead>Timeline</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSalesContacts.map((contact) => (
                          <TableRow key={contact.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {contact.first_name} {contact.last_name}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {contact.email}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>{contact.company_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{contact.inquiry_type}</Badge>
                            </TableCell>
                            <TableCell>{contact.budget_range}</TableCell>
                            <TableCell>{contact.timeline}</TableCell>
                            <TableCell>{getStatusBadge(contact.status)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(contact.created_at), { addSuffix: true })}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={contact.status}
                                onValueChange={async (value) => {
                                  try {
                                    await supabase
                                      .from('sales_contact_requests')
                                      .update({ status: value })
                                      .eq('id', contact.id);
                                    loadData();
                                    toast({ title: 'Status updated successfully' });
                                  } catch (error) {
                                    toast({
                                      title: 'Error',
                                      description: 'Failed to update status',
                                      variant: 'destructive',
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="new">New</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="resolved">Resolved</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Lead Detail Modal */}
        <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Lead Details</DialogTitle>
              <DialogDescription>
                View lead information and activity history
              </DialogDescription>
            </DialogHeader>

            {selectedLead && (
              <div className="space-y-6">
                {/* Contact Info */}
                <div>
                  <h3 className="font-semibold mb-3">Contact Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Name</span>
                      <p className="font-medium">
                        {selectedLead.first_name} {selectedLead.last_name}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Email</span>
                      <p className="font-medium">{selectedLead.email}</p>
                    </div>
                    {selectedLead.phone && (
                      <div>
                        <span className="text-sm text-muted-foreground">Phone</span>
                        <p className="font-medium">{selectedLead.phone}</p>
                      </div>
                    )}
                    {selectedLead.company_name && (
                      <div>
                        <span className="text-sm text-muted-foreground">Company</span>
                        <p className="font-medium">{selectedLead.company_name}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lead Score & Status */}
                <div>
                  <h3 className="font-semibold mb-3">Lead Qualification</h3>
                  <div className="flex gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Score</span>
                      <div className="mt-1">{getLeadScoreBadge(selectedLead.lead_score)}</div>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Status</span>
                      <div className="mt-1">
                        <Select
                          value={selectedLead.lead_status}
                          onValueChange={(value) => updateLeadStatus(selectedLead.id, value as Lead['lead_status'])}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="qualified">Qualified</SelectItem>
                            <SelectItem value="demo_scheduled">Demo Scheduled</SelectItem>
                            <SelectItem value="converted">Converted</SelectItem>
                            <SelectItem value="lost">Lost</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attribution */}
                {(selectedLead.utm_source || selectedLead.lead_source) && (
                  <div>
                    <h3 className="font-semibold mb-3">Attribution</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedLead.lead_source && (
                        <div>
                          <span className="text-sm text-muted-foreground">Lead Source</span>
                          <p className="font-medium">{selectedLead.lead_source}</p>
                        </div>
                      )}
                      {selectedLead.utm_source && (
                        <>
                          <div>
                            <span className="text-sm text-muted-foreground">UTM Source</span>
                            <p className="font-medium">{selectedLead.utm_source}</p>
                          </div>
                          {selectedLead.utm_medium && (
                            <div>
                              <span className="text-sm text-muted-foreground">UTM Medium</span>
                              <p className="font-medium">{selectedLead.utm_medium}</p>
                            </div>
                          )}
                          {selectedLead.utm_campaign && (
                            <div>
                              <span className="text-sm text-muted-foreground">UTM Campaign</span>
                              <p className="font-medium">{selectedLead.utm_campaign}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Activity History */}
                <div>
                  <h3 className="font-semibold mb-3">Activity History</h3>
                  {leadActivities.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No activities recorded</p>
                  ) : (
                    <div className="space-y-3">
                      {leadActivities.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <TrendingUp className="w-4 h-4 mt-1 text-construction-orange" />
                          <div className="flex-1">
                            <p className="font-medium">{activity.activity_type.replace('_', ' ')}</p>
                            {activity.activity_metadata && (
                              <p className="text-sm text-muted-foreground">
                                {JSON.stringify(activity.activity_metadata)}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default LeadManagement;
