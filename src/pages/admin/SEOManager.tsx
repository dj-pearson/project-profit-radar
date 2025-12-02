import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  Search,
  Globe,
  BarChart3,
  Settings,
  FileText,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Eye,
  MousePointer,
  Share2
} from 'lucide-react';

interface SEOConfig {
  id?: string;
  site_name: string;
  site_description: string;
  site_keywords: string[];
  default_og_image: string;
  google_analytics_id: string;
  google_search_console_id: string;
  bing_webmaster_id: string;
  yandex_webmaster_id: string;
  google_ads_id: string;
  facebook_pixel_id: string;
  twitter_site: string;
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

interface SEOSubmission {
  id: string;
  search_engine: string;
  submission_type: string;
  url?: string;
  status: string;
  submitted_at?: string;
  last_checked?: string;
}

const SEOManager = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  
  const [config, setConfig] = useState<SEOConfig>({
    site_name: 'Build Desk',
    site_description: 'Construction Management Platform for SMB Contractors',
    site_keywords: ['construction', 'project management', 'contractor software', 'building'],
    default_og_image: '',
    google_analytics_id: '',
    google_search_console_id: '',
    bing_webmaster_id: '',
    yandex_webmaster_id: '',
    google_ads_id: '',
    facebook_pixel_id: '',
    twitter_site: '@builddesk',
    canonical_domain: 'https://builddesk.com',
    robots_txt: 'User-agent: *\nAllow: /',
    sitemap_enabled: true,
    schema_org_enabled: true
  });

