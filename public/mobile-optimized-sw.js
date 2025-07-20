// Mobile-optimized service worker for BuildDesk
const CACHE_NAME = 'builddesk-v1.3.0';
const STATIC_CACHE = 'builddesk-static-v1.3.0';
const DYNAMIC_CACHE = 'builddesk-dynamic-v1.3.0';

// Critical assets to cache immediately for mobile performance
const STATIC_ASSETS = [
  '/',
  '/auth',
  '/dashboard',
  '/BuildDeskLogo.png',
  '/manifest.json',
  '/offline.html'
];

// Cache strategies for different asset types
const CACHE_STRATEGIES = {
  // Images: Cache first with network fallback
  images: /\.(jpg|jpeg|png|gif|webp|svg|ico)$/,
  // CSS/JS: Network first with cache fallback
  assets: /\.(css|js)$/,
  // API: Network first with 5min cache
  api: /\/api\//,
  // Fonts: Cache first (long-term)
  fonts: /\.(woff|woff2|ttf|eot)$/
};

// Install event - cache critical assets
self.addEventListener('install', event => {
  console.log('[SW] Installing mobile-optimized service worker');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Caching critical assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch(err => {
        console.error('[SW] Failed to cache critical assets:', err);
      })
  );
  
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating mobile-optimized service worker');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => 
              !cacheName.includes('v1.3.0') && 
              (cacheName.includes('builddesk') || cacheName.includes('static') || cacheName.includes('dynamic'))
            )
            .map(cacheName => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Handle fetch events with optimized mobile strategies
self.addEventListener('fetch', event => {
  // Skip non-GET requests and chrome-extension requests
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension')) {
    return;
  }
  
  const url = new URL(event.request.url);
  
  // Handle different asset types with optimized strategies
  if (CACHE_STRATEGIES.fonts.test(url.pathname)) {
    // Fonts: Cache first (long-term storage)
    event.respondWith(handleCacheFirst(event.request, STATIC_CACHE));
  } else if (CACHE_STRATEGIES.images.test(url.pathname)) {
    // Images: Cache first with compression
    event.respondWith(handleImageCache(event.request));
  } else if (CACHE_STRATEGIES.assets.test(url.pathname)) {
    // CSS/JS: Network first with fast cache fallback
    event.respondWith(handleNetworkFirst(event.request, CACHE_NAME, 1000));
  } else if (CACHE_STRATEGIES.api.test(url.pathname)) {
    // API: Network first with timed cache
    event.respondWith(handleApiCache(event.request));
  } else if (url.origin === location.origin) {
    // Same-origin requests: Stale while revalidate
    event.respondWith(handleStaleWhileRevalidate(event.request));
  }
});

// Cache first strategy for static assets
async function handleCacheFirst(request, cacheName = CACHE_NAME) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.warn('Cache first failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

// Network first with timeout for critical assets
async function handleNetworkFirst(request, cacheName = CACHE_NAME, timeout = 2000) {
  const cache = await caches.open(cacheName);
  
  try {
    // Race network request against timeout
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
    ]);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Final fallback
    if (request.destination === 'document') {
      return cache.match('/offline.html') || new Response('Offline', { status: 503 });
    }
    return new Response('Offline', { status: 503 });
  }
}

// Optimized image caching with compression awareness
async function handleImageCache(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      // Only cache images up to 1MB to save space
      const contentLength = networkResponse.headers.get('content-length');
      if (!contentLength || parseInt(contentLength) < 1024 * 1024) {
        cache.put(request, networkResponse.clone());
      }
    }
    return networkResponse;
  } catch (error) {
    return new Response('Image not available', { status: 503 });
  }
}

// API caching with 5-minute TTL
async function handleApiCache(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  // Check if cached response is still fresh (5 minutes)
  if (cachedResponse) {
    const cachedTime = cachedResponse.headers.get('sw-cached-time');
    const isExpired = !cachedTime || (Date.now() - parseInt(cachedTime)) > 5 * 60 * 1000;
    
    if (!isExpired) {
      return cachedResponse;
    }
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cached-time', Date.now().toString());
      
      const modifiedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });
      
      cache.put(request, modifiedResponse);
    }
    return networkResponse;
  } catch (error) {
    return cachedResponse || new Response('API unavailable', { status: 503 });
  }
}

// Stale while revalidate for main content
async function handleStaleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // Start network request in background
  const networkResponsePromise = fetch(request)
    .then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);
  
  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Otherwise wait for network
  return networkResponsePromise || new Response('Offline', { status: 503 });
}

// Background sync for when connection is restored
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      console.log('[SW] Performing background sync')
    );
  }
});

// Optimized push notifications
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'BuildDesk', {
        body: data.body || 'You have a new notification',
        icon: '/BuildDeskLogo.png',
        badge: '/BuildDeskLogo.png',
        tag: 'builddesk-notification',
        requireInteraction: false, // Better for mobile UX
        renotify: true,
        actions: [
          {
            action: 'view',
            title: 'View'
          }
        ]
      })
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  }
});
