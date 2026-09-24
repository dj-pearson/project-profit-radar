import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Plus, Users, AlertTriangle, CheckCircle, Calendar as CalendarIcon, Download, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useTrainingCertifications, type Certification } from '@/hooks/useSafetyPage';
import { ErrorState } from '@/components/common/ErrorState';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ListSkeleton } from '@/components/ui/skeletons';

const certificationSchema = z.object({
  employee_id: z.string().min(1, "Please select an employee"),
  certification_name: z.string().min(1, "Certification name is required"),
  certification_type: z.string().min(1, "Certification type is required"),
  training_provider: z.string().optional(),
  completion_date: z.date({ required_error: "Completion date is required" }),
  expiration_date: z.date().optional(),
  certificate_url: z.string().optional(),
});

const TrainingCertificationManager = () => {
  const training = useTrainingCertifications();
  const { certifications, employees } = training;
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof certificationSchema>>({
    resolver: zodResolver(certificationSchema),
    defaultValues: {
      certification_name: '',
      certification_type: '',
      training_provider: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof certificationSchema>) => {
    try {
      await training.add({
        user_id: values.employee_id,
        certification_name: values.certification_name,
        certification_type: values.certification_type,
        issuing_organization: values.training_provider || null,
        issue_date: values.completion_date.toISOString().split('T')[0],
        expiration_date: values.expiration_date ? values.expiration_date.toISOString().split('T')[0] : null,
        document_url: values.certificate_url || null,
      });

      toast({
        title: "Success",
        description: "Training certification added successfully",
      });

      form.reset();
      setShowAddDialog(false);
    } catch (error) {
      console.error('Error adding certification:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add training certification",
        variant: "destructive"
      });
    }
  };

  const updateCertificationStatus = async (certificationId: string, newStatus: string) => {
    try {
      await training.setStatus(certificationId, newStatus);

      toast({
        title: "Success",
        description: `Certification status updated to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating certification:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update certification status",
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

  if (training.isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <ListSkeleton label="Loading training data" />
        </CardContent>
      </Card>
    );
  }

  if (training.error) {
    return (
      <ErrorState
        title="Training records could not be loaded"
        error={training.error}
        onRetry={() => { void training.refetch(); }}
      />
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
                        name="certification_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Certification Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., OSHA 30-Hour Construction Safety" {...field} />
                            </FormControl>
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
                              <Input placeholder="e.g., Safety, Equipment, Training" {...field} />
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
                      <h3 className="font-medium">{certification.employee_name ?? 'Not in your company user list'}</h3>
                      {getStatusBadge(certification)}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><strong>Certification:</strong> {certification.certification_name}</p>
                      <p><strong>Type:</strong> {certification.certification_type}</p>
                      {certification.issuing_organization && (
                        <p><strong>Provider:</strong> {certification.issuing_organization}</p>
                      )}
                      <p><strong>Issued:</strong> {new Date(certification.issue_date).toLocaleDateString()}</p>
                      {certification.expiration_date && (
                        <p><strong>Expires:</strong> {new Date(certification.expiration_date).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {certification.document_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={certification.document_url} target="_blank" rel="noopener noreferrer">
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