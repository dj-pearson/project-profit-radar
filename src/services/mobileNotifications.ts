import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';

export interface NotificationPayload {
  title: string;
  body: string;
  id: number;
  data?: any;
  schedule?: Date;
  type?: 'inspection' | 'safety' | 'deficiency' | 'general';
}

class MobileNotificationService {
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Request permissions
      const localPermResult = await LocalNotifications.requestPermissions();
      const pushPermResult = await PushNotifications.requestPermissions();

      if (localPermResult.display === 'granted') {
        console.log('Local notifications permission granted');
      }

      if (pushPermResult.receive === 'granted') {
        console.log('Push notifications permission granted');
        
        // Register for push notifications
        await PushNotifications.register();
      }

      // Set up listeners
      this.setupListeners();
      this.isInitialized = true;

    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  }

  private setupListeners() {
    // Push notification listeners
    PushNotifications.addListener('registration', (token) => {
      console.log('Push registration success, token: ' + token.value);
      // Here you would send the token to your backend
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error: ', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push notification received: ', notification);
      // Handle foreground notifications
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push notification action performed', notification);
      // Handle notification tap
      this.handleNotificationTap(notification.notification.data);
    });

    // Local notification listeners
    LocalNotifications.addListener('localNotificationReceived', (notification) => {
      console.log('Local notification received: ', notification);
    });

    LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
      console.log('Local notification action performed', notificationAction);
      this.handleNotificationTap(notificationAction.notification.extra);
    });
  }

  private handleNotificationTap(data: any) {
    if (data?.type === 'inspection') {
      // Navigate to inspection
      window.location.href = `/mobile?tab=inspections&id=${data.inspectionId}`;
    } else if (data?.type === 'safety') {
      // Navigate to safety reports
      window.location.href = `/mobile?tab=safety`;
    } else if (data?.type === 'deficiency') {
      // Navigate to punch list
      window.location.href = `/mobile?tab=punch-lists&id=${data.deficiencyId}`;
    }
  }

  async scheduleLocalNotification(payload: NotificationPayload) {
    try {
      await this.initialize();

      const notification = {
        title: payload.title,
        body: payload.body,
        id: payload.id,
        schedule: payload.schedule ? { at: payload.schedule } : undefined,
        extra: payload.data || {},
        attachments: [],
        actionTypeId: "",
        group: payload.type || 'general'
      };

      await LocalNotifications.schedule({
        notifications: [notification]
      });

      console.log('Local notification scheduled:', notification);
    } catch (error) {
      console.error('Failed to schedule notification:', error);
    }
  }

  async scheduleInspectionReminder(inspectionId: string, inspectionDate: Date, inspectionType: string) {
    // Schedule reminder 2 hours before inspection
    const reminderTime = new Date(inspectionDate.getTime() - 2 * 60 * 60 * 1000);
    
    if (reminderTime > new Date()) {
      await this.scheduleLocalNotification({
        title: '📋 Inspection Reminder',
        body: `${inspectionType} inspection scheduled in 2 hours`,
        id: parseInt(`1${inspectionId.slice(-8)}`, 16),
        schedule: reminderTime,
        type: 'inspection',
        data: { inspectionId, type: 'inspection' }
      });
    }
  }

  async scheduleDeficiencyDeadline(deficiencyId: string, dueDate: Date, description: string) {
    // Schedule reminder 24 hours before deadline
    const reminderTime = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000);
    
    if (reminderTime > new Date()) {
      await this.scheduleLocalNotification({
        title: '⚠️ Deficiency Due Soon',
        body: `${description} - Due in 24 hours`,
        id: parseInt(`2${deficiencyId.slice(-8)}`, 16),
        schedule: reminderTime,
        type: 'deficiency',
        data: { deficiencyId, type: 'deficiency' }
      });
    }
  }

  async scheduleSafetyReminder() {
    // Daily safety check reminder at 8 AM
    const tomorrow8AM = new Date();
    tomorrow8AM.setDate(tomorrow8AM.getDate() + 1);
    tomorrow8AM.setHours(8, 0, 0, 0);

    await this.scheduleLocalNotification({
      title: '🦺 Daily Safety Check',
      body: 'Complete your daily safety inspection',
      id: Math.floor(Math.random() * 100000) + 30000,
      schedule: tomorrow8AM,
      type: 'safety',
      data: { type: 'safety' }
    });
  }

  async cancelNotification(id: number) {
    try {
      await LocalNotifications.cancel({
        notifications: [{ id: id }]
      });
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  async cancelAllNotifications() {
    try {
      await LocalNotifications.removeAllDeliveredNotifications();
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  async checkPermissions() {
    const localPerms = await LocalNotifications.checkPermissions();
    const pushPerms = await PushNotifications.checkPermissions();
    
    return {
      local: localPerms.display === 'granted',
      push: pushPerms.receive === 'granted'
    };
  }
}

export const mobileNotifications = new MobileNotificationService();