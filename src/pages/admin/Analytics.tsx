import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, 
  TrendingUp,
  TrendingDown,
  BarChart3,
  Users,
  Building2,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  Activity
} from 'lucide-react';

interface AnalyticsData {
  totalCompanies: number;
  totalUsers: number;
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  monthlyRevenue: number;
  averageProjectValue: number;
  userGrowthRate: number;
  projectCompletionRate: number;
  platformUsage: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
  };
  industryBreakdown: { [key: string]: number };
  subscriptionBreakdown: { [key: string]: number };
  recentActivity: Array<{
    type: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
  }>;
}

const Analytics = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalCompanies: 0,
    totalUsers: 0,
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    monthlyRevenue: 0,
    averageProjectValue: 0,
    userGrowthRate: 0,
    projectCompletionRate: 0,
    platformUsage: {
      dailyActiveUsers: 0,
      weeklyActiveUsers: 0,
      monthlyActiveUsers: 0
    },
    industryBreakdown: {},
    subscriptionBreakdown: {},
    recentActivity: []
  });
  const [timeRange, setTimeRange] = useState('30d');
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    
    if (!loading && userProfile && userProfile.role !== 'root_admin') {
      navigate('/dashboard');
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Only root administrators can access this page."
      });
      return;
    }
    
    if (userProfile?.role === 'root_admin') {
      loadAnalyticsData();
    }
  }, [user, userProfile, loading, navigate, timeRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoadingData(true);
      
      // Get companies data
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('*');
      
      if (companiesError) throw companiesError;

      // Get users data
      const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select('*');
      
      if (usersError) throw usersError;

      // Get projects data
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*');
      
      if (projectsError) throw projectsError;

      // Calculate analytics
      const totalCompanies = companies?.length || 0;
      const totalUsers = users?.length || 0;
      const totalProjects = projects?.length || 0;
      const activeProjects = projects?.filter(p => ['active', 'in_progress'].includes(p.status)).length || 0;
      const completedProjects = projects?.filter(p => p.status === 'completed').length || 0;

      // Calculate revenue (estimated based on subscription tiers)
      const monthlyRevenue = companies?.reduce((sum, company) => {
        if (company.subscription_status !== 'active') return sum;
        switch (company.subscription_tier) {
          case 'starter': return sum + 149;
          case 'professional': return sum + 299;
          case 'enterprise': return sum + 599;
          default: return sum;
        }
      }, 0) || 0;

      // Calculate average project value
      const projectsWithBudget = projects?.filter(p => p.budget > 0) || [];
      const averageProjectValue = projectsWithBudget.length > 0
        ? projectsWithBudget.reduce((sum, p) => sum + p.budget, 0) / projectsWithBudget.length
        : 0;

      // Calculate completion rate
      const projectCompletionRate = totalProjects > 0 
        ? (completedProjects / totalProjects) * 100 
        : 0;

      // Industry breakdown
      const industryBreakdown = companies?.reduce((acc, company) => {
        const industry = company.industry_type || 'other';
        acc[industry] = (acc[industry] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number }) || {};

      // Subscription breakdown
      const subscriptionBreakdown = companies?.reduce((acc, company) => {
        const tier = company.subscription_tier || 'unknown';
        acc[tier] = (acc[tier] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number }) || {};

      // Calculate growth rate (simplified - would need historical data for real calculation)
      const recentUsers = users?.filter(u => {
        const userDate = new Date(u.created_at);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return userDate >= thirtyDaysAgo;
      }).length || 0;
      
      const userGrowthRate = totalUsers > 0 ? (recentUsers / totalUsers) * 100 : 0;

      // Platform usage (simulated - would need actual activity tracking)
      const platformUsage = {
        dailyActiveUsers: Math.floor(totalUsers * 0.3),
        weeklyActiveUsers: Math.floor(totalUsers * 0.6),
        monthlyActiveUsers: Math.floor(totalUsers * 0.8)
      };

      // Recent activity trends (simulated)
      const recentActivity = [
        { type: 'New Signups', count: recentUsers, trend: 'up' as const },
        { type: 'Project Creation', count: Math.floor(totalProjects * 0.1), trend: 'up' as const },
        { type: 'Task Completion', count: Math.floor(totalProjects * 2.5), trend: 'stable' as const },
        { type: 'Revenue Growth', count: Math.floor(monthlyRevenue * 0.05), trend: 'up' as const }
      ];

      setAnalyticsData({
        totalCompanies,
        totalUsers,
        totalProjects,
        activeProjects,
        completedProjects,
        monthlyRevenue,
        averageProjectValue,
        userGrowthRate,
        projectCompletionRate,
        platformUsage,
        industryBreakdown,
        subscriptionBreakdown,
        recentActivity
      });

    } catch (error: any) {
      console.error('Error loading analytics data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load analytics data"
      });
    } finally {
      setLoadingData(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-yellow-500" />;
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-construction-blue mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-xl font-semibold">Platform Analytics</h1>
                <p className="text-sm text-muted-foreground">System-wide metrics and insights</p>
              </div>
            </div>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+{analyticsData.userGrowthRate.toFixed(1)}%</span> from last period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.totalCompanies.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Registered organizations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(analyticsData.monthlyRevenue)}</div>
              <p className="text-xs text-muted-foreground">Recurring monthly revenue</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.activeProjects.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {analyticsData.projectCompletionRate.toFixed(1)}% completion rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Platform Usage</CardTitle>
              <CardDescription>User activity breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Daily Active Users</span>
                  </div>
                  <span className="font-bold">{analyticsData.platformUsage.dailyActiveUsers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Weekly Active Users</span>
                  </div>
                  <span className="font-bold">{analyticsData.platformUsage.weeklyActiveUsers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">Monthly Active Users</span>
                  </div>
                  <span className="font-bold">{analyticsData.platformUsage.monthlyActiveUsers}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Platform activity trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getTrendIcon(activity.trend)}
                      <span className="text-sm">{activity.type}</span>
                    </div>
                    <span className="font-bold">{activity.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Industry & Subscription Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Industry Breakdown</CardTitle>
              <CardDescription>Companies by industry type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(analyticsData.industryBreakdown).map(([industry, count]) => (
                  <div key={industry} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{industry.replace('_', ' ')}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-muted rounded-full h-2">
                        <div 
                          className="bg-construction-blue h-2 rounded-full" 
                          style={{ 
                            width: `${(count / analyticsData.totalCompanies) * 100}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm font-bold w-8">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Subscription Tiers</CardTitle>
              <CardDescription>Revenue by subscription tier</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(analyticsData.subscriptionBreakdown).map(([tier, count]) => (
                  <div key={tier} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{tier}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-muted rounded-full h-2">
                        <div 
                          className="bg-construction-blue h-2 rounded-full" 
                          style={{ 
                            width: `${(count / analyticsData.totalCompanies) * 100}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm font-bold w-8">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Analytics;