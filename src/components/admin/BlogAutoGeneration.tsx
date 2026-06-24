import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Bot, 
  Clock, 
  Zap, 
  Brain, 
  Target, 
  Globe, 
  Sparkles,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  PlayCircle,
  Save,
  TestTube
} from 'lucide-react';

interface AutoGenSettings {
  id?: string;
  company_id: string;
  is_enabled: boolean;
  generation_frequency: string;
  generation_time: string;
  generation_timezone: string;
  last_generation_at?: string;
  next_generation_at?: string;
  preferred_ai_provider: string;
  preferred_model: string;
  fallback_model: string;
  model_temperature: number;
  target_word_count: number;
  content_style: string;
  industry_focus: string[];
  target_keywords: string[];
  optimize_for_geographic: boolean; // Geographic/Local SEO
  target_locations: string[];
  seo_focus: string;
  geo_optimization: boolean; // Generative Engine Optimization
  perplexity_optimization: boolean;
  ai_search_optimization: boolean;
  topic_diversity_enabled: boolean;
  minimum_topic_gap_days: number;
  content_analysis_depth: string;
  auto_publish: boolean;
  publish_as_draft: boolean;
  require_review: boolean;
  notify_on_generation: boolean;
  notification_emails: string[];
  content_template?: string;
  custom_instructions?: string;
  brand_voice_guidelines?: string;
}

interface AIModel {
  id: string;
  provider: string;
  model_name: string;
  model_display_name: string;
  model_family: string;
  description: string;
  speed_rating: number;
  quality_rating: number;
  cost_rating: number;
  recommended_for_blog: boolean;
  is_active: boolean;
}

interface QueueItem {
  id: string;
  scheduled_for: string;
  status: string;
  suggested_topic?: string;
  ai_provider: string;
  ai_model: string;
  generated_blog_id?: string;
  error_message?: string;
  retry_count: number;
}

