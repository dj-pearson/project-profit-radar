import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Play, Pause, BarChart3, Users, Mail, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FunnelStepBuilder } from "@/components/funnel/FunnelStepBuilder";
import { FunnelAnalytics } from "@/components/funnel/FunnelAnalytics";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AccessiblePageWrapper } from "@/components/accessibility/AccessiblePageWrapper";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FUNNEL_FORM_DEFAULTS, funnelFormSchema, type FunnelFormValues } from "@/lib/validations/funnels";

interface LeadFunnel {
  id: string;
  name: string;
  description: string | null;
  trigger_event: string;
  is_active: boolean;
  total_steps: number;
  total_subscribers: number;
  completion_rate: number;
  created_at: string;
}

interface FunnelFormData {
  name: string;
  description: string;
  trigger_event: string;
}

export default function FunnelManager() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedFunnel, setSelectedFunnel] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'builder' | 'analytics'>('list');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: funnels, isLoading } = useQuery({
    queryKey: ["funnels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_funnels")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as LeadFunnel[];
    },
  });

  const createFunnelMutation = useMutation({
    mutationFn: async (formData: FunnelFormData) => {
      // Get current user's company_id
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();
      
      if (profileError) throw profileError;
      
      const { data, error } = await supabase
        .from("lead_funnels")
        .insert([{
          ...formData,
          company_id: profile.company_id,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funnels"] });
      setIsCreateDialogOpen(false);
      funnelForm.reset(FUNNEL_FORM_DEFAULTS);
      toast({
        title: "Funnel created",
        description: "Your lead funnel has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error creating funnel",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleFunnelMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("lead_funnels")
        .update({ is_active })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funnels"] });
      toast({
        title: "Funnel updated",
        description: "Funnel status has been updated.",
      });
    },
  });

  const funnelForm = useForm<FunnelFormValues>({
    resolver: zodResolver(funnelFormSchema),
    defaultValues: FUNNEL_FORM_DEFAULTS,
  });

  const handleCreateFunnel = (values: FunnelFormValues) => {
    createFunnelMutation.mutate({
      name: values.name,
      description: values.description,
      trigger_event: values.trigger_event,
    });
  };

  const triggerEventOptions = [
    { value: "trial_signup", label: "Trial Signup" },
    { value: "newsletter_signup", label: "Newsletter Signup" },
    { value: "contact_form", label: "Contact Form" },
    { value: "demo_request", label: "Demo Request" },
    { value: "custom", label: "Custom Event" },
  ];

  if (viewMode === 'builder' && selectedFunnel) {
    return (
      <AccessiblePageWrapper pageTitle="Funnel Builder">
      <DashboardLayout hasAccessibleWrapper title="Funnel Builder">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">
                Build and customize your lead funnel steps
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setViewMode('list');
                setSelectedFunnel(null);
              }}
            >
              Back to Funnels
            </Button>
          </div>
          <FunnelStepBuilder funnelId={selectedFunnel} />
        </div>
      </DashboardLayout>
      </AccessiblePageWrapper>
    );
  }

  if (viewMode === 'analytics' && selectedFunnel) {
    return (
      <AccessiblePageWrapper pageTitle="Funnel Analytics">
      <DashboardLayout hasAccessibleWrapper title="Funnel Analytics">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground">
                Track performance and optimize your funnel
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setViewMode('list');
                setSelectedFunnel(null);
              }}
            >
              Back to Funnels
            </Button>
          </div>
          <FunnelAnalytics funnelId={selectedFunnel} />
        </div>
      </DashboardLayout>
      </AccessiblePageWrapper>
    );
  }

  return (
    <AccessiblePageWrapper pageTitle="Lead Funnels">
    <DashboardLayout hasAccessibleWrapper title="Lead Funnels">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground">
              Create and manage automated email sequences to nurture leads
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Create Funnel
              </Button>
            </DialogTrigger>
            <DialogContent aria-describedby="create-funnel-description">
              <DialogHeader>
                <DialogTitle>Create New Funnel</DialogTitle>
                <DialogDescription id="create-funnel-description">
                  Set up a new lead funnel with automated email sequences
                </DialogDescription>
              </DialogHeader>
              <Form {...funnelForm}>
              <form onSubmit={funnelForm.handleSubmit(handleCreateFunnel)} noValidate className="space-y-4" aria-label="Create funnel form">
                <FormField
                  control={funnelForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Funnel Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Trial Onboarding Sequence" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={funnelForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Nurture trial users through their 14-day journey..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={funnelForm.control}
                  name="trigger_event"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trigger Event</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select trigger event" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {triggerEventOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createFunnelMutation.isPending}>
                    Create Funnel
                  </Button>
                </div>
              </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {funnels?.map((funnel) => (
              <Card key={funnel.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{funnel.name}</CardTitle>
                    <Badge variant={funnel.is_active ? "default" : "secondary"}>
                      {funnel.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {funnel.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <span>{funnel.total_steps} steps</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <span>{funnel.total_subscribers} subscribers</span>
                    </div>
                    <div className="flex items-center space-x-2 col-span-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <span>{funnel.completion_rate}% completion rate</span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedFunnel(funnel.id);
                        setViewMode('builder');
                      }}
                    >
                      Edit Steps
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedFunnel(funnel.id);
                        setViewMode('analytics');
                      }}
                      aria-label={`View analytics for ${funnel.name}`}
                    >
                      <BarChart3 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        toggleFunnelMutation.mutate({
                          id: funnel.id,
                          is_active: !funnel.is_active,
                        })
                      }
                      aria-label={funnel.is_active ? `Pause ${funnel.name}` : `Activate ${funnel.name}`}
                    >
                      {funnel.is_active ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {funnels?.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Mail className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No funnels yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first lead funnel to start nurturing prospects automatically
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Funnel
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
    </AccessiblePageWrapper>
  );
}