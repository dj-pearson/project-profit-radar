/**
 * Unified Admin Intelligence Dashboard
 * Central hub for account health, revenue ops, trials, and support intelligence
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { RoleGuard, ROLE_GROUPS } from '@/components/auth/RoleGuard';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessiblePageWrapper } from '@/components/accessibility/AccessiblePageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { ErrorState } from '@/components/common/ErrorState';
import { useAdminIntelligence, type AccountHealth } from '@/hooks/useAdminIntelligence';
import { AlertTriangle, Users, DollarSign, Target, Mail, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const AdminIntelligenceDashboard = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();

  const intelligence = useAdminIntelligence();
  const atRiskAccounts = intelligence.data?.atRiskAccounts ?? [];
  const revenueMetrics = intelligence.data?.revenueMetrics ?? null;
  const trialStats = intelligence.data?.trialStats ?? null;
  const loadingData = intelligence.isLoading;
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
    }
  }, [user, userProfile, loading, navigate]);

  const loadDashboardData = () => { void intelligence.refetch(); };

  const handleAutoIntervene = async (account: AccountHealth) => {
    try {
      await intelligence.scheduleIntervention(account);
      toast({
        title: 'Success',
        description: `Automated intervention scheduled for ${account.company_name}`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to schedule intervention: ${error instanceof Error ? error.message : String(error)}`,
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
      <AccessiblePageWrapper pageTitle="Admin Intelligence">
      <DashboardLayout hasAccessibleWrapper title="Admin Intelligence" showTrialBanner={false}>
        <div className="space-y-6" role="status" aria-live="polite" aria-label="Loading content">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
            </div>
            <Skeleton className="h-[300px] rounded-lg" />
          </div>
      </DashboardLayout>
      </AccessiblePageWrapper>
    );
  }


  if (intelligence.error) {
    return (
      <AccessiblePageWrapper pageTitle="Admin Intelligence">
      <DashboardLayout hasAccessibleWrapper title="Admin Intelligence" showTrialBanner={false}>
        <ErrorState
          title="Dashboard data could not be loaded"
          error={intelligence.error}
          onRetry={loadDashboardData}
        />
      </DashboardLayout>
      </AccessiblePageWrapper>
    );
  }

  return (
    <RoleGuard allowedRoles={ROLE_GROUPS.ROOT_ADMIN}>
      <AccessiblePageWrapper pageTitle="Admin Intelligence">
      <DashboardLayout hasAccessibleWrapper
        title="Admin Intelligence" showTrialBanner={false}
        description="Proactive account management and revenue operations"
        headerActions={
          <Button onClick={loadDashboardData}>Refresh Data</Button>
        }
      >
        <div className="space-y-6">
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
                            <p>Last login: {account.last_login_days === null ? 'never' : `${account.last_login_days} days ago`}</p>
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
      </AccessiblePageWrapper>
    </RoleGuard>
  );
};

export default AdminIntelligenceDashboard;
