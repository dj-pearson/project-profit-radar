# Week 4 Day 4: Capacitor & Native Features

## Capacitor Setup

### Installation
```bash
# Install Capacitor
npm install @capacitor/core @capacitor/cli

# Initialize Capacitor
npx cap init

# Add platforms
npx cap add ios
npx cap add android
```

### Capacitor Configuration
```typescript
// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.builddesk.app',
  appName: 'BuildDesk',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // For development with hot reload
    // url: 'http://192.168.1.100:5173',
    // cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#3b82f6',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#3b82f6',
    },
  },
};

export default config;
```

## Camera Access

### Camera Plugin Setup
```bash
npm install @capacitor/camera
npx cap sync
```

### Camera Hook Implementation
```typescript
// src/hooks/useCamera.ts
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { useState } from 'react';

export function useCamera() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const takePicture = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
      });

      return photo.webPath;
    } catch (err) {
      setError('Failed to take picture');
      console.error('Camera error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const selectFromGallery = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
      });

      return photo.webPath;
    } catch (err) {
      setError('Failed to select photo');
      console.error('Gallery error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    takePicture,
    selectFromGallery,
    isLoading,
    error,
  };
}
```

### Camera Component
```typescript
// src/components/native/CameraButton.tsx
import { Camera, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCamera } from '@/hooks/useCamera';
import { useState } from 'react';

export function CameraButton({ onCapture }: { onCapture: (url: string) => void }) {
  const { takePicture, selectFromGallery, isLoading } = useCamera();
  const [preview, setPreview] = useState<string | null>(null);

  const handleTakePhoto = async () => {
    const photo = await takePicture();
    if (photo) {
      setPreview(photo);
      onCapture(photo);
    }
  };

  const handleSelectPhoto = async () => {
    const photo = await selectFromGallery();
    if (photo) {
      setPreview(photo);
      onCapture(photo);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          onClick={handleTakePhoto}
          disabled={isLoading}
          className="flex-1"
        >
          <Camera className="h-4 w-4 mr-2" />
          Take Photo
        </Button>
        <Button
          onClick={handleSelectPhoto}
          disabled={isLoading}
          variant="outline"
          className="flex-1"
        >
          <Image className="h-4 w-4 mr-2" />
          Gallery
        </Button>
      </div>

      {preview && (
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>
  );
}
```

## Filesystem Access

### Filesystem Plugin
```bash
npm install @capacitor/filesystem
npx cap sync
```

### Filesystem Hook
```typescript
// src/hooks/useFilesystem.ts
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { useState } from 'react';

export function useFilesystem() {
  const [isLoading, setIsLoading] = useState(false);

  const saveFile = async (fileName: string, data: string) => {
    try {
      setIsLoading(true);

      await Filesystem.writeFile({
        path: fileName,
        data: data,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });

      return true;
    } catch (error) {
      console.error('Error saving file:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const readFile = async (fileName: string) => {
    try {
      setIsLoading(true);

      const result = await Filesystem.readFile({
        path: fileName,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });

      return result.data as string;
    } catch (error) {
      console.error('Error reading file:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteFile = async (fileName: string) => {
    try {
      setIsLoading(true);

      await Filesystem.deleteFile({
        path: fileName,
        directory: Directory.Documents,
      });

      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const listFiles = async () => {
    try {
      setIsLoading(true);

      const result = await Filesystem.readdir({
        path: '',
        directory: Directory.Documents,
      });

      return result.files;
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  return {
    saveFile,
    readFile,
    deleteFile,
    listFiles,
    isLoading,
  };
}
```

## Push Notifications

### Push Notifications Setup
```bash
npm install @capacitor/push-notifications
npx cap sync
```

### Push Notifications Hook
```typescript
// src/hooks/usePushNotifications.ts
import { useEffect, useState } from 'react';
import {
  PushNotifications,
  Token,
  PushNotificationSchema,
  ActionPerformed,
} from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export function usePushNotifications() {
  const [token, setToken] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      console.log('Push notifications only available on mobile');
      return;
    }

    // Request permission
    PushNotifications.requestPermissions().then((result) => {
      if (result.receive === 'granted') {
        PushNotifications.register();
      }
    });

    // On registration
    PushNotifications.addListener('registration', (token: Token) => {
      console.log('Push registration success, token:', token.value);
      setToken(token.value);
      setIsRegistered(true);
    });

    // On registration error
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Error on registration:', error);
    });

    // On notification received
    PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('Push received:', notification);
      }
    );

    // On notification action
    PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (notification: ActionPerformed) => {
        console.log('Push action performed:', notification);
      }
    );

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, []);

  return {
    token,
    isRegistered,
  };
}
```

## Local Notifications

### Local Notifications Setup
```bash
npm install @capacitor/local-notifications
npx cap sync
```

### Local Notifications Hook
```typescript
// src/hooks/useLocalNotifications.ts
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export function useLocalNotifications() {
  const scheduleNotification = async (
    title: string,
    body: string,
    delay?: number
  ) => {
    if (!Capacitor.isNativePlatform()) {
      console.log('Local notifications only available on mobile');
      return;
    }

    // Request permission
    const permission = await LocalNotifications.requestPermissions();
    if (permission.display !== 'granted') {
      console.log('Notification permission not granted');
      return;
    }

    // Schedule notification
    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id: Date.now(),
          schedule: delay
            ? { at: new Date(Date.now() + delay) }
            : undefined,
          sound: undefined,
          attachments: undefined,
          actionTypeId: '',
          extra: null,
        },
      ],
    });
  };

  const cancelAllNotifications = async () => {
    await LocalNotifications.cancel({
      notifications: await LocalNotifications.getPending(),
    });
  };

  return {
    scheduleNotification,
    cancelAllNotifications,
  };
}
```

