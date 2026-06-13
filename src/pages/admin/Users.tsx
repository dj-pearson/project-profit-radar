import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { RoleGuard, ROLE_GROUPS } from '@/components/auth/RoleGuard';
import { AccessibleTable, type TableColumn } from '@/components/accessibility/AccessibleTable';
import { AccessibleModal } from '@/components/accessibility/AccessibleModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useImpersonation } from '@/hooks/useImpersonation';
import {
  Users,
  Search,
  Filter,
  UserCheck,
  UserX,
  Calendar,
  Building2,
  Mail,
  Phone,
  Eye,
  UserCog
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: string;
  is_active: boolean;
  last_login: string;
  created_at: string;
  companies?: {
    id: string;
    name: string;
  };
}

const UsersPage = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  const { startImpersonation, loading: impersonationLoading } = useImpersonation();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loadingData, setLoadingData] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isImpersonateDialogOpen, setIsImpersonateDialogOpen] = useState(false);
  const [impersonationReason, setImpersonationReason] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }

    if (!loading && userProfile && userProfile.role !== 'root_admin') {
      navigate('/dashboard');
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Only root administrators can access this page."
      });
      return;
    }

    if (userProfile?.role === 'root_admin') {
      loadUsers();
    }
  }, [user, userProfile, loading, navigate]);

  const loadUsers = async () => {
    try {
      setLoadingData(true);

      const { data: usersData, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          companies (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUsers(usersData || []);
    } catch (error: any) {
      console.error('Error loading users:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load users"
      });
    } finally {
      setLoadingData(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'root_admin':
        return <Badge variant="destructive">Root Admin</Badge>;
      case 'admin':
        return <Badge className="bg-blue-500">Admin</Badge>;
      case 'project_manager':
        return <Badge className="bg-green-500">Project Manager</Badge>;
      case 'field_supervisor':
        return <Badge className="bg-orange-500">Field Supervisor</Badge>;
      case 'office_staff':
        return <Badge variant="secondary">Office Staff</Badge>;
      case 'accounting':
        return <Badge className="bg-purple-500">Accounting</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getStatusBadge = (isActive: boolean, lastLogin: string) => {
    if (!isActive) {
      return <Badge variant="destructive">Inactive</Badge>;
    }

    const daysSinceLogin = lastLogin
      ? Math.floor((new Date().getTime() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    if (!lastLogin) {
      return <Badge variant="outline">Never Logged In</Badge>;
    } else if (daysSinceLogin && daysSinceLogin < 7) {
      return <Badge className="bg-green-500">Active</Badge>;
    } else if (daysSinceLogin && daysSinceLogin < 30) {
      return <Badge variant="secondary">Recently Active</Badge>;
    } else {
      return <Badge variant="outline">Inactive</Badge>;
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.companies?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' ||
                         (filterStatus === 'active' && user.is_active) ||
                         (filterStatus === 'inactive' && !user.is_active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `User ${!currentStatus ? 'activated' : 'deactivated'} successfully`
      });

      loadUsers();
    } catch (error: any) {
      console.error('Error updating user status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update user status"
      });
    }
  };

  const handleImpersonateClick = (userItem: UserProfile) => {
    setSelectedUser(userItem);
    setImpersonationReason('');
    setIsImpersonateDialogOpen(true);
  };

  const handleStartImpersonation = async () => {
    if (!selectedUser) return;

    const success = await startImpersonation(selectedUser.id, impersonationReason);

    if (success) {
      setIsImpersonateDialogOpen(false);
      setImpersonationReason('');
    }
  };

  if (loading || loadingData) {
    return (
      <DashboardLayout title="Users" showTrialBanner={false}>
        <div className="space-y-6" role="status" aria-live="polite" aria-label="Loading content">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}
            </div>
            <div className="h-[300px] bg-muted animate-pulse rounded-lg" />
          </div>
      </DashboardLayout>
    );
  }

  return (
    <RoleGuard allowedRoles={ROLE_GROUPS.ADMINS}>
      <DashboardLayout title="Users" showTrialBanner={false}>
        <div className="space-y-6">
        {/* Filters */}
        <section className="flex flex-col sm:flex-row gap-4" aria-label="User filters">
          <div className="flex-1" role="search" aria-label="Search users">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" aria-hidden="true" />
              <Input
                placeholder="Search users by name, email, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                aria-label="Search users by name, email, or company"
              />
            </div>
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="root_admin">Root Admin</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="project_manager">Project Manager</SelectItem>
              <SelectItem value="field_supervisor">Field Supervisor</SelectItem>
              <SelectItem value="office_staff">Office Staff</SelectItem>
              <SelectItem value="accounting">Accounting</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </section>

        {/* Users Table */}
        {(() => {
          const userColumns: TableColumn<UserProfile>[] = [
            {
              key: 'first_name',
              header: 'Name',
              sortable: true,
              render: (_, row) => (
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {row.first_name?.[0]}{row.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">
                    {row.first_name && row.last_name
                      ? `${row.first_name} ${row.last_name}`
                      : row.email}
                  </span>
                </div>
              ),
            },
            {
              key: 'email',
              header: 'Email',
              hideOnMobile: true,
              render: (value) => (
                <span className="flex items-center gap-1 text-sm">
                  <Mail className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                  {value}
                </span>
              ),
            },
            {
              key: 'role',
              header: 'Role',
              sortable: true,
              render: (value) => getRoleBadge(value),
            },
            {
              key: 'is_active',
              header: 'Status',
              sortable: true,
              render: (_, row) => getStatusBadge(row.is_active, row.last_login),
            },
            {
              key: 'companies',
              header: 'Company',
              hideOnMobile: true,
              render: (value) => (
                <span className="flex items-center gap-1 text-sm">
                  <Building2 className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                  {value?.name || 'No company'}
                </span>
              ),
            },
            {
              key: 'created_at',
              header: 'Joined',
              hideOnMobile: true,
              sortable: true,
              render: (value) => (
                <span className="text-sm text-muted-foreground">
                  {new Date(value).toLocaleDateString()}
                </span>
              ),
            },
            {
              key: 'actions',
              header: 'Actions',
              headerRender: () => <span className="sr-only">Actions</span>,
              render: (_, row) => (
                <div className="flex items-center space-x-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedUser(row);
                      setIsDetailDialogOpen(true);
                    }}
                    aria-label={`View details for ${row.first_name || row.email}`}
                  >
                    <Eye className="h-3 w-3" aria-hidden="true" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => { e.stopPropagation(); handleImpersonateClick(row); }}
                    disabled={row.id === user?.id}
                    title={row.id === user?.id ? "Cannot impersonate yourself" : "Impersonate this user"}
                    aria-label={`Impersonate ${row.first_name || row.email}`}
                  >
                    <UserCog className="h-3 w-3" aria-hidden="true" />
                  </Button>
                  <Button
                    size="sm"
                    variant={row.is_active ? "destructive" : "default"}
                    onClick={(e) => { e.stopPropagation(); toggleUserStatus(row.id, row.is_active); }}
                    aria-label={row.is_active ? `Deactivate ${row.first_name || row.email}` : `Activate ${row.first_name || row.email}`}
                  >
                    {row.is_active ? (
                      <UserX className="h-3 w-3" aria-hidden="true" />
                    ) : (
                      <UserCheck className="h-3 w-3" aria-hidden="true" />
                    )}
                  </Button>
                </div>
              ),
            },
          ];

          return (
            <AccessibleTable<UserProfile>
              caption={`Platform Users (${filteredUsers.length})`}
              hideCaption
              columns={userColumns}
              data={filteredUsers}
              loading={loadingData}
              emptyContent={
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                  <h3 className="text-lg font-medium mb-2">No Users Found</h3>
                  <p className="text-muted-foreground">No users match your current filters.</p>
                </div>
              }
            />
          );
        })()}
      </div>

      {/* User Detail Modal */}
      <AccessibleModal
        isOpen={isDetailDialogOpen}
        onClose={() => setIsDetailDialogOpen(false)}
        title="User Details"
        description={`Detailed information about ${selectedUser?.first_name || ''} ${selectedUser?.last_name || ''}`}
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg">
                  {selectedUser.first_name?.[0]}{selectedUser.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-medium">
                  {selectedUser.first_name} {selectedUser.last_name}
                </h3>
                <div className="flex space-x-2 mt-1">
                  {getRoleBadge(selectedUser.role)}
                  {getStatusBadge(selectedUser.is_active, selectedUser.last_login)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                <p className="text-sm">{selectedUser.email}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                <p className="text-sm">{selectedUser.phone || 'Not provided'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Company</Label>
                <p className="text-sm">{selectedUser.companies?.name || 'No company assigned'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Role</Label>
                <p className="text-sm">{selectedUser.role.replace('_', ' ').toUpperCase()}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                <p className="text-sm">{selectedUser.is_active ? 'Active' : 'Inactive'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Last Login</Label>
                <p className="text-sm">
                  {selectedUser.last_login
                    ? new Date(selectedUser.last_login).toLocaleDateString()
                    : 'Never'
                  }
                </p>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-muted-foreground">Member Since</Label>
              <p className="text-sm">
                {new Date(selectedUser.created_at).toLocaleDateString()}
                ({Math.floor((new Date().getTime() - new Date(selectedUser.created_at).getTime()) / (1000 * 60 * 60 * 24))} days ago)
              </p>
            </div>
          </div>
        )}
      </AccessibleModal>

      {/* Impersonation Modal */}
      <AccessibleModal
        isOpen={isImpersonateDialogOpen}
        onClose={() => setIsImpersonateDialogOpen(false)}
        title="Impersonate User"
        description={`Enter a detailed reason for impersonating ${selectedUser?.first_name || ''} ${selectedUser?.last_name || ''}. All actions will be logged for security.`}
        size="md"
        disableClickOutside
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setIsImpersonateDialogOpen(false)}
              disabled={impersonationLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStartImpersonation}
              disabled={impersonationLoading || impersonationReason.trim().length < 10}
            >
              {impersonationLoading ? 'Starting...' : 'Start Impersonation'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="impersonation-reason">Reason for Impersonation</Label>
            <Textarea
              id="impersonation-reason"
              placeholder="e.g., Investigating reported bug with project creation, reproducing error for support ticket #1234, etc."
              value={impersonationReason}
              onChange={(e) => setImpersonationReason(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Minimum 10 characters required. Be specific about why you need to impersonate this user.
            </p>
          </div>

          <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded p-3">
            <div className="flex items-start space-x-2">
              <UserCog className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5" />
              <div className="text-xs text-orange-900 dark:text-orange-100">
                <p className="font-medium mb-1">Security Notice:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>You will see the platform exactly as this user sees it</li>
                  <li>All actions will be logged with your admin account</li>
                  <li>The user will be notified of this access</li>
                  <li>Session can be ended at any time from the banner</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </AccessibleModal>
    </DashboardLayout>
    </RoleGuard>
  );
};

export default UsersPage;
