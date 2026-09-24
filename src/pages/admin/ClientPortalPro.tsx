import { toast } from 'sonner';
import { useClientPortalPro } from '@/hooks/useClientPortalPro';
import { ErrorState } from '@/components/common/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, MessageSquare, CheckCircle2 } from 'lucide-react';

export function ClientPortalPro() {
  const portal = useClientPortalPro();
  const clients = portal.data?.clients ?? [];
  const messages = portal.data?.messages ?? [];
  const unreadCount = portal.data?.unreadCount ?? 0;
  // Figures only from a read that came back; loading or failed shows '--'.
  const shown = (n: number) => (portal.data && !portal.error ? n : '--');

  const toggleClientAccess = async (clientId: string, isActive: boolean) => {
    try {
      await portal.setActive(clientId, !isActive);
    } catch (error) {
      toast.error('Could not change client access', {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      await portal.markRead(messageId);
    } catch (error) {
      toast.error('Could not mark the message read', {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Client Portal Pro
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage client access and communication
          </p>
        </div>
        <Users className="h-12 w-12 text-blue-600 opacity-50" />
      </div>

      {portal.error && (
        <ErrorState
          inline
          title="Client portal data could not be loaded"
          error={portal.error}
          onRetry={() => { void portal.refetch(); }}
        />
      )}
      {portal.data && !portal.data.tenantId && (
        <p className="text-sm text-muted-foreground">
          Your profile is not linked to a tenant, so there are no client portal records to show.
        </p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {shown(clients.filter(c => c.is_active).length)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Unread Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{shown(unreadCount)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Access</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shown(clients.length)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Login Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {shown(clients.reduce((sum, c) => sum + (c.login_count ?? 0), 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="clients" className="space-y-4">
        <TabsList>
          <TabsTrigger value="clients">Client Access</TabsTrigger>
          <TabsTrigger value="messages">Messages {unreadCount > 0 && `(${unreadCount})`}</TabsTrigger>
        </TabsList>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Portal Access</CardTitle>
              <CardDescription>Manage client permissions and access controls</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {portal.isLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : clients.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {portal.error ? 'Could not be loaded; see the error above.' : 'No client access configured'}
                  </p>
                ) : (
                  clients.map((client) => (
                    <div key={client.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">{client.client_name}</p>
                          <Badge variant={client.is_active ? 'default' : 'secondary'}>
                            {client.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          {client.can_view_financials && (
                            <Badge variant="outline">Financial Access</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {client.client_email} • Project: {client.projects?.name}
                        </p>
                        {client.last_login_at && (
                          <p className="text-xs text-muted-foreground">
                            Last login: {new Date(client.last_login_at).toLocaleString()} ({client.login_count} total)
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={client.is_active ? 'outline' : 'default'}
                        onClick={() => toggleClientAccess(client.id, client.is_active)}
                      >
                        {client.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Messages</CardTitle>
              <CardDescription>Two-way messaging with clients</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {portal.isLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {portal.error ? 'Could not be loaded; see the error above.' : 'No messages'}
                  </p>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-4 border rounded-lg ${!message.is_read && message.sent_by_client ? 'bg-blue-50 border-blue-200' : ''}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {message.sent_by_client ? (
                            <Badge variant="outline">From Client</Badge>
                          ) : (
                            <Badge>From Team</Badge>
                          )}
                          {message.subject && (
                            <p className="font-semibold">{message.subject}</p>
                          )}
                        </div>
                        {!message.is_read && message.sent_by_client && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => markAsRead(message.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Mark Read
                          </Button>
                        )}
                      </div>
                      <p className="text-sm">{message.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(message.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ClientPortalPro;
