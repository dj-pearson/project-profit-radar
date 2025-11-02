import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  AlertTriangle,
  Heart,
  Activity,
  DollarSign,
  Calendar,
  Minus,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface CohortData {
  cohort: string;
  periods: Array<{
    period: number;
    retention_rate: number;
    active_users: number;
    cohort_size: number;
  }>;
}

interface HealthScoreDistribution {
  low: number; // 80-100
  medium: number; // 60-79
  high: number; // 40-59
  critical: number; // 0-39
}

interface ChurnRiskUser {
  user_id: string;
  email: string;
  health_score: number;
  churn_risk_score: number;
  churn_risk_level: string;
  days_since_login: number;
  active_projects: number;
}

export const RetentionAnalytics = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [cohortType, setCohortType] = useState<'signup' | 'paid'>('signup');
  const [cohortData, setCohortData] = useState<CohortData[]>([]);
  const [healthDistribution, setHealthDistribution] = useState<HealthScoreDistribution | null>(null);
  const [atRiskUsers, setAtRiskUsers] = useState<ChurnRiskUser[]>([]);

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

  // Load data
  useEffect(() => {
    loadData();
  }, [cohortType]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadCohortData(),
        loadHealthDistribution(),
        loadAtRiskUsers(),
      ]);
    } catch (error) {
      console.error('Failed to load retention data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load retention analytics.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCohortData = async () => {
    try {
      const { data, error } = await supabase.rpc('get_retention_curve', {
        p_cohort_type: cohortType,
        p_period_count: 12,
      });

      if (error) throw error;
      setCohortData(data || []);
    } catch (error) {
      console.error('Failed to load cohort data:', error);
    }
  };

  const loadHealthDistribution = async () => {
    try {
      const { data, error } = await supabase
        .from('user_health_scores')
        .select('churn_risk_level');

      if (error) throw error;

      const distribution = data?.reduce((acc, item) => {
        acc[item.churn_risk_level] = (acc[item.churn_risk_level] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      setHealthDistribution({
        low: distribution['low'] || 0,
        medium: distribution['medium'] || 0,
        high: distribution['high'] || 0,
        critical: distribution['critical'] || 0,
      });
    } catch (error) {
      console.error('Failed to load health distribution:', error);
    }
  };

  const loadAtRiskUsers = async () => {
    try {
      // Get users with high or critical churn risk
      const { data, error } = await supabase
        .from('user_health_scores')
        .select(`
          user_id,
          health_score,
          churn_risk_score,
          churn_risk_level,
          days_since_login,
          active_projects
        `)
        .in('churn_risk_level', ['high', 'critical'])
        .order('churn_risk_score', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Get user emails
      if (data && data.length > 0) {
        const userIds = data.map(u => u.user_id);
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, email')
          .in('id', userIds);

        const usersWithEmails = data.map(user => ({
          ...user,
          email: profiles?.find(p => p.id === user.user_id)?.email || 'Unknown',
        }));

        setAtRiskUsers(usersWithEmails);
      }
    } catch (error) {
      console.error('Failed to load at-risk users:', error);
    }
  };

  const getRetentionColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-500';
    if (rate >= 60) return 'bg-yellow-500';
    if (rate >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getRiskBadge = (level: string) => {
    const config = {
      low: { color: 'bg-green-500', label: 'Low Risk' },
      medium: { color: 'bg-yellow-500', label: 'Medium Risk' },
      high: { color: 'bg-orange-500', label: 'High Risk' },
      critical: { color: 'bg-red-500', label: 'Critical Risk' },
    };

    const { color, label } = config[level as keyof typeof config] || config.medium;

    return <Badge className={`${color} text-white`}>{label}</Badge>;
  };

  if (loading && cohortData.length === 0) {
    return (
      <DashboardLayout title="Retention Analytics">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Activity className="w-12 h-12 text-construction-orange animate-pulse mx-auto mb-4" />
            <p className="text-muted-foreground">Loading retention data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const totalUsers = healthDistribution
    ? healthDistribution.low + healthDistribution.medium + healthDistribution.high + healthDistribution.critical
    : 0;

  return (
    <DashboardLayout title="Retention Analytics">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-construction-dark">Retention Analytics</h1>
            <p className="text-muted-foreground">Monitor cohort retention and identify churn risks</p>
          </div>
          <Select value={cohortType} onValueChange={(v) => setCohortType(v as 'signup' | 'paid')}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="signup">Signup Cohorts</SelectItem>
              <SelectItem value="paid">Paid Cohorts</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Health Distribution Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Healthy</p>
                  <p className="text-2xl font-bold mt-2">{healthDistribution?.low || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totalUsers > 0 ? ((healthDistribution?.low || 0 / totalUsers) * 100).toFixed(1) : 0}% of users
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <Heart className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Medium Risk</p>
                  <p className="text-2xl font-bold mt-2">{healthDistribution?.medium || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totalUsers > 0 ? ((healthDistribution?.medium || 0 / totalUsers) * 100).toFixed(1) : 0}% of users
                  </p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <Activity className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">High Risk</p>
                  <p className="text-2xl font-bold mt-2">{healthDistribution?.high || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totalUsers > 0 ? ((healthDistribution?.high || 0 / totalUsers) * 100).toFixed(1) : 0}% of users
                  </p>
                </div>
                <div className="bg-orange-100 p-3 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Critical</p>
                  <p className="text-2xl font-bold mt-2 text-red-600">{healthDistribution?.critical || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totalUsers > 0 ? ((healthDistribution?.critical || 0 / totalUsers) * 100).toFixed(1) : 0}% of users
                  </p>
                </div>
                <div className="bg-red-100 p-3 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="cohorts" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cohorts">Cohort Analysis</TabsTrigger>
            <TabsTrigger value="at-risk">At-Risk Users</TabsTrigger>
          </TabsList>

          {/* Cohort Analysis */}
          <TabsContent value="cohorts" className="space-y-6">
            {/* Retention Curve Visualization */}
            <Card>
              <CardHeader>
                <CardTitle>Retention Curves</CardTitle>
                <CardDescription>
                  Track how well each cohort retains users over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cohortData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No cohort data available yet. Data will appear as users sign up and are tracked over time.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {cohortData.map((cohort) => (
                      <div key={cohort.cohort} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {cohort.cohort}
                          </span>
                          <span className="text-muted-foreground">
                            {cohort.periods[0]?.cohort_size || 0} users
                          </span>
                        </div>
                        <div className="grid grid-cols-12 gap-1">
                          {cohort.periods.map((period) => (
                            <div
                              key={period.period}
                              className="group relative"
                              title={`Month ${period.period}: ${period.retention_rate.toFixed(1)}% retained (${period.active_users}/${period.cohort_size})`}
                            >
                              <div
                                className={`h-12 rounded ${getRetentionColor(period.retention_rate)} transition-all hover:opacity-80 cursor-pointer`}
                                style={{
                                  opacity: Math.max(0.3, period.retention_rate / 100),
                                }}
                              >
                                <div className="flex items-center justify-center h-full text-white text-xs font-semibold">
                                  {period.retention_rate >= 50 && period.retention_rate.toFixed(0)}%
                                </div>
                              </div>
                              {/* Tooltip */}
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                M{period.period}: {period.retention_rate.toFixed(1)}%
                                <br />
                                {period.active_users}/{period.cohort_size} users
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Legend */}
            <Card>
              <CardHeader>
                <CardTitle>Understanding Retention</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-500 rounded"></div>
                    <span className="text-sm">Excellent (80%+)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-yellow-500 rounded"></div>
                    <span className="text-sm">Good (60-79%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-orange-500 rounded"></div>
                    <span className="text-sm">Fair (40-59%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-red-500 rounded"></div>
                    <span className="text-sm">Poor (&lt;40%)</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Each box represents a month since the cohort started. Darker/fuller boxes indicate higher retention.
                  Hover over boxes to see exact percentages and user counts.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* At-Risk Users */}
          <TabsContent value="at-risk" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Users at Risk of Churning</CardTitle>
                <CardDescription>
                  Customers who need immediate attention to prevent churn
                </CardDescription>
              </CardHeader>
              <CardContent>
                {atRiskUsers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No at-risk users identified. Great job maintaining customer health!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {atRiskUsers.map((user) => (
                      <div
                        key={user.user_id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <Users className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{user.email}</p>
                              <p className="text-sm text-muted-foreground">
                                {user.days_since_login} days since login • {user.active_projects} active projects
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-medium">Health: {user.health_score}/100</p>
                            <p className="text-xs text-muted-foreground">
                              Risk: {user.churn_risk_score}/100
                            </p>
                          </div>
                          {getRiskBadge(user.churn_risk_level)}
                          <Button size="sm" variant="outline">
                            Contact
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recommended Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Recommended Interventions</CardTitle>
                <CardDescription>
                  Strategies to reduce churn and improve retention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-900">Critical Risk Users</p>
                      <p className="text-sm text-red-700 mt-1">
                        Reach out personally within 24 hours. Offer 1-on-1 onboarding session or extended trial.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                    <Activity className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-orange-900">High Risk Users</p>
                      <p className="text-sm text-orange-700 mt-1">
                        Send targeted feature education emails. Highlight unused features that solve their pain points.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-900">Medium Risk Users</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Include in automated re-engagement campaigns. Send tips, best practices, and success stories.
                      </p>
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

export default RetentionAnalytics;
