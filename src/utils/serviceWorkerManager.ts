/**
 * Service Worker Registration and Management
 * Handles SW lifecycle, updates, and communication
 */

import { logger } from '@/lib/logger';

export interface ServiceWorkerConfig {
  enabled: boolean;
  scope?: string;
  updateInterval?: number;
}

/**
 * Register service worker
 */
export const registerServiceWorker = async (config: ServiceWorkerConfig = { enabled: true }): Promise<ServiceWorkerRegistration | null> => {
  if (!config.enabled || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    logger.info('Service worker not supported or disabled');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: config.scope || '/',
    });

    logger.info('Service worker registered', { scope: registration.scope });

    // Check for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker available
            notifyUpdate();
          }
        });
      }
    });

    // Auto-check for updates
    if (config.updateInterval) {
      setInterval(() => {
        registration.update();
      }, config.updateInterval);
    }

    return registration;
  } catch (error) {
    logger.error('Service worker registration failed', error as Error);
    return null;
  }
};

/**
 * Unregister service worker
 */
export const unregisterServiceWorker = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const success = await registration.unregister();
    logger.info('Service worker unregistered', { success });
    return success;
  } catch (error) {
    logger.error('Service worker unregistration failed', error as Error);
    return false;
  }
};

/**
 * Update service worker
 */
export const updateServiceWorker = async (): Promise<void> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
    logger.info('Service worker update check complete');
  } catch (error) {
    logger.error('Service worker update failed', error as Error);
  }
};

/**
 * Clear all caches
 */
export const clearServiceWorkerCache = async (): Promise<void> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    if (registration.active) {
      registration.active.postMessage({ type: 'CLEAR_CACHE' });
      logger.info('Service worker cache clear requested');
    }

    // Also clear using Cache API
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      logger.info('All service worker caches cleared');
    }
  } catch (error) {
    logger.error('Service worker cache clear failed', error as Error);
  }
};

/**
 * Notify about service worker update
 */
const notifyUpdate = (): void => {
  logger.info('Service worker: New version available');

  // Dispatch custom event for app to handle
  window.dispatchEvent(new CustomEvent('sw-update-available', {
    detail: { message: 'A new version is available. Refresh to update.' }
  }));
};

/**
 * Skip waiting and activate new service worker
 */
export const skipWaitingAndActivate = async (): Promise<void> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Reload page after activation
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  } catch (error) {
    logger.error('Service worker skip waiting failed', error as Error);
  }
};

/**
 * Check if service worker is active
 */
export const isServiceWorkerActive = (): boolean => {
  return typeof window !== 'undefined' && 
         'serviceWorker' in navigator && 
         navigator.serviceWorker.controller !== null;
};

/**
 * Get cache size estimate
 */
export const getCacheSize = async (): Promise<{ usage: number; quota: number } | null> => {
  if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.estimate) {
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
    };
  } catch (error) {
    logger.error('Failed to get service worker cache size', error as Error);
    return null;
  }
};
