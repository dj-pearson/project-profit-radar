import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Calendar,
  Download,
  BarChart3,
  Clock,
  CheckCircle2,
  Play
} from 'lucide-react';

interface CustomReport {
  id: string;
  report_name: string;
  report_type: string;
  report_description: string;
  is_scheduled: boolean;
  schedule_frequency: string;
  is_public: boolean;
  created_at: string;
}

interface ReportHistory {
  id: string;
  generated_at: string;
  output_format: string;
  file_size_bytes: number;
  delivery_status: string;
  execution_time_ms: number;
  custom_reports: { report_name: string };
}

export function ReportingEngine() {
  const { user } = useAuth();
  const [reports, setReports] = useState<CustomReport[]>([]);
  const [history, setHistory] = useState<ReportHistory[]>([]);

  useEffect(() => {
    loadReports();
    loadHistory();
  }, [user]);

  const loadReports = async () => {
    try {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();

      if (!userProfile?.tenant_id) return;

      const { data, error } = await supabase
        .from('custom_reports')
        .select('*')
        .eq('tenant_id', userProfile.tenant_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();

      if (!userProfile?.tenant_id) return;

      const { data, error } = await supabase
        .from('report_history')
        .select(`
          *,
          custom_reports (report_name)
        `)
        .order('generated_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setHistory(data as any || []);
    } catch (error) {
      console.error('Error loading history:', error);
    }
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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            Reporting Engine
          </h1>
          <p className="text-muted-foreground mt-1">
            Custom report builder with automated scheduling
          </p>
        </div>
        <FileText className="h-12 w-12 text-pink-600 opacity-50" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reports.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {reports.filter(r => r.is_scheduled).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{history.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Public Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {reports.filter(r => r.is_public).length}
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
                    User-defined reports with custom filters and grouping
                  </CardDescription>
                </div>
                <Button>
                  <FileText className="mr-2 h-4 w-4" />
                  Create Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reports.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No custom reports created
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
                      <Button size="sm" variant="outline">
                        <Play className="mr-1 h-3 w-3" />
                        Generate
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
                Previously generated reports with download links
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No reports generated yet
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
                          Generated: {new Date(item.generated_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Size</p>
                          <p className="font-semibold">{formatFileSize(item.file_size_bytes || 0)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Time</p>
                          <p className="font-semibold">{(item.execution_time_ms / 1000).toFixed(2)}s</p>
                        </div>
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4" />
                        </Button>
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
