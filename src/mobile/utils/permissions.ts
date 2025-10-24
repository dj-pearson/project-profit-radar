import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import * as Notifications from 'expo-notifications';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Contacts from 'expo-contacts';
import * as Calendar from 'expo-calendar';
import { Alert, Platform } from 'react-native';

export interface PermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: string;
}

export interface AppPermissions {
  camera: PermissionStatus;
  location: PermissionStatus;
  mediaLibrary: PermissionStatus;
  notifications: PermissionStatus;
  biometric: PermissionStatus;
  contacts: PermissionStatus;
  calendar: PermissionStatus;
}

class PermissionManager {
  async requestCameraPermission(): Promise<PermissionStatus> {
    try {
      const { status, canAskAgain } = await Camera.requestCameraPermissionsAsync();
      return {
        granted: status === 'granted',
        canAskAgain,
        status
      };
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return { granted: false, canAskAgain: false, status: 'error' };
    }
  }

  async requestLocationPermission(): Promise<PermissionStatus> {
    try {
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      return {
        granted: status === 'granted',
        canAskAgain,
        status
      };
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return { granted: false, canAskAgain: false, status: 'error' };
    }
  }

  async requestBackgroundLocationPermission(): Promise<PermissionStatus> {
    try {
      const { status, canAskAgain } = await Location.requestBackgroundPermissionsAsync();
      return {
        granted: status === 'granted',
        canAskAgain,
        status
      };
    } catch (error) {
      console.error('Error requesting background location permission:', error);
      return { granted: false, canAskAgain: false, status: 'error' };
    }
  }

  async requestMediaLibraryPermission(): Promise<PermissionStatus> {
    try {
      const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync();
      return {
        granted: status === 'granted',
        canAskAgain,
        status
      };
    } catch (error) {
      console.error('Error requesting media library permission:', error);
      return { granted: false, canAskAgain: false, status: 'error' };
    }
  }

  async requestNotificationPermission(): Promise<PermissionStatus> {
    try {
      const { status, canAskAgain } = await Notifications.requestPermissionsAsync();
      return {
        granted: status === 'granted',
        canAskAgain,
        status
      };
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return { granted: false, canAskAgain: false, status: 'error' };
    }
  }

  async checkBiometricSupport(): Promise<PermissionStatus> {
    try {
      const isAvailable = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      return {
        granted: isAvailable && isEnrolled,
        canAskAgain: true,
        status: isAvailable && isEnrolled ? 'granted' : 'unavailable'
      };
    } catch (error) {
      console.error('Error checking biometric support:', error);
      return { granted: false, canAskAgain: false, status: 'error' };
    }
  }

  async requestContactsPermission(): Promise<PermissionStatus> {
    try {
      const { status, canAskAgain } = await Contacts.requestPermissionsAsync();
      return {
        granted: status === 'granted',
        canAskAgain,
        status
      };
    } catch (error) {
      console.error('Error requesting contacts permission:', error);
      return { granted: false, canAskAgain: false, status: 'error' };
    }
  }

  async requestCalendarPermission(): Promise<PermissionStatus> {
    try {
      const { status, canAskAgain } = await Calendar.requestCalendarPermissionsAsync();
      return {
        granted: status === 'granted',
        canAskAgain,
        status
      };
    } catch (error) {
      console.error('Error requesting calendar permission:', error);
      return { granted: false, canAskAgain: false, status: 'error' };
    }
  }

  async checkAllPermissions(): Promise<AppPermissions> {
    const [
      camera,
      location,
      mediaLibrary,
      notifications,
      biometric,
      contacts,
      calendar
    ] = await Promise.all([
      this.getCameraPermissionStatus(),
      this.getLocationPermissionStatus(),
      this.getMediaLibraryPermissionStatus(),
      this.getNotificationPermissionStatus(),
      this.checkBiometricSupport(),
      this.getContactsPermissionStatus(),
      this.getCalendarPermissionStatus()
    ]);

    return {
      camera,
      location,
      mediaLibrary,
      notifications,
      biometric,
      contacts,
      calendar
    };
  }

