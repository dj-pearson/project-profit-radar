import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RoleGuard, ROLE_GROUPS } from '@/components/auth/RoleGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Plus, 
  Search,
  Building2,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Vendor {
  id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  payment_terms: string;
  is_active: boolean;
  notes: string | null;
}

const Vendors = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    payment_terms: 'Net 30',
    notes: ''
  });
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadVendors();
  }, [userProfile?.company_id]);

  const loadVendors = async () => {
    if (!userProfile?.company_id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('name');

      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      console.error('Error loading vendors:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load vendors"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      payment_terms: 'Net 30',
      notes: ''
    });
    setEditingVendor(null);
  };

  const openEditDialog = (vendor: Vendor) => {
    setFormData({
      name: vendor.name,
      contact_person: vendor.contact_person || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      address: vendor.address || '',
      payment_terms: vendor.payment_terms,
      notes: vendor.notes || ''
    });
    setEditingVendor(vendor);
    setShowAddDialog(true);
  };

  const saveVendor = async () => {
    if (!userProfile?.company_id || !formData.name.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Vendor name is required"
      });
      return;
    }

    try {
      const vendorData = {
        company_id: userProfile.company_id,
        name: formData.name.trim(),
        contact_person: formData.contact_person || null,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        payment_terms: formData.payment_terms,
        notes: formData.notes || null,
        created_by: userProfile.id
      };

      if (editingVendor) {
        const { error } = await supabase
          .from('vendors')
          .update(vendorData)
          .eq('id', editingVendor.id);
        if (error) throw error;

        toast({
          title: "Vendor Updated",
          description: "Vendor information updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('vendors')
          .insert(vendorData);
        if (error) throw error;

        toast({
          title: "Vendor Added",
          description: "New vendor added successfully"
        });
      }

      setShowAddDialog(false);
      resetForm();
      loadVendors();
    } catch (error) {
      console.error('Error saving vendor:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save vendor"
      });
    }
  };

  const toggleVendorStatus = async (vendor: Vendor) => {
    try {
      const { error } = await supabase
        .from('vendors')
        .update({ is_active: !vendor.is_active })
        .eq('id', vendor.id);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Vendor ${vendor.is_active ? 'deactivated' : 'activated'} successfully`
      });

      loadVendors();
    } catch (error) {
      console.error('Error updating vendor status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update vendor status"
      });
    }
  };

  const deleteVendor = async (vendor: Vendor) => {
    if (!confirm(`Are you sure you want to delete ${vendor.name}?`)) return;

    try {
      const { error } = await supabase
        .from('vendors')
        .delete()
        .eq('id', vendor.id);

      if (error) throw error;

      toast({
        title: "Vendor Deleted",
        description: "Vendor deleted successfully"
      });

      loadVendors();
    } catch (error) {
      console.error('Error deleting vendor:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete vendor"
      });
    }
  };

  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vendor.contact_person && vendor.contact_person.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (vendor.email && vendor.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const activeVendors = vendors.filter(v => v.is_active).length;

  return (
    <RoleGuard allowedRoles={ROLE_GROUPS.FINANCIAL_VIEWERS}>
      <DashboardLayout title="Vendors">
        <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Vendors</p>
                  <p className="text-2xl font-bold">{vendors.length}</p>
                </div>
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Vendors</p>
                  <p className="text-2xl font-bold text-construction-orange">{activeVendors}</p>
                </div>
                <Building2 className="h-8 w-8 text-construction-orange" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vendors by name, contact, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>
          </CardContent>
        </Card>

        {/* Add Vendor Dialog */}
        <Dialog open={showAddDialog} onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingVendor ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Vendor Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter vendor name"
                />
              </div>
              <div>
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) => setFormData(prev => ({ ...prev, contact_person: e.target.value }))}
                  placeholder="Primary contact name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="vendor@email.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Full vendor address"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="payment_terms">Payment Terms</Label>
                <Input
                  id="payment_terms"
                  value={formData.payment_terms}
                  onChange={(e) => setFormData(prev => ({ ...prev, payment_terms: e.target.value }))}
                  placeholder="e.g., Net 30, COD"
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about this vendor"
                  rows={2}
                />
              </div>
              <Button onClick={saveVendor} className="w-full">
                {editingVendor ? 'Update Vendor' : 'Add Vendor'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Vendors List */}
        <Card>
          <CardHeader>
            <CardTitle>Vendors</CardTitle>
            <CardDescription>
              {filteredVendors.length} vendor{filteredVendors.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">Loading vendors...</p>
              </div>
            ) : filteredVendors.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Vendors Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm 
                    ? 'No vendors match your search criteria'
                    : 'Get started by adding your first vendor'
                  }
                </p>
                {!searchTerm && (
                  <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Vendor
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVendors.map(vendor => (
                  <div key={vendor.id} className="border rounded-lg p-4 hover:bg-muted/50">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium">{vendor.name}</h3>
                        {vendor.contact_person && (
                          <p className="text-sm text-muted-foreground">{vendor.contact_person}</p>
                        )}
                      </div>
                      <Badge variant={vendor.is_active ? 'default' : 'secondary'}>
                        {vendor.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm text-muted-foreground mb-4">
                      {vendor.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          <span>{vendor.email}</span>
                        </div>
                      )}
                      {vendor.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          <span>{vendor.phone}</span>
                        </div>
                      )}
                      {vendor.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-3 w-3 mt-0.5" />
                          <span className="text-xs">{vendor.address}</span>
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Terms:</span> {vendor.payment_terms}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openEditDialog(vendor)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => toggleVendorStatus(vendor)}
                      >
                        {vendor.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => deleteVendor(vendor)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </DashboardLayout>
    </RoleGuard>
  );
};

export default Vendors;