import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Camera, CheckCircle2, X, Send, Calendar, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useDailyReportsPage, useSaveDailyReport } from '@/hooks/useDailyReportsPage';
import { buildDailyReportInsert } from '@/lib/validations/daily-reports';
import { mapWizardReport, photoFileFromBase64 } from '@/lib/dailyReports/mobileReport';
import { EnhancedMobileCamera } from './EnhancedMobileCamera';
import { format } from 'date-fns';
import { LoadingSpinner } from "@/components/ui/loading-spinner";

import type { CrewMember, DailyReportData, EquipmentUsage, MaterialUsage, TaskProgress } from './daily-report/types';
import { CrewStep } from './daily-report/CrewStep';
import { TaskProgressStep } from './daily-report/TaskProgressStep';
import { MaterialsEquipmentStep } from './daily-report/MaterialsEquipmentStep';

interface MobileDailyReportProps {
  projectId?: string;
  onReportSubmitted?: (report: Record<string, unknown>) => void;
  onClose?: () => void;
}

const MobileDailyReportManager: React.FC<MobileDailyReportProps> = ({
  projectId,
  onReportSubmitted,
  onClose
}) => {
  const [reportData, setReportData] = useState<DailyReportData>({
    report_date: format(new Date(), 'yyyy-MM-dd'),
    project_id: projectId || '',
    weather_conditions: '',
    temperature: '',
    work_performed: '',
    crew_members: [],
    task_progress: [],
    material_usage: [],
    equipment_usage: [],
    safety_observations: '',
    quality_issues: '',
    delays_challenges: '',
    photos: [],
    next_day_plan: '',
    client_visitors: '',
    deliveries_received: '',
    total_crew_hours: 0,
    work_completion_percentage: 0
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [newCrewMember, setNewCrewMember] = useState<CrewMember>({
    name: '',
    role: '',
    hours_worked: 8,
    overtime_hours: 0
  });
  const [newTask, setNewTask] = useState<TaskProgress>({
    task_name: '',
    planned_completion: 0,
    actual_completion: 0,
    status: 'on_track'
  });
  const [newMaterial, setNewMaterial] = useState<MaterialUsage>({
    material_name: '',
    quantity_used: 0,
    unit: '',
    waste_percentage: 0
  });
  const [newEquipment, setNewEquipment] = useState<EquipmentUsage>({
    equipment_name: '',
    hours_used: 0,
    condition: 'good'
  });

  const { toast } = useToast();
  const { user } = useAuth();
  const { isOnline, saveOfflineData } = useOfflineSync();
  const { position, getCurrentPosition } = useGeolocation();
  // The same project list /daily-reports reads. It used to fall back to three
  // invented projects ('proj-1'...) whose ids are not uuids, so a report filed
  // against one could never save.
  const { projects: allProjects } = useDailyReportsPage();
  const projects = allProjects.filter((p) => ['active', 'in_progress'].includes(p.status));
  const saveReport = useSaveDailyReport();

  // Get position only once on mount
  useEffect(() => {
    getCurrentPosition();
  }, []);

  // Recalculate total hours when crew members change
  useEffect(() => {
    calculateTotalHours();
  }, [reportData.crew_members]);

  const calculateTotalHours = () => {
    const total = reportData.crew_members.reduce((sum, member) => 
      sum + member.hours_worked + member.overtime_hours, 0
    );
    setReportData(prev => ({ ...prev, total_crew_hours: total }));
  };

  const handlePhotoCapture = (file: File, metadata?: Record<string, unknown>) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const base64Data = base64.split(',')[1];
      setReportData(prev => ({
        ...prev,
        photos: [...prev.photos, base64Data]
      }));
    };
    reader.readAsDataURL(file);
    
    setShowCamera(false);
    toast({
      title: "Photo Added",
      description: "Progress photo captured successfully",
    });
  };

  const addCrewMember = () => {
    if (newCrewMember.name && newCrewMember.role) {
      setReportData(prev => ({
        ...prev,
        crew_members: [...prev.crew_members, { ...newCrewMember }]
      }));
      setNewCrewMember({
        name: '',
        role: '',
        hours_worked: 8,
        overtime_hours: 0
      });
    }
  };

  const removeCrewMember = (index: number) => {
    setReportData(prev => ({
      ...prev,
      crew_members: prev.crew_members.filter((_, i) => i !== index)
    }));
  };

  const addTask = () => {
    if (newTask.task_name) {
      setReportData(prev => ({
        ...prev,
        task_progress: [...prev.task_progress, { ...newTask }]
      }));
      setNewTask({
        task_name: '',
        planned_completion: 0,
        actual_completion: 0,
        status: 'on_track'
      });
    }
  };

  const removeTask = (index: number) => {
    setReportData(prev => ({
      ...prev,
      task_progress: prev.task_progress.filter((_, i) => i !== index)
    }));
  };

  const addMaterial = () => {
    if (newMaterial.material_name && newMaterial.unit) {
      setReportData(prev => ({
        ...prev,
        material_usage: [...prev.material_usage, { ...newMaterial }]
      }));
      setNewMaterial({
        material_name: '',
        quantity_used: 0,
        unit: '',
        waste_percentage: 0
      });
    }
  };

  const removeMaterial = (index: number) => {
    setReportData(prev => ({
      ...prev,
      material_usage: prev.material_usage.filter((_, i) => i !== index)
    }));
  };

  const addEquipment = () => {
    if (newEquipment.equipment_name) {
      setReportData(prev => ({
        ...prev,
        equipment_usage: [...prev.equipment_usage, { ...newEquipment }]
      }));
      setNewEquipment({
        equipment_name: '',
        hours_used: 0,
        condition: 'good'
      });
    }
  };

  const removeEquipment = (index: number) => {
    setReportData(prev => ({
      ...prev,
      equipment_usage: prev.equipment_usage.filter((_, i) => i !== index)
    }));
  };

  const removePhoto = (index: number) => {
    setReportData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const submitReport = async () => {
    if (!reportData.project_id || !reportData.work_performed) {
      toast({
        title: "Missing Information",
        description: "Please fill in project and work performed fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const mapped = mapWizardReport(reportData, {
        userId: user?.id,
        gps: position?.coords
          ? { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy }
          : null,
      });

      if (isOnline) {
        // Same row and follow-up records as the desktop form: only real
        // daily_reports columns, then material/equipment/crew/task rows,
        // photo_attachments and the timesheet crew pull.
        const saved = await saveReport.mutateAsync({
          ...mapped,
          photos: reportData.photos.map((b64, i) => photoFileFromBase64(b64, i)),
        });

        toast({
          title: "Report Submitted",
          description: [
            'Daily progress report has been submitted',
            saved.photoCount > 0 ? `${saved.photoCount} photo(s)` : '',
            ...saved.notes,
          ].filter(Boolean).join('. '),
        });

        onReportSubmitted?.({ id: saved.id });
      } else {
        // The replay inserts this row as-is, so it has to be the same row.
        // Photos and the crew/task/item rows need the report id and a
        // connection; the text columns and crew totals still carry them.
        await saveOfflineData('daily_report', buildDailyReportInsert(mapped.values, {
          date: mapped.date,
          photoPaths: [],
          columns: mapped.columns,
        }));

        toast({
          title: "Report Saved Offline",
          description: reportData.photos.length > 0
            ? `Report will be submitted when connection is restored. The ${reportData.photos.length} photo(s) were not kept offline; add them from Daily Reports once you are back online.`
            : "Report will be submitted when connection is restored",
        });
      }

      // Reset form
      setReportData({
        report_date: format(new Date(), 'yyyy-MM-dd'),
        project_id: projectId || '',
        weather_conditions: '',
        temperature: '',
        work_performed: '',
        crew_members: [],
        task_progress: [],
        material_usage: [],
        equipment_usage: [],
        safety_observations: '',
        quality_issues: '',
        delays_challenges: '',
        photos: [],
        next_day_plan: '',
        client_visitors: '',
        deliveries_received: '',
        total_crew_hours: 0,
        work_completion_percentage: 0
      });
      
      setCurrentStep(1);
      onClose?.();

    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        title: "Submission Error",
        description: "Failed to submit daily report",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return reportData.project_id && reportData.work_performed;
      case 2:
        return reportData.crew_members.length > 0;
      case 3:
        return true; // Optional step
      case 4:
        return true; // Optional step
      default:
        return true;
    }
  };

  if (showCamera) {
    return (
      <EnhancedMobileCamera
        onCapture={handlePhotoCapture}
        onCancel={() => setShowCamera(false)}
        enableGeolocation={true}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      {/* Header */}
      <Card className="rounded-2xl glass shadow-ios-1 border-blue-200/60 dark:border-blue-500/30 bg-blue-50/80 dark:bg-blue-950/20">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-blue-800">Daily Progress Report</CardTitle>
            </div>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-sm text-blue-700">
            Document daily progress, crew activity, and project status.
          </p>
        </CardHeader>
      </Card>

      {/* Progress Indicator */}
      <div className="flex justify-center">
        <div className="flex items-center space-x-2">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step < currentStep ? <CheckCircle2 className="h-4 w-4" /> : step}
              </div>
              {step < 5 && (
                <div
                  className={`w-6 h-1 ${
                    step < currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Basic Information */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Report Date</Label>
                <Input
                  type="date"
                  value={reportData.report_date}
                  onChange={(e) => setReportData(prev => ({ ...prev, report_date: e.target.value }))}
                />
              </div>

              {!projectId && (
                <div>
                  <Label>Project *</Label>
                  <Select value={reportData.project_id} onValueChange={(value) => 
                    setReportData(prev => ({ ...prev, project_id: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project..." />
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
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Weather Conditions</Label>
                  <Select value={reportData.weather_conditions} onValueChange={(value) => 
                    setReportData(prev => ({ ...prev, weather_conditions: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select weather..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clear">Clear/Sunny</SelectItem>
                      <SelectItem value="partly_cloudy">Partly Cloudy</SelectItem>
                      <SelectItem value="cloudy">Cloudy</SelectItem>
                      <SelectItem value="rain">Rain</SelectItem>
                      <SelectItem value="heavy_rain">Heavy Rain</SelectItem>
                      <SelectItem value="snow">Snow</SelectItem>
                      <SelectItem value="wind">Windy</SelectItem>
                      <SelectItem value="fog">Fog</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Temperature (°F)</Label>
                  <Input
                    type="number"
                    value={reportData.temperature}
                    onChange={(e) => setReportData(prev => ({ ...prev, temperature: e.target.value }))}
                    placeholder="Temperature"
                  />
                </div>
              </div>

              <div>
                <Label>Work Performed Today *</Label>
                <Textarea
                  value={reportData.work_performed}
                  onChange={(e) => setReportData(prev => ({ ...prev, work_performed: e.target.value }))}
                  placeholder="Describe the work completed today..."
                  rows={4}
                />
              </div>

              <div>
                <Label>Overall Progress (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={reportData.work_completion_percentage}
                  onChange={(e) => setReportData(prev => ({ 
                    ...prev, 
                    work_completion_percentage: parseInt(e.target.value) || 0 
                  }))}
                  placeholder="Completion percentage"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Crew Information */}
      {currentStep === 2 && (
        <CrewStep
          newCrewMember={newCrewMember}
          setNewCrewMember={setNewCrewMember}
          addCrewMember={addCrewMember}
          removeCrewMember={removeCrewMember}
          reportData={reportData}
        />
      )}

      {/* Step 3: Task Progress */}
      {currentStep === 3 && (
        <TaskProgressStep
          newTask={newTask}
          setNewTask={setNewTask}
          addTask={addTask}
          removeTask={removeTask}
          reportData={reportData}
        />
      )}

      {/* Step 4: Materials & Equipment */}
      {currentStep === 4 && (
        <MaterialsEquipmentStep
          newMaterial={newMaterial}
          setNewMaterial={setNewMaterial}
          addMaterial={addMaterial}
          removeMaterial={removeMaterial}
          newEquipment={newEquipment}
          setNewEquipment={setNewEquipment}
          addEquipment={addEquipment}
          removeEquipment={removeEquipment}
          reportData={reportData}
        />
      )}

      {/* Step 5: Notes & Photos */}
      {currentStep === 5 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Observations & Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Safety Observations</Label>
                <Textarea
                  value={reportData.safety_observations}
                  onChange={(e) => setReportData(prev => ({ ...prev, safety_observations: e.target.value }))}
                  placeholder="Any safety concerns or observations..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Quality Issues</Label>
                <Textarea
                  value={reportData.quality_issues}
                  onChange={(e) => setReportData(prev => ({ ...prev, quality_issues: e.target.value }))}
                  placeholder="Quality concerns or rework needed..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Delays & Challenges</Label>
                <Textarea
                  value={reportData.delays_challenges}
                  onChange={(e) => setReportData(prev => ({ ...prev, delays_challenges: e.target.value }))}
                  placeholder="Any delays, challenges, or issues encountered..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Tomorrow's Plan</Label>
                <Textarea
                  value={reportData.next_day_plan}
                  onChange={(e) => setReportData(prev => ({ ...prev, next_day_plan: e.target.value }))}
                  placeholder="Work planned for tomorrow..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label>Client Visitors</Label>
                  <Input
                    value={reportData.client_visitors}
                    onChange={(e) => setReportData(prev => ({ ...prev, client_visitors: e.target.value }))}
                    placeholder="Any client visits or inspections..."
                  />
                </div>
                <div>
                  <Label>Deliveries Received</Label>
                  <Input
                    value={reportData.deliveries_received}
                    onChange={(e) => setReportData(prev => ({ ...prev, deliveries_received: e.target.value }))}
                    placeholder="Materials or equipment delivered..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Progress Photos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCamera(true)}
                  className="h-24 flex flex-col items-center justify-center gap-2"
                >
                  <Camera className="h-6 w-6" />
                  <span className="text-xs">Take Photo</span>
                </Button>
                {reportData.photos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={`data:image/jpeg;base64,${photo}`}
                      alt={`Progress ${index + 1}`}
                      className="w-full h-24 object-cover rounded border"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1 h-6 w-6 p-0"
                      onClick={() => removePhoto(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between gap-4">
        {currentStep > 1 && (
          <Button
            variant="outline"
            onClick={() => setCurrentStep(prev => prev - 1)}
            disabled={isSubmitting}
          >
            Previous
          </Button>
        )}
        
        <div className="flex-1" />
        
        {currentStep < 5 ? (
          <Button
            onClick={() => setCurrentStep(prev => prev + 1)}
            disabled={!canProceedToNextStep()}
          >
            Next
          </Button>
        ) : (
          <Button
            onClick={submitReport}
            disabled={isSubmitting || !canProceedToNextStep()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <LoadingSpinner size="sm" tone="current" label={null} />
                Submitting...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Submit Daily Report
              </div>
            )}
          </Button>
        )}
      </div>

      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 right-4 bg-yellow-100 border border-yellow-300 text-yellow-800 px-3 py-2 rounded-lg text-sm text-center">
          📶 Offline - Report will be submitted when connection is restored
        </div>
      )}
    </div>
  );
};

export default MobileDailyReportManager;