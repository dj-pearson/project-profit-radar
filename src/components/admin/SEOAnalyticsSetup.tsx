import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  ExternalLink, 
  CheckCircle, 
  Settings,
  Key,
  Globe,
  Search
} from 'lucide-react';

interface SEOAnalyticsSetupProps {
  onClose?: () => void;
}

const SEOAnalyticsSetup: React.FC<SEOAnalyticsSetupProps> = ({ onClose }) => {
  return (
    <div className="space-y-6">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          SEO Analytics requires additional setup to connect with Google Search Console and Bing Webmaster Tools.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4">
        {/* Google Analytics vs Search Console */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              What's the difference?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="font-medium">Google Analytics</span>
              <Badge variant="secondary">✅ Already configured</Badge>
            </div>
            <p className="text-sm text-muted-foreground ml-6">
              Tracks website traffic, user behavior, page views, and conversions. This is working with your tracking ID: G-LNDT7H4SJR
            </p>

            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-orange-500" />
              <span className="font-medium">Google Search Console</span>
              <Badge variant="outline">⚙️ Requires setup</Badge>
            </div>
            <p className="text-sm text-muted-foreground ml-6">
              Tracks search rankings, impressions, clicks from Google search results, and SEO performance data.
            </p>
          </CardContent>
        </Card>

        {/* Setup Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Required Setup Steps
            </CardTitle>
            <CardDescription>
              To enable full SEO Analytics, these steps need to be completed by a developer:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="text-xs">1</Badge>
                <div>
                  <p className="font-medium">Create Google Cloud Project</p>
                  <p className="text-sm text-muted-foreground">Set up a project at Google Cloud Console</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Badge variant="outline" className="text-xs">2</Badge>
                <div>
                  <p className="font-medium">Enable APIs</p>
                  <p className="text-sm text-muted-foreground">Enable Google Search Console API and Bing Webmaster API</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Badge variant="outline" className="text-xs">3</Badge>
                <div>
                  <p className="font-medium">Configure OAuth Credentials</p>
                  <p className="text-sm text-muted-foreground">Create OAuth 2.0 client credentials and add to Supabase environment variables</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Badge variant="outline" className="text-xs">4</Badge>
                <div>
                  <p className="font-medium">Verify Website Ownership</p>
                  <p className="text-sm text-muted-foreground">Verify build-desk.com in Google Search Console and Bing Webmaster Tools</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alternative Solution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Alternative: Use Google Analytics 4 for SEO Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              While Google Search Console provides the most comprehensive SEO data, you can get valuable insights from Google Analytics 4:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Organic search traffic trends</li>
              <li>• Top landing pages from search</li>
              <li>• User behavior on your site</li>
              <li>• Conversion tracking</li>
            </ul>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open('https://analytics.google.com', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              View Google Analytics Dashboard
            </Button>
          </CardContent>
        </Card>

        {/* Current Status */}
        <Card>
          <CardHeader>
            <CardTitle>Current Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Google Analytics</span>
              <Badge variant="secondary" className="text-green-600">✅ Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Google Search Console</span>
              <Badge variant="outline" className="text-orange-600">⚙️ Setup Required</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Bing Webmaster Tools</span>
              <Badge variant="outline" className="text-orange-600">⚙️ Setup Required</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {onClose && (
        <div className="flex justify-end pt-4">
          <Button onClick={onClose} variant="outline">
            I Understand
          </Button>
        </div>
      )}
    </div>
  );
};

export default SEOAnalyticsSetup; 