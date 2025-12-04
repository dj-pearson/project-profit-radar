import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.builddesk.app',
  appName: 'BuildDesk',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    // For development:
    // url: 'http://localhost:8080',
    // cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#488AFF',
      sound: 'beep.wav',
    },
    Camera: {
      permissionType: 'camera',
    },
    Geolocation: {
      // For background location tracking (if needed)
    },
    // Biometric auth configuration
    BiometricAuth: {
      // iOS Face ID usage description
      faceIDReason: 'BuildDesk uses Face ID for secure, quick access to your account',
      // Android biometric prompt settings
      title: 'BuildDesk Authentication',
      subtitle: 'Log in with your biometric',
      description: 'Use your fingerprint or face to securely access BuildDesk',
      negativeButtonText: 'Use Password',
      // Allow device credentials (PIN/Pattern) as fallback
      allowDeviceCredential: true,
      // Confirmation required for biometric (recommended)
      confirmationRequired: true,
    },
    Preferences: {
      // Encrypted storage for sensitive data
    },
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // Set to true for debugging
    backgroundColor: '#ffffff',
    // Android 11+ requires explicit backup rules
    includePlugins: [
      '@capacitor/camera',
      '@capacitor/geolocation',
      '@capacitor/push-notifications',
      '@capacitor/local-notifications',
      '@capacitor/preferences',
    ],
  },
  ios: {
    contentInset: 'automatic',
    limitsNavigationsToAppBoundDomains: true,
    backgroundColor: '#ffffff',
    preferredContentMode: 'mobile',
  },
};

export default config;
