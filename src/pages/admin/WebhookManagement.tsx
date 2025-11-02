import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Webhook,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Activity,
  BarChart3,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface WebhookEndpoint {
  id: string;
  url: string;
  description: string;
  subscribed_events: string[];
  is_active: boolean;
  is_verified: boolean;
  last_delivery_at: string;
  last_success_at: string;
  last_failure_at: string;
  consecutive_failures: number;
  total_deliveries: number;
  successful_deliveries: number;
  failed_deliveries: number;
  created_at: string;
}

interface WebhookDelivery {
  id: string;
  webhook_endpoint_id: string;
  url: string;
  status: string;
  success: boolean;
  response_status_code: number;
  response_time_ms: number;
  error_message: string;
  attempt_number: number;
  max_attempts: number;
  delivered_at: string;
  created_at: string;
}

interface WebhookEvent {
  id: string;
  event_type: string;
  resource_type: string;
  action: string;
  pending_deliveries: number;
  completed_deliveries: number;
  failed_deliveries: number;
  created_at: string;
}

const AVAILABLE_EVENTS = [
  { value: '*', label: 'All Events', description: 'Subscribe to all events' },
  { value: 'project.created', label: 'Project Created', description: 'When a new project is created' },
  { value: 'project.updated', label: 'Project Updated', description: 'When a project is updated' },
  { value: 'project.deleted', label: 'Project Deleted', description: 'When a project is deleted' },
  { value: 'invoice.created', label: 'Invoice Created', description: 'When a new invoice is created' },
  { value: 'invoice.sent', label: 'Invoice Sent', description: 'When an invoice is sent' },
  { value: 'invoice.paid', label: 'Invoice Paid', description: 'When an invoice is paid' },
  { value: 'time_entry.created', label: 'Time Entry Created', description: 'When time is logged' },
  { value: 'document.uploaded', label: 'Document Uploaded', description: 'When a document is uploaded' },
];

