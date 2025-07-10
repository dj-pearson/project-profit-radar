import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  Users, 
  Plus,
  Edit,
  Trash2,
  Mail,
  Phone,
  Calendar,
  Shield,
  UserCheck,
  UserX
} from 'lucide-react';

interface TeamMember {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone: string;
  is_active: boolean;
  last_login: string;
  created_at: string;
}

const TeamManagement = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  
  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteRole, setInviteRole] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    
    if (!loading && user && userProfile && !userProfile.company_id) {
      navigate('/setup');
    }
    
    // Only admins and root admins can access team management
    if (!loading && userProfile && !['admin', 'root_admin'].includes(userProfile.role)) {
      navigate('/dashboard');
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You don't have permission to access team management."
      });
      return;
    }
    
    if (userProfile?.company_id) {
      loadTeamMembers();
    }
  }, [user, userProfile, loading, navigate]);

  const loadTeamMembers = async () => {
    try {
      setLoadingTeam(true);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('company_id', userProfile?.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTeamMembers(data || []);
      
    } catch (error: any) {
      console.error('Error loading team members:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load team members"
      });
    } finally {
      setLoadingTeam(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);

    try {
      // Generate a secure temporary password
      const generatePassword = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < 16; i++) {
          password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
      };

      // For now, we'll create the user profile directly
      // In a real implementation, you'd want to send an invitation email
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: inviteEmail,
        password: generatePassword(), // Generate random secure password
        email_confirm: true,
        user_metadata: {
          first_name: inviteFirstName,
          last_name: inviteLastName,
          role: inviteRole
        }
      });

      if (authError) throw authError;

      // Create user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert([{
          id: authUser.user.id,
          email: inviteEmail,
          first_name: inviteFirstName,
          last_name: inviteLastName,
          role: inviteRole as any,
          phone: invitePhone || null,
          company_id: userProfile?.company_id,
          is_active: true
        }]);

      if (profileError) throw profileError;

      toast({
        title: "User Invited Successfully",
        description: `${inviteFirstName} ${inviteLastName} has been added to your team.`
      });

      // Reset form
      setInviteEmail('');
      setInviteFirstName('');
      setInviteLastName('');
      setInviteRole('');
      setInvitePhone('');
      setIsInviteOpen(false);
      
      // Reload team members
      loadTeamMembers();

    } catch (error: any) {
      console.error('Error inviting user:', error);
      toast({
        variant: "destructive",
        title: "Failed to Invite User",
        description: error.message || "An error occurred while inviting the user"
      });
    } finally {
      setInviteLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "User Status Updated",
        description: `User has been ${!currentStatus ? 'activated' : 'deactivated'}.`
      });

      loadTeamMembers();
    } catch (error: any) {
      console.error('Error updating user status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update user status"
      });
    }
  };

  if (loading || loadingTeam) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-construction-blue mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading team...</p>
        </div>
      </div>
    );
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'root_admin':
        return 'destructive';
      case 'admin':
        return 'default';
      case 'project_manager':
        return 'secondary';
      case 'field_supervisor':
        return 'outline';
      case 'accounting':
        return 'secondary';
      case 'office_staff':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'root_admin':
        return 'Root Admin';
      case 'admin':
        return 'Admin';
      case 'project_manager':
        return 'Project Manager';
      case 'field_supervisor':
        return 'Field Supervisor';
      case 'accounting':
        return 'Accounting';
      case 'office_staff':
        return 'Office Staff';
      case 'client_portal':
        return 'Client Portal';
      default:
        return role.charAt(0).toUpperCase() + role.slice(1);
    }
  };

  return (
    <DashboardLayout 
      title="Team Management"
      showTrialBanner={false}
    >
      <div className="flex justify-end mb-6">
            <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="shrink-0">
                  <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Invite User</span>
                  <span className="sm:hidden">Invite</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Add a new team member to your organization
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleInviteUser} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={inviteFirstName}
                        onChange={(e) => setInviteFirstName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={inviteLastName}
                        onChange={(e) => setInviteLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="role">Role *</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="project_manager">Project Manager</SelectItem>
                        <SelectItem value="field_supervisor">Field Supervisor</SelectItem>
                        <SelectItem value="accounting">Accounting</SelectItem>
                        <SelectItem value="office_staff">Office Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={invitePhone}
                      onChange={(e) => setInvitePhone(e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsInviteOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={inviteLoading || !inviteEmail || !inviteFirstName || !inviteLastName || !inviteRole}
                    >
                      {inviteLoading ? 'Inviting...' : 'Send Invite'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
        </div>
        
        {/* Team Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Members</p>
                  <p className="text-lg sm:text-2xl font-bold">{teamMembers.length}</p>
                </div>
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-construction-blue" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Active</p>
                  <p className="text-lg sm:text-2xl font-bold">{teamMembers.filter(m => m.is_active).length}</p>
                </div>
                <UserCheck className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Inactive</p>
                  <p className="text-lg sm:text-2xl font-bold">{teamMembers.filter(m => !m.is_active).length}</p>
                </div>
                <UserX className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Admins</p>
                  <p className="text-lg sm:text-2xl font-bold">
                    {teamMembers.filter(m => ['admin', 'root_admin'].includes(m.role)).length}
                  </p>
                </div>
                <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-construction-blue" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Members */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              Manage your team members, their roles, and access permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {teamMembers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No team members found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg space-y-3 sm:space-y-0">
                    <div className="flex items-center space-x-3 sm:space-x-4 w-full sm:w-auto">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-construction-blue rounded-full flex items-center justify-center text-white font-semibold shrink-0">
                        {member.first_name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-medium text-sm sm:text-base truncate">
                            {member.first_name && member.last_name 
                              ? `${member.first_name} ${member.last_name}`
                              : member.email
                            }
                          </h3>
                          <Badge variant={getRoleBadgeVariant(member.role)} className="text-xs">
                            {getRoleDisplayName(member.role)}
                          </Badge>
                          <Badge variant={member.is_active ? "default" : "secondary"} className="text-xs">
                            {member.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                          <span className="flex items-center truncate">
                            <Mail className="h-3 w-3 mr-1 shrink-0" />
                            <span className="truncate">{member.email}</span>
                          </span>
                          {member.phone && (
                            <span className="flex items-center">
                              <Phone className="h-3 w-3 mr-1 shrink-0" />
                              {member.phone}
                            </span>
                          )}
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1 shrink-0" />
                            Joined {new Date(member.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleUserStatus(member.id, member.is_active)}
                        disabled={member.id === user?.id} // Can't deactivate yourself
                      >
                        {member.is_active ? (
                          <>
                            <UserX className="h-4 w-4 mr-1" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-4 w-4 mr-1" />
                            Activate
                          </>
                        )}
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
    </DashboardLayout>
  );
};

export default TeamManagement;