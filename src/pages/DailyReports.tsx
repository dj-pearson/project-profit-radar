import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import MobileDailyReport from '@/components/mobile/MobileDailyReport';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  ArrowLeft, 
  Calendar,
  Users,
  AlertTriangle,
  PlusCircle,
  FileText,
  Truck,
  Cloud,
  Camera,
  X,
  Upload,
  Smartphone
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  status: string;
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
    safety_incidents: ''
  });
  
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [showMobileReport, setShowMobileReport] = useState(false);

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
      const { data: reportsData, error: reportsError } = await supabase.functions.invoke('daily-reports');

      if (reportsError) throw reportsError;
      setDailyReports(reportsData.dailyReports || []);

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
      const { data, error } = await supabase.functions.invoke('daily-reports/create', {
        body: { 
          ...newReport,
          crew_count: Number(newReport.crew_count)
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Daily report created successfully"
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
        safety_incidents: ''
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-construction-blue mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading daily reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-xl font-semibold">Daily Reports</h1>
                <p className="text-sm text-muted-foreground">Field supervisor daily progress reports</p>
              </div>
            </div>
            <div className="flex space-x-2">
              {isMobile && (
                <Button 
                  variant="outline"
                  onClick={() => setShowMobileReport(true)}
                >
                  <Smartphone className="h-4 w-4 mr-2" />
                  Mobile Report
                </Button>
              )}
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Create Report
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Daily Report</DialogTitle>
                  <DialogDescription>
                    Record daily progress, crew activity, and any issues for the project.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="project">Project *</Label>
                    <Select value={newReport.project_id} onValueChange={(value) => setNewReport({...newReport, project_id: value})}>
                      <SelectTrigger>
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

                  <div>
                    <Label htmlFor="work_performed">Work Performed *</Label>
                    <Textarea
                      id="work_performed"
                      placeholder="Describe the work completed today..."
                      value={newReport.work_performed}
                      onChange={(e) => setNewReport({...newReport, work_performed: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="crew_count">Crew Count</Label>
                      <Input
                        id="crew_count"
                        type="number"
                        min="0"
                        value={newReport.crew_count}
                        onChange={(e) => setNewReport({...newReport, crew_count: Number(e.target.value)})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="weather_conditions">Weather Conditions</Label>
                      <Input
                        id="weather_conditions"
                        placeholder="e.g., Sunny, 75°F"
                        value={newReport.weather_conditions}
                        onChange={(e) => setNewReport({...newReport, weather_conditions: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="materials_delivered">Materials Delivered</Label>
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

                    {/* Photo Upload Section */}
                    <div>
                      <Label>Photos</Label>
                      <div className="space-y-4">
                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                          <div className="text-center">
                            <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground mb-2">
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
                            />
                            <label htmlFor="photo-upload">
                              <Button variant="outline" size="sm" asChild>
                                <span>
                                  <Upload className="h-4 w-4 mr-2" />
                                  Select Photos
                                </span>
                              </Button>
                            </label>
                          </div>
                        </div>
                        
                        {/* Photo Preview */}
                        {selectedPhotos.length > 0 && (
                          <div className="grid grid-cols-3 gap-2">
                            {selectedPhotos.map((photo, index) => (
                              <div key={index} className="relative">
                                <img
                                  src={URL.createObjectURL(photo)}
                                  alt={`Preview ${index + 1}`}
                                  className="w-full h-20 object-cover rounded border"
                                />
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="absolute -top-2 -right-2 h-6 w-6 p-0"
                                  onClick={() => {
                                    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateReport}>
                      Create Report
                    </Button>
                  </div>
                </div>
              </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Label htmlFor="project-filter">Filter by Project</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
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

        {/* Reports List */}
        <div className="space-y-6">
          {filteredReports.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Daily Reports</h3>
                <p className="text-muted-foreground mb-4">
                  {selectedProject ? 'No reports found for selected project' : 'No reports have been created yet'}
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create First Report
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {filteredReports.map((report) => (
                <Card key={report.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <Calendar className="h-5 w-5 text-construction-blue" />
                          <span>{new Date(report.date).toLocaleDateString()}</span>
                        </CardTitle>
                        <CardDescription>{report.projects?.name}</CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">
                          <Users className="h-3 w-3 mr-1" />
                          {report.crew_count} crew
                        </Badge>
                        {report.safety_incidents && (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Safety Issue
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Work Performed</h4>
                      <p className="text-sm text-muted-foreground">{report.work_performed}</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {report.weather_conditions && (
                        <div>
                          <h4 className="font-medium mb-1 flex items-center">
                            <Cloud className="h-4 w-4 mr-1" />
                            Weather
                          </h4>
                          <p className="text-sm text-muted-foreground">{report.weather_conditions}</p>
                        </div>
                      )}
                      
                      {report.materials_delivered && (
                        <div>
                          <h4 className="font-medium mb-1 flex items-center">
                            <Truck className="h-4 w-4 mr-1" />
                            Materials Delivered
                          </h4>
                          <p className="text-sm text-muted-foreground">{report.materials_delivered}</p>
                        </div>
                      )}
                    </div>

                    {report.equipment_used && (
                      <div>
                        <h4 className="font-medium mb-1">Equipment Used</h4>
                        <p className="text-sm text-muted-foreground">{report.equipment_used}</p>
                      </div>
                    )}

                    {report.delays_issues && (
                      <div>
                        <h4 className="font-medium mb-1 text-yellow-600">Delays & Issues</h4>
                        <p className="text-sm text-muted-foreground">{report.delays_issues}</p>
                      </div>
                    )}

                    {report.safety_incidents && (
                      <div>
                        <h4 className="font-medium mb-1 text-red-600">Safety Incidents</h4>
                        <p className="text-sm text-muted-foreground">{report.safety_incidents}</p>
                      </div>
                    )}

                    {/* Photo Gallery */}
                    {report.photos && report.photos.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center">
                          <Camera className="h-4 w-4 mr-1" />
                          Photos ({report.photos.length})
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {report.photos.map((photo, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={photo}
                                alt={`Report photo ${index + 1}`}
                                className="w-full h-20 object-cover rounded border hover:opacity-75 transition-opacity cursor-pointer"
                                onClick={() => window.open(photo, '_blank')}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Report Modal */}
      {showMobileReport && (
        <div className="fixed inset-0 bg-background z-50">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-semibold">Mobile Daily Report</h2>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowMobileReport(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-auto p-4">
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
      )}
    </div>
  );
};

export default DailyReports;