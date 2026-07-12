import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AccessiblePageWrapper } from "@/components/accessibility/AccessiblePageWrapper";
import { AccessibleTable, type TableColumn } from '@/components/accessibility/AccessibleTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
// Lazy-loaded so the OCR component (and tesseract.js, pulled in dynamically by
// its worker pool) stay out of the Document Management route chunk until a user
// actually scans a document (US-217).
const DocumentOCRProcessor = React.lazy(() => import('@/components/ocr/DocumentOCRProcessor'));
import { SmartImportWizard } from '@/components/smart-import/SmartImportWizard';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ResponsiveContainer } from '@/components/layout/ResponsiveContainer';
import { mobileFilterClasses } from '@/utils/mobileHelpers';
import { Upload, FileText, Search, Brain, Database, Download, Trash2, Tag, FolderInput, Eye } from 'lucide-react';
import { DocumentPreviewModal } from '@/components/documents/DocumentPreviewModal';

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
  project_id?: string;
  tags?: string[];
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
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  // Sort / project filter / bulk-selection (US-091)
  const [filterProject, setFilterProject] = useState('all');
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [docTagToAdd, setDocTagToAdd] = useState('');
  const [moveToCategory, setMoveToCategory] = useState('');
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
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

  const filteredDocuments = documents
    .filter(doc => {
      const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !filterCategory || filterCategory === 'all' || doc.category_id === filterCategory;
      const matchesType = !filterType || filterType === 'all' || doc.file_type.includes(filterType);
      const matchesProject = filterProject === 'all' || doc.project_id === filterProject;
      return matchesSearch && matchesCategory && matchesType && matchesProject;
    })
    .sort((a, b) => {
      const numeric = sortField === 'file_size' || sortField === 'version';
      let av: any = (a as any)[sortField];
      let bv: any = (b as any)[sortField];
      if (numeric) { av = Number(av || 0); bv = Number(bv || 0); }
      else { av = (av ?? '').toString().toLowerCase(); bv = (bv ?? '').toString().toLowerCase(); }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const allDocsSelected =
    filteredDocuments.length > 0 && filteredDocuments.every((d) => selectedDocIds.has(d.id));

  const bulkDownloadDocs = async () => {
    const docs = filteredDocuments.filter((d) => selectedDocIds.has(d.id));
    for (const doc of docs) {
       
      await downloadDocument(doc);
    }
  };

  const bulkMoveToFolder = async () => {
    const ids = [...selectedDocIds];
    if (ids.length === 0 || !moveToCategory) return;
    setBulkLoading(true);
    try {
      const { error } = await supabase.from('documents').update({ category_id: moveToCategory }).in('id', ids);
      if (error) throw error;
      toast({ title: 'Documents moved', description: `${ids.length} moved to the selected folder.` });
      setSelectedDocIds(new Set());
      setMoveToCategory('');
      loadDocuments();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Move failed', description: err.message });
    } finally {
      setBulkLoading(false);
    }
  };

  const bulkTagDocs = async () => {
    const tag = docTagToAdd.trim();
    const ids = [...selectedDocIds];
    if (!tag || ids.length === 0) return;
    setBulkLoading(true);
    try {
      await Promise.all(
        filteredDocuments
          .filter((d) => selectedDocIds.has(d.id))
          .map((d) => {
            const next = Array.from(new Set([...(d.tags || []), tag]));
            return supabase.from('documents').update({ tags: next }).eq('id', d.id);
          }),
      );
      toast({ title: 'Documents tagged', description: `"${tag}" added to ${ids.length} document(s).` });
      setDocTagToAdd('');
      setSelectedDocIds(new Set());
      loadDocuments();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Tag failed', description: err.message });
    } finally {
      setBulkLoading(false);
    }
  };

  const confirmBulkDeleteDocs = async () => {
    const ids = [...selectedDocIds];
    if (ids.length === 0) return;
    setBulkLoading(true);
    try {
      const bucketName = isProjectContext ? 'project-documents' : 'company-documents';
      const paths = filteredDocuments.filter((d) => selectedDocIds.has(d.id)).map((d) => d.file_path);
      if (paths.length) await supabase.storage.from(bucketName).remove(paths);
      const { error } = await supabase.from('documents').delete().in('id', ids);
      if (error) throw error;
      toast({ title: 'Documents deleted', description: `${ids.length} removed.` });
      setSelectedDocIds(new Set());
      setShowBulkDeleteConfirm(false);
      loadDocuments();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Bulk delete failed', description: err.message });
    } finally {
      setBulkLoading(false);
    }
  };

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
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="pdf">PDFs</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                  <SelectItem value="application">Documents</SelectItem>
                </SelectContent>
              </Select>
              {!isProjectContext && (
                <Select value={filterProject} onValueChange={setFilterProject}>
                  <SelectTrigger aria-label="Filter by project">
                    <SelectValue placeholder="All projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All projects</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
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

        {/* Documents Table */}
        {(() => {
          const formatFileSize = (bytes: number) => {
            if (bytes < 1024) return `${bytes} B`;
            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
            return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
          };

          const documentColumns: TableColumn<Document>[] = [
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
                    onClick={(e) => { e.stopPropagation(); setPreviewDoc(row); }}
                    aria-label={`Preview ${row.name}`}
                  >
                    <Eye className="h-3 w-3" aria-hidden="true" />
                  </Button>
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
            <>
            {selectedDocIds.size > 0 && (
              <div role="region" aria-label="Bulk actions" className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-lg border bg-muted/40">
                <span className="text-sm font-medium">{selectedDocIds.size} selected</span>
                <Button size="sm" variant="outline" disabled={bulkLoading} onClick={bulkDownloadDocs}>
                  <Download className="h-4 w-4 mr-1" /> Download
                </Button>
                <div className="flex items-center gap-1">
                  <Select value={moveToCategory} onValueChange={setMoveToCategory}>
                    <SelectTrigger className="h-8 w-36" aria-label="Folder to move to"><SelectValue placeholder="Move to…" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" disabled={bulkLoading || !moveToCategory} onClick={bulkMoveToFolder}>
                    <FolderInput className="h-4 w-4 mr-1" /> Move
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  <Input value={docTagToAdd} onChange={(e) => setDocTagToAdd(e.target.value)} placeholder="tag…" className="h-8 w-24" aria-label="Tag to add" />
                  <Button size="sm" variant="outline" disabled={bulkLoading || !docTagToAdd.trim()} onClick={bulkTagDocs}>
                    <Tag className="h-4 w-4 mr-1" /> Tag
                  </Button>
                </div>
                <Button size="sm" variant="destructive" disabled={bulkLoading} onClick={() => setShowBulkDeleteConfirm(true)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
                <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelectedDocIds(new Set())}>Clear</Button>
              </div>
            )}
            <AccessibleTable<Document>
              caption="Documents"
              hideCaption
              columns={documentColumns}
              data={filteredDocuments}
              onSort={(column, direction) => { setSortField(column); setSortDir(direction === 'ascending' ? 'asc' : 'desc'); }}
              sortColumn={sortField}
              sortDirection={sortDir === 'asc' ? 'ascending' : 'descending'}
              selectable
              selectedRows={[...selectedDocIds]}
              onSelectionChange={(ids) => setSelectedDocIds(new Set(ids as string[]))}
              loading={loadingDocs}
              emptyContent={
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                  <h3 className="text-lg font-medium mb-2">No documents found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || filterCategory || filterType
                      ? 'Try adjusting your filters or search terms.'
                      : `Upload your first ${isProjectContext ? 'project' : 'company'} document to get started.`}
                  </p>
                  {!searchTerm && !filterCategory && !filterType && (
                    <Button onClick={() => setIsUploadOpen(true)}>
                      <Upload className="h-4 w-4 mr-2" aria-hidden="true" />
                      Upload Files
                    </Button>
                  )}
                </div>
              }
            />
            <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {selectedDocIds.size} document(s)?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes the selected documents and their files from storage. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={bulkLoading}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmBulkDeleteDocs} disabled={bulkLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            </>
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
            <React.Suspense
              fallback={
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Brain className="h-5 w-5 mr-2 animate-pulse" aria-hidden="true" />
                  Loading document scanner…
                </div>
              }
            >
              <DocumentOCRProcessor
                file={currentProcessingFile}
                projects={projects}
                onProcessingComplete={handleOCRProcessingComplete}
                onCancel={handleOCRCancel}
              />
            </React.Suspense>
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

      <DocumentPreviewModal
        open={!!previewDoc}
        onOpenChange={(o) => { if (!o) setPreviewDoc(null); }}
        document={previewDoc}
        bucket={isProjectContext ? 'project-documents' : 'company-documents'}
      />
    </DashboardLayout>
    </AccessiblePageWrapper>
  );
};

export default DocumentManagement;