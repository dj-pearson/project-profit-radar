import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Search,
  Target,
  Users,
  FileText,
  BarChart3,
  Settings,
  Globe,
  FileCode,
  Bot,
  Code,
  Image,
  Link as LinkIcon,
  AlertCircle,
  Shield,
  Smartphone,
  Gauge,
  RefreshCw,
  Loader2,
} from 'lucide-react';

interface SEOAuditResult {
  overall_score: number;
  seo_score: number;
  performance_score: number;
  accessibility_score: number;
  best_practices_score: number;
  critical_issues: number;
  warnings: number;
  notices: number;
  issues: any[];
  recommendations: any[];
  duration_seconds: number;
}

const SEOManager = () => {
  const [activeTab, setActiveTab] = useState('audit');
  const [loading, setLoading] = useState(false);
  const [auditUrl, setAuditUrl] = useState('');
  const [auditResult, setAuditResult] = useState<SEOAuditResult | null>(null);

  // Run SEO Audit
  const runAudit = async () => {
    if (!auditUrl) {
      toast({
        title: 'URL Required',
        description: 'Please enter a URL to audit',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('seo-audit', {
        body: { url: auditUrl, audit_type: 'full' },
      });

      if (error) throw error;

      setAuditResult(data.audit);
      toast({
        title: 'Audit Complete',
        description: `Overall score: ${data.audit.overall_score}/100`,
      });
    } catch (error: any) {
      toast({
        title: 'Audit Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">SEO Management</h2>
          <p className="text-muted-foreground">
            Comprehensive SEO audit, monitoring, and optimization tools
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          22 Features
        </Badge>
      </div>

      {/* Main Tabs Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-11 lg:grid-cols-11 gap-1 h-auto p-1">
          <TabsTrigger value="audit" className="text-xs">
            <Search className="h-3 w-3 mr-1" />
            Audit
          </TabsTrigger>
          <TabsTrigger value="keywords" className="text-xs">
            <Target className="h-3 w-3 mr-1" />
            Keywords
          </TabsTrigger>
          <TabsTrigger value="competitors" className="text-xs">
            <Users className="h-3 w-3 mr-1" />
            Competitors
          </TabsTrigger>
          <TabsTrigger value="pages" className="text-xs">
            <FileText className="h-3 w-3 mr-1" />
            Pages
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="text-xs">
            <BarChart3 className="h-3 w-3 mr-1" />
            Monitoring
          </TabsTrigger>
          <TabsTrigger value="meta" className="text-xs">
            <Settings className="h-3 w-3 mr-1" />
            Meta Tags
          </TabsTrigger>
          <TabsTrigger value="robots" className="text-xs">
            <Bot className="h-3 w-3 mr-1" />
            robots.txt
          </TabsTrigger>
          <TabsTrigger value="sitemap" className="text-xs">
            <Globe className="h-3 w-3 mr-1" />
            Sitemap
          </TabsTrigger>
          <TabsTrigger value="llms" className="text-xs">
            <FileCode className="h-3 w-3 mr-1" />
            llms.txt
          </TabsTrigger>
          <TabsTrigger value="structured" className="text-xs">
            <Code className="h-3 w-3 mr-1" />
            Schema
          </TabsTrigger>
          <TabsTrigger value="performance" className="text-xs">
            <Gauge className="h-3 w-3 mr-1" />
            Vitals
          </TabsTrigger>
        </TabsList>

        <TabsList className="grid grid-cols-11 lg:grid-cols-11 gap-1 h-auto p-1">
          <TabsTrigger value="backlinks" className="text-xs">
            <LinkIcon className="h-3 w-3 mr-1" />
            Backlinks
          </TabsTrigger>
          <TabsTrigger value="broken" className="text-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            Broken
          </TabsTrigger>
          <TabsTrigger value="links" className="text-xs">
            <LinkIcon className="h-3 w-3 mr-1" />
            Links
          </TabsTrigger>
          <TabsTrigger value="content" className="text-xs">
            <FileText className="h-3 w-3 mr-1" />
            Content
          </TabsTrigger>
          <TabsTrigger value="crawler" className="text-xs">
            <RefreshCw className="h-3 w-3 mr-1" />
            Crawler
          </TabsTrigger>
          <TabsTrigger value="images" className="text-xs">
            <Image className="h-3 w-3 mr-1" />
            Images
          </TabsTrigger>
          <TabsTrigger value="redirects" className="text-xs">
            <RefreshCw className="h-3 w-3 mr-1" />
            Redirects
          </TabsTrigger>
          <TabsTrigger value="duplicates" className="text-xs">
            <FileText className="h-3 w-3 mr-1" />
            Duplicates
          </TabsTrigger>
          <TabsTrigger value="security" className="text-xs">
            <Shield className="h-3 w-3 mr-1" />
            Security
          </TabsTrigger>
          <TabsTrigger value="mobile" className="text-xs">
            <Smartphone className="h-3 w-3 mr-1" />
            Mobile
          </TabsTrigger>
          <TabsTrigger value="budget" className="text-xs">
            <Gauge className="h-3 w-3 mr-1" />
            Budget
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: SEO Audit */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comprehensive SEO Audit</CardTitle>
              <CardDescription>
                Run a complete SEO audit to identify issues and opportunities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter URL to audit (e.g., https://example.com)"
                  value={auditUrl}
                  onChange={(e) => setAuditUrl(e.target.value)}
                />
                <Button onClick={runAudit} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                  Run Audit
                </Button>
              </div>

              {auditResult && (
                <div className="space-y-4">
                  {/* Score Cards */}
                  <div className="grid grid-cols-5 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold">{auditResult.overall_score}</div>
                        <div className="text-xs text-muted-foreground">Overall</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-blue-600">{auditResult.seo_score}</div>
                        <div className="text-xs text-muted-foreground">SEO</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">{auditResult.performance_score}</div>
                        <div className="text-xs text-muted-foreground">Performance</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-purple-600">{auditResult.accessibility_score}</div>
                        <div className="text-xs text-muted-foreground">Accessibility</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-orange-600">{auditResult.best_practices_score}</div>
                        <div className="text-xs text-muted-foreground">Best Practices</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Issues Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>{auditResult.critical_issues}</strong> Critical Issues
                      </AlertDescription>
                    </Alert>
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>{auditResult.warnings}</strong> Warnings
                      </AlertDescription>
                    </Alert>
                    <Alert variant="default">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>{auditResult.notices}</strong> Notices
                      </AlertDescription>
                    </Alert>
                  </div>

                  {/* Issues List */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Issues Found</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {auditResult.issues.map((issue, index) => (
                          <Alert key={index} variant={issue.severity === 'critical' ? 'destructive' : 'default'}>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              <strong>{issue.message}</strong>
                              <p className="text-sm text-muted-foreground mt-1">{issue.impact}</p>
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recommendations */}
                  {auditResult.recommendations.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Recommendations</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {auditResult.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                              <span className="text-sm">{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  <div className="text-sm text-muted-foreground">
                    Audit completed in {auditResult.duration_seconds} seconds
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Keywords */}
        <TabsContent value="keywords" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Keyword Tracking</CardTitle>
              <CardDescription>
                Track target keywords and their rankings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Keyword tracking interface will be implemented here. Add keywords, set target positions, and monitor ranking changes over time.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Competitors */}
        <TabsContent value="competitors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Competitor Analysis</CardTitle>
              <CardDescription>
                Analyze competitor SEO strategies and performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Competitor analysis tools will show domain authority, backlinks, top keywords, and content gaps.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Remaining tabs - Placeholder structure */}
        {['pages', 'monitoring', 'meta', 'robots', 'sitemap', 'llms', 'structured', 'performance',
          'backlinks', 'broken', 'links', 'content', 'crawler', 'images', 'redirects', 'duplicates',
          'security', 'mobile', 'budget'].map((tabName) => (
          <TabsContent key={tabName} value={tabName} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="capitalize">{tabName.replace('-', ' ')}</CardTitle>
                <CardDescription>
                  {tabName} analysis and management tools
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This tab is ready for implementation. Connect to the corresponding edge function for full functionality.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default SEOManager;
