/**
 * Route Preloading Utilities
 * Intelligently preloads routes based on user behavior
 */

const preloadedRoutes = new Set<string>();

export const preloadRoute = async (routeImportFn: () => Promise<any>) => {
  if (preloadedRoutes.has(routeImportFn.toString())) {
    return;
  }
  
  preloadedRoutes.add(routeImportFn.toString());
  
  try {
    await routeImportFn();
  } catch (error) {
    console.warn('Route preload failed:', error);
  }
};

export const preloadOnHover = (importFn: () => Promise<any>) => {
  return () => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => preloadRoute(importFn));
    } else {
      setTimeout(() => preloadRoute(importFn), 100);
    }
  };
};

export const preloadOnVisible = (element: HTMLElement, importFn: () => Promise<any>) => {
  if (!('IntersectionObserver' in window)) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          preloadRoute(importFn);
          observer.disconnect();
        }
      });
    },
    { threshold: 0.1 }
  );

  observer.observe(element);
};
