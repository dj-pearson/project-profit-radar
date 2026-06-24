import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AccessiblePageWrapper } from "@/components/accessibility/AccessiblePageWrapper";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { KPICard } from '@/components/dashboard/KPICard';
import { LoadingState } from '@/components/ui/loading-spinner';
import { ErrorBoundary, ErrorState, EmptyState } from '@/components/ui/error-boundary';
import { KPISkeleton } from '@/components/ui/skeleton-loader';
import { ResponsiveGrid } from '@/components/layout/ResponsiveContainer';
import { useLoadingState } from '@/hooks/useLoadingState';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { mobileGridClasses } from '@/utils/mobileHelpers';
import { ContextualActions } from '@/components/navigation/ContextualActions';
import { Users, DollarSign, TrendingUp, Target, UserPlus, CheckCircle, AlertCircle, Clock, BarChart3, Plus } from 'lucide-react';
import { LeadDetailView } from '@/components/crm/LeadDetailView';
import { OpportunityEditDialog } from '@/components/crm/OpportunityEditDialog';
import { CRMOverviewTab } from '@/components/crm/CRMOverviewTab';
import { CRMLeadsTab } from '@/components/crm/CRMLeadsTab';

export interface Lead {
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

export interface Opportunity {
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

const tabTriggerClass = "inline-flex items-center justify-center whitespace-nowrap border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-background/50";

const CRMDashboard = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
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

