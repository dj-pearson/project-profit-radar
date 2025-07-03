import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Minus, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const checklistItemSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "Item text is required"),
  required: z.boolean().default(true),
  category: z.string().optional(),
});

const checklistSchema = z.object({
  name: z.string().min(1, "Checklist name is required"),
  description: z.string().optional(),
  checklist_type: z.enum(['daily', 'weekly', 'project_start', 'equipment', 'custom'], {
    required_error: "Please select a checklist type",
  }),
  industry_type: z.enum(['residential', 'commercial', 'civil_infrastructure', 'specialty_trades']).optional(),
  items: z.array(checklistItemSchema).min(1, "At least one checklist item is required"),
});

interface SafetyChecklistBuilderProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  editingChecklist?: any;
}

const SafetyChecklistBuilder = ({ onSuccess, onCancel, editingChecklist }: SafetyChecklistBuilderProps) => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof checklistSchema>>({
    resolver: zodResolver(checklistSchema),
    defaultValues: editingChecklist ? {
      name: editingChecklist.name,
      description: editingChecklist.description || '',
      checklist_type: editingChecklist.checklist_type,
      industry_type: editingChecklist.industry_type || undefined,
      items: editingChecklist.checklist_items || [
        { id: '1', text: '', required: true, category: '' }
      ],
    } : {
      name: '',
      description: '',
      items: [
        { id: '1', text: '', required: true, category: '' }
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const addItem = () => {
    append({
      id: Date.now().toString(),
      text: '',
      required: true,
      category: ''
    });
  };

  const removeItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const onSubmit = async (values: z.infer<typeof checklistSchema>) => {
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

      const checklistData = {
        name: values.name,
        description: values.description || null,
        checklist_type: values.checklist_type,
        industry_type: values.industry_type || null,
        checklist_items: values.items,
        company_id: profile.company_id,
        created_by: user?.id,
      };

      let result;
      if (editingChecklist) {
        result = await supabase
          .from('safety_checklists')
          .update(checklistData)
          .eq('id', editingChecklist.id);
      } else {
        result = await supabase
          .from('safety_checklists')
          .insert([checklistData]);
      }

      if (result.error) throw result.error;

      toast({
        title: "Success",
        description: `Safety checklist has been ${editingChecklist ? 'updated' : 'created'} successfully`,
      });

      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error('Error saving checklist:', error);
      toast({
        title: "Error",
        description: `Failed to ${editingChecklist ? 'update' : 'create'} safety checklist`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Predefined checklist templates
  const templates = {
    daily: [
      'PPE inspection (hard hats, safety glasses, gloves)',
      'Tool and equipment inspection',
      'Work area housekeeping check',
      'Emergency exits clear and accessible',
      'First aid kit availability',
      'Weather conditions assessment',
      'Hazard identification walkthrough',
    ],
    project_start: [
      'Site safety orientation completed',
      'Emergency procedures reviewed',
      'Safety data sheets available',
      'Permit requirements verified',
      'Utility markings confirmed',
      'Site security measures in place',
      'Waste disposal plan established',
    ],
    equipment: [
      'Visual inspection for damage',
      'Safety guards and devices functional',
      'Operating controls working properly',
      'Maintenance records up to date',
      'Operator certification current',
      'Fuel and fluid levels adequate',
      'Emergency stops tested',
    ]
  };

  const loadTemplate = (templateType: string) => {
    if (templates[templateType as keyof typeof templates]) {
      const templateItems = templates[templateType as keyof typeof templates].map((text, index) => ({
        id: (index + 1).toString(),
        text,
        required: true,
        category: ''
      }));
      
      form.setValue('items', templateItems);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>
          {editingChecklist ? 'Edit' : 'Create'} Safety Checklist
        </CardTitle>
        <CardDescription>
          Build customized safety checklists for your team to ensure consistent safety practices
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Checklist Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Daily Safety Checklist" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="checklist_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Checklist Type *</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      if (!editingChecklist) loadTemplate(value);
                    }} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select checklist type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="daily">Daily Safety Check</SelectItem>
                        <SelectItem value="weekly">Weekly Inspection</SelectItem>
                        <SelectItem value="project_start">Project Start</SelectItem>
                        <SelectItem value="equipment">Equipment Inspection</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="industry_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry Focus</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="residential">Residential</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                        <SelectItem value="civil_infrastructure">Civil/Infrastructure</SelectItem>
                        <SelectItem value="specialty_trades">Specialty Trades</SelectItem>
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
                      placeholder="Brief description of when and how to use this checklist..."
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Checklist Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Checklist Items</h3>
                <Button type="button" variant="outline" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-start gap-3 p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center mt-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      <FormField
                        control={form.control}
                        name={`items.${index}.text`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                placeholder={`Checklist item ${index + 1}`}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex items-center gap-4">
                        <FormField
                          control={form.control}
                          name={`items.${index}.required`}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
                                Required
                              </FormLabel>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`items.${index}.category`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input 
                                  placeholder="Category (optional)"
                                  {...field} 
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeItem(index)}
                      disabled={fields.length <= 1}
                      className="mt-2"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {form.formState.errors.items && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.items.message}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit" variant="construction" disabled={loading}>
                {loading ? 'Saving...' : editingChecklist ? 'Update Checklist' : 'Create Checklist'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default SafetyChecklistBuilder;