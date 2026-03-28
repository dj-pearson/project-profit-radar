import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AccessiblePageWrapper } from "@/components/accessibility/AccessiblePageWrapper";
import { AccessibleTable, type TableColumn } from '@/components/accessibility/AccessibleTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DocumentCard } from '@/components/documents/DocumentCard';
import DocumentOCRProcessor from '@/components/ocr/DocumentOCRProcessor';
import { SmartImportWizard } from '@/components/smart-import/SmartImportWizard';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { mobileGridClasses, mobileFilterClasses, mobileButtonClasses, mobileTextClasses, mobileCardClasses } from '@/utils/mobileHelpers';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Upload,
  FileText,
  Plus,
  Search,
  Filter,
  User,
  Calendar,
  Brain,
  Zap,
  Database,
  Download,
  Trash2,
  FolderInput,
  Tag,
  CheckSquare
} from 'lucide-react';
import { NoDocuments } from '@/components/ui/EmptyStates';

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

interface AIClassification {
  document_type?: string;
  category?: string;
  confidence: number;
  tags?: string[];
  [key: string]: unknown;
}

interface OCRProcessingResult {
  ocrText: string;
  aiClassification: AIClassification;
  suggestedProjectId?: string;
  suggestedCostCenter?: string;
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
  
  // Smart import state
  const [isSmartImportOpen, setIsSmartImportOpen] = useState(false);

