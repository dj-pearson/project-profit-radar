import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Plug,
  Search,
  CheckCircle,
  XCircle,
  Settings,
  ExternalLink,
  Zap,
  Star,
  Users,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface IntegrationApp {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  logo_url: string;
  website_url: string;
  auth_type: string;
  features: string[];
  supports_webhooks: boolean;
  supports_two_way_sync: boolean;
  is_active: boolean;
  is_premium: boolean;
  is_beta: boolean;
  install_count: number;
  average_rating: number;
}

interface UserIntegration {
  id: string;
  app_id: string;
  status: string;
  is_active: boolean;
  sync_enabled: boolean;
  last_sync_at: string;
  app_name: string;
  app_slug: string;
  app_category: string;
}

export const IntegrationMarketplace = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<IntegrationApp[]>([]);
  const [userIntegrations, setUserIntegrations] = useState<UserIntegration[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [connectingApp, setConnectingApp] = useState<string | null>(null);

  useEffect(() => {
    loadMarketplaceData();
  }, []);

  const loadMarketplaceData = async () => {
    setLoading(true);
    try {
      // Load available apps
      const { data: appsData, error: appsError } = await (supabase as any)
        .from('integration_apps')
        .select('*')
        .eq('is_active', true)
        .order('install_count', { ascending: false });

      if (appsError) throw appsError;
      setApps(appsData || []);

      // Load user's installed integrations
      if (user) {
        const { data: userIntegrationsData, error: userIntegrationsError } = await (supabase as any)
          .from('user_integrations')
          .select(`
            *,
            integration_apps!inner(name, slug, category)
          `)
          .eq('user_id', user.id);

        if (userIntegrationsError) throw userIntegrationsError;

        const transformedIntegrations: UserIntegration[] = (userIntegrationsData || []).map((ui: any) => ({
          id: ui.id,
          app_id: ui.app_id,
          status: ui.status,
          is_active: ui.is_active,
          sync_enabled: ui.sync_enabled,
          last_sync_at: ui.last_sync_at,
          app_name: ui.integration_apps.name,
          app_slug: ui.integration_apps.slug,
          app_category: ui.integration_apps.category,
        }));

        setUserIntegrations(transformedIntegrations);
      }
    } catch (error) {
      console.error('Failed to load marketplace data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load integration marketplace.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const connectIntegration = async (app: IntegrationApp) => {
    setConnectingApp(app.id);
    try {
      if (app.auth_type === 'oauth2') {
        // Redirect to OAuth flow
        window.location.href = `/integrations/${app.slug}/oauth/authorize`;
      } else {
        // Create integration record
        const { error } = await (supabase as any).from('user_integrations').insert({
          user_id: user?.id,
          app_id: app.id,
          status: 'pending',
        });

        if (error) throw error;

        toast({
          title: 'Integration Added',
          description: `${app.name} has been added. Configure it in your settings.`,
        });

        loadMarketplaceData();
      }
    } catch (error) {
      console.error('Failed to connect integration:', error);
      toast({
        title: 'Error',
        description: 'Failed to connect integration.',
        variant: 'destructive',
      });
    } finally {
      setConnectingApp(null);
    }
  };

  const disconnectIntegration = async (integrationId: string, appName: string) => {
    try {
      const { error } = await (supabase as any)
        .from('user_integrations')
        .update({ status: 'disconnected', is_active: false })
        .eq('id', integrationId);

      if (error) throw error;

      toast({
        title: 'Integration Disconnected',
        description: `${appName} has been disconnected.`,
      });

      loadMarketplaceData();
    } catch (error) {
      console.error('Failed to disconnect integration:', error);
      toast({
        title: 'Error',
        description: 'Failed to disconnect integration.',
        variant: 'destructive',
      });
    }
  };

  const isInstalled = (appId: string) => {
    return userIntegrations.some(ui => ui.app_id === appId && ui.status === 'connected');
  };

  const getInstalledIntegration = (appId: string) => {
    return userIntegrations.find(ui => ui.app_id === appId);
  };

  const categories = [
    { value: 'all', label: 'All Integrations' },
    { value: 'accounting', label: 'Accounting' },
    { value: 'project_management', label: 'Project Management' },
    { value: 'communication', label: 'Communication' },
    { value: 'calendar', label: 'Calendar' },
    { value: 'storage', label: 'File Storage' },
  ];

  const filteredApps = apps.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         app.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || app.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ReactNode> = {
      accounting: '💰',
      project_management: '📊',
      communication: '💬',
      calendar: '📅',
      storage: '📁',
    };
    return icons[category] || '🔌';
  };

  const getStatusBadge = (status: string) => {
    const config = {
      connected: { color: 'bg-green-500', label: 'Connected', icon: CheckCircle },
      pending: { color: 'bg-yellow-500', label: 'Pending Setup', icon: Loader2 },
      error: { color: 'bg-red-500', label: 'Error', icon: XCircle },
      disconnected: { color: 'bg-gray-500', label: 'Disconnected', icon: XCircle },
    };

    const { color, label, icon: Icon } = config[status as keyof typeof config] || config.disconnected;
    return (
      <Badge className={`${color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <DashboardLayout title="Integration Marketplace">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Plug className="w-12 h-12 text-construction-orange animate-pulse mx-auto mb-4" />
            <p className="text-muted-foreground">Loading integration marketplace...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Integration Marketplace">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-construction-dark">Integration Marketplace</h1>
          <p className="text-muted-foreground">
            Connect BuildDesk with your favorite tools and apps
          </p>
        </div>

        {/* My Integrations Summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Integrations</p>
                  <p className="text-2xl font-bold mt-2">
                    {userIntegrations.filter(ui => ui.status === 'connected').length}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Available Apps</p>
                  <p className="text-2xl font-bold mt-2">{apps.length}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Plug className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Setup</p>
                  <p className="text-2xl font-bold mt-2">
                    {userIntegrations.filter(ui => ui.status === 'pending').length}
                  </p>
                </div>
                <div className="bg-orange-100 p-3 rounded-lg">
                  <Settings className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search integrations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList>
            {categories.map(cat => (
              <TabsTrigger key={cat.value} value={cat.value}>
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedCategory} className="mt-6">
            {filteredApps.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Plug className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No integrations found matching your criteria</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredApps.map((app) => {
                  const installed = isInstalled(app.id);
                  const integration = getInstalledIntegration(app.id);

                  return (
                    <Card key={app.id} className={installed ? 'border-green-500' : ''}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="text-3xl">{getCategoryIcon(app.category)}</div>
                            <div>
                              <CardTitle className="text-lg">{app.name}</CardTitle>
                              <CardDescription className="text-xs capitalize">
                                {app.category.replace('_', ' ')}
                              </CardDescription>
                            </div>
                          </div>
                          {installed && integration && getStatusBadge(integration.status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {app.description}
                        </p>

                        {/* Features */}
                        <div className="mb-4">
                          <div className="flex flex-wrap gap-1">
                            {app.features.slice(0, 3).map((feature, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {feature.replace('_', ' ')}
                              </Badge>
                            ))}
                            {app.features.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{app.features.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>{app.install_count} installs</span>
                          </div>
                          {app.supports_two_way_sync && (
                            <div className="flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              <span>2-way sync</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          {installed && integration ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => disconnectIntegration(integration.id, app.name)}
                                className="flex-1"
                              >
                                Disconnect
                              </Button>
                              <Button size="sm" variant="outline">
                                <Settings className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => connectIntegration(app)}
                              disabled={connectingApp === app.id}
                              className="flex-1"
                            >
                              {connectingApp === app.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Connecting...
                                </>
                              ) : (
                                'Connect'
                              )}
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" asChild>
                            <a href={app.website_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default IntegrationMarketplace;
