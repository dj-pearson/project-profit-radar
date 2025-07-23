import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Mail, Clock, Edit, Trash2, MoveUp, MoveDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FunnelStep {
  id: string;
  step_order: number;
  name: string;
  email_template_id: string | null;
  delay_amount: number;
  delay_unit: string;
  is_active: boolean;
  open_rate: number;
  click_rate: number;
}

interface FunnelStepBuilderProps {
  funnelId: string;
}

export function FunnelStepBuilder({ funnelId }: FunnelStepBuilderProps) {
  const [isAddStepOpen, setIsAddStepOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: steps, isLoading } = useQuery({
    queryKey: ["funnel-steps", funnelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funnel_steps")
        .select("*")
        .eq("funnel_id", funnelId)
        .order("step_order");
      
      if (error) throw error;
      return data as FunnelStep[];
    },
  });

  const { data: emailTemplates } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("id, name, subject")
        .eq("template_type", "marketing")
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  const addStepMutation = useMutation({
    mutationFn: async (stepData: {
      name: string;
      email_template_id: string;
      delay_amount: number;
      delay_unit: string;
    }) => {
      const nextOrder = (steps?.length || 0) + 1;
      
      const { error } = await supabase
        .from("funnel_steps")
        .insert([{
          funnel_id: funnelId,
          step_order: nextOrder,
          ...stepData,
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funnel-steps", funnelId] });
      setIsAddStepOpen(false);
      toast({
        title: "Step added",
        description: "Funnel step has been added successfully.",
      });
    },
  });

  const deleteStepMutation = useMutation({
    mutationFn: async (stepId: string) => {
      const { error } = await supabase
        .from("funnel_steps")
        .delete()
        .eq("id", stepId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funnel-steps", funnelId] });
      toast({
        title: "Step deleted",
        description: "Funnel step has been deleted.",
      });
    },
  });

  const handleAddStep = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    addStepMutation.mutate({
      name: formData.get("name") as string,
      email_template_id: formData.get("email_template_id") as string,
      delay_amount: parseInt(formData.get("delay_amount") as string),
      delay_unit: formData.get("delay_unit") as string,
    });
  };

  const delayUnitOptions = [
    { value: "minutes", label: "Minutes" },
    { value: "hours", label: "Hours" },
    { value: "days", label: "Days" },
    { value: "weeks", label: "Weeks" },
  ];

  if (isLoading) {
    return <div>Loading funnel steps...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Funnel Steps</h2>
          <p className="text-muted-foreground">
            Configure the email sequence for this funnel
          </p>
        </div>
        <Dialog open={isAddStepOpen} onOpenChange={setIsAddStepOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Step
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Funnel Step</DialogTitle>
              <DialogDescription>
                Add a new email step to your funnel sequence
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddStep} className="space-y-4">
              <div>
                <Label htmlFor="name">Step Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Welcome Email"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email_template_id">Email Template</Label>
                <Select name="email_template_id" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select email template" />
                  </SelectTrigger>
                  <SelectContent>
                    {emailTemplates?.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} - {template.subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="delay_amount">Delay Amount</Label>
                  <Input
                    id="delay_amount"
                    name="delay_amount"
                    type="number"
                    min="0"
                    defaultValue="0"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="delay_unit">Delay Unit</Label>
                  <Select name="delay_unit" defaultValue="days">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {delayUnitOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsAddStepOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addStepMutation.isPending}>
                  Add Step
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {steps?.map((step, index) => (
          <Card key={step.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Badge variant="outline">Step {step.step_order}</Badge>
                  <CardTitle className="text-lg">{step.name}</CardTitle>
                  <Badge variant={step.is_active ? "default" : "secondary"}>
                    {step.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={index === 0}>
                    <MoveUp className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={index === (steps?.length || 0) - 1}>
                    <MoveDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteStepMutation.mutate(step.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {step.delay_amount === 0 
                      ? "Immediate" 
                      : `${step.delay_amount} ${step.delay_unit}`
                    }
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{step.open_rate}% open rate</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-muted-foreground">CTR:</span>
                  <span>{step.click_rate}%</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-muted-foreground">Template:</span>
                  <span>{step.email_template_id ? "Set" : "None"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {steps?.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Mail className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No steps configured</h3>
            <p className="text-muted-foreground mb-4">
              Add email steps to create your automated sequence
            </p>
            <Button onClick={() => setIsAddStepOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Step
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}