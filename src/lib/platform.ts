import { Capacitor } from '@capacitor/core';

/**
 * Platform detection utilities for Capacitor apps
 */
export const platform = {
  /**
   * Check if running on a native platform (iOS or Android)
   */
  isNative: Capacitor.isNativePlatform(),

  /**
   * Check if running on iOS
   */
  isIOS: Capacitor.getPlatform() === 'ios',

  /**
   * Check if running on Android
   */
  isAndroid: Capacitor.getPlatform() === 'android',

  /**
   * Check if running on web
   */
  isWeb: Capacitor.getPlatform() === 'web',

  /**
   * Get the current platform name
   */
  platform: Capacitor.getPlatform(),

  /**
   * Check if a specific plugin is available
   */
  hasPlugin: (pluginName: string): boolean => {
    return Capacitor.isPluginAvailable(pluginName);
  },

  /**
   * Check if camera is available
   */
  hasCamera: (): boolean => {
    return Capacitor.isPluginAvailable('Camera');
  },

  /**
   * Check if geolocation is available
   */
  hasGeolocation: (): boolean => {
    return Capacitor.isPluginAvailable('Geolocation');
  },

  /**
   * Check if filesystem is available
   */
  hasFilesystem: (): boolean => {
    return Capacitor.isPluginAvailable('Filesystem');
  },

  /**
   * Check if push notifications are available
   */
  hasPushNotifications: (): boolean => {
    return Capacitor.isPluginAvailable('PushNotifications');
  },

  /**
   * Check if local notifications are available
   */
  hasLocalNotifications: (): boolean => {
    return Capacitor.isPluginAvailable('LocalNotifications');
  },

  /**
   * Get safe area insets for notched devices
   */
  getSafeAreaInsets: () => {
    if (platform.isIOS) {
      return {
        top: 'env(safe-area-inset-top)',
        right: 'env(safe-area-inset-right)',
        bottom: 'env(safe-area-inset-bottom)',
        left: 'env(safe-area-inset-left)',
      };
    }
    return {
      top: '0px',
      right: '0px',
      bottom: '0px',
      left: '0px',
    };
  },
};
