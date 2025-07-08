import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Calendar,
  RefreshCw,
  Settings,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  ExternalLink
} from 'lucide-react';

interface CalendarIntegration {
  id: string;
  company_id: string;
  provider: 'google' | 'outlook';
  account_email: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  is_active: boolean;
  sync_enabled: boolean;
  last_sync: string | null;
  created_at: string;
  updated_at: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  description?: string;
  project_id?: string;
  calendar_provider: string;
  external_id: string;
}

const CalendarIntegration = () => {
  const { userProfile } = useAuth();
  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    if (userProfile?.company_id) {
      loadIntegrations();
      loadEvents();
    }
  }, [userProfile]);

  const loadIntegrations = async () => {
    try {
      const { data: integrations, error } = await supabase
        .from('calendar_integrations')
        .select('*')
        .eq('company_id', userProfile?.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIntegrations((integrations as CalendarIntegration[]) || []);
    } catch (error) {
      console.error('Error loading integrations:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load calendar integrations"
      });
    }
  };

  const loadEvents = async () => {
    try {
      const { data: events, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('company_id', userProfile?.company_id)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(50);

      if (error) throw error;
      setEvents(events || []);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      // Call edge function to initiate Google OAuth
      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { company_id: userProfile?.company_id }
      });

      if (error) throw error;

      // Redirect to Google OAuth
      window.location.href = data.auth_url;
    } catch (error) {
      console.error('Google auth error:', error);
      toast({
        variant: "destructive",
        title: "Authentication Failed",
        description: "Failed to connect to Google Calendar"
      });
    }
  };

  const handleOutlookAuth = async () => {
    try {
      // Call edge function to initiate Microsoft OAuth
      const { data, error } = await supabase.functions.invoke('outlook-calendar-auth', {
        body: { company_id: userProfile?.company_id }
      });

      if (error) throw error;

      // Redirect to Microsoft OAuth
      window.location.href = data.auth_url;
    } catch (error) {
      console.error('Outlook auth error:', error);
      toast({
        variant: "destructive",
        title: "Authentication Failed",
        description: "Failed to connect to Outlook Calendar"
      });
    }
  };

  const handleSyncCalendar = async (integrationId: string) => {
    try {
      setSyncing(true);
      
      const { error } = await supabase.functions.invoke('sync-calendar', {
        body: { 
          integration_id: integrationId,
          company_id: userProfile?.company_id 
        }
      });

      if (error) throw error;

      toast({
        title: "Sync Complete",
        description: "Calendar events have been synchronized successfully"
      });

      loadEvents();
      loadIntegrations();
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: "Failed to sync calendar events"
      });
    } finally {
      setSyncing(false);
    }
  };

  const toggleIntegration = async (integrationId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('calendar_integrations')
        .update({ sync_enabled: enabled })
        .eq('id', integrationId);

      if (error) throw error;

      // Update local state
      const integration = integrations.find(i => i.id === integrationId);
      if (integration) {
        integration.sync_enabled = enabled;
        setIntegrations([...integrations]);
      }

      toast({
        title: enabled ? "Integration Enabled" : "Integration Disabled",
        description: `Calendar sync has been ${enabled ? 'enabled' : 'disabled'}`
      });
    } catch (error) {
      console.error('Toggle error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update integration settings"
      });
    }
  };

  const removeIntegration = async (integrationId: string) => {
    if (!confirm('Are you sure you want to remove this calendar integration?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('calendar_integrations')
        .delete()
        .eq('id', integrationId);

      if (error) throw error;

      setIntegrations(integrations.filter(i => i.id !== integrationId));
      
      toast({
        title: "Integration Removed",
        description: "Calendar integration has been removed successfully"
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

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString();
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google':
        return '📅';
      case 'outlook':
        return '📆';
      default:
        return '📋';
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'google':
        return 'Google Calendar';
      case 'outlook':
        return 'Outlook Calendar';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5" />
          <h2 className="text-2xl font-semibold">Calendar Integration</h2>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Calendar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect Calendar</DialogTitle>
              <DialogDescription>
                Choose a calendar provider to connect with your projects
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Card className="cursor-pointer hover:bg-accent" onClick={handleGoogleAuth}>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">📅</span>
                    <div>
                      <h3 className="font-medium">Google Calendar</h3>
                      <p className="text-sm text-muted-foreground">
                        Sync with Google Calendar events
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:bg-accent" onClick={handleOutlookAuth}>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">📆</span>
                    <div>
                      <h3 className="font-medium">Outlook Calendar</h3>
                      <p className="text-sm text-muted-foreground">
                        Sync with Microsoft Outlook events
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Connected Integrations */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Calendars</CardTitle>
          <CardDescription>
            Manage your calendar integrations and sync settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {integrations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No calendar integrations connected</p>
              <p className="text-sm">Connect your calendar to sync project events</p>
            </div>
          ) : (
            <div className="space-y-4">
              {integrations.map((integration) => (
                <div key={integration.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{getProviderIcon(integration.provider)}</span>
                    <div>
                      <h4 className="font-medium">{getProviderName(integration.provider)}</h4>
                      <p className="text-sm text-muted-foreground">{integration.account_email}</p>
                      {integration.last_sync && (
                        <p className="text-xs text-muted-foreground">
                          Last sync: {formatDateTime(integration.last_sync)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Label htmlFor={`sync-${integration.id}`} className="text-sm">
                        Auto Sync
                      </Label>
                      <Switch
                        id={`sync-${integration.id}`}
                        checked={integration.sync_enabled}
                        onCheckedChange={(checked) => toggleIntegration(integration.id, checked)}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSyncCalendar(integration.id)}
                      disabled={syncing}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                      Sync Now
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeIntegration(integration.id)}
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

      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Project Events</CardTitle>
          <CardDescription>
            Events synchronized from your connected calendars
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No upcoming events</p>
              <p className="text-sm">Events from your calendar will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{getProviderIcon(event.calendar_provider)}</span>
                    <div>
                      <h4 className="font-medium">{event.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {formatDateTime(event.start_time)} - {formatDateTime(event.end_time)}
                      </p>
                      {event.description && (
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">
                      {getProviderName(event.calendar_provider)}
                    </Badge>
                    {event.project_id && (
                      <Badge variant="secondary">Project Event</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Sync Settings</span>
          </CardTitle>
          <CardDescription>
            Configure how calendar events are synchronized
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium">Sync Frequency</h4>
              <p className="text-sm text-muted-foreground">
                Events are synchronized every 15 minutes when auto-sync is enabled
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium">Event Creation</h4>
              <p className="text-sm text-muted-foreground">
                Project milestones and deadlines can be automatically added to your calendar
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium">Conflict Detection</h4>
              <p className="text-sm text-muted-foreground">
                Get notified when project schedules conflict with calendar events
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium">Team Coordination</h4>
              <p className="text-sm text-muted-foreground">
                Share project calendars with team members for better coordination
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarIntegration;