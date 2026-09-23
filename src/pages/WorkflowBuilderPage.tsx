import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/skeletons";
import { WorkflowBuilder, type SavedWorkflow } from "@/components/crm/WorkflowBuilder";

/**
 * /crm/workflows/builder starts a new workflow; /crm/workflows/builder/:id
 * reopens a saved one. The read is not filtered by company here: RLS on
 * workflow_definitions only returns the caller's company's rows, so another
 * company's id comes back as no row and gets the same not-found state.
 */
export default function WorkflowBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ["workflow-definition", id],
    enabled: !!id,
    queryFn: async (): Promise<SavedWorkflow | null> => {
      const { data: row, error: readError } = await supabase
        .from("workflow_definitions")
        .select("id, name, description, trigger_type, workflow_steps")
        .eq("id", id!)
        .maybeSingle();
      if (readError) throw readError;
      return row;
    },
  });

  if (!id) return <WorkflowBuilder />;
  if (isLoading) return <PageSkeleton />;

  if (error || !data) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <Card role="alert">
          <CardHeader>
            <CardTitle>{error ? "Could not load this workflow" : "Workflow not found"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {error
                ? "Something went wrong reading it. Try again, or go back to your workflows."
                : "It may have been deleted, or it belongs to another company."}
            </p>
            <Button asChild variant="outline">
              <Link to="/crm/workflows">Back to workflows</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <WorkflowBuilder key={data.id} workflowId={data.id} initialWorkflow={data} />;
}
