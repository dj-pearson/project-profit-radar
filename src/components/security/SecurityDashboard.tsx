import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Eye, 
  Clock, 
  MapPin, 
  Smartphone,
  AlertTriangle,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MFASetup } from './MFASetup';

interface SecurityEvent {
  id: string;
  event_type: string;
  created_at: string;
  ip_address?: string | null;
  user_agent?: string | null;
  details?: any;
}

interface SecurityStatus {
  mfa_enabled: boolean;
  failed_login_attempts: number;
  last_login_ip?: string;
  last_failed_attempt?: string;
  account_locked_until?: string;
}

export const SecurityDashboard: React.FC = () => {
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);
  const [recentEvents, setRecentEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { userProfile } = useAuth();

  useEffect(() => {
    if (userProfile) {
      loadSecurityData();
    }
  }, [userProfile]);

  const loadSecurityData = async () => {
    if (!userProfile) return;

    try {
      setLoading(true);

      // Load security status
      const { data: securityData, error: securityError } = await supabase
        .from('user_security')
        .select('*')
        .eq('user_id', userProfile.id)
        .maybeSingle();

      if (securityError && securityError.code !== 'PGRST116') {
        console.error('Error loading security status:', securityError);
      } else {
        setSecurityStatus({
          mfa_enabled: securityData?.two_factor_enabled || false,
          failed_login_attempts: securityData?.failed_login_attempts || 0,
          last_login_ip: (securityData?.last_login_ip as string) || undefined,
          last_failed_attempt: securityData?.last_failed_attempt,
          account_locked_until: securityData?.account_locked_until,
        });
      }

      // Load recent security events
      const { data: eventsData, error: eventsError } = await supabase
        .from('security_logs')
        .select('*')
        .eq('user_id', userProfile.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (eventsError) {
        console.error('Error loading security events:', eventsError);
      } else {
        setRecentEvents((eventsData || []).map(event => ({
          ...event,
          ip_address: event.ip_address as string | null,
          user_agent: event.user_agent as string | null,
        })));
      }

    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'login_success':
        return <ShieldCheck className="h-4 w-4 text-green-500" />;
      case 'login_failed':
        return <ShieldAlert className="h-4 w-4 text-red-500" />;
      case 'mfa_enabled':
      case 'mfa_setup_initiated':
        return <Shield className="h-4 w-4 text-blue-500" />;
      case 'mfa_disabled':
        return <ShieldAlert className="h-4 w-4 text-orange-500" />;
      case 'account_locked':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getEventDescription = (event: SecurityEvent) => {
    switch (event.event_type) {
      case 'login_success':
        return 'Successful login';
      case 'login_failed':
        return 'Failed login attempt';
      case 'mfa_enabled':
        return 'Two-factor authentication enabled';
      case 'mfa_disabled':
        return 'Two-factor authentication disabled';
      case 'mfa_setup_initiated':
        return 'MFA setup started';
      case 'mfa_verification_failed':
        return 'MFA verification failed';
      case 'account_locked':
        return 'Account temporarily locked';
      default:
        return event.event_type.replace(/_/g, ' ');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isAccountLocked = securityStatus?.account_locked_until && 
    new Date(securityStatus.account_locked_until) > new Date();

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Two-Factor Auth</p>
                <div className="flex items-center gap-2 mt-1">
                  {securityStatus?.mfa_enabled ? (
                    <>
                      <ShieldCheck className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium text-green-600">Enabled</span>
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium text-red-600">Disabled</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Failed Attempts</p>
                <div className="flex items-center gap-2 mt-1">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-lg font-bold">
                    {securityStatus?.failed_login_attempts || 0}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Account Status</p>
                <div className="flex items-center gap-2 mt-1">
                  {isAccountLocked ? (
                    <>
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium text-red-600">Locked</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium text-green-600">Active</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Locked Alert */}
      {isAccountLocked && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your account is temporarily locked until{' '}
            {formatDate(securityStatus?.account_locked_until!)} due to multiple failed login attempts.
          </AlertDescription>
        </Alert>
      )}

      {/* MFA Setup */}
      <MFASetup onMFAStatusChange={(enabled) => {
        setSecurityStatus(prev => prev ? { ...prev, mfa_enabled: enabled } : null);
        loadSecurityData(); // Reload to get updated events
      }} />

      {/* Recent Security Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Security Activity
          </CardTitle>
          <CardDescription>
            View your recent login attempts and security events
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No recent security events found
            </p>
          ) : (
            <div className="space-y-4">
              {recentEvents.map((event, index) => (
                <div key={event.id}>
                  <div className="flex items-start gap-3">
                    {getEventIcon(event.event_type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          {getEventDescription(event)}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(event.created_at)}
                        </span>
                      </div>
                      {(event.ip_address || event.user_agent) && (
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          {event.ip_address && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {event.ip_address}
                            </div>
                          )}
                          {event.user_agent && (
                            <div className="flex items-center gap-1">
                              <Smartphone className="h-3 w-3" />
                              {event.user_agent.split(' ')[0]}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {index < recentEvents.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};