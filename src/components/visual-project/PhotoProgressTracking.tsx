import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Camera, Upload, Calendar, MapPin, Eye, Plus, Download, Filter, GitCompare } from 'lucide-react';
import { format } from 'date-fns';

interface ProgressPhoto {
  id: string;
  imageUrl: string;
  thumbnailUrl: string;
  capturedAt: Date;
  location: string;
  workArea: string;
  notes: string;
  capturedBy: string;
  tags: string[];
  beforePhotoId?: string;
  photoType: 'progress' | 'before' | 'after' | 'issue' | 'milestone';
}

interface PhotoProgressTrackingProps {
  projectId?: string;
}

export const PhotoProgressTracking: React.FC<PhotoProgressTrackingProps> = ({ projectId }) => {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([
    {
      id: '1',
      imageUrl: '/placeholder.svg',
      thumbnailUrl: '/placeholder.svg',
      capturedAt: new Date('2024-01-15'),
      location: 'Main Building - Foundation',
      workArea: 'Foundation',
      notes: 'Foundation excavation complete, ready for concrete pour',
      capturedBy: 'John Doe',
      tags: ['foundation', 'excavation', 'milestone'],
      photoType: 'milestone'
    },
    {
      id: '2',
      imageUrl: '/placeholder.svg',
      thumbnailUrl: '/placeholder.svg',
      capturedAt: new Date('2024-01-20'),
      location: 'Main Building - Foundation',
      workArea: 'Foundation',
      notes: 'Concrete pour in progress',
      capturedBy: 'Sarah Wilson',
      tags: ['foundation', 'concrete', 'progress'],
      beforePhotoId: '1',
      photoType: 'progress'
    },
    {
      id: '3',
      imageUrl: '/placeholder.svg',
      thumbnailUrl: '/placeholder.svg',
      capturedAt: new Date('2024-01-25'),
      location: 'Main Building - First Floor',
      workArea: 'Framing',
      notes: 'Framing started on first floor',
      capturedBy: 'Mike Smith',
      tags: ['framing', 'first-floor', 'progress'],
      photoType: 'progress'
    }
  ]);
  
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null);
  const [filterArea, setFilterArea] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [compareMode, setCompareMode] = useState(false);
  const [comparePhotos, setComparePhotos] = useState<ProgressPhoto[]>([]);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const workAreas = ['Foundation', 'Framing', 'Electrical', 'Plumbing', 'Roofing', 'Interior'];
  const photoTypes = ['progress', 'before', 'after', 'issue', 'milestone'];

  const filteredPhotos = photos.filter(photo => {
    const areaMatch = filterArea === 'all' || photo.workArea === filterArea;
    const typeMatch = filterType === 'all' || photo.photoType === filterType;
    return areaMatch && typeMatch;
  });

  const getPhotoTypeColor = (type: ProgressPhoto['photoType']) => {
    switch (type) {
      case 'milestone':
        return 'bg-success text-success-foreground';
      case 'progress':
        return 'bg-primary text-primary-foreground';
      case 'issue':
        return 'bg-destructive text-destructive-foreground';
      case 'before':
        return 'bg-secondary text-secondary-foreground';
      case 'after':
        return 'bg-accent text-accent-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      // In a real app, you'd upload to storage and create photo records
      setIsUploadDialogOpen(false);
    }
  };

  const handleCompareToggle = (photo: ProgressPhoto) => {
    if (compareMode) {
      if (comparePhotos.includes(photo)) {
        setComparePhotos(prev => prev.filter(p => p.id !== photo.id));
      } else if (comparePhotos.length < 2) {
        setComparePhotos(prev => [...prev, photo]);
      }
    } else {
      setSelectedPhoto(photo);
    }
  };

  const clearComparison = () => {
    setComparePhotos([]);
    setCompareMode(false);
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Photo Progress Tracking
              </CardTitle>
              <CardDescription>
                Track construction progress with photos and comparisons
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              {compareMode && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {comparePhotos.length}/2 selected for comparison
                  </Badge>
                  <Button variant="outline" size="sm" onClick={clearComparison}>
                    Clear
                  </Button>
                </div>
              )}
              
              <Button
                variant={compareMode ? "default" : "outline"}
                size="sm"
                onClick={() => setCompareMode(!compareMode)}
              >
                <GitCompare className="h-4 w-4 mr-2" />
                Compare
              </Button>
              
              <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Photos
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload Progress Photos</DialogTitle>
                    <DialogDescription>
                      Add new photos to track project progress
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="work-area">Work Area</Label>
                      <select id="work-area" className="w-full p-2 border rounded">
                        {workAreas.map(area => (
                          <option key={area} value={area}>{area}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <Label htmlFor="photo-type">Photo Type</Label>
                      <select id="photo-type" className="w-full p-2 border rounded">
                        {photoTypes.map(type => (
                          <option key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input id="location" placeholder="e.g., Main Building - First Floor" />
                    </div>
                    
                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea id="notes" placeholder="Describe what's shown in the photos..." />
                    </div>
                    
                    <div>
                      <Label htmlFor="files">Select Photos</Label>
                      <Input
                        ref={fileInputRef}
                        id="files"
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileUpload}
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-4 w-4 mr-2" />
                        Choose Files
                      </Button>
                      <Button variant="outline">
                        <Camera className="h-4 w-4 mr-2" />
                        Take Photo
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <Label>Work Area:</Label>
              <select 
                value={filterArea} 
                onChange={(e) => setFilterArea(e.target.value)}
                className="p-1 border rounded text-sm"
              >
                <option value="all">All Areas</option>
                {workAreas.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <Label>Type:</Label>
              <select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value)}
                className="p-1 border rounded text-sm"
              >
                <option value="all">All Types</option>
                {photoTypes.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex-1" />
            
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Photo Comparison View */}
      {compareMode && comparePhotos.length === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Photo Comparison</CardTitle>
            <CardDescription>
              Before & After: {comparePhotos[0].workArea}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {comparePhotos.map((photo, index) => (
                <div key={photo.id} className="space-y-2">
                  <div className="relative">
                    <img
                      src={photo.imageUrl}
                      alt={photo.notes}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                    <Badge className={`absolute top-2 left-2 ${getPhotoTypeColor(photo.photoType)}`}>
                      {photo.photoType}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium">{format(photo.capturedAt, 'MMM dd, yyyy')}</p>
                    <p className="text-sm text-muted-foreground">{photo.location}</p>
                    <p className="text-sm">{photo.notes}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photo Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredPhotos.map((photo) => (
          <Card 
            key={photo.id} 
            className={`cursor-pointer transition-all hover:shadow-md ${
              compareMode && comparePhotos.includes(photo) ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => handleCompareToggle(photo)}
          >
            <div className="relative">
              <img
                src={photo.thumbnailUrl}
                alt={photo.notes}
                className="w-full h-48 object-cover rounded-t-lg"
              />
              <Badge className={`absolute top-2 left-2 ${getPhotoTypeColor(photo.photoType)}`}>
                {photo.photoType}
              </Badge>
              {photo.beforePhotoId && (
                <Badge variant="secondary" className="absolute top-2 right-2">
                  Has Before
                </Badge>
              )}
            </div>
            
            <CardContent className="p-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-3 w-3" />
                  <span>{format(photo.capturedAt, 'MMM dd, yyyy')}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{photo.location}</span>
                </div>
                
                <p className="text-sm line-clamp-2">{photo.notes}</p>
                
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">
                    by {photo.capturedBy}
                  </span>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPhotos.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No photos found</h3>
            <p className="text-muted-foreground mb-4">
              Start tracking progress by uploading your first photos
            </p>
            <Button onClick={() => setIsUploadDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Photos
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Photo Detail Modal */}
      {selectedPhoto && (
        <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selectedPhoto.workArea} - {selectedPhoto.location}</DialogTitle>
              <DialogDescription>
                {format(selectedPhoto.capturedAt, 'MMMM dd, yyyy')} • Captured by {selectedPhoto.capturedBy}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <img
                src={selectedPhoto.imageUrl}
                alt={selectedPhoto.notes}
                className="w-full max-h-96 object-contain rounded-lg"
              />
              
              <div className="space-y-2">
                <p><strong>Notes:</strong> {selectedPhoto.notes}</p>
                <div className="flex gap-2">
                  <strong>Tags:</strong>
                  {selectedPhoto.tags.map(tag => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};