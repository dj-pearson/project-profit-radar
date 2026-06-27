import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { validateFileUpload, generateSecureFilename } from '@/lib/security/fileUploadValidation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import MobileDailyReport from '@/components/mobile/MobileDailyReport';
import { useIsMobile } from '@/hooks/use-mobile';
import { Calendar, Users, AlertTriangle, PlusCircle, FileText, Cloud, Camera, X, Upload, Smartphone, Copy, LayoutTemplate, Settings2 } from 'lucide-react';
import { fetchWeather, formatWeatherForReport } from '@/services/weather';
import { buildReportFromPrevious, applyTemplateDefaults } from '@/lib/dailyReports/templateFill';

interface Project {
  id: string;
  name: string;
  status: string;
}

interface DailyReportTemplateOption {
  id: string;
  name: string;
  default_crew_count: number | null;
  default_weather_conditions: string | null;
  default_safety_notes: string | null;
}

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
  photos: string[];
  created_at: string;
  projects: { name: string };
}

const DailyReports = () => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loadingReports, setLoadingReports] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
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
  const [templates, setTemplates] = useState<DailyReportTemplateOption[]>([]);
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
    
    if (userProfile?.company_id) {
      loadData();
    }
  }, [user, userProfile, loading, navigate]);

  const loadData = async () => {
    try {
      setLoadingReports(true);
      
      // Load projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, status')
        .eq('company_id', userProfile?.company_id)
        .order('name');

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      // Load daily reports
      const { data: reportsData, error: reportsError } = await supabase
        .from('daily_reports')
        .select(`
          id,
          project_id,
          date,
          work_performed,
          crew_count,
          weather_conditions,
          materials_delivered,
          equipment_used,
          delays_issues,
          safety_incidents,
          photos,
          created_at,
          projects!inner(name, company_id)
        `)
        .eq('projects.company_id', userProfile?.company_id)
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;
      setDailyReports(reportsData || []);

      // Load daily report templates for quick-fill (US-074)
      const { data: templatesData } = await supabase
        .from('daily_report_templates')
        .select('id, name, default_crew_count, default_weather_conditions, default_safety_notes')
        .eq('company_id', userProfile?.company_id)
        .eq('is_active', true)
        .order('name');
      setTemplates(templatesData || []);

    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load daily reports data"
      });
    } finally {
      setLoadingReports(false);
    }
  };

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
      const { data, error } = await supabase
        .from('daily_reports')
        .select('work_performed, crew_count, weather_conditions, materials_delivered, equipment_used, delays_issues, safety_incidents, date')
        .eq('project_id', newReport.project_id)
        .lt('date', today)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
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
      // Upload photos to Supabase Storage if any
      const photoUrls: string[] = [];
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
          const filePath = `daily-reports/${newReport.project_id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('project-documents')
            .upload(filePath, photo);

          if (uploadError) {
            console.error('Photo upload error:', uploadError);
            continue;
          }

          const { data: urlData } = supabase.storage
            .from('project-documents')
            .getPublicUrl(filePath);

          if (urlData?.publicUrl) {
            photoUrls.push(urlData.publicUrl);
          }
        }
      }

      const { data, error } = await supabase
        .from('daily_reports')
        .insert({
          ...newReport,
          crew_count: Number(newReport.crew_count),
          date: new Date().toISOString().split('T')[0],
          photos: photoUrls.length > 0 ? photoUrls : null,
          signature: newReport.signature || null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Daily report created successfully${photoUrls.length > 0 ? ` with ${photoUrls.length} photo(s)` : ''}`
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

      loadData();
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
              {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}
            </div>
            <div className="h-[300px] bg-muted animate-pulse rounded-lg" />
          </div>
      </DashboardLayout>
      </AccessiblePageWrapper>
    );
  }

  return (
    <AccessiblePageWrapper pageTitle="Daily Reports">
    <DashboardLayout title="Daily Reports" hasAccessibleWrapper>
      <main className="space-y-6" role="main" aria-label="Daily Reports Management">
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
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button aria-label="Create new daily report">
                  <PlusCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                  Create Report
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl" aria-describedby="create-report-description">
                <DialogHeader>
                  <DialogTitle>Create Daily Report</DialogTitle>
                  <DialogDescription id="create-report-description">
                    Record daily progress, crew activity, and any issues for the project.
                  </DialogDescription>
                </DialogHeader>
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
                      {templates.length > 0 ? (
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
              </DialogContent>
              </Dialog>
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
          {(() => {
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
      </main>

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