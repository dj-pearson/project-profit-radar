import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Clock, DollarSign, FileText, Camera, CheckCircle, AlertCircle, User, CreditCard, Download } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProjectUpdate {
  id: string;
  title: string;
  description: string;
  photos: string[];
  created_at: string;
  created_by_name: string;
  phase: string;
  completion_percentage: number;
}

interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  status: 'completed' | 'in_progress' | 'upcoming' | 'delayed';
  type: 'milestone' | 'task' | 'delivery' | 'inspection';
  dependencies?: string[];
}

interface ChangeOrder {
  id: string;
  title: string;
  description: string;
  amount: number;
  impact_days: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  documents: string[];
  justification: string;
}

interface PaymentItem {
  id: string;
  description: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
  due_date: string;
  invoice_number: string;
  work_completed_percentage: number;
  retention_amount: number;
}

export const ClientPortalEnhancement: React.FC = () => {
  const [projectUpdates, setProjectUpdates] = useState<ProjectUpdate[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [selectedUpdate, setSelectedUpdate] = useState<ProjectUpdate | null>(null);
  const [changeOrderResponse, setChangeOrderResponse] = useState<{[key: string]: {approved: boolean, comments: string}}>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadClientData();
  }, []);

  const loadClientData = async () => {
    setLoading(true);
    try {
      // Simulate loading project data
      setProjectUpdates([
        {
          id: '1',
          title: 'Foundation Completed',
          description: 'Foundation pouring completed successfully. All inspections passed.',
          photos: ['/placeholder-construction-1.jpg', '/placeholder-construction-2.jpg'],
          created_at: '2024-01-20T10:00:00Z',
          created_by_name: 'Mike Johnson',
          phase: 'Foundation',
          completion_percentage: 15
        },
        {
          id: '2',
          title: 'Framing Progress',
          description: 'First floor framing 80% complete. Weather conditions favorable.',
          photos: ['/placeholder-construction-3.jpg'],
          created_at: '2024-01-25T14:30:00Z',
          created_by_name: 'Sarah Wilson',
          phase: 'Framing',
          completion_percentage: 35
        }
      ]);

      setTimeline([
        {
          id: '1',
          title: 'Site Preparation',
          description: 'Clear and grade construction site',
          date: '2024-01-15',
          status: 'completed',
          type: 'milestone'
        },
        {
          id: '2',
          title: 'Foundation Work',
          description: 'Pour concrete foundation and install utilities',
          date: '2024-01-20',
          status: 'completed',
          type: 'milestone'
        },
        {
          id: '3',
          title: 'Framing',
          description: 'Complete structural framing for all floors',
          date: '2024-02-01',
          status: 'in_progress',
          type: 'milestone'
        },
        {
          id: '4',
          title: 'Electrical Rough-in',
          description: 'Install electrical wiring and panels',
          date: '2024-02-15',
          status: 'upcoming',
          type: 'task'
        }
      ]);

      setChangeOrders([
        {
          id: '1',
          title: 'Additional Bathroom',
          description: 'Client requested addition of half bathroom on first floor',
          amount: 15000,
          impact_days: 10,
          status: 'pending',
          created_at: '2024-01-22T09:00:00Z',
          documents: ['/change-order-1.pdf'],
          justification: 'Improves home value and functionality for growing family'
        }
      ]);

      setPayments([
        {
          id: '1',
          description: 'Foundation and Site Work',
          amount: 45000,
          status: 'paid',
          due_date: '2024-01-25',
          invoice_number: 'INV-001',
          work_completed_percentage: 20,
          retention_amount: 2250
        },
        {
          id: '2',
          description: 'Framing and Structural Work',
          amount: 38000,
          status: 'pending',
          due_date: '2024-02-10',
          invoice_number: 'INV-002',
          work_completed_percentage: 35,
          retention_amount: 1900
        }
      ]);

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load client data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangeOrderResponse = async (changeOrderId: string, approved: boolean, comments: string) => {
    try {
      // Simulate API call to respond to change order
      setChangeOrders(prev => prev.map(co => 
        co.id === changeOrderId 
          ? { ...co, status: approved ? 'approved' : 'rejected' }
          : co
      ));

      toast({
        title: "Response Submitted",
        description: `Change order ${approved ? 'approved' : 'rejected'} successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit response",
        variant: "destructive",
      });
    }
  };

  const makePayment = async (paymentId: string) => {
    try {
      // Simulate payment processing
      setPayments(prev => prev.map(p => 
        p.id === paymentId 
          ? { ...p, status: 'paid' as const }
          : p
      ));

      toast({
        title: "Payment Processed",
        description: "Payment submitted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Payment processing failed",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': case 'paid': case 'approved': return 'default';
      case 'in_progress': case 'pending': return 'secondary';
      case 'delayed': case 'overdue': case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const getTimelineIcon = (type: string, status: string) => {
    if (status === 'completed') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === 'delayed') return <AlertCircle className="h-4 w-4 text-red-500" />;
    return <Clock className="h-4 w-4 text-blue-500" />;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Project Dashboard</h1>
          <p className="text-muted-foreground">Welcome to your project portal. Stay updated on progress, approve changes, and manage payments.</p>
        </div>

        <Tabs defaultValue="updates" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="updates" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Updates
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Timeline
            </TabsTrigger>
            <TabsTrigger value="changes" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Change Orders
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Payments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="updates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Updates</CardTitle>
                <CardDescription>Latest photos and progress reports from the field</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {projectUpdates.map((update) => (
                    <Card key={update.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">{update.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {new Date(update.created_at).toLocaleDateString()} • {update.created_by_name}
                            </p>
                          </div>
                          <Badge variant="outline">{update.phase}</Badge>
                        </div>
                        
                        <p className="text-sm mb-3">{update.description}</p>
                        
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-muted-foreground">Progress</span>
                            <span className="text-sm font-medium">{update.completion_percentage}%</span>
                          </div>
                          <Progress value={update.completion_percentage} className="h-2" />
                        </div>
                        
                        {update.photos.length > 0 && (
                          <div className="flex gap-2">
                            {update.photos.map((photo, index) => (
                              <Dialog key={index}>
                                <DialogTrigger asChild>
                                  <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center cursor-pointer hover:bg-muted/80">
                                    <Camera className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl">
                                  <DialogHeader>
                                    <DialogTitle>{update.title} - Photo {index + 1}</DialogTitle>
                                  </DialogHeader>
                                  <div className="w-full h-96 bg-muted rounded-lg flex items-center justify-center">
                                    <Camera className="h-12 w-12 text-muted-foreground" />
                                  </div>
                                </DialogContent>
                              </Dialog>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Interactive Project Timeline</CardTitle>
                <CardDescription>Track project milestones and upcoming deadlines</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {timeline.map((event, index) => (
                    <div key={event.id} className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        {getTimelineIcon(event.type, event.status)}
                        {index < timeline.length - 1 && (
                          <div className="w-px h-12 bg-border mt-2" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium">{event.title}</h3>
                          <div className="flex items-center gap-2">
                            <Badge variant={getStatusColor(event.status)}>
                              {event.status.replace('_', ' ')}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(event.date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="changes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Change Order Approvals</CardTitle>
                <CardDescription>Review and approve project modifications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {changeOrders.map((changeOrder) => (
                    <Card key={changeOrder.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">{changeOrder.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {new Date(changeOrder.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={getStatusColor(changeOrder.status)}>
                            {changeOrder.status}
                          </Badge>
                        </div>
                        
                        <p className="text-sm mb-3">{changeOrder.description}</p>
                        <p className="text-sm text-muted-foreground mb-3">{changeOrder.justification}</p>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            <span className="text-sm">Cost: ${changeOrder.amount.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span className="text-sm">Time Impact: {changeOrder.impact_days} days</span>
                          </div>
                        </div>
                        
                        {changeOrder.documents.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium mb-2">Documents</h4>
                            {changeOrder.documents.map((doc, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                <span className="text-sm">{doc.split('/').pop()}</span>
                                <Button variant="ghost" size="sm">
                                  <Download className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {changeOrder.status === 'pending' && (
                          <div className="space-y-3">
                            <Textarea
                              placeholder="Add comments (optional)"
                              value={changeOrderResponse[changeOrder.id]?.comments || ''}
                              onChange={(e) => setChangeOrderResponse(prev => ({
                                ...prev,
                                [changeOrder.id]: { ...prev[changeOrder.id], comments: e.target.value }
                              }))}
                            />
                            <div className="flex gap-2">
                              <Button 
                                variant="default" 
                                onClick={() => handleChangeOrderResponse(changeOrder.id, true, changeOrderResponse[changeOrder.id]?.comments || '')}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </Button>
                              <Button 
                                variant="destructive" 
                                onClick={() => handleChangeOrderResponse(changeOrder.id, false, changeOrderResponse[changeOrder.id]?.comments || '')}
                              >
                                <AlertCircle className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Payment Portal</CardTitle>
                <CardDescription>Manage progress billing and payments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {payments.map((payment) => (
                    <Card key={payment.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">{payment.description}</h3>
                            <p className="text-sm text-muted-foreground">
                              Invoice: {payment.invoice_number} • Due: {new Date(payment.due_date).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={getStatusColor(payment.status)}>
                            {payment.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Amount</p>
                            <p className="font-semibold">${payment.amount.toLocaleString()}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Work Complete</p>
                            <p className="font-semibold">{payment.work_completed_percentage}%</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Retention</p>
                            <p className="font-semibold">${payment.retention_amount.toLocaleString()}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Net Amount</p>
                            <p className="font-semibold">${(payment.amount - payment.retention_amount).toLocaleString()}</p>
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-muted-foreground">Work Progress</span>
                            <span className="text-sm font-medium">{payment.work_completed_percentage}%</span>
                          </div>
                          <Progress value={payment.work_completed_percentage} className="h-2" />
                        </div>
                        
                        {payment.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button onClick={() => makePayment(payment.id)}>
                              <CreditCard className="h-4 w-4 mr-2" />
                              Pay Now
                            </Button>
                            <Button variant="outline">
                              <Download className="h-4 w-4 mr-2" />
                              Download Invoice
                            </Button>
                          </div>
                        )}
                        
                        {payment.status === 'paid' && (
                          <Button variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Download Receipt
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ClientPortalEnhancement;