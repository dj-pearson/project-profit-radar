import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Shield, 
  PlusCircle,
  ExternalLink,
  Edit,
  Trash2,
  Calendar,
  User,
  Building,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  DollarSign,
  Search
} from 'lucide-react';

interface EnvironmentalPermit {
  id: string;
  project_id?: string;
  permit_number: string;
  permit_name: string;
  permit_type: 'air_quality' | 'water_discharge' | 'storm_water' | 'wetlands' | 'endangered_species' | 'cultural_resources' | 'noise' | 'waste_management' | 'hazardous_materials' | 'nepa_assessment' | 'other';
  issuing_agency: 'epa' | 'state_epa' | 'army_corps' | 'usfws' | 'noaa' | 'state_wildlife' | 'local_authority' | 'tribal_authority' | 'other';
  agency_contact_name?: string;
  agency_contact_email?: string;
  agency_contact_phone?: string;
  description?: string;
  status: 'pending' | 'under_review' | 'approved' | 'conditional_approval' | 'denied' | 'expired' | 'suspended' | 'renewed';
  application_date?: string;
  review_start_date?: string;
  target_decision_date?: string;
  decision_date?: string;
  effective_date?: string;
  expiration_date?: string;
  application_fee?: number;
  annual_fee?: number;
  compliance_bond_amount?: number;
  created_at: string;
}

interface ProjectPermitsProps {
  projectId: string;
  onNavigate: (path: string) => void;
}

const permitTypes = [
  { value: 'air_quality', label: 'Air Quality', color: 'text-blue-600' },
  { value: 'water_discharge', label: 'Water Discharge', color: 'text-cyan-600' },
  { value: 'storm_water', label: 'Storm Water', color: 'text-indigo-600' },
  { value: 'wetlands', label: 'Wetlands', color: 'text-green-600' },
  { value: 'endangered_species', label: 'Endangered Species', color: 'text-emerald-600' },
  { value: 'cultural_resources', label: 'Cultural Resources', color: 'text-purple-600' },
  { value: 'noise', label: 'Noise', color: 'text-yellow-600' },
  { value: 'waste_management', label: 'Waste Management', color: 'text-orange-600' },
  { value: 'hazardous_materials', label: 'Hazardous Materials', color: 'text-red-600' },
  { value: 'nepa_assessment', label: 'NEPA Assessment', color: 'text-pink-600' },
  { value: 'other', label: 'Other', color: 'text-gray-600' }
];

const issuingAgencies = [
  { value: 'epa', label: 'EPA' },
  { value: 'state_epa', label: 'State EPA' },
  { value: 'army_corps', label: 'Army Corps of Engineers' },
  { value: 'usfws', label: 'US Fish & Wildlife Service' },
  { value: 'noaa', label: 'NOAA' },
  { value: 'state_wildlife', label: 'State Wildlife Agency' },
  { value: 'local_authority', label: 'Local Authority' },
  { value: 'tribal_authority', label: 'Tribal Authority' },
  { value: 'other', label: 'Other' }
];

