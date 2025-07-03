import { useState } from 'react';
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
import { CalendarIcon, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const incidentSchema = z.object({
  incident_date: z.date({
    required_error: "Incident date is required",
  }),
  incident_time: z.string().optional(),
  project_id: z.string().optional(),
  incident_type: z.enum(['injury', 'near_miss', 'property_damage', 'environmental'], {
    required_error: "Please select an incident type",
  }),
  severity: z.enum(['minor', 'moderate', 'severe', 'fatality'], {
    required_error: "Please select severity level",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters",
  }),
  location: z.string().optional(),
  injured_person_name: z.string().optional(),
  injured_person_job_title: z.string().optional(),
  body_part_affected: z.string().optional(),
  medical_attention_required: z.boolean().default(false),
  lost_time: z.boolean().default(false),
  days_away_from_work: z.number().min(0).default(0),
  immediate_actions: z.string().optional(),
  root_cause_analysis: z.string().optional(),
  corrective_actions: z.string().optional(),
  witnesses: z.string().optional(),
  osha_recordable: z.boolean().default(false),
});

interface SafetyIncidentFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const SafetyIncidentForm = ({ onSuccess, onCancel }: SafetyIncidentFormProps) => {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof incidentSchema>>({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      incident_date: new Date(),
      medical_attention_required: false,
      lost_time: false,
      days_away_from_work: 0,
      osha_recordable: false,
    },
  });

  // Load projects for dropdown
  useState(() => {
    const loadProjects = async () => {
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('company_id')
          .eq('id', user?.id)
          .single();

        if (profile?.company_id) {
          const { data } = await supabase
            .from('projects')
            .select('id, name')
            .eq('company_id', profile.company_id)
            .eq('status', 'active');
          
          setProjects(data || []);
        }
      } catch (error) {
        console.error('Error loading projects:', error);
      }
    };

    if (user) {
      loadProjects();
    }
  });

  const onSubmit = async (values: z.infer<typeof incidentSchema>) => {
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

      // Parse witnesses string into array
      const witnesses = values.witnesses 
        ? values.witnesses.split(',').map(w => w.trim()).filter(w => w.length > 0)
        : [];

      const incidentData = {
        company_id: profile.company_id,
        incident_date: values.incident_date.toISOString().split('T')[0],
        incident_time: values.incident_time || null,
        project_id: values.project_id || null,
        incident_type: values.incident_type,
        severity: values.severity,
        description: values.description,
        location: values.location || null,
        injured_person_name: values.injured_person_name || null,
        injured_person_job_title: values.injured_person_job_title || null,
        body_part_affected: values.body_part_affected || null,
        medical_attention_required: values.medical_attention_required,
        lost_time: values.lost_time,
        days_away_from_work: values.days_away_from_work,
        immediate_actions: values.immediate_actions || null,
        root_cause_analysis: values.root_cause_analysis || null,
        corrective_actions: values.corrective_actions || null,
        witnesses,
        osha_recordable: values.osha_recordable,
        reported_by: user?.id,
        created_by: user?.id,
      };

      const { error } = await supabase
        .from('safety_incidents')
        .insert(incidentData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Safety incident has been reported successfully",
      });

      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error('Error creating incident:', error);
      toast({
        title: "Error",
        description: "Failed to report safety incident",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Report Safety Incident</CardTitle>
        <CardDescription>
          Document workplace incidents, near misses, and safety concerns for OSHA compliance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="incident_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Incident Date *</FormLabel>
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
                              <span>Pick a date</span>
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
                name="incident_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Incident Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="project_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Associated Project</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
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
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Specific location where incident occurred" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Incident Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="incident_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Incident Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select incident type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="injury">Injury</SelectItem>
                        <SelectItem value="near_miss">Near Miss</SelectItem>
                        <SelectItem value="property_damage">Property Damage</SelectItem>
                        <SelectItem value="environmental">Environmental</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Severity Level *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select severity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="minor">Minor</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="severe">Severe</SelectItem>
                        <SelectItem value="fatality">Fatality</SelectItem>
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
                  <FormLabel>Incident Description *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Detailed description of what happened, including sequence of events..."
                      className="min-h-24"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Injury Details (conditional) */}
            {form.watch('incident_type') === 'injury' && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <h3 className="font-medium">Injury Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="injured_person_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Injured Person Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="injured_person_job_title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Job title/position" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="body_part_affected"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Body Part Affected</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., left hand, back, head" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="days_away_from_work"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Days Away from Work</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0"
                            placeholder="0"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex flex-col space-y-4">
                  <FormField
                    control={form.control}
                    name="medical_attention_required"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Medical attention required</FormLabel>
                          <FormDescription>
                            Check if medical treatment was needed
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lost_time"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Lost time incident</FormLabel>
                          <FormDescription>
                            Check if employee lost work time due to injury
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Investigation and Actions */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="immediate_actions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Immediate Actions Taken</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="What actions were taken immediately after the incident?"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="root_cause_analysis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Root Cause Analysis</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="What was the underlying cause of this incident?"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="corrective_actions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Corrective Actions</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="What steps will be taken to prevent similar incidents?"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="witnesses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Witnesses</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Names of witnesses (comma-separated)"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Enter witness names separated by commas
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* OSHA Compliance */}
            <FormField
              control={form.control}
              name="osha_recordable"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>OSHA Recordable</FormLabel>
                    <FormDescription>
                      Check if this incident meets OSHA recordkeeping requirements
                    </FormDescription>
                  </div>
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
                {loading ? 'Submitting...' : 'Report Incident'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default SafetyIncidentForm;