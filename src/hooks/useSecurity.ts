import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface UserSecurity {
  id: string;
  failed_login_attempts: number;
  last_failed_attempt: string | null;
  account_locked_until: string | null;
  two_factor_enabled: boolean;
  two_factor_secret: string | null;
  backup_codes: string[] | null;
  last_login_ip: unknown;
  last_login_user_agent: string | null;
}

interface SecurityLog {
  id: string;
  event_type: string;
  ip_address: unknown;
  user_agent: string | null;
  details: any;
  created_at: string;
}

export const useSecurity = () => {
  const { user } = useAuth();
  const [userSecurity, setUserSecurity] = useState<UserSecurity | null>(null);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserSecurity();
      loadSecurityLogs();
    }
  }, [user]);

  const loadUserSecurity = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_security')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading user security:', error);
        return;
      }

      setUserSecurity(data);
    } catch (error) {
      console.error('Error loading user security:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSecurityLogs = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('security_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading security logs:', error);
        return;
      }

      setSecurityLogs(data || []);
    } catch (error) {
      console.error('Error loading security logs:', error);
    }
  };

  const enable2FA = async (secret: string, token: string) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      // Verify the TOTP token first (would need a backend validation)
      const { error } = await supabase
        .from('user_security')
        .upsert({
          user_id: user.id,
          two_factor_enabled: true,
          two_factor_secret: secret,
          backup_codes: generateBackupCodes()
        });

      if (error) throw error;

      // Log the 2FA enablement
      await logSecurityEvent('2fa_enabled', {
        method: 'totp'
      });

      await loadUserSecurity();
      
      toast({
        title: "2FA Enabled",
        description: "Two-factor authentication has been enabled for your account."
      });

      return { error: null };
    } catch (error: any) {
      console.error('Error enabling 2FA:', error);
      return { error: error.message };
    }
  };

  const disable2FA = async () => {
    if (!user) return { error: 'User not authenticated' };

    try {
      const { error } = await supabase
        .from('user_security')
        .update({
          two_factor_enabled: false,
          two_factor_secret: null,
          backup_codes: null
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await logSecurityEvent('2fa_disabled');
      await loadUserSecurity();
      
      toast({
        title: "2FA Disabled",
        description: "Two-factor authentication has been disabled for your account.",
        variant: "destructive"
      });

      return { error: null };
    } catch (error: any) {
      console.error('Error disabling 2FA:', error);
      return { error: error.message };
    }
  };

  const logSecurityEvent = async (eventType: string, details: any = {}) => {
    if (!user) return;

    try {
      await supabase.rpc('log_security_event', {
        p_user_id: user.id,
        p_event_type: eventType,
        p_ip_address: await getClientIP(),
        p_user_agent: navigator.userAgent,
        p_details: details
      });
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  };

  const checkAccountStatus = async () => {
    if (!user) return { isLocked: false };

    try {
      const { data, error } = await supabase.rpc('is_account_locked', {
        p_user_id: user.id
      });

      if (error) throw error;

      return { isLocked: data };
    } catch (error) {
      console.error('Error checking account status:', error);
      return { isLocked: false };
    }
  };

  const getClientIP = async (): Promise<string | null> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Error getting client IP:', error);
      return null;
    }
  };

  const generateBackupCodes = (): string[] => {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }
    return codes;
  };

  const generateTOTPSecret = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  };

  return {
    userSecurity,
    securityLogs,
    loading,
    enable2FA,
    disable2FA,
    logSecurityEvent,
    checkAccountStatus,
    generateTOTPSecret,
    refreshSecurity: loadUserSecurity,
    refreshLogs: loadSecurityLogs
  };
};