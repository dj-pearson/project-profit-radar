/**
 * Centralized Session Configuration
 * SECURITY: All session timeout and management settings in one place
 */

export const SESSION_CONFIG = {
  /**
   * Inactivity timeout - time before session expires due to user inactivity
   * Default: 30 minutes
   */
  INACTIVITY_TIMEOUT_MS: 30 * 60 * 1000,

  /**
   * Session validity check interval - how often to validate session
   * Default: 5 minutes
   */
  SESSION_CHECK_INTERVAL_MS: 5 * 60 * 1000,

  /**
   * Maximum session duration - absolute time before requiring re-authentication
   * Default: 8 hours
   */
  MAX_SESSION_DURATION_MS: 8 * 60 * 60 * 1000,

  /**
   * Token refresh interval - how often to refresh JWT token
   * Default: 50 minutes (before 60min expiry)
   */
  TOKEN_REFRESH_INTERVAL_MS: 50 * 60 * 1000,

  /**
   * Session warning time - show warning before session expires
   * Default: 5 minutes before inactivity timeout
   */
  SESSION_WARNING_MS: 5 * 60 * 1000,

  /**
   * Profile fetch timeout - maximum time to wait for profile fetch
   * Default: 10 seconds
   */
  PROFILE_FETCH_TIMEOUT_MS: 10 * 1000,

  /**
   * Activity events to track for session refresh
   */
  ACTIVITY_EVENTS: [
    'mousedown',
    'mousemove',
    'keypress',
    'scroll',
    'touchstart',
    'click'
  ] as const,

  /**
   * Storage keys
   */
  STORAGE_KEYS: {
    USER_PROFILE_PREFIX: 'bd.userProfile.',
    AUTH_TOKEN_PREFIX: 'sb-builddesk-auth-token',
    SESSION_FINGERPRINT: 'bd.session.fingerprint',
    SESSION_START_TIME: 'bd.session.startTime',
  } as const,
} as const;

/**
 * Environment-specific overrides
 */
export const getSessionConfig = () => {
  const isDevelopment = import.meta.env.DEV;

  if (isDevelopment) {
    return {
      ...SESSION_CONFIG,
      // Longer timeouts in development for convenience
      INACTIVITY_TIMEOUT_MS: 60 * 60 * 1000, // 1 hour
      MAX_SESSION_DURATION_MS: 24 * 60 * 60 * 1000, // 24 hours
    };
  }

  return SESSION_CONFIG;
};

/**
 * Session timeout helpers
 */
export const sessionHelpers = {
  /**
   * Get time until inactivity timeout
   */
  getTimeUntilInactivityTimeout(lastActivity: number): number {
    const config = getSessionConfig();
    const elapsed = Date.now() - lastActivity;
    const remaining = config.INACTIVITY_TIMEOUT_MS - elapsed;
    return Math.max(0, remaining);
  },

  /**
   * Check if session should show warning
   */
  shouldShowSessionWarning(lastActivity: number): boolean {
    const config = getSessionConfig();
    const timeRemaining = this.getTimeUntilInactivityTimeout(lastActivity);
    return timeRemaining > 0 && timeRemaining <= config.SESSION_WARNING_MS;
  },

  /**
   * Check if session is expired
   */
  isSessionExpired(lastActivity: number): boolean {
    return this.getTimeUntilInactivityTimeout(lastActivity) === 0;
  },

  /**
   * Get session start time
   */
  getSessionStartTime(): number | null {
    try {
      const startTime = sessionStorage.getItem(SESSION_CONFIG.STORAGE_KEYS.SESSION_START_TIME);
      return startTime ? parseInt(startTime, 10) : null;
    } catch {
      return null;
    }
  },

  /**
   * Set session start time
   */
  setSessionStartTime(time: number = Date.now()): void {
    try {
      sessionStorage.setItem(SESSION_CONFIG.STORAGE_KEYS.SESSION_START_TIME, time.toString());
    } catch (error) {
      console.error('Failed to set session start time:', error);
    }
  },

  /**
   * Check if max session duration exceeded
   */
  isMaxDurationExceeded(): boolean {
    const startTime = this.getSessionStartTime();
    if (!startTime) return false;

    const config = getSessionConfig();
    const elapsed = Date.now() - startTime;
    return elapsed >= config.MAX_SESSION_DURATION_MS;
  },

  /**
   * Clear session storage
   */
  clearSession(): void {
    try {
      sessionStorage.removeItem(SESSION_CONFIG.STORAGE_KEYS.SESSION_START_TIME);
      sessionStorage.removeItem(SESSION_CONFIG.STORAGE_KEYS.SESSION_FINGERPRINT);

      // Clear user profiles
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith(SESSION_CONFIG.STORAGE_KEYS.USER_PROFILE_PREFIX)) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  },
};

export default SESSION_CONFIG;
