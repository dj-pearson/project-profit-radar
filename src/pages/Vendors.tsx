import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessiblePageWrapper } from '@/components/accessibility/AccessiblePageWrapper';
import { RoleGuard, ROLE_GROUPS } from '@/components/auth/RoleGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Building2, Edit, Trash2, Phone, Mail, MapPin } from 'lucide-react';
import { useVendors, type Vendor } from '@/hooks/useVendors';
import { ErrorState } from '@/components/common/ErrorState';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { confirmAction } from "@/components/ui/confirm-dialog";
import { Skeleton } from '@/components/ui/skeleton';

const Vendors = () => {
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
  const { vendors, isLoading: loading, error: loadError, refetch, create, update, remove } = useVendors();

  const failed = (description: string, error: unknown) => {
    toast({
      variant: "destructive",
      title: "Error",
      description: error instanceof Error && error.message ? `${description}: ${error.message}` : description
    });
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

    const vendorData = {
      name: formData.name.trim(),
      contact_person: formData.contact_person || null,
      email: formData.email || null,
      phone: formData.phone || null,
      address: formData.address || null,
      payment_terms: formData.payment_terms,
      notes: formData.notes || null,
    };

    try {
      if (editingVendor) {
        await update.mutateAsync({ id: editingVendor.id, patch: vendorData });
        toast({
          title: "Vendor Updated",
          description: "Vendor information updated successfully"
        });
      } else {
        await create.mutateAsync(vendorData);
        toast({
          title: "Vendor Added",
          description: "New vendor added successfully"
        });
      }

      setShowAddDialog(false);
      resetForm();
    } catch (error) {
      failed("Failed to save vendor", error);
    }
  };

  const toggleVendorStatus = async (vendor: Vendor) => {
    try {
      await update.mutateAsync({ id: vendor.id, patch: { is_active: !vendor.is_active } });
      toast({
        title: "Status Updated",
        description: `Vendor ${vendor.is_active ? 'deactivated' : 'activated'} successfully`
      });
    } catch (error) {
      failed("Failed to update vendor status", error);
    }
  };

  const deleteVendor = async (vendor: Vendor) => {
    if (!(await confirmAction({ title: `Are you sure you want to delete ${vendor.name}?`, destructive: true }))) return;

    try {
      await remove.mutateAsync(vendor.id);
      toast({
        title: "Vendor Deleted",
        description: "Vendor deleted successfully"
      });
    } catch (error) {
      failed("Failed to delete vendor", error);
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
      <AccessiblePageWrapper pageTitle="Vendors">
      <DashboardLayout hasAccessibleWrapper title="Vendors">
        <div className="space-y-6">
        {/* Summary Cards */}
        <section aria-label="Vendor statistics" className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Vendors</p>
                  <p className="text-2xl font-bold">{vendors.length}</p>
                </div>
                <Building2 className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
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
                <Building2 className="h-8 w-8 text-construction-orange" aria-hidden="true" />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div role="search" aria-label="Search vendors" className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="Search vendors by name, contact, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
                aria-label="Search vendors by name, contact, or email"
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
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg" aria-describedby="vendor-form-description">
            <DialogHeader>
              <DialogTitle>{editingVendor ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
              <p id="vendor-form-description" className="sr-only">
                {editingVendor ? 'Edit vendor details' : 'Fill in the details to add a new vendor'}
              </p>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Vendor Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter vendor name"
                  aria-required="true"
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
              <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-8" />)}</div>
            ) : loadError ? (
              <ErrorState inline title="Vendors could not be loaded" error={loadError} onRetry={() => { void refetch(); }} />
            ) : filteredVendors.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                <h3 className="text-lg font-medium mb-2">No Vendors Found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm 
                    ? 'No vendors match your search criteria'
                    : 'Get started by adding your first vendor'
                  }
                </p>
                {!searchTerm && (
                  <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                    Add Vendor
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVendors.map(vendor => (
                  <div key={vendor.id} className="border rounded-lg p-4 hover:bg-muted/50" role="article" aria-label={vendor.name}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium">{vendor.name}</h3>
                        {vendor.contact_person && (
                          <p className="text-sm text-muted-foreground">{vendor.contact_person}</p>
                        )}
                      </div>
                      <Badge variant={vendor.is_active ? 'default' : 'secondary'} aria-label={`Status: ${vendor.is_active ? 'Active' : 'Inactive'}`}>
                        {vendor.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm text-muted-foreground mb-4">
                      {vendor.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3" aria-hidden="true" />
                          <span>{vendor.email}</span>
                        </div>
                      )}
                      {vendor.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" aria-hidden="true" />
                          <span>{vendor.phone}</span>
                        </div>
                      )}
                      {vendor.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-3 w-3 mt-0.5" aria-hidden="true" />
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
                        aria-label={`Edit ${vendor.name}`}
                      >
                        <Edit className="h-3 w-3" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleVendorStatus(vendor)}
                        aria-label={`${vendor.is_active ? 'Deactivate' : 'Activate'} ${vendor.name}`}
                      >
                        {vendor.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteVendor(vendor)}
                        aria-label={`Delete ${vendor.name}`}
                      >
                        <Trash2 className="h-3 w-3" aria-hidden="true" />
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
      </AccessiblePageWrapper>
    </RoleGuard>
  );
};

export default Vendors;