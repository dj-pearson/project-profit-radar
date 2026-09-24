import { useReportingEngine, useGenerateCustomReport } from '@/hooks/useReportingEngine';
import { downloadCsv } from '@/lib/exportCsv';
import { toast } from 'sonner';
import { ErrorState } from '@/components/common/ErrorState';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Calendar,
  BarChart3,
  Clock,
  CheckCircle2,
  Play
} from 'lucide-react';
import type { CustomReport } from '@/hooks/useReportingEngine';

export function ReportingEngine() {
  const engine = useReportingEngine();
  const reports = engine.data?.reports ?? [];
  const history = engine.data?.history ?? [];
  // Figures only from a read that came back; loading or failed shows '--'.
  const shown = (n: number) => (engine.data && !engine.error ? n : '--');
  const generate = useGenerateCustomReport();

  const runReport = (report: CustomReport) => {
    generate.mutate(report.id, {
      onSuccess: (csv) => {
        downloadCsv(report.report_name.replace(/[^a-z0-9]/gi, '_'), csv);
        toast.success(`${report.report_name} generated`);
      },
      onError: (err) => {
        toast.error('The report was not generated', {
          description: err instanceof Error ? err.message : undefined,
        });
      },
    });
  };

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'financial': return <BarChart3 className="h-4 w-4 text-green-600" />;
      case 'project': return <FileText className="h-4 w-4 text-blue-600" />;
      case 'labor': return <Clock className="h-4 w-4 text-orange-600" />;
      case 'safety': return <CheckCircle2 className="h-4 w-4 text-red-600" />;
      default: return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Reporting Engine
          </h1>
          <p className="text-muted-foreground mt-1">
            Custom report builder with automated scheduling
          </p>
        </div>
        <FileText className="h-12 w-12 text-pink-600 opacity-50" />
      </div>

      {engine.error && (
        <ErrorState
          inline
          title="Reports could not be loaded"
          error={engine.error}
          onRetry={() => { void engine.refetch(); }}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shown(reports.length)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {shown(reports.filter(r => r.is_scheduled).length)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shown(engine.data?.generatedCount ?? 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Public Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {shown(reports.filter(r => r.is_public).length)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="reports" className="space-y-4">
        <TabsList>
          <TabsTrigger value="reports">Custom Reports</TabsTrigger>
          <TabsTrigger value="history">Generation History</TabsTrigger>
        </TabsList>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Custom Reports</CardTitle>
                  <CardDescription>
                    User-defined reports with custom filters and grouping.
                    Generating one downloads it as CSV.
                  </CardDescription>
                </div>
                {/* No screen creates custom_reports rows yet. A Create Report
                    button that did nothing used to sit here. */}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reports.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {engine.error ? 'Could not be loaded; see the error above.' : 'No custom reports created'}
                  </p>
                ) : (
                  reports.map((report) => (
                    <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getReportTypeIcon(report.report_type)}
                          <p className="font-semibold">{report.report_name}</p>
                          <Badge variant="outline" className="capitalize">
                            {report.report_type}
                          </Badge>
                          {report.is_scheduled && (
                            <Badge variant="secondary">
                              <Calendar className="h-3 w-3 mr-1" />
                              {report.schedule_frequency}
                            </Badge>
                          )}
                          {report.is_public && (
                            <Badge variant="outline">Public</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {report.report_description || 'No description'}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => runReport(report)}
                        disabled={generate.isPending}
                      >
                        <Play className="mr-1 h-3 w-3" />
                        {generate.isPending && generate.variables === report.id ? 'Generating...' : 'Generate'}
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Report Generation History</CardTitle>
              <CardDescription>
                Previously generated reports. Files are not stored; generate a report again to download it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {engine.error ? 'Could not be loaded; see the error above.' : 'No reports generated yet'}
                  </p>
                ) : (
                  history.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <p className="font-semibold">{item.custom_reports?.report_name || 'Unknown Report'}</p>
                          <Badge variant="outline" className="uppercase">
                            {item.output_format}
                          </Badge>
                          <Badge
                            variant={item.delivery_status === 'success' ? 'default' : 'destructive'}
                          >
                            {item.delivery_status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Generated: {item.generated_at ? new Date(item.generated_at).toLocaleString() : '--'}
                        </p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Size</p>
                          <p className="font-semibold">{formatFileSize(item.file_size_bytes || 0)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Time</p>
                          <p className="font-semibold">{item.execution_time_ms == null ? '--' : `${(item.execution_time_ms / 1000).toFixed(2)}s`}</p>
                        </div>
                        {/* report_history keeps no file; there is nothing to
                            download again. Generate the report instead. */}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ReportingEngine;
