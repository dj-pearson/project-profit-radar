import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Shield,
  Lock,
  Users,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  Trash2,
  Search,
  AlertCircle,
  Clock,
  FileText,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface Permission {
  id: string;
  name: string;
  resource_type: string;
  action: string;
  description: string;
  category: string;
  is_dangerous: boolean;
}

interface CustomRole {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description: string;
  is_system_role: boolean;
  is_active: boolean;
  permission_count: number;
  user_count: number;
  created_at: string;
}

interface UserPermission {
  id: string;
  user_id: string;
  permission_name: string;
  resource_type: string;
  resource_id: string;
  granted_by_user_id: string;
  expires_at: string;
  reason: string;
  created_at: string;
  user_email?: string;
  granted_by_email?: string;
}

interface PermissionAuditLog {
  id: string;
  user_id: string;
  permission_name: string;
  action: string;
  resource_type: string;
  resource_id: string;
  changed_by_user_id: string;
  reason: string;
  metadata: any;
  created_at: string;
  user_email?: string;
  changed_by_email?: string;
}

export const PermissionManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [auditLogs, setAuditLogs] = useState<PermissionAuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // New role form state
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  useEffect(() => {
    loadPermissionData();
  }, []);

  const loadPermissionData = async () => {
    setLoading(true);
    try {
      // Load all permissions
      const { data: permissionsData, error: permissionsError } = await (supabase as any)
        .from('permissions')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (permissionsError) throw permissionsError;
      setPermissions(permissionsData || []);

      // Load custom roles with counts
      const { data: rolesData, error: rolesError } = await (supabase as any)
        .from('custom_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (rolesError) throw rolesError;

      // Get permission and user counts for each role
      const rolesWithCounts = await Promise.all(
        (rolesData || []).map(async (role) => {
          const { count: permCount } = await (supabase as any)
            .from('role_permissions')
            .select('*', { count: 'exact', head: true })
            .eq('role_id', role.id);

          const { count: userCount } = await (supabase as any)
            .from('tenant_users')
            .select('*', { count: 'exact', head: true })
            .contains('custom_roles', [role.id]);

          return {
            ...role,
            permission_count: permCount || 0,
            user_count: userCount || 0,
          };
        })
      );

      setCustomRoles(rolesWithCounts as any);

      // Load user permissions
      const { data: userPermsData, error: userPermsError } = await (supabase as any)
        .from('user_permissions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (userPermsError) throw userPermsError;
      setUserPermissions((userPermsData as any) || []);

      // Load audit logs
      const { data: auditData, error: auditError } = await (supabase as any)
        .from('permission_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (auditError) throw auditError;
      setAuditLogs((auditData as any) || []);
    } catch (error) {
      console.error('Failed to load permission data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load permission data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createCustomRole = async () => {
    if (!newRoleName || selectedPermissions.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a role name and select at least one permission.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Create role
      const { data: role, error: roleError } = await (supabase as any)
        .from('custom_roles')
        .insert({
          name: newRoleName,
          slug: newRoleName.toLowerCase().replace(/\s+/g, '_'),
          description: newRoleDescription,
          is_system_role: false,
          is_active: true,
        })
        .select()
        .single();

      if (roleError) throw roleError;

      // Add permissions to role
      const rolePermissions = selectedPermissions.map((permId) => ({
        role_id: role.id,
        permission_id: permId,
      }));

      const { error: permError } = await (supabase as any)
        .from('role_permissions')
        .insert(rolePermissions);

      if (permError) throw permError;

      toast({
        title: 'Role Created',
        description: `Custom role "${newRoleName}" has been created with ${selectedPermissions.length} permissions.`,
      });

      // Reset form
      setShowCreateRole(false);
      setNewRoleName('');
      setNewRoleDescription('');
      setSelectedPermissions([]);
      loadPermissionData();
    } catch (error) {
      console.error('Failed to create role:', error);
      toast({
        title: 'Error',
        description: 'Failed to create custom role.',
        variant: 'destructive',
      });
    }
  };

  const toggleRoleStatus = async (roleId: string, currentStatus: boolean) => {
    try {
      const { error } = await (supabase as any)
        .from('custom_roles')
        .update({ is_active: !currentStatus })
        .eq('id', roleId);

      if (error) throw error;

      toast({
        title: currentStatus ? 'Role Disabled' : 'Role Enabled',
        description: currentStatus
          ? 'Role has been disabled.'
          : 'Role is now active.',
      });

      loadPermissionData();
    } catch (error) {
      console.error('Failed to toggle role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update role status.',
        variant: 'destructive',
      });
    }
  };

  const deleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(`Are you sure you want to delete the role "${roleName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from('custom_roles')
        .delete()
        .eq('id', roleId);

      if (error) throw error;

      toast({
        title: 'Role Deleted',
        description: `Role "${roleName}" has been deleted.`,
      });

      loadPermissionData();
    } catch (error) {
      console.error('Failed to delete role:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete role.',
        variant: 'destructive',
      });
    }
  };

  const togglePermissionSelection = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const getActionBadge = (action: string) => {
    const config = {
      read: { color: 'bg-blue-500', label: 'Read' },
      write: { color: 'bg-green-500', label: 'Write' },
      delete: { color: 'bg-red-500', label: 'Delete' },
      admin: { color: 'bg-purple-500', label: 'Admin' },
      approve: { color: 'bg-yellow-500', label: 'Approve' },
      send: { color: 'bg-indigo-500', label: 'Send' },
      export: { color: 'bg-teal-500', label: 'Export' },
    };

    const { color, label } = config[action as keyof typeof config] || {
      color: 'bg-gray-500',
      label: action,
    };
    return <Badge className={`${color} text-white text-xs`}>{label}</Badge>;
  };

  const getCategoryBadge = (category: string) => {
    const config = {
      projects: { color: 'bg-blue-500', icon: '📁' },
      financial: { color: 'bg-green-500', icon: '💰' },
      team: { color: 'bg-purple-500', icon: '👥' },
      documents: { color: 'bg-orange-500', icon: '📄' },
      reports: { color: 'bg-teal-500', icon: '📊' },
      admin: { color: 'bg-red-500', icon: '⚙️' },
    };

    const { color, icon } = config[category as keyof typeof config] || {
      color: 'bg-gray-500',
      icon: '🔧',
    };
    return (
      <Badge className={`${color} text-white`}>
        {icon} {category}
      </Badge>
    );
  };

  const filteredPermissions = permissions.filter((perm) => {
    const matchesSearch =
      perm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      perm.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || perm.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Array.from(new Set(permissions.map((p) => p.category)))];

  if (loading) {
    return (
      <DashboardLayout title="Permission Management">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Shield className="w-12 h-12 text-construction-orange animate-pulse mx-auto mb-4" />
            <p className="text-muted-foreground">Loading permissions...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Permission Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-construction-dark flex items-center gap-2">
              <Shield className="w-8 h-8 text-construction-orange" />
              Permission Management
            </h1>
            <p className="text-muted-foreground">
              Manage custom roles, permissions, and access control
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Permissions</p>
                  <p className="text-2xl font-bold">{permissions.length}</p>
                </div>
                <Lock className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Custom Roles</p>
                  <p className="text-2xl font-bold">
                    {customRoles.filter((r) => !r.is_system_role).length}
                  </p>
                </div>
                <Users className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Roles</p>
                  <p className="text-2xl font-bold">
                    {customRoles.filter((r) => r.is_active).length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-construction-orange" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Audit Logs</p>
                  <p className="text-2xl font-bold">{auditLogs.length}</p>
                </div>
                <FileText className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="permissions">
          <TabsList>
            <TabsTrigger value="permissions">
              All Permissions ({permissions.length})
            </TabsTrigger>
            <TabsTrigger value="roles">Custom Roles ({customRoles.length})</TabsTrigger>
            <TabsTrigger value="user-perms">
              User Permissions ({userPermissions.length})
            </TabsTrigger>
            <TabsTrigger value="audit">Audit Log ({auditLogs.length})</TabsTrigger>
          </TabsList>

          {/* All Permissions Tab */}
          <TabsContent value="permissions" className="space-y-4">
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search permissions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    size="sm"
                    variant={selectedCategory === cat ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat === 'all' ? 'All' : cat}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {filteredPermissions.map((permission) => (
                <Card key={permission.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <code className="text-sm font-mono font-semibold">
                            {permission.name}
                          </code>
                          {getActionBadge(permission.action)}
                          {getCategoryBadge(permission.category)}
                          {permission.is_dangerous && (
                            <Badge className="bg-red-500 text-white">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Dangerous
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {permission.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Resource: <span className="font-mono">{permission.resource_type}</span>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredPermissions.length === 0 && (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No permissions found</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Custom Roles Tab */}
          <TabsContent value="roles" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Create and manage custom roles with specific permissions
              </p>
              <Button onClick={() => setShowCreateRole(!showCreateRole)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Custom Role
              </Button>
            </div>

            {showCreateRole && (
              <Card>
                <CardHeader>
                  <CardTitle>Create New Role</CardTitle>
                  <CardDescription>
                    Define a custom role with specific permissions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Role Name</Label>
                    <Input
                      placeholder="e.g., Project Coordinator"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Describe what this role can do..."
                      value={newRoleDescription}
                      onChange={(e) => setNewRoleDescription(e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label>Select Permissions ({selectedPermissions.length} selected)</Label>
                    <div className="border rounded-lg p-4 max-h-96 overflow-y-auto mt-2">
                      {categories
                        .filter((cat) => cat !== 'all')
                        .map((category) => {
                          const categoryPerms = permissions.filter(
                            (p) => p.category === category
                          );
                          return (
                            <div key={category} className="mb-4">
                              <h4 className="font-semibold mb-2 flex items-center gap-2">
                                {getCategoryBadge(category)}
                                {category.toUpperCase()}
                              </h4>
                              <div className="space-y-2 ml-4">
                                {categoryPerms.map((perm) => (
                                  <div key={perm.id} className="flex items-center gap-2">
                                    <Checkbox
                                      checked={selectedPermissions.includes(perm.id)}
                                      onCheckedChange={() =>
                                        togglePermissionSelection(perm.id)
                                      }
                                    />
                                    <code className="text-xs font-mono">{perm.name}</code>
                                    {getActionBadge(perm.action)}
                                    {perm.is_dangerous && (
                                      <AlertCircle className="w-3 h-3 text-red-500" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={createCustomRole}>Create Role</Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCreateRole(false);
                        setSelectedPermissions([]);
                        setNewRoleName('');
                        setNewRoleDescription('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {customRoles.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No custom roles created</p>
                  <Button onClick={() => setShowCreateRole(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Role
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {customRoles.map((role) => (
                  <Card key={role.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{role.name}</h3>
                            {role.is_active ? (
                              <Badge className="bg-green-500 text-white">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Active
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-500 text-white">
                                <XCircle className="w-3 h-3 mr-1" />
                                Inactive
                              </Badge>
                            )}
                            {role.is_system_role && (
                              <Badge className="bg-blue-500 text-white">System Role</Badge>
                            )}
                          </div>
                          {role.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {role.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Permissions</p>
                          <p className="font-semibold">{role.permission_count}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Users</p>
                          <p className="font-semibold">{role.user_count}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Created</p>
                          <p className="font-semibold">
                            {new Date(role.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {!role.is_system_role && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={role.is_active ? 'outline' : 'default'}
                            onClick={() => toggleRoleStatus(role.id, role.is_active)}
                          >
                            {role.is_active ? 'Disable' : 'Enable'}
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteRole(role.id, role.name)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* User Permissions Tab */}
          <TabsContent value="user-perms" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Direct user permissions and temporary grants
              </p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Grant Permission
              </Button>
            </div>

            {userPermissions.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No direct user permissions granted</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {userPermissions.map((perm) => (
                  <Card key={perm.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <code className="text-sm font-mono font-semibold">
                              {perm.permission_name}
                            </code>
                            {perm.expires_at && (
                              <Badge className="bg-yellow-500 text-white">
                                <Clock className="w-3 h-3 mr-1" />
                                Temporary
                              </Badge>
                            )}
                          </div>
                          {perm.reason && (
                            <p className="text-sm text-muted-foreground">{perm.reason}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Resource</p>
                          <p className="text-sm font-mono">{perm.resource_type || 'All'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Expires</p>
                          <p className="text-sm">
                            {perm.expires_at
                              ? new Date(perm.expires_at).toLocaleDateString()
                              : 'Never'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Granted</p>
                          <p className="text-sm">
                            {new Date(perm.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <Button size="sm" variant="outline">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Revoke
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Complete audit trail of all permission changes
            </p>

            {auditLogs.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No audit logs recorded</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <Card key={log.id}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <Badge
                              className={
                                log.action === 'grant'
                                  ? 'bg-green-500 text-white'
                                  : log.action === 'revoke'
                                  ? 'bg-red-500 text-white'
                                  : 'bg-blue-500 text-white'
                              }
                            >
                              {log.action}
                            </Badge>
                            <code className="text-xs font-mono">{log.permission_name}</code>
                            {log.resource_type && (
                              <span className="text-xs text-muted-foreground">
                                on {log.resource_type}
                              </span>
                            )}
                          </div>
                          {log.reason && (
                            <p className="text-sm text-muted-foreground">{log.reason}</p>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
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

export default PermissionManagement;
