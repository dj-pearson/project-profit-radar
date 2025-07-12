import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Trash2, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const estimateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  client_name: z.string().min(1, "Client name is required"),
  client_email: z.string().email("Valid email is required"),
  client_phone: z.string().optional(),
  site_address: z.string().optional(),
  project_id: z.string().optional(),
  markup_percentage: z.number().min(0).max(100),
  tax_percentage: z.number().min(0).max(100),
  discount_amount: z.number().min(0),
  valid_until: z.date().optional(),
  notes: z.string().optional(),
  terms_and_conditions: z.string().optional(),
});

type EstimateFormData = z.infer<typeof estimateSchema>;

interface LineItem {
  id: string;
  item_name: string;
  description: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  category: string;
}

interface EstimateFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  estimateId?: string;
}

export function EstimateForm({ onSuccess, onCancel, estimateId }: EstimateFormProps) {
  const { toast } = useToast();
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [costCodes, setCostCodes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<EstimateFormData>({
    resolver: zodResolver(estimateSchema),
    defaultValues: {
      markup_percentage: 20,
      tax_percentage: 0,
      discount_amount: 0,
    },
  });

  useEffect(() => {
    fetchProjects();
    fetchCostCodes();
    if (estimateId) {
      fetchEstimate();
    }
  }, [estimateId]);

  const fetchProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("id, name, client_name")
      .eq("status", "active")
      .order("name");
    
    if (data) setProjects(data);
  };

  const fetchCostCodes = async () => {
    const { data } = await supabase
      .from("cost_codes")
      .select("*")
      .eq("is_active", true)
      .order("code");
    
    if (data) setCostCodes(data);
  };

  const fetchEstimate = async () => {
    if (!estimateId) return;

    const { data: estimate } = await supabase
      .from("estimates")
      .select("*, estimate_line_items(*)")
      .eq("id", estimateId)
      .single();

    if (estimate) {
      form.reset({
        title: estimate.title,
        description: estimate.description || "",
        client_name: estimate.client_name || "",
        client_email: estimate.client_email || "",
        client_phone: estimate.client_phone || "",
        site_address: estimate.site_address || "",
        project_id: estimate.project_id || "",
        markup_percentage: estimate.markup_percentage || 20,
        tax_percentage: estimate.tax_percentage || 0,
        discount_amount: estimate.discount_amount || 0,
        valid_until: estimate.valid_until ? new Date(estimate.valid_until) : undefined,
        notes: estimate.notes || "",
        terms_and_conditions: estimate.terms_and_conditions || "",
      });

      if (estimate.estimate_line_items) {
        setLineItems(estimate.estimate_line_items.map((item: any) => ({
          id: item.id,
          item_name: item.item_name,
          description: item.description || "",
          quantity: item.quantity,
          unit: item.unit,
          unit_cost: item.unit_cost,
          category: item.category || "",
        })));
      }
    }
  };

  const addLineItem = () => {
    const newItem: LineItem = {
      id: `new-${Date.now()}`,
      item_name: "",
      description: "",
      quantity: 1,
      unit: "each",
      unit_cost: 0,
      category: "",
    };
    setLineItems([...lineItems, newItem]);
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updatedItems = [...lineItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setLineItems(updatedItems);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const markup = subtotal * (form.watch("markup_percentage") || 0) / 100;
    const tax = (subtotal + markup) * (form.watch("tax_percentage") || 0) / 100;
    const discount = form.watch("discount_amount") || 0;
    return subtotal + markup + tax - discount;
  };

  const onSubmit = async (data: EstimateFormData, isDraft = true) => {
    setIsLoading(true);
    try {
      // Get user's company ID from user profile
      const { data: userProfile } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!userProfile?.company_id) {
        throw new Error("User company not found");
      }

      // Create or update estimate
      const estimateData = {
        title: data.title,
        description: data.description,
        client_name: data.client_name,
        client_email: data.client_email,
        client_phone: data.client_phone,
        site_address: data.site_address,
        project_id: data.project_id || null,
        company_id: userProfile.company_id,
        status: isDraft ? "draft" : "sent",
        total_amount: calculateTotal(),
        markup_percentage: data.markup_percentage,
        tax_percentage: data.tax_percentage,
        discount_amount: data.discount_amount,
        sent_date: isDraft ? null : new Date().toISOString().split('T')[0],
        valid_until: data.valid_until?.toISOString().split('T')[0] || null,
        notes: data.notes,
        terms_and_conditions: data.terms_and_conditions,
      };

      let estimateResult;
      if (estimateId) {
        estimateResult = await supabase
          .from("estimates")
          .update(estimateData)
          .eq("id", estimateId)
          .select()
          .single();
      } else {
        estimateResult = await supabase
          .from("estimates")
          .insert({
            ...estimateData,
            estimate_number: '', // Will be auto-generated by trigger
          })
          .select()
          .single();
      }

      if (estimateResult.error) throw estimateResult.error;

      const estimate = estimateResult.data;

      // Handle line items
      if (estimateId) {
        // Delete existing line items
        await supabase
          .from("estimate_line_items")
          .delete()
          .eq("estimate_id", estimateId);
      }

      // Insert new line items
      if (lineItems.length > 0) {
        const lineItemsData = lineItems.map((item, index) => ({
          estimate_id: estimate.id,
          item_name: item.item_name,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_cost: item.unit_cost,
          category: item.category,
          sort_order: index,
        }));

        const { error: lineItemsError } = await supabase
          .from("estimate_line_items")
          .insert(lineItemsData);

        if (lineItemsError) throw lineItemsError;
      }

      toast({
        title: isDraft ? "Estimate Saved" : "Estimate Sent",
        description: isDraft 
          ? "Estimate has been saved as draft."
          : "Estimate has been sent to client.",
      });

      onSuccess();
    } catch (error) {
      console.error("Error saving estimate:", error);
      toast({
        title: "Error",
        description: "Failed to save estimate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimate Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Kitchen Renovation Estimate" {...field} />
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
                  <FormLabel>Link to Project (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
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
              name="description"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Brief description of the work to be performed..."
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="client_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="client_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Email</FormLabel>
                  <FormControl>
                    <Input placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="client_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="(555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="site_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Site Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main St, City, State" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            <Button type="button" onClick={addLineItem} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lineItems.map((item, index) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-end p-4 border rounded-lg">
                  <div className="col-span-3">
                    <label className="text-sm font-medium">Item Name</label>
                    <Input
                      value={item.item_name}
                      onChange={(e) => updateLineItem(index, "item_name", e.target.value)}
                      placeholder="Item name"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="text-sm font-medium">Description</label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateLineItem(index, "description", e.target.value)}
                      placeholder="Description"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="text-sm font-medium">Qty</label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, "quantity", parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="text-sm font-medium">Unit</label>
                    <Select 
                      value={item.unit} 
                      onValueChange={(value) => updateLineItem(index, "unit", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="each">Each</SelectItem>
                        <SelectItem value="sq ft">Sq Ft</SelectItem>
                        <SelectItem value="lin ft">Lin Ft</SelectItem>
                        <SelectItem value="hour">Hour</SelectItem>
                        <SelectItem value="day">Day</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium">Unit Cost</label>
                    <Input
                      type="number"
                      value={item.unit_cost}
                      onChange={(e) => updateLineItem(index, "unit_cost", parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="text-sm font-medium">Total</label>
                    <div className="text-sm font-medium py-2">
                      ${(item.quantity * item.unit_cost).toFixed(2)}
                    </div>
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeLineItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {lineItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No line items added yet. Click "Add Item" to get started.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing & Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <FormField
                control={form.control}
                name="markup_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Markup %</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tax_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax %</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="discount_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <FormField
                control={form.control}
                name="valid_until"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Valid Until</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
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
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Total Summary */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <span>Subtotal:</span>
                <span>${calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span>Markup ({form.watch("markup_percentage") || 0}%):</span>
                <span>${(calculateSubtotal() * (form.watch("markup_percentage") || 0) / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span>Tax ({form.watch("tax_percentage") || 0}%):</span>
                <span>${((calculateSubtotal() + calculateSubtotal() * (form.watch("markup_percentage") || 0) / 100) * (form.watch("tax_percentage") || 0) / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span>Discount:</span>
                <span>-${(form.watch("discount_amount") || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span>${calculateTotal().toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Internal notes (not visible to client)..."
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="terms_and_conditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Terms & Conditions</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Terms and conditions for this estimate..."
                      rows={4}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={form.handleSubmit((data) => onSubmit(data, true))}
            disabled={isLoading}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Save Draft
          </Button>
          <Button
            type="button"
            onClick={form.handleSubmit((data) => onSubmit(data, false))}
            disabled={isLoading}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            Send Estimate
          </Button>
        </div>
      </form>
    </Form>
  );
}