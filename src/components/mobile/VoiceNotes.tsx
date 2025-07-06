import React, { useState, useEffect, useRef } from 'react';
import { Device } from '@capacitor/device';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  Square, 
  Upload, 
  Download,
  Trash2,
  MessageSquareText,
  Clock,
  Tag
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface VoiceNote {
  id: string;
  filename: string;
  filepath: string;
  title: string;
  description: string;
  tags: string[];
  projectId?: string;
  duration: number;
  timestamp: string;
  transcription?: string;
  uploaded: boolean;
  size: number;
}

interface VoiceNotesProps {
  projectId?: string;
  onVoiceNotesSaved?: (notes: VoiceNote[]) => void;
}

const VoiceNotes: React.FC<VoiceNotesProps> = ({
  projectId,
  onVoiceNotesSaved
}) => {
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentNote, setCurrentNote] = useState<VoiceNote | null>(null);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteDescription, setNoteDescription] = useState('');
  const [noteTags, setNoteTags] = useState('');
  const [selectedProject, setSelectedProject] = useState(projectId || '');
  const [projects, setProjects] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadProjects();
    loadStoredVoiceNotes();
    return cleanup;
  }, []);

  const cleanup = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const loadProjects = async () => {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (profile?.company_id) {
        const { data } = await supabase
          .from('projects')
          .select('id, name')
          .eq('company_id', profile.company_id)
          .order('name');
        
        setProjects(data || []);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadStoredVoiceNotes = async () => {
    try {
      const { files } = await Filesystem.readdir({
        path: 'voice-notes',
        directory: Directory.Data
      });

      const noteMetadata = await Promise.all(
        files
          .filter(file => file.name.endsWith('.meta'))
          .map(async (file) => {
            try {
              const { data } = await Filesystem.readFile({
                path: `voice-notes/${file.name}`,
                directory: Directory.Data,
                encoding: Encoding.UTF8
              });
              return JSON.parse(data as string);
            } catch {
              return null;
            }
          })
      );

      setVoiceNotes(noteMetadata.filter(Boolean));
    } catch (error) {
      console.log('No stored voice notes found');
    }
  };

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the stream, we just needed permission
      return true;
    } catch (error) {
      toast({
        title: "Microphone Permission Required",
        description: "Please allow microphone access to record voice notes",
        variant: "destructive"
      });
      return false;
    }
  };

  const startRecording = async () => {
    try {
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) return;

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

      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        await saveRecording(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000); // Collect data every second
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);

      // Start timing
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast({
        title: "Recording Started",
        description: "Voice note recording is active",
      });

    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Error",
        description: "Failed to start voice recording",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const saveRecording = async (audioBlob: Blob) => {
    try {
      // Create unique filename
      const timestamp = new Date().toISOString();
      const filename = `voice_note_${Date.now()}.webm`;
      const filepath = `voice-notes/${filename}`;

      // Ensure directory exists
      try {
        await Filesystem.mkdir({
          path: 'voice-notes',
          directory: Directory.Data,
          recursive: true
        });
      } catch {
        // Directory might already exist
      }

      // Convert blob to base64
      const base64Audio = await blobToBase64(audioBlob);

      // Save audio file
      await Filesystem.writeFile({
        path: filepath,
        data: base64Audio as string,
        directory: Directory.Data
      });

      // Create metadata
      const metadata: VoiceNote = {
        id: `voice_${Date.now()}`,
        filename,
        filepath,
        title: `Voice Note ${new Date().toLocaleString()}`,
        description: '',
        tags: [],
        projectId: selectedProject || undefined,
        duration: recordingTime,
        timestamp,
        uploaded: false,
        size: audioBlob.size
      };

      // Save metadata
      await Filesystem.writeFile({
        path: `${filepath}.meta`,
        data: JSON.stringify(metadata),
        directory: Directory.Data,
        encoding: Encoding.UTF8
      });

      setCurrentNote(metadata);
      setNoteTitle(metadata.title);
      setShowNoteDialog(true);

    } catch (error) {
      console.error('Error saving recording:', error);
      toast({
        title: "Save Error",
        description: "Failed to save voice recording",
        variant: "destructive"
      });
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove the data URL prefix
        const base64Data = base64String.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const saveNoteMetadata = async () => {
    if (!currentNote) return;

    try {
      const updatedNote: VoiceNote = {
        ...currentNote,
        title: noteTitle,
        description: noteDescription,
        tags: noteTags.split(',').map(tag => tag.trim()).filter(Boolean),
        projectId: selectedProject || undefined
      };

      // Update metadata file
      await Filesystem.writeFile({
        path: `${currentNote.filepath}.meta`,
        data: JSON.stringify(updatedNote),
        directory: Directory.Data,
        encoding: Encoding.UTF8
      });

      // Update state
      const updatedNotes = [...voiceNotes, updatedNote];
      setVoiceNotes(updatedNotes);

      // Reset form
      setCurrentNote(null);
      setNoteTitle('');
      setNoteDescription('');
      setNoteTags('');
      setShowNoteDialog(false);
      setRecordingTime(0);

      toast({
        title: "Voice Note Saved",
        description: "Voice note has been saved with metadata",
      });

      onVoiceNotesSaved?.(updatedNotes);

    } catch (error) {
      console.error('Error saving note metadata:', error);
      toast({
        title: "Save Error",
        description: "Failed to save voice note metadata",
        variant: "destructive"
      });
    }
  };

  const playVoiceNote = async (note: VoiceNote) => {
    try {
      if (isPlaying === note.id) {
        // Stop current playback
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        setIsPlaying(null);
        return;
      }

      // Stop any existing playback
      if (audioRef.current) {
        audioRef.current.pause();
      }

      // Read the audio file
      const { data } = await Filesystem.readFile({
        path: note.filepath,
        directory: Directory.Data
      });

      // Create audio element
      const audio = new Audio(`data:audio/webm;base64,${data}`);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(null);
        audioRef.current = null;
      };

      audio.onerror = () => {
        setIsPlaying(null);
        audioRef.current = null;
        toast({
          title: "Playback Error",
          description: "Failed to play voice note",
          variant: "destructive"
        });
      };

      audio.play();
      setIsPlaying(note.id);

    } catch (error) {
      console.error('Error playing voice note:', error);
      toast({
        title: "Playback Error",
        description: "Failed to play voice note",
        variant: "destructive"
      });
    }
  };

  const transcribeVoiceNote = async (note: VoiceNote) => {
    try {
      setIsTranscribing(true);

      // Read the audio file
      const { data } = await Filesystem.readFile({
        path: note.filepath,
        directory: Directory.Data
      });

      // Call transcription edge function
      const { data: transcriptionData, error } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: data }
      });

      if (error) throw error;

      // Update note with transcription
      const updatedNote = { ...note, transcription: transcriptionData.text };
      
      // Save updated metadata
      await Filesystem.writeFile({
        path: `${note.filepath}.meta`,
        data: JSON.stringify(updatedNote),
        directory: Directory.Data,
        encoding: Encoding.UTF8
      });

      // Update state
      setVoiceNotes(prev => prev.map(n => 
        n.id === note.id ? updatedNote : n
      ));

      toast({
        title: "Transcription Complete",
        description: "Voice note has been transcribed",
      });

    } catch (error) {
      console.error('Error transcribing voice note:', error);
      toast({
        title: "Transcription Error",
        description: "Failed to transcribe voice note",
        variant: "destructive"
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const uploadVoiceNote = async (note: VoiceNote) => {
    try {
      setIsUploading(true);

      // Read the audio file
      const { data } = await Filesystem.readFile({
        path: note.filepath,
        directory: Directory.Data
      });

      // Convert base64 to blob
      const audioBlob = new Blob([
        new Uint8Array(atob(data as string).split('').map(char => char.charCodeAt(0)))
      ], { type: 'audio/webm' });

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(`voice-notes/${note.filename}`, audioBlob, {
          contentType: 'audio/webm',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('project-documents')
        .getPublicUrl(`voice-notes/${note.filename}`);

      // Save to database
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          company_id: (await supabase.from('user_profiles').select('company_id').eq('id', user?.id).single()).data?.company_id,
          project_id: note.projectId,
          name: note.title,
          description: `${note.description}\nDuration: ${Math.floor(note.duration / 60)}:${(note.duration % 60).toString().padStart(2, '0')}\nTags: ${note.tags.join(', ')}\n${note.transcription ? `Transcription: ${note.transcription}` : ''}`,
          file_path: urlData.publicUrl,
          file_type: 'audio/webm',
          uploaded_by: user?.id,
          ai_classification: {
            type: 'voice_note',
            duration: note.duration,
            tags: note.tags,
            transcription: note.transcription,
            timestamp: note.timestamp
          }
        });

      if (dbError) throw dbError;

      // Update metadata to mark as uploaded
      const updatedNote = { ...note, uploaded: true };
      await Filesystem.writeFile({
        path: `${note.filepath}.meta`,
        data: JSON.stringify(updatedNote),
        directory: Directory.Data,
        encoding: Encoding.UTF8
      });

      // Update state
      setVoiceNotes(prev => prev.map(n => 
        n.id === note.id ? updatedNote : n
      ));

      toast({
        title: "Upload Successful",
        description: "Voice note has been uploaded to the project",
      });

    } catch (error) {
      console.error('Error uploading voice note:', error);
      toast({
        title: "Upload Error",
        description: "Failed to upload voice note",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const deleteVoiceNote = async (note: VoiceNote) => {
    try {
      // Delete audio file
      await Filesystem.deleteFile({
        path: note.filepath,
        directory: Directory.Data
      });

      // Delete metadata file
      await Filesystem.deleteFile({
        path: `${note.filepath}.meta`,
        directory: Directory.Data
      });

      // Update state
      const updatedNotes = voiceNotes.filter(n => n.id !== note.id);
      setVoiceNotes(updatedNotes);

      toast({
        title: "Voice Note Deleted",
        description: "Voice note has been removed",
      });

      onVoiceNotesSaved?.(updatedNotes);

    } catch (error) {
      console.error('Error deleting voice note:', error);
      toast({
        title: "Delete Error",
        description: "Failed to delete voice note",
        variant: "destructive"
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Recording Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-construction-orange" />
            Voice Notes & Field Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {!isRecording ? (
              <Button 
                onClick={startRecording} 
                className="bg-construction-orange hover:bg-construction-orange/90"
              >
                <Mic className="h-4 w-4 mr-2" />
                Start Recording
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button 
                  onClick={stopRecording} 
                  variant="destructive"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop Recording
                </Button>
                <div className="flex items-center gap-2 text-red-600">
                  <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                  <span className="font-mono">{formatDuration(recordingTime)}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Note Details Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Voice Note Details</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Duration */}
            {currentNote && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Duration: {formatDuration(currentNote.duration)}
              </div>
            )}

            {/* Project Selection */}
            <div>
              <Label htmlFor="project">Project</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project (optional)" />
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

            {/* Title */}
            <div>
              <Label htmlFor="title">Title</Label>
              <Input 
                id="title"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Give this voice note a title..."
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description"
                value={noteDescription}
                onChange={(e) => setNoteDescription(e.target.value)}
                placeholder="Add details about this voice note..."
                rows={3}
              />
            </div>

            {/* Tags */}
            <div>
              <Label htmlFor="tags">Tags</Label>
              <Input 
                id="tags"
                value={noteTags}
                onChange={(e) => setNoteTags(e.target.value)}
                placeholder="progress, issue, meeting, inspection (comma-separated)"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNoteDialog(false)}>
                Cancel
              </Button>
              <Button onClick={saveNoteMetadata} className="bg-construction-orange hover:bg-construction-orange/90">
                Save Voice Note
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Saved Voice Notes */}
      {voiceNotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Voice Notes ({voiceNotes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {voiceNotes.map((note) => (
                <div key={note.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{note.title}</h4>
                      {note.description && (
                        <p className="text-sm text-muted-foreground mt-1">{note.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => playVoiceNote(note)}
                      >
                        {isPlaying === note.id ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                      </Button>
                      {!note.uploaded && (
                        <Button 
                          size="sm" 
                          onClick={() => uploadVoiceNote(note)}
                          disabled={isUploading}
                          className="bg-construction-orange hover:bg-construction-orange/90"
                        >
                          <Upload className="h-3 w-3 mr-1" />
                          Upload
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => deleteVoiceNote(note)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(note.duration)}
                    </div>
                    <div>
                      {new Date(note.timestamp).toLocaleString()}
                    </div>
                    {note.uploaded && (
                      <Badge variant="default">Uploaded</Badge>
                    )}
                  </div>

                  {note.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {note.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {note.transcription && (
                    <div className="bg-muted p-3 rounded text-sm">
                      <strong>Transcription:</strong> {note.transcription}
                    </div>
                  )}

                  {!note.transcription && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => transcribeVoiceNote(note)}
                      disabled={isTranscribing}
                    >
                      <MessageSquareText className="h-3 w-3 mr-1" />
                      {isTranscribing ? 'Transcribing...' : 'Transcribe'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VoiceNotes;