import React, { useState, useEffect } from 'react';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
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
import { Camera as CameraIcon, MapPin, Tag, Upload, X, Image } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PhotoMetadata {
  id: string;
  filename: string;
  filepath: string;
  description: string;
  tags: string[];
  projectId?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  timestamp: string;
  deviceInfo: string;
  uploaded: boolean;
}

interface EnhancedMobileCameraProps {
  projectId?: string;
  onPhotosCaptured?: (photos: PhotoMetadata[]) => void;
}

const EnhancedMobileCamera: React.FC<EnhancedMobileCameraProps> = ({
  projectId,
  onPhotosCaptured
}) => {
  const [photos, setPhotos] = useState<PhotoMetadata[]>([]);
  const [currentPhoto, setCurrentPhoto] = useState<Photo | null>(null);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState(projectId || '');
  const [projects, setProjects] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadProjects();
    loadStoredPhotos();
  }, []);

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

  const loadStoredPhotos = async () => {
    try {
      const { files } = await Filesystem.readdir({
        path: 'construction-photos',
        directory: Directory.Data
      });

      const photoMetadata = await Promise.all(
        files.map(async (file) => {
          try {
            const { data } = await Filesystem.readFile({
              path: `construction-photos/${file.name}.meta`,
              directory: Directory.Data,
              encoding: Encoding.UTF8
            });
            return JSON.parse(data as string);
          } catch {
            return null;
          }
        })
      );

      setPhotos(photoMetadata.filter(Boolean));
    } catch (error) {
      // Directory doesn't exist yet, that's okay
      console.log('No stored photos found');
    }
  };

  const requestCameraPermissions = async () => {
    try {
      const permissions = await Camera.requestPermissions();
      return permissions.camera === 'granted';
    } catch (error) {
      toast({
        title: "Permission Error",
        description: "Camera permissions are required to take photos",
        variant: "destructive"
      });
      return false;
    }
  };

  const capturePhoto = async () => {
    try {
      const hasPermission = await requestCameraPermissions();
      if (!hasPermission) return;

      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        saveToGallery: true
      });

      setCurrentPhoto(photo);
      setShowPhotoDialog(true);
    } catch (error) {
      toast({
        title: "Camera Error",
        description: "Failed to capture photo",
        variant: "destructive"
      });
    }
  };

  const captureFromGallery = async () => {
    try {
      const hasPermission = await requestCameraPermissions();
      if (!hasPermission) return;

      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos
      });

      setCurrentPhoto(photo);
      setShowPhotoDialog(true);
    } catch (error) {
      toast({
        title: "Gallery Error",
        description: "Failed to select photo from gallery",
        variant: "destructive"
      });
    }
  };

  const savePhotoWithMetadata = async () => {
    if (!currentPhoto) return;

    try {
      // Get current location
      let location = null;
      try {
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000
        });
        location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
      } catch (locationError) {
        console.log('Location not available:', locationError);
      }

      // Get device info
      const deviceInfo = await Device.getInfo();
      
      // Create unique filename
      const timestamp = new Date().toISOString();
      const filename = `photo_${Date.now()}.jpg`;
      const filepath = `construction-photos/${filename}`;

      // Ensure directory exists
      try {
        await Filesystem.mkdir({
          path: 'construction-photos',
          directory: Directory.Data,
          recursive: true
        });
      } catch {
        // Directory might already exist
      }

      // Save photo
      await Filesystem.writeFile({
        path: filepath,
        data: currentPhoto.base64String as string,
        directory: Directory.Data
      });

      // Create metadata
      const metadata: PhotoMetadata = {
        id: `photo_${Date.now()}`,
        filename,
        filepath,
        description,
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
        projectId: selectedProject || undefined,
        latitude: location?.latitude,
        longitude: location?.longitude,
        accuracy: location?.accuracy,
        timestamp,
        deviceInfo: `${deviceInfo.platform} ${deviceInfo.osVersion}`,
        uploaded: false
      };

      // Save metadata
      await Filesystem.writeFile({
        path: `${filepath}.meta`,
        data: JSON.stringify(metadata),
        directory: Directory.Data,
        encoding: Encoding.UTF8
      });

      // Update state
      const updatedPhotos = [...photos, metadata];
      setPhotos(updatedPhotos);

      // Reset form
      setCurrentPhoto(null);
      setDescription('');
      setTags('');
      setShowPhotoDialog(false);

      toast({
        title: "Photo Saved",
        description: "Photo has been saved with metadata",
      });

      // Callback to parent
      onPhotosCaptured?.(updatedPhotos);

    } catch (error) {
      console.error('Error saving photo:', error);
      toast({
        title: "Save Error",
        description: "Failed to save photo",
        variant: "destructive"
      });
    }
  };

  const uploadPhoto = async (photoMetadata: PhotoMetadata) => {
    try {
      setIsUploading(true);

      // Read the photo file
      const { data } = await Filesystem.readFile({
        path: photoMetadata.filepath,
        directory: Directory.Data
      });

      // Convert base64 to blob
      const response = await fetch(`data:image/jpeg;base64,${data}`);
      const blob = await response.blob();

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(`photos/${photoMetadata.filename}`, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('project-documents')
        .getPublicUrl(`photos/${photoMetadata.filename}`);

      // Save to database
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          company_id: (await supabase.from('user_profiles').select('company_id').eq('id', user?.id).single()).data?.company_id,
          project_id: photoMetadata.projectId,
          name: photoMetadata.description || photoMetadata.filename,
          description: `${photoMetadata.description}\nTags: ${photoMetadata.tags.join(', ')}\nLocation: ${photoMetadata.latitude ? `${photoMetadata.latitude}, ${photoMetadata.longitude}` : 'Not available'}`,
          file_path: urlData.publicUrl,
          file_type: 'image/jpeg',
          uploaded_by: user?.id,
          ai_classification: {
            tags: photoMetadata.tags,
            location: photoMetadata.latitude ? {
              latitude: photoMetadata.latitude,
              longitude: photoMetadata.longitude,
              accuracy: photoMetadata.accuracy
            } : null,
            timestamp: photoMetadata.timestamp,
            device: photoMetadata.deviceInfo
          }
        });

      if (dbError) throw dbError;

      // Update metadata to mark as uploaded
      const updatedMetadata = { ...photoMetadata, uploaded: true };
      await Filesystem.writeFile({
        path: `${photoMetadata.filepath}.meta`,
        data: JSON.stringify(updatedMetadata),
        directory: Directory.Data,
        encoding: Encoding.UTF8
      });

      // Update state
      setPhotos(prev => prev.map(p => 
        p.id === photoMetadata.id ? updatedMetadata : p
      ));

      toast({
        title: "Upload Successful",
        description: "Photo has been uploaded to the project",
      });

    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Upload Error",
        description: "Failed to upload photo",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const deletePhoto = async (photoMetadata: PhotoMetadata) => {
    try {
      // Delete photo file
      await Filesystem.deleteFile({
        path: photoMetadata.filepath,
        directory: Directory.Data
      });

      // Delete metadata file
      await Filesystem.deleteFile({
        path: `${photoMetadata.filepath}.meta`,
        directory: Directory.Data
      });

      // Update state
      const updatedPhotos = photos.filter(p => p.id !== photoMetadata.id);
      setPhotos(updatedPhotos);

      toast({
        title: "Photo Deleted",
        description: "Photo has been removed",
      });

      onPhotosCaptured?.(updatedPhotos);

    } catch (error) {
      console.error('Error deleting photo:', error);
      toast({
        title: "Delete Error",
        description: "Failed to delete photo",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Camera Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CameraIcon className="h-5 w-5 text-construction-orange" />
            Photo Capture & Documentation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={capturePhoto} className="bg-construction-orange hover:bg-construction-orange/90">
              <CameraIcon className="h-4 w-4 mr-2" />
              Take Photo
            </Button>
            <Button variant="outline" onClick={captureFromGallery}>
              <Image className="h-4 w-4 mr-2" />
              From Gallery
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Photo Dialog */}
      <Dialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Photo Details</DialogTitle>
          </DialogHeader>
          
          {currentPhoto && (
            <div className="space-y-4">
              {/* Photo Preview */}
              <div className="relative">
                <img 
                  src={`data:image/jpeg;base64,${currentPhoto.base64String}`}
                  alt="Captured"
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>

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

              {/* Description */}
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this photo shows..."
                  rows={3}
                />
              </div>

              {/* Tags */}
              <div>
                <Label htmlFor="tags">Tags</Label>
                <Input 
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="foundation, plumbing, electrical, safety (comma-separated)"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Add tags to categorize this photo for easy searching
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowPhotoDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={savePhotoWithMetadata} className="bg-construction-orange hover:bg-construction-orange/90">
                  Save Photo
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Saved Photos */}
      {photos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Captured Photos ({photos.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium truncate">
                      {photo.description || photo.filename}
                    </h4>
                    <div className="flex items-center gap-2">
                      {photo.uploaded ? (
                        <Badge variant="default">Uploaded</Badge>
                      ) : (
                        <Button 
                          size="sm" 
                          onClick={() => uploadPhoto(photo)}
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
                        onClick={() => deletePhoto(photo)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {photo.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {photo.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {photo.latitude && photo.longitude && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      Location: {photo.latitude.toFixed(6)}, {photo.longitude.toFixed(6)}
                      {photo.accuracy && ` (±${Math.round(photo.accuracy)}m)`}
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground">
                    Captured: {new Date(photo.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedMobileCamera;