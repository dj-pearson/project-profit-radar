import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LoadingState } from '@/components/ui/loading-spinner';
import { ErrorBoundary, ErrorState, EmptyState } from '@/components/ui/error-boundary';
import { ResponsiveContainer, ResponsiveGrid } from '@/components/layout/ResponsiveContainer';
import { useLoadingState } from '@/hooks/useLoadingState';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Users, 
  Search,
  Filter,
  Plus,
  Phone,
  Mail,
  MapPin,
  Building2,
  DollarSign,
  Calendar,
  User,
  Edit,
  Trash2,
  FileText,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { LeadDetailView } from '@/components/crm/LeadDetailView';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company_name?: string;
  job_title?: string;
  project_name?: string;
  project_type?: string;
  project_description?: string;
  project_address?: string;
  project_city?: string;
  project_state?: string;
  project_zip?: string;
  estimated_budget?: number;
  budget_range?: string;
  desired_start_date?: string;
  desired_completion_date?: string;
  timeline_flexibility?: string;
  lead_source: string;
  lead_source_detail?: string;
  status: string;
  priority: string;
  assigned_to?: string;
  property_type?: string;
  permits_required?: boolean;
  hoa_approval_needed?: boolean;
  financing_secured?: boolean;
  financing_type?: string;
  site_accessible?: boolean;
  site_conditions?: string;
  decision_maker?: boolean;
  decision_timeline?: string;
  next_follow_up_date?: string;
  last_contact_date?: string;
  notes?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

