import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/components/layouts/PageLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardCheck, Eye, AlertTriangle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * US-370: this page used to render hardcoded mockMetrics / mockInspections
 * ("87% quality score", "AI crack detection: Active") with no query at all.
 * It now reads the company's quality_inspections rows. There is no AI or
 * computer-vision scoring behind this table, so the page says so instead of
 * showing a score it cannot compute.
 */

interface QualityInspectionRow {
  id: string;
  inspection_number: string;
  inspection_type: string;
  inspection_date: string;
  status: string | null;
  passed: boolean | null;
  reinspection_required: boolean | null;
  deficiencies: unknown;
}

const deficiencyCount = (d: unknown) => (Array.isArray(d) ? d.length : 0);

function summarizeInspections(rows: QualityInspectionRow[]) {
  const decided = rows.filter((r) => r.passed !== null);
  const passed = decided.filter((r) => r.passed === true).length;
  return {
    total: rows.length,
    decided: decided.length,
    passRate: decided.length ? Math.round((passed / decided.length) * 100) : null,
    failed: decided.length - passed,
    reinspections: rows.filter((r) => r.reinspection_required).length,
    pending: rows.filter((r) => r.status === "pending" || r.status === "scheduled" || r.status === "in_progress").length,
  };
}

export default function AIQualityControlPage() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id;

  const { data: inspections = [], isLoading, error } = useQuery({
    queryKey: ["quality-inspections-overview", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_inspections")
        .select("id, inspection_number, inspection_type, inspection_date, status, passed, reinspection_required, deficiencies")
        .eq("company_id", companyId as string)
        .order("inspection_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as QualityInspectionRow[];
    },
  });

  const summary = summarizeInspections(inspections);

  return (
    <>
      <Helmet>
        <title>Quality Control | Construction Management Platform</title>
        <meta
          name="description"
          content="Quality inspection results, pass rates and reinspections across your projects."
        />
      </Helmet>
      <PageLayout>
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Quality Control</h1>
              <p className="text-muted-foreground">Inspection results recorded across your projects</p>
            </div>
            <Button asChild>
              <Link to="/workflow-management">
                <ClipboardCheck className="mr-2 h-4 w-4" />
                Manage Inspections
              </Link>
            </Button>
          </div>

          {error ? (
            <Card>
              <CardContent className="py-6 text-sm text-destructive">
                Couldn't load inspections: {error instanceof Error ? error.message : "unknown error"}
              </CardContent>
            </Card>
          ) : isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" data-testid="qc-loading">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summary.passRate === null ? "-" : `${summary.passRate}%`}</div>
                    {summary.passRate !== null && <Progress value={summary.passRate} className="mt-2" />}
                    <p className="text-xs text-muted-foreground">{summary.decided} inspections with a result</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Inspections</CardTitle>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summary.total}</div>
                    <p className="text-xs text-muted-foreground">{summary.pending} pending or in progress</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Failed</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summary.failed}</div>
                    <p className="text-xs text-muted-foreground">Inspections marked not passed</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Reinspections</CardTitle>
                    <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summary.reinspections}</div>
                    <p className="text-xs text-muted-foreground">Flagged as requiring reinspection</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Inspections</CardTitle>
                  <CardDescription>The 10 most recent inspections by date</CardDescription>
                </CardHeader>
                <CardContent>
                  {inspections.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      No quality inspections recorded yet. Inspections you schedule and complete will show up here.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {inspections.slice(0, 10).map((inspection) => (
                        <div key={inspection.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">
                              {inspection.inspection_type} inspection {inspection.inspection_number}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(inspection.inspection_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <p className="text-sm text-muted-foreground">
                              {deficiencyCount(inspection.deficiencies)} deficiencies
                            </p>
                            <Badge
                              variant={
                                inspection.passed === true
                                  ? "default"
                                  : inspection.passed === false
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {inspection.passed === true
                                ? "passed"
                                : inspection.passed === false
                                ? "failed"
                                : (inspection.status ?? "pending").replace(/_/g, " ")}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Automated Photo Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Computer-vision defect detection isn't available yet. The numbers above come from inspections your team records, not from AI scoring.
              </p>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    </>
  );
}
