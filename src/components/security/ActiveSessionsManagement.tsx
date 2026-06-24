import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  Clock,
  MapPin,
  LogOut,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Key,
} from 'lucide-react';
import { useDeviceTrust, UserSession } from '@/hooks/useDeviceTrust';
import { mobileCardClasses, mobileTextClasses } from '@/utils/mobileHelpers';
import { formatDistanceToNow, format } from 'date-fns';

export const ActiveSessionsManagement: React.FC = () => {
  const {
    activeSessions,
    loading,
    revokeSession,
    revokeAllOtherSessions,
    getCurrentDeviceId,
    refreshData,
  } = useDeviceTrust();

  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [showRevokeAllDialog, setShowRevokeAllDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<UserSession | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const currentDeviceId = getCurrentDeviceId();

  const getDeviceIcon = (session: UserSession) => {
    const deviceType = session.device_type?.toLowerCase() || '';
    const os = session.os?.toLowerCase() || '';
    const userAgent = session.user_agent?.toLowerCase() || '';

    if (deviceType === 'mobile' || os === 'android' || os === 'ios' ||
        userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone')) {
      return <Smartphone className="h-5 w-5" />;
    }
    if (deviceType === 'tablet' || userAgent.includes('ipad') || userAgent.includes('tablet')) {
      return <Tablet className="h-5 w-5" />;
    }
    return <Monitor className="h-5 w-5" />;
  };

  const getAuthMethodLabel = (method: string) => {
    switch (method) {
      case 'password':
        return 'Password';
      case 'sso':
        return 'SSO';
      case 'oauth':
        return 'OAuth';
      case 'magic_link':
        return 'Magic Link';
      case 'biometric':
        return 'Biometric';
      default:
        return method;
    }
  };

  const getBrowserInfo = (session: UserSession): string => {
    if (session.browser) return session.browser;

    const userAgent = session.user_agent || '';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Safari')) return 'Safari';
    return 'Unknown Browser';
  };

  const getOSInfo = (session: UserSession): string => {
    if (session.os) return session.os;

    const userAgent = session.user_agent || '';
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
    return 'Unknown OS';
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const handleRevokeSession = async () => {
    if (!selectedSession) return;
    setActionLoading(true);
    await revokeSession(selectedSession.id);
    setActionLoading(false);
    setShowRevokeDialog(false);
    setSelectedSession(null);
  };

  const handleRevokeAllOther = async () => {
    setActionLoading(true);
    await revokeAllOtherSessions();
    setActionLoading(false);
    setShowRevokeAllDialog(false);
  };

  const openRevokeDialog = (session: UserSession) => {
    setSelectedSession(session);
    setShowRevokeDialog(true);
  };

  // Filter out expired sessions and sort
  const activeValidSessions = activeSessions.filter(s => !isExpired(s.expires_at));
  const otherSessionsCount = activeValidSessions.filter(s => s.device_id !== currentDeviceId).length;

  if (loading) {
    return (
      <Card className={mobileCardClasses.container}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={mobileCardClasses.container}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Active Sessions
              </CardTitle>
              <CardDescription>
                Manage your active login sessions across devices
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshData}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              {otherSessionsCount > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowRevokeAllDialog(true)}
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Sign Out All Other
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activeValidSessions.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <Globe className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className={`${mobileTextClasses.body} font-medium`}>No Active Sessions</p>
                <p className={mobileTextClasses.muted}>
                  You don't have any active sessions
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {activeValidSessions.map((session, index) => {
                const isCurrentSession = session.device_id === currentDeviceId;
                const browser = getBrowserInfo(session);
                const os = getOSInfo(session);

                return (
                  <div key={session.id}>
                    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border ${
                      isCurrentSession ? 'bg-success/5 border-success/20' : 'bg-card'
                    } hover:bg-muted/50 transition-colors`}>
                      <div className="flex items-start sm:items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          isCurrentSession
                            ? 'bg-success/10 text-success'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {getDeviceIcon(session)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`${mobileTextClasses.cardTitle} font-medium`}>
                              {session.device_name || `${browser} on ${os}`}
                            </p>
                            {isCurrentSession && (
                              <Badge variant="default" className="bg-success text-success-foreground text-xs">
                                Current Session
                              </Badge>
                            )}
                            {session.is_trusted_device && (
                              <Badge variant="secondary" className="text-xs">
                                <ShieldCheck className="h-3 w-3 mr-1" />
                                Trusted
                              </Badge>
                            )}
                            {session.mfa_verified && (
                              <Badge variant="outline" className="text-xs">
                                <Key className="h-3 w-3 mr-1" />
                                MFA
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1">
                            <span className={`${mobileTextClasses.muted} flex items-center gap-1`}>
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(session.last_activity_at), { addSuffix: true })}
                            </span>
                            {session.ip_address && (
                              <span className={`${mobileTextClasses.muted} flex items-center gap-1`}>
                                <MapPin className="h-3 w-3" />
                                {session.ip_address}
                                {session.city && ` (${session.city}${session.country ? `, ${session.country}` : ''})`}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`${mobileTextClasses.muted} text-xs`}>
                              {browser} • {os} • {getAuthMethodLabel(session.auth_method)}
                            </span>
                          </div>
                          <p className={`${mobileTextClasses.muted} text-xs mt-1`}>
                            Expires: {format(new Date(session.expires_at), 'PPp')}
                          </p>
                        </div>
                      </div>
                      {!isCurrentSession && (
                        <div className="flex items-center justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => openRevokeDialog(session)}
                          >
                            <LogOut className="h-4 w-4 mr-1" />
                            Sign Out
                          </Button>
                        </div>
                      )}
                    </div>
                    {index < activeValidSessions.length - 1 && <Separator className="mt-4" />}
                  </div>
                );
              })}
            </div>
          )}

          {/* Security Tips */}
          <div className="mt-6 p-4 rounded-lg bg-muted/50 border">
            <h4 className={`${mobileTextClasses.cardTitle} font-medium mb-2`}>Session Security Tips</h4>
            <ul className={`${mobileTextClasses.muted} space-y-1 list-disc list-inside`}>
              <li>Review your active sessions regularly</li>
              <li>Sign out from devices you no longer use</li>
              <li>If you see unfamiliar sessions, change your password immediately</li>
              <li>Sessions automatically expire after 30 days of inactivity</li>
            </ul>
          </div>

          {/* Session Count Summary */}
          {activeValidSessions.length > 0 && (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>{activeValidSessions.length} active session{activeValidSessions.length !== 1 ? 's' : ''}</span>
              {otherSessionsCount > 0 && (
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  {otherSessionsCount} session{otherSessionsCount !== 1 ? 's' : ''} on other devices
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revoke Single Session Dialog */}
      <AlertDialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out this session?
              <span className="block mt-2 font-medium text-foreground">
                {selectedSession && (
                  <>
                    {getBrowserInfo(selectedSession)} on {getOSInfo(selectedSession)}
                    {selectedSession.ip_address && ` • ${selectedSession.ip_address}`}
                  </>
                )}
              </span>
              This will immediately terminate the session on that device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeSession}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <LogOut className="h-4 w-4 mr-2" />
              )}
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke All Sessions Dialog */}
      <AlertDialog open={showRevokeAllDialog} onOpenChange={setShowRevokeAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out All Other Sessions</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out all other sessions?
              <span className="block mt-2 font-medium text-warning">
                This will immediately terminate {otherSessionsCount} session{otherSessionsCount !== 1 ? 's' : ''} on other devices.
              </span>
              Your current session will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeAllOther}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <LogOut className="h-4 w-4 mr-2" />
              )}
              Sign Out All Other
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
