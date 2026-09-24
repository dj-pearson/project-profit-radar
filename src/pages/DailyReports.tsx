import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AccessiblePageWrapper } from '@/components/accessibility/AccessiblePageWrapper';
import { AccessibleTable, type TableColumn } from '@/components/accessibility/AccessibleTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
} from '@/components/ui/responsive-dialog';
import { toast } from '@/hooks/use-toast';
import {
  useDailyReportsPage,
  fetchPreviousDailyReport,
  uploadDailyReportPhotos,
  recordDailyReportFieldDetail,
  type DailyReportsProject,
  type DailyReportListRow,
} from '@/hooks/useDailyReportsPage';
import { logger } from '@/lib/logger';
import { materialItemsFromText, equipmentItemsFromText } from '@/lib/dailyReportField';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, NoDailyReports } from '@/components/ui/EmptyStates';
import MobileDailyReport from '@/components/mobile/MobileDailyReport';
import { useIsMobile } from '@/hooks/use-mobile';
import { Calendar, Users, AlertTriangle, PlusCircle, FileText, FileDown, Cloud, X, Smartphone } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { useDailyReportPdf } from '@/hooks/useDailyReportExport';
import { fetchWeather, formatWeatherForReport } from '@/services/weather';
import { buildReportFromPrevious, applyTemplateDefaults } from '@/lib/dailyReports/templateFill';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  dailyReportFormSchema,
  buildDailyReportInsert,
  EMPTY_DAILY_REPORT,
  type DailyReportFormValues,
} from '@/lib/validations/daily-reports';
import { CreateDailyReportForm } from './daily-reports/CreateDailyReportForm';

type Project = DailyReportsProject;
type DailyReport = DailyReportListRow;

