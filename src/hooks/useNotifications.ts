import { useState, useEffect, useCallback } from 'react';
import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { PushNotifications, PermissionStatus } from '@capacitor/push-notifications';
import { Device } from '@capacitor/device';
import { Preferences } from '@capacitor/preferences';
import { useToast } from './use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface NotificationPayload {
  id?: number;
  title: string;
  body: string;
  data?: any;
  schedule?: {
    at: Date;
    repeats?: boolean;
    every?: 'year' | 'month' | 'two-weeks' | 'week' | 'day' | 'hour' | 'minute' | 'second';
  };
  sound?: string;
  attachments?: Array<{
    id: string;
    url: string;
    options?: any;
  }>;
  actionTypeId?: string;
  extra?: any;
}

interface NotificationSettings {
  enabled: boolean;
  projectUpdates: boolean;
  safetyAlerts: boolean;
  timeTracking: boolean;
  weatherAlerts: boolean;
  deadlines: boolean;
  sound: boolean;
  vibration: boolean;
}

export const useNotifications = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    projectUpdates: true,
    safetyAlerts: true,
    timeTracking: true,
    weatherAlerts: true,
    deadlines: true,
    sound: true,
    vibration: true
  });
  
  const { toast } = useToast();
  const { user } = useAuth();

  // Initialize notifications
  useEffect(() => {
    initializeNotifications();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { value } = await Preferences.get({ key: 'notification_settings' });
      if (value) {
        setSettings(JSON.parse(value));
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      await Preferences.set({
        key: 'notification_settings',
        value: JSON.stringify(newSettings)
      });
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  const initializeNotifications = async () => {
    try {
      // Check if platform supports notifications
      const deviceInfo = await Device.getInfo();
      if (deviceInfo.platform === 'web') {
        return;
      }

      // Request permissions for local notifications
      const localPermissions = await LocalNotifications.requestPermissions();
      
      if (localPermissions.display === 'granted') {
        setIsEnabled(true);
        
        // Set up local notification listeners
        LocalNotifications.addListener('localNotificationReceived', (notification) => {
        });

        LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
          handleNotificationAction(notificationAction);
        });
      }

      // Initialize push notifications
      await initializePushNotifications();

    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  };

  const initializePushNotifications = async () => {
    try {
      // Request push notification permissions
      const pushPermissions = await PushNotifications.requestPermissions();
      
      if (pushPermissions.receive === 'granted') {
        // Register for push notifications
        await PushNotifications.register();

        // Set up push notification listeners
        PushNotifications.addListener('registration', (token) => {
          setPushToken(token.value);
          savePushTokenToServer(token.value);
        });

        PushNotifications.addListener('registrationError', (error) => {
          console.error('Push registration error:', error);
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          handleNotificationAction(notification);
        });
      }
    } catch (error) {
      console.error('Error initializing push notifications:', error);
    }
  };

  const savePushTokenToServer = async (token: string) => {
    try {
      if (!user) return;

      const deviceInfo = await Device.getInfo();
      
      // Save device info to preferences instead
      await Preferences.set({
        key: 'push_token',
        value: JSON.stringify({ token, deviceInfo })
      });
    } catch (error) {
      console.error('Error saving push token to server:', error);
    }
  };

  const handleNotificationAction = (notificationAction: any) => {
    const { actionId, notification } = notificationAction;
    
    switch (actionId) {
      case 'view_project':
        // Navigate to project
        if (notification.extra?.projectId) {
          window.location.href = `/projects/${notification.extra.projectId}`;
        }
        break;
      
      case 'mark_complete':
        // Mark task as complete
        if (notification.extra?.taskId) {
          // Handle task completion
        }
        break;
      
      case 'snooze':
        // Snooze notification for 15 minutes
        scheduleLocalNotification({
          ...notification,
          schedule: {
            at: new Date(Date.now() + 15 * 60 * 1000)
          }
        });
        break;
    }
  };

  const scheduleLocalNotification = useCallback(async (notification: NotificationPayload) => {
    try {
      if (!isEnabled || !settings.enabled) return;

      const options: ScheduleOptions = {
        notifications: [{
          id: notification.id || Date.now(),
          title: notification.title,
          body: notification.body,
          largeBody: notification.body,
          summaryText: 'Construction Management',
          sound: settings.sound ? (notification.sound || 'beep.wav') : undefined,
          iconColor: '#ff6b35',
          actionTypeId: notification.actionTypeId,
          extra: notification.extra,
          schedule: notification.schedule,
          attachments: notification.attachments
        }]
      };

      await LocalNotifications.schedule(options);

      toast({
        title: "Notification Scheduled",
        description: `Reminder set for ${notification.title}`,
      });

    } catch (error) {
      console.error('Error scheduling notification:', error);
      toast({
        title: "Notification Error",
        description: "Failed to schedule notification",
        variant: "destructive"
      });
    }
  }, [isEnabled, settings, toast]);

  const sendImmediateNotification = useCallback(async (notification: NotificationPayload) => {
    try {
      if (!isEnabled || !settings.enabled) return;

      await scheduleLocalNotification({
        ...notification,
        schedule: { at: new Date(Date.now() + 1000) } // 1 second delay
      });

    } catch (error) {
      console.error('Error sending immediate notification:', error);
    }
  }, [isEnabled, settings, scheduleLocalNotification]);

  const cancelNotification = useCallback(async (notificationId: number) => {
    try {
      await LocalNotifications.cancel({
        notifications: [{ id: notificationId }]
      });
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }, []);

  const cancelAllNotifications = useCallback(async () => {
    try {
      const pending = await LocalNotifications.getPending();
      await Promise.all(
        pending.notifications.map(notification =>
          LocalNotifications.cancel({ notifications: [{ id: notification.id }] })
        )
      );
      
      toast({
        title: "Notifications Cleared",
        description: "All pending notifications have been canceled",
      });
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }, [toast]);

  const getPendingNotifications = useCallback(async () => {
    try {
      const result = await LocalNotifications.getPending();
      return result.notifications;
    } catch (error) {
      console.error('Error getting pending notifications:', error);
      return [];
    }
  }, []);

  // Pre-defined notification types
  const scheduleDeadlineReminder = useCallback(async (
    title: string, 
    dueDate: Date, 
    projectId?: string
  ) => {
    if (!settings.deadlines) return;

    // Schedule reminder 1 day before
    const reminderDate = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000);
    
    await scheduleLocalNotification({
      title: `Deadline Reminder: ${title}`,
      body: `Due tomorrow at ${dueDate.toLocaleTimeString()}`,
      schedule: { at: reminderDate },
      actionTypeId: 'deadline_reminder',
      extra: { projectId, dueDate: dueDate.toISOString() }
    });
  }, [settings.deadlines, scheduleLocalNotification]);

  const scheduleSafetyAlert = useCallback(async (
    message: string, 
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ) => {
    if (!settings.safetyAlerts) return;

    await sendImmediateNotification({
      title: 'Safety Alert',
      body: message,
      actionTypeId: 'safety_alert',
      extra: { severity },
      sound: severity === 'critical' ? 'emergency.wav' : 'alert.wav'
    });
  }, [settings.safetyAlerts, sendImmediateNotification]);

  const scheduleTimeTrackingReminder = useCallback(async () => {
    if (!settings.timeTracking) return;

    await scheduleLocalNotification({
      title: 'Time Tracking Reminder',
      body: 'Remember to clock out at the end of your shift',
      schedule: {
        at: new Date(),
        repeats: true,
        every: 'day'
      },
      actionTypeId: 'time_tracking'
    });
  }, [settings.timeTracking, scheduleLocalNotification]);

  const scheduleWeatherAlert = useCallback(async (
    weatherCondition: string,
    impact: string
  ) => {
    if (!settings.weatherAlerts) return;

    await sendImmediateNotification({
      title: 'Weather Alert',
      body: `${weatherCondition}: ${impact}`,
      actionTypeId: 'weather_alert',
      extra: { condition: weatherCondition, impact }
    });
  }, [settings.weatherAlerts, sendImmediateNotification]);

  return {
    // State
    isEnabled,
    pushToken,
    settings,
    
    // Settings
    saveSettings,
    
    // Core functions
    scheduleLocalNotification,
    sendImmediateNotification,
    cancelNotification,
    cancelAllNotifications,
    getPendingNotifications,
    
    // Pre-defined notifications
    scheduleDeadlineReminder,
    scheduleSafetyAlert,
    scheduleTimeTrackingReminder,
    scheduleWeatherAlert
  };
};