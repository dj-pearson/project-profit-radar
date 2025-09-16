import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { enterpriseSeoService, SEORecommendation } from '@/services/EnterpriseSeOService';
import { toast } from '@/hooks/use-toast';
import {
  TrendingUp,
  TrendingDown,
  Search,
  Eye,
  MousePointer,
  AlertTriangle,
  CheckCircle,
  Target,
  BarChart3,
  Globe,
  Users,
  DollarSign,
  Zap,
  RefreshCw,
  ExternalLink,
  Award
} from 'lucide-react';

export interface SEOAnalyticsDashboardProps {
  className?: string;
}

export const SEOAnalyticsDashboard: React.FC<SEOAnalyticsDashboardProps> = ({
  className = ''
}) => {
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadPerformanceData = async () => {
    try {
      setLoading(true);
      const metrics = await enterpriseSeoService.getPerformanceMetrics();
      setPerformanceData(metrics);
      setLastUpdated(new Date());
    } catch (error: any) {
      console.error('Error loading SEO performance:', error);
      toast({
        title: "Error Loading SEO Data",
        description: "Unable to load SEO performance metrics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPerformanceData();
  }, []);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'important': return <Target className="h-4 w-4 text-orange-500" />;
      default: return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getRecommendationBadgeVariant = (type: string) => {
    switch (type) {
      case 'critical': return 'destructive' as const;
      case 'important': return 'warning' as const;
      default: return 'default' as const;
    }
  };

  const getRankingTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <div className="h-4 w-4" />;
  };

  if (!performanceData) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className={`h-8 w-8 mx-auto mb-4 ${loading ? 'animate-spin' : ''}`} />
            <p className="text-muted-foreground">
              {loading ? 'Loading SEO analytics...' : 'Click refresh to load data'}
            </p>
            <Button onClick={loadPerformanceData} className="mt-4" disabled={loading}>
              {loading ? 'Loading...' : 'Load Analytics'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            <div>
              <CardTitle>SEO Analytics Dashboard</CardTitle>
              <CardDescription>
                Comprehensive SEO performance monitoring and optimization insights
                {lastUpdated && (
                  <span className="ml-2 text-xs">
                    Updated {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadPerformanceData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Key Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Organic Traffic</p>
                  <p className="text-2xl font-bold">{formatNumber(performanceData.organicTraffic)}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Monthly visitors from search
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                  <p className="text-2xl font-bold">{performanceData.conversionRate}%</p>
                </div>
                <MousePointer className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Organic traffic to trial conversion
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Keywords Ranking</p>
                  <p className="text-2xl font-bold">{performanceData.keywordRankings.length}</p>
                </div>
                <Search className="h-8 w-8 text-purple-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Top 20 keyword positions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Revenue Impact</p>
                  <p className="text-2xl font-bold">$45K</p>
                </div>
                <DollarSign className="h-8 w-8 text-orange-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Monthly organic revenue
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="keywords" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="keywords" className="flex items-center">
              <Search className="h-4 w-4 mr-2" />
              Keywords
            </TabsTrigger>
            <TabsTrigger value="pages" className="flex items-center">
              <Globe className="h-4 w-4 mr-2" />
              Pages
            </TabsTrigger>
            <TabsTrigger value="competitors" className="flex items-center">
              <Target className="h-4 w-4 mr-2" />
              Competitors
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="flex items-center">
              <Zap className="h-4 w-4 mr-2" />
              Recommendations
            </TabsTrigger>
          </TabsList>

          {/* Keywords Tab */}
          <TabsContent value="keywords" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Keyword Performance</CardTitle>
                <CardDescription>
                  Track ranking positions and changes for target keywords
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {performanceData.keywordRankings.map((keyword: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getRankingTrendIcon(keyword.change)}
                        <div>
                          <p className="font-medium">{keyword.keyword}</p>
                          <p className="text-sm text-muted-foreground">
                            Position {keyword.position}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={keyword.change > 0 ? 'success' : keyword.change < 0 ? 'destructive' : 'default'}>
                          {keyword.change > 0 ? '+' : ''}{keyword.change}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Keyword Opportunities */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Keyword Opportunities</CardTitle>
                <CardDescription>
                  High-potential keywords to target for growth
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['construction field management app', 'OSHA compliance software', 'construction cost tracking'].map((keyword, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-sm">{keyword}</p>
                        <Badge variant="outline">320 searches</Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Difficulty: Medium</span>
                        <span>Value: $650</span>
                      </div>
                      <Progress value={65} className="mt-2 h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pages Tab */}
          <TabsContent value="pages" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Page Performance</CardTitle>
                <CardDescription>
                  SEO performance scores and optimization status for key pages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {performanceData.pagePerformance.map((page: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          page.score >= 90 ? 'bg-green-500' : 
                          page.score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                        <div>
                          <p className="font-medium">{page.route === '/' ? 'Homepage' : page.route}</p>
                          <p className="text-sm text-muted-foreground">
                            Score: {page.score}/100
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {page.issues > 0 && (
                          <Badge variant="warning">
                            {page.issues} issues
                          </Badge>
                        )}
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Technical SEO Health */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Technical SEO Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">98%</div>
                    <div className="text-sm text-muted-foreground">Core Web Vitals</div>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">100%</div>
                    <div className="text-sm text-muted-foreground">Mobile Friendly</div>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">95%</div>
                    <div className="text-sm text-muted-foreground">Schema Coverage</div>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">87%</div>
                    <div className="text-sm text-muted-foreground">Content Quality</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Competitors Tab */}
          <TabsContent value="competitors" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Competitor Gap Analysis</CardTitle>
                <CardDescription>
                  Keyword opportunities where competitors rank but you don't
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {performanceData.competitorGaps.map((gap: string, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{gap}</p>
                        <p className="text-sm text-muted-foreground">
                          Procore ranks #3, Buildertrend ranks #7
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">High opportunity</Badge>
                        <Button variant="ghost" size="sm">
                          <Target className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Competitor Rankings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Competitive Position</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: 'Procore', rank: 1, keywords: 2400, traffic: '2.1M' },
                    { name: 'Buildertrend', rank: 2, keywords: 1800, traffic: '890K' },
                    { name: 'PlanGrid', rank: 3, keywords: 1200, traffic: '650K' },
                    { name: 'BuildDesk', rank: 4, keywords: 180, traffic: '25K' },
                    { name: 'CoConstruct', rank: 5, keywords: 950, traffic: '420K' }
                  ].map((competitor, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                          competitor.name === 'BuildDesk' ? 'bg-blue-600' : 'bg-gray-400'
                        }`}>
                          {competitor.rank}
                        </div>
                        <div>
                          <p className="font-medium">{competitor.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {competitor.keywords} keywords, {competitor.traffic} traffic
                          </p>
                        </div>
                      </div>
                      {competitor.name === 'BuildDesk' && (
                        <Badge variant="default">
                          <Award className="h-3 w-3 mr-1" />
                          You
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-4">
            <div className="space-y-3">
              {performanceData.recommendations.map((rec: SEORecommendation, index: number) => (
                <Alert key={index}>
                  <div className="flex items-start space-x-3">
                    {getRecommendationIcon(rec.type)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{rec.title}</h4>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getRecommendationBadgeVariant(rec.type)}>
                            {rec.type}
                          </Badge>
                          <Badge variant="outline">
                            {rec.impact} impact
                          </Badge>
                        </div>
                      </div>
                      <AlertDescription>
                        {rec.description}
                      </AlertDescription>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>Effort: {rec.effort}</span>
                          <span>Priority: {rec.priority}</span>
                        </div>
                        <Button size="sm">
                          Implement
                        </Button>
                      </div>
                    </div>
                  </div>
                </Alert>
              ))}
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
                <CardDescription>
                  Common SEO improvements you can implement immediately
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button variant="outline" className="justify-start">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Optimize meta descriptions
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Target className="h-4 w-4 mr-2" />
                    Create competitor comparison page
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Globe className="h-4 w-4 mr-2" />
                    Add FAQ schema markup
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Zap className="h-4 w-4 mr-2" />
                    Improve page load speeds
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SEOAnalyticsDashboard;
