import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  AlertTriangle, 
  DollarSign, 
  CreditCard,
  Plus,
  Search,
  Filter
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChargebackFee {
  id: string;
  company_id: string;
  payment_intent_id: string;
  chargeback_amount: number;
  fee_amount: number;
  reason: string | null;
  status: 'pending' | 'charged' | 'disputed' | 'waived';
  charged_by: string | null;
  charged_at: string | null;
  created_at: string;
  company_name?: string;
  charged_by_name?: string;
}

interface Company {
  id: string;
  name: string;
}

export const ChargebackManager = () => {
  const [chargebacks, setChargebacks] = useState<ChargebackFee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newChargeback, setNewChargeback] = useState({
    company_id: '',
    payment_intent_id: '',
    chargeback_amount: 0,
    fee_amount: 15.00,
    reason: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadChargebacks();
    loadCompanies();
  }, []);

  const loadChargebacks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('chargeback_fees')
        .select(`
          *,
          companies!inner(name),
          charged_by_profile:user_profiles!chargeback_fees_charged_by_fkey(first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = data?.map(item => ({
        ...item,
        status: item.status as 'pending' | 'charged' | 'disputed' | 'waived',
        company_name: item.companies?.name || 'Unknown Company',
        charged_by_name: item.charged_by_profile 
          ? `${item.charged_by_profile.first_name} ${item.charged_by_profile.last_name}`.trim()
          : null
      })) || [];

      setChargebacks(formattedData);
    } catch (error) {
      console.error('Error loading chargebacks:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load chargeback fees"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  const addChargeback = async () => {
    try {
      if (!newChargeback.company_id || !newChargeback.payment_intent_id || newChargeback.chargeback_amount <= 0) {
        toast({
          variant: "destructive",
          title: "Missing Information",
          description: "Please fill in all required fields"
        });
        return;
      }

      const { error } = await supabase
        .from('chargeback_fees')
        .insert({
          company_id: newChargeback.company_id,
          payment_intent_id: newChargeback.payment_intent_id,
          chargeback_amount: newChargeback.chargeback_amount,
          fee_amount: newChargeback.fee_amount,
          reason: newChargeback.reason || null,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Chargeback Added",
        description: "Chargeback fee has been recorded successfully"
      });

      setShowAddDialog(false);
      setNewChargeback({
        company_id: '',
        payment_intent_id: '',
        chargeback_amount: 0,
        fee_amount: 15.00,
        reason: ''
      });
      loadChargebacks();
    } catch (error) {
      console.error('Error adding chargeback:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add chargeback fee"
      });
    }
  };

  const updateChargebackStatus = async (id: string, status: string) => {
    try {
      const updateData: any = { status };
      
      if (status === 'charged') {
        updateData.charged_at = new Date().toISOString();
        // In a real implementation, this would trigger actual billing
      }

      const { error } = await supabase
        .from('chargeback_fees')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Chargeback status updated to ${status}`
      });

      loadChargebacks();
    } catch (error) {
      console.error('Error updating chargeback:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update chargeback status"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      pending: { variant: 'secondary' as const, label: 'Pending' },
      charged: { variant: 'default' as const, label: 'Charged' },
      disputed: { variant: 'destructive' as const, label: 'Disputed' },
      waived: { variant: 'outline' as const, label: 'Waived' }
    };
    
    const config = configs[status as keyof typeof configs] || configs.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredChargebacks = chargebacks.filter(chargeback => {
    const matchesStatus = filterStatus === 'all' || chargeback.status === filterStatus;
    const matchesSearch = !searchTerm || 
      chargeback.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chargeback.payment_intent_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const totalPending = chargebacks.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.fee_amount, 0);
  const totalCharged = chargebacks.filter(c => c.status === 'charged').reduce((sum, c) => sum + c.fee_amount, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Fees</p>
                <p className="text-2xl font-bold">${totalPending.toLocaleString()}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Collected Fees</p>
                <p className="text-2xl font-bold">${totalCharged.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold">{chargebacks.length}</p>
              </div>
              <CreditCard className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Chargeback Management
              </CardTitle>
              <CardDescription>
                Manage chargeback fees for companies using Pearson Media payment processing
              </CardDescription>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Chargeback
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Chargeback Fee</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="company-select">Company</Label>
                    <Select value={newChargeback.company_id} onValueChange={(value) => 
                      setNewChargeback(prev => ({ ...prev, company_id: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Select company" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map(company => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="payment-intent">Payment Intent ID</Label>
                    <Input
                      id="payment-intent"
                      value={newChargeback.payment_intent_id}
                      onChange={(e) => setNewChargeback(prev => ({ ...prev, payment_intent_id: e.target.value }))}
                      placeholder="pi_..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="chargeback-amount">Chargeback Amount</Label>
                      <Input
                        id="chargeback-amount"
                        type="number"
                        step="0.01"
                        value={newChargeback.chargeback_amount}
                        onChange={(e) => setNewChargeback(prev => ({ ...prev, chargeback_amount: parseFloat(e.target.value) || 0 }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="fee-amount">Fee Amount</Label>
                      <Input
                        id="fee-amount"
                        type="number"
                        step="0.01"
                        value={newChargeback.fee_amount}
                        onChange={(e) => setNewChargeback(prev => ({ ...prev, fee_amount: parseFloat(e.target.value) || 0 }))}
                        placeholder="15.00"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="reason">Reason</Label>
                    <Textarea
                      id="reason"
                      value={newChargeback.reason}
                      onChange={(e) => setNewChargeback(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="Optional reason for chargeback"
                      rows={2}
                    />
                  </div>
                  <Button onClick={addChargeback} className="w-full">
                    Add Chargeback Fee
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search company or payment ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="charged">Charged</SelectItem>
                  <SelectItem value="disputed">Disputed</SelectItem>
                  <SelectItem value="waived">Waived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Chargebacks List */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Loading chargebacks...</p>
            </div>
          ) : filteredChargebacks.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Chargebacks Found</h3>
              <p className="text-muted-foreground">
                {searchTerm || filterStatus !== 'all' 
                  ? 'No chargebacks match your current filters'
                  : 'No chargeback fees have been recorded yet'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredChargebacks.map(chargeback => (
                <div key={chargeback.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium">{chargeback.company_name}</h3>
                      {getStatusBadge(chargeback.status)}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Payment ID: {chargeback.payment_intent_id}</p>
                      <p>Chargeback: ${chargeback.chargeback_amount.toLocaleString()} • Fee: ${chargeback.fee_amount.toLocaleString()}</p>
                      {chargeback.reason && <p>Reason: {chargeback.reason}</p>}
                      <p>Created: {new Date(chargeback.created_at).toLocaleDateString()}</p>
                      {chargeback.charged_at && (
                        <p>Charged: {new Date(chargeback.charged_at).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {chargeback.status === 'pending' && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => updateChargebackStatus(chargeback.id, 'charged')}
                        >
                          Charge Company
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => updateChargebackStatus(chargeback.id, 'waived')}
                        >
                          Waive Fee
                        </Button>
                      </>
                    )}
                    {chargeback.status === 'charged' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => updateChargebackStatus(chargeback.id, 'disputed')}
                      >
                        Mark Disputed
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};