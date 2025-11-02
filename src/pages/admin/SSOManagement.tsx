import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield,
  Key,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  Trash2,
  Settings,
  Users,
  Lock,
  Smartphone,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface SSOConnection {
  id: string;
  tenant_id: string;
  provider: string;
  display_name: string;
  is_enabled: boolean;
  is_default: boolean;
  allowed_domains: string[];
  total_logins: number;
  last_used_at: string;
  created_at: string;
}

interface UserSession {
  id: string;
  device_name: string;
  device_type: string;
  browser: string;
  os: string;
  ip_address: string;
  auth_method: string;
  is_active: boolean;
  last_activity_at: string;
  created_at: string;
}

interface MFADevice {
  id: string;
  mfa_type: string;
  display_name: string;
  is_enabled: boolean;
  is_verified: boolean;
  last_used_at: string;
}

export const SSOManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [ssoConnections, setSSOConnections] = useState<SSOConnection[]>([]);
  const [userSessions, setUserSessions] = useState<UserSession[]>([]);
  const [mfaDevices, setMFADevices] = useState<MFADevice[]>([]);

  useEffect(() => {
    loadSSOData();
  }, []);

  const loadSSOData = async () => {
    setLoading(true);
    try {
      // Load SSO connections
      const { data: ssoData, error: ssoError } = await supabase
        .from('sso_connections')
        .select('*')
        .order('created_at', { ascending: false });

      if (ssoError) throw ssoError;
      setSSOConnections(ssoData || []);

      // Load user sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('last_activity_at', { ascending: false });

      if (sessionsError) throw sessionsError;
      setUserSessions(sessionsData || []);

      // Load MFA devices
      const { data: mfaData, error: mfaError } = await supabase
        .from('mfa_devices')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (mfaError) throw mfaError;
      setMFADevices(mfaData || []);
    } catch (error) {
      console.error('Failed to load SSO data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load SSO data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSSOConnection = async (connectionId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('sso_connections')
        .update({ is_enabled: !currentStatus })
        .eq('id', connectionId);

      if (error) throw error;

      toast({
        title: currentStatus ? 'SSO Disabled' : 'SSO Enabled',
        description: currentStatus ? 'SSO connection has been disabled.' : 'SSO connection is now enabled.',
      });

      loadSSOData();
    } catch (error) {
      console.error('Failed to toggle SSO:', error);
      toast({
        title: 'Error',
        description: 'Failed to update SSO connection.',
        variant: 'destructive',
      });
    }
  };

  const revokeSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: 'Session Revoked',
        description: 'The session has been revoked.',
      });

      loadSSOData();
    } catch (error) {
      console.error('Failed to revoke session:', error);
      toast({
        title: 'Error',
        description: 'Failed to revoke session.',
        variant: 'destructive',
      });
    }
  };

  const getProviderBadge = (provider: string) => {
    const config = {
      saml: { color: 'bg-purple-500', label: 'SAML 2.0' },
      oauth_google: { color: 'bg-red-500', label: 'Google OAuth' },
      oauth_microsoft: { color: 'bg-blue-500', label: 'Microsoft OAuth' },
      oauth_github: { color: 'bg-gray-800', label: 'GitHub OAuth' },
      ldap: { color: 'bg-green-500', label: 'LDAP' },
    };

    const { color, label } = config[provider as keyof typeof config] || { color: 'bg-gray-500', label: provider };
    return <Badge className={`${color} text-white`}>{label}</Badge>;
  };

  const getMFATypeBadge = (type: string) => {
    const config = {
      totp: { color: 'bg-blue-500', label: 'Authenticator App' },
      sms: { color: 'bg-green-500', label: 'SMS' },
      email: { color: 'bg-purple-500', label: 'Email' },
      backup_codes: { color: 'bg-orange-500', label: 'Backup Codes' },
    };

    const { color, label } = config[type as keyof typeof config] || { color: 'bg-gray-500', label: type };
    return <Badge className={`${color} text-white`}>{label}</Badge>;
  };

  if (loading) {
    return (
      <DashboardLayout title="SSO & Authentication">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Shield className="w-12 h-12 text-construction-orange animate-pulse mx-auto mb-4" />
            <p className="text-muted-foreground">Loading authentication settings...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="SSO & Authentication">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-construction-dark flex items-center gap-2">
              <Shield className="w-8 h-8 text-construction-orange" />
              SSO & Authentication
            </h1>
            <p className="text-muted-foreground">
              Manage single sign-on, multi-factor authentication, and security settings
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="sso">
          <TabsList>
            <TabsTrigger value="sso">SSO Connections ({ssoConnections.length})</TabsTrigger>
            <TabsTrigger value="sessions">Active Sessions ({userSessions.length})</TabsTrigger>
            <TabsTrigger value="mfa">MFA Devices ({mfaDevices.length})</TabsTrigger>
          </TabsList>

          {/* SSO Connections Tab */}
          <TabsContent value="sso" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Configure enterprise single sign-on for your organization
              </p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add SSO Connection
              </Button>
            </div>

            {ssoConnections.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No SSO connections configured</p>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Configure SSO
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {ssoConnections.map((connection) => (
                  <Card key={connection.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{connection.display_name}</h3>
                            {getProviderBadge(connection.provider)}
                            {connection.is_enabled ? (
                              <Badge className="bg-green-500 text-white">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Enabled
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-500 text-white">
                                <XCircle className="w-3 h-3 mr-1" />
                                Disabled
                              </Badge>
                            )}
                            {connection.is_default && (
                              <Badge className="bg-blue-500 text-white">Default</Badge>
                            )}
                          </div>
                          {connection.allowed_domains && connection.allowed_domains.length > 0 && (
                            <p className="text-sm text-muted-foreground">
                              Allowed domains: {connection.allowed_domains.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Total Logins</p>
                          <p className="font-semibold">{connection.total_logins}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Last Used</p>
                          <p className="font-semibold">
                            {connection.last_used_at
                              ? new Date(connection.last_used_at).toLocaleDateString()
                              : 'Never'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Created</p>
                          <p className="font-semibold">
                            {new Date(connection.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={connection.is_enabled ? 'outline' : 'default'}
                          onClick={() => toggleSSOConnection(connection.id, connection.is_enabled)}
                        >
                          {connection.is_enabled ? 'Disable' : 'Enable'}
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button size="sm" variant="outline">
                          <Settings className="w-4 h-4 mr-2" />
                          Configure
                        </Button>
                        <Button size="sm" variant="outline">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Active Sessions Tab */}
          <TabsContent value="sessions" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Manage your active sessions across devices
            </p>

            {userSessions.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Key className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No active sessions</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {userSessions.map((session) => (
                  <Card key={session.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold">{session.device_name || 'Unknown Device'}</h4>
                            <Badge variant="outline" className="capitalize">{session.device_type}</Badge>
                            <Badge variant="outline" className="capitalize">{session.auth_method}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {session.browser} on {session.os} • {session.ip_address}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Last Activity</p>
                          <p className="font-semibold">
                            {new Date(session.last_activity_at).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Started</p>
                          <p className="font-semibold">
                            {new Date(session.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => revokeSession(session.id)}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Revoke Session
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* MFA Devices Tab */}
          <TabsContent value="mfa" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Secure your account with multi-factor authentication
              </p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add MFA Device
              </Button>
            </div>

            {mfaDevices.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Smartphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No MFA devices configured</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add an authenticator app or SMS verification to secure your account
                  </p>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Set Up MFA
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {mfaDevices.map((device) => (
                  <Card key={device.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold">{device.display_name || device.mfa_type}</h4>
                            {getMFATypeBadge(device.mfa_type)}
                            {device.is_verified ? (
                              <Badge className="bg-green-500 text-white">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge className="bg-yellow-500 text-white">Pending Verification</Badge>
                            )}
                            {device.is_enabled && (
                              <Badge className="bg-blue-500 text-white">Active</Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Last Used</p>
                          <p className="font-semibold">
                            {device.last_used_at
                              ? new Date(device.last_used_at).toLocaleDateString()
                              : 'Never'}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          {device.is_enabled ? 'Disable' : 'Enable'}
                        </Button>
                        {!device.is_verified && (
                          <Button size="sm">Verify</Button>
                        )}
                        <Button size="sm" variant="outline">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SSOManagement;