const BlogAutoGeneration = () => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  const [settings, setSettings] = useState<AutoGenSettings>({
    company_id: userProfile?.company_id || '',
    is_enabled: false,
    generation_frequency: 'weekly',
    generation_time: '09:00',
    generation_timezone: 'America/New_York',
    preferred_ai_provider: 'claude',
    preferred_model: 'claude-sonnet-4-20250514',
    fallback_model: 'claude-3-5-haiku-20241022',
    model_temperature: 0.7,
    target_word_count: 1200,
    content_style: 'professional',
    industry_focus: ['construction', 'project management', 'technology'],
    target_keywords: [],
    optimize_for_geographic: false,
    target_locations: [],
    seo_focus: 'balanced',
    geo_optimization: true, // Generative Engine Optimization
    perplexity_optimization: true,
    ai_search_optimization: true,
    topic_diversity_enabled: true,
    minimum_topic_gap_days: 30,
    content_analysis_depth: 'excerpt',
    auto_publish: false,
    publish_as_draft: true,
    require_review: true,
    notify_on_generation: true,
    notification_emails: []
  });

  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [diversityAnalysis, setDiversityAnalysis] = useState<any>(null);
  const [testTopic, setTestTopic] = useState('');
  const [previewContent, setPreviewContent] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [userProfile?.company_id]);

  const loadData = async () => {
    if (!userProfile?.company_id) return;

    try {
      setLoading(true);

      // Load auto-generation settings
      const { data: settingsData } = await supabase
        .from('blog_auto_generation_settings')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .single();

      if (settingsData) {
        setSettings(settingsData);
      }

      // Load available AI models
      const { data: modelsData } = await supabase
        .from('ai_model_configurations')
        .select('*')
        .eq('is_active', true)
        .order('quality_rating', { ascending: false });

      if (modelsData) {
        setAvailableModels(modelsData);
      }

      // Load generation queue
      const { data: queueData } = await supabase
        .from('blog_generation_queue')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('scheduled_for', { ascending: false })
        .limit(10);

      if (queueData) {
        setQueueItems(queueData);
      }

      // Load diversity analysis
      const { data } = await supabase.functions.invoke('enhanced-blog-ai-fixed', {
        body: {
          action: 'analyze-content-diversity'
        }
      });

      if (data) {
        setDiversityAnalysis(data);
      }

    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load auto-generation settings"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!userProfile?.company_id) return;

    try {
      setSaving(true);

      const { data, error } = await supabase
        .from('blog_auto_generation_settings')
        .upsert([{
          ...settings,
          company_id: userProfile.company_id,
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      setSettings(data);

      toast({
        title: "Success",
        description: "Auto-generation settings saved successfully"
      });

    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save settings"
      });
    } finally {
      setSaving(false);
    }
  };

  const testGeneration = async () => {
    if (!testTopic.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a test topic"
      });
      return;
    }

    try {
      setTesting(true);

      const { data, error } = await supabase.functions.invoke('enhanced-blog-ai-fixed', {
        body: {
          action: 'test-generation',
          topic: testTopic,
          customSettings: settings
        }
      });

      if (error) throw error;

      setPreviewContent(data.content);
      setIsPreviewOpen(true);

      toast({
        title: "Success",
        description: "Test content generated successfully"
      });

    } catch (error: any) {
      console.error('Error testing generation:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate test content"
      });
    } finally {
      setTesting(false);
    }
  };

  const triggerImmediateGeneration = async () => {
    
    setGenerating(true);
    
    try {
      
      toast({
        title: "Generating Content",
        description: "Creating your blog article with AI... This may take a few moments."
      });
      
      const { error } = await supabase.functions.invoke('enhanced-blog-ai-fixed', {
        body: {
          action: 'generate-auto-content',
          customSettings: {
            company_id: userProfile?.company_id,
            ...settings
          }
        }
      });


      if (error) throw error;

      toast({
        title: "Success",
        description: "Blog article generated successfully! Check your blog posts to see the new content."
      });

      loadData(); // Refresh data

    } catch (error: any) {
      console.error('[BlogAutoGen] Error generating content:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to generate content: ${error.message || 'Unknown error'}`
      });
    } finally {
      setGenerating(false);
    }
  };

  const getModelsByProvider = (provider: string) => {
    return availableModels.filter(model => model.provider === provider);
  };

  const getModelDisplayInfo = (modelName: string) => {
    const model = availableModels.find(m => m.model_name === modelName);
    return model ? {
      display_name: model.model_display_name,
      description: model.description,
      speed: model.speed_rating,
      quality: model.quality_rating,
      cost: model.cost_rating
    } : null;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500"><PlayCircle className="h-3 w-3 mr-1" />Processing</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-6 w-6" />
            AI Blog Auto-Generation
          </h2>
          <p className="text-muted-foreground">
            Automatically generate and publish blog content using advanced AI
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            onClick={triggerImmediateGeneration}
            disabled={!settings.is_enabled || generating}
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Generate Now
              </>
            )}
          </Button>
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${settings.is_enabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span className="font-medium">
                {settings.is_enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Auto-generation status
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="font-medium">
                {settings.generation_frequency}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Generation frequency
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Brain className="h-4 w-4 text-purple-500" />
              <span className="font-medium">
                {getModelDisplayInfo(settings.preferred_model)?.display_name || settings.preferred_model}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              AI Model
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-green-500" />
              <span className="font-medium">
                {settings.next_generation_at 
                  ? new Date(settings.next_generation_at).toLocaleDateString()
                  : 'Not scheduled'
                }
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Next generation
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="schedule" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="ai-models">AI Models</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="seo">SEO & GEO</TabsTrigger>
          <TabsTrigger value="publishing">Publishing</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Generation Schedule
              </CardTitle>
              <CardDescription>
                Configure when and how often to generate new blog content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={settings.is_enabled}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, is_enabled: checked }))}
                />
                <Label>Enable automatic blog generation</Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select 
                    value={settings.generation_frequency} 
                    onValueChange={(value) => setSettings(prev => ({ ...prev, generation_frequency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="time">Generation Time</Label>
                  <Input
                    type="time"
                    value={settings.generation_time}
                    onChange={(e) => setSettings(prev => ({ ...prev, generation_time: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select 
                    value={settings.generation_timezone} 
                    onValueChange={(value) => setSettings(prev => ({ ...prev, generation_timezone: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {settings.next_generation_at && (
                <Alert>
                  <Calendar className="h-4 w-4" />
                  <AlertDescription>
                    Next blog will be generated on {new Date(settings.next_generation_at).toLocaleString()}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Models Tab */}
        <TabsContent value="ai-models" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI Model Configuration
              </CardTitle>
              <CardDescription>
                Choose the AI models and configure generation parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="provider">AI Provider</Label>
                <Select 
                  value={settings.preferred_ai_provider} 
                  onValueChange={(value) => {
                    setSettings(prev => ({ 
                      ...prev, 
                      preferred_ai_provider: value,
                      preferred_model: getModelsByProvider(value)[0]?.model_name || ''
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude">Claude (Anthropic)</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primary-model">Primary Model</Label>
                  <Select 
                    value={settings.preferred_model} 
                    onValueChange={(value) => setSettings(prev => ({ ...prev, preferred_model: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getModelsByProvider(settings.preferred_ai_provider).map((model) => (
                        <SelectItem key={model.id} value={model.model_name}>
                          <div className="flex items-center justify-between w-full">
                            <span>{model.model_display_name}</span>
                            <div className="flex items-center space-x-1 ml-2">
                              <Badge variant="outline" className="text-xs">
                                Q: {model.quality_rating}/10
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                S: {model.speed_rating}/10
                              </Badge>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {getModelDisplayInfo(settings.preferred_model) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {getModelDisplayInfo(settings.preferred_model)?.description}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="fallback-model">Fallback Model</Label>
                  <Select 
                    value={settings.fallback_model} 
                    onValueChange={(value) => setSettings(prev => ({ ...prev, fallback_model: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getModelsByProvider(settings.preferred_ai_provider).map((model) => (
                        <SelectItem key={model.id} value={model.model_name}>
                          {model.model_display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="temperature">Model Temperature: {settings.model_temperature}</Label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.model_temperature}
                  onChange={(e) => setSettings(prev => ({ ...prev, model_temperature: parseFloat(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Conservative</span>
                  <span>Balanced</span>
                  <span>Creative</span>
                </div>
              </div>

              {/* Test Generation */}
              <Separator />
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <TestTube className="h-4 w-4" />
                  Test Generation
                </h4>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter a test topic (e.g., 'Modern construction safety protocols')"
                    value={testTopic}
                    onChange={(e) => setTestTopic(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={testGeneration} disabled={testing || !testTopic.trim()}>
                    <TestTube className="h-4 w-4 mr-2" />
                    {testing ? 'Generating...' : 'Test'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Content Configuration
              </CardTitle>
              <CardDescription>
                Define content style, topics, and quality parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="word-count">Target Word Count</Label>
                  <Input
                    type="number"
                    min="500"
                    max="3000"
                    value={settings.target_word_count}
                    onChange={(e) => setSettings(prev => ({ ...prev, target_word_count: parseInt(e.target.value) }))}
                  />
                </div>

                <div>
                  <Label htmlFor="content-style">Content Style</Label>
                  <Select 
                    value={settings.content_style} 
                    onValueChange={(value) => setSettings(prev => ({ ...prev, content_style: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="conversational">Conversational</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="analysis-depth">Content Analysis Depth</Label>
                  <Select 
                    value={settings.content_analysis_depth} 
                    onValueChange={(value) => setSettings(prev => ({ ...prev, content_analysis_depth: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="title">Title Only</SelectItem>
                      <SelectItem value="excerpt">Title + Excerpt</SelectItem>
                      <SelectItem value="full">Full Content</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="industry-focus">Industry Focus</Label>
                <Input
                  placeholder="construction, project management, technology"
                  value={settings.industry_focus.join(', ')}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    industry_focus: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  }))}
                />
              </div>

              <div>
                <Label htmlFor="target-keywords">Target Keywords</Label>
                <Input
                  placeholder="construction management, project planning, safety protocols"
                  value={settings.target_keywords.join(', ')}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    target_keywords: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  }))}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.topic_diversity_enabled}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, topic_diversity_enabled: checked }))}
                  />
                  <Label>Enable topic diversity checking</Label>
                </div>

                {settings.topic_diversity_enabled && (
                  <div>
                    <Label htmlFor="topic-gap">Minimum days between similar topics</Label>
                    <Input
                      type="number"
                      min="1"
                      max="365"
                      value={settings.minimum_topic_gap_days}
                      onChange={(e) => setSettings(prev => ({ ...prev, minimum_topic_gap_days: parseInt(e.target.value) }))}
                    />
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="custom-instructions">Custom Instructions</Label>
                <Textarea
                  placeholder="Additional instructions for content generation..."
                  value={settings.custom_instructions || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, custom_instructions: e.target.value }))}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="brand-voice">Brand Voice Guidelines</Label>
                <Textarea
                  placeholder="Describe your brand voice and tone..."
                  value={settings.brand_voice_guidelines || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, brand_voice_guidelines: e.target.value }))}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO & GEO Tab */}
        <TabsContent value="seo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                SEO & GEO Optimization
              </CardTitle>
              <CardDescription>
                Configure traditional SEO, Generative Engine Optimization (GEO), and AI search optimization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                              <div>
                <Label htmlFor="seo-focus">Content Strategy Focus</Label>
                <Select 
                  value={settings.seo_focus} 
                  onValueChange={(value) => setSettings(prev => ({ ...prev, seo_focus: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="traditional">Traditional SEO Focus</SelectItem>
                    <SelectItem value="geo">Generative Engine Optimization (GEO) Focus</SelectItem>
                    <SelectItem value="balanced">Balanced Traditional + GEO</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Generative Engine Optimization (GEO) */}
              <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.geo_optimization}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, geo_optimization: checked }))}
                  />
                  <Label className="font-medium">Enable Generative Engine Optimization (GEO)</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Optimizes content for AI-powered search engines like ChatGPT, Claude, Perplexity, and Google's AI Overviews. 
                  This creates content that AI systems can easily understand, cite, and reference.
                </p>
              </div>

              {/* AI-Specific Optimizations */}
              <div className="space-y-4">
                <h4 className="font-medium">AI Search Engine Optimizations</h4>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.perplexity_optimization}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, perplexity_optimization: checked }))}
                  />
                  <Label>Optimize for Perplexity AI & Conversational AI</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.ai_search_optimization}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, ai_search_optimization: checked }))}
                  />
                  <Label>Optimize for Google AI Overviews & Featured Snippets</Label>
                </div>
              </div>

              {/* Geographic/Local SEO */}
              <div className="space-y-4">
                <h4 className="font-medium">Geographic/Local SEO</h4>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.optimize_for_geographic}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, optimize_for_geographic: checked }))}
                  />
                  <Label>Enable geographic/local search optimization</Label>
                </div>

                {settings.optimize_for_geographic && (
                  <div>
                    <Label htmlFor="target-locations">Target Locations</Label>
                    <Input
                      placeholder="New York, Los Angeles, Chicago"
                      value={settings.target_locations.join(', ')}
                      onChange={(e) => setSettings(prev => ({ 
                        ...prev, 
                        target_locations: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      }))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Add specific cities or regions for local SEO optimization
                    </p>
                  </div>
                )}
              </div>

              <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertDescription>
                  <strong>Generative Engine Optimization (GEO)</strong> is the new frontier of content optimization. 
                  Unlike traditional SEO that targets search result rankings, GEO optimizes content to be easily 
                  understood, cited, and referenced by AI systems when generating responses to user queries.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Publishing Tab */}
        <TabsContent value="publishing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Publishing & Notifications</CardTitle>
              <CardDescription>
                Configure how generated content is published and reviewed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={settings.auto_publish}
                  onCheckedChange={(checked) => setSettings(prev => ({ 
                    ...prev, 
                    auto_publish: checked,
                    publish_as_draft: !checked // If auto-publish is enabled, don't save as draft
                  }))}
                />
                <Label>Automatically publish generated content</Label>
              </div>

              {!settings.auto_publish && (
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={settings.publish_as_draft}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, publish_as_draft: checked }))}
                  />
                  <Label>Save as draft for review</Label>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  checked={settings.require_review}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, require_review: checked }))}
                />
                <Label>Require manual review before publishing</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={settings.notify_on_generation}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, notify_on_generation: checked }))}
                />
                <Label>Send notifications when content is generated</Label>
              </div>

              {settings.notify_on_generation && (
                <div>
                  <Label htmlFor="notification-emails">Notification Emails</Label>
                  <Input
                    placeholder="admin@company.com, manager@company.com"
                    value={settings.notification_emails.join(', ')}
                    onChange={(e) => setSettings(prev => ({ 
                      ...prev, 
                      notification_emails: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    }))}
                  />
                </div>
              )}

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  We recommend starting with draft mode and manual review to ensure 
                  content quality meets your standards before enabling auto-publishing.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Generation Queue */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Generation Queue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {queueItems.length > 0 ? (
                    queueItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{item.suggested_topic || 'Auto-generated topic'}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(item.scheduled_for).toLocaleString()}
                          </p>
                        </div>
                        {getStatusBadge(item.status)}
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No items in queue</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Topic Diversity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Content Diversity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {diversityAnalysis ? (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Total Posts</span>
                        <span>{diversityAnalysis.totalPosts}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Unique Topics</span>
                        <span>{diversityAnalysis.uniqueTopics}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Diversity Score</span>
                        <span>{Math.round((diversityAnalysis.uniqueTopics / diversityAnalysis.totalPosts) * 100)}%</span>
                      </div>
                    </div>
                    <Progress 
                      value={(diversityAnalysis.uniqueTopics / diversityAnalysis.totalPosts) * 100} 
                      className="w-full" 
                    />
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No data available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generated Content Preview</DialogTitle>
            <DialogDescription>
              Review the AI-generated content before publishing
            </DialogDescription>
          </DialogHeader>
          
          {previewContent && (
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <p className="font-medium">{previewContent.title}</p>
              </div>
              
              <div>
                <Label>SEO Title</Label>
                <p className="text-sm">{previewContent.seo_title}</p>
              </div>
              
              <div>
                <Label>SEO Description</Label>
                <p className="text-sm">{previewContent.seo_description}</p>
              </div>
              
              <div>
                <Label>Excerpt</Label>
                <p className="text-sm">{previewContent.excerpt}</p>
              </div>
              
              <div>
                <Label>Content</Label>
                <div className="max-h-64 overflow-y-auto border rounded p-3 text-sm">
                  <pre className="whitespace-pre-wrap">{previewContent.body}</pre>
                </div>
              </div>
              
              {previewContent.keywords && (
                <div>
                  <Label>Keywords</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {previewContent.keywords.map((keyword: string, index: number) => (
                      <Badge key={index} variant="outline">{keyword}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BlogAutoGeneration; 