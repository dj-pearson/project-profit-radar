import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Upload, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const certificationSchema = z.object({
  user_id: z.string().min(1, "Please select an employee"),
  certification_name: z.string().min(1, "Certification name is required"),
  certification_type: z.enum([
    'osha_10', 'osha_30', 'first_aid', 'cpr', 'forklift', 'crane', 'custom'
  ], {
    required_error: "Please select a certification type",
  }),
  issuing_organization: z.string().optional(),
  certification_number: z.string().optional(),
  issue_date: z.date().optional(),
  expiration_date: z.date().optional(),
  renewal_required: z.boolean().default(true),
  notes: z.string().optional(),
});

interface TrainingCertificationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  editingCertification?: any;
}

const TrainingCertificationForm = ({ onSuccess, onCancel, editingCertification }: TrainingCertificationFormProps) => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof certificationSchema>>({
    resolver: zodResolver(certificationSchema),
    defaultValues: editingCertification ? {
      user_id: editingCertification.user_id,
      certification_name: editingCertification.certification_name,
      certification_type: editingCertification.certification_type,
      issuing_organization: editingCertification.issuing_organization || '',
      certification_number: editingCertification.certification_number || '',
      issue_date: editingCertification.issue_date ? new Date(editingCertification.issue_date) : undefined,
      expiration_date: editingCertification.expiration_date ? new Date(editingCertification.expiration_date) : undefined,
      renewal_required: editingCertification.renewal_required ?? true,
      notes: editingCertification.notes || '',
    } : {
      renewal_required: true,
    },
  });

  // Load company users
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('company_id')
          .eq('id', user?.id)
          .single();

        if (profile?.company_id) {
          const { data } = await supabase
            .from('user_profiles')
            .select('id, first_name, last_name, email, role')
            .eq('company_id', profile.company_id)
            .eq('is_active', true);
          
          setUsers(data || []);
        }
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };

    if (user) {
      loadUsers();
    }
  }, [user]);

  const onSubmit = async (values: z.infer<typeof certificationSchema>) => {
    setLoading(true);
    try {
      // Get user's company
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
        user_id: values.user_id,
        certification_name: values.certification_name,
        certification_type: values.certification_type,
        issuing_organization: values.issuing_organization || null,
        certification_number: values.certification_number || null,
        issue_date: values.issue_date?.toISOString().split('T')[0] || null,
        expiration_date: values.expiration_date?.toISOString().split('T')[0] || null,
        renewal_required: values.renewal_required,
        notes: values.notes || null,
        created_by: user?.id,
      };

      let result;
      if (editingCertification) {
        result = await supabase
          .from('training_certifications')
          .update(certificationData)
          .eq('id', editingCertification.id);
      } else {
        result = await supabase
          .from('training_certifications')
          .insert(certificationData);
      }

      if (result.error) throw result.error;

      toast({
        title: "Success",
        description: `Training certification has been ${editingCertification ? 'updated' : 'added'} successfully`,
      });

      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error('Error saving certification:', error);
      toast({
        title: "Error",
        description: `Failed to ${editingCertification ? 'update' : 'add'} training certification`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const certificationTypes = [
    { value: 'osha_10', label: 'OSHA 10-Hour' },
    { value: 'osha_30', label: 'OSHA 30-Hour' },
    { value: 'first_aid', label: 'First Aid' },
    { value: 'cpr', label: 'CPR' },
    { value: 'forklift', label: 'Forklift Operation' },
    { value: 'crane', label: 'Crane Operation' },
    { value: 'custom', label: 'Custom/Other' },
  ];

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>
          {editingCertification ? 'Edit' : 'Add'} Training Certification
        </CardTitle>
        <CardDescription>
          Track employee training and certifications to ensure compliance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Employee Selection */}
            <FormField
              control={form.control}
              name="user_id"
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
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.first_name && user.last_name 
                            ? `${user.first_name} ${user.last_name} (${user.email})`
                            : user.email
                          }
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Certification Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="certification_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Certification Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select certification type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {certificationTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
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
                      <Input placeholder="e.g., OSHA 10-Hour Construction Safety" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="issuing_organization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issuing Organization</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., OSHA, Red Cross, NCCER" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="certification_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Certification Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Certification ID/Number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="issue_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Issue Date</FormLabel>
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
                              <span>Pick issue date</span>
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
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
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
            </div>

            {/* Renewal Required */}
            <FormField
              control={form.control}
              name="renewal_required"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Renewal Required</FormLabel>
                    <FormDescription>
                      Check if this certification requires renewal before expiration
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Document Upload Placeholder */}
            <div className="space-y-4">
              <FormLabel>Certification Document</FormLabel>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Upload certification document (PDF, JPG, PNG)
                  </p>
                  <Button type="button" variant="outline" size="sm">
                    <Upload className="mr-2 h-4 w-4" />
                    Choose File
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Document upload functionality will be available in a future update
              </p>
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes about this certification..."
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit" variant="construction" disabled={loading}>
                {loading ? 'Saving...' : editingCertification ? 'Update Certification' : 'Add Certification'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default TrainingCertificationForm;