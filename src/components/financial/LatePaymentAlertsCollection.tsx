import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Mail, Phone, FileText, Clock, DollarSign, Users, Calendar, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays, addDays } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface PaymentReminder {
  id: string;
  type: 'first_notice' | 'second_notice' | 'final_notice' | 'collection_agency' | 'legal_action';
  sentAt: string;
  method: 'email' | 'phone' | 'mail' | 'certified_mail';
  content: string;
  response?: string;
  responseDate?: string;
}

interface CollectionItem {
  id: string;
  projectId: string | null;
  projectName?: string;
  clientName: string;
  invoiceNumber: string;
  originalAmount: number;
  outstandingBalance: number;
  dueDate: string;
  daysOverdue: number;
  collectionStatus: 'pending' | 'contacted' | 'payment_plan' | 'legal' | 'collected' | 'written_off';
  lastContactDate?: string;
  nextActionDate?: string;
  notes?: string;
  collectionAgency?: string;
  paymentPlanAmount?: number;
}

interface CollectionSummary {
  totalOverdue: number;
  count30Days: number;
  count60Days: number;
  count90Days: number;
  countPlus90Days: number;
  amount30Days: number;
  amount60Days: number;
  amount90Days: number;
  amountPlus90Days: number;
  collectionAgencyTotal: number;
  recoveryRate: number;
}

