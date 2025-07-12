import { useState, useEffect } from "react";
import { Plus, Eye, Edit, Send, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EstimateForm } from "@/components/estimates/EstimateForm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ProjectEstimate {
  id: string;
  estimate_number: string;
  title: string;
  total_amount: number;
  status: string;
  estimate_date: string;
  version_number: number;
  is_current_version: boolean;
  parent_estimate_id: string | null;
  valid_until: string | null;
  sent_date: string | null;
  accepted_date: string | null;
}

interface ProjectEstimatesProps {
  projectId: string;
}

export function ProjectEstimates({ projectId }: ProjectEstimatesProps) {
  const [estimates, setEstimates] = useState<ProjectEstimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchEstimates();
  }, [projectId]);

  const fetchEstimates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("estimates")
        .select("*")
        .eq("project_id", projectId)
        .order("version_number", { ascending: false });

      if (error) throw error;
      setEstimates(data || []);
    } catch (error) {
      console.error("Error fetching project estimates:", error);
      toast({
        title: "Error",
        description: "Failed to fetch estimates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      sent: "outline",
      viewed: "outline",
      accepted: "default",
      rejected: "destructive",
      expired: "secondary",
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleCreateVersion = async (parentEstimateId: string) => {
    try {
      // Get parent estimate data
      const { data: parentEstimate, error: fetchError } = await supabase
        .from("estimates")
        .select("*, estimate_line_items(*)")
        .eq("id", parentEstimateId)
        .single();

      if (fetchError) throw fetchError;

      // Mark all versions as not current
      await supabase
        .from("estimates")
        .update({ is_current_version: false })
        .eq("project_id", projectId);

      // Create new version
      const newVersion = parentEstimate.version_number + 1;
      const { data: newEstimate, error: createError } = await supabase
        .from("estimates")
        .insert([{
          ...parentEstimate,
          id: undefined,
          estimate_number: undefined, // Will be auto-generated
          version_number: newVersion,
          parent_estimate_id: parentEstimateId,
          is_current_version: true,
          status: "draft",
          sent_date: null,
          accepted_date: null,
          title: `${parentEstimate.title} (v${newVersion})`,
        }])
        .select()
        .single();

      if (createError) throw createError;

      // Copy line items
      if (parentEstimate.estimate_line_items?.length > 0) {
        const lineItemsData = parentEstimate.estimate_line_items.map((item: any) => ({
          ...item,
          id: undefined,
          estimate_id: newEstimate.id,
        }));

        await supabase
          .from("estimate_line_items")
          .insert(lineItemsData);
      }

      toast({
        title: "New Version Created",
        description: `Version ${newVersion} has been created successfully.`,
      });

      fetchEstimates();
    } catch (error) {
      console.error("Error creating estimate version:", error);
      toast({
        title: "Error",
        description: "Failed to create new version",
        variant: "destructive",
      });
    }
  };

  const groupedEstimates = estimates.reduce((acc, estimate) => {
    const baseId = estimate.parent_estimate_id || estimate.id;
    if (!acc[baseId]) {
      acc[baseId] = [];
    }
    acc[baseId].push(estimate);
    return acc;
  }, {} as Record<string, ProjectEstimate[]>);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-muted-foreground">Loading estimates...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Project Estimates</h3>
          <p className="text-sm text-muted-foreground">
            Manage estimates for this project with version control
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Estimate
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Estimate</DialogTitle>
            </DialogHeader>
            <EstimateForm
              onSuccess={() => {
                setIsCreateDialogOpen(false);
                fetchEstimates();
              }}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Estimates List */}
      {Object.keys(groupedEstimates).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-muted-foreground text-center">
              <p className="text-lg mb-2">No estimates created yet</p>
              <p className="text-sm">Create your first estimate for this project to get started.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedEstimates).map(([baseId, versions]) => {
            const currentVersion = versions.find(v => v.is_current_version) || versions[0];
            const allVersions = versions.sort((a, b) => b.version_number - a.version_number);

            return (
              <Card key={baseId}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {currentVersion.title}
                        {getStatusBadge(currentVersion.status)}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {currentVersion.estimate_number} • ${currentVersion.total_amount.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="gap-2">
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2"
                        onClick={() => setEditingEstimate(currentVersion.id)}
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2"
                        onClick={() => handleCreateVersion(currentVersion.id)}
                      >
                        <Copy className="h-4 w-4" />
                        New Version
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium">Created</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(currentVersion.estimate_date), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Version</p>
                      <p className="text-sm text-muted-foreground">
                        v{currentVersion.version_number}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Valid Until</p>
                      <p className="text-sm text-muted-foreground">
                        {currentVersion.valid_until 
                          ? format(new Date(currentVersion.valid_until), "MMM d, yyyy")
                          : "No expiration"
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Actions</p>
                      <div className="flex gap-1">
                        {currentVersion.status === "draft" && (
                          <Button variant="outline" size="sm">
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Version History */}
                  {allVersions.length > 1 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Version History</p>
                      <div className="space-y-2">
                        {allVersions.map((version) => (
                          <div 
                            key={version.id}
                            className={`flex justify-between items-center p-2 rounded border ${
                              version.is_current_version ? "bg-muted" : "bg-background"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">v{version.version_number}</span>
                              {getStatusBadge(version.status)}
                              {version.is_current_version && (
                                <Badge variant="outline" className="text-xs">Current</Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(version.estimate_date), "MMM d, yyyy")} • 
                              ${version.total_amount.toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingEstimate} onOpenChange={() => setEditingEstimate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Estimate</DialogTitle>
          </DialogHeader>
          {editingEstimate && (
            <EstimateForm
              estimateId={editingEstimate}
              onSuccess={() => {
                setEditingEstimate(null);
                fetchEstimates();
              }}
              onCancel={() => setEditingEstimate(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}