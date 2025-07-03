import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DocumentVersions } from './DocumentVersions';
import { 
  FileText,
  File,
  Image,
  Video,
  Archive,
  Download,
  Trash2,
  Eye,
  History,
  User,
  Calendar,
  HardDrive
} from 'lucide-react';

interface DocumentCardProps {
  document: {
    id: string;
    name: string;
    description?: string;
    file_path: string;
    file_type: string;
    file_size: number;
    version: number;
    is_current_version: boolean;
    category_id?: string;
    uploaded_by: string;
    created_at: string;
    updated_at?: string;
    version_notes?: string;
    checksum?: string;
    approved_by?: string;
    approved_at?: string;
    document_categories?: { name: string } | null;
    user_profiles?: { first_name: string; last_name: string; email: string } | null;
  };
  onDownload: (document: any) => void;
  onDelete: (document: any) => void;
  onVersionUpdate?: () => void;
  isProjectContext?: boolean;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onDownload,
  onDelete,
  onVersionUpdate,
  isProjectContext = false
}) => {
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-5 w-5 text-blue-500" />;
    if (fileType.startsWith('video/')) return <Video className="h-5 w-5 text-purple-500" />;
    if (fileType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    if (fileType.includes('zip') || fileType.includes('rar')) return <Archive className="h-5 w-5 text-yellow-500" />;
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  };

  const getVersionBadge = () => {
    if (document.version > 1) {
      return (
        <Badge variant="outline" className="text-xs">
          v{document.version}
        </Badge>
      );
    }
    return null;
  };

  const getApprovalBadge = () => {
    if (document.approved_by && document.approved_at) {
      return (
        <Badge className="bg-green-500 text-white text-xs">
          Approved
        </Badge>
      );
    }
    return null;
  };

  return (
    <Card className="group hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start space-x-3 flex-1">
            <div className="flex-shrink-0 mt-1">
              {getFileIcon(document.file_type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="font-medium truncate">{document.name}</h3>
                {getVersionBadge()}
                {getApprovalBadge()}
              </div>
              
              {document.description && (
                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                  {document.description}
                </p>
              )}

              {document.version_notes && (
                <p className="text-xs text-muted-foreground italic mb-2 border-l-2 border-muted pl-2">
                  "{document.version_notes}"
                </p>
              )}

              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <HardDrive className="h-3 w-3" />
                  <span>{formatFileSize(document.file_size)}</span>
                </div>
                
                {document.user_profiles && (
                  <div className="flex items-center space-x-1">
                    <User className="h-3 w-3" />
                    <span>{document.user_profiles.first_name} {document.user_profiles.last_name}</span>
                  </div>
                )}
                
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(document.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {document.document_categories && (
                <div className="mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {document.document_categories.name}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>

        <Separator className="my-3" />

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownload(document)}
              className="h-8"
            >
              <Download className="h-3 w-3 mr-1" />
              Download
            </Button>
            
            <Dialog open={isVersionsOpen} onOpenChange={setIsVersionsOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                >
                  <History className="h-3 w-3 mr-1" />
                  Versions
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Document Versions: {document.name}</DialogTitle>
                  <DialogDescription>
                    Manage and view all versions of this document
                  </DialogDescription>
                </DialogHeader>
                <DocumentVersions
                  documentId={document.id}
                  documentName={document.name}
                  onNewVersion={() => {
                    onVersionUpdate?.();
                    setIsVersionsOpen(false);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(document)}
            className="h-8 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};