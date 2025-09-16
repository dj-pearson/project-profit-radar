import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, BellOff, Smartphone, AlertTriangle, CheckCircle, Settings } from 'lucide-react';

interface NotificationSettings {
  projectUpdates: boolean;
  taskAssignments: boolean;
  deadlineReminders: boolean;
  safetyAlerts: boolean;
  timeTracking: boolean;
  weatherAlerts: boolean;
  budgetAlerts: boolean;
  scheduleChanges: boolean;
}

export const PushNotificationManager = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    projectUpdates: true,
    taskAssignments: true,
    deadlineReminders: true,
    safetyAlerts: true,
    timeTracking: false,
    budgetAlerts: true,
    scheduleChanges: true,
    weatherAlerts: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    checkNotificationSupport();
    loadNotificationSettings();
  }, []);

  const checkNotificationSupport = () => {
    if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  };

  const loadNotificationSettings = async () => {
    if (!user) return;

    try {
      // Load from localStorage for now
      const savedSettings = localStorage.getItem('notification_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed.settings || settings);
        setIsSubscribed(parsed.isSubscribed || false);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const requestPermission = async () => {
    if (!isSupported) return false;

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      
      if (permission === 'granted') {
        await registerServiceWorker();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: await getVapidKey()
      });

      await savePushSubscription(subscription);
      setIsSubscribed(true);
      
      toast({
        title: "Notifications Enabled",
        description: "You'll now receive push notifications for important updates",
      });
    } catch (error) {
      console.error('Error registering service worker:', error);
      toast({
        title: "Setup Error",
        description: "Failed to set up push notifications. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getVapidKey = async () => {
    // In production, this would be your actual VAPID public key
    return 'BEl62iUYgUivxIkv69yViEuiBIa40HI80NM1JJHgDP5Dm4v8vL0-3fXvOi8lQ4IvfS8PQK6G4vGpXkfOl8F-C4w';
  };

  const savePushSubscription = async (subscription: PushSubscription) => {
    try {
      // Store subscription locally for now
      const subData = {
        user_id: user?.id,
        company_id: userProfile?.company_id,
        endpoint: subscription.endpoint,
        p256dh_key: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
        auth_key: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))),
        is_active: true
      };
      
      localStorage.setItem('push_subscription', JSON.stringify(subData));
    } catch (error) {
      console.error('Error saving push subscription:', error);
      throw error;
    }
  };

  const updateNotificationSettings = async (newSettings: NotificationSettings) => {
    try {
      setIsLoading(true);

      // Save to localStorage for now
      const settingsData = {
        settings: newSettings,
        isSubscribed,
        user_id: user?.id,
        company_id: userProfile?.company_id
      };
      
      localStorage.setItem('notification_settings', JSON.stringify(settingsData));

      setSettings(newSettings);
      toast({
        title: "Settings Updated",
        description: "Your notification preferences have been saved",
      });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast({
        title: "Update Error",
        description: "Failed to save notification preferences",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const enableNotifications = async () => {
    const granted = await requestPermission();
    if (granted) {
      await updateNotificationSettings(settings);
    }
  };

  const disableNotifications = async () => {
    try {
      // Unsubscribe from push notifications
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
        }
      }

      // Update localStorage
      localStorage.removeItem('push_subscription');

      setIsSubscribed(false);
      toast({
        title: "Notifications Disabled",
        description: "Push notifications have been turned off",
      });
    } catch (error) {
      console.error('Error disabling notifications:', error);
      toast({
        title: "Error",
        description: "Failed to disable notifications",
        variant: "destructive"
      });
    }
  };

  const sendTestNotification = async () => {
    if (!isSubscribed) return;

    try {
      await supabase.functions.invoke('send-push-notification', {
        body: {
          user_id: user?.id,
          title: 'Test Notification',
          body: 'This is a test notification from BuildDesk',
          icon: '/favicon.ico',
          badge: '/favicon.ico'
        }
      });

      toast({
        title: "Test Sent",
        description: "Check your device for the test notification",
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: "Test Failed",
        description: "Failed to send test notification",
        variant: "destructive"
      });
    }
  };

  const handleSettingChange = (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    updateNotificationSettings(newSettings);
  };

  const getPermissionStatus = () => {
    switch (permission) {
      case 'granted':
        return { icon: CheckCircle, color: 'text-green-600', text: 'Granted' };
      case 'denied':
        return { icon: BellOff, color: 'text-red-600', text: 'Denied' };
      default:
        return { icon: AlertTriangle, color: 'text-yellow-600', text: 'Not Requested' };
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Push Notifications Not Supported
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your browser doesn't support push notifications. Please use a modern browser like Chrome, Firefox, or Safari.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const statusInfo = getPermissionStatus();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <CardTitle>Push Notifications</CardTitle>
            </div>
            <Badge variant={isSubscribed ? "default" : "secondary"}>
              {isSubscribed ? "Active" : "Inactive"}
            </Badge>
          </div>
          <CardDescription>
            Receive real-time notifications for important construction updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Permission Status */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <statusInfo.icon className={`h-5 w-5 ${statusInfo.color}`} />
              <div>
                <p className="font-medium">Browser Permission</p>
                <p className="text-sm text-muted-foreground">{statusInfo.text}</p>
              </div>
            </div>
            {permission !== 'granted' && (
              <Button onClick={enableNotifications} disabled={isLoading}>
                Enable Notifications
              </Button>
            )}
          </div>

          {/* Main Controls */}
          {permission === 'granted' && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                <Label>Push Notifications</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={isSubscribed}
                  onCheckedChange={isSubscribed ? disableNotifications : enableNotifications}
                  disabled={isLoading}
                />
                {isSubscribed && (
                  <Button variant="outline" size="sm" onClick={sendTestNotification}>
                    Test
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Notification Categories */}
          {isSubscribed && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <h4 className="font-medium">Notification Categories</h4>
                </div>

                <div className="grid gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Project Updates</Label>
                      <p className="text-sm text-muted-foreground">Status changes, milestones, completions</p>
                    </div>
                    <Switch
                      checked={settings.projectUpdates}
                      onCheckedChange={(checked) => handleSettingChange('projectUpdates', checked)}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Task Assignments</Label>
                      <p className="text-sm text-muted-foreground">New tasks and assignments</p>
                    </div>
                    <Switch
                      checked={settings.taskAssignments}
                      onCheckedChange={(checked) => handleSettingChange('taskAssignments', checked)}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Deadline Reminders</Label>
                      <p className="text-sm text-muted-foreground">Upcoming deadlines and due dates</p>
                    </div>
                    <Switch
                      checked={settings.deadlineReminders}
                      onCheckedChange={(checked) => handleSettingChange('deadlineReminders', checked)}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Safety Alerts</Label>
                      <p className="text-sm text-muted-foreground">Important safety notifications</p>
                    </div>
                    <Switch
                      checked={settings.safetyAlerts}
                      onCheckedChange={(checked) => handleSettingChange('safetyAlerts', checked)}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Budget Alerts</Label>
                      <p className="text-sm text-muted-foreground">Budget overruns and cost warnings</p>
                    </div>
                    <Switch
                      checked={settings.budgetAlerts}
                      onCheckedChange={(checked) => handleSettingChange('budgetAlerts', checked)}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Schedule Changes</Label>
                      <p className="text-sm text-muted-foreground">Timeline and schedule updates</p>
                    </div>
                    <Switch
                      checked={settings.scheduleChanges}
                      onCheckedChange={(checked) => handleSettingChange('scheduleChanges', checked)}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Time Tracking</Label>
                      <p className="text-sm text-muted-foreground">Clock in/out reminders</p>
                    </div>
                    <Switch
                      checked={settings.timeTracking}
                      onCheckedChange={(checked) => handleSettingChange('timeTracking', checked)}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Weather Alerts</Label>
                      <p className="text-sm text-muted-foreground">Weather conditions affecting work</p>
                    </div>
                    <Switch
                      checked={settings.weatherAlerts}
                      onCheckedChange={(checked) => handleSettingChange('weatherAlerts', checked)}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Help Text */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Notifications help you stay informed about critical project updates. You can customize which types of notifications you receive.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};