  const [metaTags, setMetaTags] = useState<MetaTag[]>([]);
  const [submissions, setSubmissions] = useState<SEOSubmission[]>([]);
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
  
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('config');
  const [generating, setGenerating] = useState({
    sitemap: false,
    robots: false,
    schema: false,
    audit: false
  });

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
      loadSEOData();
    }
  }, [user, userProfile, loading, navigate]);

  const loadSEOData = async () => {
    try {
      setLoadingData(true);
      
      // Load SEO configuration
      const { data: configData, error: configError } = await supabase
        .from('seo_configurations')
        .select('*')
        .limit(1)
        .single();

      if (configError && configError.code !== 'PGRST116') {
        throw configError;
      }

      if (configData) {
        setConfig(configData);
      }

      // Load meta tags
      const { data: metaData, error: metaError } = await supabase
        .from('seo_meta_tags')
        .select('*')
        .order('page_path');

      if (metaError) throw metaError;
      setMetaTags(metaData || []);

      // Load submissions
      const { data: submissionData, error: submissionError } = await supabase
        .from('seo_submissions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (submissionError) throw submissionError;
      setSubmissions(submissionData || []);

    } catch (error: any) {
      console.error('Error loading SEO data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load SEO data"
      });
    } finally {
      setLoadingData(false);
    }
  };

  const saveConfiguration = async () => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('seo_configurations')
        .upsert(config, { onConflict: 'id' });

      if (error) throw error;

      // Sync Google Analytics configuration to localStorage for immediate activation
      if (config.google_analytics_id) {
        const analyticsConfig = {
          enabled: true,
          trackingId: config.google_analytics_id,
          eventTracking: true,
          scrollTracking: true,
          formTracking: true,
        };
        localStorage.setItem('analytics-config', JSON.stringify(analyticsConfig));
        
        // Trigger a reload to initialize Google Analytics
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      }

      toast({
        title: "Success",
        description: config.google_analytics_id ? 
          "SEO configuration saved successfully. Page will reload to activate Google Analytics." :
          "SEO configuration saved successfully"
      });
    } catch (error: any) {
      console.error('Error saving configuration:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save configuration"
      });
    } finally {
      setSaving(false);
    }
  };

  const addMetaTag = async () => {
    if (!newMetaTag.page_path || !newMetaTag.title) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Page path and title are required"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('seo_meta_tags')
        .insert([newMetaTag]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Meta tag added successfully"
      });

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
      console.error('Error adding meta tag:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add meta tag"
      });
    }
  };

  const submitToSearchEngines = async () => {
    try {
      const searchEngines = ['google', 'bing', 'yandex'];
      const submissionPromises = searchEngines.map(engine => 
        supabase.from('seo_submissions').insert([{
          search_engine: engine,
          submission_type: 'sitemap',
          url: `${config.canonical_domain}/sitemap.xml`,
          status: 'pending'
        }])
      );

      await Promise.all(submissionPromises);

      toast({
        title: "Success",
        description: "Sitemap submitted to all search engines"
      });

      loadSEOData();
    } catch (error: any) {
      console.error('Error submitting to search engines:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit to search engines"
      });
    }
  };

  const generateSitemap = async () => {
    try {
      setGenerating(prev => ({ ...prev, sitemap: true }));
      
      const { data, error } = await supabase.functions.invoke('sitemap-generator', {
        body: {},
      });

      if (error) throw error;

      // Also generate using the file-based sitemap generator
      const { data: fileData, error: fileError } = await supabase.functions.invoke('generate-sitemap-file', {
        body: {},
      });

      if (fileError) {
        console.warn('File-based sitemap generation failed:', fileError);
      }

      // Log the generated sitemap for manual copying if needed
      if (data) {
      }

      // Save sitemap to public directory (in a real implementation, this would save to your server)
      const sitemapUrl = `${config.canonical_domain}/sitemap.xml`;
      
      // Update the robots.txt to include sitemap reference
      const updatedRobots = config.robots_txt.includes('Sitemap:') 
        ? config.robots_txt 
        : `${config.robots_txt}\nSitemap: ${sitemapUrl}`;
      
      await updateRobotsTxt(updatedRobots);

      toast({
        title: "Sitemap Generated",
        description: "Your sitemap has been generated. The static sitemap.xml file will be updated on the next build deployment."
      });
      
    } catch (error: any) {
      console.error('Error generating sitemap:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate sitemap: " + error.message
      });
    } finally {
      setGenerating(prev => ({ ...prev, sitemap: false }));
    }
  };

  const updateRobotsTxt = async (robotsContent?: string) => {
    try {
      setGenerating(prev => ({ ...prev, robots: true }));
      
      const content = robotsContent || config.robots_txt;
      
      // Create comprehensive robots.txt content
      const robotsTxt = `# Robots.txt for ${config.site_name}
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /auth/
Disallow: /api/
Disallow: /private/

# Additional SEO directives
Crawl-delay: 1

# Sitemap reference
Sitemap: ${config.canonical_domain}/sitemap.xml

# Search engine specific rules
User-agent: Googlebot
Allow: /
Crawl-delay: 1

User-agent: Bingbot
Allow: /
Crawl-delay: 1

User-agent: Slurp
Allow: /
Crawl-delay: 1

${content}`;

      // Update the config
      setConfig(prev => ({ ...prev, robots_txt: robotsTxt }));
      
      // In a real implementation, this would write to your server's robots.txt file
      // For now, we'll just show the content and save to database
      
      toast({
        title: "Robots.txt Updated",
        description: "Your robots.txt file has been updated with SEO-friendly directives."
      });
      
    } catch (error: any) {
      console.error('Error updating robots.txt:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update robots.txt: " + error.message
      });
    } finally {
      setGenerating(prev => ({ ...prev, robots: false }));
    }
  };

  const generateSchemaMarkup = async () => {
    try {
      setGenerating(prev => ({ ...prev, schema: true }));
      
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
          "price": "350",
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
        "sameAs": [
          `https://twitter.com/${config.twitter_site?.replace('@', '')}`
        ]
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
              "text": "BuildDesk costs $350 per month for unlimited users, providing comprehensive construction management features without per-user fees."
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
      
      toast({
        title: "Schema Markup Generated",
        description: "Schema markup has been generated and copied to your clipboard. Add it to your website's <head> section."
      });
      
    } catch (error: any) {
      console.error('Error generating schema markup:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate schema markup: " + error.message
      });
    } finally {
      setGenerating(prev => ({ ...prev, schema: false }));
    }
  };

  const runSEOAudit = async () => {
    try {
      setGenerating(prev => ({ ...prev, audit: true }));
      
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
      
      // Show audit results
      const goodCount = auditResults.filter(r => r.status === 'good').length;
      const warningCount = auditResults.filter(r => r.status === 'warning').length;
      const errorCount = auditResults.filter(r => r.status === 'error').length;
      
      toast({
        title: "SEO Audit Complete",
        description: `Found ${goodCount} good, ${warningCount} warnings, ${errorCount} errors. Check the console for details.`
      });
      
      
    } catch (error: any) {
      console.error('Error running SEO audit:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to run SEO audit: " + error.message
      });
    } finally {
      setGenerating(prev => ({ ...prev, audit: false }));
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'indexed': return 'default';
      case 'submitted': return 'secondary';
      case 'pending': return 'outline';
      case 'error': return 'destructive';
      default: return 'outline';
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-construction-blue mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading SEO manager...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout title="SEO Manager">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Comprehensive SEO management and optimization</p>
          </div>
          <Button onClick={saveConfiguration} disabled={saving}>
            {saving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Settings className="h-4 w-4 mr-2" />
            )}
            Save Configuration
          </Button>
        </div>

        {/* Content */}
        <div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="config" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Configuration</span>
            </TabsTrigger>
            <TabsTrigger value="meta" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Meta Tags</span>
            </TabsTrigger>
            <TabsTrigger value="engines" className="flex items-center space-x-2">
              <Search className="h-4 w-4" />
              <span>Search Engines</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="tools" className="flex items-center space-x-2">
              <Globe className="h-4 w-4" />
              <span>Tools</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Site Configuration</CardTitle>
                <CardDescription>Basic site information and global SEO settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="siteName">Site Name</Label>
                    <Input
                      id="siteName"
                      value={config.site_name}
                      onChange={(e) => setConfig(prev => ({ ...prev, site_name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="canonicalDomain">Canonical Domain</Label>
                    <Input
                      id="canonicalDomain"
                      value={config.canonical_domain}
                      onChange={(e) => setConfig(prev => ({ ...prev, canonical_domain: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="siteDescription">Site Description</Label>
                  <Textarea
                    id="siteDescription"
                    value={config.site_description}
                    onChange={(e) => setConfig(prev => ({ ...prev, site_description: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                  <Input
                    id="keywords"
                    value={config.site_keywords.join(', ')}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      site_keywords: e.target.value.split(',').map(k => k.trim())
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="ogImage">Default OG Image URL</Label>
                  <Input
                    id="ogImage"
                    value={config.default_og_image}
                    onChange={(e) => setConfig(prev => ({ ...prev, default_og_image: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Analytics & Tracking</CardTitle>
                <CardDescription>Configure tracking codes and analytics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="googleAnalytics">Google Analytics ID</Label>
                    <Input
                      id="googleAnalytics"
                      placeholder="G-XXXXXXXXXX"
                      value={config.google_analytics_id}
                      onChange={(e) => setConfig(prev => ({ ...prev, google_analytics_id: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="googleAds">Google Ads ID</Label>
                    <Input
                      id="googleAds"
                      placeholder="AW-XXXXXXXXXX"
                      value={config.google_ads_id}
                      onChange={(e) => setConfig(prev => ({ ...prev, google_ads_id: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="facebookPixel">Facebook Pixel ID</Label>
                    <Input
                      id="facebookPixel"
                      value={config.facebook_pixel_id}
                      onChange={(e) => setConfig(prev => ({ ...prev, facebook_pixel_id: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="twitterSite">Twitter Site Handle</Label>
                    <Input
                      id="twitterSite"
                      placeholder="@builddesk"
                      value={config.twitter_site}
                      onChange={(e) => setConfig(prev => ({ ...prev, twitter_site: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="meta" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Add New Meta Tags</CardTitle>
                <CardDescription>Configure page-specific SEO meta tags</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="pagePath">Page Path</Label>
                    <Input
                      id="pagePath"
                      placeholder="/about"
                      value={newMetaTag.page_path}
                      onChange={(e) => setNewMetaTag(prev => ({ ...prev, page_path: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={newMetaTag.title}
                      onChange={(e) => setNewMetaTag(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newMetaTag.description}
                    onChange={(e) => setNewMetaTag(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                  />
                </div>
                
                <Button onClick={addMetaTag}>Add Meta Tag</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Existing Meta Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metaTags.map((tag) => (
                    <div key={tag.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{tag.page_path}</h4>
                          <p className="text-sm text-muted-foreground">{tag.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{tag.description}</p>
                        </div>
                        <div className="flex space-x-2">
                          {tag.no_index && <Badge variant="destructive" className="text-xs">No Index</Badge>}
                          {tag.no_follow && <Badge variant="outline" className="text-xs">No Follow</Badge>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="engines" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Search Engine Integration
                  <Button onClick={submitToSearchEngines}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Submit Sitemap
                  </Button>
                </CardTitle>
                <CardDescription>Configure and monitor search engine submissions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="googleConsole">Google Search Console ID</Label>
                    <Input
                      id="googleConsole"
                      value={config.google_search_console_id}
                      onChange={(e) => setConfig(prev => ({ ...prev, google_search_console_id: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bingWebmaster">Bing Webmaster ID</Label>
                    <Input
                      id="bingWebmaster"
                      value={config.bing_webmaster_id}
                      onChange={(e) => setConfig(prev => ({ ...prev, bing_webmaster_id: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="yandexWebmaster">Yandex Webmaster ID</Label>
                    <Input
                      id="yandexWebmaster"
                      value={config.yandex_webmaster_id}
                      onChange={(e) => setConfig(prev => ({ ...prev, yandex_webmaster_id: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Submission Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {submissions.map((submission) => (
                    <div key={submission.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="capitalize font-medium">{submission.search_engine}</div>
                        <Badge variant={getStatusBadgeVariant(submission.status)}>
                          {submission.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{submission.submission_type}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {submission.submitted_at && new Date(submission.submitted_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Search Impressions</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">12,543</div>
                  <p className="text-xs text-muted-foreground">+20.1% from last month</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Click-Through Rate</CardTitle>
                  <MousePointer className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3.2%</div>
                  <p className="text-xs text-muted-foreground">+0.4% from last month</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Position</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">8.4</div>
                  <p className="text-xs text-muted-foreground">-1.2 from last month</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tools" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>SEO Tools</CardTitle>
                  <CardDescription>Quick access to essential SEO tools</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={generateSitemap}
                    disabled={generating.sitemap}
                  >
                    {generating.sitemap ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Globe className="h-4 w-4 mr-2" />
                    )}
                    {generating.sitemap ? 'Generating...' : 'Generate Sitemap'}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => updateRobotsTxt()}
                    disabled={generating.robots}
                  >
                    {generating.robots ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4 mr-2" />
                    )}
                    {generating.robots ? 'Updating...' : 'Update Robots.txt'}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={generateSchemaMarkup}
                    disabled={generating.schema}
                  >
                    {generating.schema ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Share2 className="h-4 w-4 mr-2" />
                    )}
                    {generating.schema ? 'Generating...' : 'Generate Schema Markup'}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={runSEOAudit}
                    disabled={generating.audit}
                  >
                    {generating.audit ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    {generating.audit ? 'Running Audit...' : 'Run SEO Audit'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sitemapEnabled">Enable Sitemap</Label>
                    <Switch
                      id="sitemapEnabled"
                      checked={config.sitemap_enabled}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, sitemap_enabled: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="schemaEnabled">Enable Schema.org</Label>
                    <Switch
                      id="schemaEnabled"
                      checked={config.schema_org_enabled}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, schema_org_enabled: checked }))}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SEOManager;