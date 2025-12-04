/**
 * Session Configuration and Auto-Refresh Tests
 *
 * Tests for:
 * - Session timeout configuration
 * - Inactivity timeout helpers
 * - Session warning logic
 * - Max session duration checks
 * - Session storage helpers
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SESSION_CONFIG,
  getSessionConfig,
  sessionHelpers,
} from '../sessionConfig';

describe('Session Configuration', () => {
  describe('SESSION_CONFIG constants', () => {
    it('should have correct inactivity timeout (30 minutes)', () => {
      expect(SESSION_CONFIG.INACTIVITY_TIMEOUT_MS).toBe(30 * 60 * 1000);
    });

    it('should have correct session check interval (5 minutes)', () => {
      expect(SESSION_CONFIG.SESSION_CHECK_INTERVAL_MS).toBe(5 * 60 * 1000);
    });

    it('should have correct max session duration (8 hours)', () => {
      expect(SESSION_CONFIG.MAX_SESSION_DURATION_MS).toBe(8 * 60 * 60 * 1000);
    });

    it('should have correct token refresh interval (50 minutes)', () => {
      expect(SESSION_CONFIG.TOKEN_REFRESH_INTERVAL_MS).toBe(50 * 60 * 1000);
    });

    it('should have correct session warning time (5 minutes)', () => {
      expect(SESSION_CONFIG.SESSION_WARNING_MS).toBe(5 * 60 * 1000);
    });

    it('should have correct profile fetch timeout (10 seconds)', () => {
      expect(SESSION_CONFIG.PROFILE_FETCH_TIMEOUT_MS).toBe(10 * 1000);
    });

    it('should have all required activity events', () => {
      expect(SESSION_CONFIG.ACTIVITY_EVENTS).toEqual([
        'mousedown',
        'mousemove',
        'keypress',
        'scroll',
        'touchstart',
        'click',
      ]);
    });

    it('should have correct storage key prefixes', () => {
      expect(SESSION_CONFIG.STORAGE_KEYS.USER_PROFILE_PREFIX).toBe('bd.userProfile.');
      expect(SESSION_CONFIG.STORAGE_KEYS.AUTH_TOKEN_PREFIX).toBe('sb-ilhzuvemiuyfuxfegtlv-auth-token');
      expect(SESSION_CONFIG.STORAGE_KEYS.SESSION_FINGERPRINT).toBe('bd.session.fingerprint');
      expect(SESSION_CONFIG.STORAGE_KEYS.SESSION_START_TIME).toBe('bd.session.startTime');
    });
  });

  describe('getSessionConfig', () => {
    const originalEnv = import.meta.env.DEV;

    afterEach(() => {
      // Restore original env
      Object.defineProperty(import.meta.env, 'DEV', { value: originalEnv });
    });

    it('should return production config by default', () => {
      Object.defineProperty(import.meta.env, 'DEV', { value: false });
      const config = getSessionConfig();

      expect(config.INACTIVITY_TIMEOUT_MS).toBe(30 * 60 * 1000);
      expect(config.MAX_SESSION_DURATION_MS).toBe(8 * 60 * 60 * 1000);
    });

    it('should return development config with longer timeouts in dev mode', () => {
      Object.defineProperty(import.meta.env, 'DEV', { value: true });
      const config = getSessionConfig();

      expect(config.INACTIVITY_TIMEOUT_MS).toBe(60 * 60 * 1000); // 1 hour
      expect(config.MAX_SESSION_DURATION_MS).toBe(24 * 60 * 60 * 1000); // 24 hours
    });
  });

  describe('sessionHelpers', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      sessionStorage.clear();
    });

    afterEach(() => {
      vi.useRealTimers();
      sessionStorage.clear();
    });

    describe('getTimeUntilInactivityTimeout', () => {
      it('should return full timeout when activity was just now', () => {
        const now = Date.now();
        vi.setSystemTime(now);

        const timeRemaining = sessionHelpers.getTimeUntilInactivityTimeout(now);
        const config = getSessionConfig();

        expect(timeRemaining).toBe(config.INACTIVITY_TIMEOUT_MS);
      });

      it('should return reduced time as time passes', () => {
        const now = Date.now();
        vi.setSystemTime(now);

        const lastActivity = now - (10 * 60 * 1000); // 10 minutes ago
        const timeRemaining = sessionHelpers.getTimeUntilInactivityTimeout(lastActivity);
        const config = getSessionConfig();

        expect(timeRemaining).toBe(config.INACTIVITY_TIMEOUT_MS - (10 * 60 * 1000));
      });

      it('should return 0 when timeout exceeded', () => {
        const now = Date.now();
        vi.setSystemTime(now);

        const lastActivity = now - (60 * 60 * 1000); // 1 hour ago
        const timeRemaining = sessionHelpers.getTimeUntilInactivityTimeout(lastActivity);

        expect(timeRemaining).toBe(0);
      });

      it('should never return negative values', () => {
        const now = Date.now();
        vi.setSystemTime(now);

        const lastActivity = now - (24 * 60 * 60 * 1000); // 24 hours ago
        const timeRemaining = sessionHelpers.getTimeUntilInactivityTimeout(lastActivity);

        expect(timeRemaining).toBeGreaterThanOrEqual(0);
      });
    });

    describe('shouldShowSessionWarning', () => {
      it('should return false when plenty of time remaining', () => {
        const now = Date.now();
        vi.setSystemTime(now);

        const lastActivity = now; // Just now
        const shouldWarn = sessionHelpers.shouldShowSessionWarning(lastActivity);

        expect(shouldWarn).toBe(false);
      });

      it('should return true when within warning window', () => {
        const now = Date.now();
        vi.setSystemTime(now);

        const config = getSessionConfig();
        // Activity was timeout - warning + 1 minute ago (within warning window)
        const lastActivity = now - (config.INACTIVITY_TIMEOUT_MS - config.SESSION_WARNING_MS + 60000);
        const shouldWarn = sessionHelpers.shouldShowSessionWarning(lastActivity);

        expect(shouldWarn).toBe(true);
      });

      it('should return false when session already expired', () => {
        const now = Date.now();
        vi.setSystemTime(now);

        const config = getSessionConfig();
        const lastActivity = now - config.INACTIVITY_TIMEOUT_MS - 1000; // Expired
        const shouldWarn = sessionHelpers.shouldShowSessionWarning(lastActivity);

        expect(shouldWarn).toBe(false);
      });
    });

    describe('isSessionExpired', () => {
      it('should return false for recent activity', () => {
        const now = Date.now();
        vi.setSystemTime(now);

        const isExpired = sessionHelpers.isSessionExpired(now);

        expect(isExpired).toBe(false);
      });

      it('should return true when inactivity timeout exceeded', () => {
        const now = Date.now();
        vi.setSystemTime(now);

        const config = getSessionConfig();
        const lastActivity = now - config.INACTIVITY_TIMEOUT_MS - 1000;
        const isExpired = sessionHelpers.isSessionExpired(lastActivity);

        expect(isExpired).toBe(true);
      });
    });

    describe('getSessionStartTime and setSessionStartTime', () => {
      it('should return null when no start time set', () => {
        const startTime = sessionHelpers.getSessionStartTime();

        expect(startTime).toBeNull();
      });

      it('should set and get session start time correctly', () => {
        const now = Date.now();
        sessionHelpers.setSessionStartTime(now);

        const startTime = sessionHelpers.getSessionStartTime();

        expect(startTime).toBe(now);
      });

      it('should use current time when no argument provided', () => {
        const now = Date.now();
        vi.setSystemTime(now);

        sessionHelpers.setSessionStartTime();
        const startTime = sessionHelpers.getSessionStartTime();

        expect(startTime).toBe(now);
      });
    });

    describe('isMaxDurationExceeded', () => {
      it('should return false when no start time set', () => {
        const exceeded = sessionHelpers.isMaxDurationExceeded();

        expect(exceeded).toBe(false);
      });

      it('should return false for fresh session', () => {
        const now = Date.now();
        vi.setSystemTime(now);

        sessionHelpers.setSessionStartTime(now);
        const exceeded = sessionHelpers.isMaxDurationExceeded();

        expect(exceeded).toBe(false);
      });

      it('should return true when max duration exceeded', () => {
        const now = Date.now();
        vi.setSystemTime(now);

        const config = getSessionConfig();
        sessionHelpers.setSessionStartTime(now - config.MAX_SESSION_DURATION_MS - 1000);
        const exceeded = sessionHelpers.isMaxDurationExceeded();

        expect(exceeded).toBe(true);
      });
    });

    describe('clearSession', () => {
      it('should clear session start time', () => {
        sessionHelpers.setSessionStartTime(Date.now());
        expect(sessionHelpers.getSessionStartTime()).not.toBeNull();

        sessionHelpers.clearSession();
        expect(sessionHelpers.getSessionStartTime()).toBeNull();
      });

      it('should clear session fingerprint', () => {
        sessionStorage.setItem(SESSION_CONFIG.STORAGE_KEYS.SESSION_FINGERPRINT, 'test');

        sessionHelpers.clearSession();

        expect(sessionStorage.getItem(SESSION_CONFIG.STORAGE_KEYS.SESSION_FINGERPRINT)).toBeNull();
      });

      it('should clear user profile data', () => {
        sessionStorage.setItem('bd.userProfile.123', JSON.stringify({ id: '123' }));
        sessionStorage.setItem('bd.userProfile.456', JSON.stringify({ id: '456' }));
        sessionStorage.setItem('other.data', 'should remain');

        sessionHelpers.clearSession();

        expect(sessionStorage.getItem('bd.userProfile.123')).toBeNull();
        expect(sessionStorage.getItem('bd.userProfile.456')).toBeNull();
        expect(sessionStorage.getItem('other.data')).toBe('should remain');
      });
    });
  });
});

describe('Session Auto-Refresh Integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it('should correctly track session lifecycle', () => {
    const now = Date.now();
    vi.setSystemTime(now);

    // Start session
    sessionHelpers.setSessionStartTime(now);
    expect(sessionHelpers.isMaxDurationExceeded()).toBe(false);

    // After some time, should still be valid
    vi.advanceTimersByTime(4 * 60 * 60 * 1000); // 4 hours
    expect(sessionHelpers.isMaxDurationExceeded()).toBe(false);

    // After max duration, should expire
    vi.advanceTimersByTime(5 * 60 * 60 * 1000); // 5 more hours (9 total)
    expect(sessionHelpers.isMaxDurationExceeded()).toBe(true);
  });

  it('should correctly track inactivity', () => {
    const now = Date.now();
    vi.setSystemTime(now);

    // Fresh activity
    expect(sessionHelpers.isSessionExpired(now)).toBe(false);
    expect(sessionHelpers.shouldShowSessionWarning(now)).toBe(false);

    // 25 minutes of inactivity (should show warning)
    vi.advanceTimersByTime(25 * 60 * 1000);
    const newNow = Date.now();
    expect(sessionHelpers.shouldShowSessionWarning(now)).toBe(true);
    expect(sessionHelpers.isSessionExpired(now)).toBe(false);

    // 35 minutes of inactivity (should be expired)
    vi.advanceTimersByTime(10 * 60 * 1000);
    expect(sessionHelpers.isSessionExpired(now)).toBe(true);
  });

  it('should calculate remaining time correctly', () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const config = getSessionConfig();
    const lastActivity = now;

    // Initial
    let remaining = sessionHelpers.getTimeUntilInactivityTimeout(lastActivity);
    expect(remaining).toBe(config.INACTIVITY_TIMEOUT_MS);

    // After 10 minutes
    vi.advanceTimersByTime(10 * 60 * 1000);
    remaining = sessionHelpers.getTimeUntilInactivityTimeout(lastActivity);
    expect(remaining).toBe(config.INACTIVITY_TIMEOUT_MS - (10 * 60 * 1000));

    // After 30 minutes (exactly at timeout)
    vi.advanceTimersByTime(20 * 60 * 1000);
    remaining = sessionHelpers.getTimeUntilInactivityTimeout(lastActivity);
    expect(remaining).toBe(0);
  });
});

describe('Security Considerations', () => {
  it('should have reasonable token refresh interval (before 60min JWT expiry)', () => {
    expect(SESSION_CONFIG.TOKEN_REFRESH_INTERVAL_MS).toBeLessThan(60 * 60 * 1000);
    expect(SESSION_CONFIG.TOKEN_REFRESH_INTERVAL_MS).toBeGreaterThan(30 * 60 * 1000);
  });

  it('should have session check interval shorter than inactivity timeout', () => {
    expect(SESSION_CONFIG.SESSION_CHECK_INTERVAL_MS).toBeLessThan(
      SESSION_CONFIG.INACTIVITY_TIMEOUT_MS
    );
  });

  it('should have warning time shorter than inactivity timeout', () => {
    expect(SESSION_CONFIG.SESSION_WARNING_MS).toBeLessThan(
      SESSION_CONFIG.INACTIVITY_TIMEOUT_MS
    );
  });

  it('should have max session duration longer than inactivity timeout', () => {
    expect(SESSION_CONFIG.MAX_SESSION_DURATION_MS).toBeGreaterThan(
      SESSION_CONFIG.INACTIVITY_TIMEOUT_MS
    );
  });
});
