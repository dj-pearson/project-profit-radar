// Emergency cache clearing script
// Run this in the browser console to force clear cache and verify deployment

console.log("🚨 EMERGENCY CACHE CLEAR SCRIPT 🚨");
console.log("This script will force clear all cached data and reload the page");

// Clear all browser storage
if (typeof Storage !== "undefined") {
  localStorage.clear();
  sessionStorage.clear();
  console.log("✅ Cleared localStorage and sessionStorage");
}

// Clear IndexedDB
if (window.indexedDB) {
  indexedDB.databases().then((dbs) => {
    dbs.forEach((db) => {
      if (db.name) {
        indexedDB.deleteDatabase(db.name);
        console.log(`✅ Cleared IndexedDB: ${db.name}`);
      }
    });
  });
}

// Clear Service Worker cache
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister();
      console.log("✅ Unregistered service worker");
    });
  });
}

// Clear cache API
if ("caches" in window) {
  caches.keys().then((cacheNames) => {
    cacheNames.forEach((cacheName) => {
      caches.delete(cacheName);
      console.log(`✅ Cleared cache: ${cacheName}`);
    });
  });
}

// Add cache busting to current URL
const currentUrl = new URL(window.location.href);
currentUrl.searchParams.set("v", Date.now().toString());
currentUrl.searchParams.set("nocache", "true");

console.log("🔄 Forcing page reload with cache busting...");
console.log(
  '🔍 Look for "RouteGuard FIXED VERSION" in the console to verify deployment'
);

// Force reload with cache busting
setTimeout(() => {
  window.location.href = currentUrl.toString();
}, 1000);
