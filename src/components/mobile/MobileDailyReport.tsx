import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  Users, 
  Cloud, 
  AlertTriangle, 
  CheckCircle,
  Upload,
  Wifi,
  WifiOff,
  Save
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import MobileCamera from './MobileCamera';

interface Project {
  id: string;
  name: string;
  status: string;
}

interface DailyReportData {
  id?: string;
  project_id: string;
  date: string;
  work_performed: string;
  crew_count: number;
  weather_conditions: string;
  materials_delivered: string;
  equipment_used: string;
  delays_issues: string;
  safety_incidents: string;
  photos: File[];
  offline?: boolean;
  synced?: boolean;
}

interface MobileDailyReportProps {
  companyId: string;
  userId: string;
  onReportSaved: () => void;
}

const MobileDailyReport: React.FC<MobileDailyReportProps> = ({
  companyId,
  userId,
  onReportSaved
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showCamera, setShowCamera] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingReports, setPendingReports] = useState<DailyReportData[]>([]);
  
  const [reportData, setReportData] = useState<DailyReportData>({
    project_id: '',
    date: new Date().toISOString().split('T')[0],
    work_performed: '',
    crew_count: 1,
    weather_conditions: '',
    materials_delivered: '',
    equipment_used: '',
    delays_issues: '',
    safety_incidents: '',
    photos: []
  });

  useEffect(() => {
    loadProjects();
    loadPendingReports();

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [companyId]);

  useEffect(() => {
    if (isOnline && pendingReports.length > 0) {
      syncPendingReports();
    }
  }, [isOnline, pendingReports]);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status')
        .eq('company_id', companyId)
        .in('status', ['active', 'in_progress'])
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
      if (isOnline) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load projects"
        });
      }
    }
  };

  const loadPendingReports = () => {
    const stored = localStorage.getItem('pending_daily_reports');
    if (stored) {
      try {
        setPendingReports(JSON.parse(stored));
      } catch (error) {
        console.error('Error loading pending reports:', error);
      }
    }
  };

  const savePendingReport = (report: DailyReportData) => {
    const updated = [...pendingReports, { ...report, offline: true, synced: false }];
    setPendingReports(updated);
    localStorage.setItem('pending_daily_reports', JSON.stringify(updated));
  };

  const syncPendingReports = async () => {
    for (const report of pendingReports) {
      if (!report.synced) {
        try {
          await saveReportToServer(report);
          // Mark as synced
          const updated = pendingReports.map(r => 
            r === report ? { ...r, synced: true } : r
          );
          setPendingReports(updated);
          localStorage.setItem('pending_daily_reports', JSON.stringify(updated));
        } catch (error) {
          console.error('Error syncing report:', error);
        }
      }
    }
    
    // Remove synced reports
    const unsynced = pendingReports.filter(r => !r.synced);
    setPendingReports(unsynced);
    localStorage.setItem('pending_daily_reports', JSON.stringify(unsynced));
  };

  const saveReportToServer = async (report: DailyReportData) => {
    const { error } = await supabase.functions.invoke('daily-reports', {
      method: 'POST',
      body: {
        path: 'create',
        project_id: report.project_id,
        date: report.date,
        work_performed: report.work_performed,
        crew_count: report.crew_count,
        weather_conditions: report.weather_conditions,
        materials_delivered: report.materials_delivered,
        equipment_used: report.equipment_used,
        delays_issues: report.delays_issues,
        safety_incidents: report.safety_incidents
      }
    });

    if (error) throw error;
  };

  const handleSaveReport = async () => {
    if (!reportData.project_id || !reportData.work_performed.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select a project and describe work performed"
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isOnline) {
        await saveReportToServer(reportData);
        toast({
          title: "Report Saved",
          description: "Daily report saved successfully"
        });
      } else {
        savePendingReport(reportData);
        toast({
          title: "Report Saved Offline",
          description: "Report will sync when connection is restored"
        });
      }

      // Reset form
      setReportData({
        project_id: '',
        date: new Date().toISOString().split('T')[0],
        work_performed: '',
        crew_count: 1,
        weather_conditions: '',
        materials_delivered: '',
        equipment_used: '',
        delays_issues: '',
        safety_incidents: '',
        photos: []
      });

      onReportSaved();
    } catch (error) {
      console.error('Error saving report:', error);
      if (isOnline) {
        // If online save fails, save offline as backup
        savePendingReport(reportData);
        toast({
          title: "Saved Offline",
          description: "Failed to sync but saved locally"
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to save report"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoCapture = (file: File) => {
    setReportData(prev => ({
      ...prev,
      photos: [...prev.photos, file]
    }));
    setShowCamera(false);
    toast({
      title: "Photo Added",
      description: "Photo captured and added to report"
    });
  };

  const removePhoto = (index: number) => {
    setReportData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  if (showCamera) {
    return (
      <MobileCamera
        onCapture={handlePhotoCapture}
        onCancel={() => setShowCamera(false)}
        maxPhotos={10}
        currentCount={reportData.photos.length}
      />
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Connection Status */}
      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
        <div className="flex items-center space-x-2">
          {isOnline ? (
            <>
              <Wifi className="h-4 w-4 text-green-600" />
              <span className="text-sm">Online</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-orange-600" />
              <span className="text-sm">Offline Mode</span>
            </>
          )}
        </div>
        
        {pendingReports.length > 0 && (
          <Badge variant="outline">
            {pendingReports.length} pending
          </Badge>
        )}
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daily Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Project Selection */}
          <div>
            <Label htmlFor="project">Project *</Label>
            <Select 
              value={reportData.project_id} 
              onValueChange={(value) => setReportData(prev => ({ ...prev, project_id: value }))}
            >
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

          {/* Date */}
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={reportData.date}
              onChange={(e) => setReportData(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>

          {/* Work Performed */}
          <div>
            <Label htmlFor="work_performed">Work Performed *</Label>
            <Textarea
              id="work_performed"
              placeholder="Describe work completed today..."
              value={reportData.work_performed}
              onChange={(e) => setReportData(prev => ({ ...prev, work_performed: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Crew Count & Weather */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="crew_count">Crew Count</Label>
              <Input
                id="crew_count"
                type="number"
                min="1"
                value={reportData.crew_count}
                onChange={(e) => setReportData(prev => ({ ...prev, crew_count: Number(e.target.value) }))}
              />
            </div>
            <div>
              <Label htmlFor="weather">Weather</Label>
              <Input
                id="weather"
                placeholder="Sunny, 75°F"
                value={reportData.weather_conditions}
                onChange={(e) => setReportData(prev => ({ ...prev, weather_conditions: e.target.value }))}
              />
            </div>
          </div>

          {/* Materials & Equipment */}
          <div>
            <Label htmlFor="materials">Materials Delivered</Label>
            <Textarea
              id="materials"
              placeholder="Materials received today..."
              value={reportData.materials_delivered}
              onChange={(e) => setReportData(prev => ({ ...prev, materials_delivered: e.target.value }))}
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="equipment">Equipment Used</Label>
            <Textarea
              id="equipment"
              placeholder="Equipment in use..."
              value={reportData.equipment_used}
              onChange={(e) => setReportData(prev => ({ ...prev, equipment_used: e.target.value }))}
              rows={2}
            />
          </div>

          {/* Issues */}
          <div>
            <Label htmlFor="delays">Delays & Issues</Label>
            <Textarea
              id="delays"
              placeholder="Any delays or issues..."
              value={reportData.delays_issues}
              onChange={(e) => setReportData(prev => ({ ...prev, delays_issues: e.target.value }))}
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="safety">Safety Incidents</Label>
            <Textarea
              id="safety"
              placeholder="Safety incidents or concerns..."
              value={reportData.safety_incidents}
              onChange={(e) => setReportData(prev => ({ ...prev, safety_incidents: e.target.value }))}
              rows={2}
            />
          </div>

          {/* Photos */}
          <div>
            <Label>Photos ({reportData.photos.length}/10)</Label>
            <div className="space-y-2">
              <Button
                variant="outline" 
                onClick={() => setShowCamera(true)}
                disabled={reportData.photos.length >= 10}
                className="w-full"
              >
                <Camera className="h-4 w-4 mr-2" />
                Take Photo
              </Button>
              
              {reportData.photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {reportData.photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-20 object-cover rounded border"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 p-0"
                        onClick={() => removePhoto(index)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Safety Warning */}
          {reportData.safety_incidents.trim() && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700">Safety incident reported</span>
            </div>
          )}

          {/* Save Button */}
          <Button 
            onClick={handleSaveReport}
            disabled={isLoading || !reportData.project_id || !reportData.work_performed.trim()}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isOnline ? 'Save Report' : 'Save Offline'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileDailyReport;