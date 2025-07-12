import { useState, useEffect } from "react";
import { format } from "date-fns";
import { 
  Eye, 
  Edit, 
  Copy, 
  Send, 
  Download, 
  MoreHorizontal,
  ExternalLink,
  Archive,
  Trash2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EstimateForm } from "./EstimateForm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Estimate {
  id: string;
  estimate_number: string;
  title: string;
  client_name: string;
  total_amount: number;
  status: string;
  estimate_date: string;
  valid_until: string | null;
  sent_date: string | null;
  accepted_date: string | null;
  project?: {
    id: string;
    name: string;
  };
}

interface EstimatesTableProps {
  searchTerm: string;
  statusFilter: string;
}

export function EstimatesTable({ searchTerm, statusFilter }: EstimatesTableProps) {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEstimate, setEditingEstimate] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchEstimates();
  }, [searchTerm, statusFilter]);

  const fetchEstimates = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("estimates")
        .select(`
          *,
          project:projects(id, name)
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = data || [];

      if (searchTerm) {
        filteredData = filteredData.filter((estimate) =>
          estimate.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          estimate.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          estimate.estimate_number.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      setEstimates(filteredData);
    } catch (error) {
      console.error("Error fetching estimates:", error);
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

  const handleDuplicate = async (estimate: Estimate) => {
    try {
      // Get user's company ID
      const { data: userProfile } = await supabase
        .from("user_profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!userProfile?.company_id) {
        throw new Error("User company not found");
      }

      // Create a copy of the estimate
      const { data: newEstimate, error } = await supabase
        .from("estimates")
        .insert({
          company_id: userProfile.company_id,
          estimate_number: '', // Will be auto-generated
          title: `${estimate.title} (Copy)`,
          client_name: estimate.client_name,
          total_amount: estimate.total_amount,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Estimate Duplicated",
        description: "A copy of the estimate has been created.",
      });

      fetchEstimates();
    } catch (error) {
      console.error("Error duplicating estimate:", error);
      toast({
        title: "Error",
        description: "Failed to duplicate estimate",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (estimateId: string) => {
    if (!confirm("Are you sure you want to delete this estimate?")) return;

    try {
      const { error } = await supabase
        .from("estimates")
        .delete()
        .eq("id", estimateId);

      if (error) throw error;

      toast({
        title: "Estimate Deleted",
        description: "The estimate has been deleted successfully.",
      });

      fetchEstimates();
    } catch (error) {
      console.error("Error deleting estimate:", error);
      toast({
        title: "Error",
        description: "Failed to delete estimate",
        variant: "destructive",
      });
    }
  };

  const handleSendEstimate = async (estimateId: string) => {
    try {
      const { error } = await supabase
        .from("estimates")
        .update({ 
          status: "sent",
          sent_date: new Date().toISOString().split('T')[0]
        })
        .eq("id", estimateId);

      if (error) throw error;

      toast({
        title: "Estimate Sent",
        description: "The estimate has been sent to the client.",
      });

      fetchEstimates();
    } catch (error) {
      console.error("Error sending estimate:", error);
      toast({
        title: "Error",
        description: "Failed to send estimate",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-muted-foreground">Loading estimates...</div>
      </div>
    );
  }

  if (estimates.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-muted-foreground mb-4">
          {searchTerm || statusFilter !== "all" 
            ? "No estimates match your filters."
            : "No estimates found. Create your first estimate to get started."
          }
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Estimate #</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Valid Until</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {estimates.map((estimate) => (
              <TableRow key={estimate.id}>
                <TableCell className="font-medium">
                  {estimate.estimate_number}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{estimate.title}</div>
                </TableCell>
                <TableCell>{estimate.client_name}</TableCell>
                <TableCell>
                  {estimate.project ? (
                    <Button variant="link" size="sm" className="p-0 h-auto">
                      {estimate.project.name}
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </Button>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  ${estimate.total_amount.toLocaleString()}
                </TableCell>
                <TableCell>
                  {getStatusBadge(estimate.status)}
                </TableCell>
                <TableCell>
                  {format(new Date(estimate.estimate_date), "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  {estimate.valid_until ? (
                    <span className={
                      new Date(estimate.valid_until) < new Date() 
                        ? "text-destructive" 
                        : ""
                    }>
                      {format(new Date(estimate.valid_until), "MMM d, yyyy")}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditingEstimate(estimate.id)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(estimate)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {estimate.status === "draft" && (
                        <DropdownMenuItem onClick={() => handleSendEstimate(estimate.id)}>
                          <Send className="mr-2 h-4 w-4" />
                          Send to Client
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem>
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Archive className="mr-2 h-4 w-4" />
                        Archive
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(estimate.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
    </>
  );
}