import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  Camera, 
  MapPin, 
  Clock,
  Send,
  User,
  Phone,
  FileText,
  Mic,
  MicOff,
  Shield,
  AlertCircle,
  CheckCircle2,
  X,
  Plus,
  Users
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useGeolocation } from '@/hooks/useGeolocation';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedMobileCamera } from './EnhancedMobileCamera';

interface SafetyIncidentData {
  incident_type: string;
  severity: string;
  description: string;
  location_description: string;
  injured_person_name?: string;
  injured_person_job_title?: string;
  injured_person_contact?: string;
  body_part_affected?: string;
  witness_names: string[];
  immediate_actions_taken: string;
  equipment_involved?: string;
  weather_conditions?: string;
  medical_attention_required: boolean;
  lost_time: boolean;
  days_away_from_work: number;
  osha_recordable: boolean;
  photos: string[];
  voice_notes: string[];
  supervisor_notified: boolean;
  emergency_services_called: boolean;
}

interface MobileSafetyIncidentManagerProps {
  projectId?: string;
  onIncidentReported?: (incident: any) => void;
  onClose?: () => void;
}

const MobileSafetyIncidentManager: React.FC<MobileSafetyIncidentManagerProps> = ({
  projectId,
  onIncidentReported,
  onClose
}) => {
  const [incidentData, setIncidentData] = useState<SafetyIncidentData>({
    incident_type: '',
    severity: '',
    description: '',
    location_description: '',
    witness_names: [],
    immediate_actions_taken: '',
    medical_attention_required: false,
    lost_time: false,
    days_away_from_work: 0,
    osha_recordable: false,
    photos: [],
    voice_notes: [],
    supervisor_notified: false,
    emergency_services_called: false
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState(projectId || '');
  const [newWitness, setNewWitness] = useState('');
  const [showCamera, setShowCamera] = useState(false);

  const { toast } = useToast();
  const { user, userProfile, siteId } = useAuth();
  const { isOnline, saveOfflineData } = useOfflineSync();
  const { position, getCurrentPosition } = useGeolocation();
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    getCurrentPosition();
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      if (!userProfile?.company_id) return;

      const { data, error } = await supabase
        .from('projects')
        .select('id, name, client_name')
        .eq('company_id', userProfile.company_id)
        .eq('status', 'active');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const handlePhotoCapture = (file: File, metadata?: any) => {
    // Convert file to base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const base64Data = base64.split(',')[1]; // Remove data:image/... prefix
      setIncidentData(prev => ({
        ...prev,
        photos: [...prev.photos, base64Data]
      }));
    };
    reader.readAsDataURL(file);
    
    setShowCamera(false);
    toast({
      title: "Photo Added",
      description: "Evidence photo captured successfully",
    });
  };

  const handleVoiceRecording = async (fieldName: keyof SafetyIncidentData) => {
    toast({
      title: "Voice Recording",
      description: "Voice recording feature coming soon",
    });
  };

  const addWitness = () => {
    if (newWitness.trim()) {
      setIncidentData(prev => ({
        ...prev,
        witness_names: [...prev.witness_names, newWitness.trim()]
      }));
      setNewWitness('');
    }
  };

  const removeWitness = (index: number) => {
    setIncidentData(prev => ({
      ...prev,
      witness_names: prev.witness_names.filter((_, i) => i !== index)
    }));
  };

  const removePhoto = (index: number) => {
    setIncidentData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const submitIncident = async () => {
    if (!incidentData.incident_type || !incidentData.severity || !incidentData.description) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const incidentPayload = {
        project_id: selectedProject || null,
        incident_type: incidentData.incident_type,
        severity: incidentData.severity,
        description: incidentData.description,
        location: incidentData.location_description,
        immediate_actions: incidentData.immediate_actions_taken,
        incident_date: new Date().toISOString().split('T')[0],
        incident_time: new Date().toTimeString().split(' ')[0],
        reported_by: user?.id,
        company_id: userProfile?.company_id,
        site_id: siteId,
        injured_person_name: incidentData.injured_person_name || null,
        injured_person_job_title: incidentData.injured_person_job_title || null,
        body_part_affected: incidentData.body_part_affected || null,
        medical_attention_required: incidentData.medical_attention_required,
        lost_time: incidentData.lost_time,
        days_away_from_work: incidentData.days_away_from_work,
        osha_recordable: incidentData.osha_recordable,
        witnesses: incidentData.witness_names,
        equipment_involved: incidentData.equipment_involved || null,
        weather_conditions: incidentData.weather_conditions || null,
        gps_latitude: position?.coords?.latitude || null,
        gps_longitude: position?.coords?.longitude || null,
        status: 'reported',
        created_by: user?.id
      };

      if (isOnline) {
        const { data, error } = await supabase
          .from('safety_incidents')
          .insert(incidentPayload)
          .select()
          .single();

        if (error) throw error;

        // Send immediate notifications for critical incidents
        if (incidentData.severity === 'critical' || incidentData.severity === 'severe') {
          await supabase.functions.invoke('send-safety-notification', {
            body: {
              incident: data,
              urgency: incidentData.severity,
              emergency_services: incidentData.emergency_services_called
            }
          });
        }

        toast({
          title: "Incident Reported",
          description: "Safety incident has been reported and supervisors notified",
        });

        onIncidentReported?.(data);
      } else {
        await saveOfflineData('safety_incident', incidentPayload);
        
        toast({
          title: "Incident Saved Offline",
          description: "Incident will be reported when connection is restored",
        });
      }

      // Reset form
      setIncidentData({
        incident_type: '',
        severity: '',
        description: '',
        location_description: '',
        witness_names: [],
        immediate_actions_taken: '',
        medical_attention_required: false,
        lost_time: false,
        days_away_from_work: 0,
        osha_recordable: false,
        photos: [],
        voice_notes: [],
        supervisor_notified: false,
        emergency_services_called: false
      });
      
      setCurrentStep(1);
      onClose?.();

    } catch (error) {
      console.error('Error submitting incident:', error);
      toast({
        title: "Submission Error",
        description: "Failed to submit safety incident",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'severe': return 'bg-red-100 text-red-800 border-red-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'minor': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return incidentData.incident_type && incidentData.severity;
      case 2:
        return incidentData.description && incidentData.immediate_actions_taken;
      case 3:
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
      <Card className="border-red-200 bg-red-50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-800">Safety Incident Report</CardTitle>
            </div>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-sm text-red-700">
            Report safety incidents immediately for proper documentation and response.
          </p>
        </CardHeader>
      </Card>

      {/* Progress Indicator */}
      <div className="flex justify-center">
        <div className="flex items-center space-x-2">
          {[1, 2, 3, 4].map((step) => (
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
              {step < 4 && (
                <div
                  className={`w-8 h-1 ${
                    step < currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Incident Type & Severity */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Incident Classification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!projectId && (
              <div>
                <Label>Project *</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
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

            <div>
              <Label>Incident Type *</Label>
              <Select value={incidentData.incident_type} onValueChange={(value) => 
                setIncidentData(prev => ({ ...prev, incident_type: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select incident type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="injury">Personal Injury</SelectItem>
                  <SelectItem value="near_miss">Near Miss</SelectItem>
                  <SelectItem value="property_damage">Property Damage</SelectItem>
                  <SelectItem value="equipment_failure">Equipment Failure</SelectItem>
                  <SelectItem value="environmental">Environmental</SelectItem>
                  <SelectItem value="security">Security Issue</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Severity Level *</Label>
              <Select value={incidentData.severity} onValueChange={(value) => 
                setIncidentData(prev => ({ ...prev, severity: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select severity..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical - Life Threatening</SelectItem>
                  <SelectItem value="severe">Severe - Serious Injury</SelectItem>
                  <SelectItem value="moderate">Moderate - Minor Injury</SelectItem>
                  <SelectItem value="minor">Minor - No Injury</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {incidentData.severity && (
              <Badge className={getSeverityColor(incidentData.severity)}>
                {incidentData.severity.toUpperCase()} INCIDENT
              </Badge>
            )}

            {(incidentData.severity === 'critical' || incidentData.severity === 'severe') && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="emergency_services"
                    checked={incidentData.emergency_services_called}
                    onCheckedChange={(checked) => 
                      setIncidentData(prev => ({ ...prev, emergency_services_called: !!checked }))
                    }
                  />
                  <Label htmlFor="emergency_services" className="text-sm font-medium">
                    Emergency services called (911)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="supervisor_notified"
                    checked={incidentData.supervisor_notified}
                    onCheckedChange={(checked) => 
                      setIncidentData(prev => ({ ...prev, supervisor_notified: !!checked }))
                    }
                  />
                  <Label htmlFor="supervisor_notified" className="text-sm font-medium">
                    Supervisor notified immediately
                  </Label>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Description & Actions */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Incident Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>What Happened? *</Label>
              <div className="flex gap-2">
                <Textarea
                  value={incidentData.description}
                  onChange={(e) => setIncidentData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the incident in detail..."
                  className="flex-1"
                  rows={4}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleVoiceRecording('description')}
                  className="shrink-0"
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div>
              <Label>Location Description</Label>
              <div className="flex gap-2">
                <Input
                  value={incidentData.location_description}
                  onChange={(e) => setIncidentData(prev => ({ ...prev, location_description: e.target.value }))}
                  placeholder="Where did this happen?"
                  className="flex-1"
                />
                {position && (
                  <Badge variant="outline" className="flex items-center gap-1 shrink-0">
                    <MapPin className="h-3 w-3" />
                    GPS
                  </Badge>
                )}
              </div>
            </div>

            <div>
              <Label>Immediate Actions Taken *</Label>
              <div className="flex gap-2">
                <Textarea
                  value={incidentData.immediate_actions_taken}
                  onChange={(e) => setIncidentData(prev => ({ ...prev, immediate_actions_taken: e.target.value }))}
                  placeholder="What was done immediately after the incident?"
                  className="flex-1"
                  rows={3}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleVoiceRecording('immediate_actions_taken')}
                  className="shrink-0"
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Equipment Involved</Label>
                <Input
                  value={incidentData.equipment_involved || ''}
                  onChange={(e) => setIncidentData(prev => ({ ...prev, equipment_involved: e.target.value }))}
                  placeholder="Equipment or tools involved"
                />
              </div>
              <div>
                <Label>Weather Conditions</Label>
                <Input
                  value={incidentData.weather_conditions || ''}
                  onChange={(e) => setIncidentData(prev => ({ ...prev, weather_conditions: e.target.value }))}
                  placeholder="Weather at time of incident"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: People Involved */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              People Involved
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {incidentData.incident_type === 'injury' && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <h3 className="font-medium text-sm">Injury Details</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label>Injured Person Name</Label>
                    <Input
                      value={incidentData.injured_person_name || ''}
                      onChange={(e) => setIncidentData(prev => ({ ...prev, injured_person_name: e.target.value }))}
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <Label>Job Title</Label>
                    <Input
                      value={incidentData.injured_person_job_title || ''}
                      onChange={(e) => setIncidentData(prev => ({ ...prev, injured_person_job_title: e.target.value }))}
                      placeholder="Position/role"
                    />
                  </div>
                  <div>
                    <Label>Body Part Affected</Label>
                    <Input
                      value={incidentData.body_part_affected || ''}
                      onChange={(e) => setIncidentData(prev => ({ ...prev, body_part_affected: e.target.value }))}
                      placeholder="e.g., left hand, back, head"
                    />
                  </div>
                  <div>
                    <Label>Contact Information</Label>
                    <Input
                      value={incidentData.injured_person_contact || ''}
                      onChange={(e) => setIncidentData(prev => ({ ...prev, injured_person_contact: e.target.value }))}
                      placeholder="Phone number or emergency contact"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="medical_attention"
                      checked={incidentData.medical_attention_required}
                      onCheckedChange={(checked) => 
                        setIncidentData(prev => ({ ...prev, medical_attention_required: !!checked }))
                      }
                    />
                    <Label htmlFor="medical_attention" className="text-sm">
                      Medical attention required
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="lost_time"
                      checked={incidentData.lost_time}
                      onCheckedChange={(checked) => 
                        setIncidentData(prev => ({ ...prev, lost_time: !!checked }))
                      }
                    />
                    <Label htmlFor="lost_time" className="text-sm">
                      Lost time incident
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="osha_recordable"
                      checked={incidentData.osha_recordable}
                      onCheckedChange={(checked) => 
                        setIncidentData(prev => ({ ...prev, osha_recordable: !!checked }))
                      }
                    />
                    <Label htmlFor="osha_recordable" className="text-sm">
                      OSHA recordable incident
                    </Label>
                  </div>
                </div>

                {incidentData.lost_time && (
                  <div>
                    <Label>Days Away from Work</Label>
                    <Input
                      type="number"
                      min="0"
                      value={incidentData.days_away_from_work}
                      onChange={(e) => setIncidentData(prev => ({ 
                        ...prev, 
                        days_away_from_work: parseInt(e.target.value) || 0 
                      }))}
                      placeholder="Number of days"
                    />
                  </div>
                )}
              </div>
            )}

            <div>
              <Label>Witnesses</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newWitness}
                    onChange={(e) => setNewWitness(e.target.value)}
                    placeholder="Witness name"
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addWitness}
                    disabled={!newWitness.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {incidentData.witness_names.map((witness, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-sm">{witness}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeWitness(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Evidence & Review */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Evidence & Review
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Photos</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCamera(true)}
                  className="h-24 flex flex-col items-center justify-center gap-2"
                >
                  <Camera className="h-6 w-6" />
                  <span className="text-xs">Take Photo</span>
                </Button>
                {incidentData.photos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={`data:image/jpeg;base64,${photo}`}
                      alt={`Evidence ${index + 1}`}
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
            </div>

            <Separator />

            <div className="space-y-2">
              <h3 className="font-medium">Review Incident Details</h3>
              <div className="bg-muted p-3 rounded space-y-2 text-sm">
                <div><strong>Type:</strong> {incidentData.incident_type}</div>
                <div><strong>Severity:</strong> {incidentData.severity}</div>
                <div><strong>Description:</strong> {incidentData.description}</div>
                <div><strong>Location:</strong> {incidentData.location_description}</div>
                <div><strong>Actions Taken:</strong> {incidentData.immediate_actions_taken}</div>
                {incidentData.witness_names.length > 0 && (
                  <div><strong>Witnesses:</strong> {incidentData.witness_names.join(', ')}</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
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
        
        {currentStep < 4 ? (
          <Button
            onClick={() => setCurrentStep(prev => prev + 1)}
            disabled={!canProceedToNextStep()}
          >
            Next
          </Button>
        ) : (
          <Button
            onClick={submitIncident}
            disabled={isSubmitting || !canProceedToNextStep()}
            className="bg-red-600 hover:bg-red-700"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Submitting...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Submit Incident Report
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

export default MobileSafetyIncidentManager;