const DailyReports = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const [selectedProject, setSelectedProject] = useState<string>('');
  const canViewReports = !!userProfile && ['admin', 'project_manager', 'field_supervisor', 'root_admin'].includes(userProfile.role);
  const {
    projects: loadedProjects,
    reports: loadedReports,
    isLoading: queryLoading,
    error: loadErrorObj,
    refetch,
    templates: loadedTemplates,
    templatesError,
    createReport,
  } = useDailyReportsPage({ enabled: canViewReports });
  const projects: Project[] = loadedProjects;
  const dailyReports: DailyReport[] = loadedReports;
  const templates = loadedTemplates;
  // Before the profile arrives there is nothing to fetch yet; keep the skeleton up.
  const loadingReports = queryLoading || !userProfile;
  // A failed load used to render "No reports have been created yet" over a
  // toast. The query keeps the failure so the list says so and offers a retry.
  const loadError = !!loadErrorObj;
  const loadData = () => { void refetch(); };

  useEffect(() => {
    if (!loadErrorObj) return;
    console.error('Error loading data:', loadErrorObj);
    toast({
      variant: "destructive",
      title: "Error",
      description: "Failed to load daily reports data"
    });
  }, [loadErrorObj]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // A quick action that navigates has to land on the thing it promised. The
  // mobile quick-actions sheet and the dashboard cards link here with ?new=1
  // rather than dropping the user on a list to hunt for the button. The param
  // is consumed on arrival so a reload or a back-navigation does not reopen it.
  useEffect(() => {
    if (searchParams.get('new') !== '1') return;
    setIsCreateDialogOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('new');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);
  
  // Create form (US-268): react-hook-form + Zod. Held on the page so a draft
  // survives closing the dialog.
  const reportForm = useForm<DailyReportFormValues>({
    resolver: zodResolver(dailyReportFormSchema),
    defaultValues: EMPTY_DAILY_REPORT,
  });

  /** Merge pre-filled values (template, previous report, weather) into the form. */
  const fillReport = (partial: Partial<DailyReportFormValues>) => {
    for (const [key, value] of Object.entries(partial) as Array<[keyof DailyReportFormValues, never]>) {
      reportForm.setValue(key, value, { shouldDirty: true });
    }
  };
  
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [showMobileReport, setShowMobileReport] = useState(false);
  const [copyingPrevious, setCopyingPrevious] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    
    if (!loading && user && userProfile && !userProfile.company_id) {
      navigate('/setup');
    }
    
    // Check role permissions
    if (!loading && userProfile && !['admin', 'project_manager', 'field_supervisor', 'root_admin'].includes(userProfile.role)) {
      navigate('/dashboard');
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You don't have permission to access daily reports."
      });
      return;
    }
  }, [user, userProfile, loading, navigate]);

  // The customer copy, photos included (US-330).
  const reportPdf = useDailyReportPdf();
  const handleDownloadPdf = (reportId: string) => {
    reportPdf.mutate(reportId, {
      onSuccess: ({ photos, missing }) => toast({
        title: 'PDF downloaded',
        description: missing > 0
          ? `${photos} photo(s) included; ${missing} could not be loaded and are noted in the PDF.`
          : `${photos} photo(s) included.`,
      }),
      onError: (error) => {
        logger.error('Daily report PDF failed', error);
        toast({ variant: 'destructive', title: 'PDF not created', description: 'The report could not be loaded. Try again.' });
      },
    });
  };

  const handleApplyTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    fillReport(applyTemplateDefaults(template));
    toast({ title: 'Template applied', description: `Pre-filled from "${template.name}".` });
  };

  const handleCopyFromYesterday = async () => {
    const projectId = reportForm.getValues('project_id');
    if (!projectId) {
      toast({ variant: 'destructive', title: 'Select a project', description: 'Choose a project before copying from a previous report.' });
      return;
    }
    try {
      setCopyingPrevious(true);
      const today = new Date().toISOString().split('T')[0];
      const data = await fetchPreviousDailyReport(projectId, today);
      if (!data) {
        toast({ title: 'No previous report', description: 'There is no earlier report for this project to copy.' });
        return;
      }
      fillReport(buildReportFromPrevious(data));
      toast({ title: 'Copied from previous report', description: `Pre-filled from ${data.date}. Review before saving.` });
    } catch (error) {
      console.error('Copy from yesterday error:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load the previous report.' });
    } finally {
      setCopyingPrevious(false);
    }
  };

  const handleAutoFillWeather = async () => {
    try {
      // Try getting user location for weather auto-fill
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
      );
      const weather = await fetchWeather(pos.coords.latitude, pos.coords.longitude);
      fillReport({ weather_conditions: formatWeatherForReport(weather) });
      toast({ title: 'Weather updated', description: `${weather.conditions}, ${weather.temperature}${weather.temperatureUnit}` });
    } catch {
      // Fallback to default location
      try {
        const weather = await fetchWeather(39.83, -98.58);
        fillReport({ weather_conditions: formatWeatherForReport(weather) });
      } catch {
        toast({ variant: 'destructive', title: 'Weather unavailable', description: 'Could not fetch weather data. Please enter manually.' });
      }
    }
  };

  // Runs only once the schema passes; a missing project or blank work
  // description now shows inline under the field instead of as a toast.
  const handleCreateReport = async (values: DailyReportFormValues) => {
    try {
      // Photos go to storage under a project-first path (photoStoragePath,
      // inside the hook). A photo that fails validation is named, not fatal.
      const { uploaded, rejected } = await uploadDailyReportPhotos(values.project_id, selectedPhotos);
      for (const r of rejected) {
        toast({ variant: "destructive", title: "Photo not saved", description: `${r.name}: ${r.reason}` });
      }
      const photoUrls = uploaded.map((u) => u.path);

      const reportDate = new Date().toISOString().split('T')[0];
      const report = await createReport.mutateAsync(
        buildDailyReportInsert(values, { date: reportDate, photoPaths: photoUrls }),
      );

      const notes = await recordDailyReportFieldDetail({
        reportId: report.id,
        projectId: values.project_id,
        reportDate,
        uploaded,
        materials: materialItemsFromText(values.materials_delivered),
        equipment: equipmentItemsFromText(values.equipment_used),
        companyId: userProfile?.company_id,
        userId: userProfile?.id,
      });

      toast({
        title: "Success",
        description: [
          'Daily report created',
          photoUrls.length > 0 ? `${photoUrls.length} photo(s)` : '',
          ...notes,
        ].filter(Boolean).join('. ')
      });

      setIsCreateDialogOpen(false);
      reportForm.reset(EMPTY_DAILY_REPORT);
      setSelectedPhotos([]);
    } catch (error: any) {
      console.error('Error creating report:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create daily report"
      });
    }
  };

  const filteredReports = selectedProject && selectedProject !== 'all'
    ? dailyReports.filter(report => report.project_id === selectedProject)
    : dailyReports;

  if (loading || loadingReports) {
    return (
      <AccessiblePageWrapper pageTitle="Daily Reports">
      <DashboardLayout title="Daily Reports" hasAccessibleWrapper>
        <div className="space-y-6" role="status" aria-live="polite" aria-label="Loading content">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
            </div>
            <Skeleton className="h-[300px] rounded-lg" />
          </div>
      </DashboardLayout>
      </AccessiblePageWrapper>
    );
  }

  return (
    <AccessiblePageWrapper pageTitle="Daily Reports">
    <DashboardLayout title="Daily Reports" hasAccessibleWrapper>
      <div className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Daily Project Reports</h2>
            <p className="text-sm text-muted-foreground">Track daily progress and activities</p>
          </div>
          <div className="flex space-x-2">
            {isMobile && (
              <Button
                variant="outline"
                onClick={() => setShowMobileReport(true)}
                aria-label="Open mobile report form"
              >
                <Smartphone className="h-4 w-4 mr-2" aria-hidden="true" />
                Mobile Report
              </Button>
            )}
            <ResponsiveDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <ResponsiveDialogTrigger asChild>
                <Button aria-label="Create new daily report">
                  <PlusCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                  Create Report
                </Button>
              </ResponsiveDialogTrigger>
              <ResponsiveDialogContent className="max-w-2xl" aria-describedby="create-report-description">
                <ResponsiveDialogHeader>
                  <ResponsiveDialogTitle>Create Daily Report</ResponsiveDialogTitle>
                  <ResponsiveDialogDescription id="create-report-description">
                    Record daily progress, crew activity, and any issues for the project.
                  </ResponsiveDialogDescription>
                </ResponsiveDialogHeader>
                <CreateDailyReportForm
                  form={reportForm}
                  onSubmit={handleCreateReport}
                  onCancel={() => setIsCreateDialogOpen(false)}
                  projects={projects}
                  templates={templates}
                  templatesError={templatesError}
                  onApplyTemplate={handleApplyTemplate}
                  onCreateTemplates={() => navigate('/daily-report-templates')}
                  onCopyFromYesterday={handleCopyFromYesterday}
                  copyingPrevious={copyingPrevious}
                  onAutoFillWeather={handleAutoFillWeather}
                  selectedPhotos={selectedPhotos}
                  onAddPhotos={(files) => setSelectedPhotos((prev) => [...prev, ...files])}
                  onRemovePhoto={(index) => setSelectedPhotos((prev) => prev.filter((_, i) => i !== index))}
                />
              </ResponsiveDialogContent>
              </ResponsiveDialog>
          </div>
        </header>
        {/* Filters */}
        <section aria-label="Report filters">
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4" role="search" aria-label="Filter daily reports">
                <div className="flex-1">
                  <Label htmlFor="project-filter">Filter by Project</Label>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger aria-label="Select project to filter reports">
                      <SelectValue placeholder="All projects" />
                    </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All projects</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        </section>

        {/* Reports Table */}
        <section aria-label="Daily reports list" className="space-y-6">
          {loadError ? (
            <ErrorState
              title="Daily reports did not load"
              description="We could not load your daily reports. Nothing is missing yet; try again."
              onRetry={loadData}
            />
          ) : dailyReports.length === 0 ? (
            <NoDailyReports onCreate={() => setIsCreateDialogOpen(true)} />
          ) : (() => {
            const dailyReportColumns: TableColumn<DailyReport>[] = [
              {
                key: 'date',
                header: 'Date',
                sortable: true,
                render: (value) => (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-construction-blue" aria-hidden="true" />
                    {formatDate(value)}
                  </span>
                ),
              },
              {
                key: 'projects',
                header: 'Project',
                sortable: true,
                render: (value) => (
                  <span>{value?.name || 'Unknown'}</span>
                ),
              },
              {
                key: 'crew_count',
                header: 'Crew Count',
                sortable: true,
                render: (value) => (
                  <Badge variant="outline" aria-label={`${value} crew members`}>
                    <Users className="h-3 w-3 mr-1" aria-hidden="true" />
                    {value}
                  </Badge>
                ),
              },
              {
                key: 'weather_conditions',
                header: 'Weather',
                hideOnMobile: true,
                render: (value) => (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    {value ? (
                      <>
                        <Cloud className="h-3 w-3" aria-hidden="true" />
                        {value}
                      </>
                    ) : (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </span>
                ),
              },
              {
                key: 'work_performed',
                header: 'Work Performed',
                hideOnMobile: true,
                render: (value) => (
                  <span className="text-sm text-muted-foreground" title={value}>
                    {value && value.length > 80 ? value.slice(0, 80) + '...' : value || '--'}
                  </span>
                ),
              },
              {
                key: 'safety_incidents',
                header: 'Safety Issues',
                render: (value) => value ? (
                  <Badge variant="destructive" aria-label="Safety issue reported">
                    <AlertTriangle className="h-3 w-3 mr-1" aria-hidden="true" />
                    Issue
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">None</span>
                ),
              },
              {
                key: 'actions',
                header: 'Actions',
                headerRender: () => <span className="sr-only">Actions</span>,
                render: (_, row) => (
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label={`Download PDF of the report for ${formatDate(row.date)}`}
                    disabled={reportPdf.isPending && reportPdf.variables === row.id}
                    onClick={() => handleDownloadPdf(row.id)}
                  >
                    <FileDown className="h-4 w-4" aria-hidden="true" />
                  </Button>
                ),
              },
            ];

            return (
              <AccessibleTable<DailyReport>
                caption="Daily Reports"
                hideCaption
                columns={dailyReportColumns}
                data={filteredReports}
                loading={loadingReports}
                emptyContent={
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                    <h3 className="text-lg font-medium mb-2">No Daily Reports</h3>
                    <p className="text-muted-foreground mb-4">
                      {selectedProject ? 'No reports found for selected project' : 'No reports have been created yet'}
                    </p>
                    <Button onClick={() => setIsCreateDialogOpen(true)} aria-label="Create your first daily report">
                      <PlusCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                      Create First Report
                    </Button>
                  </div>
                }
              />
            );
          })()}
        </section>
      </div>

      {/* Mobile Report Modal */}
      {showMobileReport && (
        <div
          className="fixed inset-0 bg-background z-50 flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-report-title"
        >
          <header className="flex items-center justify-between p-4 border-b shrink-0">
            <h2 id="mobile-report-title" className="text-xl font-semibold">Mobile Daily Report</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMobileReport(false)}
              aria-label="Close mobile report form"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </header>
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="p-4">
              <MobileDailyReport
                companyId={userProfile?.company_id || ''}
                userId={user?.id || ''}
                onReportSaved={() => {
                  setShowMobileReport(false);
                  loadData();
                  toast({
                    title: "Report Saved",
                    description: "Daily report has been saved successfully"
                  });
                }}
              />
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
    </AccessiblePageWrapper>
  );
};

export default DailyReports;