  const { data: crmData, loading: crmLoading, error: crmError, execute: loadCRMData } = useLoadingState<CRMData>({
    leads: [], opportunities: [], totalLeads: 0, qualifiedLeads: 0,
    totalOpportunities: 0, totalPipelineValue: 0, avgConversionRate: 0,
    thisMonthNewLeads: 0, followUpsDue: 0
  });

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
    if (!loading && user && userProfile && !userProfile.company_id && userProfile.role !== 'root_admin') navigate('/setup');
    if (!loading && user && userProfile) loadCRMData(loadCRMDashboardData);
  }, [user, userProfile, loading, navigate]);

  const loadCRMDashboardData = async (): Promise<CRMData> => {
    if (!userProfile?.company_id) throw new Error('No company associated with user');
    const currentMonth = new Date();
    currentMonth.setDate(1);
    try {
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email, phone, company_name, status, lead_source, priority, assigned_to, created_at')
        .order('created_at', { ascending: false }) as any;
      if (leadsError) throw leadsError;

      const { data: opportunitiesData, error: opportunitiesError } = await supabase
        .from('opportunities')
        .select('id, name, estimated_value, probability_percent, stage, expected_close_date, account_manager, project_type, created_at')
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false });
      if (opportunitiesError) throw opportunitiesError;

      const leads = leadsData || [];
      const opportunities = opportunitiesData || [];
      const qualifiedLeads = leads.filter((l: Lead) => ['qualified', 'proposal_sent', 'negotiating'].includes(l.status));
      const thisMonthNewLeads = leads.filter((l: Lead) => l.created_at && new Date(l.created_at) >= currentMonth);
      const totalPipelineValue = opportunities.reduce((sum: number, o: Opportunity) => sum + (o.estimated_value || 0), 0);
      const wonLeads = leads.filter((l: Lead) => l.status === 'won');
      const avgConversionRate = leads.length > 0 ? (wonLeads.length / leads.length) * 100 : 0;

      return {
        leads: leads as Lead[], opportunities, totalLeads: leads.length,
        qualifiedLeads: qualifiedLeads.length, totalOpportunities: opportunities.length,
        totalPipelineValue, avgConversionRate, thisMonthNewLeads: thisMonthNewLeads.length, followUpsDue: 0
      };
    } catch (error) {
      console.error('Error loading CRM data:', error);
      throw error;
    }
  };

  const getStatusColorClass = (status: string) => {
    const map: Record<string, string> = {
      new: 'text-blue-600 border-blue-300', contacted: 'text-yellow-600 border-yellow-300',
      qualified: 'text-green-600 border-green-300', proposal_sent: 'text-purple-600 border-purple-300',
      negotiating: 'text-orange-600 border-orange-300', won: 'text-green-600 border-green-300',
      lost: 'text-red-600 border-red-300',
    };
    return map[status] || 'text-gray-600 border-gray-300';
  };

  const getPriorityColorClass = (priority: string) => {
    const map: Record<string, string> = {
      urgent: 'text-red-600 border-red-300', high: 'text-orange-600 border-orange-300',
      medium: 'text-yellow-600 border-yellow-300', low: 'text-gray-600 border-gray-300',
    };
    return map[priority] || 'text-gray-600 border-gray-300';
  };

  const getStageColorClass = (stage: string) => {
    const map: Record<string, string> = {
      prospecting: 'text-blue-600 border-blue-300', qualification: 'text-yellow-600 border-yellow-300',
      proposal: 'text-purple-600 border-purple-300', negotiation: 'text-orange-600 border-orange-300',
      closed_won: 'text-green-600 border-green-300', closed_lost: 'text-red-600 border-red-300',
    };
    return map[stage] || 'text-gray-600 border-gray-300';
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const updateLead = async (leadId: string, updates: Partial<Lead>) => {
    try {
      const cleanedUpdates: Record<string, unknown> = {};
      Object.keys(updates).forEach(key => {
        const value = updates[key as keyof Lead];
        cleanedUpdates[key] = value === '' ? null : value;
      });
      const { error } = await supabase.from('leads').update(cleanedUpdates).eq('id', leadId);
      if (error) { console.error('Supabase error:', error); throw error; }
      toast({ title: "Lead updated", description: "Lead information has been updated successfully." });
      loadCRMData(loadCRMDashboardData);
    } catch (error) {
      console.error('Error updating lead:', error);
      toast({ title: "Error", description: "Failed to update lead. Please try again.", variant: "destructive" });
    }
  };

  const updateOpportunity = async (opportunityId: string, updates: Partial<Opportunity>) => {
    try {
      const { error } = await supabase.from('opportunities').update(updates).eq('id', opportunityId);
      if (error) throw error;
      toast({ title: "Opportunity updated", description: "Opportunity information has been updated successfully." });
      loadCRMData(loadCRMDashboardData);
    } catch (error) {
      console.error('Error updating opportunity:', error);
      toast({ title: "Error", description: "Failed to update opportunity. Please try again.", variant: "destructive" });
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

  if (loading) return <LoadingState message="Loading CRM dashboard..." />;
  if (!user) return null;

  return (
    <AccessiblePageWrapper pageTitle="CRM Dashboard">
    <DashboardLayout title="CRM Dashboard" hasAccessibleWrapper>
      <ErrorBoundary>
        {crmLoading ? (
          <ResponsiveGrid cols={{ default: 1, sm: 2, lg: 4 }} className="mb-8">
            {Array.from({ length: 8 }).map((_, i) => <KPISkeleton key={i} />)}
          </ResponsiveGrid>
        ) : crmError ? (
          <ErrorState error={crmError} onRetry={() => loadCRMData(loadCRMDashboardData)} className="mb-8" />
        ) : (
          <div className={mobileGridClasses.stats}>
            <KPICard title="Total Leads" value={crmData?.totalLeads || 0} icon={Users} subtitle="All active leads" change={`+${crmData?.thisMonthNewLeads || 0} this month`} changeType="positive" />
            <KPICard title="Qualified Leads" value={crmData?.qualifiedLeads || 0} icon={CheckCircle} subtitle="Ready for proposal" />
            <KPICard title="Pipeline Value" value={formatCurrency(crmData?.totalPipelineValue || 0)} icon={DollarSign} subtitle="Total opportunities" />
            <KPICard title="Conversion Rate" value={`${Math.round(crmData?.avgConversionRate || 0)}%`} icon={TrendingUp} subtitle="Lead to project" />
            <KPICard title="Opportunities" value={crmData?.totalOpportunities || 0} icon={Target} subtitle="Active opportunities" />
            <KPICard title="Follow-ups Due" value={crmData?.followUpsDue || 0} icon={AlertCircle} subtitle="Require attention" changeType={crmData?.followUpsDue ? "negative" : "neutral"} />
            <KPICard title="New This Month" value={crmData?.thisMonthNewLeads || 0} icon={UserPlus} subtitle="Fresh leads" changeType="positive" />
            <KPICard title="Response Time" value="< 2hrs" icon={Clock} subtitle="Average first response" changeType="positive" />
          </div>
        )}
      </ErrorBoundary>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex h-12 items-center justify-start bg-card border-b border-border p-0 text-muted-foreground w-full overflow-x-auto scrollbar-hide">
          <TabsTrigger value="overview" className={tabTriggerClass}>Overview</TabsTrigger>
          <TabsTrigger value="leads" className={tabTriggerClass}>Leads</TabsTrigger>
          <TabsTrigger value="opportunities" className={tabTriggerClass}>Opportunities</TabsTrigger>
          <TabsTrigger value="reports" className={tabTriggerClass}>Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <CRMOverviewTab
            leads={crmData?.leads || []} opportunities={crmData?.opportunities || []}
            onLeadClick={handleLeadClick} onSwitchTab={setActiveTab}
            getStatusColorClass={getStatusColorClass} getPriorityColorClass={getPriorityColorClass}
            getStageColorClass={getStageColorClass} formatCurrency={formatCurrency} formatDate={formatDate}
          />
        </TabsContent>

        <TabsContent value="leads">
          <CRMLeadsTab
            filteredLeads={filteredLeads} searchTerm={searchTerm} onSearchTermChange={setSearchTerm}
            statusFilter={statusFilter} onStatusFilterChange={setStatusFilter}
            sourceFilter={sourceFilter} onSourceFilterChange={setSourceFilter}
            onUpdateLead={updateLead} getStatusColorClass={getStatusColorClass}
            getPriorityColorClass={getPriorityColorClass} formatDate={formatDate}
          />
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Sales Opportunities</CardTitle>
                <CardDescription>Track your sales pipeline and close deals</CardDescription>
              </div>
              <Button onClick={() => { toast({ title: 'Coming Soon', description: 'Opportunity creation will be available in a future update.' }); }} aria-label="Create new opportunity">
                <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                New Opportunity
              </Button>
            </CardHeader>
            <CardContent>
              {!crmData?.opportunities?.length ? (
                <EmptyState icon={Target} title="No opportunities" description="Start tracking your sales pipeline by creating opportunities from qualified leads." action={{ label: "Create Opportunity", onClick: () => setActiveTab('opportunities') }} />
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
                                  <p id={`opp-detail-${opportunity.id}`} className="font-medium truncate">{opportunity.name}</p>
                                  <Badge variant="outline" className={getStageColorClass(opportunity.stage)} aria-label={`Stage: ${opportunity.stage}`}>{opportunity.stage}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">{opportunity.project_type || 'General Construction'}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-lg">{formatCurrency(opportunity.estimated_value)}</p>
                                <p className="text-sm text-muted-foreground">{opportunity.probability_percent}% probability</p>
                                {opportunity.expected_close_date && (
                                  <p className="text-xs text-muted-foreground">Expected close: {formatDate(opportunity.expected_close_date)}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </OpportunityEditDialog>
                      </div>
                      <div className="w-64">
                        <ContextualActions context={{ module: 'crm', entityType: 'opportunity', entityId: opportunity.id, entityData: opportunity }} className="h-fit" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>CRM Analytics & Reports</CardTitle>
              <CardDescription>Insights into your sales performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" aria-hidden="true" />
                <h3 className="text-lg font-medium mb-2">Reports Coming Soon</h3>
                <p className="text-muted-foreground mb-4">Advanced analytics and reporting features are being developed.</p>
                <p className="text-sm text-muted-foreground">Features will include conversion tracking, source analysis, performance metrics, and custom reports.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {viewMode === 'lead-detail' && selectedLeadId && (
        <LeadDetailView leadId={selectedLeadId} onBack={() => setViewMode('dashboard')} onUpdate={() => { loadCRMData(); }} />
      )}
    </DashboardLayout>
    </AccessiblePageWrapper>
  );
};

export default CRMDashboard;
