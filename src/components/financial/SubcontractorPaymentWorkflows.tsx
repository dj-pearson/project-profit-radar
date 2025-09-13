import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Users, DollarSign, FileText, CheckCircle, Clock, AlertTriangle, Upload, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, addDays } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Subcontractor {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  trade: string;
  licenseNumber: string;
  insuranceExpiry: string;
  paymentTerms: string;
  preferredPaymentMethod: 'check' | 'ach' | 'wire';
}

interface LienWaiver {
  id: string;
  type: 'partial' | 'final' | 'conditional' | 'unconditional';
  amount: number;
  periodStart: string;
  periodEnd: string;
  status: 'pending' | 'received' | 'approved' | 'rejected';
  documentPath?: string;
  receivedAt?: string;
  notes?: string;
}

interface SubcontractorPayment {
  id: string;
  projectId: string;
  projectName: string;
  subcontractorName: string;
  workDescription: string;
  contractAmount: number;
  amountCompleted: number;
  previousPayments: number;
  currentAmountDue: number;
  retentionAmount: number;
  netPayment: number;
  paymentStatus: 'pending' | 'approved' | 'paid' | 'on_hold';
  dueDate?: string;
  paidDate?: string;
  paymentMethod?: string;
  notes?: string;
}

export default function SubcontractorPaymentWorkflows() {
  const [payments, setPayments] = useState<SubcontractorPayment[]>([]);
  const [subcontractors] = useState<Subcontractor[]>([
    {
      id: '1',
      name: 'ABC Electrical Services',
      contactPerson: 'John Smith',
      email: 'john@abcelectrical.com',
      phone: '(555) 123-4567',
      trade: 'Electrical',
      licenseNumber: 'EL-12345',
      insuranceExpiry: '2024-12-31',
      paymentTerms: 'Net 30',
      preferredPaymentMethod: 'ach'
    },
    {
      id: '2',
      name: 'Superior Plumbing Co.',
      contactPerson: 'Sarah Johnson',
      email: 'sarah@superiorplumbing.com',
      phone: '(555) 234-5678',
      trade: 'Plumbing',
      licenseNumber: 'PL-67890',
      insuranceExpiry: '2024-11-15',
      paymentTerms: 'Net 15',
      preferredPaymentMethod: 'check'
    },
    {
      id: '3',
      name: 'Elite Concrete Works',
      contactPerson: 'Mike Wilson',
      email: 'mike@eliteconcrete.com',
      phone: '(555) 345-6789',
      trade: 'Concrete',
      licenseNumber: 'CN-54321',
      insuranceExpiry: '2025-01-30',
      paymentTerms: 'Net 30',
      preferredPaymentMethod: 'wire'
    }
  ]);
  
  const [selectedPayment, setSelectedPayment] = useState<SubcontractorPayment | null>(null);
  const [showNewPaymentForm, setShowNewPaymentForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const { toast } = useToast();
  const { userProfile } = useAuth();

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      if (!userProfile?.company_id) return;

      const { data, error } = await supabase
        .from('subcontractor_payments')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const formattedPayments: SubcontractorPayment[] = data.map(payment => ({
          id: payment.id,
          projectId: payment.project_id || '',
          projectName: 'Project Name',
          subcontractorName: payment.subcontractor_name || '',
          workDescription: 'Work Description',
          contractAmount: Number(payment.amount || 0),
          amountCompleted: Number(payment.amount || 0),
          previousPayments: 0,
          currentAmountDue: Number(payment.amount || 0),
          retentionAmount: 0,
          netPayment: Number(payment.net_amount || 0),
          paymentStatus: 'pending',
          dueDate: payment.due_date,
          paidDate: payment.paid_date,
          paymentMethod: payment.payment_method || 'check',
          notes: 'Payment notes'
        }));
        setPayments(formattedPayments);
      } else {
        setPayments([]);
      }
    } catch (error) {
      console.error('Error loading subcontractor payments:', error);
      setPayments([]);
    }
  };

  const approvePayment = async (paymentId: string) => {
    setPayments(prev => prev.map(payment =>
      payment.id === paymentId
        ? {
            ...payment,
            paymentStatus: 'approved'
          }
        : payment
    ));

    toast({
      title: "Payment Approved",
      description: "The payment has been approved and is ready for processing.",
    });
  };

  const processPayment = async (paymentId: string, method: string) => {
    setPayments(prev => prev.map(payment =>
      payment.id === paymentId
        ? {
            ...payment,
            paymentStatus: 'paid',
            paidDate: new Date().toISOString().split('T')[0],
            paymentMethod: method
          }
        : payment
    ));

    toast({
      title: "Payment Processed",
      description: `Payment has been processed via ${method}.`,
    });
  };

  const uploadLienWaiver = async (paymentId: string, waiverId: string) => {
    toast({
      title: "Lien Waiver Uploaded",
      description: "Lien waiver document has been received and is pending review.",
    });
  };

  const approveLienWaiver = async (paymentId: string, waiverId: string) => {
    toast({
      title: "Lien Waiver Approved",
      description: "Lien waiver has been approved.",
    });
  };

  const getStatusBadgeVariant = (status: SubcontractorPayment['paymentStatus']) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'approved': return 'default';
      case 'paid': return 'default';
      case 'on_hold': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: SubcontractorPayment['paymentStatus']) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'paid': return <CheckCircle className="h-4 w-4" />;
      case 'on_hold': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getWaiverStatusBadgeVariant = (status: LienWaiver['status']) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'received': return 'secondary';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const filteredPayments = payments.filter(payment =>
    filterStatus === 'all' || payment.paymentStatus === filterStatus
  );

  const totalPendingAmount = payments
    .filter(p => ['pending', 'approved'].includes(p.paymentStatus))
    .reduce((sum, p) => sum + p.netPayment, 0);

  const totalPaidAmount = payments
    .filter(p => p.paymentStatus === 'paid')
    .reduce((sum, p) => sum + p.netPayment, 0);

  return (
    <div className="space-y-6">
      {/* Summary Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pending Payments</p>
                <p className="text-2xl font-bold">${totalPendingAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Paid This Month</p>
                <p className="text-2xl font-bold">${totalPaidAmount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active Subcontractors</p>
                <p className="text-2xl font-bold">{subcontractors.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Subcontractor Payment Management
            </span>
            <Button onClick={() => setShowNewPaymentForm(true)}>
              New Payment Request
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="status-filter">Filter by Status:</Label>
              <Select onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Payments List */}
          <div className="space-y-4">
            {filteredPayments.map((payment) => (
              <div key={payment.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium">Payment #{payment.id.slice(-6)}</h3>
                    <Badge variant={getStatusBadgeVariant(payment.paymentStatus)} className="flex items-center gap-1">
                      {getStatusIcon(payment.paymentStatus)}
                      {payment.paymentStatus.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {payment.paymentStatus === 'pending' && (
                      <Button 
                        size="sm" 
                        onClick={() => approvePayment(payment.id)}
                      >
                        Approve Payment
                      </Button>
                    )}
                    {payment.paymentStatus === 'approved' && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => processPayment(payment.id, 'check')}
                        >
                          Process Payment
                        </Button>
                      </div>
                    )}
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Subcontractor:</span>
                    <div className="font-medium">{payment.subcontractorName}</div>
                    <div className="text-sm text-muted-foreground">Trade Work</div>
                  </div>
                  
                  <div>
                    <span className="text-sm text-muted-foreground">Project:</span>
                    <div className="font-medium">{payment.projectName}</div>
                    <div className="text-sm text-muted-foreground">
                      ID: {payment.projectId}
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-sm text-muted-foreground">Due Date:</span>
                    <div className="font-medium">
                      {payment.dueDate ? format(new Date(payment.dueDate), 'MMM dd, yyyy') : 'Not set'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {payment.workDescription}
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-sm text-muted-foreground">Payment Amount:</span>
                    <div className="font-medium">${payment.contractAmount.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">
                      Net: ${payment.netPayment.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Notes section */}
                {payment.notes && (
                  <div className="border-t pt-4">
                    <span className="text-sm text-muted-foreground">Notes:</span>
                    <p className="text-sm mt-1">{payment.notes}</p>
                  </div>
                )}
              </div>
            ))}

            {filteredPayments.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No payments found for the selected filter.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};