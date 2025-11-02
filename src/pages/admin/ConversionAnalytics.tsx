import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Mail,
  Target,
  CheckCircle,
  DollarSign,
  Activity,
  Zap,
  BarChart3,
  PieChart,
  Trophy,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface FunnelMetrics {
  total_visitors: number;
  leads_captured: number;
  demos_requested: number;
  trials_started: number;
  trials_converted: number;
  visitor_to_lead_rate: number;
  lead_to_demo_rate: number;
  demo_to_trial_rate: number;
  trial_to_paid_rate: number;
}

interface LeadMetrics {
  total_leads: number;
  new_leads: number;
  qualified_leads: number;
  converted_leads: number;
  average_lead_score: number;
  top_sources: Array<{ source: string; count: number }>;
}

interface EmailMetrics {
  total_campaigns: number;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  average_open_rate: number;
  average_click_rate: number;
  top_campaigns: Array<{ campaign: string; open_rate: number }>;
}

interface OnboardingMetrics {
  total_users: number;
  completed_users: number;
  completion_rate: number;
  average_points: number;
  average_tasks_completed: number;
}

export const ConversionAnalytics = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30'); // days
  const [funnelMetrics, setFunnelMetrics] = useState<FunnelMetrics | null>(null);
  const [leadMetrics, setLeadMetrics] = useState<LeadMetrics | null>(null);
  const [emailMetrics, setEmailMetrics] = useState<EmailMetrics | null>(null);
  const [onboardingMetrics, setOnboardingMetrics] = useState<OnboardingMetrics | null>(null);

  // Check admin access
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

  // Load all metrics
  useEffect(() => {
    loadMetrics();
  }, [dateRange]);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadFunnelMetrics(),
        loadLeadMetrics(),
        loadEmailMetrics(),
        loadOnboardingMetrics(),
      ]);
    } catch (error) {
      console.error('Failed to load metrics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load analytics data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFunnelMetrics = async () => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      // Get conversion events
      const { data: events, error } = await supabase
        .from('conversion_events')
        .select('event_type')
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      const eventCounts = events?.reduce((acc, e) => {
        acc[e.event_type] = (acc[e.event_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const visitors = eventCounts['landed'] || 0;
      const leadsCapture = eventCounts['signup_started'] || eventCounts['lead_captured'] || 0;
      const demosRequested = eventCounts['demo_requested'] || 0;
      const trialsStarted = eventCounts['trial_activated'] || 0;
      const trialsConverted = eventCounts['trial_converted'] || 0;

      setFunnelMetrics({
        total_visitors: visitors,
        leads_captured: leadsCapture,
        demos_requested: demosRequested,
        trials_started: trialsStarted,
        trials_converted: trialsConverted,
        visitor_to_lead_rate: visitors > 0 ? (leadsCapture / visitors) * 100 : 0,
        lead_to_demo_rate: leadsCapture > 0 ? (demosRequested / leadsCapture) * 100 : 0,
        demo_to_trial_rate: demosRequested > 0 ? (trialsStarted / demosRequested) * 100 : 0,
        trial_to_paid_rate: trialsStarted > 0 ? (trialsConverted / trialsStarted) * 100 : 0,
      });
    } catch (error) {
      console.error('Failed to load funnel metrics:', error);
    }
  };

  const loadLeadMetrics = async () => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      // Get leads
      const { data: leads, error } = await supabase
        .from('leads')
        .select('lead_status, lead_score, lead_source, created_at')
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      const totalLeads = leads?.length || 0;
      const newLeads = leads?.filter(l => l.lead_status === 'new').length || 0;
      const qualifiedLeads = leads?.filter(l => l.lead_status === 'qualified').length || 0;
      const convertedLeads = leads?.filter(l => l.lead_status === 'converted').length || 0;
      const avgScore = leads?.reduce((sum, l) => sum + (l.lead_score || 0), 0) / (totalLeads || 1);

      // Top sources
      const sourceCounts = leads?.reduce((acc, l) => {
        const source = l.lead_source || 'unknown';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const topSources = Object.entries(sourceCounts)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setLeadMetrics({
        total_leads: totalLeads,
        new_leads: newLeads,
        qualified_leads: qualifiedLeads,
        converted_leads: convertedLeads,
        average_lead_score: Math.round(avgScore),
        top_sources: topSources,
      });
    } catch (error) {
      console.error('Failed to load lead metrics:', error);
    }
  };

  const loadEmailMetrics = async () => {
    try {
      // Get campaign stats
      const { data: campaigns, error } = await supabase
        .from('email_campaigns')
        .select('campaign_name, total_sent, total_opened, total_clicked')
        .eq('is_active', true);

      if (error) throw error;

      const totalCampaigns = campaigns?.length || 0;
      const totalSent = campaigns?.reduce((sum, c) => sum + (c.total_sent || 0), 0) || 0;
      const totalOpened = campaigns?.reduce((sum, c) => sum + (c.total_opened || 0), 0) || 0;
      const totalClicked = campaigns?.reduce((sum, c) => sum + (c.total_clicked || 0), 0) || 0;

      const avgOpenRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
      const avgClickRate = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0;

      // Top campaigns by open rate
      const topCampaigns = campaigns
        ?.map(c => ({
          campaign: c.campaign_name,
          open_rate: c.total_sent > 0 ? (c.total_opened / c.total_sent) * 100 : 0,
        }))
        .sort((a, b) => b.open_rate - a.open_rate)
        .slice(0, 5) || [];

      setEmailMetrics({
        total_campaigns: totalCampaigns,
        total_sent: totalSent,
        total_opened: totalOpened,
        total_clicked: totalClicked,
        average_open_rate: avgOpenRate,
        average_click_rate: avgClickRate,
        top_campaigns: topCampaigns,
      });
    } catch (error) {
      console.error('Failed to load email metrics:', error);
    }
  };

  const loadOnboardingMetrics = async () => {
    try {
      // Call the SQL function we created in the migration
      const { data, error } = await supabase.rpc('get_onboarding_completion_rate');

      if (error) throw error;

      if (data && data.length > 0) {
        const metrics = data[0];
        setOnboardingMetrics({
          total_users: metrics.total_users || 0,
          completed_users: metrics.completed_users || 0,
          completion_rate: metrics.completion_rate || 0,
          average_points: metrics.average_points || 0,
          average_tasks_completed: metrics.average_tasks_completed || 0,
        });
      }
    } catch (error) {
      console.error('Failed to load onboarding metrics:', error);
    }
  };

  const MetricCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    trendValue,
  }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: any;
    trend?: 'up' | 'down';
    trendValue?: string;
  }) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-2">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            {trend && trendValue && (
              <div className="flex items-center gap-1 mt-2">
                {trend === 'up' ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-xs ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  {trendValue}
                </span>
              </div>
            )}
          </div>
          <div className="bg-construction-orange/10 p-3 rounded-lg">
            <Icon className="w-6 h-6 text-construction-orange" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading && !funnelMetrics) {
    return (
      <DashboardLayout title="Conversion Analytics">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Activity className="w-12 h-12 text-construction-orange animate-pulse mx-auto mb-4" />
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Conversion Analytics">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-construction-dark">Conversion Analytics</h1>
            <p className="text-muted-foreground">Track leads, conversions, and engagement metrics</p>
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="funnel" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
            <TabsTrigger value="leads">Lead Analytics</TabsTrigger>
            <TabsTrigger value="email">Email Performance</TabsTrigger>
            <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          </TabsList>

          {/* Conversion Funnel */}
          <TabsContent value="funnel" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <MetricCard
                title="Total Visitors"
                value={funnelMetrics?.total_visitors.toLocaleString() || '0'}
                subtitle="Website visitors"
                icon={Users}
              />
              <MetricCard
                title="Leads Captured"
                value={funnelMetrics?.leads_captured.toLocaleString() || '0'}
                subtitle={`${funnelMetrics?.visitor_to_lead_rate.toFixed(1)}% conversion`}
                icon={Target}
              />
              <MetricCard
                title="Demos Requested"
                value={funnelMetrics?.demos_requested.toLocaleString() || '0'}
                subtitle={`${funnelMetrics?.lead_to_demo_rate.toFixed(1)}% of leads`}
                icon={BarChart3}
              />
              <MetricCard
                title="Trials Started"
                value={funnelMetrics?.trials_started.toLocaleString() || '0'}
                subtitle={`${funnelMetrics?.demo_to_trial_rate.toFixed(1)}% of demos`}
                icon={Zap}
              />
              <MetricCard
                title="Paid Conversions"
                value={funnelMetrics?.trials_converted.toLocaleString() || '0'}
                subtitle={`${funnelMetrics?.trial_to_paid_rate.toFixed(1)}% of trials`}
                icon={DollarSign}
              />
            </div>

            {/* Funnel Visualization */}
            <Card>
              <CardHeader>
                <CardTitle>Conversion Funnel</CardTitle>
                <CardDescription>
                  Visualize your conversion rates at each stage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      label: 'Visitors',
                      count: funnelMetrics?.total_visitors || 0,
                      percentage: 100,
                    },
                    {
                      label: 'Leads',
                      count: funnelMetrics?.leads_captured || 0,
                      percentage: funnelMetrics?.visitor_to_lead_rate || 0,
                    },
                    {
                      label: 'Demos',
                      count: funnelMetrics?.demos_requested || 0,
                      percentage: funnelMetrics?.lead_to_demo_rate || 0,
                    },
                    {
                      label: 'Trials',
                      count: funnelMetrics?.trials_started || 0,
                      percentage: funnelMetrics?.demo_to_trial_rate || 0,
                    },
                    {
                      label: 'Paid',
                      count: funnelMetrics?.trials_converted || 0,
                      percentage: funnelMetrics?.trial_to_paid_rate || 0,
                    },
                  ].map((stage, index) => (
                    <div key={stage.label} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{stage.label}</span>
                        <span className="text-muted-foreground">
                          {stage.count.toLocaleString()} ({stage.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="relative h-12 bg-gray-100 rounded-lg overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-construction-orange to-orange-400 transition-all duration-500"
                          style={{ width: `${Math.max(stage.percentage, 5)}%` }}
                        >
                          <div className="flex items-center justify-center h-full text-white font-semibold">
                            {stage.count > 0 && stage.count.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Lead Analytics */}
          <TabsContent value="leads" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Total Leads"
                value={leadMetrics?.total_leads.toLocaleString() || '0'}
                subtitle="All captured leads"
                icon={Users}
              />
              <MetricCard
                title="Qualified Leads"
                value={leadMetrics?.qualified_leads.toLocaleString() || '0'}
                subtitle={`${((leadMetrics?.qualified_leads / (leadMetrics?.total_leads || 1)) * 100).toFixed(1)}% of total`}
                icon={CheckCircle}
              />
              <MetricCard
                title="Converted Leads"
                value={leadMetrics?.converted_leads.toLocaleString() || '0'}
                subtitle={`${((leadMetrics?.converted_leads / (leadMetrics?.total_leads || 1)) * 100).toFixed(1)}% conversion rate`}
                icon={Target}
              />
              <MetricCard
                title="Avg Lead Score"
                value={leadMetrics?.average_lead_score || 0}
                subtitle="Out of 100"
                icon={TrendingUp}
              />
            </div>

            {/* Top Lead Sources */}
            <Card>
              <CardHeader>
                <CardTitle>Top Lead Sources</CardTitle>
                <CardDescription>Where your best leads are coming from</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {leadMetrics?.top_sources.map((source, index) => (
                    <div key={source.source} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-construction-orange text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <span className="font-medium capitalize">{source.source}</span>
                      </div>
                      <span className="text-muted-foreground">{source.count} leads</span>
                    </div>
                  ))}
                  {(!leadMetrics?.top_sources || leadMetrics.top_sources.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">No lead sources yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Performance */}
          <TabsContent value="email" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Active Campaigns"
                value={emailMetrics?.total_campaigns || 0}
                subtitle="Email campaigns running"
                icon={Mail}
              />
              <MetricCard
                title="Total Sent"
                value={emailMetrics?.total_sent.toLocaleString() || '0'}
                subtitle="Emails delivered"
                icon={CheckCircle}
              />
              <MetricCard
                title="Avg Open Rate"
                value={`${emailMetrics?.average_open_rate.toFixed(1)}%` || '0%'}
                subtitle={`${emailMetrics?.total_opened.toLocaleString()} opens`}
                icon={TrendingUp}
              />
              <MetricCard
                title="Avg Click Rate"
                value={`${emailMetrics?.average_click_rate.toFixed(1)}%` || '0%'}
                subtitle={`${emailMetrics?.total_clicked.toLocaleString()} clicks`}
                icon={Target}
              />
            </div>

            {/* Top Campaigns */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Campaigns</CardTitle>
                <CardDescription>Campaigns ranked by open rate</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {emailMetrics?.top_campaigns.map((campaign, index) => (
                    <div key={campaign.campaign} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{campaign.campaign}</span>
                        <span className="text-muted-foreground">
                          {campaign.open_rate.toFixed(1)}% open rate
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-construction-orange rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(campaign.open_rate, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {(!emailMetrics?.top_campaigns || emailMetrics.top_campaigns.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">No campaigns yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onboarding Metrics */}
          <TabsContent value="onboarding" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Total Users"
                value={onboardingMetrics?.total_users.toLocaleString() || '0'}
                subtitle="Users with progress"
                icon={Users}
              />
              <MetricCard
                title="Completed"
                value={onboardingMetrics?.completed_users.toLocaleString() || '0'}
                subtitle={`${onboardingMetrics?.completion_rate.toFixed(1)}% completion rate`}
                icon={CheckCircle}
              />
              <MetricCard
                title="Avg Points"
                value={Math.round(onboardingMetrics?.average_points || 0)}
                subtitle="Out of 170 points"
                icon={Trophy}
              />
              <MetricCard
                title="Avg Tasks"
                value={onboardingMetrics?.average_tasks_completed.toFixed(1) || '0'}
                subtitle="Out of 9 tasks"
                icon={Activity}
              />
            </div>

            {/* Onboarding Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Onboarding Health</CardTitle>
                <CardDescription>
                  {onboardingMetrics?.completion_rate && onboardingMetrics.completion_rate > 50
                    ? 'Strong onboarding performance 🎉'
                    : 'Room for improvement in onboarding'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="font-medium">Completion Rate</span>
                      <span className="text-muted-foreground">
                        {onboardingMetrics?.completion_rate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-construction-orange to-green-500 rounded-full transition-all duration-500"
                        style={{ width: `${onboardingMetrics?.completion_rate || 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-construction-orange">
                        {Math.round((onboardingMetrics?.average_points / 170) * 100 || 0)}%
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">Avg Point Progress</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-construction-orange">
                        {Math.round((onboardingMetrics?.average_tasks_completed / 9) * 100 || 0)}%
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">Avg Task Progress</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ConversionAnalytics;
