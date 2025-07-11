import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { WarrantyForm } from '@/components/warranty/WarrantyForm';
import { WarrantyClaimsManager } from '@/components/warranty/WarrantyClaimsManager';
import { 
  Shield, 
  Plus, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Search,
  Filter,
  FileText,
  Users,
  ArrowLeft
} from 'lucide-react';

interface Warranty {
  id: string;
  item_name: string;
  warranty_type: string;
  manufacturer: string;
  warranty_start_date: string;
  warranty_end_date: string;
  status: string;
  is_transferable: boolean;
  is_transferred_to_customer: boolean;
  project?: { name: string };
  vendor?: { name: string };
}

const WarrantyManagement = () => {
  const { userProfile } = useAuth();
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<Warranty | null>(null);

  useEffect(() => {
    loadWarranties();
  }, []);

  const loadWarranties = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('warranties')
        .select(`
          *,
          project:projects(name),
          vendor:vendors(name)
        `)
        .eq('company_id', userProfile?.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWarranties(data || []);
    } catch (error: any) {
      console.error('Error loading warranties:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load warranties"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTransferWarranty = async (warranty: Warranty) => {
    if (!warranty.project) {
      toast({
        variant: "destructive",
        title: "Cannot Transfer",
        description: "This warranty is not associated with a project"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('warranties')
        .update({
          is_transferred_to_customer: true,
          transferred_by: userProfile?.id
        })
        .eq('id', warranty.id);

      if (error) throw error;

      toast({
        title: "Warranty Transferred",
        description: "The warranty has been transferred to the customer"
      });

      loadWarranties();
    } catch (error: any) {
      console.error('Error transferring warranty:', error);
      toast({
        variant: "destructive",
        title: "Transfer Failed",
        description: "Failed to transfer warranty to customer"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'expired':
        return 'bg-red-500';
      case 'claimed':
        return 'bg-yellow-500';
      case 'transferred':
        return 'bg-blue-500';
      case 'voided':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getDaysUntilExpiry = (endDate: string) => {
    const today = new Date();
    const expiry = new Date(endDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredWarranties = warranties.filter(warranty => {
    const matchesSearch = warranty.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         warranty.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         warranty.project?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || warranty.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const activeWarranties = warranties.filter(w => w.status === 'active').length;
  const expiringSoon = warranties.filter(w => {
    const days = getDaysUntilExpiry(w.warranty_end_date);
    return days <= 30 && days > 0;
  }).length;
  const transferred = warranties.filter(w => w.is_transferred_to_customer).length;

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading warranties...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout title="Warranty Management">
      <div className="flex justify-end mb-6">
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Warranty
        </Button>
      </div>
      
      <div className="space-y-6">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Warranties</p>
                <p className="text-2xl font-bold">{activeWarranties}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Expiring Soon</p>
                <p className="text-2xl font-bold">{expiringSoon}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Transferred</p>
                <p className="text-2xl font-bold">{transferred}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Warranties</p>
                <p className="text-2xl font-bold">{warranties.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="warranties" className="space-y-4">
        <TabsList>
          <TabsTrigger value="warranties">Warranties</TabsTrigger>
          <TabsTrigger value="claims">Claims</TabsTrigger>
        </TabsList>

        <TabsContent value="warranties" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search warranties..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border rounded px-3 py-2 text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="claimed">Claimed</option>
                    <option value="transferred">Transferred</option>
                    <option value="voided">Voided</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warranties List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredWarranties.map((warranty) => {
              const daysUntilExpiry = getDaysUntilExpiry(warranty.warranty_end_date);
              const isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry > 0;
              const isExpired = daysUntilExpiry <= 0;

              return (
                <Card key={warranty.id} className={`${isExpiringSoon ? 'border-yellow-500' : isExpired ? 'border-red-500' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{warranty.item_name}</CardTitle>
                      <Badge className={getStatusColor(warranty.status)}>
                        {warranty.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <CardDescription>
                      {warranty.manufacturer && `${warranty.manufacturer} • `}
                      {warranty.warranty_type.replace('_', ' ')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-muted-foreground">Start Date</p>
                        <p>{new Date(warranty.warranty_start_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="font-medium text-muted-foreground">End Date</p>
                        <p className={isExpired ? 'text-red-500 font-medium' : isExpiringSoon ? 'text-yellow-600 font-medium' : ''}>
                          {new Date(warranty.warranty_end_date).toLocaleDateString()}
                          {isExpiringSoon && !isExpired && (
                            <span className="ml-2 text-xs">({daysUntilExpiry} days left)</span>
                          )}
                          {isExpired && (
                            <span className="ml-2 text-xs">(Expired)</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {warranty.project && (
                      <div>
                        <p className="font-medium text-muted-foreground text-sm">Project</p>
                        <p className="text-sm">{warranty.project.name}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center space-x-2">
                        {warranty.is_transferable && (
                          <Badge variant="outline" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            Transferable
                          </Badge>
                        )}
                        {warranty.is_transferred_to_customer && (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Transferred
                          </Badge>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedWarranty(warranty);
                            setShowForm(true);
                          }}
                        >
                          Edit
                        </Button>
                        {warranty.is_transferable && !warranty.is_transferred_to_customer && warranty.project && (
                          <Button
                            size="sm"
                            onClick={() => handleTransferWarranty(warranty)}
                          >
                            Transfer
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredWarranties.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No warranties found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'Get started by adding your first warranty'
                  }
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Warranty
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="claims">
          <WarrantyClaimsManager />
        </TabsContent>
      </Tabs>

      {/* Warranty Form Modal */}
      {showForm && (
        <WarrantyForm
          warranty={selectedWarranty}
          onClose={() => {
            setShowForm(false);
            setSelectedWarranty(null);
          }}
          onSave={() => {
            setShowForm(false);
            setSelectedWarranty(null);
            loadWarranties();
          }}
        />
      )}
      </div>
    </DashboardLayout>
  );
};

export default WarrantyManagement;