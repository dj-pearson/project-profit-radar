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
import { 
  ArrowLeft, 
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

      toast({
        title: "Success",
        description: "SEO configuration saved successfully"
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
                <h1 className="text-xl font-semibold">SEO Manager</h1>
                <p className="text-sm text-muted-foreground">Comprehensive SEO management and optimization</p>
              </div>
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
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
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
                  <Button variant="outline" className="w-full justify-start">
                    <Globe className="h-4 w-4 mr-2" />
                    Generate Sitemap
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Update Robots.txt
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Share2 className="h-4 w-4 mr-2" />
                    Generate Schema Markup
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
  );
};

export default SEOManager;