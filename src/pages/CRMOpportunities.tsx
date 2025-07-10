import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  Search,
  Plus,
  DollarSign,
  Calendar,
  TrendingUp,
  User,
  Building2,
  FileText,
  Clock,
  Percent,
  Award,
  AlertTriangle
} from 'lucide-react';

interface Opportunity {
  id: string;
  name: string;
  description?: string;
  lead_id?: string;
  contact_id?: string;
  project_id?: string;
  estimated_value: number;
  probability_percent: number;
  expected_close_date?: string;
  stage: string;
  pipeline_position: number;
  project_type?: string;
  bid_required?: boolean;
  bid_due_date?: string;
  proposal_sent_date?: string;
  contract_signed_date?: string;
  competitor_names?: string[];
  our_competitive_advantage?: string;
  key_decision_factors?: string[];
  account_manager?: string;
  estimator?: string;
  project_manager?: string;
  risk_level: string;
  risk_factors?: string[];
  mitigation_strategies?: string;
  close_date?: string;
  close_reason?: string;
  actual_value?: number;
  notes?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  project_name?: string;
}

const CRMOpportunities = () => {
  const { user, userProfile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [showNewOpportunityDialog, setShowNewOpportunityDialog] = useState(false);
  const [newOpportunity, setNewOpportunity] = useState<Partial<Opportunity>>({
    stage: 'prospecting',
    probability_percent: 50,
    risk_level: 'medium',
    bid_required: false
  });
  
  const { 
    data: opportunities, 
    loading: opportunitiesLoading, 
    error: opportunitiesError, 
    execute: loadOpportunities 
  } = useLoadingState<Opportunity[]>([]);

  const { 
    data: leads, 
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
      loadOpportunities(loadOpportunitiesData);
      loadLeads(loadLeadsData);
    }
  }, [user, userProfile, loading, navigate]);

  const loadOpportunitiesData = async (): Promise<Opportunity[]> => {
    if (!userProfile?.company_id) {
      throw new Error('No company associated with user');
    }

    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .eq('company_id', userProfile.company_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  };

  const loadLeadsData = async (): Promise<Lead[]> => {
    if (!userProfile?.company_id) {
      throw new Error('No company associated with user');
    }

    const { data, error } = await supabase
      .from('leads')
      .select('id, first_name, last_name, project_name')
      .eq('company_id', userProfile.company_id)
      .in('status', ['qualified', 'proposal_sent', 'negotiating'])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  };

  const createOpportunity = async () => {
    if (!userProfile?.company_id) {
      toast({
        title: "Error",
        description: "No company associated with your account.",
        variant: "destructive"
      });
      return;
    }

    if (!newOpportunity.name || !newOpportunity.estimated_value) {
      toast({
        title: "Validation Error",
        description: "Opportunity name and estimated value are required.",
        variant: "destructive"
      });
      return;
    }

    try {
      const opportunityData = {
        name: newOpportunity.name!,
        description: newOpportunity.description,
        lead_id: newOpportunity.lead_id,
        contact_id: newOpportunity.contact_id,
        project_id: newOpportunity.project_id,
        estimated_value: newOpportunity.estimated_value!,
        probability_percent: newOpportunity.probability_percent!,
        expected_close_date: newOpportunity.expected_close_date,
        stage: newOpportunity.stage!,
        pipeline_position: newOpportunity.pipeline_position,
        project_type: newOpportunity.project_type,
        bid_required: newOpportunity.bid_required,
        bid_due_date: newOpportunity.bid_due_date,
        proposal_sent_date: newOpportunity.proposal_sent_date,
        contract_signed_date: newOpportunity.contract_signed_date,
        competitor_names: newOpportunity.competitor_names,
        our_competitive_advantage: newOpportunity.our_competitive_advantage,
        key_decision_factors: newOpportunity.key_decision_factors,
        estimator: newOpportunity.estimator,
        project_manager: newOpportunity.project_manager,
        risk_level: newOpportunity.risk_level!,
        risk_factors: newOpportunity.risk_factors,
        mitigation_strategies: newOpportunity.mitigation_strategies,
        close_date: newOpportunity.close_date,
        close_reason: newOpportunity.close_reason,
        actual_value: newOpportunity.actual_value,
        notes: newOpportunity.notes,
        tags: newOpportunity.tags,
        company_id: userProfile.company_id,
        account_manager: user?.id
      };

      const { error } = await supabase
        .from('opportunities')
        .insert([opportunityData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Opportunity created successfully!",
      });

      setShowNewOpportunityDialog(false);
      setNewOpportunity({
        stage: 'prospecting',
        probability_percent: 50,
        risk_level: 'medium',
        bid_required: false
      });
      loadOpportunities(loadOpportunitiesData);
    } catch (error) {
      console.error('Error creating opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to create opportunity. Please try again.",
        variant: "destructive"
      });
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

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'green';
      case 'medium': return 'yellow';
      case 'high': return 'orange';
      case 'urgent': return 'red';
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

  const calculateWeightedValue = (value: number, probability: number) => {
    return (value * probability) / 100;
  };

  const filteredOpportunities = opportunities?.filter(opportunity => {
    const matchesSearch = searchTerm === '' || 
      opportunity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opportunity.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opportunity.project_type?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStage = stageFilter === 'all' || opportunity.stage === stageFilter;
    const matchesRisk = riskFilter === 'all' || opportunity.risk_level === riskFilter;
    
    return matchesSearch && matchesStage && matchesRisk;
  }) || [];

  const totalPipelineValue = filteredOpportunities.reduce((sum, opp) => sum + opp.estimated_value, 0);
  const totalWeightedValue = filteredOpportunities.reduce((sum, opp) => sum + calculateWeightedValue(opp.estimated_value, opp.probability_percent), 0);

  if (loading) {
    return <LoadingState message="Loading opportunities..." />;
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout title="Sales Opportunities">
            
            {/* Pipeline Summary */}
            <ResponsiveGrid cols={{ default: 1, sm: 2, lg: 4 }} className="mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Pipeline</p>
                      <p className="text-2xl font-bold">{formatCurrency(totalPipelineValue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Weighted Value</p>
                      <p className="text-2xl font-bold">{formatCurrency(totalWeightedValue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Opportunities</p>
                      <p className="text-2xl font-bold">{filteredOpportunities.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2">
                    <Percent className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Avg. Probability</p>
                      <p className="text-2xl font-bold">
                        {filteredOpportunities.length > 0 
                          ? Math.round(filteredOpportunities.reduce((sum, opp) => sum + opp.probability_percent, 0) / filteredOpportunities.length)
                          : 0
                        }%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </ResponsiveGrid>

            {/* Filters and Actions */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search opportunities by name, description, or project type..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Select value={stageFilter} onValueChange={setStageFilter}>
                      <SelectTrigger className="w-full sm:w-40">
                        <SelectValue placeholder="Stage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Stages</SelectItem>
                        <SelectItem value="prospecting">Prospecting</SelectItem>
                        <SelectItem value="qualification">Qualification</SelectItem>
                        <SelectItem value="proposal">Proposal</SelectItem>
                        <SelectItem value="negotiation">Negotiation</SelectItem>
                        <SelectItem value="closed_won">Closed Won</SelectItem>
                        <SelectItem value="closed_lost">Closed Lost</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={riskFilter} onValueChange={setRiskFilter}>
                      <SelectTrigger className="w-full sm:w-40">
                        <SelectValue placeholder="Risk Level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Risk Levels</SelectItem>
                        <SelectItem value="low">Low Risk</SelectItem>
                        <SelectItem value="medium">Medium Risk</SelectItem>
                        <SelectItem value="high">High Risk</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Dialog open={showNewOpportunityDialog} onOpenChange={setShowNewOpportunityDialog}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          New Opportunity
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Create New Opportunity</DialogTitle>
                          <DialogDescription>
                            Add a new sales opportunity to your pipeline.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="grid gap-6 py-4">
                          {/* Basic Information */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-medium">Opportunity Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="name">Opportunity Name *</Label>
                                <Input
                                  id="name"
                                  value={newOpportunity.name || ''}
                                  onChange={(e) => setNewOpportunity({...newOpportunity, name: e.target.value})}
                                  placeholder="Main Street Office Building"
                                />
                              </div>
                              <div>
                                <Label htmlFor="lead_id">Related Lead</Label>
                                <Select value={newOpportunity.lead_id || ''} onValueChange={(value) => setNewOpportunity({...newOpportunity, lead_id: value})}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select lead (optional)" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="">No related lead</SelectItem>
                                    {leads?.map((lead) => (
                                      <SelectItem key={lead.id} value={lead.id}>
                                        {lead.first_name} {lead.last_name} - {lead.project_name || 'No project'}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="md:col-span-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                  id="description"
                                  value={newOpportunity.description || ''}
                                  onChange={(e) => setNewOpportunity({...newOpportunity, description: e.target.value})}
                                  placeholder="Describe the opportunity and project scope..."
                                  rows={3}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Financial Information */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-medium">Financial Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="estimated_value">Estimated Value ($) *</Label>
                                <Input
                                  id="estimated_value"
                                  type="number"
                                  value={newOpportunity.estimated_value || ''}
                                  onChange={(e) => setNewOpportunity({...newOpportunity, estimated_value: Number(e.target.value)})}
                                  placeholder="150000"
                                />
                              </div>
                              <div>
                                <Label htmlFor="probability_percent">Probability (%)</Label>
                                <Input
                                  id="probability_percent"
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={newOpportunity.probability_percent || 50}
                                  onChange={(e) => setNewOpportunity({...newOpportunity, probability_percent: Number(e.target.value)})}
                                />
                              </div>
                              <div>
                                <Label htmlFor="expected_close_date">Expected Close Date</Label>
                                <Input
                                  id="expected_close_date"
                                  type="date"
                                  value={newOpportunity.expected_close_date || ''}
                                  onChange={(e) => setNewOpportunity({...newOpportunity, expected_close_date: e.target.value})}
                                />
                              </div>
                              <div>
                                <Label htmlFor="project_type">Project Type</Label>
                                <Select value={newOpportunity.project_type || ''} onValueChange={(value) => setNewOpportunity({...newOpportunity, project_type: value})}>
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
                            </div>
                          </div>

                          {/* Pipeline Information */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-medium">Pipeline Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <Label htmlFor="stage">Stage</Label>
                                <Select value={newOpportunity.stage || 'prospecting'} onValueChange={(value) => setNewOpportunity({...newOpportunity, stage: value})}>
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
                              <div>
                                <Label htmlFor="risk_level">Risk Level</Label>
                                <Select value={newOpportunity.risk_level || 'medium'} onValueChange={(value) => setNewOpportunity({...newOpportunity, risk_level: value})}>
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
                              <div className="flex items-center space-x-2 pt-6">
                                <Checkbox
                                  id="bid_required"
                                  checked={newOpportunity.bid_required || false}
                                  onCheckedChange={(checked) => setNewOpportunity({...newOpportunity, bid_required: !!checked})}
                                />
                                <Label htmlFor="bid_required">Bid Required</Label>
                              </div>
                            </div>
                          </div>

                          {/* Competitive Information */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-medium">Competitive Analysis</h3>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="our_competitive_advantage">Our Competitive Advantage</Label>
                                <Textarea
                                  id="our_competitive_advantage"
                                  value={newOpportunity.our_competitive_advantage || ''}
                                  onChange={(e) => setNewOpportunity({...newOpportunity, our_competitive_advantage: e.target.value})}
                                  placeholder="What makes us the best choice for this project?"
                                  rows={2}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Notes */}
                          <div>
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                              id="notes"
                              value={newOpportunity.notes || ''}
                              onChange={(e) => setNewOpportunity({...newOpportunity, notes: e.target.value})}
                              placeholder="Additional notes about this opportunity..."
                              rows={3}
                            />
                          </div>
                        </div>

                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setShowNewOpportunityDialog(false)}>
                            Cancel
                          </Button>
                          <Button onClick={createOpportunity}>
                            Create Opportunity
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Opportunities List */}
            <Card>
              <CardHeader>
                <CardTitle>Opportunities ({filteredOpportunities.length})</CardTitle>
                <CardDescription>
                  Track your sales pipeline and manage opportunities from qualification to close.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ErrorBoundary>
                  {opportunitiesLoading ? (
                    <LoadingState message="Loading opportunities..." />
                  ) : opportunitiesError ? (
                    <ErrorState 
                      error={opportunitiesError} 
                      onRetry={() => loadOpportunities(loadOpportunitiesData)}
                    />
                  ) : !filteredOpportunities.length ? (
                    <EmptyState
                      icon={Target}
                      title="No opportunities found"
                      description={opportunities?.length ? "No opportunities match your current filters." : "Start tracking your sales pipeline by creating your first opportunity."}
                      action={opportunities?.length ? undefined : {
                        label: "Create First Opportunity",
                        onClick: () => setShowNewOpportunityDialog(true)
                      }}
                    />
                  ) : (
                    <div className="space-y-4">
                      {filteredOpportunities.map((opportunity) => (
                        <div key={opportunity.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                             onClick={() => navigate(`/crm/opportunities/${opportunity.id}`)}>
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-3 mb-2">
                                <h3 className="font-medium text-lg truncate">{opportunity.name}</h3>
                                <div className="flex space-x-2">
                                  <Badge variant="outline" className={`text-${getStageColor(opportunity.stage)}-600 border-${getStageColor(opportunity.stage)}-200`}>
                                    {opportunity.stage.replace('_', ' ')}
                                  </Badge>
                                  <Badge variant="outline" className={`text-${getRiskColor(opportunity.risk_level)}-600 border-${getRiskColor(opportunity.risk_level)}-200`}>
                                    {opportunity.risk_level} risk
                                  </Badge>
                                </div>
                              </div>
                              
                              {opportunity.description && (
                                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                  {opportunity.description}
                                </p>
                              )}
                            </div>
                            
                            <div className="text-right ml-4">
                              <p className="font-bold text-xl">{formatCurrency(opportunity.estimated_value)}</p>
                              <p className="text-sm text-muted-foreground">
                                Weighted: {formatCurrency(calculateWeightedValue(opportunity.estimated_value, opportunity.probability_percent))}
                              </p>
                            </div>
                          </div>

                          {/* Probability Progress Bar */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">Probability</span>
                              <span className="text-sm text-muted-foreground">{opportunity.probability_percent}%</span>
                            </div>
                            <Progress value={opportunity.probability_percent} className="h-2" />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-3">
                            <div className="flex items-center space-x-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{opportunity.project_type?.replace('_', ' ') || 'General Construction'}</span>
                            </div>
                            {opportunity.expected_close_date && (
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">Close: {formatDate(opportunity.expected_close_date)}</span>
                              </div>
                            )}
                            {opportunity.bid_required && (
                              <div className="flex items-center space-x-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">Bid Required</span>
                                {opportunity.bid_due_date && (
                                  <span className="text-xs text-orange-600">
                                    Due: {formatDate(opportunity.bid_due_date)}
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">Created: {formatDate(opportunity.created_at)}</span>
                            </div>
                          </div>

                          {opportunity.our_competitive_advantage && (
                            <div className="mb-2">
                              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                                🎯 {opportunity.our_competitive_advantage}
                              </p>
                            </div>
                          )}

                          {opportunity.risk_factors && opportunity.risk_factors.length > 0 && (
                            <div className="flex items-center space-x-2">
                              <AlertTriangle className="h-4 w-4 text-orange-500" />
                              <p className="text-sm text-orange-600">
                                Risk factors identified
                              </p>
                            </div>
                          )}
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

export default CRMOpportunities;