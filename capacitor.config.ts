import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.builddesk.app',
  appName: 'BuildDesk',
  webDir: 'dist-mobile',
  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor',
    hostname: 'localhost',
    // Allow navigation to Supabase auth and OAuth callback domains
    allowNavigation: [
      'api.build-desk.com',
      '*.build-desk.com',
      '*.supabase.co',
      'accounts.google.com',
      'appleid.apple.com',
    ],
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
    Geolocation: {},
    BiometricAuth: {
      faceIDReason: 'BuildDesk uses Face ID for secure, quick access to your account',
      title: 'BuildDesk Authentication',
      subtitle: 'Log in with your biometric',
      description: 'Use your fingerprint or face to securely access BuildDesk',
      negativeButtonText: 'Use Password',
      allowDeviceCredential: true,
      confirmationRequired: true,
    },
    Preferences: {},
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    backgroundColor: '#ffffff',
    includePlugins: [
      '@capacitor/camera',
      '@capacitor/geolocation',
      '@capacitor/push-notifications',
      '@capacitor/local-notifications',
      '@capacitor/preferences',
      '@capacitor/network',
    ],
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#ffffff',
    preferredContentMode: 'mobile',
    scrollEnabled: true,
    // Enable WebView debugging in development builds
    webContentsDebuggingEnabled: true,
  },
};

export default config;
