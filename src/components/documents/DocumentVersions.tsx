import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Upload,
  Download,
  Eye,
  Clock,
  FileText,
  User,
  AlertCircle,
  CheckCircle,
  History
} from 'lucide-react';

interface DocumentVersion {
  id: string;
  version_number: number;
  file_path: string;
  file_size: number;
  checksum?: string;
  version_notes?: string;
  created_by: string;
  created_at: string;
  is_current: boolean;
  user_profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface DocumentVersionsProps {
  documentId: string;
  documentName: string;
  onNewVersion?: () => void;
}

export const DocumentVersions: React.FC<DocumentVersionsProps> = ({
  documentId,
  documentName,
  onNewVersion
}) => {
  const { user } = useAuth();
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Upload dialog state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [versionNotes, setVersionNotes] = useState('');

  useEffect(() => {
    loadVersions();
  }, [documentId]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('document_versions')
        .select(`
          *,
          user_profiles(first_name, last_name, email)
        `)
        .eq('document_id', documentId)
        .order('version_number', { ascending: false });

      if (error) throw error;

      setVersions(data || []);
    } catch (error: any) {
      console.error('Error loading document versions:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load document versions"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNewVersionUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast({
        variant: "destructive",
        title: "No File Selected",
        description: "Please select a file to upload."
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Generate file path
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-v${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const bucketName = 'company-documents'; // Assuming company context
      const filePath = `${user?.id}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Simulate progress for demo
      setUploadProgress(100);

      // Generate checksum (simple hash for demo)
      const checksum = await generateFileChecksum(selectedFile);

      // Create new version using the database function
      const { data, error } = await supabase.rpc('create_document_version', {
        p_document_id: documentId,
        p_file_path: filePath,
        p_file_size: selectedFile.size,
        p_checksum: checksum,
        p_version_notes: versionNotes || null
      });

      if (error) throw error;

      toast({
        title: "New Version Created",
        description: "Document version uploaded successfully."
      });

      setIsUploadOpen(false);
      setSelectedFile(null);
      setVersionNotes('');
      setUploadProgress(0);
      loadVersions();
      onNewVersion?.();

    } catch (error: any) {
      console.error('Error uploading new version:', error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message || "Failed to upload new version"
      });
    } finally {
      setUploading(false);
    }
  };

  const generateFileChecksum = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const downloadVersion = async (version: DocumentVersion) => {
    try {
      const { data, error } = await supabase.storage
        .from('company-documents')
        .download(version.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `${documentName}-v${version.version_number}`;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error: any) {
      console.error('Error downloading version:', error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Failed to download document version"
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  };

  const getVersionBadge = (version: DocumentVersion) => {
    if (version.is_current) {
      return <Badge className="bg-green-500 text-white">Current</Badge>;
    }
    return <Badge variant="outline">v{version.version_number}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <History className="h-5 w-5" />
          <h3 className="text-lg font-medium">Version History</h3>
        </div>
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Upload New Version
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload New Version</DialogTitle>
              <DialogDescription>
                Upload a new version of "{documentName}"
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleNewVersionUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file">File *</Label>
                <Input
                  id="file"
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Version Notes</Label>
                <Textarea
                  id="notes"
                  value={versionNotes}
                  onChange={(e) => setVersionNotes(e.target.value)}
                  placeholder="What changed in this version?"
                  rows={3}
                />
              </div>
              
              {uploading && (
                <div className="space-y-2">
                  <Label>Upload Progress</Label>
                  <Progress value={uploadProgress} />
                  <p className="text-sm text-muted-foreground">{uploadProgress}% complete</p>
                </div>
              )}
              
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsUploadOpen(false)}
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={uploading || !selectedFile}>
                  {uploading ? 'Uploading...' : 'Upload Version'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-muted rounded-lg"></div>
            </div>
          ))}
        </div>
      ) : versions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Versions Available</h3>
            <p className="text-muted-foreground mb-4">
              Upload the first version to start tracking changes.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {versions.map((version) => (
            <Card key={version.id} className={version.is_current ? 'ring-2 ring-primary' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium">Version {version.version_number}</h4>
                        {getVersionBadge(version)}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                        <div className="flex items-center space-x-1">
                          <User className="h-3 w-3" />
                          <span>
                            {version.user_profiles 
                              ? `${version.user_profiles.first_name} ${version.user_profiles.last_name}`
                              : 'Unknown'
                            }
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(version.created_at).toLocaleString()}</span>
                        </div>
                        <span>{formatFileSize(version.file_size)}</span>
                      </div>
                      {version.version_notes && (
                        <p className="text-sm text-muted-foreground mt-2 border-l-2 border-muted pl-2">
                          {version.version_notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadVersion(version)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};