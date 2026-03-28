import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  FileText,
  Download,
  Share2,
  Eye,
  Copy,
  Trash2,
  Upload,
  X,
  Link,
  Clock,
  File,
  Image,
  Pencil,
  Plus,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PreviewDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
}

interface DocumentPreviewModalProps {
  document: PreviewDocument | null;
  isOpen: boolean;
  onClose: () => void;
}

type ShareExpiration = '24h' | '7d' | '30d';

const SHARE_EXPIRATION_LABELS: Record<ShareExpiration, string> = {
  '24h': '24 hours',
  '7d': '7 days',
  '30d': '30 days',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFileExtension(name: string): string {
  const dotIndex = name.lastIndexOf('.');
  if (dotIndex === -1) return '';
  return name.slice(dotIndex + 1).toLowerCase();
}

function isPdf(name: string): boolean {
  return getFileExtension(name) === 'pdf';
}

function isImage(name: string): boolean {
  const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
  return imageExts.includes(getFileExtension(name));
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// DocumentPreviewModal
// ---------------------------------------------------------------------------

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  document,
  isOpen,
  onClose,
}) => {
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [shareExpiration, setShareExpiration] = useState<ShareExpiration>('7d');

  const handleDownload = () => {
    if (!document) return;
    const anchor = window.document.createElement('a');
    anchor.href = document.url;
    anchor.download = document.name;
    anchor.click();
    toast.success(`Downloading ${document.name}`);
  };

  const handleGenerateShareLink = () => {
    if (!document) return;
    const fakeLink = `${window.location.origin}/shared/${document.id}?expires=${shareExpiration}`;
    navigator.clipboard.writeText(fakeLink).then(() => {
      toast.success(
        `Share link copied! Expires in ${SHARE_EXPIRATION_LABELS[shareExpiration]}.`
      );
    }).catch(() => {
      toast.error('Failed to copy link to clipboard');
    });
    setShowShareOptions(false);
  };

  const renderPreviewContent = () => {
    if (!document) return null;

    if (isPdf(document.name)) {
      return (
        <iframe
          src={document.url}
          title={`Preview of ${document.name}`}
          className="w-full h-[60vh] rounded-md border"
        />
      );
    }

    if (isImage(document.name)) {
      return (
        <div className="flex items-center justify-center bg-muted rounded-md p-4 max-h-[60vh] overflow-auto">
          <img
            src={document.url}
            alt={document.name}
            className="max-w-full max-h-[55vh] object-contain rounded"
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 bg-muted rounded-md">
        <File className="h-16 w-16 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Preview not available for this file type
        </p>
        <Button variant="outline" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download to view
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-2 min-w-0">
              {isPdf(document?.name ?? '') ? (
                <FileText className="h-5 w-5 text-red-500 shrink-0" />
              ) : isImage(document?.name ?? '') ? (
                <Image className="h-5 w-5 text-blue-500 shrink-0" />
              ) : (
                <File className="h-5 w-5 text-gray-500 shrink-0" />
              )}
              <DialogTitle className="truncate">
                {document?.name ?? 'Document Preview'}
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="flex items-center gap-3 text-xs">
            {document && (
              <>
                <span>{formatFileSize(document.size)}</span>
                <span>Uploaded by {document.uploadedBy}</span>
                <span>{formatDate(document.uploadedAt)}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {document && (
          <div className="space-y-4">
            {renderPreviewContent()}

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowShareOptions(!showShareOptions)}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>

              <Button variant="outline" size="sm" onClick={onClose}>
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
            </div>

            {/* Share options panel */}
            {showShareOptions && (
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Link className="h-4 w-4" />
                    Generate Share Link
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="share-expiration" className="text-sm whitespace-nowrap">
                        Expires in
                      </Label>
                    </div>
                    <Select
                      value={shareExpiration}
                      onValueChange={(val) => setShareExpiration(val as ShareExpiration)}
                    >
                      <SelectTrigger id="share-expiration" className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24h">24 hours</SelectItem>
                        <SelectItem value="7d">7 days</SelectItem>
                        <SelectItem value="30d">30 days</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={handleGenerateShareLink}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// Template types & mock data
// ---------------------------------------------------------------------------

type TemplateCategory = 'contract' | 'proposal' | 'report' | 'safety' | 'inspection' | 'other';

interface DocumentTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  fileType: string;
  createdAt: string;
  updatedAt: string;
}

const TEMPLATE_CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: 'contract', label: 'Contract' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'report', label: 'Report' },
  { value: 'safety', label: 'Safety' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  contract: 'bg-blue-100 text-blue-800',
  proposal: 'bg-green-100 text-green-800',
  report: 'bg-purple-100 text-purple-800',
  safety: 'bg-red-100 text-red-800',
  inspection: 'bg-orange-100 text-orange-800',
  other: 'bg-gray-100 text-gray-800',
};

const INITIAL_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'tpl-1',
    name: 'Standard Construction Contract',
    category: 'contract',
    description: 'AIA-style contract template for residential projects.',
    fileType: 'pdf',
    createdAt: '2025-11-15T10:00:00Z',
    updatedAt: '2026-01-20T14:30:00Z',
  },
  {
    id: 'tpl-2',
    name: 'Project Proposal Template',
    category: 'proposal',
    description: 'Client-facing proposal with scope, timeline, and budget sections.',
    fileType: 'docx',
    createdAt: '2025-12-01T08:00:00Z',
    updatedAt: '2026-02-10T09:15:00Z',
  },
  {
    id: 'tpl-3',
    name: 'Daily Progress Report',
    category: 'report',
    description: 'Daily site report capturing weather, crew, and work completed.',
    fileType: 'pdf',
    createdAt: '2025-10-05T12:00:00Z',
    updatedAt: '2025-12-18T16:45:00Z',
  },
  {
    id: 'tpl-4',
    name: 'Safety Incident Report',
    category: 'safety',
    description: 'OSHA-compliant incident documentation template.',
    fileType: 'pdf',
    createdAt: '2025-09-20T07:30:00Z',
    updatedAt: '2026-01-05T11:00:00Z',
  },
  {
    id: 'tpl-5',
    name: 'Site Inspection Checklist',
    category: 'inspection',
    description: 'Pre-pour, framing, and final inspection checklists.',
    fileType: 'pdf',
    createdAt: '2025-11-01T09:00:00Z',
    updatedAt: '2026-03-01T10:20:00Z',
  },
];

// ---------------------------------------------------------------------------
// DocumentTemplateManager
// ---------------------------------------------------------------------------

interface DocumentTemplateManagerProps {
  projectId?: string;
}

export const DocumentTemplateManager: React.FC<DocumentTemplateManagerProps> = ({
  projectId,
}) => {
  const [templates, setTemplates] = useState<DocumentTemplate[]>(INITIAL_TEMPLATES);
  const [filterCategory, setFilterCategory] = useState<TemplateCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Upload dialog state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: '',
    category: 'other' as TemplateCategory,
    description: '',
  });

  // Edit dialog state
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    category: 'other' as TemplateCategory,
    description: '',
  });

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
      const matchesSearch =
        searchQuery === '' ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [templates, filterCategory, searchQuery]);

  const handleCloneTemplate = (template: DocumentTemplate) => {
    const cloned: DocumentTemplate = {
      ...template,
      id: `tpl-${Date.now()}`,
      name: `${template.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTemplates((prev) => [cloned, ...prev]);
    const suffix = projectId ? ` for project ${projectId}` : '';
    toast.success(`Template cloned${suffix}: ${cloned.name}`);
  };

  const handleUploadTemplate = () => {
    if (!uploadForm.name.trim()) {
      toast.error('Template name is required');
      return;
    }
    const newTemplate: DocumentTemplate = {
      id: `tpl-${Date.now()}`,
      name: uploadForm.name.trim(),
      category: uploadForm.category,
      description: uploadForm.description.trim(),
      fileType: 'pdf',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTemplates((prev) => [newTemplate, ...prev]);
    setUploadForm({ name: '', category: 'other', description: '' });
    setIsUploadOpen(false);
    toast.success(`Template uploaded: ${newTemplate.name}`);
  };

  const handleEditTemplate = () => {
    if (!editingTemplate) return;
    if (!editForm.name.trim()) {
      toast.error('Template name is required');
      return;
    }
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === editingTemplate.id
          ? {
              ...t,
              name: editForm.name.trim(),
              category: editForm.category,
              description: editForm.description.trim(),
              updatedAt: new Date().toISOString(),
            }
          : t
      )
    );
    toast.success(`Template updated: ${editForm.name.trim()}`);
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = (template: DocumentTemplate) => {
    setTemplates((prev) => prev.filter((t) => t.id !== template.id));
    toast.success(`Template deleted: ${template.name}`);
  };

  const openEditDialog = (template: DocumentTemplate) => {
    setEditForm({
      name: template.name,
      category: template.category,
      description: template.description,
    });
    setEditingTemplate(template);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold">Document Templates</h2>
        <Button size="sm" onClick={() => setIsUploadOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
          aria-label="Search templates"
        />
        <Select
          value={filterCategory}
          onValueChange={(val) => setFilterCategory(val as TemplateCategory | 'all')}
        >
          <SelectTrigger className="w-[160px]" aria-label="Filter by category">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {TEMPLATE_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Template list */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>No templates found</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <Card key={template.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-medium leading-tight">
                    {template.name}
                  </CardTitle>
                  <Badge
                    variant="secondary"
                    className={CATEGORY_COLORS[template.category]}
                  >
                    {template.category}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {template.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    .{template.fileType}
                  </Badge>
                  <span>Updated {formatDate(template.updatedAt)}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCloneTemplate(template)}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Clone
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(template)}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteTemplate(template)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Template Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Template</DialogTitle>
            <DialogDescription>
              Add a new reusable document template to the library.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="upload-name">Template Name</Label>
              <Input
                id="upload-name"
                placeholder="e.g. Subcontractor Agreement"
                value={uploadForm.name}
                onChange={(e) =>
                  setUploadForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="upload-category">Category</Label>
              <Select
                value={uploadForm.category}
                onValueChange={(val) =>
                  setUploadForm((f) => ({ ...f, category: val as TemplateCategory }))
                }
              >
                <SelectTrigger id="upload-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="upload-description">Description</Label>
              <Input
                id="upload-description"
                placeholder="Brief description of this template"
                value={uploadForm.description}
                onChange={(e) =>
                  setUploadForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUploadTemplate}>
                <Plus className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog
        open={editingTemplate !== null}
        onOpenChange={(open) => { if (!open) setEditingTemplate(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>
              Update the metadata for this template.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Template Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select
                value={editForm.category}
                onValueChange={(val) =>
                  setEditForm((f) => ({ ...f, category: val as TemplateCategory }))
                }
              >
                <SelectTrigger id="edit-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                Cancel
              </Button>
              <Button onClick={handleEditTemplate}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
