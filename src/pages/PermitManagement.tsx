import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PermitForm } from '@/components/permits/PermitForm';
import { 
  Plus, 
  Search, 
  Filter,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Building,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Permit {
  id: string;
  project_id: string;
  permit_name: string;
  permit_type: string;
  permit_number: string;
  issuing_authority: string;
  application_status: string;
  application_date: string;
  approval_date: string;
  permit_expiry_date: string;
  priority: string;
  application_fee: number;
  permit_fee: number;
  project: {
    name: string;
  };
}

export default function PermitManagement() {
  const { userProfile } = useAuth();
  const [permits, setPermits] = useState<Permit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedPermit, setSelectedPermit] = useState<Permit | null>(null);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    loadPermits();
    loadProjects();
  }, []);

  const loadPermits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('permits')
        .select(`
          *,
          project:projects(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPermits(data || []);
    } catch (error: any) {
      console.error('Error loading permits:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load permits"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('company_id', userProfile?.company_id)
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not_applied':
        return 'bg-gray-500';
      case 'preparing':
        return 'bg-blue-500';
      case 'submitted':
        return 'bg-yellow-500';
      case 'under_review':
        return 'bg-orange-500';
      case 'approved':
        return 'bg-green-500';
      case 'denied':
        return 'bg-red-500';
      case 'expired':
        return 'bg-red-600';
      case 'cancelled':
        return 'bg-gray-600';
      default:
        return 'bg-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-400';
    }
  };

  const filteredPermits = permits.filter(permit => {
    const matchesSearch = permit.permit_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         permit.permit_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         permit.issuing_authority.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         permit.permit_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || permit.application_status === statusFilter;
    const matchesProject = projectFilter === 'all' || permit.project_id === projectFilter;
    
    return matchesSearch && matchesStatus && matchesProject;
  });

  const totalPermits = permits.length;
  const pendingPermits = permits.filter(p => ['preparing', 'submitted', 'under_review'].includes(p.application_status)).length;
  const approvedPermits = permits.filter(p => p.application_status === 'approved').length;
  const expiringPermits = permits.filter(p => {
    if (!p.permit_expiry_date) return false;
    const expiryDate = new Date(p.permit_expiry_date);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiryDate <= thirtyDaysFromNow && expiryDate >= new Date();
  }).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading permits...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout title="Permit Management">
      <div className="flex justify-end mb-6">
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Permit
        </Button>
      </div>
      
      <div className="space-y-6">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Permits</p>
                <p className="text-2xl font-bold">{totalPermits}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingPermits}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">{approvedPermits}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Expiring Soon</p>
                <p className="text-2xl font-bold">{expiringPermits}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search permits..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="not_applied">Not Applied</SelectItem>
                  <SelectItem value="preparing">Preparing</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="denied">Denied</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permits List */}
      <div className="space-y-4">
        {filteredPermits.map((permit) => (
          <Card key={permit.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{permit.permit_name}</CardTitle>
                  <CardDescription>
                    {permit.permit_type} • {permit.issuing_authority}
                    {permit.project?.name && ` • ${permit.project.name}`}
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getPriorityColor(permit.priority)}>
                    {permit.priority.toUpperCase()}
                  </Badge>
                  <Badge className={getStatusColor(permit.application_status)}>
                    {permit.application_status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground">Permit Number</p>
                  <p>{permit.permit_number || 'Not assigned'}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Application Date</p>
                  <p>{permit.application_date ? new Date(permit.application_date).toLocaleDateString() : 'Not applied'}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Approval Date</p>
                  <p>{permit.approval_date ? new Date(permit.approval_date).toLocaleDateString() : 'Pending'}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">Expiry Date</p>
                  <p>{permit.permit_expiry_date ? new Date(permit.permit_expiry_date).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>

              {(permit.application_fee > 0 || permit.permit_fee > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-muted-foreground">Application Fee</p>
                    <p>${permit.application_fee?.toLocaleString() || '0'}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Permit Fee</p>
                    <p>${permit.permit_fee?.toLocaleString() || '0'}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedPermit(permit);
                    setShowForm(true);
                  }}
                >
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPermits.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No permits found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== 'all' || projectFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'No permits have been added yet'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && projectFilter === 'all' && (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Permit
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Permit Form Modal */}
      {showForm && (
        <PermitForm
          permit={selectedPermit}
          onClose={() => {
            setShowForm(false);
            setSelectedPermit(null);
          }}
          onSave={() => {
            setShowForm(false);
            setSelectedPermit(null);
            loadPermits();
          }}
        />
      )}
      </div>
    </DashboardLayout>
  );
}