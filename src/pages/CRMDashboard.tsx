import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { KPICard } from '@/components/dashboard/KPICard';
import { LoadingState } from '@/components/ui/loading-spinner';
import { ErrorBoundary, ErrorState, EmptyState } from '@/components/ui/error-boundary';
import { KPISkeleton } from '@/components/ui/skeleton-loader';
import { ResponsiveContainer, ResponsiveGrid } from '@/components/layout/ResponsiveContainer';
import { useLoadingState } from '@/hooks/useLoadingState';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { mobileGridClasses, mobileFilterClasses, mobileButtonClasses, mobileTextClasses, mobileCardClasses } from '@/utils/mobileHelpers';
import { ContextualActions } from '@/components/navigation/ContextualActions';
import { usePlatform } from '@/contexts/PlatformContext';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Target,
  Phone,
  Mail,
  Calendar,
  Building2,
  UserPlus,
  CheckCircle,
  AlertCircle,
  Clock,
  BarChart3,
  Filter,
  Search,
  Plus,
  Edit,
  Save,
  X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LeadDetailView } from '@/components/crm/LeadDetailView';
import { PipelineKanban } from '@/components/crm/PipelineKanban';
import { ActivityStream } from '@/components/crm/ActivityStream';
import { LeadScoring } from '@/components/crm/LeadScoring';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company_name?: string;
  project_name?: string;
  project_type?: string;
  estimated_budget?: number;
  status: string;
  lead_source: string;
  priority: string;
  assigned_to?: string;
  next_follow_up_date?: string;
  created_at: string;
}

interface Opportunity {
  id: string;
  name: string;
  estimated_value: number;
  probability_percent: number;
  stage: string;
  expected_close_date?: string;
  account_manager?: string;
  project_type?: string;
  created_at: string;
}

interface CRMData {
  leads: Lead[];
  opportunities: Opportunity[];
  totalLeads: number;
  qualifiedLeads: number;
  totalOpportunities: number;
  totalPipelineValue: number;
  avgConversionRate: number;
  thisMonthNewLeads: number;
  followUpsDue: number;
}

// Lead Edit Dialog Component
interface LeadEditDialogProps {
  lead: Lead;
  onUpdate: (leadId: string, updates: Partial<Lead>) => void;
  children: React.ReactNode;
}

