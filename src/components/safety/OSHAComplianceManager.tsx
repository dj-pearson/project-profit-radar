import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { 
  Plus, 
  Calendar as CalendarIcon,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const complianceSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  due_date: z.date({ required_error: "Due date is required" }),
  compliance_type: z.string().min(1, "Compliance type is required"),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  assigned_to: z.string().optional(),
});

interface ComplianceDeadline {
  id: string;
  title: string;
  description?: string;
  due_date: string;
  compliance_type: string;
  status: 'pending' | 'completed' | 'overdue';
  assigned_to?: string;
  assigned_user_name?: string;
  completion_date?: string;
  completion_notes?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
}

const OSHAComplianceManager = () => {
  const [deadlines, setDeadlines] = useState<ComplianceDeadline[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof complianceSchema>>({
    resolver: zodResolver(complianceSchema),
    defaultValues: {
      priority: 'medium',
    },
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) return;

      // Load employees and deadlines in parallel
      const [employeesResult, deadlinesResult] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('id, first_name, last_name')
          .eq('company_id', profile.company_id),
        
        supabase
          .from('osha_compliance_deadlines')
          .select('*')
          .eq('company_id', profile.company_id)
          .order('due_date', { ascending: true })
      ]);

      setEmployees(employeesResult.data || []);
      
      const deadlinesWithNames = (deadlinesResult.data || []).map(deadline => ({
        ...deadline,
        assigned_user_name: undefined
      }));
      
      setDeadlines(deadlinesWithNames);
    } catch (error) {
      console.error('Error loading compliance data:', error);
      toast({
        title: "Error",
        description: "Failed to load compliance data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof complianceSchema>) => {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('User company not found');
      }

      const deadlineData = {
        company_id: profile.company_id,
        title: values.title,
        description: values.description || null,
        due_date: values.due_date.toISOString().split('T')[0],
        compliance_type: values.compliance_type,
        priority: values.priority,
        assigned_to: values.assigned_to || null,
        created_by: user?.id,
      };

      const { error } = await supabase
        .from('osha_compliance_deadlines')
        .insert(deadlineData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Compliance deadline added successfully",
      });

      form.reset();
      setShowAddDialog(false);
      loadData();
    } catch (error) {
      console.error('Error adding compliance deadline:', error);
      toast({
        title: "Error",
        description: "Failed to add compliance deadline",
        variant: "destructive"
      });
    }
  };

  const markCompleted = async (deadlineId: string, notes?: string) => {
    try {
      const { error } = await supabase
        .from('osha_compliance_deadlines')
        .update({ 
          status: 'completed',
          completion_date: new Date().toISOString().split('T')[0],
          completion_notes: notes || null
        })
        .eq('id', deadlineId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Compliance deadline marked as completed",
      });

      loadData();
    } catch (error) {
      console.error('Error updating compliance deadline:', error);
      toast({
        title: "Error",
        description: "Failed to update compliance deadline",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (deadline: ComplianceDeadline) => {
    const isOverdue = new Date(deadline.due_date) < new Date() && deadline.status !== 'completed';
    
    if (deadline.status === 'completed') {
      return <Badge variant="default">Completed</Badge>;
    } else if (isOverdue) {
      return <Badge variant="destructive">Overdue</Badge>;
    } else {
      return <Badge variant="outline">Pending</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  // Calculate stats
  const pendingDeadlines = deadlines.filter(d => d.status === 'pending').length;
  const completedDeadlines = deadlines.filter(d => d.status === 'completed').length;
  const overdueDeadlines = deadlines.filter(d => 
    new Date(d.due_date) < new Date() && d.status !== 'completed'
  ).length;
  const upcomingDeadlines = deadlines.filter(d => {
    const dueDate = new Date(d.due_date);
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
    return dueDate >= today && dueDate <= thirtyDaysFromNow && d.status === 'pending';
  }).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading compliance data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingDeadlines}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Upcoming (30 days)</p>
                <p className="text-2xl font-bold text-orange-600">{upcomingDeadlines}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{overdueDeadlines}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{completedDeadlines}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* OSHA Compliance Deadlines */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-construction-orange" />
                OSHA Compliance Deadlines
              </CardTitle>
              <CardDescription>
                Track important compliance deadlines and requirements
              </CardDescription>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="bg-construction-orange hover:bg-construction-orange/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Deadline
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Compliance Deadline</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title *</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., OSHA 300 Log Filing" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="compliance_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Compliance Type *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="osha_300_log">OSHA 300 Log</SelectItem>
                                <SelectItem value="safety_training">Safety Training</SelectItem>
                                <SelectItem value="inspection">Safety Inspection</SelectItem>
                                <SelectItem value="reporting">Regulatory Reporting</SelectItem>
                                <SelectItem value="certification">Certification Renewal</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="due_date"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Due Date *</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>Pick due date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="critical">Critical</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="assigned_to"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Assign To</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select employee (optional)" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {employees.map((employee) => (
                                  <SelectItem key={employee.id} value={employee.id}>
                                    {employee.first_name} {employee.last_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Additional details about this compliance requirement..."
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-4">
                      <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-construction-orange hover:bg-construction-orange/90">
                        Add Deadline
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {deadlines.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Compliance Deadlines</h3>
              <p className="text-muted-foreground mb-4">
                Start tracking your OSHA compliance requirements
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {deadlines.map((deadline) => (
                <div key={deadline.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium">{deadline.title}</h3>
                      {getStatusBadge(deadline)}
                      {getPriorityBadge(deadline.priority)}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><strong>Type:</strong> {deadline.compliance_type.replace('_', ' ').toUpperCase()}</p>
                      <p><strong>Due Date:</strong> {new Date(deadline.due_date).toLocaleDateString()}</p>
                      {deadline.assigned_user_name && (
                        <p><strong>Assigned to:</strong> {deadline.assigned_user_name}</p>
                      )}
                      {deadline.description && (
                        <p><strong>Description:</strong> {deadline.description}</p>
                      )}
                      {deadline.completion_date && (
                        <p><strong>Completed:</strong> {new Date(deadline.completion_date).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {deadline.status === 'pending' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => markCompleted(deadline.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Complete
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

export default OSHAComplianceManager;