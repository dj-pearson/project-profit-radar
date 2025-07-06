import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { QuickBooksIntegration } from '../integrations/QuickBooksIntegration';
import { 
  Settings,
  Database,
  RefreshCw,
  Shield,
  FileText,
  DollarSign,
  Upload,
  Plus
} from 'lucide-react';

interface IntegrationsPageProps {
  companyId: string;
}

export const IntegrationsPage: React.FC<IntegrationsPageProps> = ({ companyId }) => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  const integrationCards = [
    {
      id: 'quickbooks',
      title: 'QuickBooks Online',
      description: '2-way sync with QuickBooks for seamless financial management',
      icon: <DollarSign className="h-8 w-8 text-green-600" />,
      status: 'available',
      features: ['Invoice Sync', 'Customer Sync', 'Item Sync', 'Real-time Updates'],
      component: <QuickBooksIntegration />
    },
    {
      id: 'calendar',
      title: 'Calendar Sync',
      description: 'Sync project schedules with Google/Outlook Calendar',
      icon: <DollarSign className="h-8 w-8 text-purple-600" />,
      status: 'available',
      features: ['Google Calendar', 'Outlook Calendar', 'Auto Sync', 'Event Management'],
      component: null
    },
    {
      id: 'marketplace',
      title: 'API Marketplace',
      description: 'Connect to 1000+ third-party services and APIs',
      icon: <Database className="h-8 w-8 text-green-600" />,
      status: 'available',
      features: ['Custom APIs', 'Webhooks', 'Automation', 'Easy Setup'],
      component: null
    },
    {
      id: 'box',
      title: 'Box Storage',
      description: 'Enhanced document storage and collaboration',
      icon: <FileText className="h-8 w-8 text-blue-600" />,
      status: 'coming_soon',
      features: ['Document Sync', 'Team Collaboration', 'Advanced Security'],
      component: null
    },
    {
      id: 'procore',
      title: 'Procore Integration',
      description: 'Connect with existing Procore workflows',
      icon: <Database className="h-8 w-8 text-orange-600" />,
      status: 'coming_soon',
      features: ['Project Sync', 'Document Sharing', 'Cost Code Mapping'],
      component: null
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-500 text-white">Connected</Badge>;
      case 'available':
        return <Badge variant="outline">Available</Badge>;
      case 'coming_soon':
        return <Badge variant="secondary">Coming Soon</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Integrations</h2>
          <p className="text-muted-foreground">
            Connect your construction management platform with other tools
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrationCards.map((integration) => (
          <Card key={integration.id} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {integration.icon}
                  <div>
                    <CardTitle className="text-lg">{integration.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {integration.description}
                    </CardDescription>
                  </div>
                </div>
                {getStatusBadge(integration.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium mb-2">Features:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {integration.features.map((feature, index) => (
                      <li key={index} className="flex items-center space-x-2">
                        <div className="h-1 w-1 bg-muted-foreground rounded-full" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {integration.component ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full" disabled={integration.status !== 'available'}>
                        {integration.status === 'available' ? 'Configure' : 'Coming Soon'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{integration.title} Integration</DialogTitle>
                        <DialogDescription>
                          Configure your {integration.title} integration settings
                        </DialogDescription>
                      </DialogHeader>
                      {integration.component}
                    </DialogContent>
                  </Dialog>
                ) : (
                  <Button className="w-full" disabled>
                    Coming Soon
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Integration Benefits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5" />
            <span>Integration Benefits</span>
          </CardTitle>
          <CardDescription>
            Why integrate your construction management platform?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium">Streamlined Workflows</h4>
              <p className="text-sm text-muted-foreground">
                Eliminate manual data entry and reduce errors by automatically syncing data between systems.
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium">Real-time Data</h4>
              <p className="text-sm text-muted-foreground">
                Keep all your systems up-to-date with real-time synchronization of critical business data.
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium">Enhanced Reporting</h4>
              <p className="text-sm text-muted-foreground">
                Get comprehensive insights by combining data from multiple sources in unified reports.
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium">Improved Efficiency</h4>
              <p className="text-sm text-muted-foreground">
                Focus on construction, not data management, with automated workflows and processes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};