export const LatePaymentAlertsCollection: React.FC = () => {
  const [collectionItems, setCollectionItems] = useState<CollectionItem[]>([]);
  const [summary, setSummary] = useState<CollectionSummary | null>(null);
  const [selectedItem, setSelectedItem] = useState<CollectionItem | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [reminderTemplate, setReminderTemplate] = useState<string>('');
  const [showReminderForm, setShowReminderForm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadCollectionData();
  }, []);

  useEffect(() => {
    if (collectionItems.length > 0) {
      calculateSummary();
    }
  }, [collectionItems]);

  const loadCollectionData = async () => {
    try {
      if (!userProfile?.company_id) return;

      const { data, error } = await supabase
        .from('collection_items')
        .select(`
          *,
          projects (
            id,
            name
          )
        `)
        .eq('company_id', userProfile.company_id)
        .order('days_overdue', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const formattedItems: CollectionItem[] = data.map(item => ({
          id: item.id,
          projectId: item.project_id,
          projectName: item.projects?.name || 'N/A',
          clientName: item.client_name,
          invoiceNumber: item.invoice_number,
          originalAmount: Number(item.original_amount),
          currentBalance: Number(item.current_balance),
          daysOverdue: item.days_overdue || 0,
          status: item.status,
          priority: item.priority,
          lastContactDate: item.last_contact_date,
          nextActionDate: item.next_action_date,
          notes: item.notes
        }));
        setCollectionItems(formattedItems);
      } else {
        setCollectionItems([]);
      }
    } catch (error) {
      console.error('Error loading collection items:', error);
      setCollectionItems([]);
    }
  };

  const calculateSummary = () => {
    const totalOverdue = collectionItems.reduce((sum, item) => sum + item.remainingBalance, 0);
    
    const count30Days = collectionItems.filter(item => item.status === 'overdue_1_30').length;
    const count60Days = collectionItems.filter(item => item.status === 'overdue_31_60').length;
    const count90Days = collectionItems.filter(item => item.status === 'overdue_61_90').length;
    const countPlus90Days = collectionItems.filter(item => item.status === 'overdue_90_plus').length;
    
    const amount30Days = collectionItems.filter(item => item.status === 'overdue_1_30').reduce((sum, item) => sum + item.remainingBalance, 0);
    const amount60Days = collectionItems.filter(item => item.status === 'overdue_31_60').reduce((sum, item) => sum + item.remainingBalance, 0);
    const amount90Days = collectionItems.filter(item => item.status === 'overdue_61_90').reduce((sum, item) => sum + item.remainingBalance, 0);
    const amountPlus90Days = collectionItems.filter(item => item.status === 'overdue_90_plus').reduce((sum, item) => sum + item.remainingBalance, 0);
    
    const collectionAgencyTotal = collectionItems.filter(item => item.status === 'collection').reduce((sum, item) => sum + item.remainingBalance, 0);
    
    const totalOriginal = collectionItems.reduce((sum, item) => sum + item.originalAmount, 0);
    const totalPaid = collectionItems.reduce((sum, item) => sum + item.paidAmount, 0);
    const recoveryRate = totalOriginal > 0 ? (totalPaid / totalOriginal) * 100 : 0;

    setSummary({
      totalOverdue,
      count30Days,
      count60Days,
      count90Days,
      countPlus90Days,
      amount30Days,
      amount60Days,
      amount90Days,
      amountPlus90Days,
      collectionAgencyTotal,
      recoveryRate
    });
  };

  const sendReminder = async (itemId: string, type: PaymentReminder['type'], method: PaymentReminder['method']) => {
    const newReminder: PaymentReminder = {
      id: Date.now().toString(),
      type,
      sentAt: new Date().toISOString(),
      method,
      content: reminderTemplate || `${type.replace('_', ' ')} sent via ${method}`
    };

    setCollectionItems(prev => prev.map(item =>
      item.id === itemId
        ? {
            ...item,
            reminders: [...item.reminders, newReminder],
            lastContactDate: new Date().toISOString(),
            nextActionDate: addDays(new Date(), getNextActionDays(type)).toISOString()
          }
        : item
    ));

    toast({
      title: "Reminder Sent",
      description: `${type.replace('_', ' ').toUpperCase()} has been sent via ${method}.`,
    });

    setShowReminderForm(false);
    setReminderTemplate('');
  };

  const assignToCollection = async (itemId: string) => {
    setCollectionItems(prev => prev.map(item =>
      item.id === itemId
        ? {
            ...item,
            status: 'collection',
            priority: 'critical',
            collectionAgency: {
              name: 'ABC Collection Services',
              contactPerson: 'Mike Davis',
              assignedDate: new Date().toISOString(),
              commissionRate: 25
            },
            nextActionDate: addDays(new Date(), 30).toISOString()
          }
        : item
    ));

    toast({
      title: "Assigned to Collection",
      description: "Account has been assigned to collection agency.",
    });
  };

  const setupPaymentPlan = async (itemId: string, installments: number, monthlyAmount: number) => {
    setCollectionItems(prev => prev.map(item =>
      item.id === itemId
        ? {
            ...item,
            paymentPlan: {
              totalAmount: item.remainingBalance,
              installments,
              monthlyAmount,
              startDate: new Date().toISOString(),
              paymentsReceived: 0
            },
            priority: 'low',
            nextActionDate: addDays(new Date(), 30).toISOString()
          }
        : item
    ));

    toast({
      title: "Payment Plan Created",
      description: `Payment plan set up: ${installments} payments of $${monthlyAmount.toLocaleString()}.`,
    });
  };

  const addNote = async (itemId: string, note: string) => {
    setCollectionItems(prev => prev.map(item =>
      item.id === itemId
        ? {
            ...item,
            notes: [...item.notes, `${format(new Date(), 'MMM dd, yyyy')}: ${note}`],
            lastContactDate: new Date().toISOString()
          }
        : item
    ));

    toast({
      title: "Note Added",
      description: "Collection note has been added to the account.",
    });
  };

  const getNextActionDays = (reminderType: PaymentReminder['type']): number => {
    switch (reminderType) {
      case 'first_notice': return 14;
      case 'second_notice': return 10;
      case 'final_notice': return 7;
      case 'collection_agency': return 30;
      case 'legal_action': return 60;
      default: return 7;
    }
  };

  const getStatusBadgeVariant = (status: CollectionItem['status']) => {
    switch (status) {
      case 'current': return 'default';
      case 'overdue_1_30': return 'secondary';
      case 'overdue_31_60': return 'secondary';
      case 'overdue_61_90': return 'secondary';
      case 'overdue_90_plus': return 'destructive';
      case 'collection': return 'destructive';
      case 'legal': return 'destructive';
      case 'written_off': return 'secondary';
      default: return 'secondary';
    }
  };

  const getPriorityBadgeVariant = (priority: CollectionItem['priority']) => {
    switch (priority) {
      case 'low': return 'default';
      case 'medium': return 'secondary';
      case 'high': return 'secondary';
      case 'critical': return 'destructive';
      default: return 'default';
    }
  };

  const filteredItems = collectionItems.filter(item =>
    filterStatus === 'all' || item.status === filterStatus
  );

  return (
    <div className="space-y-6">
      {/* Summary Dashboard */}
      {summary && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Overdue</p>
                    <p className="text-2xl font-bold">${summary.totalOverdue.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-8 w-8 text-yellow-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">1-30 Days</p>
                    <p className="text-2xl font-bold">${summary.amount30Days.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{summary.count30Days} accounts</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-orange-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Collection Agency</p>
                    <p className="text-2xl font-bold">${summary.collectionAgencyTotal.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Recovery Rate</p>
                    <p className="text-2xl font-bold">{summary.recoveryRate.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Aging Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Accounts Receivable Aging</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">1-30 Days</p>
                  <p className="text-xl font-bold">${summary.amount30Days.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">{summary.count30Days} accounts</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">31-60 Days</p>
                  <p className="text-xl font-bold">${summary.amount60Days.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">{summary.count60Days} accounts</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">61-90 Days</p>
                  <p className="text-xl font-bold">${summary.amount90Days.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">{summary.count90Days} accounts</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">90+ Days</p>
                  <p className="text-xl font-bold">${summary.amountPlus90Days.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">{summary.countPlus90Days} accounts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Collection Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Collection Management
            </span>
            <Button onClick={() => setShowReminderForm(true)}>
              Send Reminder
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
                  <SelectItem value="overdue_1_30">1-30 Days Overdue</SelectItem>
                  <SelectItem value="overdue_31_60">31-60 Days Overdue</SelectItem>
                  <SelectItem value="overdue_61_90">61-90 Days Overdue</SelectItem>
                  <SelectItem value="overdue_90_plus">90+ Days Overdue</SelectItem>
                  <SelectItem value="collection">Collection Agency</SelectItem>
                  <SelectItem value="legal">Legal Action</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Collection Items List */}
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <div key={item.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium">{item.invoiceNumber}</h3>
                    <Badge variant={getStatusBadgeVariant(item.status)}>
                      {item.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <Badge variant={getPriorityBadgeVariant(item.priority)}>
                      {item.priority.toUpperCase()}
                    </Badge>
                    <Badge variant="destructive">
                      {item.daysOverdue} days overdue
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setSelectedItem(item)}
                    >
                      Send Reminder
                    </Button>
                    {item.status !== 'collection' && item.remainingBalance > 10000 && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => assignToCollection(item.id)}
                      >
                        Assign to Collection
                      </Button>
                    )}
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Client:</span>
                    <div className="font-medium">{item.client.name}</div>
                    <div className="text-sm text-muted-foreground">{item.client.contactPerson}</div>
                  </div>
                  
                  <div>
                    <span className="text-sm text-muted-foreground">Project:</span>
                    <div className="font-medium">{item.project.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Due: {format(new Date(item.dueDate), 'MMM dd, yyyy')}
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-sm text-muted-foreground">Amount:</span>
                    <div className="font-medium">${item.originalAmount.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">
                      Outstanding: ${item.remainingBalance.toLocaleString()}
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-sm text-muted-foreground">Last Contact:</span>
                    <div className="font-medium">
                      {item.lastContactDate ? format(new Date(item.lastContactDate), 'MMM dd, yyyy') : 'None'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Next Action: {format(new Date(item.nextActionDate), 'MMM dd, yyyy')}
                    </div>
                  </div>
                </div>

                {/* Payment Plan Info */}
                {item.paymentPlan && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">Payment Plan Active</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-blue-600">Monthly Payment:</span>
                        <div className="font-medium">${item.paymentPlan.monthlyAmount.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-blue-600">Installments:</span>
                        <div className="font-medium">{item.paymentPlan.installments}</div>
                      </div>
                      <div>
                        <span className="text-blue-600">Payments Received:</span>
                        <div className="font-medium">{item.paymentPlan.paymentsReceived}</div>
                      </div>
                      <div>
                        <span className="text-blue-600">Next Payment:</span>
                        <div className="font-medium">{format(new Date(item.paymentPlan.startDate), 'MMM dd')}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Collection Agency Info */}
                {item.collectionAgency && (
                  <div className="p-3 bg-red-50 rounded-lg">
                    <h4 className="font-medium text-red-800 mb-2">Collection Agency Assigned</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-red-600">Agency:</span>
                        <div className="font-medium">{item.collectionAgency.name}</div>
                      </div>
                      <div>
                        <span className="text-red-600">Contact:</span>
                        <div className="font-medium">{item.collectionAgency.contactPerson}</div>
                      </div>
                      <div>
                        <span className="text-red-600">Commission:</span>
                        <div className="font-medium">{item.collectionAgency.commissionRate}%</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reminders History */}
                {item.reminders.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Reminder History</h4>
                    <div className="space-y-1">
                      {item.reminders.map((reminder) => (
                        <div key={reminder.id} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {reminder.type.replace('_', ' ').toUpperCase()}
                            </Badge>
                            <span>{format(new Date(reminder.sentAt), 'MMM dd, yyyy')}</span>
                            <span className="text-muted-foreground">via {reminder.method}</span>
                          </div>
                          {reminder.response && (
                            <Badge variant="default" className="text-xs">
                              Response Received
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {item.notes.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Collection Notes</h4>
                    <div className="space-y-1">
                      {item.notes.slice(-3).map((note, index) => (
                        <div key={index} className="text-sm p-2 bg-muted rounded">
                          {note}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Progress 
                  value={(item.paidAmount / item.originalAmount) * 100} 
                  className="w-full" 
                />
              </div>
            ))}

            {filteredItems.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No collection items found for the selected filter.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};