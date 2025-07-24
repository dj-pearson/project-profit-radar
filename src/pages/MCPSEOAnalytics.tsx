import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Settings, 
  BarChart3, 
  Zap, 
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import MCPSEODashboard from "@/components/seo/MCPSEODashboard";
import MCPSetupWizard from "@/components/seo/MCPSetupWizard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

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
      
      // Try to test the APIs directly to see if credentials are configured
      const { data, error } = await supabase.functions.invoke('google-analytics-api', {
        body: { action: 'get-metrics', dateRange: { startDate: '7daysAgo', endDate: 'today' } }
      });

      if (error) {
        console.error('API credentials not configured:', error);
        setMcpConfigured(false);
        localStorage.setItem('mcp_ga_configured', 'false');
        localStorage.setItem('mcp_gsc_configured', 'false');
        return;
      }

      // If we get here, the APIs are working
      setMcpConfigured(true);
      localStorage.setItem('mcp_ga_configured', 'true');
      localStorage.setItem('mcp_gsc_configured', 'true');

    } catch (error) {
      console.error('Error checking API credentials:', error);
      setMcpConfigured(false);
      localStorage.setItem('mcp_ga_configured', 'false');
      localStorage.setItem('mcp_gsc_configured', 'false');
    } finally {
      setChecking(false);
    }
  };

  if (!user || userProfile?.role !== 'root_admin') {
    return (
      <DashboardLayout title="SEO Analytics (MCP)">
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
                This feature requires root admin access. SEO analytics 
                provides deep insights into your website performance.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (checking) {
    return (
      <DashboardLayout title="SEO Analytics (MCP)">
        <div className="flex items-center justify-center py-12">
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
      </DashboardLayout>
    );
  }

  if (showSetup) {
    return (
      <DashboardLayout title="SEO Analytics - Setup Guide">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
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
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="SEO Analytics (MCP)" showTrialBanner={false}>
      <div className="space-y-6">
        {!mcpConfigured && (
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
                <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                  <p className="text-xs text-blue-700">
                    <strong>Note:</strong> Make sure you've deployed the Google Analytics and Search Console Edge Functions to your Supabase project.
                  </p>
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
        )}

        {mcpConfigured && (
          <Alert className="border-green-200 bg-green-50">
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

        <MCPSEODashboard />
      </div>
    </DashboardLayout>
  );
};

export default MCPSEOAnalytics; 