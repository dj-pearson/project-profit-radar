import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  FileText, 
  Calendar,
  Users,
  Cloud,
  PlusCircle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Camera
} from 'lucide-react';
import { DailyReportCrewPanel } from '@/components/daily-reports/DailyReportCrewPanel';

interface DailyReport {
  id: string;
  project_id: string;
  date: string;
  work_performed: string;
  crew_count: number;
  weather_conditions: string;
  materials_delivered: string;
  equipment_used: string;
  delays_issues: string;
  safety_incidents: string;
  created_at: string;
  photo_count?: number;
}

interface ProjectDailyReportsProps {
  projectId: string;
  onNavigate: (path: string) => void;
}

export const ProjectDailyReports: React.FC<ProjectDailyReportsProps> = ({
  projectId,
  onNavigate
}) => {
  const { userProfile } = useAuth();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (projectId && userProfile?.company_id) {
      loadReports();
    }
  }, [projectId, userProfile?.company_id]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('daily_reports')
        // photo_attachments rather than the photos array: the count has to
        // match what the timeline and the handover bundle will show, and those
        // read the rows (US-330).
        .select('*, photo_attachments(count)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const withCounts = ((data || []) as unknown as Array<
        DailyReport & { photo_attachments?: Array<{ count: number }> }
      >).map((r) => ({
        ...r,
        photo_count: r.photo_attachments?.[0]?.count ?? 0,
      }));
      setReports(withCounts);
    } catch (error: any) {
      console.error('Error loading daily reports:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load daily reports"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Daily Reports ({reports.length})
          </span>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={() => onNavigate(`/daily-reports?project=${projectId}`)}
              variant="outline"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View All
            </Button>
            <Button 
              size="sm" 
              onClick={() => onNavigate('/daily-reports')}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Report
            </Button>
          </div>
        </CardTitle>
        <CardDescription>Recent daily progress reports for this project</CardDescription>
      </CardHeader>
      <CardContent>
        {reports.length > 0 ? (
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {new Date(report.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{report.crew_count} crew</span>
                    {report.weather_conditions && (
                      <>
                        <Cloud className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{report.weather_conditions}</span>
                      </>
                    )}
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Work Performed:</p>
                  <p className="text-sm">{report.work_performed}</p>
                </div>

                {report.delays_issues && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Issues/Delays:</p>
                    <p className="text-sm text-orange-600">{report.delays_issues}</p>
                  </div>
                )}

                    {report.safety_incidents && (
                      <Badge variant="destructive">
                        Safety Incident Reported
                      </Badge>
                    )}

                {/* The crew, and whether it matches the timesheets (US-330).
                    Collapsed by default: the list is a scan of what happened,
                    and expanding is the deliberate act of checking one day. */}
                <div className="pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-0"
                    aria-expanded={expanded === report.id}
                    onClick={() => setExpanded(expanded === report.id ? null : report.id)}
                  >
                    {expanded === report.id
                      ? <ChevronDown className="h-4 w-4 mr-1" aria-hidden="true" />
                      : <ChevronRight className="h-4 w-4 mr-1" aria-hidden="true" />}
                    Crew and photos
                    {(report.photo_count ?? 0) > 0 && (
                      <span className="ml-2 inline-flex items-center text-xs text-muted-foreground">
                        <Camera className="h-3 w-3 mr-1" aria-hidden="true" />
                        {report.photo_count}
                      </span>
                    )}
                  </Button>

                  {expanded === report.id && (
                    <div className="mt-3">
                      <DailyReportCrewPanel
                        dailyReportId={report.id}
                        projectId={report.project_id}
                        reportDate={report.date}
                        reportedCrewCount={report.crew_count}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No daily reports for this project yet</p>
            <Button onClick={() => onNavigate('/daily-reports')} variant="outline">
              <PlusCircle className="h-4 w-4 mr-2" />
              Create First Report
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};