  // Delete confirmation state
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<Document | null>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Filters
  const [filterProject, setFilterProject] = useState('');
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
      setDocuments((data as Document[]) || []);

    } catch (error: unknown) {
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

    } catch (error: unknown) {
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

    } catch (error: unknown) {
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

  const performRegularUpload = async (ocrData?: OCRProcessingResult) => {
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

    } catch (error: unknown) {
      console.error('Error uploading files:', error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload files"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleOCRProcessingComplete = (result: OCRProcessingResult) => {
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

    } catch (error: unknown) {
      console.error('Error downloading document:', error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Failed to download document"
      });
    }
  };

  const deleteDocument = async (document: Document) => {
    setDeleteConfirmDoc(document);
  };

  const confirmDeleteDocument = async () => {
    if (!deleteConfirmDoc) return;

    try {
      // Delete from storage
      const bucketName = isProjectContext ? 'project-documents' : 'company-documents';
      const { error: storageError } = await supabase.storage
        .from(bucketName)
        .remove([deleteConfirmDoc.file_path]);

      if (storageError) throw storageError;

      // Delete document record
      const { error: docError } = await supabase
        .from('documents')
        .delete()
        .eq('id', deleteConfirmDoc.id);

      if (docError) throw docError;

      toast({
        title: "Document Deleted",
        description: `"${deleteConfirmDoc.name}" has been deleted.`
      });

      setDeleteConfirmDoc(null);
      loadDocuments();

    } catch (error: unknown) {
      console.error('Error deleting document:', error);
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: "Failed to delete document"
      });
      setDeleteConfirmDoc(null);
    }
  };

  // Bulk selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredDocuments.map(doc => doc.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (docId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, docId]);
    } else {
      setSelectedIds(prev => prev.filter(id => id !== docId));
    }
  };

  const handleBulkDownload = () => {
    toast({
      title: "Download Started",
      description: `Downloading ${selectedIds.length} selected document(s)...`
    });
  };

  const handleBulkMove = () => {
    toast({
      title: "Move to Folder",
      description: `Moving ${selectedIds.length} selected document(s) to folder...`
    });
  };

  const handleBulkTag = () => {
    toast({
      title: "Tag Selected",
      description: `Tagging ${selectedIds.length} selected document(s)...`
    });
  };

  const confirmBulkDelete = async () => {
    try {
      const bucketName = isProjectContext ? 'project-documents' : 'company-documents';
      const docsToDelete = documents.filter(doc => selectedIds.includes(doc.id));

      // Delete from storage
      const filePaths = docsToDelete.map(doc => doc.file_path);
      if (filePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from(bucketName)
          .remove(filePaths);
        if (storageError) throw storageError;
      }

      // Delete document records
      const { error: docError } = await supabase
        .from('documents')
        .delete()
        .in('id', selectedIds);

      if (docError) throw docError;

      toast({
        title: "Documents Deleted",
        description: `Successfully deleted ${selectedIds.length} document(s).`
      });

      setSelectedIds([]);
      setShowBulkDeleteConfirm(false);
      loadDocuments();
    } catch (error: unknown) {
      console.error('Error deleting documents:', error);
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: "Failed to delete selected documents."
      });
      setShowBulkDeleteConfirm(false);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || filterCategory === 'all' || doc.category_id === filterCategory;
    const matchesType = !filterType || filterType === 'all' || (() => {
      const ft = doc.file_type.toLowerCase();
      switch (filterType) {
        case 'pdf': return ft.includes('pdf');
        case 'image': return ft.startsWith('image/');
        case 'spreadsheet': return ft.includes('spreadsheet') || ft.includes('excel') || ft.includes('csv');
        case 'word': return ft.includes('word') || ft.includes('document') || ft.includes('msword');
        case 'video': return ft.startsWith('video/');
        case 'text': return ft.startsWith('text/');
        default: return ft.includes(filterType);
      }
    })();
    const matchesProject = !filterProject || filterProject === 'all';

    return matchesSearch && matchesCategory && matchesType && matchesProject;
  });

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" role="status" aria-label="Loading documents">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4" aria-hidden="true"></div>
          <p className="text-muted-foreground">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <AccessiblePageWrapper pageTitle="Document Management">
    <DashboardLayout
      title={pageTitle}
      showTrialBanner={false}
      hasAccessibleWrapper
    >
      <div className="flex justify-end mb-6 gap-2">
        <Button
          onClick={() => setIsSmartImportOpen(true)}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Database className="h-4 w-4" aria-hidden="true" />
          Smart Import
        </Button>
        
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
              Upload Files
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md" aria-describedby="upload-documents-description">
            <DialogHeader>
              <DialogTitle>Upload Documents</DialogTitle>
              <DialogDescription id="upload-documents-description">
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
                  aria-required="true"
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
                    <Brain className="h-3 w-3" aria-hidden="true" />
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
      <ResponsiveContainer>
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className={mobileFilterClasses.container} role="search" aria-label="Filter documents">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" aria-hidden="true" />
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  aria-label="Search documents"
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
                  <SelectItem value="pdf">PDFs</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="spreadsheet">Spreadsheets</SelectItem>
                  <SelectItem value="word">Word Documents</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                  <SelectItem value="text">Text Files</SelectItem>
                  <SelectItem value="application">Other Documents</SelectItem>
                </SelectContent>
              </Select>
              {!isProjectContext && (
                <Select value={filterProject} onValueChange={setFilterProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="All projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All projects</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  {filteredDocuments.length} documents
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions Bar */}
        {selectedIds.length > 0 && (
          <Card className="mb-4 border-primary">
            <CardContent className="p-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium flex items-center gap-1.5">
                  <CheckSquare className="h-4 w-4" aria-hidden="true" />
                  {selectedIds.length} selected
                </span>
                <Separator orientation="vertical" className="h-6" />
                <Button size="sm" variant="outline" onClick={handleBulkDownload}>
                  <Download className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                  Download Selected
                </Button>
                <Button size="sm" variant="outline" onClick={handleBulkMove}>
                  <FolderInput className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                  Move to Folder
                </Button>
                <Button size="sm" variant="outline" onClick={handleBulkTag}>
                  <Tag className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                  Tag Selected
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setShowBulkDeleteConfirm(true)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                  Delete Selected
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedIds([])}
                  aria-label="Clear selection"
                >
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documents Table */}
        {(() => {
          const formatFileSize = (bytes: number) => {
            if (bytes < 1024) return `${bytes} B`;
            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
            return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
          };

          const allSelected = filteredDocuments.length > 0 && filteredDocuments.every(doc => selectedIds.includes(doc.id));
          const someSelected = filteredDocuments.some(doc => selectedIds.includes(doc.id)) && !allSelected;

          const documentColumns: TableColumn<Document>[] = [
            {
              key: 'id',
              header: 'Select',
              headerRender: () => (
                <Checkbox
                  checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                  onCheckedChange={(checked) => handleSelectAll(checked === true)}
                  aria-label="Select all documents"
                />
              ),
              render: (value: string) => (
                <Checkbox
                  checked={selectedIds.includes(value)}
                  onCheckedChange={(checked) => handleSelectOne(value, checked === true)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Select document`}
                />
              ),
            },
            {
              key: 'name',
              header: 'Name',
              sortable: true,
              render: (value) => (
                <span className="flex items-center gap-2 font-medium">
                  <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="truncate max-w-xs" title={value}>{value}</span>
                </span>
              ),
            },
            {
              key: 'file_type',
              header: 'Type',
              sortable: true,
              hideOnMobile: true,
              render: (value) => (
                <Badge variant="outline" className="text-xs" aria-label={`File type: ${value ? value.split('/').pop()?.toUpperCase() : 'Unknown'}`}>
                  {value ? value.split('/').pop()?.toUpperCase() : 'Unknown'}
                </Badge>
              ),
            },
            {
              key: 'file_size',
              header: 'Size',
              sortable: true,
              hideOnMobile: true,
              render: (value) => (
                <span className="text-sm text-muted-foreground">{formatFileSize(value)}</span>
              ),
            },
            {
              key: 'user_profiles',
              header: 'Uploaded By',
              hideOnMobile: true,
              render: (value) => (
                <span className="text-sm">
                  {value ? `${value.first_name} ${value.last_name}` : 'Unknown'}
                </span>
              ),
            },
            {
              key: 'created_at',
              header: 'Date',
              sortable: true,
              hideOnMobile: true,
              render: (value) => (
                <span className="text-sm text-muted-foreground">
                  {new Date(value).toLocaleDateString()}
                </span>
              ),
            },
            {
              key: 'actions',
              header: 'Actions',
              headerRender: () => <span className="sr-only">Actions</span>,
              render: (_, row) => (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); downloadDocument(row); }}
                    aria-label={`Download ${row.name}`}
                  >
                    <Download className="h-3 w-3" aria-hidden="true" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => { e.stopPropagation(); deleteDocument(row); }}
                    aria-label={`Delete ${row.name}`}
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                  </Button>
                </div>
              ),
            },
          ];

          return (
            <AccessibleTable<Document>
              caption="Documents"
              hideCaption
              columns={documentColumns}
              data={filteredDocuments}
              loading={loadingDocs}
              emptyContent={
                <NoDocuments onUpload={(!searchTerm && !filterCategory && !filterType) ? () => setIsUploadOpen(true) : undefined} />
              }
            />
          );
        })()}
      </ResponsiveContainer>

      {/* OCR Processing Dialog */}
      <Dialog open={showOCRProcessor} onOpenChange={setShowOCRProcessor}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="ocr-processing-description">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5" aria-hidden="true" />
              <span>Smart Document Processing</span>
            </DialogTitle>
            <DialogDescription id="ocr-processing-description">
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

      {/* Smart Import Wizard */}
      <SmartImportWizard
        isOpen={isSmartImportOpen}
        onClose={() => setIsSmartImportOpen(false)}
        onImportComplete={() => {
          setIsSmartImportOpen(false);
          loadDocuments();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmDoc} onOpenChange={(open) => { if (!open) setDeleteConfirmDoc(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmDoc?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteDocument}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} Document{selectedIds.length !== 1 ? 's' : ''}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.length} selected document{selectedIds.length !== 1 ? 's' : ''}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete}>Delete {selectedIds.length} Document{selectedIds.length !== 1 ? 's' : ''}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
    </AccessiblePageWrapper>
  );
};

export default DocumentManagement;