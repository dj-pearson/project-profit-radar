import type { CapacitorConfig } from '@capacitor/cli';

// Capacitor configs are evaluated at build time. NODE_ENV is set by the
// enclosing mobile build command (npm run build / vite build --mode production).
const isProduction = process.env.NODE_ENV === 'production';

const config: CapacitorConfig = {
  appId: 'com.brikly.app',
  appName: 'Brikly',
  webDir: 'dist-mobile',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    hostname: 'app.brikly.net',
    // Allow navigation to our own self-hosted Supabase (api/functions.brikly.net)
    // and the two OAuth providers we use. We intentionally do NOT allow *.supabase.co
    // — our Supabase is self-hosted on api.brikly.net, so that wildcard would only
    // grant navigation to unrelated Supabase projects.
    allowNavigation: [
      'api.brikly.net',
      'app.brikly.net',
      'functions.brikly.net',
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
    // Only allow remote Safari Web Inspector in non-production builds.
    // In production this must stay false — it's a reverse-engineering vector
    // and a policy check during App Store review.
    webContentsDebuggingEnabled: !isProduction,
    // Restrict WebView navigation to app-bound domains (requires WKAppBoundDomains in Info.plist)
    limitsNavigationsToAppBoundDomains: true,
  },
};

export default config;
