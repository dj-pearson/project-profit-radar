import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Store,
  Search,
  Star,
  Download,
  Settings,
  Key,
  Code,
  Zap,
  Shield,
  CheckCircle,
  ExternalLink,
  Plus,
  Trash2
} from 'lucide-react';

interface MarketplaceIntegration {
  id: string;
  name: string;
  description: string;
  category: string;
  provider: string;
  icon: string;
  pricing: 'free' | 'paid' | 'freemium';
  rating: number;
  downloads: number;
  status: 'available' | 'installed' | 'configured';
  features: string[];
  api_documentation?: string;
  setup_complexity: 'easy' | 'medium' | 'advanced';
}

interface InstalledIntegration {
  id: string;
  integration_id: string;
  name: string;
  api_key?: string;
  config: Record<string, any>;
  is_active: boolean;
  created_at: string;
  last_used?: string;
}

const ThirdPartyMarketplace = () => {
  const { userProfile } = useAuth();
  const [integrations, setIntegrations] = useState<MarketplaceIntegration[]>([]);
  const [installedIntegrations, setInstalledIntegrations] = useState<InstalledIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<MarketplaceIntegration | null>(null);
  const [configData, setConfigData] = useState<Record<string, any>>({});

  const categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'communication', name: 'Communication' },
    { id: 'storage', name: 'Storage' },
    { id: 'productivity', name: 'Productivity' },
    { id: 'analytics', name: 'Analytics' },
    { id: 'automation', name: 'Automation' },
    { id: 'security', name: 'Security' }
  ];

  const mockIntegrations: MarketplaceIntegration[] = [
    {
      id: '1',
      name: 'Slack Integration',
      description: 'Get real-time project notifications and updates in your Slack channels',
      category: 'communication',
      provider: 'Slack Technologies',
      icon: '💬',
      pricing: 'free',
      rating: 4.8,
      downloads: 15420,
      status: 'available',
      features: ['Real-time notifications', 'Project updates', 'Team collaboration', 'Custom channels'],
      api_documentation: 'https://api.slack.com/docs',
      setup_complexity: 'easy'
    },
    {
      id: '2',
      name: 'Zapier Webhooks',
      description: 'Connect to 5000+ apps through Zapier automation workflows',
      category: 'automation',
      provider: 'Zapier Inc.',
      icon: '⚡',
      pricing: 'freemium',
      rating: 4.6,
      downloads: 8932,
      status: 'installed',
      features: ['5000+ app connections', 'Custom workflows', 'Trigger automation', 'Multi-step zaps'],
      api_documentation: 'https://zapier.com/developer/documentation',
      setup_complexity: 'medium'
    },
    {
      id: '3',
      name: 'AWS S3 Storage',
      description: 'Secure cloud storage for your project documents and files',
      category: 'storage',
      provider: 'Amazon Web Services',
      icon: '☁️',
      pricing: 'paid',
      rating: 4.9,
      downloads: 22103,
      status: 'available',
      features: ['Unlimited storage', 'Enterprise security', 'Global CDN', 'Version control'],
      api_documentation: 'https://docs.aws.amazon.com/s3',
      setup_complexity: 'advanced'
    },
    {
      id: '4',
      name: 'Google Analytics',
      description: 'Track project performance and user engagement metrics',
      category: 'analytics',
      provider: 'Google LLC',
      icon: '📊',
      pricing: 'free',
      rating: 4.5,
      downloads: 12745,
      status: 'configured',
      features: ['Traffic analysis', 'Custom reports', 'Goal tracking', 'Real-time data'],
      api_documentation: 'https://developers.google.com/analytics',
      setup_complexity: 'medium'
    },
    {
      id: '5',
      name: 'Twilio SMS',
      description: 'Send SMS notifications for project updates and alerts',
      category: 'communication',
      provider: 'Twilio Inc.',
      icon: '📱',
      pricing: 'paid',
      rating: 4.7,
      downloads: 6834,
      status: 'available',
      features: ['Global SMS delivery', 'Two-way messaging', 'Delivery reports', 'Templates'],
      api_documentation: 'https://www.twilio.com/docs/sms',
      setup_complexity: 'easy'
    },
    {
      id: '6',
      name: 'Auth0 Security',
      description: 'Enhanced authentication and user management',
      category: 'security',
      provider: 'Auth0 Inc.',
      icon: '🔐',
      pricing: 'freemium',
      rating: 4.4,
      downloads: 9456,
      status: 'available',
      features: ['SSO integration', 'Multi-factor auth', 'User analytics', 'Compliance'],
      api_documentation: 'https://auth0.com/docs/api',
      setup_complexity: 'advanced'
    }
  ];

  useEffect(() => {
    loadIntegrations();
    loadInstalledIntegrations();
  }, [userProfile]);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      // In real implementation, fetch from API
      setIntegrations(mockIntegrations);
    } catch (error) {
      console.error('Error loading integrations:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load marketplace integrations"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadInstalledIntegrations = async () => {
    try {
      // Mock installed integrations
      const mockInstalled: InstalledIntegration[] = [
        {
          id: '1',
          integration_id: '2',
          name: 'Zapier Webhooks',
          config: { webhook_url: 'https://hooks.zapier.com/...' },
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          integration_id: '4',
          name: 'Google Analytics',
          api_key: 'GA-XXXXX-X',
          config: { tracking_id: 'UA-XXXXX-X' },
          is_active: true,
          created_at: new Date().toISOString(),
          last_used: new Date().toISOString()
        }
      ];
      setInstalledIntegrations(mockInstalled);
    } catch (error) {
      console.error('Error loading installed integrations:', error);
    }
  };

  const handleInstallIntegration = async (integration: MarketplaceIntegration) => {
    setSelectedIntegration(integration);
    setConfigData({});
    setShowConfigDialog(true);
  };

  const handleConfigureIntegration = async () => {
    if (!selectedIntegration || !userProfile?.company_id) return;

    try {
      // Call edge function to install and configure integration
      const { error } = await supabase.functions.invoke('install-integration', {
        body: {
          company_id: userProfile.company_id,
          integration_id: selectedIntegration.id,
          config: configData
        }
      });

      if (error) throw error;

      toast({
        title: "Integration Installed",
        description: `${selectedIntegration.name} has been installed and configured successfully`
      });

      setShowConfigDialog(false);
      loadInstalledIntegrations();
      
      // Update integration status
      setIntegrations(prev => prev.map(int => 
        int.id === selectedIntegration.id 
          ? { ...int, status: 'configured' as const }
          : int
      ));
    } catch (error) {
      console.error('Installation error:', error);
      toast({
        variant: "destructive",
        title: "Installation Failed",
        description: "Failed to install integration. Please try again."
      });
    }
  };

  const toggleIntegration = async (installedId: string, enabled: boolean) => {
    try {
      setInstalledIntegrations(prev => prev.map(int =>
        int.id === installedId
          ? { ...int, is_active: enabled }
          : int
      ));

      toast({
        title: enabled ? "Integration Enabled" : "Integration Disabled",
        description: `Integration has been ${enabled ? 'enabled' : 'disabled'}`
      });
    } catch (error) {
      console.error('Toggle error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update integration status"
      });
    }
  };

  const removeIntegration = async (installedId: string) => {
    if (!confirm('Are you sure you want to remove this integration?')) {
      return;
    }

    try {
      const installed = installedIntegrations.find(i => i.id === installedId);
      if (installed) {
        setInstalledIntegrations(prev => prev.filter(i => i.id !== installedId));
        
        // Update marketplace status
        setIntegrations(prev => prev.map(int =>
          int.id === installed.integration_id
            ? { ...int, status: 'available' as const }
            : int
        ));
      }

      toast({
        title: "Integration Removed",
        description: "Integration has been removed successfully"
      });
    } catch (error) {
      console.error('Remove error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove integration"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'installed':
        return <Download className="h-4 w-4 text-blue-600" />;
      case 'configured':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'installed':
        return <Badge variant="secondary">Installed</Badge>;
      case 'configured':
        return <Badge className="bg-green-500 text-white">Active</Badge>;
      default:
        return <Badge variant="outline">Available</Badge>;
    }
  };

  const getPricingBadge = (pricing: string) => {
    switch (pricing) {
      case 'free':
        return <Badge className="bg-green-100 text-green-800">Free</Badge>;
      case 'paid':
        return <Badge className="bg-blue-100 text-blue-800">Paid</Badge>;
      case 'freemium':
        return <Badge className="bg-yellow-100 text-yellow-800">Freemium</Badge>;
      default:
        return null;
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'easy':
        return 'text-green-600';
      case 'medium':
        return 'text-yellow-600';
      case 'advanced':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const filteredIntegrations = integrations.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         integration.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || integration.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const renderConfigForm = () => {
    if (!selectedIntegration) return null;

    const commonFields = (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="api_key">API Key</Label>
          <Input
            id="api_key"
            type="password"
            placeholder="Enter your API key"
            value={configData.api_key || ''}
            onChange={(e) => setConfigData({ ...configData, api_key: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="webhook_url">Webhook URL (Optional)</Label>
          <Input
            id="webhook_url"
            placeholder="https://your-webhook-url.com"
            value={configData.webhook_url || ''}
            onChange={(e) => setConfigData({ ...configData, webhook_url: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="config_notes">Configuration Notes</Label>
          <Textarea
            id="config_notes"
            placeholder="Add any configuration notes or settings"
            value={configData.notes || ''}
            onChange={(e) => setConfigData({ ...configData, notes: e.target.value })}
          />
        </div>
      </div>
    );

    return commonFields;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Store className="h-5 w-5" />
          <h2 className="text-2xl font-semibold">Third-Party API Marketplace</h2>
        </div>
      </div>

      <Tabs defaultValue="marketplace" className="space-y-4">
        <TabsList>
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
          <TabsTrigger value="installed">Installed ({installedIntegrations.length})</TabsTrigger>
          <TabsTrigger value="custom">Custom Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="marketplace" className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search integrations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border rounded-md"
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Integration Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIntegrations.map((integration) => (
              <Card key={integration.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{integration.icon}</span>
                      <div>
                        <CardTitle className="text-lg">{integration.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{integration.provider}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(integration.status)}
                      {getStatusBadge(integration.status)}
                    </div>
                  </div>
                  <CardDescription className="text-sm">
                    {integration.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span>{integration.rating}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Download className="h-4 w-4 text-muted-foreground" />
                        <span>{integration.downloads.toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {getPricingBadge(integration.pricing)}
                      <Badge variant="outline" className={getComplexityColor(integration.setup_complexity)}>
                        {integration.setup_complexity} setup
                      </Badge>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-2">Features:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {integration.features.slice(0, 3).map((feature, index) => (
                          <li key={index} className="flex items-center space-x-2">
                            <div className="h-1 w-1 bg-muted-foreground rounded-full" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex space-x-2">
                      {integration.status === 'available' ? (
                        <Button 
                          onClick={() => handleInstallIntegration(integration)}
                          className="flex-1"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Install
                        </Button>
                      ) : (
                        <Button variant="outline" className="flex-1" disabled>
                          {integration.status === 'installed' ? 'Installed' : 'Active'}
                        </Button>
                      )}
                      {integration.api_documentation && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={integration.api_documentation} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="installed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Installed Integrations</CardTitle>
              <CardDescription>
                Manage your active third-party integrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {installedIntegrations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No integrations installed</p>
                  <p className="text-sm">Install integrations from the marketplace to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {installedIntegrations.map((installed) => (
                    <div key={installed.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <h4 className="font-medium">{installed.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Installed on {new Date(installed.created_at).toLocaleDateString()}
                          </p>
                          {installed.last_used && (
                            <p className="text-xs text-muted-foreground">
                              Last used: {new Date(installed.last_used).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Label htmlFor={`active-${installed.id}`} className="text-sm">
                            Active
                          </Label>
                          <Switch
                            id={`active-${installed.id}`}
                            checked={installed.is_active}
                            onCheckedChange={(checked) => toggleIntegration(installed.id, checked)}
                          />
                        </div>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4 mr-2" />
                          Configure
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => removeIntegration(installed.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Custom Integrations</CardTitle>
              <CardDescription>
                Build your own integrations using our API framework
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center space-x-2">
                    <Code className="h-4 w-4" />
                    <span>REST API Integration</span>
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Connect to any REST API endpoint with custom authentication and data mapping
                  </p>
                  <Button variant="outline">
                    Create REST Integration
                  </Button>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center space-x-2">
                    <Zap className="h-4 w-4" />
                    <span>Webhook Integration</span>
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Receive real-time data from external services via webhooks
                  </p>
                  <Button variant="outline">
                    Setup Webhook
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Configuration Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configure {selectedIntegration?.name}</DialogTitle>
            <DialogDescription>
              Enter the required configuration details for this integration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {renderConfigForm()}
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowConfigDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleConfigureIntegration}>
                Install & Configure
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ThirdPartyMarketplace;