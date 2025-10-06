# Week 4 Day 3: Progressive Web App (PWA) Setup

## PWA Manifest Configuration

### Web App Manifest
```json
// public/manifest.json
{
  "name": "BuildDesk - Construction Management",
  "short_name": "BuildDesk",
  "description": "Professional construction project management platform",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/desktop-1.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    },
    {
      "src": "/screenshots/mobile-1.png",
      "sizes": "750x1334",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ],
  "categories": ["business", "productivity"],
  "shortcuts": [
    {
      "name": "New Project",
      "short_name": "New",
      "description": "Create a new project",
      "url": "/projects/new",
      "icons": [{ "src": "/icons/new-project.png", "sizes": "96x96" }]
    },
    {
      "name": "Dashboard",
      "short_name": "Dashboard",
      "description": "View your dashboard",
      "url": "/dashboard",
      "icons": [{ "src": "/icons/dashboard.png", "sizes": "96x96" }]
    }
  ]
}
```

### HTML Meta Tags
```html
<!-- index.html -->
<head>
  <!-- PWA Meta Tags -->
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#3b82f6">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="BuildDesk">
  
  <!-- iOS Icons -->
  <link rel="apple-touch-icon" href="/icons/icon-152x152.png">
  <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180x180.png">
  <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-167x167.png">
  
  <!-- iOS Splash Screens -->
  <link rel="apple-touch-startup-image" href="/splash/launch-640x1136.png" 
        media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)">
  <link rel="apple-touch-startup-image" href="/splash/launch-750x1334.png" 
        media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)">
  <link rel="apple-touch-startup-image" href="/splash/launch-1242x2208.png" 
        media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)">
</head>
```

## Service Worker Implementation

### Basic Service Worker
```typescript
// public/sw.js
const CACHE_NAME = 'builddesk-v1';
const RUNTIME_CACHE = 'runtime-cache';

// Assets to cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME && name !== RUNTIME_CACHE)
            .map(name => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip Chrome extensions
  if (event.request.url.startsWith('chrome-extension://')) return;

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then(response => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(RUNTIME_CACHE)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
          });
      })
  );
});
```

### Service Worker Registration
```typescript
// src/lib/serviceWorker.ts
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('Service workers are not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('Service Worker registered:', registration);

    // Check for updates every hour
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker available
          showUpdateNotification();
        }
      });
    });

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

function showUpdateNotification() {
  // Show toast or prompt to update
  if (confirm('A new version is available. Reload to update?')) {
    window.location.reload();
  }
}

// Call this in your main app file
registerServiceWorker();
```

## Offline Functionality

### Offline Page
```html
<!-- public/offline.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline - BuildDesk</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-align: center;
      padding: 20px;
    }
    .container {
      max-width: 400px;
    }
    h1 {
      font-size: 2rem;
      margin-bottom: 1rem;
    }
    p {
      font-size: 1.1rem;
      opacity: 0.9;
      margin-bottom: 2rem;
    }
    button {
      background: white;
      color: #667eea;
      border: none;
      padding: 12px 32px;
      font-size: 1rem;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: transform 0.2s;
    }
    button:active {
      transform: scale(0.95);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>You're offline</h1>
    <p>It looks like you've lost your internet connection. Please check your connection and try again.</p>
    <button onclick="window.location.reload()">Try Again</button>
  </div>
</body>
</html>
```

### Offline Detection Hook
```typescript
// src/hooks/useOnlineStatus.ts
import { useState, useEffect } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// Usage in component
function App() {
  const isOnline = useOnlineStatus();

  return (
    <>
      {!isOnline && (
        <div className="bg-destructive text-destructive-foreground p-2 text-center">
          You are currently offline. Some features may be unavailable.
        </div>
      )}
      <YourApp />
    </>
  );
}
```

## Install Prompt

### Custom Install Prompt
```typescript
// src/hooks/useInstallPrompt.ts
import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = 
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  return {
    isInstallable,
    isInstalled,
    promptInstall,
  };
}
```

### Install Banner Component
```typescript
// src/components/pwa/InstallBanner.tsx
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { useState } from 'react';

export function InstallBanner() {
  const { isInstallable, promptInstall } = useInstallPrompt();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!isInstallable || isDismissed) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-background border rounded-lg shadow-lg p-4 z-50">
      <button
        onClick={() => setIsDismissed(true)}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted"
      >
        <X className="h-4 w-4" />
      </button>

      <h3 className="font-semibold mb-2">Install BuildDesk</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Install our app for quick access and a better experience
      </p>

      <div className="flex gap-2">
        <Button onClick={promptInstall} size="sm" className="flex-1">
          Install
        </Button>
        <Button 
          onClick={() => setIsDismissed(true)} 
          variant="outline" 
          size="sm"
        >
          Not now
        </Button>
      </div>
    </div>
  );
}
```

## Background Sync

### Background Sync for Offline Actions
```typescript
// Service worker with background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-actions') {
    event.waitUntil(syncOfflineActions());
  }
});

async function syncOfflineActions() {
  // Get offline actions from IndexedDB
  const actions = await getOfflineActions();

  for (const action of actions) {
    try {
      await fetch(action.url, {
        method: action.method,
        body: JSON.stringify(action.data),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Remove synced action
      await removeOfflineAction(action.id);
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }
}

// Register sync from client
async function queueOfflineAction(action) {
  // Save to IndexedDB
  await saveOfflineAction(action);

  // Register sync
  if ('sync' in registration) {
    await registration.sync.register('sync-offline-actions');
  }
}
```

## PWA Testing Checklist

### Installation Testing
- [ ] Manifest file validates (use Lighthouse)
- [ ] All icon sizes present (192x192, 512x512 minimum)
- [ ] Install prompt appears on eligible devices
- [ ] App installs successfully on Android
- [ ] App installs successfully on iOS (Add to Home Screen)
- [ ] Splash screen shows on launch
- [ ] App opens in standalone mode

### Offline Testing
- [ ] Service worker registers successfully
- [ ] Essential assets cached on first visit
- [ ] App loads while offline
- [ ] Offline page shows for unavailable content
- [ ] Online/offline status detected
- [ ] Offline actions queued for sync

### Performance Testing
- [ ] Lighthouse PWA score > 90
- [ ] All PWA criteria met
- [ ] Service worker updates properly
- [ ] Cache invalidation works
- [ ] No cache overflow issues

## Definition of Done

- ✅ Web app manifest configured
- ✅ All required icons generated
- ✅ Service worker registered
- ✅ Offline functionality implemented
- ✅ Install prompt created
- ✅ Offline detection implemented
- ✅ Update notification implemented
- ✅ Lighthouse PWA score > 90
- ✅ Tested on Android and iOS
- ✅ Background sync configured (optional)

## Next Steps: Week 4 Day 4
- Capacitor setup for native features
- Camera and file system access
- Push notifications
- Native device capabilities
