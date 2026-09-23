import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AccessiblePageWrapper } from '@/components/accessibility/AccessiblePageWrapper';
import { AccessibleTable, type TableColumn } from '@/components/accessibility/AccessibleTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormFieldHelp } from '@/components/help/HelpTooltip';
import { SignatureCapture } from '@/components/ui/signature-capture';
import { Textarea } from '@/components/ui/textarea';
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
import { supabase } from '@/integrations/supabase/client';
import {
  useDailyReportsPage,
  fetchPreviousDailyReport,
  insertPhotoAttachments,
  countTimeEntriesOnDay,
  type DailyReportsProject,
  type DailyReportListRow,
} from '@/hooks/useDailyReportsPage';
import { validateFileUpload, generateSecureFilename } from '@/lib/security/fileUploadValidation';
import { logger } from '@/lib/logger';
import { photoStoragePath } from '@/lib/dailyReportField';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState, NoDailyReports } from '@/components/ui/EmptyStates';
import MobileDailyReport from '@/components/mobile/MobileDailyReport';
import { useIsMobile } from '@/hooks/use-mobile';
import { Calendar, Users, AlertTriangle, PlusCircle, FileText, Cloud, Camera, X, Upload, Smartphone, Copy, LayoutTemplate, Settings2 } from 'lucide-react';
import { fetchWeather, formatWeatherForReport } from '@/services/weather';
import { buildReportFromPrevious, applyTemplateDefaults } from '@/lib/dailyReports/templateFill';

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
  
  const [newReport, setNewReport] = useState({
    project_id: '',
    work_performed: '',
    crew_count: 0,
    weather_conditions: '',
    materials_delivered: '',
    equipment_used: '',
    delays_issues: '',
    safety_incidents: '',
    signature: ''
  });
  
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

  const handleApplyTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    setNewReport((prev) => ({ ...prev, ...applyTemplateDefaults(template) }));
    toast({ title: 'Template applied', description: `Pre-filled from "${template.name}".` });
  };

  const handleCopyFromYesterday = async () => {
    if (!newReport.project_id) {
      toast({ variant: 'destructive', title: 'Select a project', description: 'Choose a project before copying from a previous report.' });
      return;
    }
    try {
      setCopyingPrevious(true);
      const today = new Date().toISOString().split('T')[0];
      const data = await fetchPreviousDailyReport(newReport.project_id, today);
      if (!data) {
        toast({ title: 'No previous report', description: 'There is no earlier report for this project to copy.' });
        return;
      }
      setNewReport((prev) => ({ ...prev, ...buildReportFromPrevious(data) }));
      toast({ title: 'Copied from previous report', description: `Pre-filled from ${data.date}. Review before saving.` });
    } catch (error) {
      console.error('Copy from yesterday error:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load the previous report.' });
    } finally {
      setCopyingPrevious(false);
    }
  };

  /**
   * Everything the report is a record OF, once the report row exists (US-330).
   *
   * A photo that is only a string in daily_reports.photos cannot be found by
   * project, by date or by who took it, and crew entered as an integer is the
   * same crew that already clocked in, typed a second time.
   *
   * Deliberately non-fatal, and deliberately not silent. The report itself is
   * saved by the time this runs; losing it because a photo row failed would be
   * the worse trade for somebody filing at the end of a shift. Every failure
   * comes back as a sentence in the toast.
   */
  const recordFieldDetail = async ({
    reportId, projectId, reportDate, uploaded,
  }: {
    reportId: string;
    projectId: string;
    reportDate: string;
    uploaded: Array<{ path: string; file: File }>;
  }): Promise<string[]> => {
    const notes: string[] = [];

    const companyId = userProfile?.company_id;
    if (uploaded.length > 0 && companyId && userProfile) {
      const photoError = await insertPhotoAttachments(uploaded.map(({ path, file }) => ({
          project_id: projectId,
          daily_report_id: reportId,
          company_id: companyId,
          user_id: userProfile.id,
          file_name: file.name,
          file_path: path,
          file_size: file.size,
          mime_type: file.type,
          storage_bucket: 'project-documents',
          source: 'daily_report',
          taken_at: new Date(file.lastModified || Date.now()).toISOString(),
        })));

      if (photoError) {
        logger.error('Daily report saved but its photos were not recorded', photoError);
        notes.push(
          `The ${uploaded.length} photo(s) uploaded but were not indexed, so they ` +
          `will not appear on the project timeline (${photoError.message})`
        );
      }
    }

    // Crew from the hours already clocked. The RPC does not overwrite anyone
    // added by hand, so it is safe whether or not the crew was typed first.
    const { data: crewAdded, error: crewError } = await supabase
      .rpc('sync_daily_report_crew', { p_daily_report_id: reportId });

    if (crewError) {
      logger.error('Could not pull the crew from the timesheets', crewError);
      notes.push(`Crew could not be pulled from the timesheets (${crewError.message})`);
    } else if ((crewAdded ?? 0) > 0) {
      notes.push(`${crewAdded} crew member(s) pulled from the day's time entries`);
    } else {
      // Nothing clocked in on that project and day. Worth saying, because the
      // superintendent may have the wrong project selected.
      try {
        const count = await countTimeEntriesOnDay(projectId, reportDate);
        if (!count) notes.push('Nobody clocked in on this job today');
      } catch (countError) {
        logger.error('Could not check the day\'s time entries', countError instanceof Error ? countError : undefined);
        notes.push('Could not check whether anyone clocked in on this job today');
      }
    }

    return notes;
  };

  const handleCreateReport = async () => {
    if (!newReport.project_id || !newReport.work_performed) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select a project and describe work performed."
      });
      return;
    }

    try {
      // Upload photos to Supabase Storage if any.
      // Two records come out of this: the storage path, which still goes in
      // daily_reports.photos so iOS at MIN_SUPPORTED_IOS_VERSION keeps working,
      // and a photo_attachments row, which is the thing anything else can find
      // a photo by (US-330).
      const photoUrls: string[] = [];
      const uploaded: Array<{ path: string; file: File }> = [];
      if (selectedPhotos.length > 0) {
        for (const photo of selectedPhotos) {
          // Validate file before upload
          const validation = validateFileUpload(photo, {
            allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
          });
          if (!validation.valid) {
            toast({
              variant: "destructive",
              title: "Invalid Photo",
              description: validation.error || `Photo "${photo.name}" is not valid.`
            });
            continue;
          }
          const fileName = generateSecureFilename(photo.name);
          // <projectId>/<category>/... so the project-documents SELECT
          // policy matches on the first segment (US-289).
          const filePath = photoStoragePath({
            projectId: newReport.project_id,
            fileName,
          });

          const { error: uploadError } = await supabase.storage
            .from('project-documents')
            .upload(filePath, photo);

          if (uploadError) {
            console.error('Photo upload error:', uploadError);
            continue;
          }

          // Persist the storage path, not a permanent public URL (US-289).
          photoUrls.push(filePath);
          uploaded.push({ path: filePath, file: photo });
        }
      }

      const reportDate = new Date().toISOString().split('T')[0];
      const report = await createReport.mutateAsync({
        ...newReport,
        crew_count: Number(newReport.crew_count),
        date: reportDate,
        photos: photoUrls.length > 0 ? photoUrls : null,
        signature: newReport.signature || null
      });

      const notes = await recordFieldDetail({
        reportId: report.id,
        projectId: newReport.project_id,
        reportDate,
        uploaded,
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
      setNewReport({
        project_id: '',
        work_performed: '',
        crew_count: 0,
        weather_conditions: '',
        materials_delivered: '',
        equipment_used: '',
        delays_issues: '',
        safety_incidents: '',
        signature: ''
      });
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
                <form className="space-y-4" aria-label="Create daily report form" onSubmit={(e) => { e.preventDefault(); handleCreateReport(); }}>
                  <div>
                    <Label htmlFor="project">Project *</Label>
                    <Select value={newReport.project_id} onValueChange={(value) => setNewReport({...newReport, project_id: value})} required>
                      <SelectTrigger aria-required="true" aria-label="Select project">
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quick-fill: template picker + copy from previous (US-074) */}
                  <div className="flex flex-col sm:flex-row gap-2 rounded-md border border-dashed p-3">
                    <div className="flex-1">
                      <Label htmlFor="template-quickfill" className="text-xs flex items-center gap-1">
                        <LayoutTemplate className="h-3 w-3" aria-hidden="true" />
                        Start from template
                      </Label>
                      {templatesError ? (
                        <p className="text-xs text-destructive" role="alert">
                          Templates could not be loaded: {templatesError.message}
                        </p>
                      ) : templates.length > 0 ? (
                        <Select onValueChange={handleApplyTemplate}>
                          <SelectTrigger id="template-quickfill" aria-label="Apply a daily report template">
                            <SelectValue placeholder="Choose a template..." />
                          </SelectTrigger>
                          <SelectContent>
                            {templates.map((t) => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => navigate('/daily-report-templates')}
                        >
                          <Settings2 className="mr-2 h-4 w-4" aria-hidden="true" />
                          Create templates
                        </Button>
                      )}
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCopyFromYesterday}
                        disabled={copyingPrevious || !newReport.project_id}
                        className="whitespace-nowrap"
                      >
                        <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                        {copyingPrevious ? 'Copying…' : 'Copy from Yesterday'}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="work_performed">Work Performed * <FormFieldHelp content="Describe the work completed today. This becomes the official record for the client and your files." /></Label>
                    <Textarea
                      id="work_performed"
                      placeholder="Describe the work completed today..."
                      value={newReport.work_performed}
                      onChange={(e) => setNewReport({...newReport, work_performed: e.target.value})}
                      required
                      aria-required="true"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="crew_count">Crew Count <FormFieldHelp content="Number of workers on site today. Used for labor tracking and productivity reports." /></Label>
                      <Input
                        id="crew_count"
                        type="number"
                        min="0"
                        value={newReport.crew_count}
                        onChange={(e) => setNewReport({...newReport, crew_count: Number(e.target.value)})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="weather_conditions">Weather Conditions <FormFieldHelp content="On-site conditions. Use Auto-fill to pull current weather, or note any weather-related delays." /></Label>
                      <div className="flex gap-2">
                        <Input
                          id="weather_conditions"
                          placeholder="e.g., Sunny, 75°F"
                          value={newReport.weather_conditions}
                          onChange={(e) => setNewReport({...newReport, weather_conditions: e.target.value})}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="whitespace-nowrap"
                          onClick={async () => {
                            try {
                              // Try getting user location for weather auto-fill
                              const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
                                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
                              );
                              const weather = await fetchWeather(pos.coords.latitude, pos.coords.longitude);
                              setNewReport({ ...newReport, weather_conditions: formatWeatherForReport(weather) });
                              toast({ title: 'Weather updated', description: `${weather.conditions}, ${weather.temperature}${weather.temperatureUnit}` });
                            } catch {
                              // Fallback to default location
                              try {
                                const weather = await fetchWeather(39.83, -98.58);
                                setNewReport({ ...newReport, weather_conditions: formatWeatherForReport(weather) });
                              } catch {
                                toast({ variant: 'destructive', title: 'Weather unavailable', description: 'Could not fetch weather data. Please enter manually.' });
                              }
                            }
                          }}
                          aria-label="Auto-fill weather from current location"
                        >
                          <Cloud className="h-4 w-4 mr-1" aria-hidden="true" />
                          Auto-fill
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="materials_delivered">Materials Delivered <FormFieldHelp content="List materials received on site today, with quantities where relevant." /></Label>
                    <Textarea
                      id="materials_delivered"
                      placeholder="List materials delivered today..."
                      value={newReport.materials_delivered}
                      onChange={(e) => setNewReport({...newReport, materials_delivered: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="equipment_used">Equipment Used</Label>
                    <Textarea
                      id="equipment_used"
                      placeholder="List equipment used today..."
                      value={newReport.equipment_used}
                      onChange={(e) => setNewReport({...newReport, equipment_used: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="delays_issues">Delays & Issues</Label>
                    <Textarea
                      id="delays_issues"
                      placeholder="Any delays or issues encountered..."
                      value={newReport.delays_issues}
                      onChange={(e) => setNewReport({...newReport, delays_issues: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="safety_incidents">Safety Incidents</Label>
                    <Textarea
                      id="safety_incidents"
                      placeholder="Any safety incidents or concerns..."
                      value={newReport.safety_incidents}
                      onChange={(e) => setNewReport({...newReport, safety_incidents: e.target.value})}
                    />
                    </div>

                    {/* US-108: Supervisor signature */}
                    <div>
                      <SignatureCapture
                        label="Supervisor Signature"
                        value={newReport.signature}
                        onChange={(dataUrl) => setNewReport({ ...newReport, signature: dataUrl ?? '' })}
                      />
                    </div>

                    {/* Photo Upload Section */}
                    <fieldset>
                      <legend className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Photos</legend>
                      <div className="space-y-4 mt-2">
                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                          <div className="text-center">
                            <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" aria-hidden="true" />
                            <p className="text-sm text-muted-foreground mb-2" id="photo-upload-hint">
                              Add photos to document progress
                            </p>
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                setSelectedPhotos(prev => [...prev, ...files]);
                              }}
                              className="hidden"
                              id="photo-upload"
                              aria-describedby="photo-upload-hint"
                            />
                            <label htmlFor="photo-upload">
                              <Button variant="outline" size="sm" asChild>
                                <span>
                                  <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
                                  Select Photos
                                </span>
                              </Button>
                            </label>
                          </div>
                        </div>

                        {/* Photo Preview */}
                        {selectedPhotos.length > 0 && (
                          <div className="grid grid-cols-3 gap-2" role="list" aria-label="Selected photos">
                            {selectedPhotos.map((photo, index) => (
                              <div key={index} className="relative" role="listitem">
                                <img
                                  src={URL.createObjectURL(photo)}
                                  alt={`Selected photo ${index + 1} of ${selectedPhotos.length}`}
                                  className="w-full h-20 object-cover rounded border"
                                />
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="absolute -top-2 -right-2 h-6 w-6 p-0"
                                  onClick={() => {
                                    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
                                  }}
                                  aria-label={`Remove photo ${index + 1}`}
                                  type="button"
                                >
                                  <X className="h-3 w-3" aria-hidden="true" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </fieldset>

                    <div className="flex justify-end space-x-2">
                    <Button variant="outline" type="button" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      Create Report
                    </Button>
                  </div>
                </form>
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
                    {new Date(value).toLocaleDateString()}
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
                    aria-label={`View report for ${new Date(row.date).toLocaleDateString()}`}
                    onClick={() => {/* View detail */}}
                  >
                    <FileText className="h-4 w-4" aria-hidden="true" />
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