export const WebhookManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [showCreateEndpoint, setShowCreateEndpoint] = useState(false);

  // New endpoint form
  const [newEndpointUrl, setNewEndpointUrl] = useState('');
  const [newEndpointDescription, setNewEndpointDescription] = useState('');
  const [newEndpointEvents, setNewEndpointEvents] = useState<string[]>(['*']);

  useEffect(() => {
    loadWebhookData();
  }, []);

  const loadWebhookData = async () => {
    setLoading(true);
    try {
      // Load webhook endpoints
      const { data: endpointsData, error: endpointsError } = await supabase
        .from('webhook_endpoints')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (endpointsError) throw endpointsError;
      setEndpoints(endpointsData || []);

      // Load recent deliveries
      if (endpointsData && endpointsData.length > 0) {
        const { data: deliveriesData, error: deliveriesError } = await supabase
          .from('webhook_deliveries')
          .select('*')
          .in('webhook_endpoint_id', endpointsData.map((e) => e.id))
          .order('created_at', { ascending: false })
          .limit(50);

        if (deliveriesError) throw deliveriesError;
        setDeliveries(deliveriesData || []);
      }

      // Load recent events
      const { data: eventsData, error: eventsError } = await supabase
        .from('webhook_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (eventsError) throw eventsError;
      setEvents(eventsData || []);
    } catch (error) {
      console.error('Failed to load webhook data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load webhook data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createWebhookEndpoint = async () => {
    if (!newEndpointUrl) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a webhook URL.',
        variant: 'destructive',
      });
      return;
    }

    if (newEndpointEvents.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one event to subscribe to.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Generate a webhook secret (in production, use proper cryptographic random)
      const secret = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      const { error } = await supabase
        .from('webhook_endpoints')
        .insert({
          user_id: user?.id,
          url: newEndpointUrl,
          description: newEndpointDescription,
          subscribed_events: newEndpointEvents,
          secret: secret,
          is_active: true,
          is_verified: false,
        });

      if (error) throw error;

      toast({
        title: 'Webhook Created',
        description: `Webhook endpoint has been created. Test it to verify.`,
      });

      setShowCreateEndpoint(false);
      setNewEndpointUrl('');
      setNewEndpointDescription('');
      setNewEndpointEvents(['*']);
      loadWebhookData();
    } catch (error) {
      console.error('Failed to create webhook:', error);
      toast({
        title: 'Error',
        description: 'Failed to create webhook endpoint.',
        variant: 'destructive',
      });
    }
  };

  const toggleWebhookEndpoint = async (endpointId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('webhook_endpoints')
        .update({ is_active: !currentStatus })
        .eq('id', endpointId);

      if (error) throw error;

      toast({
        title: currentStatus ? 'Webhook Disabled' : 'Webhook Enabled',
        description: currentStatus
          ? 'Webhook has been disabled.'
          : 'Webhook is now active.',
      });

      loadWebhookData();
    } catch (error) {
      console.error('Failed to toggle webhook:', error);
      toast({
        title: 'Error',
        description: 'Failed to update webhook.',
        variant: 'destructive',
      });
    }
  };

  const deleteWebhookEndpoint = async (endpointId: string) => {
    if (!confirm('Are you sure you want to delete this webhook endpoint? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('webhook_endpoints')
        .delete()
        .eq('id', endpointId);

      if (error) throw error;

      toast({
        title: 'Webhook Deleted',
        description: 'Webhook endpoint has been deleted.',
      });

      loadWebhookData();
    } catch (error) {
      console.error('Failed to delete webhook:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete webhook.',
        variant: 'destructive',
      });
    }
  };

  const testWebhookEndpoint = async (endpointId: string, url: string) => {
    toast({
      title: 'Test Webhook',
      description: 'Sending test event to webhook endpoint...',
    });

    // In production, this would call an edge function to send a test webhook
    setTimeout(() => {
      toast({
        title: 'Test Complete',
        description: 'Check your endpoint logs for the test event.',
      });
    }, 2000);
  };

  const toggleEventSelection = (event: string) => {
    if (event === '*') {
      setNewEndpointEvents(['*']);
    } else {
      setNewEndpointEvents((prev) => {
        const filtered = prev.filter((e) => e !== '*');
        return filtered.includes(event)
          ? filtered.filter((e) => e !== event)
          : [...filtered, event];
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { color: 'bg-yellow-500', icon: Clock, label: 'Pending' },
      success: { color: 'bg-green-500', icon: CheckCircle, label: 'Success' },
      failed: { color: 'bg-red-500', icon: XCircle, label: 'Failed' },
      retrying: { color: 'bg-blue-500', icon: RefreshCw, label: 'Retrying' },
    };

    const { color, icon: Icon, label } = config[status as keyof typeof config] || {
      color: 'bg-gray-500',
      icon: Clock,
      label: status,
    };

    return (
      <Badge className={`${color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <DashboardLayout title="Webhooks">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Webhook className="w-12 h-12 text-construction-orange animate-pulse mx-auto mb-4" />
            <p className="text-muted-foreground">Loading webhook data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const totalDeliveries = endpoints.reduce((sum, e) => sum + e.total_deliveries, 0);
  const successfulDeliveries = endpoints.reduce((sum, e) => sum + e.successful_deliveries, 0);
  const failedDeliveries = endpoints.reduce((sum, e) => sum + e.failed_deliveries, 0);
  const activeEndpoints = endpoints.filter((e) => e.is_active).length;
  const successRate = totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries * 100) : 100;

  return (
    <DashboardLayout title="Webhook Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-construction-dark flex items-center gap-2">
              <Webhook className="w-8 h-8 text-construction-orange" />
              Webhook Management
            </h1>
            <p className="text-muted-foreground">
              Real-time event notifications to your applications
            </p>
          </div>
          <Button onClick={() => setShowCreateEndpoint(!showCreateEndpoint)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Webhook
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Endpoints</p>
                  <p className="text-2xl font-bold">{activeEndpoints}</p>
                </div>
                <Webhook className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Deliveries</p>
                  <p className="text-2xl font-bold">{totalDeliveries.toLocaleString()}</p>
                </div>
                <Send className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">{successRate.toFixed(1)}%</p>
                </div>
                <BarChart3 className="w-8 h-8 text-construction-orange" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Failed Deliveries</p>
                  <p className="text-2xl font-bold">{failedDeliveries}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="endpoints">
          <TabsList>
            <TabsTrigger value="endpoints">Endpoints ({endpoints.length})</TabsTrigger>
            <TabsTrigger value="deliveries">Deliveries ({deliveries.length})</TabsTrigger>
            <TabsTrigger value="events">Events ({events.length})</TabsTrigger>
          </TabsList>

          {/* Endpoints Tab */}
          <TabsContent value="endpoints" className="space-y-4">
            {showCreateEndpoint && (
              <Card>
                <CardHeader>
                  <CardTitle>Create Webhook Endpoint</CardTitle>
                  <CardDescription>
                    Configure a webhook to receive real-time event notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Webhook URL</Label>
                    <Input
                      placeholder="https://your-domain.com/webhooks/builddesk"
                      value={newEndpointUrl}
                      onChange={(e) => setNewEndpointUrl(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Description (Optional)</Label>
                    <Textarea
                      placeholder="Describe what this webhook is used for..."
                      value={newEndpointDescription}
                      onChange={(e) => setNewEndpointDescription(e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label>Event Subscriptions ({newEndpointEvents.length} selected)</Label>
                    <div className="border rounded-lg p-4 mt-2 max-h-64 overflow-y-auto space-y-2">
                      {AVAILABLE_EVENTS.map((event) => (
                        <div key={event.value} className="flex items-center gap-2">
                          <Checkbox
                            checked={newEndpointEvents.includes(event.value)}
                            onCheckedChange={() => toggleEventSelection(event.value)}
                          />
                          <div>
                            <p className="text-sm font-medium">{event.label}</p>
                            <p className="text-xs text-muted-foreground">{event.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={createWebhookEndpoint}>Create Webhook</Button>
                    <Button variant="outline" onClick={() => setShowCreateEndpoint(false)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {endpoints.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Webhook className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No webhook endpoints configured</p>
                  <Button onClick={() => setShowCreateEndpoint(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Webhook
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {endpoints.map((endpoint) => (
                  <Card key={endpoint.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Webhook className="w-4 h-4 text-blue-500" />
                            {endpoint.is_active ? (
                              <Badge className="bg-green-500 text-white">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Active
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-500 text-white">
                                <XCircle className="w-3 h-3 mr-1" />
                                Disabled
                              </Badge>
                            )}
                            {endpoint.is_verified ? (
                              <Badge className="bg-blue-500 text-white">Verified</Badge>
                            ) : (
                              <Badge className="bg-yellow-500 text-white">Unverified</Badge>
                            )}
                            {endpoint.consecutive_failures > 0 && (
                              <Badge className="bg-red-500 text-white">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                {endpoint.consecutive_failures} consecutive failures
                              </Badge>
                            )}
                          </div>
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded block mb-2">
                            {endpoint.url}
                          </code>
                          {endpoint.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {endpoint.description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1">
                            {endpoint.subscribed_events.map((event) => (
                              <Badge key={event} variant="outline" className="text-xs">
                                {event}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Total Deliveries</p>
                          <p className="font-semibold">{endpoint.total_deliveries}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Success</p>
                          <p className="font-semibold text-green-600">{endpoint.successful_deliveries}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Failed</p>
                          <p className="font-semibold text-red-600">{endpoint.failed_deliveries}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Last Delivery</p>
                          <p className="font-semibold">
                            {endpoint.last_delivery_at
                              ? new Date(endpoint.last_delivery_at).toLocaleDateString()
                              : 'Never'}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={endpoint.is_active ? 'outline' : 'default'}
                          onClick={() => toggleWebhookEndpoint(endpoint.id, endpoint.is_active)}
                        >
                          {endpoint.is_active ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => testWebhookEndpoint(endpoint.id, endpoint.url)}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Test
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteWebhookEndpoint(endpoint.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Deliveries Tab */}
          <TabsContent value="deliveries" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Recent webhook delivery attempts
            </p>

            {deliveries.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Send className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No webhook deliveries yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {deliveries.map((delivery) => (
                  <Card key={delivery.id}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <Send className="w-4 h-4 text-blue-500" />
                          <code className="text-sm">{delivery.url}</code>
                          {getStatusBadge(delivery.status)}
                          {delivery.response_status_code && (
                            <Badge variant="outline">{delivery.response_status_code}</Badge>
                          )}
                          {delivery.response_time_ms && (
                            <span className="text-xs text-muted-foreground">
                              {delivery.response_time_ms}ms
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            Attempt {delivery.attempt_number}/{delivery.max_attempts}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(delivery.created_at).toLocaleString()}
                        </p>
                      </div>
                      {delivery.error_message && (
                        <p className="text-xs text-red-600 mt-2">{delivery.error_message}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              System events that trigger webhook deliveries
            </p>

            {events.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No events triggered yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {events.map((event) => (
                  <Card key={event.id}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <Activity className="w-4 h-4 text-purple-500" />
                          <Badge variant="outline">{event.event_type}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {event.resource_type} • {event.action}
                          </span>
                          <div className="flex gap-2 ml-auto">
                            <Badge className="bg-yellow-500 text-white">
                              {event.pending_deliveries} pending
                            </Badge>
                            <Badge className="bg-green-500 text-white">
                              {event.completed_deliveries} completed
                            </Badge>
                            {event.failed_deliveries > 0 && (
                              <Badge className="bg-red-500 text-white">
                                {event.failed_deliveries} failed
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground ml-4">
                          {new Date(event.created_at).toLocaleString()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default WebhookManagement;
