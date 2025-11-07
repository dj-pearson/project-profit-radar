import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Search,
  Globe,
  MousePointer,
  Eye,
  Users,
  FileText,
  Settings,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  Minus,
  Target,
  Lightbulb,
  Zap
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  AnalyticsPlatform,
  AnalyticsPlatformConnection,
  UnifiedTrafficMetrics,
  MetricComparison,
  DashboardFilters
} from '@/types/analytics';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = {
  primary: '#2563eb',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  google: '#4285f4',
  bing: '#008373',
  yandex: '#fc0',
};

const SearchTrafficDashboard: React.FC = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
  const [connections, setConnections] = useState<AnalyticsPlatformConnection[]>([]);
  const [trafficData, setTrafficData] = useState<UnifiedTrafficMetrics[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
    preset: '30days' as const
  });

  // Redirect if not admin
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }

    if (!loading && userProfile && userProfile.role !== 'root_admin') {
      navigate('/dashboard');
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'Only root administrators can access this dashboard.'
      });
    }

    if (userProfile?.role === 'root_admin') {
      loadDashboardData();
    }
  }, [user, userProfile, loading, navigate]);

  const loadDashboardData = async () => {
    try {
      setLoadingData(true);

      // Load platform connections
      const { data: connectionsData, error: connectionsError } = await supabase
        .from('analytics_platform_connections')
        .select('*')
        .order('created_at', { ascending: false });

      if (connectionsError) throw connectionsError;
      setConnections(connectionsData || []);

      // Load traffic metrics for the date range
      const { data: metricsData, error: metricsError } = await supabase
        .from('unified_traffic_metrics')
        .select('*')
        .gte('date', dateRange.start.toISOString().split('T')[0])
        .lte('date', dateRange.end.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (metricsError) throw metricsError;
      setTrafficData(metricsData || []);

    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load dashboard data'
      });
    } finally {
      setLoadingData(false);
    }
  };

  const syncAllPlatforms = async () => {
    try {
      setSyncing(true);

      const connectedPlatforms = connections.filter(c => c.is_connected);

      if (connectedPlatforms.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No Platforms Connected',
          description: 'Please connect at least one analytics platform first.'
        });
        return;
      }

      // Trigger sync for each platform
      for (const connection of connectedPlatforms) {
        const { error } = await supabase.functions.invoke('sync-analytics-data', {
          body: {
            connection_id: connection.id,
            platform: connection.platform_name,
            date_range: {
              start_date: dateRange.start.toISOString().split('T')[0],
              end_date: dateRange.end.toISOString().split('T')[0]
            }
          }
        });

        if (error) {
          console.error(`Error syncing ${connection.platform_name}:`, error);
        }
      }

      toast({
        title: 'Sync Started',
        description: 'Analytics data sync has been initiated. This may take a few minutes.'
      });

      // Reload data after a delay
      setTimeout(() => {
        loadDashboardData();
      }, 5000);

    } catch (error: any) {
      console.error('Error syncing platforms:', error);
      toast({
        variant: 'destructive',
        title: 'Sync Failed',
        description: 'Failed to sync analytics data'
      });
    } finally {
      setSyncing(false);
    }
  };

  // Calculate aggregated metrics
  const calculateMetrics = (): {
    totalSessions: MetricComparison;
    totalUsers: MetricComparison;
    totalImpressions: MetricComparison;
    totalClicks: MetricComparison;
    avgCTR: MetricComparison;
    avgPosition: MetricComparison;
  } => {
    const currentData = trafficData.filter(d =>
      new Date(d.date) >= dateRange.start && new Date(d.date) <= dateRange.end
    );

    const previousStart = new Date(dateRange.start);
    previousStart.setDate(previousStart.getDate() - (dateRange.end.getTime() - dateRange.start.getTime()) / (24 * 60 * 60 * 1000));
    const previousData = trafficData.filter(d =>
      new Date(d.date) >= previousStart && new Date(d.date) < dateRange.start
    );

    const calculateComparison = (
      currentSum: number,
      previousSum: number
    ): MetricComparison => {
      const change = currentSum - previousSum;
      const changePercent = previousSum > 0 ? (change / previousSum) * 100 : 0;
      return {
        current: currentSum,
        previous: previousSum,
        change,
        change_percent: changePercent,
        trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
      };
    };

    return {
      totalSessions: calculateComparison(
        currentData.reduce((sum, d) => sum + d.sessions, 0),
        previousData.reduce((sum, d) => sum + d.sessions, 0)
      ),
      totalUsers: calculateComparison(
        currentData.reduce((sum, d) => sum + d.users, 0),
        previousData.reduce((sum, d) => sum + d.users, 0)
      ),
      totalImpressions: calculateComparison(
        currentData.reduce((sum, d) => sum + d.impressions, 0),
        previousData.reduce((sum, d) => sum + d.impressions, 0)
      ),
      totalClicks: calculateComparison(
        currentData.reduce((sum, d) => sum + d.clicks, 0),
        previousData.reduce((sum, d) => sum + d.clicks, 0)
      ),
      avgCTR: calculateComparison(
        currentData.length > 0 ? currentData.reduce((sum, d) => sum + (d.ctr || 0), 0) / currentData.length : 0,
        previousData.length > 0 ? previousData.reduce((sum, d) => sum + (d.ctr || 0), 0) / previousData.length : 0
      ),
      avgPosition: calculateComparison(
        currentData.length > 0 ? currentData.reduce((sum, d) => sum + (d.average_position || 0), 0) / currentData.length : 0,
        previousData.length > 0 ? previousData.reduce((sum, d) => sum + (d.average_position || 0), 0) / previousData.length : 0
      ),
    };
  };

  const metrics = calculateMetrics();

  const MetricCard: React.FC<{
    title: string;
    icon: React.ReactNode;
    metric: MetricComparison;
    format?: 'number' | 'percent' | 'decimal';
    invertTrend?: boolean;
  }> = ({ title, icon, metric, format = 'number', invertTrend = false }) => {
    const formatValue = (value: number): string => {
      if (format === 'percent') return `${value.toFixed(2)}%`;
      if (format === 'decimal') return value.toFixed(2);
      return value.toLocaleString();
    };

    const trendIcon = metric.trend === 'up' ? <ArrowUp className="h-4 w-4" /> :
                      metric.trend === 'down' ? <ArrowDown className="h-4 w-4" /> :
                      <Minus className="h-4 w-4" />;

    const isPositive = invertTrend ? metric.trend === 'down' : metric.trend === 'up';
    const trendColor = metric.trend === 'stable' ? 'text-muted-foreground' :
                       isPositive ? 'text-green-600' : 'text-red-600';

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatValue(metric.current)}</div>
          <div className={`flex items-center text-xs ${trendColor} mt-1`}>
            {trendIcon}
            <span className="ml-1">
              {metric.change_percent > 0 ? '+' : ''}{metric.change_percent.toFixed(1)}%
            </span>
            <span className="text-muted-foreground ml-2">vs previous period</span>
          </div>
        </CardContent>
      </Card>
    );
  };

  const PlatformStatusBadge: React.FC<{ connection: AnalyticsPlatformConnection }> = ({ connection }) => {
    const statusConfig = {
      connected: { variant: 'default' as const, label: 'Connected', icon: CheckCircle },
      disconnected: { variant: 'outline' as const, label: 'Disconnected', icon: AlertTriangle },
      error: { variant: 'destructive' as const, label: 'Error', icon: AlertTriangle },
      expired: { variant: 'destructive' as const, label: 'Expired', icon: AlertTriangle },
      connecting: { variant: 'secondary' as const, label: 'Connecting...', icon: RefreshCw },
    };

    const config = statusConfig[connection.connection_status] || statusConfig.disconnected;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading search traffic dashboard...</p>
        </div>
      </div>
    );
  }

  const connectedCount = connections.filter(c => c.is_connected).length;
  const totalPlatforms = 4; // GA, GSC, Bing, Yandex

  return (
    <DashboardLayout title="Search Traffic Dashboard">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Search Traffic Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Unified analytics dashboard combining all major search and analytics platforms
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/admin/search-traffic-dashboard/settings')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button
              onClick={syncAllPlatforms}
              disabled={syncing || connectedCount === 0}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync All'}
            </Button>
          </div>
        </div>

        {/* Platform Status Overview */}
        {connectedCount < totalPlatforms && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You have {connectedCount} of {totalPlatforms} platforms connected.
              <Button
                variant="link"
                className="ml-2 p-0 h-auto"
                onClick={() => setActiveTab('settings')}
              >
                Connect more platforms
              </Button>
              {' '}to get comprehensive traffic insights.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">
              <Activity className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="search">
              <Search className="h-4 w-4 mr-2" />
              Search Performance
            </TabsTrigger>
            <TabsTrigger value="keywords">
              <Target className="h-4 w-4 mr-2" />
              Keywords
            </TabsTrigger>
            <TabsTrigger value="pages">
              <FileText className="h-4 w-4 mr-2" />
              Pages
            </TabsTrigger>
            <TabsTrigger value="insights">
              <Lightbulb className="h-4 w-4 mr-2" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Platforms
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <MetricCard
                title="Total Sessions"
                icon={<Users className="h-4 w-4 text-muted-foreground" />}
                metric={metrics.totalSessions}
              />
              <MetricCard
                title="Total Users"
                icon={<Users className="h-4 w-4 text-muted-foreground" />}
                metric={metrics.totalUsers}
              />
              <MetricCard
                title="Search Impressions"
                icon={<Eye className="h-4 w-4 text-muted-foreground" />}
                metric={metrics.totalImpressions}
              />
              <MetricCard
                title="Search Clicks"
                icon={<MousePointer className="h-4 w-4 text-muted-foreground" />}
                metric={metrics.totalClicks}
              />
              <MetricCard
                title="Average CTR"
                icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
                metric={metrics.avgCTR}
                format="percent"
              />
              <MetricCard
                title="Average Position"
                icon={<Target className="h-4 w-4 text-muted-foreground" />}
                metric={metrics.avgPosition}
                format="decimal"
                invertTrend={true}
              />
            </div>

            {/* Traffic Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Traffic Trends</CardTitle>
                <CardDescription>Daily sessions and search clicks over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={trafficData}>
                    <defs>
                      <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={COLORS.success} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="sessions"
                      stroke={COLORS.primary}
                      fillOpacity={1}
                      fill="url(#colorSessions)"
                      name="Sessions"
                    />
                    <Area
                      type="monotone"
                      dataKey="clicks"
                      stroke={COLORS.success}
                      fillOpacity={1}
                      fill="url(#colorClicks)"
                      name="Search Clicks"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Platform Breakdown */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Traffic by Platform</CardTitle>
                  <CardDescription>Session distribution across platforms</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {connections.filter(c => c.is_connected).map(connection => {
                      const platformData = trafficData.filter(d => d.platform_name === connection.platform_name);
                      const total = platformData.reduce((sum, d) => sum + d.sessions, 0);
                      const percentage = metrics.totalSessions.current > 0
                        ? (total / metrics.totalSessions.current * 100).toFixed(1)
                        : '0.0';

                      return (
                        <div key={connection.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{connection.platform_display_name}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{total.toLocaleString()}</div>
                            <div className="text-sm text-muted-foreground">{percentage}%</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Connected Platforms</CardTitle>
                  <CardDescription>Platform connection status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {['google_analytics', 'google_search_console', 'bing_webmaster', 'yandex_webmaster'].map(platform => {
                      const connection = connections.find(c => c.platform_name === platform);
                      const displayNames = {
                        'google_analytics': 'Google Analytics 4',
                        'google_search_console': 'Google Search Console',
                        'bing_webmaster': 'Bing Webmaster Tools',
                        'yandex_webmaster': 'Yandex Webmaster'
                      };

                      return (
                        <div key={platform} className="flex items-center justify-between p-3 border rounded-lg">
                          <span className="font-medium">{displayNames[platform as keyof typeof displayNames]}</span>
                          {connection ? (
                            <PlatformStatusBadge connection={connection} />
                          ) : (
                            <Badge variant="outline">Not Connected</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Search Performance Tab */}
          <TabsContent value="search" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Search Performance Overview</CardTitle>
                <CardDescription>Impressions, clicks, and CTR across all search platforms</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={trafficData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="impressions"
                      stroke={COLORS.google}
                      name="Impressions"
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="clicks"
                      stroke={COLORS.success}
                      name="Clicks"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="ctr"
                      stroke={COLORS.warning}
                      name="CTR (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Keywords Tab - Placeholder */}
          <TabsContent value="keywords" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Keyword Performance</CardTitle>
                <CardDescription>Top performing keywords across all search engines</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Keyword analysis data will appear here once synced</p>
                  <Button variant="outline" className="mt-4" onClick={syncAllPlatforms}>
                    Sync Data Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pages Tab - Placeholder */}
          <TabsContent value="pages" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Page Performance</CardTitle>
                <CardDescription>Analytics for individual pages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Page performance data will appear here once synced</p>
                  <Button variant="outline" className="mt-4" onClick={syncAllPlatforms}>
                    Sync Data Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Insights Tab - Placeholder */}
          <TabsContent value="insights" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>SEO Insights & Recommendations</CardTitle>
                <CardDescription>AI-powered insights to improve your search performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>SEO insights will be generated based on your data</p>
                  <Button variant="outline" className="mt-4" onClick={syncAllPlatforms}>
                    Generate Insights
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Platform Connections</CardTitle>
                <CardDescription>Manage your analytics platform integrations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    platform: 'google_analytics' as AnalyticsPlatform,
                    name: 'Google Analytics 4',
                    description: 'Track website traffic, user behavior, and conversions'
                  },
                  {
                    platform: 'google_search_console' as AnalyticsPlatform,
                    name: 'Google Search Console',
                    description: 'Monitor search rankings, impressions, and clicks from Google'
                  },
                  {
                    platform: 'bing_webmaster' as AnalyticsPlatform,
                    name: 'Bing Webmaster Tools',
                    description: 'Track Bing search performance and site health'
                  },
                  {
                    platform: 'yandex_webmaster' as AnalyticsPlatform,
                    name: 'Yandex Webmaster',
                    description: 'Monitor Yandex search performance (popular in Russia)'
                  }
                ].map(item => {
                  const connection = connections.find(c => c.platform_name === item.platform);

                  return (
                    <div key={item.platform} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{item.name}</h4>
                          {connection && <PlatformStatusBadge connection={connection} />}
                        </div>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        {connection?.last_synced_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Last synced: {new Date(connection.last_synced_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="ml-4">
                        {connection?.is_connected ? (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Disconnect logic here
                                toast({
                                  title: 'Disconnect',
                                  description: `Disconnecting ${item.name}...`
                                });
                              }}
                            >
                              Disconnect
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => {
                              // OAuth initiation logic here
                              toast({
                                title: 'Connect',
                                description: `Initiating OAuth for ${item.name}...`
                              });
                            }}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Connect
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SearchTrafficDashboard;
