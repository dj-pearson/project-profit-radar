// Mobile Features Hook - Integrates Capacitor plugins for native mobile functionality
// Provides camera, geolocation, notifications, and offline capabilities

import { useState, useEffect } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation, Position } from '@capacitor/geolocation';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';
import { offlineSync } from '@/lib/offline-sync';

export interface MobileFeatures {
  // Platform detection
  isNativePlatform: boolean;
  platform: 'web' | 'ios' | 'android';

  // Camera
  takePhoto: () => Promise<string | null>;
  selectPhoto: () => Promise<string | null>;

  // Geolocation
  getCurrentPosition: () => Promise<Position | null>;
  watchPosition: (callback: (position: Position) => void) => Promise<string | null>;
  clearWatch: (watchId: string) => Promise<void>;

  // Notifications
  scheduleNotification: (options: {
    title: string;
    body: string;
    id?: number;
    schedule?: { at: Date };
  }) => Promise<void>;
  requestNotificationPermission: () => Promise<boolean>;

  // Network status
  isOnline: boolean;
  connectionType: string;

  // Offline sync
  syncNow: () => Promise<void>;
  getSyncStatus: () => Promise<any>;
  saveOffline: (table: string, data: any) => Promise<void>;
  getOfflineData: (table: string) => Promise<any[]>;

  // Device info
  getBatteryInfo: () => Promise<{ level: number; isCharging: boolean } | null>;
  getDeviceInfo: () => { model: string; platform: string; version: string };
}

export function useMobileFeatures(): MobileFeatures {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState('unknown');

  const isNativePlatform = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform() as 'web' | 'ios' | 'android';

  // Initialize network monitoring
  useEffect(() => {
    const initNetwork = async () => {
      const status = await Network.getStatus();
      setIsOnline(status.connected);
      setConnectionType(status.connectionType);

      Network.addListener('networkStatusChange', (status) => {
        setIsOnline(status.connected);
        setConnectionType(status.connectionType);
      });
    };

    initNetwork();

    // Initialize offline sync
    offlineSync.initialize();

    return () => {
      offlineSync.stopAutoSync();
    };
  }, []);

  // Camera: Take photo
  const takePhoto = async (): Promise<string | null> => {
    try {
      if (!isNativePlatform) {
        console.warn('Camera not available on web platform');
        return null;
      }

      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });

      return photo.base64String ? `data:image/jpeg;base64,${photo.base64String}` : null;
    } catch (error) {
      console.error('Error taking photo:', error);
      return null;
    }
  };

  // Camera: Select photo from gallery
  const selectPhoto = async (): Promise<string | null> => {
    try {
      if (!isNativePlatform) {
        console.warn('Photo picker not available on web platform');
        return null;
      }

      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
      });

      return photo.base64String ? `data:image/jpeg;base64,${photo.base64String}` : null;
    } catch (error) {
      console.error('Error selecting photo:', error);
      return null;
    }
  };

  // Geolocation: Get current position
  const getCurrentPosition = async (): Promise<Position | null> => {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });

      return position;
    } catch (error) {
      console.error('Error getting position:', error);
      return null;
    }
  };

  // Geolocation: Watch position
  const watchPosition = async (
    callback: (position: Position) => void
  ): Promise<string | null> => {
    try {
      const watchId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
        callback
      );

      return watchId;
    } catch (error) {
      console.error('Error watching position:', error);
      return null;
    }
  };

  // Geolocation: Clear watch
  const clearWatch = async (watchId: string): Promise<void> => {
    try {
      await Geolocation.clearWatch({ id: watchId });
    } catch (error) {
      console.error('Error clearing watch:', error);
    }
  };

  // Notifications: Schedule notification
  const scheduleNotification = async (options: {
    title: string;
    body: string;
    id?: number;
    schedule?: { at: Date };
  }): Promise<void> => {
    try {
      if (!isNativePlatform) {
        console.warn('Local notifications not available on web platform');
        return;
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            id: options.id || Math.floor(Math.random() * 1000000),
            title: options.title,
            body: options.body,
            schedule: options.schedule,
          },
        ],
      });
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  };

  // Notifications: Request permission
  const requestNotificationPermission = async (): Promise<boolean> => {
    try {
      if (!isNativePlatform) {
        return false;
      }

      const result = await LocalNotifications.requestPermissions();
      return result.display === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  // Offline Sync: Sync now
  const syncNow = async (): Promise<void> => {
    try {
      await offlineSync.sync();
    } catch (error) {
      console.error('Error syncing:', error);
    }
  };

  // Offline Sync: Get sync status
  const getSyncStatus = async (): Promise<any> => {
    try {
      return await offlineSync.getSyncStatus();
    } catch (error) {
      console.error('Error getting sync status:', error);
      return null;
    }
  };

  // Offline Sync: Save data offline
  const saveOffline = async (table: string, data: any): Promise<void> => {
    try {
      await offlineSync.saveLocal(table, data);
    } catch (error) {
      console.error('Error saving offline:', error);
    }
  };

  // Offline Sync: Get offline data
  const getOfflineData = async (table: string): Promise<any[]> => {
    try {
      return await offlineSync.getLocal(table);
    } catch (error) {
      console.error('Error getting offline data:', error);
      return [];
    }
  };

  // Device: Get battery info
  const getBatteryInfo = async (): Promise<{ level: number; isCharging: boolean } | null> => {
    try {
      if (!('getBattery' in navigator)) {
        return null;
      }

      const battery = await (navigator as any).getBattery();
      return {
        level: battery.level * 100,
        isCharging: battery.charging,
      };
    } catch (error) {
      console.error('Error getting battery info:', error);
      return null;
    }
  };

  // Device: Get device info
  const getDeviceInfo = () => {
    return {
      model: Capacitor.getPlatform(),
      platform: Capacitor.getPlatform(),
      version: '1.0.0', // Could use Device plugin for more details
    };
  };

  return {
    // Platform detection
    isNativePlatform,
    platform,

    // Camera
    takePhoto,
    selectPhoto,

    // Geolocation
    getCurrentPosition,
    watchPosition,
    clearWatch,

    // Notifications
    scheduleNotification,
    requestNotificationPermission,

    // Network
    isOnline,
    connectionType,

    // Offline sync
    syncNow,
    getSyncStatus,
    saveOffline,
    getOfflineData,

    // Device info
    getBatteryInfo,
    getDeviceInfo,
  };
}
