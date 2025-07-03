import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  FileText, 
  Shield, 
  Edit, 
  Eye, 
  Clock, 
  CheckCircle2,
  AlertTriangle,
  Save,
  History
} from 'lucide-react';

interface LegalDocument {
  id: string;
  type: 'terms_of_service' | 'privacy_policy' | 'cookie_policy' | 'data_processing';
  title: string;
  content: string;
  version: string;
  status: 'draft' | 'published' | 'archived';
  effective_date: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  approved_by?: string;
  approval_date?: string;
}

interface DocumentVersion {
  id: string;
  document_id: string;
  version: string;
  content: string;
  created_at: string;
  created_by: string;
  changes_summary: string;
}

const TermsPrivacyManager = () => {
  const { userProfile } = useAuth();
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<LegalDocument | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLegalDocuments();
  }, []);

  const loadLegalDocuments = async () => {
    try {
      // Mock legal documents data
      const mockDocuments: LegalDocument[] = [
        {
          id: '1',
          type: 'terms_of_service',
          title: 'Terms of Service',
          content: `# Terms of Service for BuildDesk

## 1. Acceptance of Terms
By accessing and using BuildDesk, you accept and agree to be bound by the terms and provision of this agreement.

## 2. Service Description
BuildDesk provides construction management software solutions including project management, financial tracking, and team collaboration tools.

## 3. User Responsibilities
- Maintain accurate account information
- Use the service in compliance with applicable laws
- Protect login credentials
- Report security vulnerabilities

## 4. Data Protection
We are committed to protecting your data in accordance with applicable privacy laws and regulations.

## 5. Service Availability
While we strive for 99.9% uptime, we cannot guarantee uninterrupted service availability.

## 6. Limitation of Liability
BuildDesk shall not be liable for any indirect, incidental, special, consequential, or punitive damages.

## 7. Changes to Terms
We reserve the right to modify these terms at any time with appropriate notice to users.

Last updated: ${new Date().toLocaleDateString()}`,
          version: '2.1',
          status: 'published',
          effective_date: new Date().toISOString(),
          created_at: new Date(Date.now() - 86400000).toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'Legal Team',
          approved_by: 'Admin',
          approval_date: new Date().toISOString()
        },
        {
          id: '2',
          type: 'privacy_policy',
          title: 'Privacy Policy',
          content: `# Privacy Policy for BuildDesk

## 1. Information We Collect
- Account information (name, email, company details)
- Project data and files uploaded by users
- Usage analytics and system logs
- Payment and billing information

## 2. How We Use Information
- Provide and improve our services
- Process payments and billing
- Send important service updates
- Ensure system security and compliance

## 3. Information Sharing
We do not sell personal information. We may share data with:
- Service providers and vendors
- Legal authorities when required by law
- Business partners with your consent

## 4. Data Security
We implement industry-standard security measures including:
- Encryption in transit and at rest
- Regular security audits
- Access controls and monitoring
- Secure data centers

## 5. Your Rights
You have the right to:
- Access your personal data
- Correct inaccurate information
- Delete your account and data
- Export your data

## 6. Data Retention
We retain data as long as your account is active or as needed to provide services.

## 7. Contact Information
For privacy questions, contact: privacy@builddesk.com

Last updated: ${new Date().toLocaleDateString()}`,
          version: '3.0',
          status: 'published',
          effective_date: new Date().toISOString(),
          created_at: new Date(Date.now() - 172800000).toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'Legal Team',
          approved_by: 'Admin',
          approval_date: new Date().toISOString()
        },
        {
          id: '3',
          type: 'cookie_policy',
          title: 'Cookie Policy',
          content: `# Cookie Policy

## What Are Cookies
Cookies are small text files stored on your device when you visit our website.

## Types of Cookies We Use
- Essential cookies for basic functionality
- Analytics cookies to understand usage patterns
- Preference cookies to remember your settings

## Managing Cookies
You can control cookies through your browser settings or our cookie consent manager.

Last updated: ${new Date().toLocaleDateString()}`,
          version: '1.5',
          status: 'draft',
          effective_date: new Date(Date.now() + 86400000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: userProfile?.first_name + ' ' + userProfile?.last_name || 'User'
        }
      ];

      setDocuments(mockDocuments);
    } catch (error) {
      console.error('Error loading legal documents:', error);
    }
  };

  const saveDocument = async () => {
    if (!selectedDocument) return;
    
    setLoading(true);
    try {
      // Update document content and create new version
      const updatedDocument = {
        ...selectedDocument,
        content: editContent,
        version: incrementVersion(selectedDocument.version),
        updated_at: new Date().toISOString(),
        status: 'draft' as const
      };

      setDocuments(prev => prev.map(doc => 
        doc.id === selectedDocument.id ? updatedDocument : doc
      ));

      // Create version history entry
      const newVersion: DocumentVersion = {
        id: Date.now().toString(),
        document_id: selectedDocument.id,
        version: updatedDocument.version,
        content: editContent,
        created_at: new Date().toISOString(),
        created_by: userProfile?.first_name + ' ' + userProfile?.last_name || 'User',
        changes_summary: 'Content updated'
      };

      setVersions(prev => [newVersion, ...prev]);
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Error saving document:', error);
    } finally {
      setLoading(false);
    }
  };

  const publishDocument = async (documentId: string) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === documentId 
        ? { 
            ...doc, 
            status: 'published',
            approved_by: userProfile?.first_name + ' ' + userProfile?.last_name || 'Admin',
            approval_date: new Date().toISOString(),
            effective_date: new Date().toISOString()
          }
        : doc
    ));
  };

  const incrementVersion = (version: string): string => {
    const parts = version.split('.');
    const minor = parseInt(parts[1] || '0') + 1;
    return `${parts[0]}.${minor}`;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-yellow-100 text-yellow-800',
      published: 'bg-green-100 text-green-800',
      archived: 'bg-gray-100 text-gray-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getDocumentIcon = (type: string) => {
    const icons = {
      terms_of_service: FileText,
      privacy_policy: Shield,
      cookie_policy: Eye,
      data_processing: FileText
    };
    return icons[type as keyof typeof icons] || FileText;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <h2 className="text-2xl font-semibold">Legal Documents Manager</h2>
        </div>
        <Button>
          <Edit className="h-4 w-4 mr-2" />
          Create Document
        </Button>
      </div>

      {/* Document Cards */}
      <div className="grid gap-6">
        {documents.map((document) => {
          const DocIcon = getDocumentIcon(document.type);
          
          return (
            <Card key={document.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <DocIcon className="h-6 w-6" />
                    <div>
                      <CardTitle>{document.title}</CardTitle>
                      <CardDescription>
                        Version {document.version} • 
                        Updated {new Date(document.updated_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(document.status)}>
                      {document.status}
                    </Badge>
                    {document.status === 'published' && (
                      <Badge variant="outline">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Live
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="prose prose-sm max-w-none">
                    <div className="bg-muted p-3 rounded text-sm max-h-32 overflow-hidden">
                      {document.content.substring(0, 200)}...
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-medium">Created By</p>
                      <p className="text-muted-foreground">{document.created_by}</p>
                    </div>
                    <div>
                      <p className="font-medium">Effective Date</p>
                      <p className="text-muted-foreground">
                        {new Date(document.effective_date).toLocaleDateString()}
                      </p>
                    </div>
                    {document.approved_by && (
                      <div>
                        <p className="font-medium">Approved By</p>
                        <p className="text-muted-foreground">{document.approved_by}</p>
                      </div>
                    )}
                    <div>
                      <p className="font-medium">Status</p>
                      <p className="text-muted-foreground capitalize">{document.status}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedDocument(document);
                        setEditContent(document.content);
                        setEditDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedDocument(document);
                        setVersionDialogOpen(true);
                      }}
                    >
                      <History className="h-4 w-4 mr-2" />
                      History
                    </Button>
                    {document.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={() => publishDocument(document.id)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Publish
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Document Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Edit {selectedDocument?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Current version: {selectedDocument?.version}
              </p>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[400px] font-mono text-sm"
                placeholder="Enter document content in Markdown format..."
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveDocument} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={versionDialogOpen} onOpenChange={setVersionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Version History - {selectedDocument?.title}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {versions
                .filter(v => v.document_id === selectedDocument?.id)
                .map((version) => (
                  <div key={version.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">v{version.version}</Badge>
                        <span className="text-sm font-medium">{version.changes_summary}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(version.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      By {version.created_by}
                    </p>
                  </div>
                ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TermsPrivacyManager;