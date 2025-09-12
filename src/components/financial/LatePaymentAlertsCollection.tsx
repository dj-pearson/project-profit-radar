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

interface CollectionItem {
  id: string;
  projectId: string | null;
  projectName?: string;
  clientName: string;
  invoiceNumber: string;
  originalAmount: number;
  currentBalance: number;
  daysOverdue: number;
  status: string;
  priority: string;
  lastContactDate?: string;
  nextActionDate?: string;
  notes?: string;
}

interface CollectionSummary {
  totalOverdue: number;
  count30Days: number;
  count60Days: number;
  count90Days: number;
  countOver90: number;
  amount30Days: number;
  amount60Days: number;
  amount90Days: number;
  amountOver90: number;
  totalCollected: number;
}

export default function LatePaymentAlertsCollection() {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [collectionItems, setCollectionItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<CollectionItem | null>(null);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [reminderContent, setReminderContent] = useState('');
  const [reminderMethod, setReminderMethod] = useState<'email' | 'phone' | 'mail'>('email');

  useEffect(() => {
    loadCollectionData();
  }, [userProfile?.company_id]);

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
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (): CollectionSummary => {
    const totalOutstanding = collectionItems.reduce((sum, item) => sum + item.currentBalance, 0);

    const count30Days = collectionItems.filter(item => item.daysOverdue <= 30).length;
    const count60Days = collectionItems.filter(item => item.daysOverdue > 30 && item.daysOverdue <= 60).length;
    const count90Days = collectionItems.filter(item => item.daysOverdue > 60 && item.daysOverdue <= 90).length;
    const countOver90 = collectionItems.filter(item => item.daysOverdue > 90).length;

    const amount30Days = collectionItems.filter(item => item.daysOverdue <= 30).reduce((sum, item) => sum + item.currentBalance, 0);
    const amount60Days = collectionItems.filter(item => item.daysOverdue > 30 && item.daysOverdue <= 60).reduce((sum, item) => sum + item.currentBalance, 0);
    const amount90Days = collectionItems.filter(item => item.daysOverdue > 60 && item.daysOverdue <= 90).reduce((sum, item) => sum + item.currentBalance, 0);
    const amountOver90 = collectionItems.filter(item => item.daysOverdue > 90).reduce((sum, item) => sum + item.currentBalance, 0);

    return {
      totalOverdue: totalOutstanding,
      count30Days,
      count60Days,
      count90Days,
      countOver90,
      amount30Days,
      amount60Days,
      amount90Days,
      amountOver90,
      totalCollected: 0
    };
  };

  const sendReminder = async (itemId: string) => {
    try {
      const item = collectionItems.find(i => i.id === itemId);
      if (!item) return;

      toast({
        title: "Reminder Sent",
        description: `${reminderMethod} reminder sent to ${item.clientName}`,
      });

      // Update the item's last contact date
      await supabase
        .from('collection_items')
        .update({ 
          last_contact_date: new Date().toISOString().split('T')[0],
          notes: `${item.notes || ''}\nReminder sent via ${reminderMethod}: ${new Date().toLocaleDateString()}`
        })
        .eq('id', itemId);

      setShowReminderForm(false);
      setSelectedItem(null);
      loadCollectionData();
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast({
        title: "Error",
        description: "Failed to send reminder",
        variant: "destructive",
      });
    }
  };

  const scheduleFollowUp = async (itemId: string, followUpDate: Date) => {
    try {
      await supabase
        .from('collection_items')
        .update({ 
          next_action_date: followUpDate.toISOString().split('T')[0]
        })
        .eq('id', itemId);

      toast({
        title: "Follow-up Scheduled",
        description: `Follow-up scheduled for ${format(followUpDate, 'MMM dd, yyyy')}`,
      });

      loadCollectionData();
    } catch (error) {
      console.error('Error scheduling follow-up:', error);
      toast({
        title: "Error",
        description: "Failed to schedule follow-up",
        variant: "destructive",
      });
    }
  };

  const markAsPaid = async (itemId: string, amount: number) => {
    try {
      const item = collectionItems.find(i => i.id === itemId);
      if (!item) return;

      const newBalance = Math.max(0, item.currentBalance - amount);
      const newStatus = newBalance === 0 ? 'collected' : item.status;

      await supabase
        .from('collection_items')
        .update({ 
          current_balance: newBalance,
          status: newStatus,
          notes: `${item.notes || ''}\nPayment received: $${amount} on ${new Date().toLocaleDateString()}`
        })
        .eq('id', itemId);

      toast({
        title: "Payment Recorded",
        description: `$${amount} payment recorded for ${item.clientName}`,
      });

      loadCollectionData();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'current': return 'default';
      case 'overdue': return 'destructive';
      case 'collection': return 'destructive';
      case 'legal': return 'destructive';
      case 'collected': return 'default';
      case 'written_off': return 'secondary';
      default: return 'secondary';
    }
  };

  const filteredItems = collectionItems.filter(item => {
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || item.priority === filterPriority;
    const matchesSearch = searchTerm === '' || 
      item.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesPriority && matchesSearch;
  });

  const summary = calculateSummary();

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Collection Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Outstanding</p>
                <p className="text-2xl font-bold">${summary.totalOverdue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">0-30 Days</p>
                <p className="text-2xl font-bold">{summary.count30Days}</p>
                <p className="text-xs text-muted-foreground">${summary.amount30Days.toLocaleString()}</p>
              </div>
              <Clock className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">31-90 Days</p>
                <p className="text-2xl font-bold">{summary.count60Days + summary.count90Days}</p>
                <p className="text-xs text-muted-foreground">${(summary.amount60Days + summary.amount90Days).toLocaleString()}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">90+ Days</p>
                <p className="text-2xl font-bold">{summary.countOver90}</p>
                <p className="text-xs text-muted-foreground">${summary.amountOver90.toLocaleString()}</p>
              </div>
              <Users className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Collection Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex-1 min-w-64">
              <Input
                placeholder="Search clients or invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="current">Current</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="collection">Collection</SelectItem>
                <SelectItem value="legal">Legal</SelectItem>
                <SelectItem value="collected">Collected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Collection Items List */}
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{item.clientName}</h3>
                        <Badge variant={getPriorityColor(item.priority)}>{item.priority}</Badge>
                        <Badge variant={getStatusColor(item.status)}>{item.status}</Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Invoice</p>
                          <p className="font-medium">{item.invoiceNumber}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Amount</p>
                          <p className="font-medium">${item.currentBalance.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Days Overdue</p>
                          <p className="font-medium">{item.daysOverdue} days</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Project</p>
                          <p className="font-medium">{item.projectName}</p>
                        </div>
                      </div>
                      {item.notes && (
                        <div className="mt-2">
                          <p className="text-muted-foreground text-xs">Notes</p>
                          <p className="text-sm">{item.notes}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedItem(item);
                          setShowReminderForm(true);
                        }}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Send Reminder
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => scheduleFollowUp(item.id, addDays(new Date(), 7))}
                      >
                        <Calendar className="h-4 w-4 mr-1" />
                        Schedule Follow-up
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markAsPaid(item.id, item.currentBalance)}
                      >
                        Mark Paid
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No collection items found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reminder Form Modal */}
      {showReminderForm && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Send Reminder to {selectedItem.clientName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Method</Label>
                <Select value={reminderMethod} onValueChange={(value: 'email' | 'phone' | 'mail') => setReminderMethod(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="mail">Mail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Message</Label>
                <Textarea
                  placeholder="Enter reminder message..."
                  value={reminderContent}
                  onChange={(e) => setReminderContent(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => sendReminder(selectedItem.id)}>
                  Send Reminder
                </Button>
                <Button variant="outline" onClick={() => setShowReminderForm(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}