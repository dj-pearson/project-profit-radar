import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SEOAnalyticsDashboard } from '@/components/seo/SEOAnalyticsDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { enterpriseSeoService } from '@/services/EnterpriseSeOService';
import { contentSeoGenerator, ContentSEOConfig } from '@/services/ContentSEOGenerator';
import { toast } from '@/hooks/use-toast';
import {
  Search,
  TrendingUp,
  FileText,
  Settings,
  Zap,
  Target,
  BarChart3,
  Lightbulb,
  Rocket,
  CheckCircle,
  AlertTriangle,
  Plus,
  Download,
  Eye,
  Edit,
  Globe,
  Users,
  Award
} from 'lucide-react';

const SEOManagement = () => {
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const initializeSEO = async () => {
    try {
      setIsInitializing(true);
      await enterpriseSeoService.initializePlatformSEO();
      toast({
        title: "SEO System Initialized",
        description: "Enterprise SEO optimization is now active across all pages",
      });
    } catch (error: any) {
      toast({
        title: "Initialization Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const generateContent = async () => {
    if (!contentConfig.title || !contentConfig.primaryKeyword) {
      toast({
        title: "Missing Information",
        description: "Please provide a title and primary keyword",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsGenerating(true);
      const result = await contentSeoGenerator.generateContent(contentConfig as ContentSEOConfig);
      setGeneratedContent(result);
      toast({
        title: "Content Generated",
        description: `SEO-optimized content created with ${result.seoScore}/100 score`,
      });
    } catch (error: any) {
      toast({
        title: "Generation Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

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
      title: 'Generate Procore Alternative',
      description: 'Create high-converting competitor comparison page',
      icon: Target,
      action: () => generateCompetitorContent('Procore'),
      variant: 'outline' as const
    },
    {
      title: 'Create Industry Landing Page',
      description: 'Generate HVAC, plumbing, or electrical contractor page',
      icon: Globe,
      action: () => generateIndustryContent('HVAC'),
      variant: 'outline' as const
    },
    {
      title: 'SEO Content Guide',
      description: 'Generate comprehensive construction management guide',
      icon: FileText,
      action: () => generateGuideContent('Construction Project Management'),
      variant: 'outline' as const
    }
  ];

  const generateCompetitorContent = async (competitor: string) => {
    try {
      setIsGenerating(true);
      const result = await contentSeoGenerator.generateComparisonContent(
        competitor, 
        [`${competitor.toLowerCase()} alternative`, 'construction management software comparison']
      );
      setGeneratedContent(result);
      toast({
        title: "Competitor Content Generated",
        description: `${competitor} alternative page created successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Generation Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateIndustryContent = async (industry: string) => {
    try {
      setIsGenerating(true);
      const result = await contentSeoGenerator.generateIndustryContent(
        industry,
        `${industry.toLowerCase()} contractor software`
      );
      setGeneratedContent(result);
      toast({
        title: "Industry Content Generated",
        description: `${industry} contractor page created successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Generation Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateGuideContent = async (topic: string) => {
    try {
      setIsGenerating(true);
      const result = await contentSeoGenerator.generateGuideContent(
        topic,
        ['construction project management', 'construction management best practices', 'project management guide']
      );
      setGeneratedContent(result);
      toast({
        title: "Guide Content Generated",
        description: `${topic} guide created successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Generation Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <DashboardLayout title="SEO Management">
      <div className="space-y-6">
        {/* Hero Section */}
        <div className="text-center py-6 px-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 rounded-lg">
          <div className="flex items-center justify-center mb-4">
            <Search className="h-10 w-10 text-green-600 mr-3" />
            <h1 className="text-2xl font-bold">Enterprise SEO Management</h1>
          </div>
          <p className="text-lg text-muted-foreground mb-4 max-w-2xl mx-auto">
            Dominate construction software search results with AI-powered SEO optimization, 
            automated content generation, and comprehensive performance analytics
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Badge variant="success" className="text-sm px-3 py-1">
              <TrendingUp className="h-4 w-4 mr-1" />
              300% Traffic Growth Target
            </Badge>
            <Badge variant="outline" className="text-sm px-3 py-1">
              Top 3 Rankings Goal
            </Badge>
            <Badge variant="outline" className="text-sm px-3 py-1">
              $2.3M Revenue Potential
            </Badge>
          </div>
        </div>

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
                      <Badge variant="outline">High Impact</Badge>
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
                      {action.loading || isGenerating ? 'Processing...' : 'Launch'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="analytics" className="flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Content Generator
            </TabsTrigger>
            <TabsTrigger value="optimization" className="flex items-center">
              <Settings className="h-4 w-4 mr-2" />
              Page Optimization
            </TabsTrigger>
            <TabsTrigger value="strategy" className="flex items-center">
              <Lightbulb className="h-4 w-4 mr-2" />
              Strategy
            </TabsTrigger>
          </TabsList>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <SEOAnalyticsDashboard />
          </TabsContent>

          {/* Content Generator Tab */}
          <TabsContent value="content" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Content Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle>Content Configuration</CardTitle>
                  <CardDescription>
                    Configure SEO-optimized content generation
                  </CardDescription>
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

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Secondary Keywords</label>
                    <Textarea
                      placeholder="Enter secondary keywords (one per line)"
                      value={contentConfig.secondaryKeywords?.join('\n') || ''}
                      onChange={(e) => setContentConfig({
                        ...contentConfig, 
                        secondaryKeywords: e.target.value.split('\n').filter(k => k.trim())
                      })}
                      rows={3}
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
                          <SelectItem value="case_study">Case Study</SelectItem>
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
                          <SelectItem value="general">General</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Word Count</label>
                      <Input
                        type="number"
                        value={contentConfig.wordCount}
                        onChange={(e) => setContentConfig({...contentConfig, wordCount: parseInt(e.target.value)})}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Call to Action</label>
                      <Input
                        placeholder="e.g., Start Free Trial"
                        value={contentConfig.cta}
                        onChange={(e) => setContentConfig({...contentConfig, cta: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={contentConfig.competitorAnalysis}
                        onChange={(e) => setContentConfig({...contentConfig, competitorAnalysis: e.target.checked})}
                      />
                      <span className="text-sm">Competitor Analysis</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={contentConfig.includeSchema}
                        onChange={(e) => setContentConfig({...contentConfig, includeSchema: e.target.checked})}
                      />
                      <span className="text-sm">Include Schema</span>
                    </label>
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
                  <CardDescription>
                    Preview and optimize your SEO content
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {generatedContent ? (
                    <div className="space-y-4">
                      {/* SEO Metrics */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 border rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {generatedContent.seoScore}
                          </div>
                          <div className="text-sm text-muted-foreground">SEO Score</div>
                        </div>
                        <div className="text-center p-3 border rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {generatedContent.keywordDensity.toFixed(1)}%
                          </div>
                          <div className="text-sm text-muted-foreground">Keyword Density</div>
                        </div>
                        <div className="text-center p-3 border rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            {generatedContent.readabilityScore.toFixed(0)}
                          </div>
                          <div className="text-sm text-muted-foreground">Readability</div>
                        </div>
                      </div>

                      {/* Content Preview */}
                      <div className="space-y-2">
                        <h4 className="font-semibold">Title:</h4>
                        <p className="text-sm bg-gray-50 p-2 rounded">{generatedContent.title}</p>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-semibold">Meta Description:</h4>
                        <p className="text-sm bg-gray-50 p-2 rounded">{generatedContent.metaDescription}</p>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-semibold">Content Preview:</h4>
                        <div className="text-sm bg-gray-50 p-3 rounded max-h-40 overflow-y-auto">
                          {generatedContent.content.substring(0, 500)}...
                        </div>
                      </div>

                      {/* Recommendations */}
                      {generatedContent.recommendations.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-semibold">Recommendations:</h4>
                          <div className="space-y-1">
                            {generatedContent.recommendations.map((rec: string, index: number) => (
                              <Alert key={index}>
                                <Lightbulb className="h-4 w-4" />
                                <AlertDescription className="text-sm">{rec}</AlertDescription>
                              </Alert>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Generate content to see preview and optimization suggestions</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Page Optimization Tab */}
          <TabsContent value="optimization" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Page Optimization Status</CardTitle>
                <CardDescription>
                  Monitor and optimize SEO for all platform pages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { page: 'Homepage', score: 92, status: 'optimized', issues: 1 },
                    { page: 'Pricing', score: 88, status: 'good', issues: 2 },
                    { page: 'Features', score: 85, status: 'good', issues: 3 },
                    { page: 'Procore Alternative', score: 0, status: 'missing', issues: 0 },
                    { page: 'HVAC Contractor Software', score: 0, status: 'missing', issues: 0 }
                  ].map((page, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          page.status === 'optimized' ? 'bg-green-500' :
                          page.status === 'good' ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                        <div>
                          <p className="font-medium">{page.page}</p>
                          <p className="text-sm text-muted-foreground">
                            {page.status === 'missing' ? 'Page not found' : `Score: ${page.score}/100`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {page.issues > 0 && (
                          <Badge variant="warning">
                            {page.issues} issues
                          </Badge>
                        )}
                        <Button size="sm" variant="outline">
                          {page.status === 'missing' ? 'Create' : 'Optimize'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Strategy Tab */}
          <TabsContent value="strategy" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SEO Strategy Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>SEO Strategy 2025</CardTitle>
                  <CardDescription>
                    Your roadmap to construction software market dominance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-medium">Foundation Complete</span>
                      </div>
                      <Badge variant="success">100%</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Target className="h-5 w-5 text-yellow-600" />
                        <span className="font-medium">Content Creation</span>
                      </div>
                      <Badge variant="warning">30%</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Users className="h-5 w-5 text-blue-600" />
                        <span className="font-medium">Authority Building</span>
                      </div>
                      <Badge variant="outline">0%</Badge>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="font-semibold mb-2">Next Priority Actions:</h4>
                    <ul className="space-y-1 text-sm">
                      <li className="flex items-center space-x-2">
                        <AlertTriangle className="h-3 w-3 text-orange-500" />
                        <span>Create Procore alternative page (1,800 searches/month)</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <AlertTriangle className="h-3 w-3 text-orange-500" />
                        <span>Generate Buildertrend comparison content</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <AlertTriangle className="h-3 w-3 text-orange-500" />
                        <span>Launch industry-specific landing pages</span>
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* ROI Projections */}
              <Card>
                <CardHeader>
                  <CardTitle>ROI Projections</CardTitle>
                  <CardDescription>
                    Expected returns from SEO investment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-green-600">$800K</div>
                        <div className="text-sm text-muted-foreground">Year 1 Revenue</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">433%</div>
                        <div className="text-sm text-muted-foreground">ROI</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>6-Month Target</span>
                        <span className="font-medium">25K visitors/month</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>12-Month Target</span>
                        <span className="font-medium">50K visitors/month</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Conversion Rate</span>
                        <span className="font-medium">5%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Avg. Customer Value</span>
                        <span className="font-medium">$1,800/year</span>
                      </div>
                    </div>

                    <Alert>
                      <Award className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Market Opportunity:</strong> Construction software market growing at 9.2% CAGR. 
                        First-mover advantage in AI-powered search optimization.
                      </AlertDescription>
                    </Alert>
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

export default SEOManagement;
