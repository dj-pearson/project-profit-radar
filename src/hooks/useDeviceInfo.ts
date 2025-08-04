import { useState, useEffect } from 'react';

// Extend Window interface for Capacitor
declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform: () => boolean;
      Plugins?: {
        Device?: {
          getInfo: () => Promise<{
            platform?: string;
            model?: string;
            operatingSystem?: string;
            osVersion?: string;
          }>;
        };
      };
    };
  }
}

interface DeviceInfo {
  platform: string;
  model: string;
  operatingSystem: string;
  osVersion: string;
  isNative: boolean;
  memoryUsed?: number;
  diskFree?: number;
  diskTotal?: number;
  batteryLevel?: number;
  isCharging?: boolean;
  networkStatus: 'wifi' | 'cellular' | 'none' | 'unknown';
}

interface DeviceCapabilities {
  hasCamera: boolean;
  hasGeolocation: boolean;
  hasAccelerometer: boolean;
  hasGyroscope: boolean;
  hasCompass: boolean;
  hasHaptics: boolean;
  hasNotifications: boolean;
  hasBiometrics: boolean;
  isOnline: boolean;
  supportsOffline: boolean;
}

export const useDeviceInfo = () => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    platform: 'web',
    model: 'unknown',
    operatingSystem: 'unknown',
    osVersion: 'unknown',
    isNative: false,
    networkStatus: 'unknown'
  });

  const [capabilities, setCapabilities] = useState<DeviceCapabilities>({
    hasCamera: false,
    hasGeolocation: false,
    hasAccelerometer: false,
    hasGyroscope: false,
    hasCompass: false,
    hasHaptics: false,
    hasNotifications: false,
    hasBiometrics: false,
    isOnline: navigator.onLine,
    supportsOffline: 'serviceWorker' in navigator
  });

  useEffect(() => {
    const detectDeviceInfo = async () => {
      try {
        // Check if running in Capacitor (native app)
        const isCapacitor = window.Capacitor?.isNativePlatform() || false;
        
        if (isCapacitor && window.Capacitor?.Plugins?.Device) {
          // Native device info via Capacitor
          const deviceData = await window.Capacitor.Plugins.Device.getInfo();
          setDeviceInfo({
            platform: deviceData.platform || 'unknown',
            model: deviceData.model || 'unknown',
            operatingSystem: deviceData.operatingSystem || 'unknown',
            osVersion: deviceData.osVersion || 'unknown',
            isNative: true,
            networkStatus: navigator.onLine ? 'wifi' : 'none'
          });
        } else {
          // Web browser detection
          const userAgent = navigator.userAgent;
          let platform = 'web';
          let os = 'unknown';
          
          if (/Android/i.test(userAgent)) {
            platform = 'android';
            os = 'android';
          } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
            platform = 'ios';
            os = 'ios';
          } else if (/Windows/i.test(userAgent)) {
            os = 'windows';
          } else if (/Mac/i.test(userAgent)) {
            os = 'macos';
          } else if (/Linux/i.test(userAgent)) {
            os = 'linux';
          }
          
          setDeviceInfo({
            platform,
            model: 'web-browser',
            operatingSystem: os,
            osVersion: 'unknown',
            isNative: false,
            networkStatus: navigator.onLine ? 'wifi' : 'none'
          });
        }
      } catch (error) {
        console.error('Error detecting device info:', error);
      }
    };

    const detectCapabilities = () => {
      const caps: DeviceCapabilities = {
        hasCamera: !!(navigator.mediaDevices?.getUserMedia),
        hasGeolocation: 'geolocation' in navigator,
        hasAccelerometer: 'DeviceMotionEvent' in window,
        hasGyroscope: 'DeviceOrientationEvent' in window,
        hasCompass: 'DeviceOrientationEvent' in window,
        hasHaptics: 'vibrate' in navigator,
        hasNotifications: 'Notification' in window,
        hasBiometrics: false, // Would need specific detection
        isOnline: navigator.onLine,
        supportsOffline: 'serviceWorker' in navigator && 'caches' in window
      };
      
      setCapabilities(caps);
    };

    detectDeviceInfo();
    detectCapabilities();

    // Listen for network changes
    const handleOnline = () => {
      setCapabilities(prev => ({ ...prev, isOnline: true }));
      setDeviceInfo(prev => ({ ...prev, networkStatus: 'wifi' }));
    };

    const handleOffline = () => {
      setCapabilities(prev => ({ ...prev, isOnline: false }));
      setDeviceInfo(prev => ({ ...prev, networkStatus: 'none' }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerHapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (capabilities.hasHaptics) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [50]
      };
      navigator.vibrate(patterns[type]);
    }
  };

  const getStorageInfo = async () => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage || 0,
          available: estimate.quota || 0,
          usedPercentage: estimate.usage && estimate.quota 
            ? Math.round((estimate.usage / estimate.quota) * 100) 
            : 0
        };
      } catch (error) {
        console.error('Error getting storage info:', error);
      }
    }
    return null;
  };

  return {
    deviceInfo,
    capabilities,
    triggerHapticFeedback,
    getStorageInfo,
    isNative: deviceInfo.isNative,
    isMobile: deviceInfo.platform === 'android' || deviceInfo.platform === 'ios'
  };
};