import * as Notifications from 'expo-notifications';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys for geofencing state
const STORAGE_KEYS = {
  ACTIVE_GEOFENCES: 'builddesk_active_geofences',
  INSIDE_GEOFENCES: 'builddesk_inside_geofences',
  ACTIVE_TIME_ENTRY: 'builddesk_active_time_entry',
  USER_ID: 'builddesk_user_id',
  COMPANY_ID: 'builddesk_company_id',
  PENDING_CLOCK_EVENTS: 'builddesk_pending_clock_events',
};

// Geofence interface for storage
interface StoredGeofence {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  projectId?: string;
  autoClockIn: boolean;
  autoClockOut: boolean;
  entryAlert: boolean;
  exitAlert: boolean;
}

// Clock event for offline queue
interface PendingClockEvent {
  type: 'clock_in' | 'clock_out';
  geofenceId: string;
  geofenceName: string;
  projectId?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string;
  userId: string;
  companyId: string;
}

// Task names
const BACKGROUND_FETCH_TASK = 'background-fetch';
const LOCATION_TASK_NAME = 'background-location';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Background fetch task
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    
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

    } catch (error) {
      console.error('Failed to start location tracking:', error);
    }
  }

  async stopLocationTracking(): Promise<void> {
    try {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
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
        type: 'date',
        date: reminderTime,
      } as Notifications.DateTriggerInput,
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

  /**
   * Store user credentials for background processing
   */
  async setUserCredentials(userId: string, companyId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, userId);
      await AsyncStorage.setItem(STORAGE_KEYS.COMPANY_ID, companyId);
    } catch (error) {
      console.error('Failed to store user credentials:', error);
    }
  }

  /**
   * Clear user credentials (on logout)
   */
  async clearUserCredentials(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.USER_ID,
        STORAGE_KEYS.COMPANY_ID,
        STORAGE_KEYS.ACTIVE_TIME_ENTRY,
        STORAGE_KEYS.INSIDE_GEOFENCES,
      ]);
    } catch (error) {
      console.error('Failed to clear user credentials:', error);
    }
  }

  /**
   * Store active geofences for background monitoring
   */
  async setActiveGeofences(geofences: StoredGeofence[]): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.ACTIVE_GEOFENCES,
        JSON.stringify(geofences)
      );
    } catch (error) {
      console.error('Failed to store geofences:', error);
    }
  }

  /**
   * Get pending clock events for sync
   */
  async getPendingClockEvents(): Promise<PendingClockEvent[]> {
    try {
      const pendingStr = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_CLOCK_EVENTS);
      return pendingStr ? JSON.parse(pendingStr) : [];
    } catch (error) {
      console.error('Failed to get pending clock events:', error);
      return [];
    }
  }

  /**
   * Clear pending clock events after successful sync
   */
  async clearPendingClockEvents(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_CLOCK_EVENTS);
    } catch (error) {
      console.error('Failed to clear pending clock events:', error);
    }
  }

  /**
   * Remove specific clock events after sync
   */
  async removeSyncedClockEvents(syncedTimestamps: string[]): Promise<void> {
    try {
      const pending = await this.getPendingClockEvents();
      const remaining = pending.filter(
        event => !syncedTimestamps.includes(event.timestamp)
      );
      await AsyncStorage.setItem(
        STORAGE_KEYS.PENDING_CLOCK_EVENTS,
        JSON.stringify(remaining)
      );
    } catch (error) {
      console.error('Failed to remove synced clock events:', error);
    }
  }

  /**
   * Get active time entry
   */
  async getActiveTimeEntry(): Promise<{ geofenceId: string; startTime: string } | null> {
    try {
      const entryStr = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_TIME_ENTRY);
      return entryStr ? JSON.parse(entryStr) : null;
    } catch (error) {
      console.error('Failed to get active time entry:', error);
      return null;
    }
  }

  /**
   * Check if currently inside any geofence
   */
  async getCurrentGeofenceState(): Promise<string[]> {
    try {
      const insideStr = await AsyncStorage.getItem(STORAGE_KEYS.INSIDE_GEOFENCES);
      return insideStr ? JSON.parse(insideStr) : [];
    } catch (error) {
      console.error('Failed to get geofence state:', error);
      return [];
    }
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
    }

    // Sync offline changes
    const offlineChanges = await AsyncStorage.getItem('offlineChanges');
    if (offlineChanges) {
      const changes = JSON.parse(offlineChanges);
      // Sync changes...
    }
  } catch (error) {
    console.error('Failed to sync critical data:', error);
  }
}

