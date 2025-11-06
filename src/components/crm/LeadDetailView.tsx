import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Phone, Mail, Calendar, User, Building, MapPin, DollarSign, Clock, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { ClickToCall } from "./ClickToCall";
import { CallHistory } from "./CallHistory";
import { useState } from "react";

interface LeadDetailViewProps {
  leadId: string;
}

export function LeadDetailView({ leadId }: LeadDetailViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCallDialog, setShowCallDialog] = useState(false);

  const { data: lead, isLoading } = useQuery({
    queryKey: ["lead-detail", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select(`
          *,
          companies (
            name,
            industry,
            website
          )
        `)
        .eq("id", leadId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: activities } = useQuery({
    queryKey: ["lead-activities", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!leadId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase
        .from("leads")
        .update({ status: newStatus })
        .eq("id", leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-detail", leadId] });
      toast({ title: "Status updated successfully" });
    },
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: "bg-blue-500",
      contacted: "bg-yellow-500",
      qualified: "bg-green-500",
      lost: "bg-red-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const getActivityIcon = (type: string) => {
    const icons: Record<string, any> = {
      call: Phone,
      email: Mail,
      meeting: Calendar,
      note: MessageSquare,
    };
    const Icon = icons[type] || MessageSquare;
    return <Icon className="h-4 w-4" />;
  };

  if (isLoading) {
    return <div className="p-8">Loading lead details...</div>;
  }

  if (!lead) {
    return <div className="p-8">Lead not found</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{lead.first_name} {lead.last_name}</h1>
            <Badge className={getStatusColor(lead.status)}>
              {lead.status}
            </Badge>
          </div>
          {lead.companies && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building className="h-4 w-4" />
              <span>{lead.companies.name}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setShowCallDialog(true)}>
            <Phone className="h-4 w-4 mr-2" />
            Call
          </Button>
          <Button variant="outline">
            <Mail className="h-4 w-4 mr-2" />
            Email
          </Button>
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Email</div>
                  <div className="font-medium">{lead.email}</div>
                </div>
              </div>

              {lead.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Phone</div>
                    <div className="font-medium">{lead.phone}</div>
                  </div>
                </div>
              )}

              {lead.title && (
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Title</div>
                    <div className="font-medium">{lead.title}</div>
                  </div>
                </div>
              )}

              {lead.location && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Location</div>
                    <div className="font-medium">{lead.location}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lead Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Source</div>
                <div className="font-medium capitalize">{lead.source || "Unknown"}</div>
              </div>

              {lead.estimated_value && (
                <div>
                  <div className="text-sm text-muted-foreground">Estimated Value</div>
                  <div className="font-medium flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    {lead.estimated_value.toLocaleString()}
                  </div>
                </div>
              )}

              <div>
                <div className="text-sm text-muted-foreground">Created</div>
                <div className="font-medium">
                  {format(new Date(lead.created_at), "MMM d, yyyy")}
                </div>
              </div>

              {lead.last_contacted_at && (
                <div>
                  <div className="text-sm text-muted-foreground">Last Contacted</div>
                  <div className="font-medium">
                    {format(new Date(lead.last_contacted_at), "MMM d, yyyy")}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Change Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {["new", "contacted", "qualified", "lost"].map((status) => (
                <Button
                  key={status}
                  variant={lead.status === status ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => updateStatusMutation.mutate(status)}
                  disabled={updateStatusMutation.isPending}
                >
                  <div className={`h-2 w-2 rounded-full mr-2 ${getStatusColor(status)}`} />
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="col-span-2">
          <Tabs defaultValue="activity" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="activity">Activity Timeline</TabsTrigger>
              <TabsTrigger value="calls">Call History</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="activity" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {activities && activities.length > 0 ? (
                    <div className="space-y-4">
                      {activities.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex gap-4 border-l-2 border-muted pl-4 pb-4"
                        >
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{activity.subject}</div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(activity.created_at), "MMM d, h:mm a")}
                              </div>
                            </div>
                            {activity.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {activity.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No activity recorded yet
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="calls" className="mt-4">
              <CallHistory
                leadId={leadId}
                contactPhone={lead.phone || ""}
              />
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-muted-foreground py-8">
                    Notes feature coming soon
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {showCallDialog && lead.phone && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="absolute -top-12 right-0"
              onClick={() => setShowCallDialog(false)}
            >
              Close
            </Button>
            <ClickToCall
              phoneNumber={lead.phone}
              contactName={`${lead.first_name} ${lead.last_name}`}
              leadId={leadId}
            />
          </div>
        </div>
      )}
    </div>
  );
}
