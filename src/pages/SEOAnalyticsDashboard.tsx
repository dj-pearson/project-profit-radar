import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { toast } from 'sonner';
import { 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  MousePointer, 
  Search, 
  BarChart3,
  Brain,
  RefreshCw,
  AlertTriangle,
  Target,
  Globe,
  Smartphone,
  Monitor
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

interface SEOData {
  totalImpressions: number;
  totalClicks: number;
  averageCTR: string;
  averagePosition: string;
  topQueries: Array<{
    query: string;
    impressions: number;
    clicks: number;
    ctr: string;
    position: string;
  }>;
  topPages: Array<{
    page: string;
    impressions: number;
    clicks: number;
    ctr: string;
  }>;
}

interface AIInsights {
  insights: any;
  recommendations: any;
  actionPlan: any;
  competitorAnalysis: any;
}

const SEOAnalyticsDashboard: React.FC = () => {
  const [selectedDateRange, setSelectedDateRange] = useState(30);
  const [selectedEngine, setSelectedEngine] = useState<'google' | 'bing'>('google');
  const queryClient = useQueryClient();

  // Fetch analytics summary
  const { data: analyticsData, isLoading, error } = useQuery({
    queryKey: ['seo-analytics-summary'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('seo-analytics', {
        body: { action: 'get_analytics_summary' }
      });
      if (error) throw error;
      return data.data;
    },
  });

  // Fetch Google Search Console data
  const fetchGoogleData = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('seo-analytics', {
        body: { 
          action: 'fetch_google_search_console',
          data: {
            siteUrl: window.location.origin,
            startDate: new Date(Date.now() - selectedDateRange * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0]
          }
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-analytics-summary'] });
      toast.success('Google Search Console data updated');
    },
    onError: (error: any) => {
      toast.error(`Failed to fetch Google data: ${error.message}`);
    }
  });

  // Fetch Bing data
  const fetchBingData = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('seo-analytics', {
        body: { 
          action: 'fetch_bing_data',
          data: {
            siteUrl: window.location.origin,
            startDate: new Date(Date.now() - selectedDateRange * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0]
          }
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-analytics-summary'] });
      toast.success('Bing Webmaster data updated');
    },
    onError: (error: any) => {
      toast.error(`Failed to fetch Bing data: ${error.message}`);
    }
  });

  // Generate AI insights
  // OAuth Authentication mutations
  const getGoogleAuthUrl = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('seo-analytics', {
        body: { action: 'get_google_auth_url' }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      window.open(data.authUrl, '_blank', 'width=500,height=600');
    },
    onError: (error: any) => {
      toast.error(`Failed to get Google auth URL: ${error.message}`);
    }
  });

  const getMicrosoftAuthUrl = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('seo-analytics', {
        body: { action: 'get_microsoft_auth_url' }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      window.open(data.authUrl, '_blank', 'width=500,height=600');
    },
    onError: (error: any) => {
      toast.error(`Failed to get Microsoft auth URL: ${error.message}`);
    }
  });

  const generateInsights = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('seo-analytics', {
        body: { 
          action: 'generate_ai_insights',
          data: { userId: (await supabase.auth.getUser()).data.user?.id }
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-analytics-summary'] });
      toast.success('AI insights generated successfully');
    },
    onError: (error: any) => {
      toast.error(`Failed to generate insights: ${error.message}`);
    }
  });

  const refreshAllData = async () => {
    try {
      await Promise.all([
        fetchGoogleData.mutateAsync(),
        fetchBingData.mutateAsync()
      ]);
      await generateInsights.mutateAsync();
    } catch (error: any) {
      console.error('Error refreshing data:', error);
      
      // Handle specific error types
      if (error.message?.includes('OAuth credentials not configured')) {
        toast.error('SEO Analytics Setup Required', {
          description: 'Google Search Console requires OAuth credentials to be configured. Please contact your administrator.',
          duration: 10000,
        });
      } else if (error.message?.includes('Please authenticate')) {
        toast.error('Authentication Required', {
          description: 'Please connect your Google Search Console account using the "Connect Google" button.',
          duration: 5000,
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Error Loading SEO Analytics</h2>
          <p className="text-muted-foreground mb-4">Failed to load analytics data</p>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['seo-analytics-summary'] })}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const performanceData = analyticsData?.performance || {};
  const latestInsights = analyticsData?.insights?.[0];
  const analytics = analyticsData?.analytics || [];

  // Prepare chart data
  const chartData = analytics.slice(0, 30).reverse().map((item: any) => ({
    date: new Date(item.date).toLocaleDateString(),
    impressions: item.impressions,
    clicks: item.clicks,
    ctr: item.ctr,
    position: item.average_position
  }));

  return (
    <DashboardLayout title="SEO Analytics Dashboard">
      <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">SEO Analytics Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive website traffic analysis and insights</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => getGoogleAuthUrl.mutate()}
            disabled={getGoogleAuthUrl.isPending}
            variant="outline"
          >
            <Globe className="h-4 w-4 mr-2" />
            Connect Google
          </Button>
          <Button 
            onClick={() => getMicrosoftAuthUrl.mutate()}
            disabled={getMicrosoftAuthUrl.isPending}
            variant="outline"
          >
            <Globe className="h-4 w-4 mr-2" />
            Connect Bing
          </Button>
          <Button 
            onClick={refreshAllData}
            disabled={fetchGoogleData.isPending || fetchBingData.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${fetchGoogleData.isPending || fetchBingData.isPending ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
          <Button 
            onClick={() => generateInsights.mutate()}
            disabled={generateInsights.isPending}
            variant="outline"
          >
            <Brain className={`h-4 w-4 mr-2 ${generateInsights.isPending ? 'animate-pulse' : ''}`} />
            Generate AI Insights
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Impressions</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceData.totalImpressions?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              Times your site appeared in search results
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceData.totalClicks?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              Users who clicked through to your site
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average CTR</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceData.averageCTR || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Click-through rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Position</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceData.averagePosition || 0}</div>
            <p className="text-xs text-muted-foreground">
              Average ranking position
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="keywords">Keywords</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>Search visibility metrics over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="impressions" stackId="1" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="clicks" stackId="1" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Click-Through Rate Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="ctr" stroke="#ff7300" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Position Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis reversed />
                    <Tooltip />
                    <Line type="monotone" dataKey="position" stroke="#8884d8" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="keywords" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Keywords</CardTitle>
              <CardDescription>Keywords driving the most traffic to your site</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.[0]?.top_queries?.slice(0, 10).map((query: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{query.query}</h4>
                      <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                        <span>Position: {query.position}</span>
                        <span>CTR: {query.ctr}%</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{query.impressions?.toLocaleString()} impressions</div>
                      <div className="text-sm text-muted-foreground">{query.clicks?.toLocaleString()} clicks</div>
                    </div>
                  </div>
                )) || (
                  <p className="text-muted-foreground text-center py-8">
                    No keyword data available. Refresh data to load latest metrics.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Pages</CardTitle>
              <CardDescription>Pages with the highest search visibility</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.[0]?.top_pages?.slice(0, 10).map((page: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{page.page}</h4>
                      <div className="text-sm text-muted-foreground mt-1">
                        CTR: {page.ctr}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{page.impressions?.toLocaleString()} impressions</div>
                      <div className="text-sm text-muted-foreground">{page.clicks?.toLocaleString()} clicks</div>
                    </div>
                  </div>
                )) || (
                  <p className="text-muted-foreground text-center py-8">
                    No page data available. Refresh data to load latest metrics.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          {latestInsights ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>AI-Generated Insights</CardTitle>
                  <CardDescription>
                    Latest analysis from {new Date(latestInsights.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Array.isArray(latestInsights.insights) ? 
                      latestInsights.insights.map((insight: string, index: number) => (
                        <div key={index} className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                          <p>{insight}</p>
                        </div>
                      )) : (
                        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                          <p>{JSON.stringify(latestInsights.insights)}</p>
                        </div>
                      )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Array.isArray(latestInsights.recommendations) ? 
                      latestInsights.recommendations.map((rec: string, index: number) => (
                        <div key={index} className="flex items-start gap-2">
                          <Badge variant="secondary" className="mt-1">
                            {index + 1}
                          </Badge>
                          <p className="flex-1">{rec}</p>
                        </div>
                      )) : (
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                          <p>{JSON.stringify(latestInsights.recommendations)}</p>
                        </div>
                      )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Action Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Array.isArray(latestInsights.action_plan) ? 
                      latestInsights.action_plan.map((action: string, index: number) => (
                        <div key={index} className="flex items-start gap-2">
                          <Target className="h-4 w-4 mt-1 text-primary" />
                          <p className="flex-1">{action}</p>
                        </div>
                      )) : (
                        <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                          <p>{JSON.stringify(latestInsights.action_plan)}</p>
                        </div>
                      )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>AI Insights</CardTitle>
                <CardDescription>Generate AI-powered analysis of your SEO performance</CardDescription>
              </CardHeader>
              <CardContent className="text-center py-8">
                <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No AI insights available</h3>
                <p className="text-muted-foreground mb-4">
                  Generate AI-powered insights to get personalized recommendations for improving your SEO performance.
                </p>
                <Button onClick={() => generateInsights.mutate()} disabled={generateInsights.isPending}>
                  <Brain className={`h-4 w-4 mr-2 ${generateInsights.isPending ? 'animate-pulse' : ''}`} />
                  Generate Insights
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SEOAnalyticsDashboard;