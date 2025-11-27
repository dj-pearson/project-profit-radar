// Service Worker for BuildDesk - Performance and SEO Optimization
// Auto-generated version: __BUILD_VERSION__
const BUILD_VERSION = '__BUILD_VERSION__';
const CACHE_NAME = `builddesk-v${BUILD_VERSION}`;
const STATIC_CACHE = `builddesk-static-v${BUILD_VERSION}`;
const DYNAMIC_CACHE = `builddesk-dynamic-v${BUILD_VERSION}`;
const API_CACHE = `builddesk-api-v${BUILD_VERSION}`;
const IMAGE_CACHE = `builddesk-images-v${BUILD_VERSION}`;

// Resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/BuildDeskLogo.png',
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
  console.log(`✅ Service Worker activated - BuildDesk v${BUILD_VERSION}`);
  
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

  // Handle navigation requests with stale-while-revalidate
  if (request.mode === 'navigate') {
    event.respondWith(staleWhileRevalidate(request));
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
    }
    return response;
  } catch (error) {
    // Return offline fallback if available
    return new Response('Offline', { status: 503 });
  }
}

// Network-first strategy for API calls
async function networkFirst(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

// Stale-while-revalidate for navigation
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cached = await cache.match(request);
  
  const networkPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => cached);

  return cached || networkPromise;
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
    icon: '/BuildDeskLogo.png',
    badge: '/badge.png',
    data: data.url,
    actions: [
      {
        action: 'open',
        title: 'Open BuildDesk'
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