  async getCameraPermissionStatus(): Promise<PermissionStatus> {
    try {
      const { status, canAskAgain } = await Camera.getCameraPermissionsAsync();
      return {
        granted: status === 'granted',
        canAskAgain,
        status
      };
    } catch (error) {
      console.error('Error getting camera permission status:', error);
      return { granted: false, canAskAgain: false, status: 'error' };
    }
  }

  async getLocationPermissionStatus(): Promise<PermissionStatus> {
    try {
      const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
      return {
        granted: status === 'granted',
        canAskAgain,
        status
      };
    } catch (error) {
      console.error('Error getting location permission status:', error);
      return { granted: false, canAskAgain: false, status: 'error' };
    }
  }

  async getMediaLibraryPermissionStatus(): Promise<PermissionStatus> {
    try {
      const { status, canAskAgain } = await MediaLibrary.getPermissionsAsync();
      return {
        granted: status === 'granted',
        canAskAgain,
        status
      };
    } catch (error) {
      console.error('Error getting media library permission status:', error);
      return { granted: false, canAskAgain: false, status: 'error' };
    }
  }

  async getNotificationPermissionStatus(): Promise<PermissionStatus> {
    try {
      const { status, canAskAgain } = await Notifications.getPermissionsAsync();
      return {
        granted: status === 'granted',
        canAskAgain,
        status
      };
    } catch (error) {
      console.error('Error getting notification permission status:', error);
      return { granted: false, canAskAgain: false, status: 'error' };
    }
  }

  async getContactsPermissionStatus(): Promise<PermissionStatus> {
    try {
      const { status, canAskAgain } = await Contacts.getPermissionsAsync();
      return {
        granted: status === 'granted',
        canAskAgain,
        status
      };
    } catch (error) {
      console.error('Error getting contacts permission status:', error);
      return { granted: false, canAskAgain: false, status: 'error' };
    }
  }

  async getCalendarPermissionStatus(): Promise<PermissionStatus> {
    try {
      const { status, canAskAgain } = await Calendar.getCalendarPermissionsAsync();
      return {
        granted: status === 'granted',
        canAskAgain,
        status
      };
    } catch (error) {
      console.error('Error getting calendar permission status:', error);
      return { granted: false, canAskAgain: false, status: 'error' };
    }
  }

  async requestAllPermissions(): Promise<AppPermissions> {
    const permissions = await this.checkAllPermissions();
    const requests: Promise<PermissionStatus>[] = [];

    if (!permissions.camera.granted && permissions.camera.canAskAgain) {
      requests.push(this.requestCameraPermission());
    }
    if (!permissions.location.granted && permissions.location.canAskAgain) {
      requests.push(this.requestLocationPermission());
    }
    if (!permissions.mediaLibrary.granted && permissions.mediaLibrary.canAskAgain) {
      requests.push(this.requestMediaLibraryPermission());
    }
    if (!permissions.notifications.granted && permissions.notifications.canAskAgain) {
      requests.push(this.requestNotificationPermission());
    }
    if (!permissions.contacts.granted && permissions.contacts.canAskAgain) {
      requests.push(this.requestContactsPermission());
    }
    if (!permissions.calendar.granted && permissions.calendar.canAskAgain) {
      requests.push(this.requestCalendarPermission());
    }

    if (requests.length > 0) {
      await Promise.all(requests);
      return this.checkAllPermissions();
    }

    return permissions;
  }

  showPermissionAlert(permissionName: string, onOpenSettings?: () => void) {
    Alert.alert(
      `${permissionName} Permission Required`,
      `BuildDesk needs ${permissionName.toLowerCase()} permission to provide the best experience. Please enable it in your device settings.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Open Settings',
          onPress: onOpenSettings || (() => {
            if (Platform.OS === 'ios') {
              // iOS settings URL
              // Linking.openURL('app-settings:');
            } else {
              // Android settings intent
              // IntentLauncher.startActivityAsync(IntentLauncher.ACTION_APPLICATION_SETTINGS);
            }
          })
        }
      ]
    );
  }
}

export const permissionManager = new PermissionManager();
