import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessiblePageWrapper } from '@/components/accessibility/AccessiblePageWrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { enterpriseSeoService } from '@/services/EnterpriseSeOService';
import { contentSeoGenerator, ContentSEOConfig } from '@/services/ContentSEOGenerator';
import { Search, Globe, BarChart3, Settings, FileText, Zap, Target, Rocket, CheckCircle, AlertTriangle, Eye, MousePointer, TrendingUp, Brain, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { logger } from '@/lib/logger';

import type { SEOConfig, MetaTag } from './unified-seo/types';
import { buildSchemaMarkup } from './unified-seo/schemaMarkup';
import { SEOAnalyticsTab } from './unified-seo/SEOAnalyticsTab';
import { SEOContentTab } from './unified-seo/SEOContentTab';
import { SEOMetaTagsTab } from './unified-seo/SEOMetaTagsTab';

const UnifiedSEODashboard = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [mcpConfigured, setMcpConfigured] = useState(false);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  
  // SEO Configuration
  const [config, setConfig] = useState<SEOConfig>({
    site_name: 'Brikly',
    site_description: 'Construction Management Platform for SMB Contractors',
    site_keywords: ['construction management', 'contractor software', 'project management', 'construction software'],
    default_og_image: '',
    google_analytics_id: '',
    google_search_console_id: '',
    canonical_domain: 'https://brikly.net',
    robots_txt: 'User-agent: *\nAllow: /',
    sitemap_enabled: true,
    schema_org_enabled: true
  });
  
  // Content Generation
  const [contentConfig, setContentConfig] = useState<Partial<ContentSEOConfig>>({
    targetAudience: 'contractors',
    contentType: 'blog_post',
    competitorAnalysis: false,
    includeSchema: true,
    wordCount: 2500,
    cta: 'Start Free Trial',
    internalLinks: []
  });
  const [generatedContent, setGeneratedContent] = useState<Record<string, unknown> | null>(null);
  
  // Meta Tags
  const [metaTags, setMetaTags] = useState<MetaTag[]>([]);
  const [newMetaTag, setNewMetaTag] = useState<MetaTag>({
    page_path: '',
    title: '',
    description: '',
    keywords: [],
    og_title: '',
    og_description: '',
    og_image: '',
    canonical_url: '',
    no_index: false,
    no_follow: false
  });

  // Authentication and permission check
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    
    if (!loading && userProfile && userProfile.role !== 'root_admin') {
      navigate('/dashboard');
      toast.error('Access denied. Only root administrators can access SEO management.');
      return;
    }
    
    if (userProfile?.role === 'root_admin') {
      checkAPICredentials();
      loadSEOData();
    }
  }, [user, userProfile, loading, navigate]);

  // Check API credentials
  const checkAPICredentials = async () => {
    try {
      setChecking(true);
      
      const { error } = await supabase.functions.invoke('google-analytics-api', {
        body: { action: 'get-metrics', dateRange: { startDate: '7daysAgo', endDate: 'today' } }
      });

      if (error) {
        console.error('API credentials not configured:', error);
        setMcpConfigured(false);
        return;
      }

      setMcpConfigured(true);
    } catch (error) {
      console.error('Error checking API credentials:', error);
      setMcpConfigured(false);
    } finally {
      setChecking(false);
    }
  };

  // Load SEO data
  const loadSEOData = async () => {
    try {
      // Load SEO configuration
      const { data: configData } = await supabase
        .from('seo_configurations')
        .select('*')
        .limit(1)
        .single();

      if (configData) {
        setConfig(configData);
      }

      // Load meta tags
      const { data: metaData } = await supabase
        .from('seo_meta_tags')
        .select('*')
        .order('page_path');

      if (metaData) {
        setMetaTags(metaData);
      }
    } catch (error: unknown) {
      console.error('Error loading SEO data:', error);
    }
  };

  // Fetch analytics data
  const { data: analyticsData } = useQuery({
    queryKey: ['unified-seo-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('seo-analytics', {
        body: { action: 'get_analytics_summary' }
      });
      if (error) throw error;
      return data.data;
    },
    enabled: mcpConfigured
  });

  // SEO Actions
  const initializeSEO = async () => {
    try {
      setIsInitializing(true);
      await enterpriseSeoService.initializePlatformSEO();
      toast.success('SEO System Initialized', {
        description: 'Enterprise SEO optimization is now active across all pages'
      });
    } catch (error: unknown) {
      toast.error('Initialization Error', {
        description: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const saveConfiguration = async () => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('seo_configurations')
        .upsert(config, { onConflict: 'id' });

      if (error) throw error;

      toast.success('SEO configuration saved successfully');
    } catch (error: unknown) {
      console.error('Error saving configuration:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const generateContent = async () => {
    if (!contentConfig.title || !contentConfig.primaryKeyword) {
      toast.error('Please provide a title and primary keyword');
      return;
    }

    try {
      setIsGenerating(true);
      const result = await contentSeoGenerator.generateContent(contentConfig as ContentSEOConfig);
      setGeneratedContent(result);
      toast.success(`SEO-optimized content created with ${result.seoScore}/100 score`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setIsGenerating(false);
    }
  };

  const generateSitemap = async () => {
    try {
      setIsGenerating(true);
      
      // Generate dynamic sitemap
      const { error } = await supabase.functions.invoke('sitemap-generator', {
        body: {},
      });

      if (error) throw error;

      // Also generate static file-based sitemap
      const { error: fileError } = await supabase.functions.invoke('generate-sitemap-file', {
        body: {},
      });

      if (fileError) {
        logger.warn('File-based sitemap generation failed:', fileError);
      }

      // Update robots.txt to include sitemap reference if needed
      const sitemapUrl = `${config.canonical_domain}/sitemap.xml`;
      if (!config.robots_txt.includes('Sitemap:')) {
        const updatedRobots = `${config.robots_txt}\nSitemap: ${sitemapUrl}`;
        await updateRobotsTxt(updatedRobots);
      }

      toast.success('Sitemap generated and robots.txt updated successfully');
    } catch (error: unknown) {
      toast.error('Failed to generate sitemap: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsGenerating(false);
    }
  };

  const updateRobotsTxt = async (robotsContent?: string) => {
    try {
      setIsGenerating(true);
      
      // Generate robots.txt using edge function
      const { data, error } = await supabase.functions.invoke('seo-file-generator', {
        body: { fileType: 'robots' },
      });

      if (error) throw error;

      // Update the config with the generated content
      setConfig(prev => ({ ...prev, robots_txt: data }));
      
      toast.success('Robots.txt updated and saved to storage');
    } catch (error: unknown) {
      console.error('Error updating robots.txt:', error);
      toast.error('Failed to update robots.txt: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsGenerating(false);
    }
  };

  const generateSchemaMarkup = async () => {
    try {
      setIsGenerating(true);
      
      const schemaMarkup = buildSchemaMarkup(config);

      // Copy to clipboard
      await navigator.clipboard.writeText(schemaMarkup);
      
      toast.success('Schema markup generated and copied to clipboard');
    } catch (error: unknown) {
      console.error('Error generating schema markup:', error);
      toast.error('Failed to generate schema markup: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsGenerating(false);
    }
  };

  const generateLLMsFile = async () => {
    try {
      setIsGenerating(true);
      
      // Generate LLMs.txt using edge function
      const { data, error } = await supabase.functions.invoke('seo-file-generator', {
        body: { fileType: 'llms' },
      });

      if (error) throw error;

      // Copy to clipboard for manual placement
      await navigator.clipboard.writeText(data);
      
      toast.success('LLMs.txt generated, saved to storage, and copied to clipboard');
    } catch (error: unknown) {
      console.error('Error generating LLMs.txt:', error);
      toast.error('Failed to generate LLMs.txt: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsGenerating(false);
    }
  };

  const runSEOAudit = async () => {
    try {
      setIsGenerating(true);
      
      const auditResults = [];
      
      // Check if sitemap exists
      try {
        const response = await fetch(`${config.canonical_domain}/sitemap.xml`);
        auditResults.push({
          category: 'Technical SEO',
          item: 'Sitemap',
          status: response.ok ? 'good' : 'warning',
          message: response.ok ? 'Sitemap found and accessible' : 'Sitemap not found or not accessible'
        });
      } catch (error) {
        auditResults.push({
          category: 'Technical SEO',
          item: 'Sitemap',
          status: 'error',
          message: 'Could not check sitemap accessibility'
        });
      }
      
      // Check if robots.txt exists
      try {
        const response = await fetch(`${config.canonical_domain}/robots.txt`);
        auditResults.push({
          category: 'Technical SEO',
          item: 'Robots.txt',
          status: response.ok ? 'good' : 'warning',
          message: response.ok ? 'Robots.txt found and accessible' : 'Robots.txt not found or not accessible'
        });
      } catch (error) {
        auditResults.push({
          category: 'Technical SEO',
          item: 'Robots.txt',
          status: 'error',
          message: 'Could not check robots.txt accessibility'
        });
      }
      
      // Check meta descriptions
      auditResults.push({
        category: 'Content SEO',
        item: 'Meta Description',
        status: config.site_description.length > 150 ? 'warning' : 'good',
        message: config.site_description.length > 150 ? 'Meta description is too long (>150 characters)' : 'Meta description length is optimal'
      });
      
      // Check keywords
      auditResults.push({
        category: 'Content SEO',
        item: 'Keywords',
        status: config.site_keywords.length > 0 ? 'good' : 'warning',
        message: config.site_keywords.length > 0 ? `${config.site_keywords.length} keywords configured` : 'No keywords configured'
      });
      
      // Check social media integration
      auditResults.push({
        category: 'Social SEO',
        item: 'Open Graph',
        status: config.default_og_image ? 'good' : 'warning',
        message: config.default_og_image ? 'Open Graph image configured' : 'No Open Graph image configured'
      });
      
      // Check analytics
      auditResults.push({
        category: 'Analytics',
        item: 'Google Analytics',
        status: config.google_analytics_id ? 'good' : 'warning',
        message: config.google_analytics_id ? 'Google Analytics configured' : 'Google Analytics not configured'
      });
      
      // Check search console
      auditResults.push({
        category: 'Analytics',
        item: 'Search Console',
        status: config.google_search_console_id ? 'good' : 'warning',
        message: config.google_search_console_id ? 'Google Search Console configured' : 'Google Search Console not configured'
      });

      // Store audit results
      
      const goodCount = auditResults.filter(r => r.status === 'good').length;
      const warningCount = auditResults.filter(r => r.status === 'warning').length;
      const errorCount = auditResults.filter(r => r.status === 'error').length;
      
      toast.success(`SEO Audit Complete: ${goodCount} good, ${warningCount} warnings, ${errorCount} errors. Check console for details.`);
    } catch (error: unknown) {
      console.error('Error running SEO audit:', error);
      toast.error('Failed to run SEO audit: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsGenerating(false);
    }
  };

  const addMetaTag = async () => {
    if (!newMetaTag.page_path || !newMetaTag.title) {
      toast.error('Page path and title are required');
      return;
    }

    try {
      const { error } = await supabase
        .from('seo_meta_tags')
        .insert([newMetaTag]);

      if (error) throw error;

      toast.success('Meta tag added successfully');
      setNewMetaTag({
        page_path: '',
        title: '',
        description: '',
        keywords: [],
        og_title: '',
        og_description: '',
        og_image: '',
        canonical_url: '',
        no_index: false,
        no_follow: false
      });
      loadSEOData();
    } catch (error: unknown) {
      toast.error('Failed to add meta tag');
    }
  };

  // Refresh analytics data
  const refreshAllData = async () => {
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['unified-seo-analytics'] }),
        checkAPICredentials()
      ]);
      toast.success('SEO data refreshed');
    } catch (error: unknown) {
      toast.error('Failed to refresh data');
    }
  };

  // Quick actions configuration
  const quickActions = [
    {
      title: 'Initialize SEO System',
      description: 'Set up enterprise SEO optimization for all pages',
      icon: Rocket,
      action: initializeSEO,
      loading: isInitializing,
      variant: 'default' as const
    },
    {
      title: 'Generate Sitemap',
      description: 'Create XML sitemap for search engines',
      icon: Globe,
      action: generateSitemap,
      loading: isGenerating,
      variant: 'outline' as const
    },
    {
      title: 'Update Robots.txt',
      description: 'Generate SEO-friendly robots.txt directives',
      icon: FileText,
      action: () => updateRobotsTxt(),
      variant: 'outline' as const
    },
    {
      title: 'Generate Schema Markup',
      description: 'Create structured data for better SERP visibility',
      icon: Brain,
      action: generateSchemaMarkup,
      loading: isGenerating,
      variant: 'outline' as const
    },
    {
      title: 'Generate LLMs.txt',
      description: 'Create AI training guidelines file',
      icon: Target,
      action: generateLLMsFile,
      loading: isGenerating,
      variant: 'outline' as const
    },
    {
      title: 'Run SEO Audit',
      description: 'Comprehensive SEO health check',
      icon: CheckCircle,
      action: runSEOAudit,
      loading: isGenerating,
      variant: 'outline' as const
    },
    {
      title: 'Refresh Analytics',
      description: 'Update SEO performance data',
      icon: RefreshCw,
      action: refreshAllData,
      variant: 'outline' as const
    },
    {
      title: 'Check Configuration',
      description: 'Verify API credentials and settings',
      icon: Settings,
      action: checkAPICredentials,
      variant: 'outline' as const
    }
  ];

  if (loading || checking) {
    return (
      <AccessiblePageWrapper pageTitle="SEO Management">
      <DashboardLayout hasAccessibleWrapper title="SEO Management">
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
      </AccessiblePageWrapper>
    );
  }

  if (!user || userProfile?.role !== 'root_admin') {
    return (
      <AccessiblePageWrapper pageTitle="SEO Management">
      <DashboardLayout hasAccessibleWrapper title="SEO Management">
        <div className="flex items-center justify-center py-12">
          <Card className="w-96">
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
                Access Restricted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                This feature requires root admin access. SEO management provides comprehensive tools for website optimization.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
      </AccessiblePageWrapper>
    );
  }

  const performanceData = analyticsData?.performance || {};
  const analytics = analyticsData?.analytics || [];

  // Prepare chart data
  const chartData = analytics.slice(0, 30).reverse().map((item: { date: string; impressions: number; clicks: number; ctr: number; average_position: number }) => ({
    date: new Date(item.date).toLocaleDateString(),
    impressions: item.impressions,
    clicks: item.clicks,
    ctr: item.ctr,
    position: item.average_position
  }));

  return (
    <AccessiblePageWrapper pageTitle="SEO Management">
    <DashboardLayout hasAccessibleWrapper
      title="SEO Management"
      description="Complete SEO management dashboard with analytics, configuration, content generation, and optimization tools"
      headerActions={
        <div className="flex items-center justify-center space-x-4">
          <Badge variant={mcpConfigured ? "default" : "destructive"} className="text-sm px-3 py-1">
            {mcpConfigured ? <CheckCircle className="h-4 w-4 mr-1" /> : <AlertTriangle className="h-4 w-4 mr-1" />}
            {mcpConfigured ? 'APIs Connected' : 'APIs Not Configured'}
          </Badge>
          <Badge variant="outline" className="text-sm px-3 py-1">
            {performanceData.totalImpressions?.toLocaleString() || 0} Impressions
          </Badge>
          <Badge variant="outline" className="text-sm px-3 py-1">
            {performanceData.totalClicks?.toLocaleString() || 0} Clicks
          </Badge>
        </div>
      }
    >
      <div className="space-y-6">
        {/* API Status Alert */}
        {!mcpConfigured && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <div className="flex items-center justify-between">
                <div>
                  <strong>Google APIs Not Configured:</strong> Add Google Analytics and Search Console credentials to see real SEO data.
                </div>
                <Button variant="outline" size="sm" onClick={checkAPICredentials}>
                  Check Configuration
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="h-5 w-5 mr-2" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Launch high-impact SEO initiatives with one click
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action, index) => (
                <Card key={index} className="relative overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <action.icon className="h-8 w-8 text-blue-600" />
                      <Badge variant="outline">Action</Badge>
                    </div>
                    <h3 className="font-semibold mb-2">{action.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {action.description}
                    </p>
                    <Button 
                      variant={action.variant}
                      size="sm" 
                      className="w-full"
                      onClick={action.action}
                      disabled={action.loading || isGenerating}
                    >
                      {action.loading ? 'Processing...' : 'Launch'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="configuration" className="flex items-center">
              <Settings className="h-4 w-4 mr-2" />
              Configuration
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Content
            </TabsTrigger>
            <TabsTrigger value="meta-tags" className="flex items-center">
              <Target className="h-4 w-4 mr-2" />
              Meta Tags
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Impressions</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{performanceData.totalImpressions?.toLocaleString() || 0}</div>
                  <p className="text-xs text-muted-foreground">Search result appearances</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
                  <MousePointer className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{performanceData.totalClicks?.toLocaleString() || 0}</div>
                  <p className="text-xs text-muted-foreground">Click-throughs to site</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average CTR</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{performanceData.averageCTR || 0}%</div>
                  <p className="text-xs text-muted-foreground">Click-through rate</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Position</CardTitle>
                  <Search className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{performanceData.averagePosition || 0}</div>
                  <p className="text-xs text-muted-foreground">Search ranking position</p>
                </CardContent>
              </Card>
            </div>

            {/* Performance Chart */}
            {mcpConfigured && chartData.length > 0 && (
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
                      <Area type="monotone" dataKey="impressions" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                      <Area type="monotone" dataKey="clicks" stackId="1" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary))" fillOpacity={0.6} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <SEOAnalyticsTab
              mcpConfigured={mcpConfigured}
              analytics={analytics}
              checkAPICredentials={checkAPICredentials}
            />
          </TabsContent>

          {/* Configuration Tab */}
          <TabsContent value="configuration" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Site Configuration</CardTitle>
                <CardDescription>Manage your website's SEO settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Site Name</label>
                    <Input
                      value={config.site_name}
                      onChange={(e) => setConfig({...config, site_name: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Canonical Domain</label>
                    <Input
                      value={config.canonical_domain}
                      onChange={(e) => setConfig({...config, canonical_domain: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Site Description</label>
                  <Textarea
                    value={config.site_description}
                    onChange={(e) => setConfig({...config, site_description: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Google Analytics ID</label>
                    <Input
                      placeholder="G-XXXXXXXXXX"
                      value={config.google_analytics_id}
                      onChange={(e) => setConfig({...config, google_analytics_id: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Search Console ID</label>
                    <Input
                      placeholder="https://yoursite.com"
                      value={config.google_search_console_id}
                      onChange={(e) => setConfig({...config, google_search_console_id: e.target.value})}
                    />
                  </div>
                </div>

                <Button onClick={saveConfiguration} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Configuration'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Generation Tab */}
          <TabsContent value="content" className="space-y-4">
            <SEOContentTab
              contentConfig={contentConfig}
              setContentConfig={setContentConfig}
              generateContent={generateContent}
              isGenerating={isGenerating}
              generatedContent={generatedContent}
            />
          </TabsContent>

          {/* Meta Tags Tab */}
          <TabsContent value="meta-tags" className="space-y-4">
            <SEOMetaTagsTab
              newMetaTag={newMetaTag}
              setNewMetaTag={setNewMetaTag}
              addMetaTag={addMetaTag}
              metaTags={metaTags}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
    </AccessiblePageWrapper>
  );
};

export default UnifiedSEODashboard;