const LeadEditDialog: React.FC<LeadEditDialogProps> = ({ lead, onUpdate, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    first_name: lead.first_name,
    last_name: lead.last_name,
    email: lead.email,
    phone: lead.phone,
    company_name: lead.company_name || '',
    project_name: lead.project_name || '',
    project_type: lead.project_type || '',
    estimated_budget: lead.estimated_budget || 0,
    status: lead.status,
    priority: lead.priority,
    lead_source: lead.lead_source,
    next_follow_up_date: lead.next_follow_up_date || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(lead.id, formData);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Lead: {lead.first_name} {lead.last_name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project_name">Project Name</Label>
              <Input
                id="project_name"
                value={formData.project_name}
                onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project_type">Project Type</Label>
              <Select value={formData.project_type} onValueChange={(value) => setFormData({ ...formData, project_type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential_new">Residential New</SelectItem>
                  <SelectItem value="residential_remodel">Residential Remodel</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="industrial">Industrial</SelectItem>
                  <SelectItem value="civil">Civil</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimated_budget">Estimated Budget</Label>
              <Input
                id="estimated_budget"
                type="number"
                value={formData.estimated_budget}
                onChange={(e) => setFormData({ ...formData, estimated_budget: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                  <SelectItem value="negotiating">Negotiating</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
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
            <div className="space-y-2">
              <Label htmlFor="lead_source">Lead Source</Label>
              <Select value={formData.lead_source} onValueChange={(value) => setFormData({ ...formData, lead_source: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="social_media">Social Media</SelectItem>
                  <SelectItem value="google_ads">Google Ads</SelectItem>
                  <SelectItem value="direct_mail">Direct Mail</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="next_follow_up_date">Next Follow-up Date</Label>
            <Input
              id="next_follow_up_date"
              type="date"
              value={formData.next_follow_up_date}
              onChange={(e) => setFormData({ ...formData, next_follow_up_date: e.target.value })}
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" className="w-full sm:w-auto">
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Opportunity Edit Dialog Component
interface OpportunityEditDialogProps {
  opportunity: Opportunity;
  onUpdate: (opportunityId: string, updates: Partial<Opportunity>) => void;
  children: React.ReactNode;
}

const OpportunityEditDialog: React.FC<OpportunityEditDialogProps> = ({ opportunity, onUpdate, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: opportunity.name,
    estimated_value: opportunity.estimated_value,
    probability_percent: opportunity.probability_percent,
    stage: opportunity.stage,
    expected_close_date: opportunity.expected_close_date || '',
    account_manager: opportunity.account_manager || '',
    project_type: opportunity.project_type || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(opportunity.id, formData);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Opportunity: {opportunity.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Opportunity Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimated_value">Estimated Value</Label>
              <Input
                id="estimated_value"
                type="number"
                value={formData.estimated_value}
                onChange={(e) => setFormData({ ...formData, estimated_value: Number(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="probability_percent">Probability (%)</Label>
              <Input
                id="probability_percent"
                type="number"
                min="0"
                max="100"
                value={formData.probability_percent}
                onChange={(e) => setFormData({ ...formData, probability_percent: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stage">Stage</Label>
              <Select value={formData.stage} onValueChange={(value) => setFormData({ ...formData, stage: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospecting">Prospecting</SelectItem>
                  <SelectItem value="qualification">Qualification</SelectItem>
                  <SelectItem value="proposal">Proposal</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                  <SelectItem value="closed_won">Closed Won</SelectItem>
                  <SelectItem value="closed_lost">Closed Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project_type">Project Type</Label>
              <Select value={formData.project_type} onValueChange={(value) => setFormData({ ...formData, project_type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential_new">Residential New</SelectItem>
                  <SelectItem value="residential_remodel">Residential Remodel</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="industrial">Industrial</SelectItem>
                  <SelectItem value="civil">Civil</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expected_close_date">Expected Close Date</Label>
              <Input
                id="expected_close_date"
                type="date"
                value={formData.expected_close_date}
                onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account_manager">Account Manager</Label>
              <Input
                id="account_manager"
                value={formData.account_manager}
                onChange={(e) => setFormData({ ...formData, account_manager: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const CRMDashboard = () => {
  const { user, userProfile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setNavigationContext } = usePlatform();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'dashboard' | 'lead-detail'>('dashboard');

  const handleLeadClick = (leadId: string) => {
    setSelectedLeadId(leadId);
    setViewMode('lead-detail');
  };
  
  const { 
    data: crmData, 
    loading: crmLoading, 
    error: crmError, 
    execute: loadCRMData 
  } = useLoadingState<CRMData>({
    leads: [],
    opportunities: [],
    totalLeads: 0,
    qualifiedLeads: 0,
    totalOpportunities: 0,
    totalPipelineValue: 0,
    avgConversionRate: 0,
    thisMonthNewLeads: 0,
    followUpsDue: 0
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    
    if (!loading && user && userProfile && !userProfile.company_id) {
      navigate('/setup');
    }
    
    if (!loading && user && userProfile) {
      loadCRMData(loadCRMDashboardData);
    }
  }, [user, userProfile, loading, navigate]);

  const loadCRMDashboardData = async (): Promise<CRMData> => {
    if (!userProfile?.company_id) {
      throw new Error('No company associated with user');
    }

    const currentMonth = new Date();
    currentMonth.setDate(1);
    const today = new Date();

    try {
      // Load leads data
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          company_name,
          project_name,
          project_type,
          estimated_budget,
          status,
          lead_source,
          priority,
          assigned_to,
          next_follow_up_date,
          created_at
        `)
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false });

      if (leadsError) throw leadsError;

      // Load opportunities data
      const { data: opportunitiesData, error: opportunitiesError } = await supabase
        .from('opportunities')
        .select(`
          id,
          name,
          estimated_value,
          probability_percent,
          stage,
          expected_close_date,
          account_manager,
          project_type,
          created_at
        `)
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false });

      if (opportunitiesError) throw opportunitiesError;

      // Calculate metrics
      const leads = leadsData || [];
      const opportunities = opportunitiesData || [];
      
      const qualifiedLeads = leads.filter(lead => 
        ['qualified', 'proposal_sent', 'negotiating'].includes(lead.status)
      );
      
      const thisMonthNewLeads = leads.filter(lead => 
        new Date(lead.created_at) >= currentMonth
      );
      
      const followUpsDue = leads.filter(lead => 
        lead.next_follow_up_date && 
        new Date(lead.next_follow_up_date) <= today &&
        !['won', 'lost'].includes(lead.status)
      );
      
      const totalPipelineValue = opportunities.reduce(
        (sum, opp) => sum + (opp.estimated_value || 0), 0
      );
      
      // Calculate average conversion rate (simplified)
      const wonLeads = leads.filter(lead => lead.status === 'won');
      const avgConversionRate = leads.length > 0 ? (wonLeads.length / leads.length) * 100 : 0;

      return {
        leads,
        opportunities,
        totalLeads: leads.length,
        qualifiedLeads: qualifiedLeads.length,
        totalOpportunities: opportunities.length,
        totalPipelineValue,
        avgConversionRate,
        thisMonthNewLeads: thisMonthNewLeads.length,
        followUpsDue: followUpsDue.length
      };
    } catch (error) {
      console.error('Error loading CRM data:', error);
      throw error;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'blue';
      case 'contacted': return 'yellow';
      case 'qualified': return 'green';
      case 'proposal_sent': return 'purple';
      case 'negotiating': return 'orange';
      case 'won': return 'green';
      case 'lost': return 'red';
      default: return 'gray';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      case 'low': return 'gray';
      default: return 'gray';
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'prospecting': return 'blue';
      case 'qualification': return 'yellow';
      case 'proposal': return 'purple';
      case 'negotiation': return 'orange';
      case 'closed_won': return 'green';
      case 'closed_lost': return 'red';
      default: return 'gray';
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
      console.log('Updating lead:', leadId, 'with updates:', updates);
      
      // Convert empty strings to null for date fields
      const cleanedUpdates: any = {};
      Object.keys(updates).forEach(key => {
        const value = updates[key as keyof Lead];
        // Convert empty strings to null for potential date fields
        if (value === '') {
          cleanedUpdates[key] = null;
        } else {
          cleanedUpdates[key] = value;
        }
      });
      
      // Ensure company_id is included in the update for RLS
      const updateData = {
        ...cleanedUpdates,
        company_id: userProfile?.company_id
      };
      
      console.log('Final update data:', updateData);
      
      const { error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', leadId);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      toast({
        title: "Lead updated",
        description: "Lead information has been updated successfully.",
      });

      // Refresh data
      loadCRMData(loadCRMDashboardData);
    } catch (error) {
      console.error('Error updating lead:', error);
      toast({
        title: "Error",
        description: "Failed to update lead. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updateOpportunity = async (opportunityId: string, updates: Partial<Opportunity>) => {
    try {
      const { error } = await supabase
        .from('opportunities')
        .update(updates)
        .eq('id', opportunityId);

      if (error) throw error;

      toast({
        title: "Opportunity updated",
        description: "Opportunity information has been updated successfully.",
      });

      // Refresh data
      loadCRMData(loadCRMDashboardData);
    } catch (error) {
      console.error('Error updating opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to update opportunity. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredLeads = crmData?.leads?.filter(lead => {
    const matchesSearch = searchTerm === '' || 
      `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.project_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesSource = sourceFilter === 'all' || lead.lead_source === sourceFilter;
    
    return matchesSearch && matchesStatus && matchesSource;
  }) || [];

  if (loading) {
    return <LoadingState message="Loading CRM dashboard..." />;
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout title="CRM Dashboard">
            
            {/* CRM KPI Cards */}
            <ErrorBoundary>
              {crmLoading ? (
                <ResponsiveGrid cols={{ default: 1, sm: 2, lg: 4 }} className="mb-8">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <KPISkeleton key={i} />
                  ))}
                </ResponsiveGrid>
              ) : crmError ? (
                <ErrorState 
                  error={crmError} 
                  onRetry={() => loadCRMData(loadCRMDashboardData)}
                  className="mb-8"
                />
              ) : (
                <div className={mobileGridClasses.stats}>
                  <KPICard
                    title="Total Leads"
                    value={crmData?.totalLeads || 0}
                    icon={Users}
                    subtitle="All active leads"
                    change={`+${crmData?.thisMonthNewLeads || 0} this month`}
                    changeType="positive"
                  />
                  <KPICard
                    title="Qualified Leads"
                    value={crmData?.qualifiedLeads || 0}
                    icon={CheckCircle}
                    subtitle="Ready for proposal"
                  />
                  <KPICard
                    title="Pipeline Value"
                    value={formatCurrency(crmData?.totalPipelineValue || 0)}
                    icon={DollarSign}
                    subtitle="Total opportunities"
                  />
                  <KPICard
                    title="Conversion Rate"
                    value={`${Math.round(crmData?.avgConversionRate || 0)}%`}
                    icon={TrendingUp}
                    subtitle="Lead to project"
                  />
                  <KPICard
                    title="Opportunities"
                    value={crmData?.totalOpportunities || 0}
                    icon={Target}
                    subtitle="Active opportunities"
                  />
                  <KPICard
                    title="Follow-ups Due"
                    value={crmData?.followUpsDue || 0}
                    icon={AlertCircle}
                    subtitle="Require attention"
                    changeType={crmData?.followUpsDue ? "negative" : "neutral"}
                  />
                  <KPICard
                    title="New This Month"
                    value={crmData?.thisMonthNewLeads || 0}
                    icon={UserPlus}
                    subtitle="Fresh leads"
                    changeType="positive"
                  />
                  <KPICard
                    title="Response Time"
                    value="< 2hrs"
                    icon={Clock}
                    subtitle="Average first response"
                    changeType="positive"
                  />
                </div>
              )}
            </ErrorBoundary>

            {/* CRM Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="flex h-12 items-center justify-start bg-card border-b border-border p-0 text-muted-foreground w-full overflow-x-auto scrollbar-hide">
                <TabsTrigger value="overview" className="inline-flex items-center justify-center whitespace-nowrap border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-background/50">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="leads" className="inline-flex items-center justify-center whitespace-nowrap border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-background/50">
                  Leads
                </TabsTrigger>
                <TabsTrigger value="opportunities" className="inline-flex items-center justify-center whitespace-nowrap border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-background/50">
                  Opportunities
                </TabsTrigger>
                <TabsTrigger value="reports" className="inline-flex items-center justify-center whitespace-nowrap border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-background/50">
                  Reports
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab - Enhanced HubSpot-like View */}
              <TabsContent value="overview" className="space-y-6">
                
                {/* Pipeline Kanban - Primary Feature */}
                <Card>
                  <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                    <div>
                      <CardTitle className="flex items-center text-lg sm:text-xl">
                        <Target className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-primary" />
                        Sales Pipeline
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">Visual overview of your opportunities and deals</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab('opportunities')} className="w-full sm:w-auto">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">View Full Pipeline</span>
                      <span className="sm:hidden">Pipeline</span>
                    </Button>
                  </CardHeader>
                  <CardContent className="p-2 sm:p-6">
                    <div className="overflow-x-auto">
                      <div className="min-w-0 max-w-full">
                        <PipelineKanban onLeadClick={handleLeadClick} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  
                  {/* Lead Scoring - AI Feature */}
                  <Card>
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                      <div>
                        <CardTitle className="flex items-center text-base sm:text-lg">
                          <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-primary" />
                          Top Scoring Leads
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">AI-powered lead prioritization</CardDescription>
                      </div>
                      <Button size="sm" onClick={() => setActiveTab('leads')} className="w-full sm:w-auto">
                        <span className="hidden sm:inline">View All Scores</span>
                        <span className="sm:hidden">All Scores</span>
                      </Button>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-6">
                      {!crmData?.leads?.length ? (
                        <EmptyState
                          icon={Users}
                          title="No leads yet"
                          description="Start building your sales pipeline by adding your first lead."
                          action={{
                            label: "Add First Lead",
                            onClick: () => setActiveTab('leads')
                          }}
                        />
                      ) : (
                        <div className="space-y-4">
                          {crmData.leads.slice(0, 5).map((lead) => (
                            <div key={lead.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <p className="font-medium truncate">
                                    {lead.first_name} {lead.last_name}
                                  </p>
                                  <Badge variant="outline" className={`text-${getStatusColor(lead.status)}-600`}>
                                    {lead.status}
                                  </Badge>
                                  <Badge variant="outline" className={`text-${getPriorityColor(lead.priority)}-600`}>
                                    {lead.priority}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground truncate">
                                  {lead.project_name || lead.company_name || 'No project'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {lead.estimated_budget ? formatCurrency(lead.estimated_budget) : 'Budget TBD'}
                                </p>
                              </div>
                              <div className="flex flex-col items-end space-y-1">
                                <div className="flex space-x-2">
                                  {lead.phone && (
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                      <Phone className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {lead.email && (
                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                      <Mail className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(lead.created_at)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Pipeline Overview */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Sales Pipeline</CardTitle>
                      <CardDescription>Opportunities by stage</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {!crmData?.opportunities?.length ? (
                        <EmptyState
                          icon={Target}
                          title="No opportunities"
                          description="Create opportunities from qualified leads to track your sales pipeline."
                        />
                      ) : (
                        <div className="space-y-4">
                          {crmData.opportunities.slice(0, 5).map((opportunity) => (
                            <div key={opportunity.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <p className="font-medium truncate">{opportunity.name}</p>
                                  <Badge variant="outline" className={`text-${getStageColor(opportunity.stage)}-600`}>
                                    {opportunity.stage}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {opportunity.project_type || 'General Construction'}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">{formatCurrency(opportunity.estimated_value)}</p>
                                <p className="text-sm text-muted-foreground">{opportunity.probability_percent}% likely</p>
                                {opportunity.expected_close_date && (
                                  <p className="text-xs text-muted-foreground">
                                    Close: {formatDate(opportunity.expected_close_date)}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Leads Tab */}
              <TabsContent value="leads" className="space-y-6">
                {/* Filters */}
                <Card>
                  <CardContent className="pt-6">
                    <div className={mobileFilterClasses.container}>
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search leads..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className={mobileFilterClasses.input}>
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
                        </SelectContent>
                      </Select>
                      <Select value={sourceFilter} onValueChange={setSourceFilter}>
                        <SelectTrigger className={mobileFilterClasses.input}>
                          <SelectValue placeholder="Source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Sources</SelectItem>
                          <SelectItem value="referral">Referral</SelectItem>
                          <SelectItem value="website">Website</SelectItem>
                          <SelectItem value="social_media">Social Media</SelectItem>
                          <SelectItem value="google_ads">Google Ads</SelectItem>
                          <SelectItem value="direct_mail">Direct Mail</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button className={mobileButtonClasses.primary} onClick={() => {/* TODO: Add new lead functionality */}}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Lead
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Leads List */}
                <Card>
                  <CardHeader>
                    <CardTitle>Leads ({filteredLeads.length})</CardTitle>
                    <CardDescription>Manage your construction leads and prospects</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!filteredLeads.length ? (
                      <EmptyState
                        icon={Users}
                        title="No leads found"
                        description="No leads match your current filters."
                      />
                    ) : (
                      <div className="space-y-2">
                        {filteredLeads.map((lead) => (
                          <LeadEditDialog key={lead.id} lead={lead} onUpdate={updateLead}>
                            <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-3">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">
                                      {lead.first_name} {lead.last_name}
                                    </p>
                                    <p className="text-sm text-muted-foreground truncate">
                                      {lead.email} • {lead.phone}
                                    </p>
                                  </div>
                                  <div className="flex flex-col items-center space-y-1">
                                    <Badge variant="outline" className={`text-${getStatusColor(lead.status)}-600`}>
                                      {lead.status}
                                    </Badge>
                                    <Badge variant="outline" className={`text-${getPriorityColor(lead.priority)}-600`}>
                                      {lead.priority}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="mt-2">
                                  <p className="text-sm font-medium">
                                    {lead.project_name || lead.company_name || 'No project specified'}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {lead.project_type || 'Project type not specified'} • {lead.estimated_budget ? formatCurrency(lead.estimated_budget) : 'Budget TBD'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right space-y-1">
                                <p className="text-sm text-muted-foreground">Source: {lead.lead_source}</p>
                                <p className="text-xs text-muted-foreground">Created: {formatDate(lead.created_at)}</p>
                                {lead.next_follow_up_date && (
                                  <p className="text-xs text-orange-600">
                                    Follow-up: {formatDate(lead.next_follow_up_date)}
                                  </p>
                                )}
                                
                                {/* LEAN Navigation: Quick action buttons */}
                                <div className="flex space-x-1 mt-2">
                                  {['qualified', 'proposal_sent', 'negotiating'].includes(lead.status) && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs px-2 py-1 h-6"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/crm/opportunities?lead=${lead.id}&name=${encodeURIComponent(lead.project_name || `${lead.first_name} ${lead.last_name} Project`)}&budget=${lead.estimated_budget || ''}&type=${lead.project_type || ''}`);
                                      }}
                                    >
                                      Convert
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </LeadEditDialog>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Opportunities Tab */}
              <TabsContent value="opportunities" className="space-y-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Sales Opportunities</CardTitle>
                      <CardDescription>Track your sales pipeline and close deals</CardDescription>
                    </div>
                    <Button onClick={() => {/* TODO: Add new opportunity functionality */}}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Opportunity
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {!crmData?.opportunities?.length ? (
                      <EmptyState
                        icon={Target}
                        title="No opportunities"
                        description="Start tracking your sales pipeline by creating opportunities from qualified leads."
                        action={{
                          label: "Create Opportunity",
                          onClick: () => setActiveTab('opportunities')
                        }}
                      />
                    ) : (
                      <div className="space-y-4">
                        {crmData.opportunities.map((opportunity) => (
                          <div key={opportunity.id} className="flex gap-4">
                            <div className="flex-1">
                              <OpportunityEditDialog opportunity={opportunity} onUpdate={updateOpportunity}>
                                <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center space-x-2">
                                        <p className="font-medium truncate">{opportunity.name}</p>
                                        <Badge variant="outline" className={`text-${getStageColor(opportunity.stage)}-600`}>
                                          {opportunity.stage}
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {opportunity.project_type || 'General Construction'}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-medium text-lg">{formatCurrency(opportunity.estimated_value)}</p>
                                      <p className="text-sm text-muted-foreground">{opportunity.probability_percent}% probability</p>
                                      {opportunity.expected_close_date && (
                                        <p className="text-xs text-muted-foreground">
                                          Expected close: {formatDate(opportunity.expected_close_date)}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </OpportunityEditDialog>
                            </div>
                            <div className="w-64">
                              <ContextualActions
                                context={{
                                  module: 'crm',
                                  entityType: 'opportunity',
                                  entityId: opportunity.id,
                                  entityData: opportunity
                                }}
                                className="h-fit"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Reports Tab */}
              <TabsContent value="reports" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>CRM Analytics & Reports</CardTitle>
                    <CardDescription>Insights into your sales performance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Reports Coming Soon</h3>
                      <p className="text-muted-foreground mb-4">
                        Advanced analytics and reporting features are being developed.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Features will include conversion tracking, source analysis, performance metrics, and custom reports.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
    
    {/* Lead Detail View */}
    {viewMode === 'lead-detail' && selectedLeadId && (
      <LeadDetailView 
        leadId={selectedLeadId} 
        onBack={() => setViewMode('dashboard')}
        onUpdate={() => {/* TODO: Add lead update handler */}}
      />
    )}
    
    </DashboardLayout>
  );
};

export default CRMDashboard;