import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { BondForm } from '@/components/bonds/BondForm';
import { InsuranceForm } from '@/components/bonds/InsuranceForm';
import { 
  Plus, 
  Search, 
  Filter,
  Shield,
  FileCheck,
  AlertTriangle,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  ArrowLeft
} from 'lucide-react';

interface Bond {
  id: string;
  bond_type: string;
  bond_number: string;
  bond_name: string;
  bond_amount: number;
  premium_amount: number;
  surety_company: string;
  effective_date: string;
  expiry_date: string;
  status: string;
  project?: { name: string };
}

interface InsurancePolicy {
  id: string;
  policy_type: string;
  policy_number: string;
  policy_name: string;
  coverage_limit: number;
  premium_amount: number;
  insurance_company: string;
  effective_date: string;
  expiry_date: string;
  status: string;
}

export default function BondInsuranceManagement() {
  const { userProfile } = useAuth();
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [insurancePolicies, setInsurancePolicies] = useState<InsurancePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showBondForm, setShowBondForm] = useState(false);
  const [showInsuranceForm, setShowInsuranceForm] = useState(false);
  const [selectedBond, setSelectedBond] = useState<Bond | null>(null);
  const [selectedInsurance, setSelectedInsurance] = useState<InsurancePolicy | null>(null);
  const [activeTab, setActiveTab] = useState('bonds');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([loadBonds(), loadInsurancePolicies()]);
  };

  const loadBonds = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bonds')
        .select(`
          *,
          project:projects(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBonds(data || []);
    } catch (error: any) {
      console.error('Error loading bonds:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load bonds"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadInsurancePolicies = async () => {
    try {
      const { data, error } = await supabase
        .from('insurance_policies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInsurancePolicies(data || []);
    } catch (error: any) {
      console.error('Error loading insurance policies:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load insurance policies"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'expired':
        return 'bg-red-500';
      case 'cancelled':
        return 'bg-gray-500';
      case 'claimed':
        return 'bg-orange-500';
      case 'released':
        return 'bg-blue-500';
      case 'suspended':
        return 'bg-red-600';
      default:
        return 'bg-gray-400';
    }
  };

  const isExpiringMoon = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiry <= thirtyDaysFromNow && expiry >= new Date();
  };

  const filteredBonds = bonds.filter(bond => {
    const matchesSearch = bond.bond_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bond.bond_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bond.surety_company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || bond.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredInsurance = insurancePolicies.filter(policy => {
    const matchesSearch = policy.policy_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         policy.policy_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         policy.insurance_company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || policy.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const totalBonds = bonds.length;
  const activeBonds = bonds.filter(b => b.status === 'active').length;
  const expiringBonds = bonds.filter(b => isExpiringMoon(b.expiry_date)).length;
  const totalBondValue = bonds.reduce((sum, bond) => sum + bond.bond_amount, 0);

  const totalPolicies = insurancePolicies.length;
  const activePolicies = insurancePolicies.filter(p => p.status === 'active').length;
  const expiringPolicies = insurancePolicies.filter(p => isExpiringMoon(p.expiry_date)).length;
  const totalCoverage = insurancePolicies.reduce((sum, policy) => sum + policy.coverage_limit, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading bonds and insurance...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout title="Bonds & Insurance">
      <div className="space-y-6">

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="bonds">Bonds</TabsTrigger>
          <TabsTrigger value="insurance">Insurance</TabsTrigger>
        </TabsList>

        <TabsContent value="bonds" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Bond Management</h3>
            <Button onClick={() => setShowBondForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Bond
            </Button>
          </div>

          {/* Bond Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Bonds</p>
                    <p className="text-2xl font-bold">{totalBonds}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active</p>
                    <p className="text-2xl font-bold">{activeBonds}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Expiring Soon</p>
                    <p className="text-2xl font-bold">{expiringBonds}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                    <p className="text-2xl font-bold">${totalBondValue.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bond Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <div className="flex-1 w-full">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search bonds..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <Filter className="h-4 w-4" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="claimed">Claimed</SelectItem>
                      <SelectItem value="released">Released</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bonds List */}
          <div className="space-y-4">
            {filteredBonds.map((bond) => (
              <Card key={bond.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{bond.bond_name}</CardTitle>
                      <CardDescription>
                        {bond.bond_type.replace('_', ' ')} • {bond.surety_company}
                        {bond.project?.name && ` • ${bond.project.name}`}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isExpiringMoon(bond.expiry_date) && (
                        <Badge className="bg-orange-500">
                          Expiring Soon
                        </Badge>
                      )}
                      <Badge className={getStatusColor(bond.status)}>
                        {bond.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-muted-foreground">Bond Number</p>
                      <p>{bond.bond_number}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Bond Amount</p>
                      <p>${bond.bond_amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Effective Date</p>
                      <p>{new Date(bond.effective_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Expiry Date</p>
                      <p>{new Date(bond.expiry_date).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBond(bond);
                        setShowBondForm(true);
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredBonds.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No bonds found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'No bonds have been added yet'
                  }
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <Button onClick={() => setShowBondForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Bond
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="insurance" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Insurance Management</h3>
            <Button onClick={() => setShowInsuranceForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Policy
            </Button>
          </div>

          {/* Insurance Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <FileCheck className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Policies</p>
                    <p className="text-2xl font-bold">{totalPolicies}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active</p>
                    <p className="text-2xl font-bold">{activePolicies}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Expiring Soon</p>
                    <p className="text-2xl font-bold">{expiringPolicies}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Coverage</p>
                    <p className="text-2xl font-bold">${totalCoverage.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Insurance Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <div className="flex-1 w-full">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search insurance policies..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <Filter className="h-4 w-4" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Insurance List */}
          <div className="space-y-4">
            {filteredInsurance.map((policy) => (
              <Card key={policy.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{policy.policy_name}</CardTitle>
                      <CardDescription>
                        {policy.policy_type.replace('_', ' ')} • {policy.insurance_company}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      {isExpiringMoon(policy.expiry_date) && (
                        <Badge className="bg-orange-500">
                          Expiring Soon
                        </Badge>
                      )}
                      <Badge className={getStatusColor(policy.status)}>
                        {policy.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-muted-foreground">Policy Number</p>
                      <p>{policy.policy_number}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Coverage Limit</p>
                      <p>${policy.coverage_limit.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Effective Date</p>
                      <p>{new Date(policy.effective_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Expiry Date</p>
                      <p>{new Date(policy.expiry_date).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedInsurance(policy);
                        setShowInsuranceForm(true);
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredInsurance.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No insurance policies found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'No insurance policies have been added yet'
                  }
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <Button onClick={() => setShowInsuranceForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Policy
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Bond Form Modal */}
      {showBondForm && (
        <BondForm
          bond={selectedBond}
          onClose={() => {
            setShowBondForm(false);
            setSelectedBond(null);
          }}
          onSave={() => {
            setShowBondForm(false);
            setSelectedBond(null);
            loadBonds();
          }}
        />
      )}

      {/* Insurance Form Modal */}
      {showInsuranceForm && (
        <InsuranceForm
          insurance={selectedInsurance}
          onClose={() => {
            setShowInsuranceForm(false);
            setSelectedInsurance(null);
          }}
          onSave={() => {
            setShowInsuranceForm(false);
            setSelectedInsurance(null);
            loadInsurancePolicies();
          }}
        />
      )}
      </div>
    </DashboardLayout>
  );
}