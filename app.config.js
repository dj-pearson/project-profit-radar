export default {
  expo: {
    name: "BuildDesk",
    slug: "build-desk-2rirxbgg70kpf2ce6py3e",
    version: "1.0.0",
    orientation: "portrait",
    updates: {
      enabled: false,
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    icon: "./public/android-chrome-512x512.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./public/BuildDeskLogo.png",
      resizeMode: "contain",
      backgroundColor: "#4A90E2",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.builddesk.app",
      buildNumber: "5",
      scheme: "builddesk",
      infoPlist: {
        NSCameraUsageDescription:
          "BuildDesk uses the camera to capture photos of construction sites, materials, and project progress for documentation and reporting.",
        NSPhotoLibraryUsageDescription:
          "BuildDesk accesses your photo library to select and attach images to projects, daily reports, and material documentation.",
        NSLocationWhenInUseUsageDescription:
          "BuildDesk uses your location to automatically track job site visits, log field work hours, and provide location-based project management features.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "BuildDesk uses location services to enable automatic job site check-ins, geofenced time tracking, and location-based project notifications.",
        NSMicrophoneUsageDescription:
          "BuildDesk uses the microphone to record voice notes for daily reports, project updates, and team communication.",
        NSContactsUsageDescription:
          "BuildDesk accesses your contacts to help you quickly add team members, clients, and subcontractors to your projects.",
        NSCalendarsUsageDescription:
          "BuildDesk integrates with your calendar to schedule project milestones, meetings, and important deadlines.",
        NSRemindersUsageDescription:
          "BuildDesk can create reminders for project tasks, safety inspections, and follow-up activities.",
        NSFaceIDUsageDescription:
          "BuildDesk uses Face ID for secure and convenient authentication to protect your project data.",
        NSLocalNetworkUsageDescription:
          "BuildDesk uses local network access to sync data with nearby devices and connect to project management systems on your network.",
        UIBackgroundModes: ["location", "fetch", "remote-notification"],
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./public/android-chrome-512x512.png",
        backgroundColor: "#4A90E2",
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
        "POST_NOTIFICATIONS",
      ],
      blockedPermissions: ["CALL_PHONE", "SEND_SMS", "READ_SMS", "WRITE_SMS"],
    },
    web: {
      favicon: "./public/favicon.ico",
      bundler: "metro",
    },
    plugins: [
      "expo-router",
      [
        "expo-camera",
        {
          cameraPermission:
            "BuildDesk uses the camera to capture photos of construction sites.",
        },
      ],
    ],
    experiments: {
      typedRoutes: false,
    },
    extra: {
      eas: {
        projectId: "e9733a8e-5df1-4d6e-9c1f-c13774542b16",
      },
    },
    owner: "djpearson",
  },
};