export const ProjectPermits: React.FC<ProjectPermitsProps> = ({
  projectId,
  onNavigate
}) => {
  const { userProfile } = useAuth();
  const [permits, setPermits] = useState<EnvironmentalPermit[]>([]);
  const [filteredPermits, setFilteredPermits] = useState<EnvironmentalPermit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showAddPermit, setShowAddPermit] = useState(false);
  const [editingPermit, setEditingPermit] = useState<EnvironmentalPermit | null>(null);

  const [formData, setFormData] = useState({
    permit_number: '',
    permit_name: '',
    permit_type: 'air_quality' as const,
    issuing_agency: 'epa' as const,
    agency_contact_name: '',
    agency_contact_email: '',
    agency_contact_phone: '',
    description: '',
    status: 'pending' as const,
    application_date: '',
    review_start_date: '',
    target_decision_date: '',
    decision_date: '',
    effective_date: '',
    expiration_date: '',
    application_fee: '',
    annual_fee: '',
    compliance_bond_amount: ''
  });

  useEffect(() => {
    if (projectId && userProfile?.company_id) {
      loadPermits();
    }
  }, [projectId, userProfile?.company_id]);

  useEffect(() => {
    filterPermits();
  }, [permits, searchTerm, filterStatus]);

  const loadPermits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('environmental_permits')
        .select('*')
        .eq('project_id', projectId)
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

  const filterPermits = () => {
    let filtered = permits;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(permit =>
        permit.permit_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        permit.permit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        permit.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (filterStatus && filterStatus !== 'all') {
      filtered = filtered.filter(permit => permit.status === filterStatus);
    }

    setFilteredPermits(filtered);
  };

  const resetForm = () => {
    setFormData({
      permit_number: '',
      permit_name: '',
      permit_type: 'air_quality',
      issuing_agency: 'epa',
      agency_contact_name: '',
      agency_contact_email: '',
      agency_contact_phone: '',
      description: '',
      status: 'pending',
      application_date: '',
      review_start_date: '',
      target_decision_date: '',
      decision_date: '',
      effective_date: '',
      expiration_date: '',
      application_fee: '',
      annual_fee: '',
      compliance_bond_amount: ''
    });
  };

  const handleCreatePermit = async () => {
    try {
      const permitData = {
        ...formData,
        project_id: projectId,
        company_id: userProfile?.company_id,
        application_fee: formData.application_fee ? parseFloat(formData.application_fee) : null,
        annual_fee: formData.annual_fee ? parseFloat(formData.annual_fee) : null,
        compliance_bond_amount: formData.compliance_bond_amount ? parseFloat(formData.compliance_bond_amount) : null,
        application_date: formData.application_date || null,
        review_start_date: formData.review_start_date || null,
        target_decision_date: formData.target_decision_date || null,
        decision_date: formData.decision_date || null,
        effective_date: formData.effective_date || null,
        expiration_date: formData.expiration_date || null
      };

      const { data, error } = await supabase
        .from('environmental_permits')
        .insert([permitData])
        .select()
        .single();

      if (error) throw error;

      setPermits([data, ...permits]);
      resetForm();
      setShowAddPermit(false);

      toast({
        title: "Success",
        description: "Permit added successfully"
      });
    } catch (error: any) {
      console.error('Error creating permit:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to add permit"
      });
    }
  };

  const handleUpdatePermit = async () => {
    if (!editingPermit) return;

    try {
      const permitData = {
        ...formData,
        application_fee: formData.application_fee ? parseFloat(formData.application_fee) : null,
        annual_fee: formData.annual_fee ? parseFloat(formData.annual_fee) : null,
        compliance_bond_amount: formData.compliance_bond_amount ? parseFloat(formData.compliance_bond_amount) : null,
        application_date: formData.application_date || null,
        review_start_date: formData.review_start_date || null,
        target_decision_date: formData.target_decision_date || null,
        decision_date: formData.decision_date || null,
        effective_date: formData.effective_date || null,
        expiration_date: formData.expiration_date || null
      };

      const { data, error } = await supabase
        .from('environmental_permits')
        .update(permitData)
        .eq('id', editingPermit.id)
        .select()
        .single();

      if (error) throw error;

      setPermits(permits.map(p => p.id === editingPermit.id ? data : p));
      resetForm();
      setEditingPermit(null);

      toast({
        title: "Success",
        description: "Permit updated successfully"
      });
    } catch (error: any) {
      console.error('Error updating permit:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update permit"
      });
    }
  };

  const handleDeletePermit = async (permitId: string) => {
    try {
      const { error } = await supabase
        .from('environmental_permits')
        .delete()
        .eq('id', permitId);

      if (error) throw error;

      setPermits(permits.filter(p => p.id !== permitId));
      toast({
        title: "Success",
        description: "Permit deleted successfully"
      });
    } catch (error: any) {
      console.error('Error deleting permit:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete permit"
      });
    }
  };

  const startEdit = (permit: EnvironmentalPermit) => {
    setFormData({
      permit_number: permit.permit_number,
      permit_name: permit.permit_name,
      permit_type: permit.permit_type,
      issuing_agency: permit.issuing_agency,
      agency_contact_name: permit.agency_contact_name || '',
      agency_contact_email: permit.agency_contact_email || '',
      agency_contact_phone: permit.agency_contact_phone || '',
      description: permit.description || '',
      status: permit.status,
      application_date: permit.application_date || '',
      review_start_date: permit.review_start_date || '',
      target_decision_date: permit.target_decision_date || '',
      decision_date: permit.decision_date || '',
      effective_date: permit.effective_date || '',
      expiration_date: permit.expiration_date || '',
      application_fee: permit.application_fee?.toString() || '',
      annual_fee: permit.annual_fee?.toString() || '',
      compliance_bond_amount: permit.compliance_bond_amount?.toString() || ''
    });
    setEditingPermit(permit);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'conditional_approval': return 'secondary';
      case 'under_review': return 'secondary';
      case 'pending': return 'outline';
      case 'denied': return 'destructive';
      case 'expired': return 'destructive';
      case 'suspended': return 'destructive';
      case 'renewed': return 'success';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'conditional_approval': return <CheckCircle className="h-4 w-4 text-yellow-600" />;
      case 'under_review': return <Clock className="h-4 w-4 text-blue-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-gray-600" />;
      case 'denied': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'expired': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'suspended': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'renewed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      default: return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPermitTypeInfo = (type: string) => {
    return permitTypes.find(t => t.value === type) || permitTypes[permitTypes.length - 1];
  };

  const getAgencyInfo = (agency: string) => {
    return issuingAgencies.find(a => a.value === agency) || issuingAgencies[issuingAgencies.length - 1];
  };

  const formatCurrency = (amount?: number) => {
    return amount ? new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount) : 'N/A';
  };

  const getPermitStats = () => {
    const total = permits.length;
    const approved = permits.filter(p => p.status === 'approved' || p.status === 'conditional_approval').length;
    const pending = permits.filter(p => p.status === 'pending' || p.status === 'under_review').length;
    const expired = permits.filter(p => p.status === 'expired' || p.status === 'denied').length;
    const totalFees = permits.reduce((sum, p) => sum + (p.application_fee || 0) + (p.annual_fee || 0), 0);

    return { total, approved, pending, expired, totalFees };
  };

  const stats = getPermitStats();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Permits</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Fees</p>
                <p className="text-xl font-bold">{formatCurrency(stats.totalFees)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Permits List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Environmental Permits ({filteredPermits.length})
            </span>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={() => onNavigate(`/environmental-permitting?project=${projectId}`)}
                variant="outline"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Permit Management
              </Button>
              <Dialog open={showAddPermit} onOpenChange={setShowAddPermit}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Permit
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Add Environmental Permit</DialogTitle>
                    <DialogDescription>
                      Add a new environmental permit for this project
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="permit_number">Permit Number *</Label>
                        <Input
                          id="permit_number"
                          value={formData.permit_number}
                          onChange={(e) => setFormData({...formData, permit_number: e.target.value})}
                          placeholder="e.g., EPA-2024-001"
                        />
                      </div>
                      <div>
                        <Label htmlFor="permit_name">Permit Name *</Label>
                        <Input
                          id="permit_name"
                          value={formData.permit_name}
                          onChange={(e) => setFormData({...formData, permit_name: e.target.value})}
                          placeholder="e.g., Air Quality Permit"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="permit_type">Permit Type</Label>
                        <Select value={formData.permit_type} onValueChange={(value: any) => setFormData({...formData, permit_type: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {permitTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="issuing_agency">Issuing Agency</Label>
                        <Select value={formData.issuing_agency} onValueChange={(value: any) => setFormData({...formData, issuing_agency: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {issuingAgencies.map((agency) => (
                              <SelectItem key={agency.value} value={agency.value}>
                                {agency.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        placeholder="Permit description..."
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="agency_contact_name">Agency Contact</Label>
                        <Input
                          id="agency_contact_name"
                          value={formData.agency_contact_name}
                          onChange={(e) => setFormData({...formData, agency_contact_name: e.target.value})}
                          placeholder="Contact name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="agency_contact_email">Contact Email</Label>
                        <Input
                          id="agency_contact_email"
                          type="email"
                          value={formData.agency_contact_email}
                          onChange={(e) => setFormData({...formData, agency_contact_email: e.target.value})}
                          placeholder="contact@agency.gov"
                        />
                      </div>
                      <div>
                        <Label htmlFor="agency_contact_phone">Contact Phone</Label>
                        <Input
                          id="agency_contact_phone"
                          type="tel"
                          value={formData.agency_contact_phone}
                          onChange={(e) => setFormData({...formData, agency_contact_phone: e.target.value})}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select value={formData.status} onValueChange={(value: any) => setFormData({...formData, status: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="under_review">Under Review</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="conditional_approval">Conditional Approval</SelectItem>
                            <SelectItem value="denied">Denied</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                            <SelectItem value="renewed">Renewed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="application_date">Application Date</Label>
                        <Input
                          id="application_date"
                          type="date"
                          value={formData.application_date}
                          onChange={(e) => setFormData({...formData, application_date: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="target_decision_date">Target Decision</Label>
                        <Input
                          id="target_decision_date"
                          type="date"
                          value={formData.target_decision_date}
                          onChange={(e) => setFormData({...formData, target_decision_date: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="effective_date">Effective Date</Label>
                        <Input
                          id="effective_date"
                          type="date"
                          value={formData.effective_date}
                          onChange={(e) => setFormData({...formData, effective_date: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="expiration_date">Expiration Date</Label>
                        <Input
                          id="expiration_date"
                          type="date"
                          value={formData.expiration_date}
                          onChange={(e) => setFormData({...formData, expiration_date: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="application_fee">Application Fee</Label>
                        <Input
                          id="application_fee"
                          type="number"
                          step="0.01"
                          value={formData.application_fee}
                          onChange={(e) => setFormData({...formData, application_fee: e.target.value})}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="annual_fee">Annual Fee</Label>
                        <Input
                          id="annual_fee"
                          type="number"
                          step="0.01"
                          value={formData.annual_fee}
                          onChange={(e) => setFormData({...formData, annual_fee: e.target.value})}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="compliance_bond_amount">Bond Amount</Label>
                        <Input
                          id="compliance_bond_amount"
                          type="number"
                          step="0.01"
                          value={formData.compliance_bond_amount}
                          onChange={(e) => setFormData({...formData, compliance_bond_amount: e.target.value})}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => {
                        setShowAddPermit(false);
                        resetForm();
                      }}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCreatePermit}
                        disabled={!formData.permit_number || !formData.permit_name}
                      >
                        Add Permit
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardTitle>
          <CardDescription>Track environmental permits and regulatory compliance</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filter */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search permits..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="conditional_approval">Conditional Approval</SelectItem>
                <SelectItem value="denied">Denied</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="renewed">Renewed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredPermits.length > 0 ? (
            <div className="space-y-4">
              {filteredPermits.map((permit) => {
                const typeInfo = getPermitTypeInfo(permit.permit_type);
                const agencyInfo = getAgencyInfo(permit.issuing_agency);
                
                return (
                  <div key={permit.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Shield className={`h-5 w-5 ${typeInfo.color}`} />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{permit.permit_name}</span>
                            {getStatusIcon(permit.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">{permit.permit_number}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getStatusColor(permit.status) as any}>
                          {permit.status.replace('_', ' ')}
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => startEdit(permit)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeletePermit(permit.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Type:</span>
                        <p className="font-medium">{typeInfo.label}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Agency:</span>
                        <p className="font-medium">{agencyInfo.label}</p>
                      </div>
                      {permit.expiration_date && (
                        <div>
                          <span className="text-muted-foreground">Expires:</span>
                          <p className="font-medium">{new Date(permit.expiration_date).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>

                    {permit.description && (
                      <p className="text-sm">{permit.description}</p>
                    )}

                    {(permit.application_fee || permit.annual_fee || permit.compliance_bond_amount) && (
                      <div className="flex items-center space-x-4 text-sm">
                        {permit.application_fee && (
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">App Fee:</span>
                            <span>{formatCurrency(permit.application_fee)}</span>
                          </div>
                        )}
                        {permit.annual_fee && (
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Annual:</span>
                            <span>{formatCurrency(permit.annual_fee)}</span>
                          </div>
                        )}
                        {permit.compliance_bond_amount && (
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Bond:</span>
                            <span>{formatCurrency(permit.compliance_bond_amount)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {permit.agency_contact_name && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Contact:</span>
                        <span className="ml-1">{permit.agency_contact_name}</span>
                        {permit.agency_contact_email && (
                          <span className="ml-2">
                            <a href={`mailto:${permit.agency_contact_email}`} className="text-blue-600 hover:underline">
                              {permit.agency_contact_email}
                            </a>
                          </span>
                        )}
                        {permit.agency_contact_phone && (
                          <span className="ml-2">
                            <a href={`tel:${permit.agency_contact_phone}`} className="text-blue-600 hover:underline">
                              {permit.agency_contact_phone}
                            </a>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterStatus !== 'all' 
                  ? 'No permits match your search criteria'
                  : 'No permits added for this project yet'
                }
              </p>
              {!searchTerm && filterStatus === 'all' && (
                <Button onClick={() => setShowAddPermit(true)} variant="outline">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add First Permit
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Permit Dialog */}
      <Dialog open={!!editingPermit} onOpenChange={() => setEditingPermit(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Permit</DialogTitle>
            <DialogDescription>
              Update permit information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {/* Same form fields as add permit dialog */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_permit_number">Permit Number *</Label>
                <Input
                  id="edit_permit_number"
                  value={formData.permit_number}
                  onChange={(e) => setFormData({...formData, permit_number: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit_permit_name">Permit Name *</Label>
                <Input
                  id="edit_permit_name"
                  value={formData.permit_name}
                  onChange={(e) => setFormData({...formData, permit_name: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_permit_type">Permit Type</Label>
                <Select value={formData.permit_type} onValueChange={(value: any) => setFormData({...formData, permit_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {permitTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_issuing_agency">Issuing Agency</Label>
                <Select value={formData.issuing_agency} onValueChange={(value: any) => setFormData({...formData, issuing_agency: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {issuingAgencies.map((agency) => (
                      <SelectItem key={agency.value} value={agency.value}>
                        {agency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_status">Status</Label>
                <Select value={formData.status} onValueChange={(value: any) => setFormData({...formData, status: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="conditional_approval">Conditional Approval</SelectItem>
                    <SelectItem value="denied">Denied</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="renewed">Renewed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_expiration_date">Expiration Date</Label>
                <Input
                  id="edit_expiration_date"
                  type="date"
                  value={formData.expiration_date}
                  onChange={(e) => setFormData({...formData, expiration_date: e.target.value})}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setEditingPermit(null);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdatePermit}
                disabled={!formData.permit_number || !formData.permit_name}
              >
                Update Permit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
