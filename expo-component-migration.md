# Component Migration Guide: Capacitor to Expo

## Camera Integration Migration

### Before (Capacitor):
```typescript
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

const takePicture = async () => {
  const photo = await Camera.getPhoto({
    resultType: CameraResultType.Uri,
    source: CameraSource.Camera,
    quality: 90
  });
  
  return photo.webPath;
};
```

### After (Expo):
```typescript
import * as ImagePicker from 'expo-image-picker';

const takePicture = async () => {
  // Request permissions
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    alert('Camera permission required');
    return;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.9,
  });

  if (!result.canceled) {
    return result.assets[0].uri;
  }
};
```

---

## Geolocation Migration

### Before (Capacitor):
```typescript
import { Geolocation } from '@capacitor/geolocation';

const getCurrentPosition = async () => {
  const coordinates = await Geolocation.getCurrentPosition();
  return {
    latitude: coordinates.coords.latitude,
    longitude: coordinates.coords.longitude
  };
};
```

### After (Expo):
```typescript
import * as Location from 'expo-location';

const getCurrentPosition = async () => {
  // Request permissions
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    alert('Location permission required');
    return;
  }

  const location = await Location.getCurrentPositionAsync({});
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude
  };
};
```

---

## Push Notifications Migration

### Before (Capacitor):
```typescript
import { PushNotifications } from '@capacitor/push-notifications';

const setupPushNotifications = async () => {
  await PushNotifications.requestPermissions();
  await PushNotifications.register();
  
  PushNotifications.addListener('registration', (token) => {
    console.log('Push token:', token.value);
  });
};
```

### After (Expo):
```typescript
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const setupPushNotifications = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    alert('Notification permission required');
    return;
  }

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  });
  
  console.log('Push token:', token.data);
  return token.data;
};
```

---

## Local Notifications Migration

### Before (Capacitor):
```typescript
import { LocalNotifications } from '@capacitor/local-notifications';

const scheduleNotification = async (title: string, body: string) => {
  await LocalNotifications.schedule({
    notifications: [{
      title,
      body,
      id: 1,
      schedule: { at: new Date(Date.now() + 1000 * 5) }
    }]
  });
};
```

### After (Expo):
```typescript
import * as Notifications from 'expo-notifications';

const scheduleNotification = async (title: string, body: string) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
    },
    trigger: { seconds: 5 },
  });
};
```

---

## File System Migration

### Before (Capacitor):
```typescript
import { Filesystem, Directory } from '@capacitor/filesystem';

const saveFile = async (data: string, filename: string) => {
  await Filesystem.writeFile({
    path: filename,
    data: data,
    directory: Directory.Documents
  });
};
```

### After (Expo):
```typescript
import * as FileSystem from 'expo-file-system';

const saveFile = async (data: string, filename: string) => {
  const fileUri = FileSystem.documentDirectory + filename;
  await FileSystem.writeAsStringAsync(fileUri, data);
  return fileUri;
};
```

---

## Device Information Migration

### Before (Capacitor):
```typescript
import { Device } from '@capacitor/device';

const getDeviceInfo = async () => {
  const info = await Device.getInfo();
  return {
    platform: info.platform,
    model: info.model,
    operatingSystem: info.operatingSystem,
    osVersion: info.osVersion
  };
};
```

### After (Expo):
```typescript
import * as Device from 'expo-device';

const getDeviceInfo = () => {
  return {
    platform: Device.osName,
    model: Device.modelName,
    operatingSystem: Device.osName,
    osVersion: Device.osVersion
  };
};
```

---

## Storage/Preferences Migration

### Before (Capacitor):
```typescript
import { Preferences } from '@capacitor/preferences';

const setStorageItem = async (key: string, value: string) => {
  await Preferences.set({ key, value });
};

const getStorageItem = async (key: string) => {
  const { value } = await Preferences.get({ key });
  return value;
};
```

### After (Expo):
```typescript
import * as SecureStore from 'expo-secure-store';

const setStorageItem = async (key: string, value: string) => {
  await SecureStore.setItemAsync(key, value);
};

const getStorageItem = async (key: string) => {
  return await SecureStore.getItemAsync(key);
};
```

---

## Complete Migration Component Example

### BuildDesk Native Features Hook (Expo Version):

```typescript
// hooks/useBuildDeskNative.ts
import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system';
import * as Device from 'expo-device';

export const useBuildDeskNative = () => {
  const [permissions, setPermissions] = useState({
    camera: false,
    location: false,
    notifications: false
  });

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const cameraStatus = await ImagePicker.getCameraPermissionsAsync();
    const locationStatus = await Location.getForegroundPermissionsAsync();
    const notificationStatus = await Notifications.getPermissionsAsync();

    setPermissions({
      camera: cameraStatus.status === 'granted',
      location: locationStatus.status === 'granted',
      notifications: notificationStatus.status === 'granted'
    });
  };

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    setPermissions(prev => ({ ...prev, camera: status === 'granted' }));
    return status === 'granted';
  };

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setPermissions(prev => ({ ...prev, location: status === 'granted' }));
    return status === 'granted';
  };

  const requestNotificationPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setPermissions(prev => ({ ...prev, notifications: status === 'granted' }));
    return status === 'granted';
  };

  const capturePhoto = async () => {
    if (!permissions.camera) {
      const granted = await requestCameraPermission();
      if (!granted) return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    return result.canceled ? null : result.assets[0];
  };

  const getCurrentLocation = async () => {
    if (!permissions.location) {
      const granted = await requestLocationPermission();
      if (!granted) return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy
    };
  };

  const scheduleReminder = async (title: string, body: string, delayMinutes: number) => {
    if (!permissions.notifications) {
      const granted = await requestNotificationPermission();
      if (!granted) return false;
    }

    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: { seconds: delayMinutes * 60 },
    });

    return true;
  };

  const saveProjectPhoto = async (photoUri: string, projectId: string) => {
    const filename = `project_${projectId}_${Date.now()}.jpg`;
    const destination = FileSystem.documentDirectory + filename;
    
    await FileSystem.moveAsync({
      from: photoUri,
      to: destination
    });
    
    return destination;
  };

  const getDeviceInfo = () => ({
    platform: Device.osName,
    model: Device.modelName,
    osVersion: Device.osVersion,
    isDevice: Device.isDevice
  });

  return {
    permissions,
    capturePhoto,
    getCurrentLocation,
    scheduleReminder,
    saveProjectPhoto,
    getDeviceInfo,
    requestCameraPermission,
    requestLocationPermission,
    requestNotificationPermission
  };
};
```

### Usage in Components:

```typescript
// components/ProjectPhotoCapture.tsx
import React from 'react';
import { useBuildDeskNative } from '../hooks/useBuildDeskNative';

export const ProjectPhotoCapture = ({ projectId }: { projectId: string }) => {
  const { capturePhoto, saveProjectPhoto, permissions } = useBuildDeskNative();

  const handleCapturePhoto = async () => {
    const photo = await capturePhoto();
    if (photo) {
      const savedPath = await saveProjectPhoto(photo.uri, projectId);
      console.log('Photo saved:', savedPath);
    }
  };

  return (
    <button 
      onClick={handleCapturePhoto}
      disabled={!permissions.camera}
    >
      {permissions.camera ? 'Capture Photo' : 'Camera Permission Required'}
    </button>
  );
};
```

This migration maintains all your current functionality while leveraging Expo's more streamlined APIs and better App Store submission process. 