async function checkUrgentUpdates(): Promise<void> {
  try {
    // Check for urgent project updates, safety alerts, etc.
    // This would typically make API calls to check for updates
  } catch (error) {
    console.error('Failed to check urgent updates:', error);
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Check if a location is inside a geofence
 */
function isInsideGeofence(
  latitude: number,
  longitude: number,
  geofence: StoredGeofence,
  accuracy: number = 0
): boolean {
  const distance = calculateDistance(
    latitude,
    longitude,
    geofence.latitude,
    geofence.longitude
  );

  // Add accuracy buffer to radius
  const effectiveRadius = geofence.radius + accuracy;
  return distance <= effectiveRadius;
}

/**
 * Queue a clock event for later sync (offline support)
 */
async function queueClockEvent(event: PendingClockEvent): Promise<void> {
  try {
    const pendingStr = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_CLOCK_EVENTS);
    const pending: PendingClockEvent[] = pendingStr ? JSON.parse(pendingStr) : [];
    pending.push(event);
    await AsyncStorage.setItem(STORAGE_KEYS.PENDING_CLOCK_EVENTS, JSON.stringify(pending));
  } catch (error) {
    console.error('Failed to queue clock event:', error);
  }
}

/**
 * Handle geofence entry - auto clock-in
 */
async function handleGeofenceEntry(
  geofence: StoredGeofence,
  location: Location.LocationObject
): Promise<void> {
  const userId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
  const companyId = await AsyncStorage.getItem(STORAGE_KEYS.COMPANY_ID);

  if (!userId || !companyId) {
    console.warn('User not authenticated for geofence entry');
    return;
  }

  // Check if auto clock-in is enabled
  if (geofence.autoClockIn) {
    // Check if there's already an active time entry
    const activeEntry = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_TIME_ENTRY);
    if (!activeEntry) {
      // Queue clock-in event
      await queueClockEvent({
        type: 'clock_in',
        geofenceId: geofence.id,
        geofenceName: geofence.name,
        projectId: geofence.projectId,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy ?? undefined,
        timestamp: new Date().toISOString(),
        userId,
        companyId,
      });

      // Store active time entry reference
      await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_TIME_ENTRY, JSON.stringify({
        geofenceId: geofence.id,
        startTime: new Date().toISOString(),
      }));
    }
  }

  // Send notification if enabled
  if (geofence.entryAlert) {
    await mobileBackgroundService.scheduleNotification(
      'Arrived at Job Site',
      `You've arrived at ${geofence.name}${geofence.autoClockIn ? '. Auto clock-in recorded.' : ''}`,
      {
        type: 'geofence-entry',
        geofenceId: geofence.id,
        geofenceName: geofence.name,
      },
      null, // Send immediately
      'project-updates'
    );
  }
}

/**
 * Handle geofence exit - auto clock-out
 */
async function handleGeofenceExit(
  geofence: StoredGeofence,
  location: Location.LocationObject
): Promise<void> {
  const userId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
  const companyId = await AsyncStorage.getItem(STORAGE_KEYS.COMPANY_ID);

  if (!userId || !companyId) {
    console.warn('User not authenticated for geofence exit');
    return;
  }

  // Check if auto clock-out is enabled
  if (geofence.autoClockOut) {
    // Check if there's an active time entry for this geofence
    const activeEntryStr = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_TIME_ENTRY);
    if (activeEntryStr) {
      const activeEntry = JSON.parse(activeEntryStr);
      if (activeEntry.geofenceId === geofence.id) {
        // Queue clock-out event
        await queueClockEvent({
          type: 'clock_out',
          geofenceId: geofence.id,
          geofenceName: geofence.name,
          projectId: geofence.projectId,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy ?? undefined,
          timestamp: new Date().toISOString(),
          userId,
          companyId,
        });

        // Calculate hours worked
        const startTime = new Date(activeEntry.startTime);
        const endTime = new Date();
        const hoursWorked = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

        // Clear active time entry
        await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_TIME_ENTRY);

        // Send notification with hours worked
        if (geofence.exitAlert) {
          await mobileBackgroundService.scheduleNotification(
            'Left Job Site',
            `You've left ${geofence.name}. Total time: ${hoursWorked.toFixed(2)} hours`,
            {
              type: 'geofence-exit',
              geofenceId: geofence.id,
              geofenceName: geofence.name,
              hoursWorked,
            },
            null,
            'project-updates'
          );
        }
        return;
      }
    }
  }

  // Send exit notification even without auto clock-out
  if (geofence.exitAlert) {
    await mobileBackgroundService.scheduleNotification(
      'Left Job Site',
      `You've left ${geofence.name}`,
      {
        type: 'geofence-exit',
        geofenceId: geofence.id,
        geofenceName: geofence.name,
      },
      null,
      'project-updates'
    );
  }
}

/**
 * Process location updates for geofencing and time tracking
 */
async function processLocationUpdates(locations: Location.LocationObject[]): Promise<void> {
  try {
    // Get stored geofences
    const geofencesStr = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_GEOFENCES);
    if (!geofencesStr) {
      return;
    }

    const geofences: StoredGeofence[] = JSON.parse(geofencesStr);
    if (geofences.length === 0) {
      return;
    }

    // Get current inside state
    const insideStr = await AsyncStorage.getItem(STORAGE_KEYS.INSIDE_GEOFENCES);
    const currentlyInside: Set<string> = new Set(insideStr ? JSON.parse(insideStr) : []);

    // Process each location update (use the most recent one)
    const latestLocation = locations[locations.length - 1];
    if (!latestLocation) return;

    const { latitude, longitude, accuracy } = latestLocation.coords;

    // Check each geofence for enter/exit events
    const newlyInside = new Set<string>();

    for (const geofence of geofences) {
      const inside = isInsideGeofence(latitude, longitude, geofence, accuracy ?? 0);

      if (inside) {
        newlyInside.add(geofence.id);
      }

      // Detect transitions
      const wasInside = currentlyInside.has(geofence.id);
      const isNowInside = inside;

      // Entered geofence
      if (isNowInside && !wasInside) {
        await handleGeofenceEntry(geofence, latestLocation);
      }

      // Exited geofence
      if (!isNowInside && wasInside) {
        await handleGeofenceExit(geofence, latestLocation);
      }
    }

    // Update stored inside state
    await AsyncStorage.setItem(
      STORAGE_KEYS.INSIDE_GEOFENCES,
      JSON.stringify(Array.from(newlyInside))
    );

  } catch (error) {
    console.error('Failed to process location updates:', error);
  }
}

export const mobileBackgroundService = new MobileBackgroundService();

// Export types for external use
export type { StoredGeofence, PendingClockEvent };
export { STORAGE_KEYS };
