import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.brikly.app',
  appName: 'Brikly',
  webDir: 'dist-mobile',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    hostname: 'app.brikly.net',
    // Allow navigation to Supabase auth and OAuth callback domains
    allowNavigation: [
      'api.brikly.net',
      'app.brikly.net',
      'functions.brikly.net',
      '*.brikly.net',
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
      faceIDReason: 'Brikly uses Face ID for secure, quick access to your account',
      title: 'Brikly Authentication',
      subtitle: 'Log in with your biometric',
      description: 'Use your fingerprint or face to securely access Brikly',
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
    // Restrict WebView navigation to app-bound domains (requires WKAppBoundDomains in Info.plist)
    limitsNavigationsToAppBoundDomains: true,
  },
};

export default config;