const CRMLeads = () => {
  const { user, userProfile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showNewLeadDialog, setShowNewLeadDialog] = useState(false);
  const [newLead, setNewLead] = useState<Partial<Lead>>({
    status: 'new',
    priority: 'medium',
    lead_source: 'website',
    permits_required: false,
    hoa_approval_needed: false,
    financing_secured: false,
    site_accessible: true,
    decision_maker: false
  });
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  
  const { 
    data: leads, 
    loading: leadsLoading, 
    error: leadsError, 
    execute: loadLeads 
  } = useLoadingState<Lead[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    
    if (!loading && user && userProfile && !userProfile.company_id) {
      navigate('/setup');
    }
    
    if (!loading && user && userProfile) {
      loadLeads(loadLeadsData);
    }
  }, [user, userProfile, loading, navigate]);

  useEffect(() => {
    // Check if we're on the /new route and open the dialog
    if (location.pathname.includes('/new')) {
      setShowNewLeadDialog(true);
    }
  }, [location.pathname]);

  const loadLeadsData = async (): Promise<Lead[]> => {
    const { data, error } = await (supabase as any)
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  };

  const createLead = async () => {
    if (!userProfile?.company_id) {
      toast({
        title: "Error",
        description: "No company associated with your account.",
        variant: "destructive"
      });
      return;
    }

    if (!newLead.first_name || !newLead.last_name) {
      toast({
        title: "Validation Error",
        description: "First name and last name are required.",
        variant: "destructive"
      });
      return;
    }

    try {
      const leadData = {
        first_name: newLead.first_name!,
        last_name: newLead.last_name!,
        email: newLead.email,
        phone: newLead.phone,
        company_name: newLead.company_name,
        job_title: newLead.job_title,
        project_name: newLead.project_name,
        project_type: newLead.project_type,
        project_description: newLead.project_description,
        project_address: newLead.project_address,
        project_city: newLead.project_city,
        project_state: newLead.project_state,
        project_zip: newLead.project_zip,
        estimated_budget: newLead.estimated_budget,
        budget_range: newLead.budget_range,
        desired_start_date: newLead.desired_start_date,
        desired_completion_date: newLead.desired_completion_date,
        timeline_flexibility: newLead.timeline_flexibility,
        lead_source: newLead.lead_source!,
        lead_source_detail: newLead.lead_source_detail,
        status: newLead.status!,
        priority: newLead.priority!,
        assigned_to: newLead.assigned_to,
        property_type: newLead.property_type,
        permits_required: newLead.permits_required,
        hoa_approval_needed: newLead.hoa_approval_needed,
        financing_secured: newLead.financing_secured,
        financing_type: newLead.financing_type,
        site_accessible: newLead.site_accessible,
        site_conditions: newLead.site_conditions,
        decision_maker: newLead.decision_maker,
        decision_timeline: newLead.decision_timeline,
        next_follow_up_date: newLead.next_follow_up_date,
        last_contact_date: newLead.last_contact_date,
        notes: newLead.notes,
        tags: newLead.tags
      };

      const { error } = await supabase
        .from('leads')
        .insert([leadData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Lead created successfully!",
      });

      setShowNewLeadDialog(false);
      setNewLead({
        status: 'new',
        priority: 'medium',
        lead_source: 'website',
        permits_required: false,
        hoa_approval_needed: false,
        financing_secured: false,
        site_accessible: true,
        decision_maker: false
      });
      loadLeads(loadLeadsData);
    } catch (error) {
      console.error('Error creating lead:', error);
      toast({
        title: "Error",
        description: "Failed to create lead. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'new': return 'text-blue-600 border-blue-200';
      case 'contacted': return 'text-yellow-600 border-yellow-200';
      case 'qualified': return 'text-green-600 border-green-200';
      case 'proposal_sent': return 'text-purple-600 border-purple-200';
      case 'negotiating': return 'text-orange-600 border-orange-200';
      case 'won': return 'text-green-600 border-green-200';
      case 'lost': return 'text-red-600 border-red-200';
      default: return 'text-gray-600 border-gray-200';
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 border-red-200';
      case 'high': return 'text-orange-600 border-orange-200';
      case 'medium': return 'text-yellow-600 border-yellow-200';
      case 'low': return 'text-gray-600 border-gray-200';
      default: return 'text-gray-600 border-gray-200';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const updateLead = async (leadId: string, updates: Partial<Lead>) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', leadId);

      if (error) throw error;

      // Update local state
      loadLeads(loadLeadsData);
      
      toast({
        title: "Success",
        description: "Lead updated successfully!",
      });
    } catch (error) {
      console.error('Error updating lead:', error);
      toast({
        title: "Error",
        description: "Failed to update lead. Please try again.",
        variant: "destructive"
      });
    }
  };

  const filteredLeads = leads?.filter(lead => {
    const matchesSearch = searchTerm === '' || 
      `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.project_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesSource = sourceFilter === 'all' || lead.lead_source === sourceFilter;
    const matchesPriority = priorityFilter === 'all' || lead.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesSource && matchesPriority;
  }) || [];

  if (loading) {
    return <LoadingState message="Loading leads..." />;
  }

  if (!user) {
    return null;
  }

  // Show lead detail view if a lead is selected
  if (selectedLead) {
    return (
      <DashboardLayout title="Lead Details">
        <LeadDetailView 
          leadId={selectedLead} 
          onBack={() => setSelectedLead(null)}
          onUpdate={updateLead}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Leads Management">
            
            {/* Filters and Actions */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search leads by name, email, company, or project..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:w-40">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                        <SelectItem value="negotiating">Negotiating</SelectItem>
                        <SelectItem value="won">Won</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={sourceFilter} onValueChange={setSourceFilter}>
                      <SelectTrigger className="w-full sm:w-40">
                        <SelectValue placeholder="Source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sources</SelectItem>
                        <SelectItem value="referral">Referral</SelectItem>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="social_media">Social Media</SelectItem>
                        <SelectItem value="google_ads">Google Ads</SelectItem>
                        <SelectItem value="direct_mail">Direct Mail</SelectItem>
                        <SelectItem value="trade_show">Trade Show</SelectItem>
                        <SelectItem value="cold_call">Cold Call</SelectItem>
                        <SelectItem value="networking">Networking</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger className="w-full sm:w-40">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Dialog open={showNewLeadDialog} onOpenChange={setShowNewLeadDialog}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          New Lead
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Create New Lead</DialogTitle>
                          <DialogDescription>
                            Add a new construction lead to your pipeline.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="grid gap-6 py-4">
                          {/* Basic Information */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-medium">Contact Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="first_name">First Name *</Label>
                                <Input
                                  id="first_name"
                                  value={newLead.first_name || ''}
                                  onChange={(e) => setNewLead({...newLead, first_name: e.target.value})}
                                  placeholder="John"
                                />
                              </div>
                              <div>
                                <Label htmlFor="last_name">Last Name *</Label>
                                <Input
                                  id="last_name"
                                  value={newLead.last_name || ''}
                                  onChange={(e) => setNewLead({...newLead, last_name: e.target.value})}
                                  placeholder="Smith"
                                />
                              </div>
                              <div>
                                <Label htmlFor="email">Email</Label>
                                <Input
                                  id="email"
                                  type="email"
                                  value={newLead.email || ''}
                                  onChange={(e) => setNewLead({...newLead, email: e.target.value})}
                                  placeholder="john.smith@email.com"
                                />
                              </div>
                              <div>
                                <Label htmlFor="phone">Phone</Label>
                                <Input
                                  id="phone"
                                  value={newLead.phone || ''}
                                  onChange={(e) => setNewLead({...newLead, phone: e.target.value})}
                                  placeholder="(555) 123-4567"
                                />
                              </div>
                              <div>
                                <Label htmlFor="company_name">Company Name</Label>
                                <Input
                                  id="company_name"
                                  value={newLead.company_name || ''}
                                  onChange={(e) => setNewLead({...newLead, company_name: e.target.value})}
                                  placeholder="ABC Corporation"
                                />
                              </div>
                              <div>
                                <Label htmlFor="job_title">Job Title</Label>
                                <Input
                                  id="job_title"
                                  value={newLead.job_title || ''}
                                  onChange={(e) => setNewLead({...newLead, job_title: e.target.value})}
                                  placeholder="Property Manager"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Project Information */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-medium">Project Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="project_name">Project Name</Label>
                                <Input
                                  id="project_name"
                                  value={newLead.project_name || ''}
                                  onChange={(e) => setNewLead({...newLead, project_name: e.target.value})}
                                  placeholder="Kitchen Renovation"
                                />
                              </div>
                              <div>
                                <Label htmlFor="project_type">Project Type</Label>
                                <Select value={newLead.project_type || ''} onValueChange={(value) => setNewLead({...newLead, project_type: value})}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select project type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="residential_new">Residential New Construction</SelectItem>
                                    <SelectItem value="residential_renovation">Residential Renovation</SelectItem>
                                    <SelectItem value="commercial_new">Commercial New Construction</SelectItem>
                                    <SelectItem value="commercial_renovation">Commercial Renovation</SelectItem>
                                    <SelectItem value="industrial">Industrial</SelectItem>
                                    <SelectItem value="infrastructure">Infrastructure</SelectItem>
                                    <SelectItem value="specialty_trade">Specialty Trade</SelectItem>
                                    <SelectItem value="maintenance">Maintenance</SelectItem>
                                    <SelectItem value="emergency_repair">Emergency Repair</SelectItem>
                                    <SelectItem value="tenant_improvement">Tenant Improvement</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="md:col-span-2">
                                <Label htmlFor="project_description">Project Description</Label>
                                <Textarea
                                  id="project_description"
                                  value={newLead.project_description || ''}
                                  onChange={(e) => setNewLead({...newLead, project_description: e.target.value})}
                                  placeholder="Describe the project scope and requirements..."
                                  rows={3}
                                />
                              </div>
                              <div>
                                <Label htmlFor="estimated_budget">Estimated Budget ($)</Label>
                                <Input
                                  id="estimated_budget"
                                  type="number"
                                  value={newLead.estimated_budget || ''}
                                  onChange={(e) => setNewLead({...newLead, estimated_budget: Number(e.target.value)})}
                                  placeholder="50000"
                                />
                              </div>
                              <div>
                                <Label htmlFor="budget_range">Budget Range</Label>
                                <Select value={newLead.budget_range || ''} onValueChange={(value) => setNewLead({...newLead, budget_range: value})}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select budget range" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="under_10k">Under $10K</SelectItem>
                                    <SelectItem value="10k_25k">$10K - $25K</SelectItem>
                                    <SelectItem value="25k_50k">$25K - $50K</SelectItem>
                                    <SelectItem value="50k_100k">$50K - $100K</SelectItem>
                                    <SelectItem value="100k_250k">$100K - $250K</SelectItem>
                                    <SelectItem value="250k_500k">$250K - $500K</SelectItem>
                                    <SelectItem value="500k_1m">$500K - $1M</SelectItem>
                                    <SelectItem value="over_1m">Over $1M</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>

                          {/* Lead Classification */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-medium">Lead Classification</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <Label htmlFor="status">Status</Label>
                                <Select value={newLead.status || 'new'} onValueChange={(value) => setNewLead({...newLead, status: value})}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="new">New</SelectItem>
                                    <SelectItem value="contacted">Contacted</SelectItem>
                                    <SelectItem value="qualified">Qualified</SelectItem>
                                    <SelectItem value="follow_up">Follow Up</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="priority">Priority</Label>
                                <Select value={newLead.priority || 'medium'} onValueChange={(value) => setNewLead({...newLead, priority: value})}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="urgent">Urgent</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="lead_source">Lead Source</Label>
                                <Select value={newLead.lead_source || 'website'} onValueChange={(value) => setNewLead({...newLead, lead_source: value})}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="referral">Referral</SelectItem>
                                    <SelectItem value="website">Website</SelectItem>
                                    <SelectItem value="social_media">Social Media</SelectItem>
                                    <SelectItem value="google_ads">Google Ads</SelectItem>
                                    <SelectItem value="direct_mail">Direct Mail</SelectItem>
                                    <SelectItem value="trade_show">Trade Show</SelectItem>
                                    <SelectItem value="cold_call">Cold Call</SelectItem>
                                    <SelectItem value="networking">Networking</SelectItem>
                                    <SelectItem value="repeat_client">Repeat Client</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>

                          {/* Construction-Specific Fields */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-medium">Construction Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id="permits_required"
                                    checked={newLead.permits_required || false}
                                    onCheckedChange={(checked) => setNewLead({...newLead, permits_required: !!checked})}
                                  />
                                  <Label htmlFor="permits_required">Permits Required</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id="hoa_approval_needed"
                                    checked={newLead.hoa_approval_needed || false}
                                    onCheckedChange={(checked) => setNewLead({...newLead, hoa_approval_needed: !!checked})}
                                  />
                                  <Label htmlFor="hoa_approval_needed">HOA Approval Needed</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id="financing_secured"
                                    checked={newLead.financing_secured || false}
                                    onCheckedChange={(checked) => setNewLead({...newLead, financing_secured: !!checked})}
                                  />
                                  <Label htmlFor="financing_secured">Financing Secured</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id="site_accessible"
                                    checked={newLead.site_accessible || true}
                                    onCheckedChange={(checked) => setNewLead({...newLead, site_accessible: !!checked})}
                                  />
                                  <Label htmlFor="site_accessible">Site Accessible</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id="decision_maker"
                                    checked={newLead.decision_maker || false}
                                    onCheckedChange={(checked) => setNewLead({...newLead, decision_maker: !!checked})}
                                  />
                                  <Label htmlFor="decision_maker">Is Decision Maker</Label>
                                </div>
                              </div>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="financing_type">Financing Type</Label>
                                  <Select value={newLead.financing_type || ''} onValueChange={(value) => setNewLead({...newLead, financing_type: value})}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select financing type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="cash">Cash</SelectItem>
                                      <SelectItem value="construction_loan">Construction Loan</SelectItem>
                                      <SelectItem value="home_equity">Home Equity</SelectItem>
                                      <SelectItem value="personal_loan">Personal Loan</SelectItem>
                                      <SelectItem value="business_loan">Business Loan</SelectItem>
                                      <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label htmlFor="decision_timeline">Decision Timeline</Label>
                                  <Select value={newLead.decision_timeline || ''} onValueChange={(value) => setNewLead({...newLead, decision_timeline: value})}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="When will they decide?" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="immediate">Immediate (within 1 week)</SelectItem>
                                      <SelectItem value="1-3_months">1-3 months</SelectItem>
                                      <SelectItem value="3-6_months">3-6 months</SelectItem>
                                      <SelectItem value="6_months_plus">6+ months</SelectItem>
                                      <SelectItem value="unknown">Unknown</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Notes */}
                          <div>
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                              id="notes"
                              value={newLead.notes || ''}
                              onChange={(e) => setNewLead({...newLead, notes: e.target.value})}
                              placeholder="Additional notes about this lead..."
                              rows={3}
                            />
                          </div>
                        </div>

                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setShowNewLeadDialog(false)}>
                            Cancel
                          </Button>
                          <Button onClick={createLead}>
                            Create Lead
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Leads List */}
            <Card>
              <CardHeader>
                <CardTitle>Leads ({filteredLeads.length})</CardTitle>
                <CardDescription>
                  Manage your construction leads and track them through your sales pipeline.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ErrorBoundary>
                  {leadsLoading ? (
                    <LoadingState message="Loading leads..." />
                  ) : leadsError ? (
                    <ErrorState 
                      error={leadsError} 
                      onRetry={() => loadLeads(loadLeadsData)}
                    />
                  ) : !filteredLeads.length ? (
                    <EmptyState
                      icon={Users}
                      title="No leads found"
                      description={leads?.length ? "No leads match your current filters." : "Start building your sales pipeline by adding your first lead."}
                      action={leads?.length ? undefined : {
                        label: "Create First Lead",
                        onClick: () => setShowNewLeadDialog(true)
                      }}
                    />
                  ) : (
                    <div className="space-y-4">
                      {filteredLeads.map((lead) => (
                        <div key={lead.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setSelectedLead(lead.id)}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-3 mb-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-lg hover:text-primary">
                                    {lead.first_name} {lead.last_name}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {lead.job_title && `${lead.job_title} • `}
                                    {lead.company_name || 'Individual'}
                                  </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingLead(lead);
                                    }}
                                  >
                                    <Edit className="h-4 w-4 mr-1" />
                                    Edit
                                  </Button>
                                  <div className="flex flex-col items-end space-y-1">
                                    <div className="flex space-x-2">
                                       <Badge variant="outline" className={getStatusBadgeClass(lead.status)}>
                                         {lead.status.replace('_', ' ')}
                                       </Badge>
                                       <Badge variant="outline" className={getPriorityBadgeClass(lead.priority)}>
                                         {lead.priority}
                                       </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      Source: {lead.lead_source.replace('_', ' ')}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                                <div className="flex items-center space-x-2">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm truncate">{lead.email || 'No email'}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{lead.phone || 'No phone'}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Building2 className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm truncate">{lead.project_name || 'No project'}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">
                                    {lead.estimated_budget ? formatCurrency(lead.estimated_budget) : (lead.budget_range || 'Budget TBD')}
                                  </span>
                                </div>
                              </div>

                              {lead.project_description && (
                                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                  {lead.project_description}
                                </p>
                              )}

                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <div className="flex items-center space-x-4">
                                  <span>Created: {formatDate(lead.created_at)}</span>
                                  {lead.next_follow_up_date && (
                                    <span className="text-orange-600 font-medium">
                                      Follow-up: {formatDate(lead.next_follow_up_date)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2">
                                  {lead.decision_maker && (
                                    <Badge variant="secondary" className="text-xs">
                                      Decision Maker
                                    </Badge>
                                  )}
                                  {lead.financing_secured && (
                                    <Badge variant="secondary" className="text-xs">
                                      Financing Secured
                                    </Badge>
                                  )}
                                  {lead.permits_required && (
                                    <Badge variant="outline" className="text-xs">
                                      Permits Required
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ErrorBoundary>
              </CardContent>
            </Card>
    </DashboardLayout>
  );
};

export default CRMLeads;