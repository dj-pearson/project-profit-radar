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
      }

      if (pushPermResult.receive === 'granted') {
        
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
      // Here you would send the token to your backend
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error: ', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      // Handle foreground notifications
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      // Handle notification tap
      this.handleNotificationTap(notification.notification.data);
    });

    // Local notification listeners
    LocalNotifications.addListener('localNotificationReceived', (notification) => {
    });

    LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
      this.handleNotificationTap(notificationAction.notification.extra);
    });
  }

  /**
   * Validates that an ID is safe for use in URLs (UUID format or numeric)
   * Security: Prevents open redirect attacks by validating IDs
   */
  private isValidId(id: any): boolean {
    if (!id || typeof id !== 'string') return false;

    // Check if it's a valid UUID format (8-4-4-4-12)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    // Or a valid numeric ID
    const numericRegex = /^[0-9]+$/;

    return uuidRegex.test(id) || numericRegex.test(id);
  }

  /**
   * Safely encodes a URL parameter
   * Security: Prevents injection attacks by encoding special characters
   */
  private encodeParam(value: string): string {
    return encodeURIComponent(value);
  }

  private handleNotificationTap(data: any) {
    // Security: Validate all IDs before using them in URLs to prevent open redirect attacks
    if (data?.type === 'inspection') {
      if (this.isValidId(data.inspectionId)) {
        // Navigate to inspection with validated and encoded ID
        const safeId = this.encodeParam(data.inspectionId);
        window.location.href = `/mobile?tab=inspections&id=${safeId}`;
      } else {
        console.error('Invalid inspection ID format');
      }
    } else if (data?.type === 'safety') {
      // Navigate to safety reports (no user input)
      window.location.href = `/mobile?tab=safety`;
    } else if (data?.type === 'deficiency') {
      if (this.isValidId(data.deficiencyId)) {
        // Navigate to punch list with validated and encoded ID
        const safeId = this.encodeParam(data.deficiencyId);
        window.location.href = `/mobile?tab=punch-lists&id=${safeId}`;
      } else {
        console.error('Invalid deficiency ID format');
      }
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