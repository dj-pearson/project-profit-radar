import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Calendar, Settings, Bell } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  type: 'project_deadline' | 'meeting' | 'inspection' | 'delivery';
  projectId?: string;
}

interface CalendarConnection {
  provider: 'google' | 'outlook';
  connected: boolean;
  email?: string;
  lastSync?: string;
}

const CalendarIntegration = () => {
  const [connections, setConnections] = useState<CalendarConnection[]>([
    { provider: 'google', connected: false },
    { provider: 'outlook', connected: false }
  ]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [newEvent, setNewEvent] = useState({
    title: '',
    start: '',
    end: '',
    type: 'meeting' as const,
    description: ''
  });

  const sampleEvents: CalendarEvent[] = [
    {
      id: '1',
      title: 'Project Milestone Review',
      start: '2024-12-20T09:00:00',
      end: '2024-12-20T10:00:00',
      type: 'meeting',
      description: 'Review progress on current projects'
    },
    {
      id: '2',
      title: 'Safety Inspection',
      start: '2024-12-22T14:00:00',
      end: '2024-12-22T16:00:00',
      type: 'inspection',
      description: 'Monthly safety inspection of construction site'
    }
  ];

  useEffect(() => {
    setEvents(sampleEvents);
  }, []);

  const connectCalendar = async (provider: 'google' | 'outlook') => {
    // This would implement OAuth flow in a real app
    toast({
      title: "Calendar Integration",
      description: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Calendar integration would be configured here. This requires API keys and OAuth setup.`
    });

    // Simulate connection
    setConnections(connections.map(conn => 
      conn.provider === provider 
        ? { ...conn, connected: true, email: `user@${provider}.com`, lastSync: new Date().toISOString() }
        : conn
    ));
  };

  const disconnectCalendar = (provider: 'google' | 'outlook') => {
    setConnections(connections.map(conn => 
      conn.provider === provider 
        ? { ...conn, connected: false, email: undefined, lastSync: undefined }
        : conn
    ));

    toast({
      title: "Calendar Disconnected",
      description: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Calendar has been disconnected.`
    });
  };

  const syncCalendar = async (provider: 'google' | 'outlook') => {
    toast({
      title: "Syncing Calendar",
      description: `Syncing with ${provider} Calendar...`
    });

    // Simulate sync
    setTimeout(() => {
      setConnections(connections.map(conn => 
        conn.provider === provider 
          ? { ...conn, lastSync: new Date().toISOString() }
          : conn
      ));

      toast({
        title: "Sync Complete",
        description: `Calendar synced successfully with ${provider}.`
      });
    }, 2000);
  };

  const addEvent = () => {
    if (!newEvent.title || !newEvent.start || !newEvent.end) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields"
      });
      return;
    }

    const event: CalendarEvent = {
      id: Date.now().toString(),
      ...newEvent
    };

    setEvents([...events, event]);
    setNewEvent({
      title: '',
      start: '',
      end: '',
      type: 'meeting',
      description: ''
    });

    toast({
      title: "Event Added",
      description: "Calendar event has been created successfully."
    });
  };

  const getEventTypeColor = (type: CalendarEvent['type']) => {
    const colors = {
      project_deadline: 'bg-red-100 text-red-800',
      meeting: 'bg-blue-100 text-blue-800',
      inspection: 'bg-yellow-100 text-yellow-800',
      delivery: 'bg-green-100 text-green-800'
    };
    return colors[type];
  };

  const getProviderName = (provider: string) => {
    return provider === 'google' ? 'Google Calendar' : 'Outlook Calendar';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Calendar className="h-5 w-5" />
        <h2 className="text-2xl font-semibold">Calendar Integration</h2>
      </div>

      {/* Calendar Connections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Calendar Connections</span>
          </CardTitle>
          <CardDescription>
            Connect your calendar providers for seamless scheduling
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {connections.map((connection) => (
            <div key={connection.provider} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-medium">{getProviderName(connection.provider)}</h4>
                  {connection.connected && connection.email && (
                    <p className="text-sm text-muted-foreground">{connection.email}</p>
                  )}
                  {connection.lastSync && (
                    <p className="text-xs text-muted-foreground">
                      Last sync: {new Date(connection.lastSync).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant={connection.connected ? "default" : "secondary"}>
                  {connection.connected ? "Connected" : "Not Connected"}
                </Badge>
                {connection.connected ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => syncCalendar(connection.provider)}
                    >
                      Sync
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => disconnectCalendar(connection.provider)}
                    >
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => connectCalendar(connection.provider)}
                  >
                    Connect
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Add New Event */}
      <Card>
        <CardHeader>
          <CardTitle>Add Calendar Event</CardTitle>
          <CardDescription>
            Create new events that will sync with your connected calendars
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="event-title">Event Title</Label>
              <Input
                id="event-title"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="Enter event title"
              />
            </div>
            <div>
              <Label htmlFor="event-type">Event Type</Label>
              <Select
                value={newEvent.type}
                onValueChange={(type: any) => setNewEvent({ ...newEvent, type })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="project_deadline">Project Deadline</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="event-start">Start Date & Time</Label>
              <Input
                id="event-start"
                type="datetime-local"
                value={newEvent.start}
                onChange={(e) => setNewEvent({ ...newEvent, start: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="event-end">End Date & Time</Label>
              <Input
                id="event-end"
                type="datetime-local"
                value={newEvent.end}
                onChange={(e) => setNewEvent({ ...newEvent, end: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="event-description">Description</Label>
            <Input
              id="event-description"
              value={newEvent.description}
              onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
              placeholder="Event description (optional)"
            />
          </div>
          <Button onClick={addEvent}>Add Event</Button>
        </CardContent>
      </Card>

      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Upcoming Events</span>
          </CardTitle>
          <CardDescription>
            Events from your connected calendars and project timeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {events.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No upcoming events. Add an event to get started.
              </p>
            ) : (
              events.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium">{event.title}</h4>
                      <Badge className={getEventTypeColor(event.type)}>
                        {event.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(event.start).toLocaleString()} - {new Date(event.end).toLocaleString()}
                    </p>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarIntegration;