// Service Worker for Brikly - Performance and SEO Optimization
// Auto-generated version: __BUILD_VERSION__
const BUILD_VERSION = '__BUILD_VERSION__';
const CACHE_NAME = `brikly-v${BUILD_VERSION}`;
const STATIC_CACHE = `brikly-static-v${BUILD_VERSION}`;
const DYNAMIC_CACHE = `brikly-dynamic-v${BUILD_VERSION}`;
const API_CACHE = `brikly-api-v${BUILD_VERSION}`;
const IMAGE_CACHE = `brikly-images-v${BUILD_VERSION}`;

// Resources to cache immediately
const STATIC_ASSETS = [
  '/index.html',
  '/manifest.json',
  '/BriklyLogo.png',
  '/robots.txt',
  '/sitemap.xml'
];

// Static file patterns for aggressive caching
const STATIC_PATTERNS = [
  /.*\.(?:js|css|woff2?|ttf|eot)$/,
  /\/assets\/.*/,
  /\/fonts\/.*/
];

// Image patterns for optimized caching
const IMAGE_PATTERNS = [
  /.*\.(?:png|jpg|jpeg|webp|avif|svg|ico|gif)$/
];

// API patterns for strategic caching
const API_PATTERNS = [
  /\/api\/blog/,
  /\/api\/knowledge-base/,
  /supabase\.co.*\/rest\/v1\/blog_posts/,
  /supabase\.co.*\/rest\/v1\/knowledge_base_articles/
];

// Cache size limits (LRU eviction when exceeded)
const CACHE_LIMITS = {
  static: 50,
  dynamic: 30,
  api: 30,
  images: 20,
  navigation: 10
};

// Resources to cache on first request
const DYNAMIC_ASSETS = [
  '/features',
  '/pricing',
  '/procore-alternative',
  '/buildertrend-alternative',
  '/resources',
  '/knowledge-base'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      }),
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log(`✅ Service Worker activated - Brikly v${BUILD_VERSION}`);
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            const validCaches = [STATIC_CACHE, DYNAMIC_CACHE, API_CACHE, IMAGE_CACHE];
            if (!validCaches.includes(cacheName)) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control immediately
      self.clients.claim()
    ])
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // Skip external/cross-origin requests (Unsplash, Google, etc.) - let browser handle them
  // This prevents CSP issues and service worker errors with external resources
  if (url.origin !== self.location.origin && 
      !url.hostname.includes('supabase') &&
      !url.hostname.includes('brikly.net')) {
    return;
  }

  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Handle static assets with cache-first strategy
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Handle navigation requests with network-first to avoid stale HTML/chunk mismatches
  if (request.mode === 'navigate') {
    event.respondWith(navigationNetworkFirst(request));
    return;
  }

  // Default to network-first for other requests
  event.respondWith(networkFirst(request));
});

// Cache-first strategy for static assets
async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      enforceLimit(STATIC_CACHE, CACHE_LIMITS.static);
    }
    return response;
  } catch (error) {
    console.warn('Service Worker: Failed to fetch static asset:', request.url, error);
    return new Response('Resource unavailable', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Network-first strategy for API calls
async function networkFirst(request) {
  const cache = await caches.open(DYNAMIC_CACHE);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      enforceLimit(DYNAMIC_CACHE, CACHE_LIMITS.dynamic);
    }
    return response;
  } catch (error) {
    console.warn('Service Worker: Network request failed, trying cache:', request.url, error);
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    // Return a proper error response instead of throwing
    return new Response(JSON.stringify({ error: 'Network request failed' }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Network-first for navigation to prioritize fresh HTML on each deployment.
// For SPA routing: if the server returns 404 for a client-side route,
// serve index.html so React Router can handle it.
async function navigationNetworkFirst(request) {
  try {
    const response = await fetch(request, { cache: 'no-store' });

    // If the server returned HTML successfully, use it
    if (response.ok) {
      return response;
    }

    // Server returned 404 for a client route - serve the app shell instead
    // so React Router can handle the routing client-side
    if (response.status === 404) {
      const cache = await caches.open(STATIC_CACHE);
      const appShell = await cache.match('/index.html');
      if (appShell) {
        return appShell;
      }
      // If no cached app shell, fetch index.html from network
      const freshShell = await fetch('/index.html', { cache: 'no-store' });
      if (freshShell.ok) {
        return freshShell;
      }
    }

    return response;
  } catch (error) {
    console.warn('Service Worker: Navigation request failed, trying offline fallback:', request.url, error);
    const cache = await caches.open(STATIC_CACHE);
    const appShell = await cache.match('/index.html');
    if (appShell) {
      return appShell;
    }

    return new Response(
      '<!doctype html><html><head><meta charset="utf-8"><title>Offline</title></head><body><h1>Offline</h1><p>Please reconnect and refresh.</p></body></html>',
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      }
    );
  }
}

// Enforce cache size limit using LRU eviction
async function enforceLimit(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    // Delete oldest entries (first in list = oldest)
    const excess = keys.length - maxEntries;
    for (let i = 0; i < excess; i++) {
      await cache.delete(keys[i]);
    }
  }
}

// Check if URL is a static asset
function isStaticAsset(pathname) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.webp', '.woff', '.woff2'];
  return staticExtensions.some(ext => pathname.endsWith(ext)) || 
         pathname.startsWith('/assets/') ||
         pathname.startsWith('/images/') ||
         pathname.startsWith('/fonts/');
}

// Background sync for analytics and form submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'analytics-sync') {
    event.waitUntil(syncAnalytics());
  } else if (event.tag === 'form-sync') {
    event.waitUntil(syncForms());
  }
});

// Sync offline analytics data
async function syncAnalytics() {
  try {
    const cache = await caches.open('analytics-cache');
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      const data = await response.json();
      
      // Send to analytics
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      await cache.delete(request);
    }
  } catch (error) {
    console.error('Analytics sync failed:', error);
  }
}

// Sync offline form submissions
async function syncForms() {
  try {
    const cache = await caches.open('forms-cache');
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      const formData = await response.formData();
      
      // Retry form submission
      await fetch(request.url, {
        method: 'POST',
        body: formData
      });
      
      await cache.delete(request);
    }
  } catch (error) {
    console.error('Form sync failed:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/BriklyLogo.png',
    badge: '/badge.png',
    data: data.url,
    actions: [
      {
        action: 'open',
        title: 'Open Brikly'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data || '/')
    );
  }
});

// Message handling for cache control
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            console.log('🗑️ Clearing cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }).then(() => {
        console.log('✅ All caches cleared');
      })
    );
  }
});