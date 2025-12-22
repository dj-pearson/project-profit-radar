/**
 * Unified Admin Intelligence Dashboard
 * Central hub for account health, revenue ops, trials, and support intelligence
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { RoleGuard, ROLE_GROUPS } from '@/components/auth/RoleGuard';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Users,
  DollarSign,
  Target,
  Activity,
  Mail,
  Phone,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';

interface AccountHealth {
  company_id: string;
  company_name: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  last_login_days: number;
  active_projects: number;
  total_projects: number;
  trial_expires_in_days?: number;
  subscription_status: string;
}

interface RevenueMetrics {
  mrr: number;
  arr: number;
  new_revenue: number;
  expansion_revenue: number;
  contraction_revenue: number;
  churned_revenue: number;
  net_revenue_retention: number;
  total_customers: number;
  new_customers: number;
  churned_customers: number;
}

interface TrialStats {
  total_trials: number;
  expires_this_week: number;
  high_engagement: number;
  medium_engagement: number;
  low_engagement: number;
  conversion_rate: number;
}

const AdminIntelligenceDashboard = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();

  const [atRiskAccounts, setAtRiskAccounts] = useState<AccountHealth[]>([]);
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetrics | null>(null);
  const [trialStats, setTrialStats] = useState<TrialStats | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }

    if (!loading && userProfile && userProfile.role !== 'root_admin') {
      navigate('/dashboard');
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'Only root administrators can access this page.',
      });
      return;
    }

    if (userProfile?.role === 'root_admin') {
      loadDashboardData();
    }
  }, [user, userProfile, loading, navigate]);

  const loadDashboardData = async () => {
    try {
      setLoadingData(true);

      // Load all data in parallel
      await Promise.all([
        loadAtRiskAccounts(),
        loadRevenueMetrics(),
        loadTrialStats(),
      ]);
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load dashboard data',
      });
    } finally {
      setLoadingData(false);
    }
  };

  const loadAtRiskAccounts = async () => {
    // Get companies with low health scores
    const { data: healthScores, error } = await supabase
      .from('account_health_scores')
      .select(`
        *,
        companies!inner (
          id,
          name,
          subscription_status,
          trial_end_date
        )
      `)
      .or('risk_level.eq.high,risk_level.eq.critical')
      .order('score', { ascending: true })
      .limit(10);

    if (error) throw error;

    // Get additional context for each account
    const accountsWithContext = await Promise.all(
      (healthScores || []).map(async (score) => {
        const company = score.companies as any;

        // Get last login for primary user
        const { data: users } = await supabase
          .from('user_profiles')
          .select('last_login')
          .eq('company_id', company.id)
          .eq('role', 'admin')
          .order('last_login', { ascending: false })
          .limit(1)
          .single();

        // Get project stats
        const { count: totalProjects } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id);

        const { count: activeProjects } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id)
          .in('status', ['active', 'in_progress']);

        const lastLogin = users?.last_login
          ? Math.floor((new Date().getTime() - new Date(users.last_login).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        const trialExpiresIn = company.trial_end_date
          ? Math.floor((new Date(company.trial_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : undefined;

        return {
          company_id: company.id,
          company_name: company.name,
          score: score.score,
          trend: score.trend,
          risk_level: score.risk_level,
          last_login_days: lastLogin,
          active_projects: activeProjects || 0,
          total_projects: totalProjects || 0,
          trial_expires_in_days: trialExpiresIn,
          subscription_status: company.subscription_status,
        } as AccountHealth;
      })
    );

    setAtRiskAccounts(accountsWithContext);
  };

  const loadRevenueMetrics = async () => {
    // Get latest revenue metrics
    const { data, error } = await supabase
      .from('revenue_metrics')
      .select('*')
      .order('period_start', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // If no metrics exist, calculate them
      const calculated = await calculateCurrentRevenue();
      setRevenueMetrics(calculated);
    } else {
      setRevenueMetrics(data);
    }
  };

  const calculateCurrentRevenue = async (): Promise<RevenueMetrics> => {
    // Root admin can see all companies
    const { data: companies } = await supabase
      .from('companies')
      .select('*');

    const pricingMap: Record<string, number> = {
      starter: 149,
      professional: 299,
      enterprise: 599,
    };

    let mrr = 0;
    let activeCustomers = 0;

    (companies || []).forEach((company) => {
      if (company.subscription_status === 'active') {
        mrr += pricingMap[company.subscription_tier] || 0;
        activeCustomers++;
      }
    });

    return {
      mrr,
      arr: mrr * 12,
      new_revenue: 0,
      expansion_revenue: 0,
      contraction_revenue: 0,
      churned_revenue: 0,
      net_revenue_retention: 100,
      total_customers: activeCustomers,
      new_customers: 0,
      churned_customers: 0,
    };
  };

  const loadTrialStats = async () => {
    const { data: companies } = await supabase
      .from('companies')
      .select('id, trial_end_date')
      .eq('subscription_status', 'trial');

    if (!companies) {
      setTrialStats({
        total_trials: 0,
        expires_this_week: 0,
        high_engagement: 0,
        medium_engagement: 0,
        low_engagement: 0,
        conversion_rate: 0,
      });
      return;
    }

    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    let expiresThisWeek = 0;
    let highEngagement = 0;
    let mediumEngagement = 0;
    let lowEngagement = 0;

    for (const company of companies) {
      if (company.trial_end_date) {
        const trialEnd = new Date(company.trial_end_date);
        if (trialEnd <= oneWeekFromNow && trialEnd >= now) {
          expiresThisWeek++;
        }
      }

      // Get health score
      const { data: health } = await supabase
        .from('account_health_scores')
        .select('score')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (health) {
        if (health.score >= 70) highEngagement++;
        else if (health.score >= 40) mediumEngagement++;
        else lowEngagement++;
      }
    }

    setTrialStats({
      total_trials: companies.length,
      expires_this_week: expiresThisWeek,
      high_engagement: highEngagement,
      medium_engagement: mediumEngagement,
      low_engagement: lowEngagement,
      conversion_rate: 34, // Would calculate from historical data
    });
  };

  const handleAutoIntervene = async (account: AccountHealth) => {
    try {
      const interventionType = account.score < 40 ? 'low_engagement_email' : 'onboarding_help';
      const { error } = await supabase.from('admin_interventions').insert({
        company_id: account.company_id,
        intervention_type: interventionType,
        trigger_reason: `Low health score: ${account.score}`,
        status: 'scheduled',
        scheduled_for: new Date().toISOString(),
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Automated intervention scheduled for ${account.company_name}`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to schedule intervention',
      });
    }
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <ArrowUpRight className="h-4 w-4 text-green-500" />;
    if (trend === 'down') return <ArrowDownRight className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getRiskBadge = (risk: string) => {
    const variants: Record<string, any> = {
      critical: <Badge variant="destructive">Critical</Badge>,
      high: <Badge className="bg-orange-500">High Risk</Badge>,
      medium: <Badge variant="secondary">Medium Risk</Badge>,
      low: <Badge className="bg-green-500">Low Risk</Badge>,
    };
    return variants[risk] || variants.low;
  };

  if (loading || loadingData) {
    return (
      <DashboardLayout title="Admin Intelligence" showTrialBanner={false}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-construction-blue mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading intelligence dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <RoleGuard allowedRoles={ROLE_GROUPS.ROOT_ADMIN}>
      <DashboardLayout title="Admin Intelligence" showTrialBanner={false}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Admin Intelligence Dashboard</h1>
              <p className="text-muted-foreground">
                Proactive account management and revenue operations
              </p>
            </div>
            <Button onClick={loadDashboardData}>Refresh Data</Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="accounts">At-Risk Accounts</TabsTrigger>
              <TabsTrigger value="revenue">Revenue Ops</TabsTrigger>
              <TabsTrigger value="trials">Trial Pipeline</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Key Metrics */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">MRR</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${revenueMetrics?.mrr.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      ${revenueMetrics?.arr.toLocaleString()} ARR
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">At-Risk Accounts</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{atRiskAccounts.length}</div>
                    <p className="text-xs text-muted-foreground">Need immediate attention</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Trials</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{trialStats?.total_trials}</div>
                    <p className="text-xs text-muted-foreground">
                      {trialStats?.expires_this_week} expire this week
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {revenueMetrics?.total_customers}
                    </div>
                    <p className="text-xs text-muted-foreground">Active subscriptions</p>
                  </CardContent>
                </Card>
              </div>

              {/* At-Risk Accounts Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>🚨 At-Risk Accounts ({atRiskAccounts.length})</CardTitle>
                  <CardDescription>Companies that need immediate attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {atRiskAccounts.slice(0, 3).map((account) => (
                      <div
                        key={account.company_id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium">{account.company_name}</p>
                            {getRiskBadge(account.risk_level)}
                            {getTrendIcon(account.trend)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <p>Health Score: {account.score}/100</p>
                            <p>Last login: {account.last_login_days} days ago</p>
                            <p>
                              Projects: {account.active_projects}/{account.total_projects} active
                            </p>
                            {account.trial_expires_in_days !== undefined && (
                              <p className="text-orange-600 font-medium">
                                Trial expires in {account.trial_expires_in_days} days
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAutoIntervene(account)}
                          >
                            🤖 Auto-Intervene
                          </Button>
                          <Button size="sm" variant="outline">
                            <Mail className="h-3 w-3 mr-1" />
                            Email
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {atRiskAccounts.length > 3 && (
                    <Button
                      variant="link"
                      className="w-full mt-4"
                      onClick={() => setActiveTab('accounts')}
                    >
                      View all {atRiskAccounts.length} at-risk accounts
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Other tabs would be implemented similarly */}
            <TabsContent value="accounts">
              <Card>
                <CardHeader>
                  <CardTitle>All At-Risk Accounts</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Full list implementation...</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="revenue">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Operations</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Revenue analytics implementation...</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trials">
              <Card>
                <CardHeader>
                  <CardTitle>Trial Conversion Pipeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Trial management implementation...</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </RoleGuard>
  );
};

export default AdminIntelligenceDashboard;
