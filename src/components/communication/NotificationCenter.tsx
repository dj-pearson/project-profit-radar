import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Bell, 
  MessageSquare, 
  AtSign, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Settings,
  Archive,
  Trash2,
  Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface Notification {
  id: string;
  type: 'mention' | 'message' | 'update' | 'alert' | 'approval';
  title: string;
  content: string;
  created_at: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  source: string;
  action_url?: string;
  metadata?: any;
}

interface NotificationSettings {
  mentions: boolean;
  messages: boolean;
  project_updates: boolean;
  budget_alerts: boolean;
  schedule_changes: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
}

interface NotificationCenterProps {
  userProfile: any;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ userProfile }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>({
    mentions: true,
    messages: true,
    project_updates: true,
    budget_alerts: true,
    schedule_changes: true,
    email_notifications: true,
    push_notifications: false
  });
  const [filter, setFilter] = useState<'all' | 'unread' | 'mentions' | 'alerts'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
    loadSettings();
  }, [userProfile?.id]);

  const loadNotifications = async () => {
    if (!userProfile?.id) return;

    try {
      // Mock notifications data
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'mention',
          title: 'You were mentioned in Project Alpha',
          content: '@john can you review the electrical plans?',
          created_at: '2024-01-10T10:30:00Z',
          read: false,
          priority: 'medium',
          source: 'Project Alpha - General Chat',
          action_url: '/communication#channel-1'
        },
        {
          id: '2',
          type: 'alert',
          title: 'Budget Alert: Material Costs Exceeded',
          content: 'Material costs for Project Beta have exceeded budget by 15%',
          created_at: '2024-01-10T09:15:00Z',
          read: false,
          priority: 'high',
          source: 'Project Beta',
          action_url: '/projects/beta/budget'
        },
        {
          id: '3',
          type: 'update',
          title: 'Project Status Update',
          content: 'Electrical rough-in completed and passed inspection',
          created_at: '2024-01-10T08:00:00Z',
          read: true,
          priority: 'medium',
          source: 'Project Alpha',
          action_url: '/projects/alpha'
        },
        {
          id: '4',
          type: 'message',
          title: 'New message in Team Chat',
          content: 'Sarah posted: Meeting tomorrow at 9 AM to discuss timeline changes',
          created_at: '2024-01-09T16:45:00Z',
          read: true,
          priority: 'low',
          source: 'Team Chat',
          action_url: '/communication#team-chat'
        },
        {
          id: '5',
          type: 'approval',
          title: 'Change Order Approval Required',
          content: 'Change order #CO-2024-003 requires your approval for additional electrical work',
          created_at: '2024-01-09T14:20:00Z',
          read: false,
          priority: 'urgent',
          source: 'Project Management',
          action_url: '/change-orders/CO-2024-003'
        }
      ];

      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    // Load notification settings from localStorage or API
    const saved = localStorage.getItem(`notification-settings-${userProfile?.id}`);
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading notification settings:', error);
      }
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    setSettings(newSettings);
    localStorage.setItem(`notification-settings-${userProfile?.id}`, JSON.stringify(newSettings));
    toast.success('Notification settings updated');
  };

  const markAsRead = async (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = async () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
    toast.success('All notifications marked as read');
  };

  const deleteNotification = async (notificationId: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    toast.success('Notification deleted');
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'mention':
        return <AtSign className="h-4 w-4" />;
      case 'message':
        return <MessageSquare className="h-4 w-4" />;
      case 'alert':
        return <AlertTriangle className="h-4 w-4" />;
      case 'update':
        return <CheckCircle className="h-4 w-4" />;
      case 'approval':
        return <Clock className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50';
      case 'high':
        return 'border-l-orange-500 bg-orange-50';
      case 'medium':
        return 'border-l-blue-500 bg-blue-50';
      case 'low':
        return 'border-l-gray-500 bg-gray-50';
      default:
        return 'border-l-gray-300';
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    switch (filter) {
      case 'unread':
        return !notif.read;
      case 'mentions':
        return notif.type === 'mention';
      case 'alerts':
        return notif.type === 'alert' || notif.priority === 'urgent';
      default:
        return true;
    }
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-muted-foreground">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            Mark All Read
          </Button>
        </div>
      </div>

      <Tabs defaultValue="notifications" className="w-full">
        <TabsList>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-4">
          {/* Filter Options */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All ({notifications.length})
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadCount})
            </Button>
            <Button
              variant={filter === 'mentions' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('mentions')}
            >
              <AtSign className="h-3 w-3 mr-1" />
              Mentions
            </Button>
            <Button
              variant={filter === 'alerts' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('alerts')}
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              Alerts
            </Button>
          </div>

          {/* Notifications List */}
          <div className="space-y-2">
            {filteredNotifications.length === 0 ? (
              <Card className="p-8 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No notifications</h3>
                <p className="text-muted-foreground">
                  {filter === 'all' ? 'You\'re all caught up!' : `No ${filter} notifications`}
                </p>
              </Card>
            ) : (
              filteredNotifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`border-l-4 transition-colors ${getPriorityColor(notification.priority)} ${
                    !notification.read ? 'bg-accent/50' : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium truncate">{notification.title}</h4>
                            {!notification.read && (
                              <Badge variant="secondary" className="text-xs">New</Badge>
                            )}
                            {notification.priority === 'urgent' && (
                              <Badge variant="destructive" className="text-xs">Urgent</Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2">
                            {notification.content}
                          </p>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{notification.source}</span>
                            <span>
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteNotification(notification.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">Activity Notifications</h4>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="mentions">@Mentions</Label>
                      <p className="text-sm text-muted-foreground">
                        When someone mentions you in a message
                      </p>
                    </div>
                    <Switch
                      id="mentions"
                      checked={settings.mentions}
                      onCheckedChange={(checked) => 
                        saveSettings({ ...settings, mentions: checked })
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="messages">New Messages</Label>
                      <p className="text-sm text-muted-foreground">
                        New messages in your channels
                      </p>
                    </div>
                    <Switch
                      id="messages"
                      checked={settings.messages}
                      onCheckedChange={(checked) => 
                        saveSettings({ ...settings, messages: checked })
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="project_updates">Project Updates</Label>
                      <p className="text-sm text-muted-foreground">
                        Progress updates and milestone completions
                      </p>
                    </div>
                    <Switch
                      id="project_updates"
                      checked={settings.project_updates}
                      onCheckedChange={(checked) => 
                        saveSettings({ ...settings, project_updates: checked })
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="budget_alerts">Budget Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Budget warnings and overages
                      </p>
                    </div>
                    <Switch
                      id="budget_alerts"
                      checked={settings.budget_alerts}
                      onCheckedChange={(checked) => 
                        saveSettings({ ...settings, budget_alerts: checked })
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="schedule_changes">Schedule Changes</Label>
                      <p className="text-sm text-muted-foreground">
                        Timeline updates and deadline changes
                      </p>
                    </div>
                    <Switch
                      id="schedule_changes"
                      checked={settings.schedule_changes}
                      onCheckedChange={(checked) => 
                        saveSettings({ ...settings, schedule_changes: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-medium mb-4">Delivery Methods</h4>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="email_notifications">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via email
                      </p>
                    </div>
                    <Switch
                      id="email_notifications"
                      checked={settings.email_notifications}
                      onCheckedChange={(checked) => 
                        saveSettings({ ...settings, email_notifications: checked })
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="push_notifications">Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Browser and mobile push notifications
                      </p>
                    </div>
                    <Switch
                      id="push_notifications"
                      checked={settings.push_notifications}
                      onCheckedChange={(checked) => 
                        saveSettings({ ...settings, push_notifications: checked })
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};