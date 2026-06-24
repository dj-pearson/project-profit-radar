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
  Trash2,
  Building2,
  Receipt
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AccessibleTable, type TableColumn } from "@/components/accessibility/AccessibleTable";
import { AccessibleModal } from "@/components/accessibility/AccessibleModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EstimateForm } from "./EstimateForm";
import { ConvertToProjectDialog } from "./ConvertToProjectDialog";
import { ConvertToInvoiceDialog } from "./ConvertToInvoiceDialog";
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
  onEstimateChange?: () => void;
}

export function EstimatesTable({ searchTerm, statusFilter, onEstimateChange }: EstimatesTableProps) {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEstimate, setEditingEstimate] = useState<string | null>(null);
  const [convertingEstimate, setConvertingEstimate] = useState<string | null>(null);
  const [invoicingEstimate, setInvoicingEstimate] = useState<string | null>(null);
  const [deletingEstimate, setDeletingEstimate] = useState<string | null>(null);
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
      onEstimateChange?.();
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

      setDeletingEstimate(null);
      fetchEstimates();
      onEstimateChange?.();
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
      onEstimateChange?.();
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

  const estimateColumns: TableColumn<Estimate>[] = [
    {
      key: 'estimate_number',
      header: 'Estimate #',
      sortable: true,
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'client_name',
      header: 'Client',
      sortable: true,
    },
    {
      key: 'project',
      header: 'Project',
      render: (_value, row) =>
        row.project ? (
          <Button variant="link" size="sm" className="p-0 h-auto">
            {row.project.name}
            <ExternalLink className="ml-1 h-3 w-3" aria-hidden="true" />
          </Button>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: 'total_amount',
      header: 'Amount',
      sortable: true,
      align: 'right',
      render: (value) => <span className="font-medium">${Number(value).toLocaleString()}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (value) => getStatusBadge(value),
    },
    {
      key: 'estimate_date',
      header: 'Date',
      sortable: true,
      render: (value) => format(new Date(value), "MMM d, yyyy"),
    },
    {
      key: 'valid_until',
      header: 'Valid Until',
      hideOnMobile: true,
      render: (value) =>
        value ? (
          <span className={new Date(value) < new Date() ? "text-destructive" : ""}>
            {format(new Date(value), "MMM d, yyyy")}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '48px',
      headerRender: () => <span className="sr-only">Actions</span>,
      render: (_value, estimate) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" aria-label={`Actions for estimate ${estimate.estimate_number}`}>
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEditingEstimate(estimate.id)}>
              <Edit className="mr-2 h-4 w-4" aria-hidden="true" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDuplicate(estimate)}>
              <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {estimate.status === "draft" && (
              <DropdownMenuItem onClick={() => handleSendEstimate(estimate.id)}>
                <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                Send to Client
              </DropdownMenuItem>
            )}
            {!estimate.project && (estimate.status === "accepted" || estimate.status === "sent" || estimate.status === "viewed") && (
              <DropdownMenuItem
                onClick={() => setConvertingEstimate(estimate.id)}
                className="text-construction-blue font-medium"
              >
                <Building2 className="mr-2 h-4 w-4" aria-hidden="true" />
                Convert to Project
              </DropdownMenuItem>
            )}
            {(estimate.status === "accepted" || estimate.status === "sent" || estimate.status === "viewed") && (
              <DropdownMenuItem
                onClick={() => setInvoicingEstimate(estimate.id)}
                className="text-construction-orange font-medium"
              >
                <Receipt className="mr-2 h-4 w-4" aria-hidden="true" />
                Convert to Invoice
              </DropdownMenuItem>
            )}
            <DropdownMenuItem>
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              Download PDF
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Archive className="mr-2 h-4 w-4" aria-hidden="true" />
              Archive
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeletingEstimate(estimate.id)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <>
      <div className="border rounded-lg">
        <AccessibleTable<Estimate>
          caption="Estimates"
          hideCaption
          columns={estimateColumns}
          data={estimates}
          loading={loading}
          emptyContent="No estimates found"
        />
      </div>

      {/* Edit Estimate Modal */}
      <AccessibleModal
        isOpen={!!editingEstimate}
        onClose={() => setEditingEstimate(null)}
        title="Edit Estimate"
        size="xl"
      >
        {editingEstimate && (
          <EstimateForm
            estimateId={editingEstimate}
              onSuccess={() => {
                setEditingEstimate(null);
                fetchEstimates();
                onEstimateChange?.();
              }}
            onCancel={() => setEditingEstimate(null)}
          />
        )}
      </AccessibleModal>

      {/* Convert to Project Dialog */}
      <ConvertToProjectDialog
        estimateId={convertingEstimate}
        isOpen={!!convertingEstimate}
        onClose={() => setConvertingEstimate(null)}
        onSuccess={() => {
          setConvertingEstimate(null);
          fetchEstimates();
          onEstimateChange?.();
        }}
      />

      {/* Convert to Invoice Dialog (US-101) */}
      <ConvertToInvoiceDialog
        estimateId={invoicingEstimate}
        isOpen={!!invoicingEstimate}
        onClose={() => setInvoicingEstimate(null)}
        onSuccess={() => {
          setInvoicingEstimate(null);
          fetchEstimates();
          onEstimateChange?.();
        }}
      />

      {/* Delete Confirmation Modal */}
      <AccessibleModal
        isOpen={!!deletingEstimate}
        onClose={() => setDeletingEstimate(null)}
        title="Delete Estimate"
        description="Are you sure you want to delete this estimate? This action cannot be undone."
        size="sm"
        disableClickOutside
        footer={
          <>
            <Button variant="outline" onClick={() => setDeletingEstimate(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deletingEstimate && handleDelete(deletingEstimate)}
            >
              Delete
            </Button>
          </>
        }
      />
    </>
  );
}
