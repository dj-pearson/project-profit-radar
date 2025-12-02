/**
 * Route Memory Utility
 * Stores and retrieves the user's intended destination for seamless auth redirects
 */

const ROUTE_MEMORY_KEY = 'bd.auth.returnTo';
const ROUTE_MEMORY_TIMESTAMP_KEY = 'bd.auth.returnTo.timestamp';
const ROUTE_MEMORY_TTL = 10 * 60 * 1000; // 10 minutes

export interface StoredRoute {
  path: string;
  search: string;
  hash: string;
  fullUrl: string;
  timestamp: number;
}

/**
 * Check if a route should be remembered (not public/auth routes)
 */
export function shouldRememberRoute(pathname: string): boolean {
  const publicRoutes = [
    '/',
    '/auth',
    '/login',
    '/pricing',
    '/features',
    '/blog',
    '/faq',
    '/solutions',
    '/accessibility',
    '/resources',
    '/tools',
  ];

  // Don't remember public routes or marketing pages
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return false;
  }

  // Don't remember password reset pages
  if (pathname.includes('/reset-password')) {
    return false;
  }

  return true;
}

/**
 * Store the current route for later retrieval
 */
export function rememberCurrentRoute(location: { pathname: string; search: string; hash: string }): void {
  if (!shouldRememberRoute(location.pathname)) {
    return;
  }

  const routeData: StoredRoute = {
    path: location.pathname,
    search: location.search,
    hash: location.hash,
    fullUrl: `${location.pathname}${location.search}${location.hash}`,
    timestamp: Date.now(),
  };

  try {
    sessionStorage.setItem(ROUTE_MEMORY_KEY, JSON.stringify(routeData));
    sessionStorage.setItem(ROUTE_MEMORY_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.warn('Failed to remember route:', error);
  }
}

/**
 * Get the remembered route if it exists and hasn't expired
 */
export function getRememberedRoute(): string | null {
  try {
    const stored = sessionStorage.getItem(ROUTE_MEMORY_KEY);
    const timestamp = sessionStorage.getItem(ROUTE_MEMORY_TIMESTAMP_KEY);

    if (!stored || !timestamp) {
      return null;
    }

    // Check if route memory has expired
    const age = Date.now() - parseInt(timestamp, 10);
    if (age > ROUTE_MEMORY_TTL) {
      clearRememberedRoute();
      return null;
    }

    const routeData: StoredRoute = JSON.parse(stored);
    return routeData.fullUrl;
  } catch (error) {
    console.warn('Failed to retrieve remembered route:', error);
    return null;
  }
}

/**
 * Clear the remembered route
 */
export function clearRememberedRoute(): void {
  try {
    sessionStorage.removeItem(ROUTE_MEMORY_KEY);
    sessionStorage.removeItem(ROUTE_MEMORY_TIMESTAMP_KEY);
  } catch (error) {
    console.warn('Failed to clear remembered route:', error);
  }
}

/**
 * Get the return URL from query parameters or remembered route
 */
export function getReturnUrl(searchParams: URLSearchParams, defaultUrl: string = '/dashboard'): string {
  // First, check for explicit returnTo query parameter
  const returnTo = searchParams.get('returnTo');
  if (returnTo && shouldRememberRoute(returnTo)) {
    return returnTo;
  }

  // Then check remembered route
  const rememberedRoute = getRememberedRoute();
  if (rememberedRoute) {
    return rememberedRoute;
  }

  // Finally, use default
  return defaultUrl;
}
