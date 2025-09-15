import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { advancedMobileService, VoiceCommand, PhotoAnalysis } from '@/services/AdvancedMobileService';
import { toast } from '@/hooks/use-toast';
import {
  Mic,
  MicOff,
  Camera,
  MapPin,
  Wifi,
  WifiOff,
  Upload,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Smartphone
} from 'lucide-react';

export interface MobileFieldInterfaceProps {
  projectId: string;
  className?: string;
}

export const MobileFieldInterface: React.FC<MobileFieldInterfaceProps> = ({
  projectId,
  className = ''
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [voiceCommands, setVoiceCommands] = useState<VoiceCommand[]>([]);
  const [photoAnalyses, setPhotoAnalyses] = useState<PhotoAnalysis[]>([]);
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');

  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setLocation(position),
        (error) => console.error('Geolocation error:', error)
      );
    }
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && syncStatus === 'idle') {
      handleSync();
    }
  }, [isOnline]);

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        await processVoiceCommand(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      audioRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);

      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (isRecording) {
          stopVoiceRecording();
        }
      }, 30000);

    } catch (error: any) {
      console.error('Error starting voice recording:', error);
      toast({
        title: "Microphone Error",
        description: "Unable to access microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopVoiceRecording = () => {
    if (audioRecorderRef.current && isRecording) {
      audioRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processVoiceCommand = async (audioBlob: Blob) => {
    try {
      setIsProcessing(true);
      const command = await advancedMobileService.processVoiceCommand(audioBlob, projectId);
      
      setVoiceCommands(prev => [command, ...prev.slice(0, 9)]); // Keep last 10 commands
      
      toast({
        title: "Voice Command Processed",
        description: `"${command.command}" executed successfully`,
      });

    } catch (error: any) {
      console.error('Error processing voice command:', error);
      toast({
        title: "Voice Command Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      const analysis = await advancedMobileService.analyzeConstructionPhoto(file, projectId);
      
      setPhotoAnalyses(prev => [analysis, ...prev.slice(0, 4)]); // Keep last 5 analyses
      
      toast({
        title: "Photo Analyzed",
        description: `Found ${analysis.analysis.defects.length} potential issues`,
      });

    } catch (error: any) {
      console.error('Error analyzing photo:', error);
      toast({
        title: "Photo Analysis Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncStatus('syncing');
      const result = await advancedMobileService.syncOfflineData();
      
      if (result.synced > 0) {
        toast({
          title: "Sync Complete",
          description: `${result.synced} items synced successfully`,
        });
      }
      
      setSyncStatus('idle');
    } catch (error: any) {
      console.error('Sync error:', error);
      setSyncStatus('error');
      toast({
        title: "Sync Error",
        description: "Some items could not be synced",
        variant: "destructive"
      });
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'destructive';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Smartphone className="h-5 w-5 mr-2" />
            <div>
              <CardTitle>Mobile Field Interface</CardTitle>
              <CardDescription>
                Voice commands, photo analysis, and offline sync
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Online/Offline Status */}
            <Badge variant={isOnline ? 'success' : 'destructive'}>
              {isOnline ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
            
            {/* Location Status */}
            {location && (
              <Badge variant="outline">
                <MapPin className="h-3 w-3 mr-1" />
                GPS
              </Badge>
            )}
            
            {/* Sync Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncStatus === 'syncing' || !isOnline}
            >
              <Upload className={`h-4 w-4 mr-2 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              {syncStatus === 'syncing' ? 'Syncing...' : 'Sync'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="voice" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="voice" className="flex items-center">
              <Mic className="h-4 w-4 mr-2" />
              Voice Commands
            </TabsTrigger>
            <TabsTrigger value="photo" className="flex items-center">
              <Camera className="h-4 w-4 mr-2" />
              Photo Analysis
            </TabsTrigger>
          </TabsList>

          {/* Voice Commands Tab */}
          <TabsContent value="voice" className="space-y-4">
            {/* Voice Recording Controls */}
            <div className="flex items-center justify-center space-x-4 p-6 border-2 border-dashed rounded-lg">
              <Button
                size="lg"
                variant={isRecording ? 'destructive' : 'default'}
                onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                disabled={isProcessing}
                className="h-16 w-16 rounded-full"
              >
                {isRecording ? (
                  <MicOff className="h-6 w-6" />
                ) : (
                  <Mic className="h-6 w-6" />
                )}
              </Button>
              <div className="text-center">
                <p className="font-medium">
                  {isRecording ? 'Recording...' : 'Tap to Record'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isRecording ? 'Tap again to stop' : 'Say commands like "Create task for electrical work"'}
                </p>
                {isProcessing && (
                  <div className="flex items-center justify-center mt-2">
                    <Zap className="h-4 w-4 mr-2 animate-pulse" />
                    <span className="text-sm">Processing command...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Voice Commands */}
            {voiceCommands.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold">Recent Commands</h4>
                {voiceCommands.map((command) => (
                  <Alert key={command.id}>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">"{command.command}"</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            Intent: {command.intent.replace('_', ' ')}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={getConfidenceColor(command.confidence)}>
                            {Math.round(command.confidence * 100)}%
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {new Date(command.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {/* Voice Command Examples */}
            <div className="space-y-2">
              <h4 className="font-semibold">Example Commands</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="p-2 bg-muted rounded">
                  "Create task for electrical inspection due tomorrow"
                </div>
                <div className="p-2 bg-muted rounded">
                  "Record 4 hours of work today"
                </div>
                <div className="p-2 bg-muted rounded">
                  "Add expense for materials $250"
                </div>
                <div className="p-2 bg-muted rounded">
                  "Mark plumbing task as completed"
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Photo Analysis Tab */}
          <TabsContent value="photo" className="space-y-4">
            {/* Photo Upload */}
            <div className="flex items-center justify-center p-6 border-2 border-dashed rounded-lg">
              <div className="text-center">
                <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {isProcessing ? 'Analyzing...' : 'Take Photo'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  AI will analyze for defects, progress, and safety issues
                </p>
              </div>
            </div>

            {/* Recent Photo Analyses */}
            {photoAnalyses.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-semibold">Recent Analyses</h4>
                {photoAnalyses.map((analysis) => (
                  <Card key={analysis.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-4">
                        <img
                          src={analysis.imageUrl}
                          alt="Construction photo"
                          className="w-24 h-24 object-cover rounded"
                        />
                        <div className="flex-1 space-y-2">
                          {/* Defects */}
                          {analysis.analysis.defects.length > 0 && (
                            <div>
                              <h5 className="font-medium text-sm mb-1">Defects Detected</h5>
                              {analysis.analysis.defects.map((defect, index) => (
                                <Badge
                                  key={index}
                                  variant={getSeverityColor(defect.severity)}
                                  className="mr-1 mb-1"
                                >
                                  {defect.type} ({Math.round(defect.confidence * 100)}%)
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Progress */}
                          <div>
                            <h5 className="font-medium text-sm mb-1">Progress Analysis</h5>
                            <div className="flex items-center space-x-2">
                              <Progress value={analysis.analysis.progress.completionPercentage} className="flex-1" />
                              <span className="text-sm font-medium">
                                {analysis.analysis.progress.completionPercentage}%
                              </span>
                            </div>
                          </div>

                          {/* Safety */}
                          {analysis.analysis.safety.violations.length > 0 && (
                            <div>
                              <h5 className="font-medium text-sm mb-1">Safety Issues</h5>
                              <div className="flex items-center space-x-2">
                                <AlertTriangle className="h-4 w-4 text-orange-500" />
                                <span className="text-sm">
                                  {analysis.analysis.safety.violations.join(', ')}
                                </span>
                              </div>
                            </div>
                          )}

                          <p className="text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {new Date(analysis.processedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MobileFieldInterface;
