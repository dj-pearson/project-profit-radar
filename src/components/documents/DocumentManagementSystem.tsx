import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Upload, Download, Eye, Share2, Archive, Search, Filter, Folder, Image, FileVideo, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'video' | 'spreadsheet' | 'drawing' | 'contract';
  category: 'plans' | 'contracts' | 'permits' | 'photos' | 'reports' | 'safety';
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
  version: number;
  status: 'current' | 'archived' | 'under_review';
  tags: string[];
  projectId?: string;
  url: string;
  thumbnail?: string;
}

interface DocumentFolder {
  id: string;
  name: string;
  parentId?: string;
  documentCount: number;
  subfolders: DocumentFolder[];
}

export const DocumentManagementSystem: React.FC = () => {
  const [activeTab, setActiveTab] = useState('documents');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Mock data for demonstration
  useEffect(() => {
    const mockDocuments: Document[] = [
      {
        id: '1',
        name: 'Project Blueprint - Main Floor.pdf',
        type: 'pdf',
        category: 'plans',
        size: 2500000,
        uploadedBy: 'John Architect',
        uploadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        version: 3,
        status: 'current',
        tags: ['blueprint', 'main-floor', 'architectural'],
        projectId: 'proj-123',
        url: '/documents/blueprint-main.pdf'
      },
      {
        id: '2',
        name: 'Safety Inspection Report.pdf',
        type: 'pdf',
        category: 'reports',
        size: 850000,
        uploadedBy: 'Safety Inspector',
        uploadedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        version: 1,
        status: 'current',
        tags: ['safety', 'inspection', 'monthly'],
        projectId: 'proj-123',
        url: '/documents/safety-report.pdf'
      },
      {
        id: '3',
        name: 'Foundation Progress Photos',
        type: 'image',
        category: 'photos',
        size: 12500000,
        uploadedBy: 'Site Supervisor',
        uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        version: 1,
        status: 'current',
        tags: ['progress', 'foundation', 'photos'],
        projectId: 'proj-123',
        url: '/documents/foundation-photos.zip',
        thumbnail: '/thumbnails/foundation.jpg'
      }
    ];

    const mockFolders: DocumentFolder[] = [
      {
        id: '1',
        name: 'Project Alpha',
        documentCount: 15,
        subfolders: [
          { id: '2', name: 'Architectural Plans', parentId: '1', documentCount: 8, subfolders: [] },
          { id: '3', name: 'Progress Photos', parentId: '1', documentCount: 7, subfolders: [] }
        ]
      },
      {
        id: '4',
        name: 'Contracts & Legal',
        documentCount: 12,
        subfolders: [
          { id: '5', name: 'Subcontractor Agreements', parentId: '4', documentCount: 5, subfolders: [] },
          { id: '6', name: 'Vendor Contracts', parentId: '4', documentCount: 7, subfolders: [] }
        ]
      }
    ];

    setDocuments(mockDocuments);
    setFolders(mockFolders);
  }, []);

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="h-4 w-4 text-red-500" />;
      case 'image': return <Image className="h-4 w-4 text-blue-500" />;
      case 'video': return <FileVideo className="h-4 w-4 text-purple-500" />;
      case 'spreadsheet': return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
      default: return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'plans': return 'bg-blue-100 text-blue-800';
      case 'contracts': return 'bg-green-100 text-green-800';
      case 'permits': return 'bg-yellow-100 text-yellow-800';
      case 'photos': return 'bg-purple-100 text-purple-800';
      case 'reports': return 'bg-orange-100 text-orange-800';
      case 'safety': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleFileUpload = async () => {
    setLoading(true);
    try {
      // Simulate file upload
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast({
        title: "File Uploaded",
        description: "Document has been uploaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (document: Document) => {
    toast({
      title: "Download Started",
      description: `Downloading ${document.name}`,
    });
  };

  const handleShare = (document: Document) => {
    toast({
      title: "Share Link Generated",
      description: `Share link created for ${document.name}`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Document Management</h2>
          <p className="text-muted-foreground">Organize and manage project documents</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleFileUpload} disabled={loading}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
          <Button variant="outline">
            <Folder className="h-4 w-4 mr-2" />
            New Folder
          </Button>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border border-input bg-background rounded-md"
        >
          <option value="all">All Categories</option>
          <option value="plans">Plans</option>
          <option value="contracts">Contracts</option>
          <option value="permits">Permits</option>
          <option value="photos">Photos</option>
          <option value="reports">Reports</option>
          <option value="safety">Safety</option>
        </select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="folders">Folders</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          <div className="grid gap-4">
            {filteredDocuments.map((document) => (
              <Card key={document.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getFileIcon(document.type)}
                      <div>
                        <h3 className="font-medium">{document.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{formatFileSize(document.size)}</span>
                          <span>•</span>
                          <span>v{document.version}</span>
                          <span>•</span>
                          <span>{document.uploadedBy}</span>
                          <span>•</span>
                          <span>{document.uploadedAt.toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getCategoryColor(document.category)}>
                        {document.category}
                      </Badge>
                      <Badge variant={document.status === 'current' ? 'default' : 'secondary'}>
                        {document.status}
                      </Badge>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleDownload(document)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDownload(document)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleShare(document)}>
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  {document.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {document.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="folders" className="space-y-4">
          <div className="grid gap-4">
            {folders.map((folder) => (
              <Card key={folder.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Folder className="h-5 w-5 text-blue-500" />
                      <div>
                        <h3 className="font-medium">{folder.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {folder.documentCount} documents
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                  {folder.subfolders.length > 0 && (
                    <div className="ml-8 mt-3 space-y-2">
                      {folder.subfolders.map((subfolder) => (
                        <div key={subfolder.id} className="flex items-center gap-2 text-sm">
                          <Folder className="h-4 w-4 text-gray-400" />
                          <span>{subfolder.name}</span>
                          <span className="text-muted-foreground">({subfolder.documentCount})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <div className="grid gap-4">
            {documents
              .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
              .slice(0, 5)
              .map((document) => (
                <Card key={document.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getFileIcon(document.type)}
                        <div>
                          <h3 className="font-medium">{document.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Modified {document.uploadedAt.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};