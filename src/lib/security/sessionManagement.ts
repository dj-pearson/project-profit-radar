/**
 * Concurrent Session Management Service
 *
 * Provides session tracking and limits to prevent credential sharing
 * and detect unauthorized access. Uses the user_sessions table.
 *
 * Features:
 * - Register new sessions on login
 * - Enforce configurable session limits (default: 3)
 * - List active sessions for user management
 * - Terminate individual or all other sessions
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

const DEFAULT_MAX_SESSIONS = 3;
const SESSION_EXPIRY_HOURS = 24 * 7; // 7 days

export interface SessionInfo {
  id: string;
  deviceName: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  ipAddress: string | null;
  lastActivityAt: string | null;
  createdAt: string | null;
  isActive: boolean;
  isCurrent: boolean;
}

export interface SessionLimitResult {
  allowed: boolean;
  activeSessions: number;
  maxSessions: number;
  sessions: SessionInfo[];
}

/**
 * Parse user agent string into device info components
 */
function parseUserAgent(): { browser: string; os: string; deviceType: string; deviceName: string } {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';

  // Detect browser
  let browser = 'Unknown';
  if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';

  // Detect OS
  let os = 'Unknown';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  // Detect device type
  let deviceType = 'desktop';
  if (ua.includes('Mobile') || ua.includes('Android')) deviceType = 'mobile';
  else if (ua.includes('iPad') || ua.includes('Tablet')) deviceType = 'tablet';

  const deviceName = `${browser} on ${os}`;

  return { browser, os, deviceType, deviceName };
}

/**
 * Register a new session after successful login
 */
export async function registerSession(
  userId: string,
  sessionToken: string
): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  try {
    const { browser, os, deviceType, deviceName } = parseUserAgent();
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;

    const { data, error } = await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_token: sessionToken,
        browser,
        os,
        device_type: deviceType,
        device_name: deviceName,
        user_agent: userAgent,
        is_active: true,
        auth_method: 'password',
        last_activity_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      logger.error('[SessionManagement] Error registering session:', error);
      return { success: false, error: 'Failed to register session' };
    }

    return { success: true, sessionId: data.id };
  } catch (err) {
    logger.error('[SessionManagement] Exception registering session:', err);
    return { success: false, error: 'Failed to register session' };
  }
}

/**
 * Check if a new session is allowed within the configured limit.
 * If the limit would be exceeded, terminates the oldest session to make room.
 */
export async function checkSessionLimit(
  userId: string,
  maxSessions: number = DEFAULT_MAX_SESSIONS
): Promise<SessionLimitResult> {
  try {
    const { data: sessions, error } = await supabase
      .from('user_sessions')
      .select('id, device_name, device_type, browser, os, ip_address, last_activity_at, created_at, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('last_activity_at', { ascending: false })
      .limit(50);

    if (error) {
      logger.error('[SessionManagement] Error checking session limit:', error);
      return { allowed: true, activeSessions: 0, maxSessions, sessions: [] };
    }

    const activeSessions = sessions || [];
    const sessionInfos: SessionInfo[] = activeSessions.map(s => ({
      id: s.id,
      deviceName: s.device_name,
      deviceType: s.device_type,
      browser: s.browser,
      os: s.os,
      ipAddress: s.ip_address,
      lastActivityAt: s.last_activity_at,
      createdAt: s.created_at,
      isActive: s.is_active ?? false,
      isCurrent: false,
    }));

    // If we're at or over the limit, terminate the oldest session
    if (activeSessions.length >= maxSessions) {
      const oldestSession = activeSessions[activeSessions.length - 1];
      if (oldestSession) {
        await terminateSession(oldestSession.id);
        logger.debug(`[SessionManagement] Terminated oldest session ${oldestSession.id} to make room`);
      }
    }

    return {
      allowed: true,
      activeSessions: activeSessions.length,
      maxSessions,
      sessions: sessionInfos,
    };
  } catch (err) {
    logger.error('[SessionManagement] Exception checking session limit:', err);
    return { allowed: true, activeSessions: 0, maxSessions, sessions: [] };
  }
}

/**
 * Get all active sessions for a user
 */
export async function getActiveSessions(userId: string): Promise<SessionInfo[]> {
  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('id, device_name, device_type, browser, os, ip_address, last_activity_at, created_at, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('last_activity_at', { ascending: false });

    if (error) {
      logger.error('[SessionManagement] Error fetching active sessions:', error);
      return [];
    }

    return (data || []).map(s => ({
      id: s.id,
      deviceName: s.device_name,
      deviceType: s.device_type,
      browser: s.browser,
      os: s.os,
      ipAddress: s.ip_address,
      lastActivityAt: s.last_activity_at,
      createdAt: s.created_at,
      isActive: s.is_active ?? false,
      isCurrent: false,
    }));
  } catch (err) {
    logger.error('[SessionManagement] Exception fetching active sessions:', err);
    return [];
  }
}

/**
 * Terminate a specific session
 */
export async function terminateSession(sessionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_sessions')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (error) {
      logger.error('[SessionManagement] Error terminating session:', error);
      return false;
    }
    return true;
  } catch (err) {
    logger.error('[SessionManagement] Exception terminating session:', err);
    return false;
  }
}

/**
 * Terminate all sessions except the current one
 */
export async function terminateAllOtherSessions(
  userId: string,
  currentSessionId: string
): Promise<{ terminated: number }> {
  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_active', true)
      .neq('id', currentSessionId)
      .select('id');

    if (error) {
      logger.error('[SessionManagement] Error terminating other sessions:', error);
      return { terminated: 0 };
    }

    return { terminated: data?.length || 0 };
  } catch (err) {
    logger.error('[SessionManagement] Exception terminating other sessions:', err);
    return { terminated: 0 };
  }
}
