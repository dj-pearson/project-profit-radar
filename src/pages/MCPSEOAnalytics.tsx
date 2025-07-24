import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Settings, 
  BarChart3, 
  Zap, 
  ExternalLink,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import MCPSEODashboard from "@/components/seo/MCPSEODashboard";
import MCPSetupWizard from "@/components/seo/MCPSetupWizard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const MCPSEOAnalytics: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [mcpConfigured, setMcpConfigured] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [checking, setChecking] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkAPICredentials();
  }, []);

  const checkAPICredentials = async () => {
    try {
      setChecking(true);
      
      // Check if Google Analytics and Search Console credentials are configured
      const { data, error } = await supabase.functions.invoke('mcp-credentials', {
        body: { action: 'get-credentials' }
      });

      if (error) {
        console.error('Error checking credentials:', error);
        setMcpConfigured(false);
        return;
      }

      const isConfigured = data?.configured?.both || false;
      setMcpConfigured(isConfigured);
      
      // Update localStorage for the dashboard component
      localStorage.setItem('mcp_ga_configured', isConfigured ? 'true' : 'false');
      localStorage.setItem('mcp_gsc_configured', isConfigured ? 'true' : 'false');

    } catch (error) {
      console.error('Error checking API credentials:', error);
      setMcpConfigured(false);
    } finally {
      setChecking(false);
    }
  };

  if (!user || userProfile?.role !== 'root_admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
              Access Restricted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This feature requires root admin access. MCP-powered SEO analytics 
              provides deep insights into your website performance.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showSetup) {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="outline" 
              onClick={() => setShowSetup(false)}
            >
              ← Back to Dashboard
            </Button>
            <Button 
              variant="default"
              onClick={() => {
                checkAPICredentials();
                setShowSetup(false);
              }}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Check Configuration
            </Button>
          </div>
          <MCPSetupWizard />
        </div>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-blue-500" />
              Loading SEO Analytics...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Checking Google Analytics and Search Console API configuration...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {!mcpConfigured && (
        <div className="m-6">
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center text-orange-800">
                <Zap className="h-5 w-5 mr-2" />
                Google APIs Not Configured
              </CardTitle>
              <CardDescription className="text-orange-700">
                Add your Google Analytics and Search Console credentials to see real SEO data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white/50 p-4 rounded-lg">
                <h4 className="font-medium text-orange-800 mb-2">Required Supabase Secrets:</h4>
                <div className="space-y-1 text-sm text-orange-700">
                  <div>• <code>GOOGLE_CLIENT_EMAIL</code> - Service account email</div>
                  <div>• <code>GOOGLE_PRIVATE_KEY</code> - Service account private key</div>
                  <div>• <code>GA4_PROPERTY_ID</code> - Your Google Analytics property ID</div>
                  <div>• <code>SEARCH_CONSOLE_SITE_URL</code> - Your website URL (e.g., https://build-desk.com)</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="default"
                  onClick={() => setShowSetup(true)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Setup Guide
                </Button>
                <Button 
                  variant="outline"
                  onClick={checkAPICredentials}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Recheck Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {mcpConfigured && (
        <Alert className="m-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <div className="flex items-center justify-between">
              <div>
                <strong>APIs Configured:</strong> Google Analytics and Search Console are connected and providing real data.
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={checkAPICredentials}
                className="ml-4"
              >
                <Settings className="h-4 w-4 mr-2" />
                Refresh Status
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">SEO Analytics</h1>
            <p className="text-muted-foreground">
              AI-powered insights from your Google Analytics and Search Console data
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={mcpConfigured ? 'default' : 'secondary'}>
              {mcpConfigured ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  MCP Connected
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Setup Required
                </>
              )}
            </Badge>
            <Button 
              variant="outline" 
              onClick={() => setShowSetup(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              MCP Setup
            </Button>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList>
            <TabsTrigger value="dashboard">
              <BarChart3 className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="about">
              <ExternalLink className="h-4 w-4 mr-2" />
              About MCP
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <MCPSEODashboard />
          </TabsContent>

          <TabsContent value="about" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="h-5 w-5 mr-2 text-blue-600" />
                    What is MCP?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Model Context Protocol (MCP) enables Claude and other AI assistants 
                    to securely connect to your data sources and tools.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                      Direct access to live data
                    </div>
                    <div className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                      AI-powered data analysis
                    </div>
                    <div className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                      Natural language queries
                    </div>
                    <div className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                      Secure, authenticated connections
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-green-600" />
                    SEO Benefits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Transform your SEO workflow with AI-powered insights from 
                    your actual website performance data.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                      Real-time performance monitoring
                    </div>
                    <div className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                      Automated content recommendations
                    </div>
                    <div className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                      Keyword opportunity identification
                    </div>
                    <div className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                      Technical SEO issue detection
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Sample AI Queries You Can Run</CardTitle>
                  <CardDescription>
                    With MCP configured, you can ask Claude these types of questions about your website
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Traffic Analysis</h4>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div>"What pages are losing traffic this month?"</div>
                        <div>"Compare mobile vs desktop performance"</div>
                        <div>"Show me traffic sources breakdown"</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Search Performance</h4>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div>"Which keywords have declining CTR?"</div>
                        <div>"Find pages with high impressions, low clicks"</div>
                        <div>"What queries rank on page 2?"</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Content Strategy</h4>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div>"What topics should I write about next?"</div>
                        <div>"Find content gaps in my niche"</div>
                        <div>"Analyze top competitor keywords"</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Technical SEO</h4>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div>"Identify pages with indexing issues"</div>
                        <div>"Find slow-loading pages affecting SEO"</div>
                        <div>"Check mobile usability problems"</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Learn More</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://developers.google.com/analytics/devguides/MCP" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Google Analytics MCP Docs
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://github.com/ahonn/mcp-server-gsc" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Search Console MCP GitHub
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Model Context Protocol
                      </a>
                    </Button>
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

export default MCPSEOAnalytics; 