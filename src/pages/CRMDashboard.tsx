import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Plus
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

const CRMDashboard = () => {
  const { user, userProfile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');
  
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
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1">
                <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
                <TabsTrigger value="leads" className="text-xs sm:text-sm">Leads</TabsTrigger>
                <TabsTrigger value="opportunities" className="text-xs sm:text-sm">Opportunities</TabsTrigger>
                <TabsTrigger value="reports" className="text-xs sm:text-sm">Reports</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <ResponsiveGrid cols={{ default: 1, lg: 2 }} gap="sm">
                  
                  {/* Recent Leads */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Recent Leads</CardTitle>
                        <CardDescription>Latest prospects in your pipeline</CardDescription>
                      </div>
                      <Button size="sm" onClick={() => navigate('/crm/leads/new')}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Lead
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {!crmData?.leads?.length ? (
                        <EmptyState
                          icon={Users}
                          title="No leads yet"
                          description="Start building your sales pipeline by adding your first lead."
                          action={{
                            label: "Add First Lead",
                            onClick: () => navigate('/crm/leads/new')
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
                </ResponsiveGrid>
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
                    <Button className={mobileButtonClasses.primary} onClick={() => navigate('/crm/leads')}>
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
                          <div key={lead.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                               onClick={() => navigate(`/crm/leads/${lead.id}`)}>
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
                            </div>
                          </div>
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
                    <Button onClick={() => navigate('/crm/opportunities')}>
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
                          onClick: () => navigate('/crm/opportunities')
                        }}
                      />
                    ) : (
                      <div className="space-y-4">
                        {crmData.opportunities.map((opportunity) => (
                          <div key={opportunity.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                               onClick={() => navigate(`/crm/opportunities/${opportunity.id}`)}>
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
    </DashboardLayout>
  );
};

export default CRMDashboard;