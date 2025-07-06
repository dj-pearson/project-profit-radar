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
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Calendar as CalendarIcon,
  Upload,
  Download,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const certificationSchema = z.object({
  employee_id: z.string().min(1, "Please select an employee"),
  certification_type: z.string().min(1, "Certification type is required"),
  training_provider: z.string().optional(),
  completion_date: z.date({ required_error: "Completion date is required" }),
  expiration_date: z.date().optional(),
  certificate_url: z.string().optional(),
});

interface Certification {
  id: string;
  employee_id: string;
  employee_name?: string;
  certification_type: string;
  training_provider?: string;
  completion_date: string;
  expiration_date?: string;
  certificate_url?: string;
  status: 'active' | 'expired' | 'revoked';
  created_at: string;
}

const TrainingCertificationManager = () => {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof certificationSchema>>({
    resolver: zodResolver(certificationSchema),
    defaultValues: {
      certification_type: '',
      training_provider: '',
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

      // Load employees and certifications in parallel
      const [employeesResult, certificationsResult] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('id, first_name, last_name')
          .eq('company_id', profile.company_id),
        
        supabase
          .from('training_certifications')
          .select('*')
          .eq('company_id', profile.company_id)
          .order('created_at', { ascending: false })
      ]);

      setEmployees(employeesResult.data || []);
      
      const certificationsWithNames = (certificationsResult.data || []).map(cert => ({
        ...cert,
        employee_name: 'Employee'
      }));
      
      setCertifications(certificationsWithNames);
    } catch (error) {
      console.error('Error loading training data:', error);
      toast({
        title: "Error",
        description: "Failed to load training data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof certificationSchema>) => {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) {
        throw new Error('User company not found');
      }

      const certificationData = {
        company_id: profile.company_id,
        employee_id: values.employee_id,
        certification_type: values.certification_type,
        training_provider: values.training_provider || null,
        completion_date: values.completion_date.toISOString().split('T')[0],
        expiration_date: values.expiration_date ? values.expiration_date.toISOString().split('T')[0] : null,
        certificate_url: values.certificate_url || null,
        created_by: user?.id,
      };

      const { error } = await supabase
        .from('training_certifications')
        .insert(certificationData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Training certification added successfully",
      });

      form.reset();
      setShowAddDialog(false);
      loadData();
    } catch (error) {
      console.error('Error adding certification:', error);
      toast({
        title: "Error",
        description: "Failed to add training certification",
        variant: "destructive"
      });
    }
  };

  const updateCertificationStatus = async (certificationId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('training_certifications')
        .update({ status: newStatus })
        .eq('id', certificationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Certification status updated to ${newStatus}`,
      });

      loadData();
    } catch (error) {
      console.error('Error updating certification:', error);
      toast({
        title: "Error",
        description: "Failed to update certification status",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (certification: Certification) => {
    const isExpired = certification.expiration_date && new Date(certification.expiration_date) < new Date();
    const isExpiringSoon = certification.expiration_date && 
      new Date(certification.expiration_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (certification.status === 'expired' || isExpired) {
      return <Badge variant="destructive">Expired</Badge>;
    } else if (isExpiringSoon) {
      return <Badge variant="destructive">Expiring Soon</Badge>;
    } else if (certification.status === 'active') {
      return <Badge variant="default">Active</Badge>;
    } else {
      return <Badge variant="outline">{certification.status}</Badge>;
    }
  };

  const activeCertifications = certifications.filter(c => c.status === 'active').length;
  const expiredCertifications = certifications.filter(c => c.status === 'expired').length;
  const expiringSoon = certifications.filter(c => {
    return c.expiration_date && 
      new Date(c.expiration_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) &&
      new Date(c.expiration_date) > new Date();
  }).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading training data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Certifications</p>
                <p className="text-2xl font-bold text-green-600">{activeCertifications}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Expiring Soon</p>
                <p className="text-2xl font-bold text-orange-600">{expiringSoon}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Expired</p>
                <p className="text-2xl font-bold text-red-600">{expiredCertifications}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Training Certifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-construction-orange" />
                Training & Certifications
              </CardTitle>
              <CardDescription>
                Track employee training, certifications, and renewal dates
              </CardDescription>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="bg-construction-orange hover:bg-construction-orange/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Certification
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Training Certification</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="employee_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Employee *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select employee" />
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

                      <FormField
                        control={form.control}
                        name="certification_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Certification Type *</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., OSHA 30-Hour Construction" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="training_provider"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Training Provider</FormLabel>
                            <FormControl>
                              <Input placeholder="Training organization name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="completion_date"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Completion Date *</FormLabel>
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
                                      <span>Pick completion date</span>
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
                                  disabled={(date) => date > new Date()}
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
                        name="expiration_date"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Expiration Date</FormLabel>
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
                                      <span>Pick expiration date</span>
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
                                  disabled={(date) => date < new Date()}
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
                        name="certificate_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Certificate URL</FormLabel>
                            <FormControl>
                              <Input placeholder="Link to certificate file" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end space-x-4">
                      <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-construction-orange hover:bg-construction-orange/90">
                        Add Certification
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {certifications.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Training Records</h3>
              <p className="text-muted-foreground mb-4">
                Start tracking employee training and certifications
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {certifications.map((certification) => (
                <div key={certification.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium">{certification.employee_name}</h3>
                      {getStatusBadge(certification)}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><strong>Certification:</strong> {certification.certification_type}</p>
                      {certification.training_provider && (
                        <p><strong>Provider:</strong> {certification.training_provider}</p>
                      )}
                      <p><strong>Completed:</strong> {new Date(certification.completion_date).toLocaleDateString()}</p>
                      {certification.expiration_date && (
                        <p><strong>Expires:</strong> {new Date(certification.expiration_date).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {certification.certificate_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={certification.certificate_url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" />
                          Certificate
                        </a>
                      </Button>
                    )}
                    {certification.status === 'active' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => updateCertificationStatus(certification.id, 'expired')}
                      >
                        Mark Expired
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

export default TrainingCertificationManager;