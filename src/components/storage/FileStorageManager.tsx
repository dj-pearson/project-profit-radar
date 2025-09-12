import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { File, Upload, Search, Settings } from 'lucide-react';

interface StorageFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
  bucket: string;
  path: string;
}

interface StorageStats {
  totalFiles: number;
  totalSize: number;
  usedSpace: number;
  availableSpace: number;
}

const FileStorageManager = () => {
  const { userProfile } = useAuth();
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBucket, setSelectedBucket] = useState('project-documents');
  const [stats, setStats] = useState<StorageStats>({
    totalFiles: 0,
    totalSize: 0,
    usedSpace: 0,
    availableSpace: 1000000000 // 1GB limit example
  });

  const buckets = [
    { id: 'project-documents', name: 'Project Documents', description: 'Project-related files and documents' },
    { id: 'company-documents', name: 'Company Documents', description: 'Company-wide documents and policies' }
  ];

  useEffect(() => {
    loadFiles();
    loadStorageStats();
  }, [selectedBucket, userProfile]);

  const loadFiles = async () => {
    if (!userProfile?.company_id) return;

    try {
      setLoading(true);
      
      // Get files from storage
      const { data: storageFiles, error: storageError } = await supabase.storage
        .from(selectedBucket)
        .list('', {
          limit: 100,
          offset: 0
        });

      if (storageError) {
        console.error('Storage error:', storageError);
        setFiles([]);
        return;
      }

      // Convert storage files to our format
      const files: StorageFile[] = (storageFiles || []).map((file, index) => ({
        id: `${selectedBucket}-${index}`,
        name: file.name,
        size: file.metadata?.size || 0,
        type: file.metadata?.mimetype || 'application/octet-stream',
        url: `${supabase.storage.from(selectedBucket).getPublicUrl(file.name).data.publicUrl}`,
        uploadedAt: file.created_at || new Date().toISOString(),
        uploadedBy: userProfile.email || 'Unknown',
        bucket: selectedBucket,
        path: file.name
      }));

      setFiles(files);
    } catch (error) {
      console.error('Error loading files:', error);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };


  const loadStorageStats = async () => {
    // Calculate stats from files
    const totalFiles = files.length;
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    
    setStats({
      totalFiles,
      totalSize,
      usedSpace: totalSize,
      availableSpace: 1000000000 - totalSize
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userProfile?.company_id) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const fileName = `${Date.now()}-${file.name}`;
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const { data, error } = await supabase.storage
        .from(selectedBucket)
        .upload(fileName, file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (error) {
        throw error;
      }

      toast({
        title: "File Uploaded",
        description: `${file.name} has been uploaded successfully.`
      });

      // Refresh file list
      setTimeout(() => {
        loadFiles();
        setUploadProgress(0);
      }, 1000);

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "Failed to upload file. Please try again."
      });
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (file: StorageFile) => {
    try {
      const { error } = await supabase.storage
        .from(file.bucket)
        .remove([file.path]);

      if (error) throw error;

      toast({
        title: "File Deleted",
        description: `${file.name} has been deleted.`
      });

      loadFiles();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: "Failed to delete file. Please try again."
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileType = (type: string): string => {
    if (type.includes('pdf')) return 'PDF';
    if (type.includes('word') || type.includes('document')) return 'DOC';
    if (type.includes('excel') || type.includes('spreadsheet')) return 'XLS';
    if (type.includes('image')) return 'IMG';
    return 'FILE';
  };

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <File className="h-5 w-5" />
        <h2 className="text-2xl font-semibold">File Storage Manager</h2>
      </div>

      {/* Storage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.totalFiles}</div>
            <p className="text-sm text-muted-foreground">Total Files</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</div>
            <p className="text-sm text-muted-foreground">Total Size</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{formatFileSize(stats.usedSpace)}</div>
            <p className="text-sm text-muted-foreground">Used Space</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {Math.round((stats.usedSpace / (stats.usedSpace + stats.availableSpace)) * 100)}%
            </div>
            <p className="text-sm text-muted-foreground">Storage Used</p>
            <Progress 
              value={(stats.usedSpace / (stats.usedSpace + stats.availableSpace)) * 100} 
              className="mt-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* File Upload & Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-4 w-4" />
            <span>File Upload & Management</span>
          </CardTitle>
          <CardDescription>
            Upload and manage your project files
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload files or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, DOC, XLS, Images up to 10MB
                  </p>
                </div>
              </label>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              />
            </div>
            
            <div className="md:w-1/3 space-y-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <select
                value={selectedBucket}
                onChange={(e) => setSelectedBucket(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                {buckets.map(bucket => (
                  <option key={bucket.id} value={bucket.id}>
                    {bucket.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* File List */}
      <Card>
        <CardHeader>
          <CardTitle>Files</CardTitle>
          <CardDescription>
            {filteredFiles.length} files in {buckets.find(b => b.id === selectedBucket)?.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No files match your search.' : 'No files uploaded yet.'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                      <File className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-medium">{file.name}</h4>
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <span>{formatFileSize(file.size)}</span>
                        <span>•</span>
                        <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{file.uploadedBy}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">
                      {getFileType(file.type)}
                    </Badge>
                    <Button variant="outline" size="sm" asChild>
                      <a href={file.url} target="_blank" rel="noopener noreferrer">
                        View
                      </a>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => deleteFile(file)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FileStorageManager;