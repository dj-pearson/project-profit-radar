import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AccessibleModal } from '@/components/accessibility/AccessibleModal';
import { Shield, Key, CheckCircle, XCircle, Plus, Edit, Trash2, Smartphone, RefreshCw, Loader2 } from 'lucide-react';
import { useSSOManagement, type SSOConnection } from '@/hooks/useSSOManagement';
import { ErrorState } from '@/components/common/ErrorState';
import { SAML_AVAILABLE, SAML_UNAVAILABLE_NOTICE } from '@/lib/sso/samlAvailability';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessiblePageWrapper } from '@/components/accessibility/AccessiblePageWrapper';
import { SSOConfigurationForm } from '@/components/sso/SSOConfigurationForm';
import { TOTPSetupScreen } from '@/components/mfa/TOTPSetupScreen';
import { DataTablePageSkeleton } from '@/components/ui/skeletons';

export const SSOManagement = () => {
  const { toast } = useToast();
  const sso = useSSOManagement();
  const ssoConnections = sso.data?.connections ?? [];
  const userSessions = sso.data?.sessions ?? [];
  const mfaDevices = sso.data?.mfaDevices ?? [];
  const userSecurity = sso.data?.security ?? null;
  const loadSSOData = () => { void sso.refetch(); };

  // Dialog states
  const [showSSOForm, setShowSSOForm] = useState(false);
  const [editingConnection, setEditingConnection] = useState<SSOConnection | null>(null);
  const [showMFASetup, setShowMFASetup] = useState(false);
  const [deletingConnectionId, setDeletingConnectionId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const failure = (title: string, error: unknown, fallback: string) => {
    console.error(title, error);
    toast({
      title: 'Error',
      description: error instanceof Error && error.message ? error.message : fallback,
      variant: 'destructive',
    });
  };

  const toggleSSOConnection = async (connectionId: string, currentStatus: boolean) => {
    try {
      await sso.setConnectionEnabled(connectionId, !currentStatus);
      toast({
        title: currentStatus ? 'SSO Disabled' : 'SSO Enabled',
        description: currentStatus
          ? 'SSO connection has been disabled.'
          : 'SSO connection is now enabled.',
      });
    } catch (error) {
      failure('Failed to toggle SSO:', error, 'Failed to update SSO connection.');
    }
  };

  const deleteConnection = async () => {
    if (!deletingConnectionId) return;

    setIsDeleting(true);
    try {
      await sso.deleteConnection(deletingConnectionId);
      toast({
        title: 'Connection Deleted',
        description: 'SSO connection has been removed.',
      });
    } catch (error) {
      failure('Failed to delete connection:', error, 'Failed to delete SSO connection.');
    } finally {
      setIsDeleting(false);
      setDeletingConnectionId(null);
    }
  };

  const revokeSession = async (sessionId: string) => {
    try {
      await sso.revokeSession(sessionId);
      toast({
        title: 'Session Revoked',
        description: 'The session has been revoked.',
      });
    } catch (error) {
      failure('Failed to revoke session:', error, 'Failed to revoke session.');
    }
  };

  const revokeAllSessions = async () => {
    try {
      const count = await sso.revokeAllSessions();
      toast({
        title: 'All Sessions Revoked',
        description: `${count} active session${count === 1 ? ' has' : 's have'} been revoked.`,
      });
    } catch (error) {
      failure('Failed to revoke all sessions:', error, 'Failed to revoke sessions.');
    }
  };

  const disableMFA = async () => {
    try {
      await sso.disableMfa();
      toast({
        title: 'MFA Disabled',
        description: 'Two-factor authentication has been disabled.',
      });
    } catch (error) {
      failure('Failed to disable MFA:', error, 'Failed to disable MFA.');
    }
  };

  const getProviderBadge = (provider: string) => {
    const config: Record<string, { color: string; label: string }> = {
      saml: { color: 'bg-purple-500', label: 'SAML 2.0' },
      oauth_google: { color: 'bg-red-500', label: 'Google OAuth' },
      oauth_microsoft: { color: 'bg-blue-500', label: 'Microsoft OAuth' },
      oauth_github: { color: 'bg-gray-800', label: 'GitHub OAuth' },
      ldap: { color: 'bg-green-500', label: 'LDAP' },
    };

    const { color, label } = config[provider] || { color: 'bg-gray-500', label: provider };
    return <Badge className={`${color} text-white`}>{label}</Badge>;
  };

  const getMFATypeBadge = (type: string) => {
    const config: Record<string, { color: string; label: string }> = {
      totp: { color: 'bg-blue-500', label: 'Authenticator App' },
      sms: { color: 'bg-green-500', label: 'SMS' },
      email: { color: 'bg-purple-500', label: 'Email' },
      backup_codes: { color: 'bg-orange-500', label: 'Backup Codes' },
    };

    const { color, label } = config[type] || { color: 'bg-gray-500', label: type };
    return <Badge className={`${color} text-white`}>{label}</Badge>;
  };

  if (sso.isLoading) {
    return (
      <AccessiblePageWrapper pageTitle="SSO & Authentication">
      <DashboardLayout hasAccessibleWrapper title="SSO & Authentication">
        <DataTablePageSkeleton label="Loading authentication settings" />
      </DashboardLayout>
      </AccessiblePageWrapper>
    );
  }

  return (
    <AccessiblePageWrapper pageTitle="SSO & Authentication">
    <DashboardLayout hasAccessibleWrapper
      title="SSO & Authentication"
      description="Manage single sign-on, multi-factor authentication, and security settings"
      headerActions={
        <Button variant="outline" onClick={loadSSOData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      }
    >
      <div className="space-y-6">
        {sso.error ? (
          <ErrorState
            title="Authentication settings could not be loaded"
            error={sso.error}
            onRetry={loadSSOData}
          />
        ) : (
        <>
        {/* Tabs */}
        <Tabs defaultValue="sso" aria-label="SSO and authentication settings">
          <TabsList aria-label="Authentication categories">
            <TabsTrigger value="sso">SSO Connections ({ssoConnections.length})</TabsTrigger>
            <TabsTrigger value="sessions">Active Sessions ({userSessions.length})</TabsTrigger>
            <TabsTrigger value="mfa">
              MFA {userSecurity?.two_factor_enabled && <CheckCircle className="w-3 h-3 ml-1 text-green-500" />}
            </TabsTrigger>
          </TabsList>

          {/* SSO Connections Tab */}
          <TabsContent value="sso" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Configure enterprise single sign-on for your organization
              </p>
              <Button onClick={() => { setEditingConnection(null); setShowSSOForm(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add SSO Connection
              </Button>
            </div>

            {ssoConnections.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No SSO connections configured</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Set up SAML 2.0, OAuth, or LDAP authentication for your organization
                  </p>
                  <Button onClick={() => { setEditingConnection(null); setShowSSOForm(true); }}>
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
                          <p className="font-semibold">{connection.total_logins || 0}</p>
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
                        {connection.provider === 'saml' && !SAML_AVAILABLE && !connection.is_enabled ? (
                          <Button size="sm" variant="outline" disabled title={SAML_UNAVAILABLE_NOTICE}>
                            SAML unavailable
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant={connection.is_enabled ? 'outline' : 'default'}
                            onClick={() => toggleSSOConnection(connection.id, connection.is_enabled)}
                          >
                            {connection.is_enabled ? 'Disable' : 'Enable'}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setEditingConnection(connection); setShowSSOForm(true); }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeletingConnectionId(connection.id)}
                        >
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
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Manage your active sessions across devices
              </p>
              {userSessions.length > 1 && (
                <Button variant="outline" onClick={revokeAllSessions}>
                  <XCircle className="w-4 h-4 mr-2" />
                  Revoke All Sessions
                </Button>
              )}
            </div>

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
                            <Badge variant="outline" className="capitalize">
                              {session.device_type}
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              {session.auth_method}
                            </Badge>
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

                      <Button size="sm" variant="outline" onClick={() => revokeSession(session.id)}>
                        <XCircle className="w-4 h-4 mr-2" />
                        Revoke Session
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* MFA Tab */}
          <TabsContent value="mfa" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Secure your account with multi-factor authentication
              </p>
              {!userSecurity?.two_factor_enabled && (
                <Button onClick={() => setShowMFASetup(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Set Up MFA
                </Button>
              )}
            </div>

            {/* MFA Status Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        userSecurity?.two_factor_enabled ? 'bg-green-100' : 'bg-gray-100'
                      }`}
                    >
                      <Shield
                        className={`w-6 h-6 ${
                          userSecurity?.two_factor_enabled ? 'text-green-600' : 'text-gray-400'
                        }`}
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold">Two-Factor Authentication</h3>
                      <p className="text-sm text-muted-foreground">
                        {userSecurity?.two_factor_enabled
                          ? 'Your account is protected with 2FA'
                          : 'Add an extra layer of security to your account'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {userSecurity?.two_factor_enabled ? (
                      <>
                        <Badge className="bg-green-500 text-white">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Enabled
                        </Badge>
                        <Button variant="outline" size="sm" onClick={disableMFA}>
                          Disable
                        </Button>
                      </>
                    ) : (
                      <Button onClick={() => setShowMFASetup(true)}>
                        <Shield className="w-4 h-4 mr-2" />
                        Enable 2FA
                      </Button>
                    )}
                  </div>
                </div>

                {userSecurity?.two_factor_enabled && userSecurity.backup_codes && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      <strong>{userSecurity.backup_codes.length}</strong> backup codes remaining
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* MFA Devices List */}
            {mfaDevices.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold">Registered Devices</h4>
                {mfaDevices.map((device) => (
                  <Card key={device.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Smartphone className="w-5 h-5 text-muted-foreground" />
                            <h4 className="font-semibold">
                              {device.display_name || 'Authenticator App'}
                            </h4>
                            {getMFATypeBadge(device.mfa_type)}
                            {device.is_verified ? (
                              <Badge className="bg-green-500 text-white">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge className="bg-yellow-500 text-white">Pending</Badge>
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
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        </>
        )}
      </div>

      {/* SSO Configuration Dialog */}
      <AccessibleModal
        isOpen={showSSOForm}
        onClose={() => { setShowSSOForm(false); setEditingConnection(null); }}
        title={editingConnection ? 'Edit SSO Configuration' : 'Add SSO Configuration'}
        size="xl"
      >
        <SSOConfigurationForm
          existingConnection={editingConnection}
          onSuccess={() => {
            setShowSSOForm(false);
            setEditingConnection(null);
            loadSSOData();
          }}
          onCancel={() => {
            setShowSSOForm(false);
            setEditingConnection(null);
          }}
        />
      </AccessibleModal>

      {/* MFA Setup Dialog */}
      <AccessibleModal
        isOpen={showMFASetup}
        onClose={() => setShowMFASetup(false)}
        title="Set Up Multi-Factor Authentication"
        size="md"
      >
        <TOTPSetupScreen
          onComplete={() => {
            setShowMFASetup(false);
            loadSSOData();
          }}
          onSkip={() => setShowMFASetup(false)}
          showSkip={true}
        />
      </AccessibleModal>

      {/* Delete Confirmation Dialog */}
      <AccessibleModal
        isOpen={!!deletingConnectionId}
        onClose={() => setDeletingConnectionId(null)}
        title="Delete SSO Connection?"
        description="This action cannot be undone. Users who rely on this SSO connection will no longer be able to sign in using it."
        size="sm"
        disableClickOutside
        footer={
          <>
            <Button variant="outline" onClick={() => setDeletingConnectionId(null)} disabled={isDeleting}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={deleteConnection}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </>
        }
      />
    </DashboardLayout>
    </AccessiblePageWrapper>
  );
};

export default SSOManagement;
