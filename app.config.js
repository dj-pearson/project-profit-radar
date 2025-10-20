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
        NSCameraUsageDescription: "This app uses the camera to take photos of construction sites and materials.",
        NSPhotoLibraryUsageDescription: "This app accesses your photo library to select images for projects and materials.",
        NSLocationWhenInUseUsageDescription: "This app uses location to track job sites and provide location-based features.",
        NSMicrophoneUsageDescription: "This app uses the microphone for voice notes and communication features."
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
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "RECORD_AUDIO"
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
          cameraPermission: "Allow BuildDesk to access your camera to take photos of construction sites and materials."
        }
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Allow BuildDesk to use your location to track job sites and provide location-based features."
        }
      ],
      [
        "expo-media-library",
        {
          photosPermission: "Allow BuildDesk to access your photos to select images for projects and materials.",
          savePhotosPermission: "Allow BuildDesk to save photos to your device.",
          isAccessMediaLocationEnabled: true
        }
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
