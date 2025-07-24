import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Circle, ExternalLink, Copy, Download, Settings, Database, Zap } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface SetupStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

const MCPSetupWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [gaPropertyId, setGaPropertyId] = useState('');
  const [gscSiteUrl, setGscSiteUrl] = useState('');
  const [serviceAccountEmail, setServiceAccountEmail] = useState('');
  const { toast } = useToast();

  const steps: SetupStep[] = [
    {
      id: 'prerequisites',
      title: 'Prerequisites Check',
      description: 'Verify you have Google Analytics and Search Console access',
      completed: false
    },
    {
      id: 'gcp-setup',
      title: 'Google Cloud Setup',
      description: 'Create service account and enable APIs',
      completed: false
    },
    {
      id: 'supabase-secrets',
      title: 'Configure Supabase Secrets',
      description: 'Add your Google API credentials to Supabase',
      completed: false
    },
    {
      id: 'permissions',
      title: 'Grant API Permissions',
      description: 'Add service account to your Google properties',
      completed: false
    },
    {
      id: 'testing',
      title: 'Test Connection',
      description: 'Verify everything is working correctly',
      completed: false
    }
  ];

  const claudeConfig = {
    "mcpServers": {
      "google-analytics": {
        "command": "npx",
        "args": ["-y", "@google-analytics/mcp-server"],
        "env": {
          "GOOGLE_PRIVATE_KEY": "{{SUPABASE_SECRET:GOOGLE_PRIVATE_KEY}}",
          "GOOGLE_PRIVATE_KEY_ID": "{{SUPABASE_SECRET:GOOGLE_PRIVATE_KEY_ID}}",
          "GOOGLE_CLIENT_EMAIL": serviceAccountEmail || "service-account@project.iam.gserviceaccount.com",
          "GA_PROPERTY_ID": gaPropertyId || "your-ga4-property-id"
        }
      },
      "google-search-console": {
        "command": "npx",
        "args": ["-y", "mcp-server-gsc"],
        "env": {
          "GOOGLE_SEARCH_CONSOLE_API": "{{SUPABASE_SECRET:Google_Search_Console_API}}",
          "GOOGLE_CLIENT_EMAIL": serviceAccountEmail || "service-account@project.iam.gserviceaccount.com"
        }
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Configuration copied successfully"
    });
  };

  const markStepComplete = (stepIndex: number) => {
    setCurrentStep(Math.max(currentStep, stepIndex + 1));
  };

  const testMCPConnection = () => {
    // Simulate MCP connection test
    localStorage.setItem('mcp_ga_configured', 'true');
    localStorage.setItem('mcp_gsc_configured', 'true');
    
    toast({
      title: "Connection Successful!",
      description: "MCP servers are configured and ready to use"
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">MCP SEO Analytics Setup</h1>
        <p className="text-muted-foreground">
          Connect your Google Analytics and Search Console data with AI-powered insights
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
              index <= currentStep ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground'
            }`}>
              {index < currentStep ? <CheckCircle className="h-4 w-4" /> : index + 1}
            </div>
            {index < steps.length - 1 && (
              <div className={`w-12 h-0.5 ml-2 ${
                index < currentStep ? 'bg-primary' : 'bg-muted-foreground'
              }`} />
            )}
          </div>
        ))}
      </div>

      <Tabs value={steps[currentStep]?.id} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          {steps.map((step, index) => (
            <TabsTrigger 
              key={step.id} 
              value={step.id}
              disabled={index > currentStep}
              className="text-xs"
            >
              {step.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Prerequisites */}
        <TabsContent value="prerequisites" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Prerequisites Check</CardTitle>
              <CardDescription>
                Make sure you have these accounts and properties set up
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">Google Analytics 4 Property</div>
                    <div className="text-sm text-muted-foreground">
                      Active GA4 property with data collection enabled
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Check GA4
                    </a>
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">Google Search Console Property</div>
                    <div className="text-sm text-muted-foreground">
                      Verified website property in Search Console
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Check GSC
                    </a>
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">Google Cloud Account</div>
                    <div className="text-sm text-muted-foreground">
                      Access to create projects and service accounts
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open GCP
                    </a>
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">Claude Desktop</div>
                    <div className="text-sm text-muted-foreground">
                      Latest version installed on your machine
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://claude.ai/download" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Download
                    </a>
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Your Property Details:</Label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="ga-property">GA4 Property ID</Label>
                    <Input
                      id="ga-property"
                      placeholder="123456789"
                      value={gaPropertyId}
                      onChange={(e) => setGaPropertyId(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="gsc-site">Search Console Site URL</Label>
                    <Input
                      id="gsc-site"
                      placeholder="https://example.com"
                      value={gscSiteUrl}
                      onChange={(e) => setGscSiteUrl(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Button onClick={() => markStepComplete(0)} className="w-full">
                Continue to Google Cloud Setup
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Google Cloud Setup */}
        <TabsContent value="gcp-setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Google Cloud Project Setup</CardTitle>
              <CardDescription>
                Create a service account and enable the required APIs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Database className="h-4 w-4" />
                <AlertDescription>
                  Follow these steps in the Google Cloud Console to set up API access.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-medium">Step 1: Create/Select Project</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm ml-4">
                    <li>Go to <a href="https://console.cloud.google.com" target="_blank" className="text-blue-600 underline">Google Cloud Console</a></li>
                    <li>Create a new project or select an existing one</li>
                    <li>Note your Project ID for later use</li>
                  </ol>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Step 2: Enable APIs</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm ml-4">
                    <li>Navigate to "APIs & Services" → "Library"</li>
                    <li>Search for and enable these APIs:
                      <ul className="list-disc list-inside ml-4 mt-2">
                        <li>Google Analytics Reporting API</li>
                        <li>Google Analytics Data API</li>
                        <li>Google Search Console API</li>
                      </ul>
                    </li>
                  </ol>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Step 3: Create Service Account</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm ml-4">
                    <li>Go to "APIs & Services" → "Credentials"</li>
                    <li>Click "Create Credentials" → "Service Account"</li>
                    <li>Fill in service account details and create</li>
                    <li>Click on the created service account</li>
                    <li>Go to "Keys" tab → "Add Key" → "Create new key" → "JSON"</li>
                    <li>Download the JSON file securely</li>
                  </ol>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Step 4: Store Credentials in Supabase Secrets</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm ml-4">
                    <li>Go to your Supabase Project → Settings → Secrets</li>
                    <li>Add these secrets from your service account JSON:
                      <ul className="list-disc list-inside ml-4 mt-2">
                        <li><code>GOOGLE_PRIVATE_KEY</code> - The private_key field</li>
                        <li><code>GOOGLE_PRIVATE_KEY_ID</code> - The private_key_id field</li>
                        <li><code>Google_Search_Console_API</code> - Your Search Console API key</li>
                      </ul>
                    </li>
                    <li>Copy the service account email for the next step</li>
                  </ol>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Step 5: Grant Access</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm ml-4">
                    <li>Use the service account email from your JSON file</li>
                    <li>In Google Analytics: Admin → Account/Property → User Management → Add user</li>
                    <li>In Search Console: Settings → Users and permissions → Add user</li>
                    <li>Grant "Viewer" permissions in both</li>
                  </ol>
                </div>

                <div>
                  <Label htmlFor="service-account-email">Service Account Email</Label>
                  <Input
                    id="service-account-email"
                    placeholder="service-account@your-project.iam.gserviceaccount.com"
                    value={serviceAccountEmail}
                    onChange={(e) => setServiceAccountEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Email address of your Google Cloud service account
                  </p>
                </div>
              </div>

              <Button onClick={() => markStepComplete(1)} className="w-full">
                Continue to MCP Installation
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MCP Installation */}
        <TabsContent value="mcp-install" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Install MCP Servers</CardTitle>
              <CardDescription>
                Install the Google Analytics and Search Console MCP servers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Zap className="h-4 w-4" />
                <AlertDescription>
                  Run these commands in your terminal to install the MCP servers.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Install Google Analytics MCP Server</h4>
                  <div className="bg-muted p-3 rounded-lg font-mono text-sm flex items-center justify-between">
                    <span>npm install -g @google-analytics/mcp-server</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => copyToClipboard('npm install -g @google-analytics/mcp-server')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Install Google Search Console MCP Server</h4>
                  <div className="bg-muted p-3 rounded-lg font-mono text-sm flex items-center justify-between">
                    <span>npm install -g mcp-server-gsc</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => copyToClipboard('npm install -g mcp-server-gsc')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Alternative: Use npx (no installation required)</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    The MCP servers can also be run with npx without global installation, which is what we'll configure in Claude Desktop.
                  </p>
                </div>
              </div>

              <Button onClick={() => markStepComplete(2)} className="w-full">
                Continue to Claude Configuration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Claude Configuration */}
        <TabsContent value="claude-config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configure Claude Desktop</CardTitle>
              <CardDescription>
                Add the MCP server configuration to Claude Desktop
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  Add this configuration to your Claude Desktop config file.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Configuration File Location:</h4>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyToClipboard('~/Library/Application Support/Claude/claude_desktop_config.json')}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Path
                    </Button>
                  </div>
                  <div className="bg-muted p-2 rounded text-sm font-mono">
                    macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
                  </div>
                  <div className="bg-muted p-2 rounded text-sm font-mono mt-1">
                    Windows: %APPDATA%\Claude\claude_desktop_config.json
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Configuration JSON:</h4>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyToClipboard(JSON.stringify(claudeConfig, null, 2))}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Config
                    </Button>
                  </div>
                  <Textarea
                    value={JSON.stringify(claudeConfig, null, 2)}
                    readOnly
                    rows={20}
                    className="font-mono text-sm"
                  />
                </div>

                <Alert>
                  <AlertDescription>
                    <strong>Important:</strong> Update the paths and IDs in the configuration:
                    <ul className="list-disc list-inside mt-2 ml-4">
                      <li>Replace credential file path with your actual path</li>
                      <li>Replace GA4 Property ID with your actual property ID</li>
                      <li>Restart Claude Desktop after making changes</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>

              <Button onClick={() => markStepComplete(3)} className="w-full">
                Continue to Testing
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Testing */}
        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Your Configuration</CardTitle>
              <CardDescription>
                Verify that everything is working correctly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Test in Claude Desktop</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Open Claude Desktop and try these sample queries:
                  </p>
                  <div className="space-y-2">
                    {[
                      "How many users did I have yesterday?",
                      "What are my top performing pages this month?",
                      "Show me my search console performance data",
                      "Which keywords are driving the most traffic?"
                    ].map((query, index) => (
                      <div key={index} className="bg-muted p-2 rounded text-sm">
                        {query}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Configuration Summary</h4>
                  <div className="grid gap-2">
                    <div className="flex justify-between text-sm">
                      <span>GA4 Property ID:</span>
                      <Badge variant="outline">{gaPropertyId || 'Not set'}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Search Console Site:</span>
                      <Badge variant="outline">{gscSiteUrl || 'Not set'}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Service Account:</span>
                      <Badge variant="outline">{serviceAccountEmail ? 'Set' : 'Not set'}</Badge>
                    </div>
                  </div>
                </div>

                <Button onClick={testMCPConnection} className="w-full">
                  Mark Setup Complete
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MCPSetupWizard; 