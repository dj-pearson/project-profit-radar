import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Users,
  MessageSquare,
  Key,
  Mail,
  CheckCircle2,
  Clock,
  Shield
} from 'lucide-react';

interface ClientAccess {
  id: string;
  client_name: string;
  client_email: string;
  is_active: boolean;
  can_view_financials: boolean;
  last_login_at: string;
  login_count: number;
  projects: { name: string };
}

interface ClientMessage {
  id: string;
  subject: string;
  message: string;
  sent_by_client: boolean;
  is_read: boolean;
  created_at: string;
}

export function ClientPortalPro() {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientAccess[]>([]);
  const [messages, setMessages] = useState<ClientMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadClients();
    loadMessages();
  }, [user]);

  const loadClients = async () => {
    try {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();

      if (!userProfile?.tenant_id) return;

      const { data, error } = await supabase
        .from('client_portal_access')
        .select(`
          *,
          projects (name)
        `)
        .eq('tenant_id', userProfile.tenant_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data as any || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();

      if (!userProfile?.tenant_id) return;

      const { data, error } = await supabase
        .from('client_messages')
        .select('*')
        .eq('tenant_id', userProfile.tenant_id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setMessages(data || []);

      const unread = data?.filter(m => !m.is_read && m.sent_by_client).length || 0;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const toggleClientAccess = async (clientId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('client_portal_access')
        .update({ is_active: !isActive })
        .eq('id', clientId);

      if (error) throw error;
      loadClients();
    } catch (error) {
      console.error('Error toggling access:', error);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('client_messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', messageId);

      if (error) throw error;
      loadMessages();
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Client Portal Pro
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage client access and communication
          </p>
        </div>
        <Users className="h-12 w-12 text-blue-600 opacity-50" />
      </div>

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
              {clients.filter(c => c.is_active).length}
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
            <div className="text-2xl font-bold text-orange-600">{unreadCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Access</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Login Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clients.reduce((sum, c) => sum + c.login_count, 0)}
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
                {clients.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No client access configured
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
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No messages
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
