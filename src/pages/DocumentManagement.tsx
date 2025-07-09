import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DocumentCard } from '@/components/documents/DocumentCard';
import DocumentOCRProcessor from '@/components/ocr/DocumentOCRProcessor';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  Upload,
  FileText,
  Plus,
  Search,
  Filter,
  User,
  Calendar,
  Brain,
  Zap
} from 'lucide-react';

interface Document {
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
}

interface DocumentCategory {
  id: string;
  name: string;
  description: string;
}

interface Project {
  id: string;
  name: string;
  client_name: string;
}

const DocumentManagement = () => {
  const { projectId } = useParams<{ projectId?: string }>();
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  // Upload dialog state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploadDescription, setUploadDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // OCR processing state
  const [showOCRProcessor, setShowOCRProcessor] = useState(false);
  const [currentProcessingFile, setCurrentProcessingFile] = useState<File | null>(null);
  const [useSmartProcessing, setUseSmartProcessing] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState('');

  const isProjectContext = !!projectId;
  const pageTitle = isProjectContext ? 'Project Documents' : 'Company Documents';

  useEffect(() => {
    if (userProfile?.company_id) {
      loadDocuments();
      loadCategories();
      loadProjects();
    }
  }, [userProfile, projectId]);

  const loadDocuments = async () => {
    try {
      setLoadingDocs(true);
      
      let query = supabase
        .from('documents')
        .select(`
          *,
          document_categories(name),
          user_profiles!documents_uploaded_by_fkey(first_name, last_name, email)
        `)
        .eq('company_id', userProfile?.company_id);

      // Apply project filter based on context
      if (isProjectContext) {
        query = query.eq('project_id', projectId);
      } else {
        query = query.is('project_id', null);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments((data as any) || []);

    } catch (error: any) {
      console.error('Error loading documents:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load documents"
      });
    } finally {
      setLoadingDocs(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('document_categories')
        .select('*')
        .eq('company_id', userProfile?.company_id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCategories(data || []);

    } catch (error: any) {
      console.error('Error loading categories:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, client_name')
        .eq('company_id', userProfile?.company_id)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setProjects(data || []);

    } catch (error: any) {
      console.error('Error loading projects:', error);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFiles || selectedFiles.length === 0) {
      toast({
        variant: "destructive",
        title: "No Files Selected",
        description: "Please select files to upload."
      });
      return;
    }

    // Check if smart processing is enabled and file is an image/PDF
    const file = selectedFiles[0];
    const isImageOrPDF = file.type.startsWith('image/') || file.type === 'application/pdf';
    
    if (useSmartProcessing && isImageOrPDF && selectedFiles.length === 1) {
      // Use OCR processing for single image/PDF files
      setCurrentProcessingFile(file);
      setShowOCRProcessor(true);
      setIsUploadOpen(false);
      return;
    }

    // Regular upload process
    await performRegularUpload();
  };

  const performRegularUpload = async (ocrData?: {
    ocrText: string;
    aiClassification: any;
    suggestedProjectId?: string;
    suggestedCostCenter?: string;
  }) => {
    setIsUploading(true);
    const files = currentProcessingFile ? [currentProcessingFile] : Array.from(selectedFiles || []);
    const totalFiles = files.length;
    let uploadedCount = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Create file path
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const bucketName = isProjectContext ? 'project-documents' : 'company-documents';
        const folderName = isProjectContext ? projectId : userProfile?.company_id;
        const filePath = `${folderName}/${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Create document record with OCR data if available
        const documentData = {
          name: file.name,
          description: uploadDescription || null,
          file_path: filePath,
          file_type: file.type || 'application/octet-stream',
          file_size: file.size,
          category_id: selectedCategory || null,
          project_id: ocrData?.suggestedProjectId || (isProjectContext ? projectId : null),
          company_id: userProfile?.company_id,
          uploaded_by: user?.id,
          version: 1,
          is_current_version: true,
          ...(ocrData && {
            ocr_text: ocrData.ocrText,
            ai_classification: ocrData.aiClassification,
            auto_routed: true,
            routing_confidence: ocrData.aiClassification.confidence
          })
        };

        const { error: docError } = await supabase
          .from('documents')
          .insert([documentData]);

        if (docError) throw docError;

        uploadedCount++;
        setUploadProgress(Math.round((uploadedCount / totalFiles) * 100));
      }

      toast({
        title: "Upload Complete",
        description: `Successfully uploaded ${uploadedCount} file(s).${ocrData ? ' Smart processing applied!' : ''}`
      });

      // Reset all states
      setIsUploadOpen(false);
      setShowOCRProcessor(false);
      setCurrentProcessingFile(null);
      setSelectedFiles(null);
      setUploadDescription('');
      setSelectedCategory('');
      setUploadProgress(0);
      loadDocuments();

    } catch (error: any) {
      console.error('Error uploading files:', error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message || "Failed to upload files"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleOCRProcessingComplete = (result: {
    ocrText: string;
    aiClassification: any;
    suggestedProjectId?: string;
    suggestedCostCenter?: string;
  }) => {
    performRegularUpload(result);
  };

  const handleOCRCancel = () => {
    setShowOCRProcessor(false);
    setCurrentProcessingFile(null);
    setIsUploadOpen(true);
  };

  const downloadDocument = async (document: Document) => {
    try {
      const bucketName = isProjectContext ? 'project-documents' : 'company-documents';
      
      const { data, error } = await supabase.storage
        .from(bucketName)
        .download(document.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error: any) {
      console.error('Error downloading document:', error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Failed to download document"
      });
    }
  };

  const deleteDocument = async (document: Document) => {
    if (!confirm(`Are you sure you want to delete "${document.name}"?`)) {
      return;
    }

    try {
      // Delete from storage
      const bucketName = isProjectContext ? 'project-documents' : 'company-documents';
      const { error: storageError } = await supabase.storage
        .from(bucketName)
        .remove([document.file_path]);

      if (storageError) throw storageError;

      // Delete document record
      const { error: docError } = await supabase
        .from('documents')
        .delete()
        .eq('id', document.id);

      if (docError) throw docError;

      toast({
        title: "Document Deleted",
        description: `"${document.name}" has been deleted.`
      });

      loadDocuments();

    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: "Failed to delete document"
      });
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || filterCategory === 'all' || doc.category_id === filterCategory;
    const matchesType = !filterType || filterType === 'all' || doc.file_type.includes(filterType);
    
    return matchesSearch && matchesCategory && matchesType;
  });

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout 
      title={pageTitle}
      showTrialBanner={false}
    >
      <div className="flex justify-end mb-6">
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Documents</DialogTitle>
              <DialogDescription>
                Upload files to {isProjectContext ? 'this project' : 'your company library'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleFileUpload} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="files">Files *</Label>
                <Input
                  id="files"
                  type="file"
                  multiple
                  onChange={(e) => setSelectedFiles(e.target.files)}
                  required
                />
                <div className="flex items-center space-x-2 mt-2">
                  <input
                    type="checkbox"
                    id="smart-processing"
                    checked={useSmartProcessing}
                    onChange={(e) => setUseSmartProcessing(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="smart-processing" className="text-sm flex items-center space-x-1">
                    <Brain className="h-3 w-3" />
                    <span>Enable Smart Processing (OCR + AI Classification)</span>
                  </Label>
                </div>
                {useSmartProcessing && (
                  <p className="text-xs text-muted-foreground">
                    Single images and PDFs will be processed with OCR and AI for automatic routing
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
              
              {isUploading && (
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
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isUploading || !selectedFiles}>
                  {isUploading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="All file types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="pdf">PDFs</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                  <SelectItem value="application">Documents</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  {filteredDocuments.length} documents
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents Grid */}
        {filteredDocuments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No documents found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterCategory || filterType 
                  ? 'Try adjusting your filters or search terms.'
                  : `Upload your first ${isProjectContext ? 'project' : 'company'} document to get started.`
                }
              </p>
              {!searchTerm && !filterCategory && !filterType && (
                <Button onClick={() => setIsUploadOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocuments.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                onDownload={downloadDocument}
                onDelete={deleteDocument}
                onVersionUpdate={loadDocuments}
                isProjectContext={isProjectContext}
              />
            ))}
          </div>
        )}
      </div>

      {/* OCR Processing Dialog */}
      <Dialog open={showOCRProcessor} onOpenChange={setShowOCRProcessor}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5" />
              <span>Smart Document Processing</span>
            </DialogTitle>
            <DialogDescription>
              Processing your document with OCR and AI classification
            </DialogDescription>
          </DialogHeader>
          {currentProcessingFile && (
            <DocumentOCRProcessor
              file={currentProcessingFile}
              projects={projects}
              onProcessingComplete={handleOCRProcessingComplete}
              onCancel={handleOCRCancel}
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default DocumentManagement;