import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Mic,
  MicOff,
  Camera,
  MapPin,
  Clock,
  Save,
  Upload,
  Wifi,
  WifiOff,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { supabase } from '@/integrations/supabase/client';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { useGeofencing } from '@/hooks/useGeofencing';
import { LocationStatusIndicator } from './LocationStatusIndicator';

interface DailyReportData {
  project_id: string;
  weather_conditions: string;
  temperature?: number;
  work_performed: string;
  issues_encountered: string;
  safety_notes: string;
  crew_count: number;
  visitor_count: number;
  photos: string[];
  voice_notes: string[];
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
}

interface MobileDailyReportProps {
  projectId?: string;
  companyId?: string;
  userId?: string;
  onReportSaved?: (report: any) => void;
}

const MobileDailyReport: React.FC<MobileDailyReportProps> = ({
  projectId,
  onReportSaved
}) => {
  const [reportData, setReportData] = useState<DailyReportData>({
    project_id: projectId,
    weather_conditions: '',
    work_performed: '',
    issues_encountered: '',
    safety_notes: '',
    crew_count: 1,
    visitor_count: 0,
    photos: [],
    voice_notes: [],
    location: { latitude: 0, longitude: 0, accuracy: 0 }
  });

  const [isRecording, setIsRecording] = useState(false);
  const [currentRecording, setCurrentRecording] = useState<MediaRecorder | null>(null);
  const [recordingField, setRecordingField] = useState<string | null>(null);
  const [location, setLocation] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { toast } = useToast();
  const { user, userProfile, siteId } = useAuth();
  const { isOnline, saveOfflineData } = useOfflineSync();

  // Enhanced geofencing
  const {
    currentLocation: browserLocation,
    isTracking: isGpsTracking,
    permissionStatus,
    addGeofence,
    isInsideGeofence,
    getDistanceFromGeofence,
    startTracking: startGpsTracking
  } = useGeofencing({ autoStart: false });

  const [project, setProject] = useState<any>(null);
  const [isInGeofence, setIsInGeofence] = useState<boolean | null>(null);

  useEffect(() => {
    getCurrentLocation();
    loadProjectData();
  }, []);

  // Start GPS tracking when component mounts
  useEffect(() => {
    startGpsTracking();
  }, []);

  // Add geofence for project if available
  useEffect(() => {
    if (project && project.site_latitude && project.site_longitude) {
      addGeofence({
        id: project.id,
        name: project.name,
        centerLatitude: project.site_latitude,
        centerLongitude: project.site_longitude,
        radiusMeters: project.geofence_radius_meters || 100,
        type: 'project'
      });
    }
  }, [project]);

  // Update geofence status
  useEffect(() => {
    if (projectId && browserLocation) {
      const isInside = isInsideGeofence(projectId);
      setIsInGeofence(isInside);
    }
  }, [browserLocation, projectId]);

  const loadProjectData = async () => {
    if (!projectId) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, site_latitude, site_longitude, geofence_radius_meters')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (error) {
      console.error('Error loading project:', error);
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
      setReportData(prev => ({
        ...prev,
        location: locationData
      }));
    } catch (error) {
      console.error('Error getting location:', error);
      toast({
        title: "Location Access",
        description: "Could not get current location. Report will be saved without GPS data.",
        variant: "destructive"
      });
    }
  };

  const takePhoto = async () => {
    try {
      const image = await CapacitorCamera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        width: 1920,
        height: 1080
      });

      if (image.base64String) {
        setReportData(prev => ({
          ...prev,
          photos: [...prev.photos, image.base64String!]
        }));

        toast({
          title: "Photo Added",
          description: "Photo captured and added to daily report",
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
        setReportData(prev => ({
          ...prev,
          [fieldName]: prev[fieldName as keyof typeof prev] + 
            (prev[fieldName as keyof typeof prev] ? ' ' : '') + 
            transcriptionData.text
        }));

        toast({
          title: "Voice Note Transcribed",
          description: "Voice recording has been converted to text and added to the report",
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

  const saveReport = async () => {
    try {
      setIsSaving(true);

      // Use browser location if available, otherwise fall back to Capacitor
      const currentLoc = browserLocation || location;
      const distance = projectId ? getDistanceFromGeofence(projectId) : null;

      const reportPayload = {
        ...reportData,
        user_id: user?.id,
        report_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        company_id: userProfile?.company_id,
        site_id: siteId,
        // Enhanced GPS verification
        gps_latitude: currentLoc?.latitude,
        gps_longitude: currentLoc?.longitude,
        gps_accuracy: currentLoc?.accuracy,
        is_geofence_verified: isInGeofence === true,
        geofence_distance_meters: distance,
        location: currentLoc || reportData.location
      };

      if (isOnline) {
        // Save directly to database
        const { data, error } = await supabase
          .from('daily_reports')
          .insert(reportPayload)
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Report Saved",
          description: "Daily report has been saved successfully",
        });

        onReportSaved?.(data);
      } else {
        // Save offline for later sync
        await saveOfflineData('daily_report', reportPayload);
        
        toast({
          title: "Report Saved Offline",
          description: "Report will be synced when connection is restored",
        });
      }

      // Reset form
      setReportData({
        project_id: projectId,
        weather_conditions: '',
        work_performed: '',
        issues_encountered: '',
        safety_notes: '',
        crew_count: 1,
        visitor_count: 0,
        photos: [],
        voice_notes: [],
        location: location || { latitude: 0, longitude: 0, accuracy: 0 }
      });

    } catch (error) {
      console.error('Error saving report:', error);
      toast({
        title: "Save Error",
        description: "Failed to save daily report",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between mb-4">
        <Badge variant={isOnline ? "default" : "destructive"} className="flex items-center gap-2">
          {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          {isOnline ? "Online" : "Offline"}
        </Badge>
      </div>

      {/* GPS and Geofence Status */}
      {project && (
        <LocationStatusIndicator
          location={browserLocation || location}
          isTracking={isGpsTracking}
          permissionStatus={permissionStatus}
          isInsideGeofence={isInGeofence ?? undefined}
          distanceFromGeofence={projectId ? getDistanceFromGeofence(projectId) : undefined}
          geofenceName={project.name}
          geofenceRadius={project.geofence_radius_meters || 100}
          showDetails={false}
        />
      )}

      {/* Weather & Crew Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Site Conditions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Weather Conditions</label>
            <div className="flex gap-2">
              <Textarea
                value={reportData.weather_conditions}
                onChange={(e) => setReportData(prev => ({ ...prev, weather_conditions: e.target.value }))}
                placeholder="Describe weather conditions..."
                className="flex-1"
                rows={2}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => startVoiceRecording('weather_conditions')}
                disabled={isRecording}
                className="shrink-0"
              >
                {isRecording && recordingField === 'weather_conditions' ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Crew Count</label>
              <input
                type="number"
                value={reportData.crew_count}
                onChange={(e) => setReportData(prev => ({ ...prev, crew_count: parseInt(e.target.value) || 0 }))}
                className="w-full p-2 border rounded"
                min="0"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Visitors</label>
              <input
                type="number"
                value={reportData.visitor_count}
                onChange={(e) => setReportData(prev => ({ ...prev, visitor_count: parseInt(e.target.value) || 0 }))}
                className="w-full p-2 border rounded"
                min="0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work Performed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Work Performed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Textarea
              value={reportData.work_performed}
              onChange={(e) => setReportData(prev => ({ ...prev, work_performed: e.target.value }))}
              placeholder="Describe work completed today..."
              className="flex-1"
              rows={3}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => startVoiceRecording('work_performed')}
              disabled={isRecording}
              className="shrink-0"
            >
              {isRecording && recordingField === 'work_performed' ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Issues & Safety */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Issues & Safety</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Issues Encountered</label>
            <div className="flex gap-2">
              <Textarea
                value={reportData.issues_encountered}
                onChange={(e) => setReportData(prev => ({ ...prev, issues_encountered: e.target.value }))}
                placeholder="Any issues or delays..."
                className="flex-1"
                rows={2}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => startVoiceRecording('issues_encountered')}
                disabled={isRecording}
                className="shrink-0"
              >
                {isRecording && recordingField === 'issues_encountered' ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Safety Notes</label>
            <div className="flex gap-2">
              <Textarea
                value={reportData.safety_notes}
                onChange={(e) => setReportData(prev => ({ ...prev, safety_notes: e.target.value }))}
                placeholder="Safety observations and incidents..."
                className="flex-1"
                rows={2}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => startVoiceRecording('safety_notes')}
                disabled={isRecording}
                className="shrink-0"
              >
                {isRecording && recordingField === 'safety_notes' ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            Photos ({reportData.photos.length})
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
          {reportData.photos.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {reportData.photos.map((photo, index) => (
                <div key={index} className="relative">
                  <img
                    src={`data:image/jpeg;base64,${photo}`}
                    alt={`Site photo ${index + 1}`}
                    className="w-full h-24 object-cover rounded"
                  />
                  <Badge variant="secondary" className="absolute top-1 right-1 text-xs">
                    {index + 1}
                  </Badge>
                </div>
              ))}
            </div>
          )}
          {reportData.photos.length === 0 && (
            <p className="text-muted-foreground text-center py-4">
              No photos taken yet
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

      {/* Save Button */}
      <Button
        onClick={saveReport}
        disabled={isSaving || isRecording}
        className="w-full"
        size="lg"
      >
        {isSaving ? (
          <>
            <Upload className="mr-2 h-4 w-4 animate-spin" />
            Saving Report...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Save Daily Report
          </>
        )}
      </Button>
    </div>
  );
};

export default MobileDailyReport;