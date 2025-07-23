import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Play, Pause, BarChart3, Users, Mail, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FunnelStepBuilder } from "@/components/funnel/FunnelStepBuilder";
import { FunnelAnalytics } from "@/components/funnel/FunnelAnalytics";

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

  const handleCreateFunnel = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createFunnelMutation.mutate({
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      trigger_event: formData.get("trigger_event") as string,
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Funnel Builder</h1>
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
    );
  }

  if (viewMode === 'analytics' && selectedFunnel) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Funnel Analytics</h1>
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
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lead Funnels</h1>
          <p className="text-muted-foreground">
            Create and manage automated email sequences to nurture leads
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Funnel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Funnel</DialogTitle>
              <DialogDescription>
                Set up a new lead funnel with automated email sequences
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateFunnel} className="space-y-4">
              <div>
                <Label htmlFor="name">Funnel Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Trial Onboarding Sequence"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Nurture trial users through their 14-day journey..."
                />
              </div>
              <div>
                <Label htmlFor="trigger_event">Trigger Event</Label>
                <Select name="trigger_event" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select trigger event" />
                  </SelectTrigger>
                  <SelectContent>
                    {triggerEventOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createFunnelMutation.isPending}>
                  Create Funnel
                </Button>
              </div>
            </form>
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
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{funnel.total_steps} steps</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{funnel.total_subscribers} subscribers</span>
                  </div>
                  <div className="flex items-center space-x-2 col-span-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
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
                  >
                    <BarChart3 className="h-4 w-4" />
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
                  >
                    {funnel.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
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
  );
}