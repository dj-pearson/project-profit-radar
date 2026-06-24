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

// registerPlugin — used by Capacitor plugin packages (e.g. @capacitor/status-bar)
// to register their native bridge. On web we return a no-op proxy so any
// method call resolves to undefined without throwing.
export function registerPlugin<T = unknown>(_name: string, _options?: unknown): T {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get: () => () => Promise.resolve(),
  };
  return new Proxy({}, handler) as unknown as T;
}

export class WebPlugin {
  addListener() {
    return Promise.resolve({ remove: () => Promise.resolve() });
  }
  removeAllListeners() {
    return Promise.resolve();
  }
}

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
      name: "Brikly",
      id: "com.brikly.app",
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

// Haptics Plugin
export const ImpactStyle = {
  Heavy: "HEAVY",
  Medium: "MEDIUM",
  Light: "LIGHT",
} as const;

export const NotificationType = {
  SUCCESS: "SUCCESS",
  WARNING: "WARNING",
  ERROR: "ERROR",
} as const;

function webVibrateFallback(pattern: number | number[]) {
  if (typeof navigator === "undefined") return;
  const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  if (typeof nav.vibrate === "function") {
    try {
      nav.vibrate(pattern);
    } catch {
      // Ignore
    }
  }
}

export const Haptics = {
  impact: (opts?: { style?: string }) => {
    const style = opts?.style ?? ImpactStyle.Medium;
    webVibrateFallback(style === ImpactStyle.Heavy ? 22 : style === ImpactStyle.Light ? 8 : 14);
    return Promise.resolve();
  },
  notification: (opts?: { type?: string }) => {
    const type = opts?.type ?? NotificationType.SUCCESS;
    webVibrateFallback(
      type === NotificationType.ERROR
        ? [20, 50, 20, 50, 20]
        : type === NotificationType.WARNING
        ? [14, 60, 14]
        : [10, 40, 18],
    );
    return Promise.resolve();
  },
  vibrate: (opts?: { duration?: number }) => {
    webVibrateFallback(opts?.duration ?? 20);
    return Promise.resolve();
  },
  selectionStart: () => {
    webVibrateFallback(6);
    return Promise.resolve();
  },
  selectionChanged: () => {
    webVibrateFallback(4);
    return Promise.resolve();
  },
  selectionEnd: () => Promise.resolve(),
};

// Status Bar Plugin (web fallback — real plugin used on native)
export const Style = {
  Dark: "DARK",
  Light: "LIGHT",
  Default: "DEFAULT",
} as const;

export const StatusBar = {
  setStyle: () => Promise.resolve(),
  setBackgroundColor: () => Promise.resolve(),
  setOverlaysWebView: () => Promise.resolve(),
  show: () => Promise.resolve(),
  hide: () => Promise.resolve(),
  getInfo: () =>
    Promise.resolve({
      visible: true,
      style: "DEFAULT",
      color: "#ffffff",
      overlays: false,
    }),
};

// Network Plugin
export const Network = {
  getStatus: () =>
    Promise.resolve({
      connected: typeof navigator !== "undefined" ? navigator.onLine : true,
      connectionType: "unknown" as const,
    }),
  addListener: () => Promise.resolve({ remove: () => {} }),
  removeAllListeners: () => Promise.resolve(),
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
