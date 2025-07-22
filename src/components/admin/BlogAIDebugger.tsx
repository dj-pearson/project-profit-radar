import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Bug, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Database,
  Zap,
  Key,
  Settings
} from 'lucide-react';

interface DebugResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

const BlogAIDebugger = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<DebugResult[]>([]);
  const [testTopic, setTestTopic] = useState('Construction Safety Best Practices');

  const runDiagnostics = async () => {
    setTesting(true);
    const debugResults: DebugResult[] = [];

    try {
      // Test 1: Check if tables exist
      try {
        const { data: settingsData, error: settingsError } = await supabase
          .from('blog_auto_generation_settings')
          .select('count()', { count: 'exact' })
          .limit(1);

        if (settingsError) {
          debugResults.push({
            test: 'Database Tables',
            status: 'fail',
            message: 'blog_auto_generation_settings table does not exist',
            details: settingsError
          });
        } else {
          debugResults.push({
            test: 'Database Tables',
            status: 'pass',
            message: 'All required tables exist'
          });
        }
      } catch (error) {
        debugResults.push({
          test: 'Database Tables',
          status: 'fail',
          message: 'Database connection failed',
          details: error
        });
      }

      // Test 2: Check AI models
      try {
        const { data: modelsData, error: modelsError } = await supabase
          .from('ai_model_configurations')
          .select('*')
          .eq('is_active', true);

        if (modelsError) {
          debugResults.push({
            test: 'AI Models Configuration',
            status: 'fail',
            message: 'Cannot access AI models table',
            details: modelsError
          });
        } else if (!modelsData || modelsData.length === 0) {
          debugResults.push({
            test: 'AI Models Configuration',
            status: 'fail',
            message: 'No AI models configured. Run the setup script.',
            details: 'Models table is empty'
          });
        } else {
          const claudeModels = modelsData.filter(m => m.provider === 'claude');
          debugResults.push({
            test: 'AI Models Configuration',
            status: claudeModels.length > 0 ? 'pass' : 'warning',
            message: `${modelsData.length} models found (${claudeModels.length} Claude models)`,
            details: modelsData.map(m => `${m.provider}: ${m.model_display_name}`)
          });
        }
      } catch (error) {
        debugResults.push({
          test: 'AI Models Configuration',
          status: 'fail',
          message: 'Error checking AI models',
          details: error
        });
      }

      // Test 3: Check Edge Functions
      try {
        const { data: functionData, error: functionError } = await supabase.functions.invoke('enhanced-blog-ai', {
          body: {
            action: 'test-generation',
            topic: testTopic,
            customSettings: {
              preferred_ai_provider: 'claude',
              preferred_model: 'claude-3-5-sonnet-20241022',
              model_temperature: 0.7,
              target_word_count: 500,
              content_style: 'professional',
              industry_focus: ['construction'],
              target_keywords: ['construction', 'safety'],
              geo_optimization: true,
              perplexity_optimization: true,
              ai_search_optimization: true,
              optimize_for_geographic: false,
              target_locations: [],
              seo_focus: 'balanced',
              topic_diversity_enabled: false,
              minimum_topic_gap_days: 30,
              content_analysis_depth: 'excerpt'
            }
          }
        });

        if (functionError) {
          debugResults.push({
            test: 'Edge Function Test',
            status: 'fail',
            message: 'enhanced-blog-ai function failed',
            details: functionError
          });
        } else if (functionData?.success) {
          const content = functionData.content;
          const isActualAI = content?.body && content.body.length > 1000 && !content.body.includes('This is a comprehensive guide about');
          
          debugResults.push({
            test: 'Edge Function Test',
            status: isActualAI ? 'pass' : 'warning',
            message: isActualAI ? 'AI generation working!' : 'Function works but using fallback content',
            details: {
              contentLength: content?.body?.length || 0,
              title: content?.title,
              isUsingFallback: content?.body?.includes('This is a comprehensive guide about')
            }
          });
        } else {
          debugResults.push({
            test: 'Edge Function Test',
            status: 'warning',
            message: 'Function responded but no content generated',
            details: functionData
          });
        }
      } catch (error) {
        debugResults.push({
          test: 'Edge Function Test',
          status: 'fail',
          message: 'Edge function not accessible or not deployed',
          details: error
        });
      }

      // Test 4: Check Environment Variables (indirect test)
      const hasFailures = debugResults.some(r => r.test === 'Edge Function Test' && r.status === 'warning' && r.details?.isUsingFallback);
      if (hasFailures) {
        debugResults.push({
          test: 'API Keys Configuration',
          status: 'warning',
          message: 'Likely missing CLAUDE_API_KEY environment variable',
          details: 'Function is using fallback content, which suggests Claude API is not accessible'
        });
      } else if (debugResults.some(r => r.test === 'Edge Function Test' && r.status === 'pass')) {
        debugResults.push({
          test: 'API Keys Configuration',
          status: 'pass',
          message: 'API keys appear to be configured correctly'
        });
      }

      setResults(debugResults);

    } catch (error) {
      console.error('Diagnostics failed:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to run diagnostics"
      });
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pass':
        return <Badge className="bg-green-500">Pass</Badge>;
      case 'fail':
        return <Badge variant="destructive">Fail</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500">Warning</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            AI Blog Generation Diagnostics
          </CardTitle>
          <CardDescription>
            Run this to diagnose why AI generation might not be working properly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="test-topic">Test Topic</Label>
            <Input
              id="test-topic"
              value={testTopic}
              onChange={(e) => setTestTopic(e.target.value)}
              placeholder="Enter a topic to test generation"
            />
          </div>
          
          <Button onClick={runDiagnostics} disabled={testing} className="w-full">
            <Bug className="h-4 w-4 mr-2" />
            {testing ? 'Running Diagnostics...' : 'Run Diagnostics'}
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Diagnostic Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.map((result, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                <div className="flex-shrink-0 mt-0.5">
                  {getStatusIcon(result.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{result.test}</h4>
                    {getStatusBadge(result.status)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{result.message}</p>
                  {result.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                        Show details
                      </summary>
                      <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.some(r => r.test === 'Database Tables' && r.status === 'fail') && (
                <Alert>
                  <Database className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Database Setup Required:</strong> Run the SQL setup script in your Supabase dashboard.
                    Go to SQL Editor and execute the contents of <code>setup-blog-auto-generation.sql</code>.
                  </AlertDescription>
                </Alert>
              )}

              {results.some(r => r.test === 'AI Models Configuration' && r.status === 'fail') && (
                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Models Configuration:</strong> The AI models table is empty. 
                    Make sure to run the complete setup script which includes model data.
                  </AlertDescription>
                </Alert>
              )}

              {results.some(r => r.test === 'Edge Function Test' && r.status === 'fail') && (
                <Alert>
                  <Zap className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Edge Function Missing:</strong> Deploy the enhanced-blog-ai Edge Function.
                    Copy the function code to your Supabase Edge Functions dashboard.
                  </AlertDescription>
                </Alert>
              )}

              {results.some(r => r.test === 'API Keys Configuration' && r.status === 'warning') && (
                <Alert>
                  <Key className="h-4 w-4" />
                  <AlertDescription>
                    <strong>API Key Missing:</strong> Add <code>CLAUDE_API_KEY</code> to your Supabase Edge Functions environment variables.
                    Go to Settings → Edge Functions → Environment Variables.
                  </AlertDescription>
                </Alert>
              )}

              {results.every(r => r.status === 'pass') && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>All Systems Working!</strong> Your AI blog generation system is properly configured and functioning.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BlogAIDebugger; 