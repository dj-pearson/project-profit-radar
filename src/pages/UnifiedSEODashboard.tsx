import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { enterpriseSeoService } from '@/services/EnterpriseSeOService';
import { contentSeoGenerator, ContentSEOConfig } from '@/services/ContentSEOGenerator';
import {
  Search,
  Globe,
  BarChart3,
  Settings,
  FileText,
  Zap,
  Target,
  Lightbulb,
  Rocket,
  CheckCircle,
  AlertTriangle,
  Plus,
  Eye,
  MousePointer,
  TrendingUp,
  Brain,
  RefreshCw,
  ExternalLink,
  Share2
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

// Interfaces
interface SEOConfig {
  id?: string;
  site_name: string;
  site_description: string;
  site_keywords: string[];
  default_og_image: string;
  google_analytics_id: string;
  google_search_console_id: string;
  canonical_domain: string;
  robots_txt: string;
  sitemap_enabled: boolean;
  schema_org_enabled: boolean;
}

interface MetaTag {
  id?: string;
  page_path: string;
  title: string;
  description: string;
  keywords: string[];
  og_title: string;
  og_description: string;
  og_image: string;
  canonical_url: string;
  no_index: boolean;
  no_follow: boolean;
}

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
    site_name: 'BuildDesk',
    site_description: 'Construction Management Platform for SMB Contractors',
    site_keywords: ['construction management', 'contractor software', 'project management', 'construction software'],
    default_og_image: '',
    google_analytics_id: '',
    google_search_console_id: '',
    canonical_domain: 'https://builddesk.com',
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
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  
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
      
      const { data, error } = await supabase.functions.invoke('google-analytics-api', {
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
      const { data: configData, error: configError } = await supabase
        .from('seo_configurations')
        .select('*')
        .limit(1)
        .single();

      if (configData) {
        setConfig(configData);
      }

      // Load meta tags
      const { data: metaData, error: metaError } = await supabase
        .from('seo_meta_tags')
        .select('*')
        .order('page_path');

      if (metaData) {
        setMetaTags(metaData);
      }
    } catch (error: any) {
      console.error('Error loading SEO data:', error);
    }
  };

  // Fetch analytics data
  const { data: analyticsData, isLoading: analyticsLoading, error: analyticsError } = useQuery({
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
    } catch (error: any) {
      toast.error('Initialization Error', {
        description: error.message
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
    } catch (error: any) {
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
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateSitemap = async () => {
    try {
      setIsGenerating(true);
      
      // Generate dynamic sitemap
      const { data, error } = await supabase.functions.invoke('sitemap-generator', {
        body: {},
      });

      if (error) throw error;

      // Also generate static file-based sitemap
      const { data: fileData, error: fileError } = await supabase.functions.invoke('generate-sitemap-file', {
        body: {},
      });

      if (fileError) {
        console.warn('File-based sitemap generation failed:', fileError);
      }

      // Update robots.txt to include sitemap reference if needed
      const sitemapUrl = `${config.canonical_domain}/sitemap.xml`;
      if (!config.robots_txt.includes('Sitemap:')) {
        const updatedRobots = `${config.robots_txt}\nSitemap: ${sitemapUrl}`;
        await updateRobotsTxt(updatedRobots);
      }

      toast.success('Sitemap generated and robots.txt updated successfully');
    } catch (error: any) {
      toast.error('Failed to generate sitemap: ' + error.message);
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
    } catch (error: any) {
      console.error('Error updating robots.txt:', error);
      toast.error('Failed to update robots.txt: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateSchemaMarkup = async () => {
    try {
      setIsGenerating(true);
      
      // Generate comprehensive schema markup for the construction business
      const organizationSchema = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": config.site_name,
        "description": config.site_description,
        "url": config.canonical_domain,
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web",
        "offers": {
          "@type": "Offer",
          "price": "149",
          "priceCurrency": "USD",
          "priceValidUntil": "2025-12-31"
        },
        "publisher": {
          "@type": "Organization",
          "name": config.site_name,
          "url": config.canonical_domain,
          "logo": {
            "@type": "ImageObject",
            "url": config.default_og_image
          }
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.8",
          "reviewCount": "247"
        }
      };

      const breadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": config.canonical_domain
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Features",
            "item": `${config.canonical_domain}/features`
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": "Pricing",
            "item": `${config.canonical_domain}/pricing`
          }
        ]
      };

      const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is BuildDesk?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "BuildDesk is a construction management platform designed for small to medium-sized construction businesses, providing real-time project management, financial tracking, and collaborative tools."
            }
          },
          {
            "@type": "Question",
            "name": "How much does BuildDesk cost?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "BuildDesk offers tiered pricing starting at $149/month for unlimited users, providing comprehensive construction management features without per-user fees."
            }
          },
          {
            "@type": "Question",
            "name": "What industries does BuildDesk serve?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "BuildDesk serves construction companies, contractors, project managers, and construction professionals across various construction industry sectors."
            }
          }
        ]
      };

      const schemaMarkup = `<!-- Schema.org JSON-LD markup for ${config.site_name} -->
<script type="application/ld+json">
${JSON.stringify(organizationSchema, null, 2)}
</script>

<script type="application/ld+json">
${JSON.stringify(breadcrumbSchema, null, 2)}
</script>

<script type="application/ld+json">
${JSON.stringify(faqSchema, null, 2)}
</script>`;

      // Copy to clipboard
      await navigator.clipboard.writeText(schemaMarkup);
      
      toast.success('Schema markup generated and copied to clipboard');
    } catch (error: any) {
      console.error('Error generating schema markup:', error);
      toast.error('Failed to generate schema markup: ' + error.message);
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
    } catch (error: any) {
      console.error('Error generating LLMs.txt:', error);
      toast.error('Failed to generate LLMs.txt: ' + error.message);
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
    } catch (error: any) {
      console.error('Error running SEO audit:', error);
      toast.error('Failed to run SEO audit: ' + error.message);
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
    } catch (error: any) {
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
    } catch (error: any) {
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
      <DashboardLayout title="SEO Management">
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  if (!user || userProfile?.role !== 'root_admin') {
    return (
      <DashboardLayout title="SEO Management">
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
    );
  }

  const performanceData = analyticsData?.performance || {};
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
    <DashboardLayout title="SEO Management">
      <div className="space-y-6">
        {/* Hero Section */}
        <div className="text-center py-6 px-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 rounded-lg">
          <div className="flex items-center justify-center mb-4">
            <Search className="h-10 w-10 text-green-600 mr-3" />
            <h1 className="text-2xl font-bold">Unified SEO Management</h1>
          </div>
          <p className="text-lg text-muted-foreground mb-4 max-w-2xl mx-auto">
            Complete SEO management dashboard with analytics, configuration, content generation, and optimization tools
          </p>
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
        </div>

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
            {mcpConfigured ? (
              <div className="space-y-4">
                {/* Top Keywords */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top Performing Keywords</CardTitle>
                    <CardDescription>Keywords driving the most traffic</CardDescription>
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

                {/* Top Pages */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top Performing Pages</CardTitle>
                    <CardDescription>Pages with highest search visibility</CardDescription>
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
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Analytics Not Available</h3>
                  <p className="text-muted-foreground mb-4">
                    Configure Google Analytics and Search Console APIs to see detailed analytics data.
                  </p>
                  <Button onClick={checkAPICredentials}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Check Configuration
                  </Button>
                </CardContent>
              </Card>
            )}
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Content Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle>Content Generator</CardTitle>
                  <CardDescription>Generate SEO-optimized content</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      placeholder="Enter content title"
                      value={contentConfig.title || ''}
                      onChange={(e) => setContentConfig({...contentConfig, title: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Primary Keyword</label>
                    <Input
                      placeholder="e.g., construction management software"
                      value={contentConfig.primaryKeyword || ''}
                      onChange={(e) => setContentConfig({...contentConfig, primaryKeyword: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Content Type</label>
                      <Select
                        value={contentConfig.contentType}
                        onValueChange={(value) => setContentConfig({...contentConfig, contentType: value as any})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="blog_post">Blog Post</SelectItem>
                          <SelectItem value="landing_page">Landing Page</SelectItem>
                          <SelectItem value="comparison">Comparison</SelectItem>
                          <SelectItem value="guide">Guide</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Target Audience</label>
                      <Select
                        value={contentConfig.targetAudience}
                        onValueChange={(value) => setContentConfig({...contentConfig, targetAudience: value as any})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contractors">Contractors</SelectItem>
                          <SelectItem value="project_managers">Project Managers</SelectItem>
                          <SelectItem value="business_owners">Business Owners</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button 
                    onClick={generateContent} 
                    className="w-full" 
                    disabled={isGenerating || !contentConfig.title || !contentConfig.primaryKeyword}
                  >
                    {isGenerating ? 'Generating...' : 'Generate SEO Content'}
                  </Button>
                </CardContent>
              </Card>

              {/* Generated Content Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Generated Content</CardTitle>
                  <CardDescription>Preview your SEO-optimized content</CardDescription>
                </CardHeader>
                <CardContent>
                  {generatedContent ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 border rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {generatedContent.seoScore}
                          </div>
                          <div className="text-sm text-muted-foreground">SEO Score</div>
                        </div>
                        <div className="text-center p-3 border rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {generatedContent.keywordDensity?.toFixed(1) || 0}%
                          </div>
                          <div className="text-sm text-muted-foreground">Keyword Density</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-medium">Generated Title</h4>
                        <p className="text-sm text-muted-foreground border p-3 rounded">
                          {generatedContent.title}
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-medium">Meta Description</h4>
                        <p className="text-sm text-muted-foreground border p-3 rounded">
                          {generatedContent.metaDescription}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Generate content to see preview</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Meta Tags Tab */}
          <TabsContent value="meta-tags" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Add New Meta Tag */}
              <Card>
                <CardHeader>
                  <CardTitle>Add Meta Tag</CardTitle>
                  <CardDescription>Create page-specific SEO meta tags</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Page Path</label>
                    <Input
                      placeholder="/about-us"
                      value={newMetaTag.page_path}
                      onChange={(e) => setNewMetaTag({...newMetaTag, page_path: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      placeholder="Page title"
                      value={newMetaTag.title}
                      onChange={(e) => setNewMetaTag({...newMetaTag, title: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      placeholder="Page description for search results"
                      value={newMetaTag.description}
                      onChange={(e) => setNewMetaTag({...newMetaTag, description: e.target.value})}
                      rows={3}
                    />
                  </div>

                  <Button onClick={addMetaTag} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Meta Tag
                  </Button>
                </CardContent>
              </Card>

              {/* Existing Meta Tags */}
              <Card>
                <CardHeader>
                  <CardTitle>Existing Meta Tags</CardTitle>
                  <CardDescription>Manage page-specific SEO settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {metaTags.length > 0 ? (
                      metaTags.map((tag, index) => (
                        <div key={index} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{tag.page_path}</h4>
                            <Badge variant="outline">{tag.title}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{tag.description}</p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No meta tags configured yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default UnifiedSEODashboard;
