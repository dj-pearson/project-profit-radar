export default {
  expo: {
    name: "BuildDesk",
    slug: "build-desk-2rirxbgg70kpf2ce6py3e",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./public/icon-512x512.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./public/splash-screen.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.builddesk.app",
      buildNumber: "1.0.0",
      infoPlist: {
        NSCameraUsageDescription: "BuildDesk uses the camera to capture photos of construction sites, materials, and project progress for documentation and reporting.",
        NSPhotoLibraryUsageDescription: "BuildDesk accesses your photo library to select and attach images to projects, daily reports, and material documentation.",
        NSLocationWhenInUseUsageDescription: "BuildDesk uses your location to automatically track job site visits, log field work hours, and provide location-based project management features.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "BuildDesk uses location services to enable automatic job site check-ins, geofenced time tracking, and location-based project notifications.",
        NSMicrophoneUsageDescription: "BuildDesk uses the microphone to record voice notes for daily reports, project updates, and team communication.",
        NSContactsUsageDescription: "BuildDesk accesses your contacts to help you quickly add team members, clients, and subcontractors to your projects.",
        NSCalendarsUsageDescription: "BuildDesk integrates with your calendar to schedule project milestones, meetings, and important deadlines.",
        NSRemindersUsageDescription: "BuildDesk can create reminders for project tasks, safety inspections, and follow-up activities.",
        NSFaceIDUsageDescription: "BuildDesk uses Face ID for secure and convenient authentication to protect your project data.",
        NSLocalNetworkUsageDescription: "BuildDesk uses local network access to sync data with nearby devices and connect to project management systems on your network.",
        UIBackgroundModes: ["location", "background-fetch", "background-processing"],
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./public/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.builddesk.app",
      versionCode: 1,
      permissions: [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "READ_MEDIA_IMAGES",
        "READ_MEDIA_VIDEO",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "RECORD_AUDIO",
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "ACCESS_WIFI_STATE",
        "WAKE_LOCK",
        "VIBRATE",
        "USE_BIOMETRIC",
        "USE_FINGERPRINT",
        "READ_CONTACTS",
        "READ_CALENDAR",
        "WRITE_CALENDAR",
        "FOREGROUND_SERVICE",
        "FOREGROUND_SERVICE_LOCATION",
        "POST_NOTIFICATIONS"
      ],
      blockedPermissions: [
        "CALL_PHONE",
        "SEND_SMS",
        "READ_SMS",
        "WRITE_SMS"
      ]
    },
    web: {
      favicon: "./public/favicon.ico",
      bundler: "metro"
    },
    plugins: [
      "expo-router",
      [
        "expo-camera",
        {
          cameraPermission: "BuildDesk uses the camera to capture photos of construction sites, materials, and project progress for documentation and reporting."
        }
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "BuildDesk uses location services to enable automatic job site check-ins, geofenced time tracking, and location-based project notifications.",
          locationWhenInUsePermission: "BuildDesk uses your location to automatically track job site visits, log field work hours, and provide location-based project management features.",
          isIosBackgroundLocationEnabled: true,
          isAndroidBackgroundLocationEnabled: true
        }
      ],
      [
        "expo-media-library",
        {
          photosPermission: "BuildDesk accesses your photo library to select and attach images to projects, daily reports, and material documentation.",
          savePhotosPermission: "BuildDesk saves project photos and documentation to your device for offline access and backup.",
          isAccessMediaLocationEnabled: true
        }
      ],
      [
        "expo-notifications",
        {
          icon: "./public/notification-icon.png",
          color: "#4A90E2",
          sounds: ["./public/notification-sound.wav"]
        }
      ],
      [
        "expo-local-authentication",
        {
          faceIDPermission: "BuildDesk uses Face ID for secure and convenient authentication to protect your project data."
        }
      ],
      [
        "expo-contacts",
        {
          contactsPermission: "BuildDesk accesses your contacts to help you quickly add team members, clients, and subcontractors to your projects."
        }
      ],
      [
        "expo-calendar",
        {
          calendarPermission: "BuildDesk integrates with your calendar to schedule project milestones, meetings, and important deadlines."
        }
      ],
      [
        "expo-background-fetch",
        {
          minimumInterval: 15
        }
      ],
      [
        "expo-task-manager"
      ]
    ],
    experiments: {
      typedRoutes: false
    },
    extra: {
      eas: {
        projectId: "e9733a8e-5df1-4d6e-9c1f-c13774542b16"
      }
    },
    owner: "djpearson"
  }
};
