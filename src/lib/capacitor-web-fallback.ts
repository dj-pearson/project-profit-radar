// Web fallback for Capacitor modules
// This file provides no-op implementations for Capacitor plugins when running in web browsers

// Types and interfaces
export interface Position {
  timestamp: number;
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number;
    altitudeAccuracy?: number;
    heading?: number;
    speed?: number;
  };
}

export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export interface ScheduleOptions {
  notifications: unknown[];
}

export interface PermissionStatus {
  receive: string;
}

// Capacitor Core
export const Capacitor = {
  isNativePlatform: () => false,
  getPlatform: () => "web" as const,
  isPluginAvailable: () => false,
  convertFileSrc: (filePath: string) => filePath,
};

// Filesystem constants
export const Directory = {
  Documents: "DOCUMENTS",
  Data: "DATA",
  Library: "LIBRARY",
  Cache: "CACHE",
  External: "EXTERNAL",
  ExternalStorage: "EXTERNAL_STORAGE",
} as const;

export const Encoding = {
  UTF8: "utf8",
  ASCII: "ascii",
  UTF16: "utf16",
} as const;

// Camera constants
export const CameraResultType = {
  Uri: "uri",
  Base64: "base64",
} as const;

export const CameraSource = {
  Prompt: "PROMPT",
  Camera: "CAMERA",
  Photos: "PHOTOS",
} as const;

// App Plugin
export const App = {
  addListener: () => ({ remove: () => {} }),
  removeAllListeners: () => Promise.resolve(),
  exitApp: () => Promise.resolve(),
  getInfo: () =>
    Promise.resolve({
      name: "BuildDesk",
      id: "com.builddesk.app",
      build: "1.0.0",
      version: "1.0.0",
    }),
  getState: () => Promise.resolve({ isActive: true }),
  minimizeApp: () => Promise.resolve(),
};

// Camera Plugin
export const Camera = {
  getPhoto: () => Promise.reject(new Error("Camera not available on web")),
  pickImages: () => Promise.reject(new Error("Camera not available on web")),
  pickLimitedLibraryPhotos: () =>
    Promise.reject(new Error("Camera not available on web")),
  getLimitedLibraryPhotos: () =>
    Promise.reject(new Error("Camera not available on web")),
  requestPermissions: () =>
    Promise.resolve({ camera: "granted", photos: "granted" }),
  checkPermissions: () =>
    Promise.resolve({ camera: "granted", photos: "granted" }),
};

// Device Plugin
export const Device = {
  getId: () => Promise.resolve({ identifier: "web-device" }),
  getInfo: () =>
    Promise.resolve({
      model: "Web Browser",
      platform: "web" as const,
      operatingSystem: "unknown",
      osVersion: "unknown",
      manufacturer: "unknown",
      isVirtual: false,
      webViewVersion: "unknown",
    }),
  getBatteryInfo: () =>
    Promise.resolve({
      batteryLevel: 1,
      isCharging: false,
    }),
  getLanguageCode: () =>
    Promise.resolve({
      value: navigator.language || "en",
    }),
};

// Filesystem Plugin
export const Filesystem = {
  readFile: () => Promise.reject(new Error("Filesystem not available on web")),
  writeFile: () => Promise.reject(new Error("Filesystem not available on web")),
  appendFile: () =>
    Promise.reject(new Error("Filesystem not available on web")),
  deleteFile: () =>
    Promise.reject(new Error("Filesystem not available on web")),
  mkdir: () => Promise.reject(new Error("Filesystem not available on web")),
  rmdir: () => Promise.reject(new Error("Filesystem not available on web")),
  readdir: () => Promise.reject(new Error("Filesystem not available on web")),
  getUri: () => Promise.reject(new Error("Filesystem not available on web")),
  stat: () => Promise.reject(new Error("Filesystem not available on web")),
  rename: () => Promise.reject(new Error("Filesystem not available on web")),
  copy: () => Promise.reject(new Error("Filesystem not available on web")),
  checkPermissions: () => Promise.resolve({ publicStorage: "granted" }),
  requestPermissions: () => Promise.resolve({ publicStorage: "granted" }),
};

// Geolocation Plugin
export const Geolocation = {
  getCurrentPosition: () =>
    Promise.reject(new Error("Geolocation requires user permission")),
  watchPosition: () =>
    Promise.reject(new Error("Geolocation requires user permission")),
  clearWatch: () => Promise.resolve(),
  checkPermissions: () =>
    Promise.resolve({ location: "prompt", coarseLocation: "prompt" }),
  requestPermissions: () =>
    Promise.resolve({ location: "granted", coarseLocation: "granted" }),
};

// Local Notifications Plugin
export const LocalNotifications = {
  schedule: () =>
    Promise.reject(new Error("Local notifications not available on web")),
  getPending: () => Promise.resolve({ notifications: [] }),
  registerActionTypes: () => Promise.resolve(),
  cancel: () => Promise.resolve(),
  areEnabled: () => Promise.resolve({ value: false }),
  checkPermissions: () => Promise.resolve({ display: "granted" }),
  requestPermissions: () => Promise.resolve({ display: "granted" }),
  addListener: () => ({ remove: () => {} }),
  removeAllListeners: () => Promise.resolve(),
};

// Preferences Plugin
export const Preferences = {
  configure: () => Promise.resolve(),
  get: () => Promise.resolve({ value: null }),
  set: () => Promise.resolve(),
  remove: () => Promise.resolve(),
  clear: () => Promise.resolve(),
  keys: () => Promise.resolve({ keys: [] }),
  migrate: () => Promise.resolve(),
  removeOld: () => Promise.resolve(),
};

// Push Notifications Plugin
export const PushNotifications = {
  register: () =>
    Promise.reject(new Error("Push notifications not available on web")),
  unregister: () => Promise.resolve(),
  getDeliveredNotifications: () => Promise.resolve({ notifications: [] }),
  removeDeliveredNotifications: () => Promise.resolve(),
  removeAllDeliveredNotifications: () => Promise.resolve(),
  createChannel: () => Promise.resolve(),
  deleteChannel: () => Promise.resolve(),
  listChannels: () => Promise.resolve({ channels: [] }),
  checkPermissions: () => Promise.resolve({ receive: "granted" }),
  requestPermissions: () => Promise.resolve({ receive: "granted" }),
  addListener: () => ({ remove: () => {} }),
  removeAllListeners: () => Promise.resolve(),
};

// Default exports for different import patterns
export default {
  Capacitor,
  App,
  Camera,
  Device,
  Filesystem,
  Geolocation,
  LocalNotifications,
  Preferences,
  PushNotifications,
};
