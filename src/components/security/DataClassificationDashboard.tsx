import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Shield, 
  Eye, 
  EyeOff, 
  Lock, 
  Users, 
  Database, 
  FileText, 
  AlertTriangle,
  Check,
  X,
  Plus,
  Search,
  Filter,
  Download,
  Upload
} from 'lucide-react';

interface DataClassification {
  id: string;
  resource_type: string;
  resource_id: string;
  resource_name?: string;
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  data_types: string[];
  retention_period_months?: number;
  compliance_requirements: string[];
  created_at: string;
  updated_at: string;
}

interface AccessControlRule {
  id: string;
  resource_type: string;
  classification: string;
  role: string;
  permission_level: 'none' | 'read' | 'write' | 'admin' | 'full';
  approval_required: boolean;
  expires_at?: string;
  is_active: boolean;
}

interface DataAccessLog {
  id: string;
  user_id: string;
  resource_type: string;
  resource_id: string;
  resource_name?: string;
  data_classification: string;
  access_method: string;
  access_result: string;
  ip_address?: string;
  created_at: string;
}

export const DataClassificationDashboard = () => {
  const [activeTab, setActiveTab] = useState('classifications');
  const [classifications, setClassifications] = useState<DataClassification[]>([]);
  const [accessRules, setAccessRules] = useState<AccessControlRule[]>([]);
  const [accessLogs, setAccessLogs] = useState<DataAccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');

  // Mock data - in real implementation, this would come from Supabase
  useEffect(() => {
    const mockClassifications: DataClassification[] = [
      {
        id: '1',
        resource_type: 'database_table',
        resource_id: 'customers',
        resource_name: 'Customer Database',
        classification: 'confidential',
        data_types: ['PII', 'contact_information'],
        retention_period_months: 84,
        compliance_requirements: ['GDPR', 'CCPA'],
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z'
      },
      {
        id: '2',
        resource_type: 'document',
        resource_id: 'contracts',
        resource_name: 'Contract Documents',
        classification: 'restricted',
        data_types: ['financial', 'legal'],
        retention_period_months: 120,
        compliance_requirements: ['SOX', 'Legal Hold'],
        created_at: '2024-01-14T15:30:00Z',
        updated_at: '2024-01-14T15:30:00Z'
      },
      {
        id: '3',
        resource_type: 'database_table',
        resource_id: 'projects',
        resource_name: 'Project Information',
        classification: 'internal',
        data_types: ['business_data'],
        retention_period_months: 60,
        compliance_requirements: ['Internal Policy'],
        created_at: '2024-01-13T09:15:00Z',
        updated_at: '2024-01-13T09:15:00Z'
      }
    ];

    const mockAccessRules: AccessControlRule[] = [
      {
        id: '1',
        resource_type: 'database_table',
        classification: 'confidential',
        role: 'admin',
        permission_level: 'full',
        approval_required: false,
        is_active: true
      },
      {
        id: '2',
        resource_type: 'database_table',
        classification: 'confidential',
        role: 'project_manager',
        permission_level: 'read',
        approval_required: true,
        is_active: true
      },
      {
        id: '3',
        resource_type: 'document',
        classification: 'restricted',
        role: 'admin',
        permission_level: 'full',
        approval_required: false,
        is_active: true
      }
    ];

    const mockAccessLogs: DataAccessLog[] = [
      {
        id: '1',
        user_id: 'user-1',
        resource_type: 'database_table',
        resource_id: 'customers',
        resource_name: 'Customer Database',
        data_classification: 'confidential',
        access_method: 'view',
        access_result: 'success',
        ip_address: '192.168.1.100',
        created_at: '2024-01-19T14:30:00Z'
      },
      {
        id: '2',
        user_id: 'user-2',
        resource_type: 'document',
        resource_id: 'contracts',
        resource_name: 'Contract Documents',
        data_classification: 'restricted',
        access_method: 'download',
        access_result: 'denied',
        ip_address: '192.168.1.101',
        created_at: '2024-01-19T13:45:00Z'
      }
    ];

    setClassifications(mockClassifications);
    setAccessRules(mockAccessRules);
    setAccessLogs(mockAccessLogs);
    setLoading(false);
  }, []);

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'public': return 'default';
      case 'internal': return 'secondary';
      case 'confidential': return 'destructive';
      case 'restricted': return 'destructive';
      default: return 'outline';
    }
  };

  const getClassificationIcon = (classification: string) => {
    switch (classification) {
      case 'public': return <Eye className="h-4 w-4" />;
      case 'internal': return <Users className="h-4 w-4" />;
      case 'confidential': return <EyeOff className="h-4 w-4" />;
      case 'restricted': return <Lock className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const getPermissionColor = (level: string) => {
    switch (level) {
      case 'none': return 'destructive';
      case 'read': return 'secondary';
      case 'write': return 'default';
      case 'admin': return 'default';
      case 'full': return 'default';
      default: return 'outline';
    }
  };

  const filteredClassifications = classifications.filter(item => {
    const matchesSearch = item.resource_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.resource_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.resource_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterLevel === 'all' || item.classification === filterLevel;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Data Classification & Access Control</h2>
          <p className="text-muted-foreground">
            Manage data classification levels and access control policies
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Classification
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Data Classification</DialogTitle>
                <DialogDescription>
                  Classify a new data resource according to your security policies.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="resource_type">Resource Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select resource type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="database_table">Database Table</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                      <SelectItem value="file">File</SelectItem>
                      <SelectItem value="api_endpoint">API Endpoint</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="resource_id">Resource ID</Label>
                  <Input placeholder="Enter resource identifier" />
                </div>
                <div>
                  <Label htmlFor="classification">Classification Level</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select classification" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="internal">Internal</SelectItem>
                      <SelectItem value="confidential">Confidential</SelectItem>
                      <SelectItem value="restricted">Restricted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="data_types">Data Types</Label>
                  <Input placeholder="PII, Financial, Legal..." />
                </div>
                <div>
                  <Label htmlFor="retention">Retention Period (months)</Label>
                  <Input type="number" placeholder="24" />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline">Cancel</Button>
                  <Button>Save Classification</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Resources</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classifications.length}</div>
            <p className="text-xs text-muted-foreground">
              Classified data resources
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Restricted Data</CardTitle>
            <Lock className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {classifications.filter(c => c.classification === 'restricted').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Highest security level
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Access Rules</CardTitle>
            <Shield className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accessRules.length}</div>
            <p className="text-xs text-muted-foreground">
              Active access policies
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Access</CardTitle>
            <Eye className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accessLogs.length}</div>
            <p className="text-xs text-muted-foreground">
              Data access events
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="classifications">Data Classifications</TabsTrigger>
          <TabsTrigger value="access-control">Access Control</TabsTrigger>
          <TabsTrigger value="access-logs">Access Logs</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="classifications" className="space-y-4">
          {/* Search and Filter */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search resources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classifications</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="internal">Internal</SelectItem>
                <SelectItem value="confidential">Confidential</SelectItem>
                <SelectItem value="restricted">Restricted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Data Classifications</CardTitle>
              <CardDescription>
                Manage classification levels for your data resources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredClassifications.map((item) => (
                  <div key={item.id} className="flex items-center justify-between border rounded-lg p-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{item.resource_name || item.resource_id}</h4>
                          <Badge variant={getClassificationColor(item.classification) as any} className="flex items-center gap-1">
                            {getClassificationIcon(item.classification)}
                            {item.classification.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.resource_type} • {item.data_types.join(', ')}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>Retention: {item.retention_period_months} months</span>
                          <span>Compliance: {item.compliance_requirements.join(', ')}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button variant="outline" size="sm">
                        History
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access-control" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Access Control Matrix</CardTitle>
              <CardDescription>
                Define role-based access permissions for different data classifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {accessRules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between border rounded-lg p-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{rule.resource_type}</h4>
                          <Badge variant="outline">{rule.classification}</Badge>
                          <Badge variant="secondary">{rule.role}</Badge>
                          <Badge variant={getPermissionColor(rule.permission_level) as any}>
                            {rule.permission_level.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>Approval Required: {rule.approval_required ? 'Yes' : 'No'}</span>
                          <span>Status: {rule.is_active ? 'Active' : 'Inactive'}</span>
                          {rule.expires_at && <span>Expires: {new Date(rule.expires_at).toLocaleDateString()}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        Edit Rule
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                        Revoke
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access-logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Access Logs</CardTitle>
              <CardDescription>
                Monitor all data access activities for compliance and security
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {accessLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between border rounded-lg p-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {log.access_result === 'success' ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium">{log.resource_name || log.resource_id}</h4>
                          <Badge variant="outline">{log.data_classification}</Badge>
                          <Badge variant={log.access_result === 'success' ? 'default' : 'destructive'}>
                            {log.access_result.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {log.access_method} by {log.user_id} from {log.ip_address}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Status</CardTitle>
                <CardDescription>
                  Overview of compliance requirements adherence
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">GDPR Compliance</span>
                    <Badge variant="default">98% Complete</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">CCPA Compliance</span>
                    <Badge variant="default">95% Complete</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">SOX Compliance</span>
                    <Badge variant="secondary">92% Complete</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Data Retention Policies</span>
                    <Badge variant="default">100% Applied</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Assessment</CardTitle>
                <CardDescription>
                  Data security risk analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Unclassified Data</span>
                    <Badge variant="destructive">2 Resources</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Overdue Reviews</span>
                    <Badge variant="secondary">1 Item</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Access Violations</span>
                    <Badge variant="default">0 Today</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Overall Risk Score</span>
                    <Badge variant="default">Low</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};