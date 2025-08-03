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
  paymentNumber: string;
  subcontractor: Subcontractor;
  project: {
    id: string;
    name: string;
  };
  invoiceNumber: string;
  invoiceDate: string;
  workPeriod: {
    start: string;
    end: string;
  };
  workDescription: string;
  originalAmount: number;
  retentionPercentage: number;
  retentionAmount: number;
  netAmount: number;
  status: 'pending_approval' | 'approved' | 'waiver_required' | 'ready_to_pay' | 'paid' | 'rejected';
  lienWaivers: LienWaiver[];
  approvedBy?: string;
  approvedAt?: string;
  paidAt?: string;
  paymentMethod?: string;
  checkNumber?: string;
  notes?: string;
}

export const SubcontractorPaymentWorkflows: React.FC = () => {
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

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = () => {
    // Mock payment data
    const mockPayments: SubcontractorPayment[] = [
      {
        id: '1',
        paymentNumber: 'SP-2024-001',
        subcontractor: subcontractors[0],
        project: { id: 'proj1', name: 'Downtown Office Complex' },
        invoiceNumber: 'INV-001',
        invoiceDate: '2024-01-15',
        workPeriod: { start: '2024-01-01', end: '2024-01-15' },
        workDescription: 'Electrical rough-in work for floors 1-3',
        originalAmount: 85000,
        retentionPercentage: 10,
        retentionAmount: 8500,
        netAmount: 76500,
        status: 'waiver_required',
        lienWaivers: [
          {
            id: '1',
            type: 'partial',
            amount: 85000,
            periodStart: '2024-01-01',
            periodEnd: '2024-01-15',
            status: 'pending'
          }
        ]
      },
      {
        id: '2',
        paymentNumber: 'SP-2024-002',
        subcontractor: subcontractors[1],
        project: { id: 'proj2', name: 'Residential Development Phase 2' },
        invoiceNumber: 'INV-502',
        invoiceDate: '2024-01-20',
        workPeriod: { start: '2024-01-15', end: '2024-01-31' },
        workDescription: 'Plumbing installation - Units 10-15',
        originalAmount: 42000,
        retentionPercentage: 10,
        retentionAmount: 4200,
        netAmount: 37800,
        status: 'ready_to_pay',
        lienWaivers: [
          {
            id: '2',
            type: 'partial',
            amount: 42000,
            periodStart: '2024-01-15',
            periodEnd: '2024-01-31',
            status: 'approved',
            receivedAt: '2024-01-25T10:00:00Z'
          }
        ],
        approvedBy: 'Project Manager',
        approvedAt: '2024-01-25T14:00:00Z'
      },
      {
        id: '3',
        paymentNumber: 'SP-2024-003',
        subcontractor: subcontractors[2],
        project: { id: 'proj3', name: 'Manufacturing Facility Expansion' },
        invoiceNumber: 'INV-789',
        invoiceDate: '2024-01-18',
        workPeriod: { start: '2024-01-10', end: '2024-01-25' },
        workDescription: 'Foundation and slab work',
        originalAmount: 125000,
        retentionPercentage: 10,
        retentionAmount: 12500,
        netAmount: 112500,
        status: 'paid',
        lienWaivers: [
          {
            id: '3',
            type: 'partial',
            amount: 125000,
            periodStart: '2024-01-10',
            periodEnd: '2024-01-25',
            status: 'approved',
            receivedAt: '2024-01-26T09:00:00Z'
          }
        ],
        approvedBy: 'Project Manager',
        approvedAt: '2024-01-26T15:00:00Z',
        paidAt: '2024-01-30T11:00:00Z',
        paymentMethod: 'wire',
        checkNumber: 'WIRE-001'
      }
    ];

    setPayments(mockPayments);
  };

  const approvePayment = async (paymentId: string) => {
    setPayments(prev => prev.map(payment =>
      payment.id === paymentId
        ? {
            ...payment,
            status: payment.lienWaivers.every(w => w.status === 'approved') ? 'ready_to_pay' : 'waiver_required',
            approvedBy: 'Current User',
            approvedAt: new Date().toISOString()
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
            status: 'paid',
            paidAt: new Date().toISOString(),
            paymentMethod: method,
            checkNumber: method === 'check' ? `CHK-${Date.now()}` : `${method.toUpperCase()}-${Date.now()}`
          }
        : payment
    ));

    toast({
      title: "Payment Processed",
      description: `Payment has been processed via ${method}.`,
    });
  };

  const uploadLienWaiver = async (paymentId: string, waiverId: string) => {
    setPayments(prev => prev.map(payment =>
      payment.id === paymentId
        ? {
            ...payment,
            lienWaivers: payment.lienWaivers.map(waiver =>
              waiver.id === waiverId
                ? {
                    ...waiver,
                    status: 'received',
                    receivedAt: new Date().toISOString(),
                    documentPath: `/documents/lien-waivers/${waiverId}.pdf`
                  }
                : waiver
            )
          }
        : payment
    ));

    toast({
      title: "Lien Waiver Uploaded",
      description: "Lien waiver document has been received and is pending review.",
    });
  };

  const approveLienWaiver = async (paymentId: string, waiverId: string) => {
    setPayments(prev => prev.map(payment =>
      payment.id === paymentId
        ? {
            ...payment,
            lienWaivers: payment.lienWaivers.map(waiver =>
              waiver.id === waiverId
                ? { ...waiver, status: 'approved' }
                : waiver
            ),
            status: payment.lienWaivers.every(w => w.id === waiverId || w.status === 'approved') ? 'ready_to_pay' : 'waiver_required'
          }
        : payment
    ));

    toast({
      title: "Lien Waiver Approved",
      description: "Lien waiver has been approved.",
    });
  };

  const getStatusBadgeVariant = (status: SubcontractorPayment['status']) => {
    switch (status) {
      case 'pending_approval': return 'secondary';
      case 'approved': return 'default';
      case 'waiver_required': return 'secondary';
      case 'ready_to_pay': return 'default';
      case 'paid': return 'default';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: SubcontractorPayment['status']) => {
    switch (status) {
      case 'pending_approval': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'waiver_required': return <FileText className="h-4 w-4" />;
      case 'ready_to_pay': return <DollarSign className="h-4 w-4" />;
      case 'paid': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <AlertTriangle className="h-4 w-4" />;
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
    filterStatus === 'all' || payment.status === filterStatus
  );

  const totalPendingAmount = payments
    .filter(p => ['pending_approval', 'approved', 'waiver_required', 'ready_to_pay'].includes(p.status))
    .reduce((sum, p) => sum + p.netAmount, 0);

  const totalPaidAmount = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.netAmount, 0);

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
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="waiver_required">Waiver Required</SelectItem>
                  <SelectItem value="ready_to_pay">Ready to Pay</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
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
                    <h3 className="font-medium">{payment.paymentNumber}</h3>
                    <Badge variant={getStatusBadgeVariant(payment.status)} className="flex items-center gap-1">
                      {getStatusIcon(payment.status)}
                      {payment.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {payment.status === 'pending_approval' && (
                      <Button 
                        size="sm" 
                        onClick={() => approvePayment(payment.id)}
                      >
                        Approve Payment
                      </Button>
                    )}
                    {payment.status === 'ready_to_pay' && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => processPayment(payment.id, payment.subcontractor.preferredPaymentMethod)}
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
                    <div className="font-medium">{payment.subcontractor.name}</div>
                    <div className="text-sm text-muted-foreground">{payment.subcontractor.trade}</div>
                  </div>
                  
                  <div>
                    <span className="text-sm text-muted-foreground">Project:</span>
                    <div className="font-medium">{payment.project.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Invoice: {payment.invoiceNumber}
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-sm text-muted-foreground">Work Period:</span>
                    <div className="font-medium">
                      {format(new Date(payment.workPeriod.start), 'MMM dd')} - 
                      {format(new Date(payment.workPeriod.end), 'MMM dd, yyyy')}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {payment.workDescription}
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-sm text-muted-foreground">Payment Amount:</span>
                    <div className="font-medium">${payment.originalAmount.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">
                      Net: ${payment.netAmount.toLocaleString()} (after retention)
                    </div>
                  </div>
                </div>

                {/* Lien Waivers Section */}
                {payment.lienWaivers.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Lien Waivers
                    </h4>
                    <div className="space-y-2">
                      {payment.lienWaivers.map((waiver) => (
                        <div key={waiver.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-3">
                            <Badge variant={getWaiverStatusBadgeVariant(waiver.status)}>
                              {waiver.status.toUpperCase()}
                            </Badge>
                            <div>
                              <p className="font-medium">
                                {waiver.type.charAt(0).toUpperCase() + waiver.type.slice(1)} Waiver
                              </p>
                              <p className="text-sm text-muted-foreground">
                                ${waiver.amount.toLocaleString()} • 
                                {format(new Date(waiver.periodStart), 'MMM dd')} - 
                                {format(new Date(waiver.periodEnd), 'MMM dd, yyyy')}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {waiver.status === 'pending' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => uploadLienWaiver(payment.id, waiver.id)}
                              >
                                <Upload className="h-4 w-4 mr-1" />
                                Upload
                              </Button>
                            )}
                            {waiver.status === 'received' && (
                              <Button 
                                size="sm"
                                onClick={() => approveLienWaiver(payment.id, waiver.id)}
                              >
                                Approve
                              </Button>
                            )}
                            {waiver.documentPath && (
                              <Button size="sm" variant="outline">
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {payment.status === 'paid' && (
                  <div className="border-t pt-4 text-sm text-muted-foreground">
                    Paid on {format(new Date(payment.paidAt!), 'PPP')} via {payment.paymentMethod} 
                    {payment.checkNumber && ` (${payment.checkNumber})`}
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