import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Star, Download, Settings, ExternalLink, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  provider: string;
  logo_url?: string;
  rating: number;
  installs: number;
  price: 'free' | 'paid' | 'freemium';
  status: 'available' | 'installed' | 'pending';
  features: string[];
  webhook_url?: string;
}

const SAMPLE_INTEGRATIONS: Integration[] = [
  {
    id: '1',
    name: 'QuickBooks Online',
    description: 'Sync financial data with QuickBooks Online for seamless accounting integration.',
    category: 'Accounting',
    provider: 'Intuit',
    rating: 4.8,
    installs: 15420,
    price: 'free',
    status: 'available',
    features: ['Real-time sync', 'Invoice management', 'Expense tracking', 'Tax reporting']
  },
  {
    id: '2',
    name: 'Procore Connect',
    description: 'Connect with Procore for advanced project management and document sharing.',
    category: 'Project Management',
    provider: 'Procore',
    rating: 4.6,
    installs: 8750,
    price: 'paid',
    status: 'available',
    features: ['Document sync', 'Project updates', 'Team collaboration', 'Progress tracking']
  },
  {
    id: '3',
    name: 'Zapier Automation',
    description: 'Connect with 5000+ apps through Zapier webhooks and automation.',
    category: 'Automation',
    provider: 'Zapier',
    rating: 4.9,
    installs: 12300,
    price: 'freemium',
    status: 'available',
    features: ['Custom workflows', 'Multi-app sync', 'Trigger automation', 'Data mapping']
  },
  {
    id: '4',
    name: 'Google Drive',
    description: 'Store and share project documents with Google Drive integration.',
    category: 'Storage',
    provider: 'Google',
    rating: 4.7,
    installs: 21500,
    price: 'free',
    status: 'installed',
    features: ['File sync', 'Team sharing', 'Version control', 'Mobile access']
  },
  {
    id: '5',
    name: 'Slack Notifications',
    description: 'Get real-time project updates and notifications in your Slack channels.',
    category: 'Communication',
    provider: 'Slack',
    rating: 4.5,
    installs: 9800,
    price: 'free',
    status: 'available',
    features: ['Real-time alerts', 'Custom channels', 'Team mentions', 'Rich formatting']
  },
  {
    id: '6',
    name: 'Microsoft Teams',
    description: 'Collaborate with your team using Microsoft Teams integration.',
    category: 'Communication',
    provider: 'Microsoft',
    rating: 4.3,
    installs: 7200,
    price: 'free',
    status: 'available',
    features: ['Video calls', 'File sharing', 'Team chat', 'Calendar sync']
  }
];

const ThirdPartyMarketplace: React.FC = () => {
  const { userProfile } = useAuth();
  const [integrations, setIntegrations] = useState<Integration[]>(SAMPLE_INTEGRATIONS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(false);

  const categories = ['all', 'Accounting', 'Project Management', 'Communication', 'Storage', 'Automation'];

  const filteredIntegrations = integrations.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         integration.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || integration.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleInstall = async (integration: Integration) => {
    if (!userProfile?.company_id) return;
    
    setLoading(true);
    try {
      // For Zapier integration, show webhook URL input
      if (integration.name === 'Zapier Automation') {
        const webhookUrl = prompt('Enter your Zapier webhook URL:');
        if (!webhookUrl) {
          setLoading(false);
          return;
        }
        integration.webhook_url = webhookUrl;
      }

      // Simulate installation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update integration status
      setIntegrations(prev => 
        prev.map(int => 
          int.id === integration.id 
            ? { ...int, status: 'installed' as const }
            : int
        )
      );

      toast.success(`${integration.name} installed successfully!`);
    } catch (error) {
      toast.error('Failed to install integration');
    } finally {
      setLoading(false);
    }
  };

  const handleUninstall = async (integration: Integration) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIntegrations(prev => 
        prev.map(int => 
          int.id === integration.id 
            ? { ...int, status: 'available' as const }
            : int
        )
      );

      toast.success(`${integration.name} uninstalled successfully!`);
    } catch (error) {
      toast.error('Failed to uninstall integration');
    } finally {
      setLoading(false);
    }
  };

  const getPriceColor = (price: string) => {
    switch (price) {
      case 'free': return 'bg-green-100 text-green-800';
      case 'paid': return 'bg-blue-100 text-blue-800';
      case 'freemium': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-4 sm:px-0">
      {/* Mobile-optimized header */}
      <div className="text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Integration Marketplace</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-2">
          Connect your platform with the tools you already use
        </p>
      </div>

      {/* Search and Filters - Mobile Optimized */}
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search integrations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 text-base" // Larger touch target for mobile
          />
        </div>
        
        {/* Mobile-friendly category selection */}
        <div className="w-full overflow-x-auto">
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid w-max grid-cols-6 min-w-full">
              {categories.map(category => (
                <TabsTrigger 
                  key={category} 
                  value={category} 
                  className="capitalize whitespace-nowrap px-3 py-2 text-sm"
                >
                  {category === 'all' ? 'All' : category}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Integration Grid - Mobile First */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredIntegrations.map((integration) => (
          <Card key={integration.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3 sm:pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary to-primary-foreground rounded-lg flex items-center justify-center text-white font-bold text-sm sm:text-lg flex-shrink-0">
                    {integration.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base sm:text-lg leading-tight truncate">{integration.name}</CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{integration.provider}</p>
                  </div>
                </div>
                {integration.status === 'installed' && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs flex-shrink-0">
                    Installed
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-3 sm:space-y-4">
              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {integration.description}
              </p>

              {/* Mobile-optimized metrics */}
              <div className="flex items-center justify-between text-xs sm:text-sm gap-2">
                <div className="flex items-center space-x-1">
                  <Star className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 fill-current" />
                  <span className="font-medium">{integration.rating}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Download className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                  <span className="text-muted-foreground hidden sm:inline">{integration.installs.toLocaleString()}</span>
                  <span className="text-muted-foreground sm:hidden">{(integration.installs / 1000).toFixed(0)}k</span>
                </div>
                <Badge className={getPriceColor(integration.price) + " text-xs"}>
                  {integration.price}
                </Badge>
              </div>

              {/* Features section - Mobile optimized */}
              <div className="space-y-2">
                <p className="text-xs sm:text-sm font-medium text-foreground">Key Features:</p>
                <div className="flex flex-wrap gap-1">
                  {integration.features.slice(0, 2).map((feature, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                  {integration.features.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{integration.features.length - 2} more
                    </Badge>
                  )}
                </div>
              </div>

              {/* Action buttons - Mobile optimized */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1 sm:pt-2">
                {integration.status === 'installed' ? (
                  <>
                    <Button variant="outline" size="sm" className="w-full sm:flex-1 h-9 text-xs sm:text-sm">
                      <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                      Configure
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full sm:w-auto h-9 text-xs sm:text-sm"
                      onClick={() => handleUninstall(integration)}
                      disabled={loading}
                    >
                      Uninstall
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      onClick={() => handleInstall(integration)} 
                      size="sm" 
                      className="w-full sm:flex-1 h-9 text-xs sm:text-sm"
                      disabled={loading}
                    >
                      {integration.name === 'Zapier Automation' ? (
                        <><Zap className="h-3 w-3 sm:h-4 sm:w-4 mr-2" /> Connect</>
                      ) : (
                        <>Install</>
                      )}
                    </Button>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto h-9">
                      <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="sm:hidden ml-2">Details</span>
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredIntegrations.length === 0 && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No integrations found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search terms or browse different categories
          </p>
        </div>
      )}
    </div>
  );
};

export default ThirdPartyMarketplace;