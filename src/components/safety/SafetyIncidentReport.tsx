import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  MicOff
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { supabase } from '@/integrations/supabase/client';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';

interface SafetyIncidentData {
  incident_type: string;
  severity: string;
  description: string;
  location_description: string;
  injured_person_name?: string;
  injured_person_contact?: string;
  witness_names?: string;
  immediate_actions_taken: string;
  equipment_involved?: string;
  weather_conditions?: string;
  photos: string[];
  voice_notes: string[];
  gps_location: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
}

interface SafetyIncidentReportProps {
  projectId?: string;
  onIncidentReported?: (incident: any) => void;
}

const SafetyIncidentReport: React.FC<SafetyIncidentReportProps> = ({
  projectId,
  onIncidentReported
}) => {
  const [incidentData, setIncidentData] = useState<SafetyIncidentData>({
    incident_type: '',
    severity: '',
    description: '',
    location_description: '',
    immediate_actions_taken: '',
    photos: [],
    voice_notes: [],
    gps_location: { latitude: 0, longitude: 0, accuracy: 0 }
  });

  const [isRecording, setIsRecording] = useState(false);
  const [currentRecording, setCurrentRecording] = useState<MediaRecorder | null>(null);
  const [recordingField, setRecordingField] = useState<string | null>(null);
  const [location, setLocation] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState(projectId || '');

  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  const { isOnline, saveOfflineData } = useOfflineSync();

  useEffect(() => {
    getCurrentLocation();
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

  const getCurrentLocation = async () => {
    try {
      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });

      const locationData = {
        latitude: coordinates.coords.latitude,
        longitude: coordinates.coords.longitude,
        accuracy: coordinates.coords.accuracy || 0
      };

      setLocation(locationData);
      setIncidentData(prev => ({
        ...prev,
        gps_location: locationData
      }));
    } catch (error) {
      console.error('Error getting location:', error);
      toast({
        title: "Location Access",
        description: "Could not get current location. Incident will be saved without GPS data.",
        variant: "destructive"
      });
    }
  };

  const takePhoto = async () => {
    try {
      const image = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        width: 1920,
        height: 1080
      });

      if (image.base64String) {
        setIncidentData(prev => ({
          ...prev,
          photos: [...prev.photos, image.base64String!]
        }));

        toast({
          title: "Photo Added",
          description: "Evidence photo captured",
        });
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      toast({
        title: "Camera Error",
        description: "Failed to capture photo",
        variant: "destructive"
      });
    }
  };

  const startVoiceRecording = async (fieldName: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await processVoiceRecording(audioBlob, fieldName);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setCurrentRecording(mediaRecorder);
      setIsRecording(true);
      setRecordingField(fieldName);

      toast({
        title: "Recording Started",
        description: `Recording voice note for ${fieldName.replace('_', ' ')}`,
      });

    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Error",
        description: "Could not start voice recording",
        variant: "destructive"
      });
    }
  };

  const stopVoiceRecording = () => {
    if (currentRecording && isRecording) {
      currentRecording.stop();
      setIsRecording(false);
      setCurrentRecording(null);
    }
  };

  const processVoiceRecording = async (audioBlob: Blob, fieldName: string) => {
    try {
      // Convert blob to base64
      const base64Audio = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          resolve(base64String.split(',')[1]);
        };
        reader.readAsDataURL(audioBlob);
      });

      // Transcribe using voice-to-text edge function
      const { data: transcriptionData, error } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: base64Audio }
      });

      if (error) throw error;

      if (transcriptionData.success && transcriptionData.text) {
        // Append transcribed text to the appropriate field
        setIncidentData(prev => ({
          ...prev,
          [fieldName]: prev[fieldName as keyof typeof prev] + 
            (prev[fieldName as keyof typeof prev] ? ' ' : '') + 
            transcriptionData.text
        }));

        toast({
          title: "Voice Note Transcribed",
          description: "Voice recording converted to text",
        });
      }

    } catch (error) {
      console.error('Error processing voice recording:', error);
      toast({
        title: "Transcription Error",
        description: "Could not transcribe voice recording",
        variant: "destructive"
      });
    }
    
    setRecordingField(null);
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
        project_id: selectedProject,
        incident_type: incidentData.incident_type,
        severity: incidentData.severity,
        description: incidentData.description,
        location_description: incidentData.location_description,
        immediate_actions: incidentData.immediate_actions_taken,
        incident_date: new Date().toISOString().split('T')[0],
        incident_time: new Date().toTimeString().split(' ')[0],
        reported_by: user?.id,
        status: 'reported',
        gps_latitude: location?.latitude,
        gps_longitude: location?.longitude,
        company_id: userProfile?.company_id,
        injured_person_name: incidentData.injured_person_name,
        injured_person_contact: incidentData.injured_person_contact,
        witnesses: incidentData.witness_names ? [incidentData.witness_names] : [],
        equipment_involved: incidentData.equipment_involved,
        weather_conditions: incidentData.weather_conditions
      };

      if (isOnline) {
        // Save to database and send notifications
        const { data, error } = await supabase
          .from('safety_incidents')
          .insert(incidentPayload)
          .select()
          .single();

        if (error) throw error;

        // Send immediate notifications
        await supabase.functions.invoke('send-safety-notification', {
          body: {
            incident: data,
            urgency: incidentData.severity
          }
        });

        toast({
          title: "Incident Reported",
          description: "Safety incident has been reported and supervisors notified",
        });

        onIncidentReported?.(data);
      } else {
        // Save offline for later sync
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
        immediate_actions_taken: '',
        photos: [],
        voice_notes: [],
        gps_location: location || { latitude: 0, longitude: 0, accuracy: 0 }
      });

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
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-5 w-5" />
            Safety Incident Report
          </CardTitle>
          <p className="text-sm text-red-700">
            Report safety incidents immediately. Supervisors will be notified automatically.
          </p>
        </CardHeader>
      </Card>

      {/* Project Selection */}
      {!projectId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Project Information</CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="project">Project *</Label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger>
                <SelectValue placeholder="Select project..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name} - {project.client_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Incident Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Incident Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="incident_type">Incident Type *</Label>
              <Select value={incidentData.incident_type} onValueChange={(value) => 
                setIncidentData(prev => ({ ...prev, incident_type: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
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
              <Label htmlFor="severity">Severity *</Label>
              <Select value={incidentData.severity} onValueChange={(value) => 
                setIncidentData(prev => ({ ...prev, severity: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select severity..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical - Life Threatening</SelectItem>
                  <SelectItem value="high">High - Serious Injury</SelectItem>
                  <SelectItem value="medium">Medium - Minor Injury</SelectItem>
                  <SelectItem value="low">Low - No Injury</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <div className="flex gap-2">
              <Textarea
                value={incidentData.description}
                onChange={(e) => setIncidentData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what happened in detail..."
                className="flex-1"
                rows={3}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => startVoiceRecording('description')}
                disabled={isRecording}
                className="shrink-0"
              >
                {isRecording && recordingField === 'description' ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="location_description">Location Description</Label>
            <div className="flex gap-2">
              <Input
                value={incidentData.location_description}
                onChange={(e) => setIncidentData(prev => ({ ...prev, location_description: e.target.value }))}
                placeholder="Specific location where incident occurred..."
                className="flex-1"
              />
              {location && (
                <Badge variant="outline" className="flex items-center gap-1 shrink-0">
                  <MapPin className="h-3 w-3" />
                  GPS
                </Badge>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="immediate_actions">Immediate Actions Taken *</Label>
            <div className="flex gap-2">
              <Textarea
                value={incidentData.immediate_actions_taken}
                onChange={(e) => setIncidentData(prev => ({ ...prev, immediate_actions_taken: e.target.value }))}
                placeholder="What was done immediately after the incident..."
                className="flex-1"
                rows={2}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => startVoiceRecording('immediate_actions_taken')}
                disabled={isRecording}
                className="shrink-0"
              >
                {isRecording && recordingField === 'immediate_actions_taken' ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Injury Information */}
      {(incidentData.incident_type === 'injury') && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Injured Person Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="injured_person_name">Injured Person Name</Label>
                <Input
                  value={incidentData.injured_person_name || ''}
                  onChange={(e) => setIncidentData(prev => ({ ...prev, injured_person_name: e.target.value }))}
                  placeholder="Full name of injured person"
                />
              </div>
              <div>
                <Label htmlFor="injured_person_contact">Contact Information</Label>
                <Input
                  value={incidentData.injured_person_contact || ''}
                  onChange={(e) => setIncidentData(prev => ({ ...prev, injured_person_contact: e.target.value }))}
                  placeholder="Phone number or emergency contact"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="witness_names">Witness Names</Label>
              <Input
                value={incidentData.witness_names || ''}
                onChange={(e) => setIncidentData(prev => ({ ...prev, witness_names: e.target.value }))}
                placeholder="Names of witnesses, separated by commas"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="equipment_involved">Equipment Involved</Label>
            <Input
              value={incidentData.equipment_involved || ''}
              onChange={(e) => setIncidentData(prev => ({ ...prev, equipment_involved: e.target.value }))}
              placeholder="Equipment, tools, or vehicles involved"
            />
          </div>

          <div>
            <Label htmlFor="weather_conditions">Weather Conditions</Label>
            <Input
              value={incidentData.weather_conditions || ''}
              onChange={(e) => setIncidentData(prev => ({ ...prev, weather_conditions: e.target.value }))}
              placeholder="Weather conditions at time of incident"
            />
          </div>
        </CardContent>
      </Card>

      {/* Evidence */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            Evidence ({incidentData.photos.length} photos)
            <Button
              variant="outline"
              size="sm"
              onClick={takePhoto}
              className="flex items-center gap-2"
            >
              <Camera className="h-4 w-4" />
              Take Photo
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {incidentData.photos.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {incidentData.photos.map((photo, index) => (
                <div key={index} className="relative">
                  <img
                    src={`data:image/jpeg;base64,${photo}`}
                    alt={`Evidence ${index + 1}`}
                    className="w-full h-24 object-cover rounded"
                  />
                  <Badge variant="secondary" className="absolute top-1 right-1 text-xs">
                    {index + 1}
                  </Badge>
                </div>
              ))}
            </div>
          )}
          {incidentData.photos.length === 0 && (
            <p className="text-muted-foreground text-center py-4">
              No evidence photos taken yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recording Status */}
      {isRecording && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium">
                  Recording for {recordingField?.replace('_', ' ')}...
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={stopVoiceRecording}
              >
                Stop Recording
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Severity Indicator */}
      {incidentData.severity && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Badge variant={getSeverityColor(incidentData.severity)}>
                {incidentData.severity.toUpperCase()} SEVERITY
              </Badge>
              <span className="text-sm text-yellow-800">
                {incidentData.severity === 'critical' && "Emergency response protocols activated"}
                {incidentData.severity === 'high' && "Immediate supervisor notification required"}
                {incidentData.severity === 'medium' && "Standard reporting procedures"}
                {incidentData.severity === 'low' && "Documentation for records"}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      <Button
        onClick={submitIncident}
        disabled={isSubmitting || isRecording || !incidentData.incident_type || !incidentData.severity}
        className="w-full"
        size="lg"
        variant={incidentData.severity === 'critical' ? 'destructive' : 'default'}
      >
        {isSubmitting ? (
          <>
            <Send className="mr-2 h-4 w-4 animate-spin" />
            Reporting Incident...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Report Safety Incident
          </>
        )}
      </Button>
    </div>
  );
};

export default SafetyIncidentReport;