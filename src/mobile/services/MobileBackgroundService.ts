import * as Notifications from 'expo-notifications';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Task names
const BACKGROUND_FETCH_TASK = 'background-fetch';
const LOCATION_TASK_NAME = 'background-location';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Background fetch task
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    console.log('Background fetch task running...');
    
    // Sync critical data
    await syncCriticalData();
    
    // Check for urgent notifications
    await checkUrgentUpdates();
    
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Background fetch failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Background location task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }

  if (data) {
    const { locations } = data as any;
    console.log('Received new locations', locations);
    
    // Process location updates
    await processLocationUpdates(locations);
  }
});

class MobileBackgroundService {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Register background fetch
      await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
        minimumInterval: 15 * 60, // 15 minutes
        stopOnTerminate: false,
        startOnBoot: true,
      });

      // Setup notification channels (Android)
      await this.setupNotificationChannels();

      this.isInitialized = true;
      console.log('Mobile background service initialized');
    } catch (error) {
      console.error('Failed to initialize background service:', error);
    }
  }

  async setupNotificationChannels(): Promise<void> {
    // Project updates channel
    await Notifications.setNotificationChannelAsync('project-updates', {
      name: 'Project Updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4A90E2',
    });

    // Safety alerts channel
    await Notifications.setNotificationChannelAsync('safety-alerts', {
      name: 'Safety Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#EF4444',
    });

    // Task reminders channel
    await Notifications.setNotificationChannelAsync('task-reminders', {
      name: 'Task Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250],
      lightColor: '#10B981',
    });

    // Team communication channel
    await Notifications.setNotificationChannelAsync('team-communication', {
      name: 'Team Communication',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#8B5CF6',
    });
  }

  async startLocationTracking(): Promise<void> {
    try {
      const { granted } = await Location.requestBackgroundPermissionsAsync();
      if (!granted) {
        console.warn('Background location permission not granted');
        return;
      }

      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30000, // 30 seconds
        distanceInterval: 50, // 50 meters
        foregroundService: {
          notificationTitle: 'BuildDesk Location Tracking',
          notificationBody: 'Tracking your location for job site management',
          notificationColor: '#4A90E2',
        },
      });

      console.log('Background location tracking started');
    } catch (error) {
      console.error('Failed to start location tracking:', error);
    }
  }

  async stopLocationTracking(): Promise<void> {
    try {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log('Background location tracking stopped');
    } catch (error) {
      console.error('Failed to stop location tracking:', error);
    }
  }

  async scheduleNotification(
    title: string,
    body: string,
    data?: any,
    trigger?: Notifications.NotificationTriggerInput,
    channelId: string = 'default'
  ): Promise<string> {
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger,
        identifier: undefined,
      });

      return identifier;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      throw error;
    }
  }

  async scheduleTaskReminder(
    taskTitle: string,
    dueDate: Date,
    projectName: string
  ): Promise<string> {
    const reminderTime = new Date(dueDate.getTime() - 60 * 60 * 1000); // 1 hour before

    return this.scheduleNotification(
      'Task Due Soon',
      `"${taskTitle}" in ${projectName} is due in 1 hour`,
      {
        type: 'task-reminder',
        taskTitle,
        projectName,
        dueDate: dueDate.toISOString(),
      },
      {
        date: reminderTime,
      },
      'task-reminders'
    );
  }

  async scheduleSafetyAlert(
    message: string,
    projectName: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<string> {
    return this.scheduleNotification(
      'Safety Alert',
      `${projectName}: ${message}`,
      {
        type: 'safety-alert',
        severity,
        projectName,
        timestamp: new Date().toISOString(),
      },
      null, // Send immediately
      'safety-alerts'
    );
  }

  async scheduleProjectUpdate(
    title: string,
    message: string,
    projectName: string
  ): Promise<string> {
    return this.scheduleNotification(
      title,
      `${projectName}: ${message}`,
      {
        type: 'project-update',
        projectName,
        timestamp: new Date().toISOString(),
      },
      null, // Send immediately
      'project-updates'
    );
  }

  async cancelNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Failed to get badge count:', error);
      return 0;
    }
  }

  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Failed to set badge count:', error);
    }
  }

  async clearBadge(): Promise<void> {
    await this.setBadgeCount(0);
  }
}

// Helper functions for background tasks
async function syncCriticalData(): Promise<void> {
  try {
    // Sync pending uploads
    const pendingUploads = await AsyncStorage.getItem('pendingUploads');
    if (pendingUploads) {
      const uploads = JSON.parse(pendingUploads);
      // Process uploads...
      console.log(`Processing ${uploads.length} pending uploads`);
    }

    // Sync offline changes
    const offlineChanges = await AsyncStorage.getItem('offlineChanges');
    if (offlineChanges) {
      const changes = JSON.parse(offlineChanges);
      // Sync changes...
      console.log(`Syncing ${changes.length} offline changes`);
    }
  } catch (error) {
    console.error('Failed to sync critical data:', error);
  }
}

async function checkUrgentUpdates(): Promise<void> {
  try {
    // Check for urgent project updates, safety alerts, etc.
    // This would typically make API calls to check for updates
    console.log('Checking for urgent updates...');
  } catch (error) {
    console.error('Failed to check urgent updates:', error);
  }
}

async function processLocationUpdates(locations: Location.LocationObject[]): Promise<void> {
  try {
    // Process location updates for geofencing, time tracking, etc.
    for (const location of locations) {
      console.log('Processing location:', location.coords);
      
      // Check if user entered/exited job sites
      // Update time tracking
      // Send location-based notifications
    }
  } catch (error) {
    console.error('Failed to process location updates:', error);
  }
}

export const mobileBackgroundService = new MobileBackgroundService();
