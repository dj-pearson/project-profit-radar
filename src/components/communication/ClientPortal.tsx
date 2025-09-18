import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  FileText, 
  DollarSign, 
  Camera, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Download,
  Eye,
  MessageSquare
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ClientPortalProps {
  userProfile: any;
}

interface ProjectUpdate {
  id: string;
  title: string;
  content: string;
  created_at: string;
  photos: string[];
  progress_percentage: number;
  milestone: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  due_date: string;
  status: string;
  description: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  created_at: string;
  url: string;
}

export const ClientPortal: React.FC<ClientPortalProps> = ({ userProfile }) => {
  const [projectUpdates, setProjectUpdates] = useState<ProjectUpdate[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [projectOverview, setProjectOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClientData();
  }, [userProfile?.id]);

  const loadClientData = async () => {
    if (!userProfile?.company_id) return;

    try {
      // Load project overview (mock data for now)
      setProjectOverview({
        name: "Modern Office Renovation",
        completion_percentage: 65,
        start_date: "2024-01-15",
        end_date: "2024-06-30",
        budget: 150000,
        spent: 97500,
        status: "on_track",
        next_milestone: "Interior Finishing - Due March 15"
      });

      // Load recent project updates (mock data)
      setProjectUpdates([
        {
          id: "1",
          title: "Electrical Rough-In Complete",
          content: "All electrical rough-in work has been completed and passed inspection. We're ready to move forward with drywall installation.",
          created_at: "2024-01-10T10:00:00Z",
          photos: ["/placeholder-progress-1.jpg", "/placeholder-progress-2.jpg"],
          progress_percentage: 65,
          milestone: "Electrical Phase"
        },
        {
          id: "2", 
          title: "Plumbing Installation Progress",
          content: "Plumbing rough-in is 80% complete. All main lines installed, working on fixture connections.",
          created_at: "2024-01-08T14:30:00Z",
          photos: ["/placeholder-plumbing.jpg"],
          progress_percentage: 60,
          milestone: "Plumbing Phase"
        }
      ]);

      // Load invoices (mock data)
      setInvoices([
        {
          id: "1",
          invoice_number: "INV-2024-001",
          amount: 45000,
          due_date: "2024-02-15",
          status: "paid",
          description: "Foundation and Framing - Phase 1"
        },
        {
          id: "2",
          invoice_number: "INV-2024-002", 
          amount: 32500,
          due_date: "2024-03-01",
          status: "pending",
          description: "Electrical and Plumbing Rough-In - Phase 2"
        }
      ]);

      // Load documents (mock data)
      setDocuments([
        {
          id: "1",
          name: "Construction Contract.pdf",
          type: "pdf",
          size: 256000,
          created_at: "2024-01-01T00:00:00Z",
          url: "#"
        },
        {
          id: "2",
          name: "Building Permits.pdf",
          type: "pdf", 
          size: 128000,
          created_at: "2024-01-05T00:00:00Z",
          url: "#"
        }
      ]);

    } catch (error) {
      console.error('Error loading client data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track':
        return 'text-green-600 bg-green-100';
      case 'behind':
        return 'text-orange-600 bg-orange-100';
      case 'at_risk':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-orange-600 bg-orange-100';
      case 'overdue':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Project Overview */}
      {projectOverview && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{projectOverview.name}</CardTitle>
              <Badge className={getStatusColor(projectOverview.status)}>
                {projectOverview.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <h4 className="font-medium mb-2">Progress</h4>
                <Progress value={projectOverview.completion_percentage} className="mb-2" />
                <p className="text-sm text-muted-foreground">
                  {projectOverview.completion_percentage}% Complete
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Budget</h4>
                <p className="text-lg font-semibold">
                  {formatCurrency(projectOverview.spent)} / {formatCurrency(projectOverview.budget)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {Math.round((projectOverview.spent / projectOverview.budget) * 100)}% Used
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Timeline</h4>
                <p className="text-sm">
                  Start: {new Date(projectOverview.start_date).toLocaleDateString()}
                </p>
                <p className="text-sm">
                  End: {new Date(projectOverview.end_date).toLocaleDateString()}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Next Milestone</h4>
                <p className="text-sm">{projectOverview.next_milestone}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="updates" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="updates">Updates</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
        </TabsList>

        <TabsContent value="updates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Project Updates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {projectUpdates.map((update) => (
                  <div key={update.id} className="border-b pb-6 last:border-b-0">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{update.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
                          • {update.milestone}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {update.progress_percentage}% Complete
                      </Badge>
                    </div>
                    
                    <p className="text-sm mb-4">{update.content}</p>
                    
                    {update.photos.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {update.photos.map((photo, index) => (
                          <div key={index} className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                            <Camera className="h-6 w-6 text-muted-foreground" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Invoices & Billing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{invoice.invoice_number}</h4>
                      <p className="text-sm text-muted-foreground">{invoice.description}</p>
                      <p className="text-sm text-muted-foreground">
                        Due: {new Date(invoice.due_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(invoice.amount)}</p>
                      <Badge className={getInvoiceStatusColor(invoice.status)}>
                        {invoice.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Project Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <h4 className="font-medium">{doc.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {(doc.size / 1024).toFixed(1)} KB • {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="photos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Project Photos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                    <Camera className="h-8 w-8 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start">
            <MessageSquare className="h-4 w-4 mr-2" />
            Send Message to Project Manager
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Site Visit
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Report an Issue
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};