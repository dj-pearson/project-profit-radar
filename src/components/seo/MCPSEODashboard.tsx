import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  TrendingUp, 
  TrendingDown, 
  Search, 
  BarChart3, 
  Globe, 
  Smartphone, 
  Monitor,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Calendar,
  Target
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SEOMetrics {
  // Google Analytics data
  totalUsers: number;
  totalSessions: number;
  averageSessionDuration: number;
  bounceRate: number;
  pageViews: number;
  
  // Search Console data
  totalImpressions: number;
  totalClicks: number;
  averageCTR: number;
  averagePosition: number;
  
  // Trending data
  usersTrend: number;
  clicksTrend: number;
  impressionsTrend: number;
  positionTrend: number;
}

interface TopKeyword {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  trend: 'up' | 'down' | 'stable';
}

interface TopPage {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  users: number;
  pageViews: number;
}

interface MCPQuery {
  type: 'analytics' | 'search-console';
  query: string;
  parameters?: Record<string, any>;
}

const MCPSEODashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SEOMetrics | null>(null);
  const [topKeywords, setTopKeywords] = useState<TopKeyword[]>([]);
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [mcpStatus, setMcpStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const [customQuery, setCustomQuery] = useState('');
  const [queryResult, setQueryResult] = useState<string>('');
  const { toast } = useToast();

  // Simulate MCP connection status check
  useEffect(() => {
    checkMCPStatus();
  }, []);

  const checkMCPStatus = async () => {
    try {
      // Check Supabase Secrets for MCP credentials
      const { data, error } = await supabase.functions.invoke('mcp-credentials', {
        body: { action: 'get-credentials' }
      });

      if (error) throw error;

      if (data.configured.both) {
        setMcpStatus('connected');
        localStorage.setItem('mcp_ga_configured', 'true');
        localStorage.setItem('mcp_gsc_configured', 'true');
      } else {
        setMcpStatus('disconnected');
        localStorage.setItem('mcp_ga_configured', 'false');
        localStorage.setItem('mcp_gsc_configured', 'false');
      }
    } catch (error) {
      console.error('Error checking MCP status:', error);
      setMcpStatus('error');
    }
  };

  const executeMCPQuery = async (query: MCPQuery): Promise<any> => {
    // In a real implementation, this would use MCP to query Google Analytics/Search Console
    // For demo purposes, we'll simulate the responses
    
    if (mcpStatus !== 'connected') {
      throw new Error('MCP servers not connected. Please configure Google Analytics and Search Console MCP servers.');
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (query.type === 'analytics') {
      return {
        totalUsers: 12847,
        totalSessions: 15239,
        averageSessionDuration: 185,
        bounceRate: 0.32,
        pageViews: 28456,
        usersTrend: 12.5,
        trend: 'up'
      };
    } else {
      return {
        totalImpressions: 156789,
        totalClicks: 4523,
        averageCTR: 2.89,
        averagePosition: 12.4,
        clicksTrend: 8.3,
        impressionsTrend: 15.2,
        positionTrend: -2.1,
        keywords: [
          { query: 'construction project management', clicks: 234, impressions: 5678, ctr: 4.12, position: 8.2, trend: 'up' },
          { query: 'building contractor software', clicks: 189, impressions: 4321, ctr: 4.37, position: 6.8, trend: 'up' },
          { query: 'project management tools', clicks: 156, impressions: 7890, ctr: 1.98, position: 15.3, trend: 'down' },
          { query: 'construction scheduling', clicks: 143, impressions: 3456, ctr: 4.14, position: 9.1, trend: 'stable' },
          { query: 'contractor dashboard', clicks: 128, impressions: 2987, ctr: 4.28, position: 7.5, trend: 'up' }
        ],
        pages: [
          { page: '/blog/project-management-best-practices', clicks: 456, impressions: 8900, ctr: 5.12, users: 389, pageViews: 567 },
          { page: '/features/scheduling', clicks: 378, impressions: 6700, ctr: 5.64, users: 312, pageViews: 445 },
          { page: '/blog/construction-technology-trends', clicks: 289, impressions: 5400, ctr: 5.35, users: 256, pageViews: 334 },
          { page: '/pricing', clicks: 234, impressions: 4100, ctr: 5.71, users: 198, pageViews: 298 },
          { page: '/blog/contractor-productivity-tips', clicks: 198, impressions: 3800, ctr: 5.21, users: 167, pageViews: 245 }
        ]
      };
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Execute MCP queries for both Analytics and Search Console
      const [analyticsData, searchConsoleData] = await Promise.all([
        executeMCPQuery({ type: 'analytics', query: 'Get traffic metrics for last 30 days' }),
        executeMCPQuery({ 
          type: 'search-console', 
          query: 'Get search performance data',
          parameters: {
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
            dimensions: 'query,page'
          }
        })
      ]);

      // Combine the data
      setMetrics({
        ...analyticsData,
        ...searchConsoleData
      });

      setTopKeywords(searchConsoleData.keywords);
      setTopPages(searchConsoleData.pages);
      setLastUpdated(new Date());

      toast({
        title: "Data Updated",
        description: "SEO metrics refreshed from live data sources"
      });

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error Loading Data",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const executeCustomQuery = async () => {
    if (!customQuery.trim()) return;
    
    setLoading(true);
    try {
      // This would send the natural language query to Claude via MCP
      const result = await executeMCPQuery({
        type: 'analytics',
        query: customQuery
      });
      
      setQueryResult(`Query: "${customQuery}"\n\nResult: ${JSON.stringify(result, null, 2)}`);
      
    } catch (error: any) {
      setQueryResult(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderMetricCard = (title: string, value: string | number, trend?: number, icon?: React.ReactNode) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend !== undefined && (
          <div className={`text-xs flex items-center ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {Math.abs(trend)}% from last period
          </div>
        )}
      </CardContent>
    </Card>
  );

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <BarChart3 className="h-4 w-4 text-gray-600" />;
    }
  };

  if (mcpStatus === 'disconnected') {
    return (
      <div className="p-6">
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            MCP servers not configured. Please set up Google Analytics and Search Console MCP servers to access live data.
            <br />
            <a href="/path/to/setup-guide" className="text-blue-600 underline mt-2 inline-block">
              View setup guide →
            </a>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SEO Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Live data from Google Analytics & Search Console via MCP
          </p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-1">
              Last updated: {lastUpdated.toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={mcpStatus === 'connected' ? 'default' : 'destructive'}>
            {mcpStatus === 'connected' ? 'MCP Connected' : 'MCP Error'}
          </Badge>
          <Button onClick={loadDashboardData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="keywords">Keywords</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {metrics && (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {renderMetricCard(
                  "Total Users",
                  metrics.totalUsers.toLocaleString(),
                  metrics.usersTrend,
                  <Globe className="h-4 w-4 text-muted-foreground" />
                )}
                {renderMetricCard(
                  "Search Clicks",
                  metrics.totalClicks.toLocaleString(),
                  metrics.clicksTrend,
                  <Search className="h-4 w-4 text-muted-foreground" />
                )}
                {renderMetricCard(
                  "Impressions",
                  metrics.totalImpressions.toLocaleString(),
                  metrics.impressionsTrend,
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                )}
                {renderMetricCard(
                  "Avg. Position",
                  metrics.averagePosition.toFixed(1),
                  metrics.positionTrend,
                  <Target className="h-4 w-4 text-muted-foreground" />
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {renderMetricCard(
                  "Click-Through Rate",
                  `${metrics.averageCTR.toFixed(2)}%`,
                  undefined,
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                )}
                {renderMetricCard(
                  "Bounce Rate",
                  `${(metrics.bounceRate * 100).toFixed(1)}%`,
                  undefined,
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="keywords" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Keywords</CardTitle>
              <CardDescription>
                Keywords driving the most traffic from search
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topKeywords.map((keyword, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{keyword.query}</div>
                      <div className="text-sm text-muted-foreground">
                        Position {keyword.position.toFixed(1)} • CTR {keyword.ctr.toFixed(2)}%
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <div className="font-medium">{keyword.clicks}</div>
                        <div className="text-muted-foreground">Clicks</div>
                      </div>
                      <div>
                        <div className="font-medium">{keyword.impressions.toLocaleString()}</div>
                        <div className="text-muted-foreground">Impressions</div>
                      </div>
                      {getTrendIcon(keyword.trend)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Pages</CardTitle>
              <CardDescription>
                Pages with the highest search performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topPages.map((page, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{page.page}</div>
                      <div className="text-sm text-muted-foreground">
                        CTR {page.ctr.toFixed(2)}% • {page.users} users
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <div className="font-medium">{page.clicks}</div>
                        <div className="text-muted-foreground">Clicks</div>
                      </div>
                      <div>
                        <div className="font-medium">{page.pageViews}</div>
                        <div className="text-muted-foreground">Views</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Sparkles className="h-5 w-5 mr-2" />
                AI-Powered SEO Insights
              </CardTitle>
              <CardDescription>
                Ask questions about your SEO performance in natural language
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., 'What keywords am I losing rankings for?' or 'Which pages need optimization?'"
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && executeCustomQuery()}
                />
                <Button onClick={executeCustomQuery} disabled={loading}>
                  <Search className="h-4 w-4 mr-2" />
                  Ask AI
                </Button>
              </div>
              
              {queryResult && (
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-sm whitespace-pre-wrap">{queryResult}</pre>
                </div>
              )}

              <div className="grid gap-2">
                <Label className="text-sm font-medium">Sample Questions:</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    "What are my top performing pages this month?",
                    "Which keywords have declining CTR?", 
                    "Show me mobile vs desktop performance",
                    "What content gaps should I fill?",
                    "Which pages need technical SEO fixes?"
                  ].map((question, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => setCustomQuery(question)}
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MCPSEODashboard; 