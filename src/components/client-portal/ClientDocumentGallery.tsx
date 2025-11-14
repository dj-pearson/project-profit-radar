import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Image as ImageIcon,
  FileText,
  Download,
  ExternalLink,
  Calendar,
  User,
  File,
  FolderOpen,
  X,
  ZoomIn,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Document {
  id: string;
  name: string;
  type: 'photo' | 'document' | 'plan' | 'contract' | 'report' | 'other';
  url: string;
  thumbnailUrl?: string;
  uploadedBy?: string;
  uploadedDate: string;
  category?: string;
  description?: string;
  size?: number;
}

interface ClientDocumentGalleryProps {
  documents: Document[];
  onDownload?: (document: Document) => void;
}

export const ClientDocumentGallery: React.FC<ClientDocumentGalleryProps> = ({
  documents,
  onDownload
}) => {
  const [selectedImage, setSelectedImage] = useState<Document | null>(null);
  const [imageIndex, setImageIndex] = useState(0);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getDocumentIcon = (type: Document['type']) => {
    switch (type) {
      case 'photo':
        return <ImageIcon className="h-5 w-5" />;
      case 'plan':
        return <FileText className="h-5 w-5" />;
      case 'document':
      case 'contract':
      case 'report':
        return <File className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const photos = documents.filter(d => d.type === 'photo');
  const plans = documents.filter(d => d.type === 'plan');
  const contractsDocs = documents.filter(d => ['document', 'contract', 'report', 'other'].includes(d.type));

  const handleImageClick = (document: Document) => {
    setSelectedImage(document);
    const index = photos.findIndex(p => p.id === document.id);
    setImageIndex(index);
  };

  const handlePrevImage = () => {
    if (imageIndex > 0) {
      setImageIndex(imageIndex - 1);
      setSelectedImage(photos[imageIndex - 1]);
    }
  };

  const handleNextImage = () => {
    if (imageIndex < photos.length - 1) {
      setImageIndex(imageIndex + 1);
      setSelectedImage(photos[imageIndex + 1]);
    }
  };

  const handleDownload = (doc: Document) => {
    if (onDownload) {
      onDownload(doc);
    } else {
      // Default download behavior
      window.open(doc.url, '_blank');
    }
  };

  const PhotoGrid = ({ photos }: { photos: Document[] }) => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {photos.map((photo) => (
        <div
          key={photo.id}
          className="group relative aspect-square overflow-hidden rounded-lg border-2 border-transparent hover:border-blue-500 cursor-pointer transition-all"
          onClick={() => handleImageClick(photo)}
        >
          <img
            src={photo.thumbnailUrl || photo.url}
            alt={photo.name}
            className="w-full h-full object-cover transition-transform group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
            <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-white text-xs font-medium truncate">{photo.name}</p>
            <p className="text-white/80 text-xs">{formatDate(photo.uploadedDate)}</p>
          </div>
        </div>
      ))}
    </div>
  );

  const DocumentList = ({ documents }: { documents: Document[] }) => (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="flex-shrink-0 text-muted-foreground">
              {getDocumentIcon(doc.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{doc.name}</h4>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                <span className="flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  {formatDate(doc.uploadedDate)}
                </span>
                {doc.uploadedBy && (
                  <span className="flex items-center">
                    <User className="h-3 w-3 mr-1" />
                    {doc.uploadedBy}
                  </span>
                )}
                {doc.size && (
                  <span>{formatFileSize(doc.size)}</span>
                )}
              </div>
              {doc.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  {doc.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(doc.url, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownload(doc)}
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Project Documents & Photos</CardTitle>
          <CardDescription>
            View and download project photos, plans, and documents
          </CardDescription>
        </CardHeader>

        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Documents Yet</h3>
              <p className="text-muted-foreground">
                Documents and photos will appear here as they are uploaded
              </p>
            </div>
          ) : (
            <Tabs defaultValue="photos" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="photos">
                  Photos ({photos.length})
                </TabsTrigger>
                <TabsTrigger value="plans">
                  Plans ({plans.length})
                </TabsTrigger>
                <TabsTrigger value="documents">
                  Documents ({contractsDocs.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="photos" className="mt-6">
                {photos.length === 0 ? (
                  <div className="text-center py-8">
                    <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No photos available</p>
                  </div>
                ) : (
                  <PhotoGrid photos={photos} />
                )}
              </TabsContent>

              <TabsContent value="plans" className="mt-6">
                {plans.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No plans available</p>
                  </div>
                ) : (
                  <DocumentList documents={plans} />
                )}
              </TabsContent>

              <TabsContent value="documents" className="mt-6">
                {contractsDocs.length === 0 ? (
                  <div className="text-center py-8">
                    <File className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No documents available</p>
                  </div>
                ) : (
                  <DocumentList documents={contractsDocs} />
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Image Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-6xl max-h-[90vh] w-full h-full flex items-center justify-center">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImage(null);
              }}
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Previous Button */}
            {imageIndex > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevImage();
                }}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
            )}

            {/* Next Button */}
            {imageIndex < photos.length - 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextImage();
                }}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            )}

            {/* Image */}
            <img
              src={selectedImage.url}
              alt={selectedImage.name}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Image Info */}
            <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-sm rounded-lg p-4">
              <h3 className="text-white font-semibold">{selectedImage.name}</h3>
              <div className="flex items-center gap-4 text-sm text-white/80 mt-1">
                <span>{formatDate(selectedImage.uploadedDate)}</span>
                {selectedImage.uploadedBy && <span>by {selectedImage.uploadedBy}</span>}
                <span className="ml-auto">{imageIndex + 1} / {photos.length}</span>
              </div>
              {selectedImage.description && (
                <p className="text-white/80 text-sm mt-2">{selectedImage.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