## Geolocation

### Geolocation Plugin
```bash
npm install @capacitor/geolocation
npx cap sync
```

### Geolocation Hook
```typescript
// src/hooks/useGeolocation.ts
import { Geolocation, Position } from '@capacitor/geolocation';
import { useState } from 'react';

export function useGeolocation() {
  const [position, setPosition] = useState<Position | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentPosition = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });

      setPosition(coordinates);
      return coordinates;
    } catch (err) {
      setError('Failed to get location');
      console.error('Geolocation error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const watchPosition = (callback: (position: Position) => void) => {
    const watchId = Geolocation.watchPosition(
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
      (position, err) => {
        if (err) {
          setError('Failed to watch location');
          return;
        }
        if (position) {
          setPosition(position);
          callback(position);
        }
      }
    );

    return watchId;
  };

  const clearWatch = async (watchId: string) => {
    await Geolocation.clearWatch({ id: watchId });
  };

  return {
    position,
    getCurrentPosition,
    watchPosition,
    clearWatch,
    isLoading,
    error,
  };
}
```

## Device Information

### Device Plugin
```bash
npm install @capacitor/device
npx cap sync
```

### Device Info Hook
```typescript
// src/hooks/useDeviceInfo.ts
import { Device, DeviceInfo } from '@capacitor/device';
import { useEffect, useState } from 'react';

export function useDeviceInfo() {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);

  useEffect(() => {
    Device.getInfo().then((info) => {
      setDeviceInfo(info);
      console.log('Device info:', info);
    });
  }, []);

  return deviceInfo;
}
```

## App State Management

### App Plugin
```bash
npm install @capacitor/app
npx cap sync
```

### App State Hook
```typescript
// src/hooks/useAppState.ts
import { useEffect, useState } from 'react';
import { App, AppState } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export function useAppState() {
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = App.addListener('appStateChange', (state: AppState) => {
      setIsActive(state.isActive);
      console.log('App state changed. Active:', state.isActive);
    });

    return () => {
      listener.remove();
    };
  }, []);

  return { isActive };
}
```

## Platform Detection

### Platform Utils
```typescript
// src/lib/platform.ts
import { Capacitor } from '@capacitor/core';

export const platform = {
  isNative: Capacitor.isNativePlatform(),
  isIOS: Capacitor.getPlatform() === 'ios',
  isAndroid: Capacitor.getPlatform() === 'android',
  isWeb: Capacitor.getPlatform() === 'web',
  
  // Check specific capabilities
  hasCamera: async () => {
    try {
      const { Camera } = await import('@capacitor/camera');
      return true;
    } catch {
      return false;
    }
  },

  hasGeolocation: async () => {
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      return true;
    } catch {
      return false;
    }
  },
};

// Usage
if (platform.isNative) {
  console.log('Running on native platform');
}

if (platform.isIOS) {
  console.log('Running on iOS');
}
```

## Testing on Devices

### Development Workflow
```bash
# 1. Build your web app
npm run build

# 2. Sync with native projects
npx cap sync

# 3. Open in IDE
npx cap open ios      # Opens Xcode
npx cap open android  # Opens Android Studio

# 4. Run on device/emulator from IDE
# iOS: Select device in Xcode and press Run
# Android: Select device in Android Studio and press Run
```

### Live Reload for Development
```typescript
// capacitor.config.ts (for development only)
const config: CapacitorConfig = {
  // ...other config
  server: {
    // Replace with your local IP
    url: 'http://192.168.1.100:5173',
    cleartext: true,
  },
};
```

## Capacitor Testing Checklist

### Camera & Media
- [ ] Camera access works on iOS and Android
- [ ] Gallery selection works
- [ ] Photo preview displays correctly
- [ ] Permissions requested properly
- [ ] Error handling for denied permissions

### Storage & Files
- [ ] Files save to device
- [ ] Files read from device
- [ ] File deletion works
- [ ] Directory listing works
- [ ] Proper error handling

### Notifications
- [ ] Push notification registration works
- [ ] Push notifications received
- [ ] Local notifications scheduled
- [ ] Notification actions trigger correctly
- [ ] Permissions handled properly

### Location
- [ ] Current position retrieved
- [ ] Position watching works
- [ ] High accuracy mode works
- [ ] Permissions requested correctly
- [ ] Error handling for denied permissions

### General
- [ ] App launches on iOS
- [ ] App launches on Android
- [ ] Splash screen displays
- [ ] App icons show correctly
- [ ] App name displays correctly
- [ ] Deep links work (if implemented)

## Definition of Done

- ✅ Capacitor configured and initialized
- ✅ iOS and Android projects added
- ✅ Camera functionality implemented
- ✅ File system access implemented
- ✅ Push notifications configured
- ✅ Local notifications implemented
- ✅ Geolocation implemented
- ✅ Platform detection utilities created
- ✅ Tested on iOS device/simulator
- ✅ Tested on Android device/emulator

## Next Steps: Week 4 Day 5
- Deployment and production build
- App store preparation (iOS & Android)
- Performance optimization for production
- Final testing and QA checklist
