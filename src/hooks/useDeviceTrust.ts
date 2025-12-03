import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface TrustedDevice {
  id: string;
  device_id: string;
  device_name: string | null;
  device_type: string | null;
  device_fingerprint: string | null;
  is_trusted: boolean;
  trusted_at: string;
  trust_expires_at: string;
  last_ip_address: string | null;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  device_name: string | null;
  device_type: string | null;
  device_id: string | null;
  user_agent: string | null;
  browser: string | null;
  os: string | null;
  ip_address: string | null;
  country: string | null;
  city: string | null;
  auth_method: string;
  is_active: boolean;
  last_activity_at: string;
  expires_at: string;
  is_trusted_device: boolean;
  mfa_verified: boolean;
  created_at: string;
  updated_at: string;
}

interface DeviceTrustState {
  trustedDevices: TrustedDevice[];
  activeSessions: UserSession[];
  loading: boolean;
  error: string | null;
}

export const useDeviceTrust = () => {
  const { user, siteId } = useAuth();
  const [state, setState] = useState<DeviceTrustState>({
    trustedDevices: [],
    activeSessions: [],
    loading: true,
    error: null,
  });

  // Generate device fingerprint from browser characteristics
  const generateDeviceFingerprint = useCallback(async (): Promise<string> => {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.colorDepth,
      `${screen.width}x${screen.height}`,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 'unknown',
      navigator.platform,
    ];

    // Create a simple hash from components
    const fingerprint = components.join('|');
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprint);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }, []);

  // Get current device ID (creates one if not exists)
  const getCurrentDeviceId = useCallback((): string => {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = `device_${crypto.randomUUID()}`;
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }, []);

  // Parse user agent for device info
  const parseUserAgent = useCallback((userAgent: string) => {
    let browser = 'Unknown';
    let os = 'Unknown';
    let deviceType = 'desktop';

    // Browser detection
    if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('SamsungBrowser')) browser = 'Samsung Internet';
    else if (userAgent.includes('Opera') || userAgent.includes('OPR')) browser = 'Opera';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    else if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Safari')) browser = 'Safari';

    // OS detection
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac OS')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';

    // Device type
    if (userAgent.includes('Mobile') || userAgent.includes('Android')) {
      deviceType = 'mobile';
    } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
      deviceType = 'tablet';
    }

    return { browser, os, deviceType };
  }, []);

  // Load trusted devices
  const loadTrustedDevices = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('trusted_devices')
        .select('*')
        .eq('user_id', user.id)
        .order('last_seen_at', { ascending: false });

      if (error) throw error;

      setState(prev => ({
        ...prev,
        trustedDevices: data || [],
      }));
    } catch (error: any) {
      console.error('Error loading trusted devices:', error);
      setState(prev => ({ ...prev, error: error.message }));
    }
  }, [user]);

  // Load active sessions
  const loadActiveSessions = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('last_activity_at', { ascending: false });

      if (error) throw error;

      setState(prev => ({
        ...prev,
        activeSessions: data || [],
      }));
    } catch (error: any) {
      console.error('Error loading active sessions:', error);
      setState(prev => ({ ...prev, error: error.message }));
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setState(prev => ({ ...prev, loading: true, error: null }));
      await Promise.all([loadTrustedDevices(), loadActiveSessions()]);
      setState(prev => ({ ...prev, loading: false }));
    };

    if (user) {
      loadData();
    }
  }, [user, loadTrustedDevices, loadActiveSessions]);

  // Trust current device
  const trustCurrentDevice = useCallback(async (deviceName?: string) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      const deviceId = getCurrentDeviceId();
      const fingerprint = await generateDeviceFingerprint();
      const { deviceType } = parseUserAgent(navigator.userAgent);

      // Get current IP address
      let ipAddress: string | null = null;
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        ipAddress = ipData.ip;
      } catch (e) {
        console.warn('Could not fetch IP address');
      }

      const trustExpiresAt = new Date();
      trustExpiresAt.setDate(trustExpiresAt.getDate() + 90); // 90-day trust

      const { data, error } = await supabase
        .from('trusted_devices')
        .upsert({
          user_id: user.id,
          site_id: siteId,
          device_id: deviceId,
          device_name: deviceName || `${navigator.platform} - ${parseUserAgent(navigator.userAgent).browser}`,
          device_type: deviceType,
          device_fingerprint: fingerprint,
          is_trusted: true,
          trusted_at: new Date().toISOString(),
          trust_expires_at: trustExpiresAt.toISOString(),
          last_ip_address: ipAddress,
          last_seen_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,device_id',
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Device Trusted",
        description: "This device has been added to your trusted devices.",
      });

      await loadTrustedDevices();
      return { data, error: null };
    } catch (error: any) {
      console.error('Error trusting device:', error);
      toast({
        title: "Error",
        description: "Failed to trust this device.",
        variant: "destructive",
      });
      return { error: error.message };
    }
  }, [user, siteId, getCurrentDeviceId, generateDeviceFingerprint, parseUserAgent, loadTrustedDevices]);

  // Revoke device trust
  const revokeDeviceTrust = useCallback(async (deviceId: string) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      const { error } = await supabase
        .from('trusted_devices')
        .delete()
        .eq('user_id', user.id)
        .eq('id', deviceId);

      if (error) throw error;

      toast({
        title: "Device Removed",
        description: "The device has been removed from your trusted devices.",
      });

      await loadTrustedDevices();
      return { error: null };
    } catch (error: any) {
      console.error('Error revoking device trust:', error);
      toast({
        title: "Error",
        description: "Failed to remove the device.",
        variant: "destructive",
      });
      return { error: error.message };
    }
  }, [user, loadTrustedDevices]);

  // Update device trust settings
  const updateDeviceTrust = useCallback(async (
    deviceId: string,
    updates: Partial<Pick<TrustedDevice, 'device_name' | 'is_trusted'>>
  ) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      const { error } = await supabase
        .from('trusted_devices')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('id', deviceId);

      if (error) throw error;

      toast({
        title: "Device Updated",
        description: "Device settings have been updated.",
      });

      await loadTrustedDevices();
      return { error: null };
    } catch (error: any) {
      console.error('Error updating device trust:', error);
      return { error: error.message };
    }
  }, [user, loadTrustedDevices]);

  // Revoke session
  const revokeSession = useCallback(async (sessionId: string) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: "Session Revoked",
        description: "The session has been terminated.",
      });

      await loadActiveSessions();
      return { error: null };
    } catch (error: any) {
      console.error('Error revoking session:', error);
      toast({
        title: "Error",
        description: "Failed to revoke the session.",
        variant: "destructive",
      });
      return { error: error.message };
    }
  }, [user, loadActiveSessions]);

  // Revoke all sessions except current
  const revokeAllOtherSessions = useCallback(async () => {
    if (!user) return { error: 'User not authenticated' };

    try {
      const currentDeviceId = getCurrentDeviceId();

      const { error } = await supabase
        .from('user_sessions')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('is_active', true)
        .neq('device_id', currentDeviceId);

      if (error) throw error;

      toast({
        title: "Sessions Revoked",
        description: "All other sessions have been terminated.",
      });

      await loadActiveSessions();
      return { error: null };
    } catch (error: any) {
      console.error('Error revoking all sessions:', error);
      toast({
        title: "Error",
        description: "Failed to revoke sessions.",
        variant: "destructive",
      });
      return { error: error.message };
    }
  }, [user, getCurrentDeviceId, loadActiveSessions]);

  // Check if current device is trusted
  const isCurrentDeviceTrusted = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    const deviceId = getCurrentDeviceId();
    const device = state.trustedDevices.find(d => d.device_id === deviceId);

    if (!device) return false;
    if (!device.is_trusted) return false;

    // Check if trust has expired
    const expiresAt = new Date(device.trust_expires_at);
    return expiresAt > new Date();
  }, [user, getCurrentDeviceId, state.trustedDevices]);

  // Get device icon based on type
  const getDeviceIcon = (deviceType: string | null): string => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile':
      case 'ios':
      case 'android':
        return 'smartphone';
      case 'tablet':
        return 'tablet';
      case 'desktop':
      case 'web':
      default:
        return 'monitor';
    }
  };

  // Refresh all data
  const refreshData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    await Promise.all([loadTrustedDevices(), loadActiveSessions()]);
    setState(prev => ({ ...prev, loading: false }));
  }, [loadTrustedDevices, loadActiveSessions]);

  return {
    ...state,
    trustCurrentDevice,
    revokeDeviceTrust,
    updateDeviceTrust,
    revokeSession,
    revokeAllOtherSessions,
    isCurrentDeviceTrusted,
    getCurrentDeviceId,
    getDeviceIcon,
    refreshData,
  };
};
