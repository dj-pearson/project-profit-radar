import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, Calendar, AlertTriangle, CheckCircle, Clock, 
  Building, Users, Phone, Mail, MapPin, ExternalLink
} from 'lucide-react';

interface Permit {
  id: string;
  type: 'building' | 'electrical' | 'plumbing' | 'mechanical' | 'demolition' | 'excavation' | 'environmental';
  permitNumber: string;
  projectId: string;
  projectName: string;
  description: string;
  status: 'planning' | 'submitted' | 'under_review' | 'approved' | 'issued' | 'rejected' | 'expired';
  applicationDate: Date;
  submissionDate?: Date;
  approvalDate?: Date;
  issueDate?: Date;
  expirationDate?: Date;
  renewalDate?: Date;
  issuingAgency: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  fees: number;
  estimatedValue: number;
  address: string;
  requirements: string[];
  documents: string[];
  inspections: Inspection[];
  notes: string;
}

interface Inspection {
  id: string;
  permitId: string;
  type: string;
  scheduledDate: Date;
  completedDate?: Date;
  status: 'scheduled' | 'passed' | 'failed' | 'cancelled';
  inspector: string;
  notes?: string;
  failureReasons?: string[];
  nextInspectionDate?: Date;
}

interface RegulatoryRequirement {
  id: string;
  category: 'safety' | 'environmental' | 'zoning' | 'accessibility' | 'structural';
  title: string;
  description: string;
  applicableProjects: string[];
  dueDate?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'non_applicable';
  priority: 'low' | 'medium' | 'high' | 'critical';
  documents: string[];
  assignedTo?: string;
  completionDate?: Date;
  notes?: string;
}

export const PermitRegulatorySystem: React.FC = () => {
  const [permits, setPermits] = useState<Permit[]>([
    {
      id: '1',
      type: 'building',
      permitNumber: 'BP-2024-001',
      projectId: 'proj-001',
      projectName: 'Downtown Office Building',
      description: 'Construction of 5-story office building',
      status: 'approved',
      applicationDate: new Date('2024-01-05'),
      submissionDate: new Date('2024-01-10'),
      approvalDate: new Date('2024-01-25'),
      issueDate: new Date('2024-01-30'),
      expirationDate: new Date('2025-01-30'),
      issuingAgency: 'City Planning Department',
      contactPerson: 'John Smith',
      contactPhone: '(555) 123-4567',
      contactEmail: 'j.smith@cityplanning.gov',
      fees: 2500,
      estimatedValue: 850000,
      address: '123 Main Street, Downtown',
      requirements: [
        'Structural engineering plans',
        'Fire safety compliance',
        'ADA accessibility features',
        'Environmental impact assessment'
      ],
      documents: [
        'Building Plans.pdf',
        'Structural Calculations.pdf',
        'Fire Safety Plan.pdf'
      ],
      inspections: [
        {
          id: 'i1',
          permitId: '1',
          type: 'Foundation',
          scheduledDate: new Date('2024-02-15'),
          status: 'scheduled',
          inspector: 'Mike Johnson'
        }
      ],
      notes: 'Expedited review requested and approved'
    },
    {
      id: '2',
      type: 'electrical',
      permitNumber: 'EP-2024-015',
      projectId: 'proj-001',
      projectName: 'Downtown Office Building',
      description: 'Electrical installation and wiring',
      status: 'under_review',
      applicationDate: new Date('2024-01-15'),
      submissionDate: new Date('2024-01-20'),
      issuingAgency: 'Electrical Safety Authority',
      contactPerson: 'Sarah Davis',
      contactPhone: '(555) 234-5678',
      contactEmail: 's.davis@electrical.gov',
      fees: 750,
      estimatedValue: 125000,
      address: '123 Main Street, Downtown',
      requirements: [
        'Licensed electrician certification',
        'Load calculations',
        'Panel schedule',
        'Grounding plan'
      ],
      documents: [
        'Electrical Plans.pdf',
        'Load Calculations.pdf'
      ],
      inspections: [],
      notes: 'Waiting for load calculation review'
    }
  ]);

  const [requirements, setRequirements] = useState<RegulatoryRequirement[]>([
    {
      id: '1',
      category: 'safety',
      title: 'OSHA Safety Training Compliance',
      description: 'All workers must complete OSHA 30-hour construction safety training',
      applicableProjects: ['proj-001', 'proj-002'],
      dueDate: new Date('2024-03-01'),
      status: 'in_progress',
      priority: 'high',
      documents: ['Safety Training Records.pdf'],
      assignedTo: 'Safety Manager',
      notes: '15 of 25 workers completed training'
    },
    {
      id: '2',
      category: 'environmental',
      title: 'Environmental Impact Assessment',
      description: 'Submit environmental impact study for downtown project',
      applicableProjects: ['proj-001'],
      dueDate: new Date('2024-02-15'),
      status: 'completed',
      priority: 'critical',
      documents: ['Environmental Study.pdf', 'Mitigation Plan.pdf'],
      completionDate: new Date('2024-02-10'),
      notes: 'Approved with minor conditions'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredPermits = permits.filter(permit => {
    const matchesSearch = permit.permitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         permit.projectName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || permit.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: Permit['status']) => {
    switch (status) {
      case 'planning': return 'outline';
      case 'submitted': return 'secondary';
      case 'under_review': return 'default';
      case 'approved': return 'secondary';
      case 'issued': return 'default';
      case 'rejected': return 'destructive';
      case 'expired': return 'destructive';
      default: return 'outline';
    }
  };

  const getTypeIcon = (type: Permit['type']) => {
    switch (type) {
      case 'building': return <Building className="h-4 w-4" />;
      case 'electrical': return <Clock className="h-4 w-4" />;
      case 'plumbing': return <CheckCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: RegulatoryRequirement['priority']) => {
    switch (priority) {
      case 'low': return 'outline';
      case 'medium': return 'secondary';
      case 'high': return 'default';
      case 'critical': return 'destructive';
      default: return 'outline';
    }
  };

  const renderPermitCard = (permit: Permit) => {
    const daysUntilExpiration = permit.expirationDate ? 
      Math.ceil((permit.expirationDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : null;

    return (
      <Card key={permit.id} className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {getTypeIcon(permit.type)}
              <h4 className="font-medium">{permit.permitNumber}</h4>
            </div>
            <p className="text-sm text-muted-foreground">{permit.projectName}</p>
            <p className="text-xs text-muted-foreground">{permit.description}</p>
          </div>
          
          <div className="flex flex-col items-end gap-1">
            <Badge variant={getStatusColor(permit.status)}>
              {permit.status.replace('_', ' ')}
            </Badge>
            {daysUntilExpiration && daysUntilExpiration <= 30 && (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {daysUntilExpiration}d left
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-sm">
            <Building className="h-3 w-3" />
            <span>{permit.issuingAgency}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-3 w-3" />
            <span>{permit.address}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-3 w-3" />
            <span>{permit.contactPerson}</span>
          </div>
          {permit.issueDate && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-3 w-3" />
              <span>Issued: {permit.issueDate.toLocaleDateString()}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Fees:</span>
            <span className="font-medium">${permit.fees.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Project Value:</span>
            <span className="font-medium">${permit.estimatedValue.toLocaleString()}</span>
          </div>
          {permit.expirationDate && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Expires:</span>
              <span className="font-medium">{permit.expirationDate.toLocaleDateString()}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="outline">
            <Calendar className="h-3 w-3 mr-1" />
            Schedule
          </Button>
          <Button size="sm" variant="ghost">
            <ExternalLink className="h-3 w-3 mr-1" />
            Details
          </Button>
        </div>
      </Card>
    );
  };

  const renderRequirementCard = (req: RegulatoryRequirement) => {
    const isOverdue = req.dueDate && req.dueDate < new Date() && req.status !== 'completed';
    
    return (
      <Card key={req.id} className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <h4 className="font-medium">{req.title}</h4>
            <p className="text-sm text-muted-foreground">{req.description}</p>
          </div>
          
          <div className="flex flex-col items-end gap-1">
            <Badge variant={getPriorityColor(req.priority)}>
              {req.priority}
            </Badge>
            {isOverdue && (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Overdue
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Category:</span>
            <span className="capitalize">{req.category}</span>
          </div>
          {req.dueDate && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-3 w-3" />
              <span>Due: {req.dueDate.toLocaleDateString()}</span>
            </div>
          )}
          {req.assignedTo && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-3 w-3" />
              <span>Assigned to: {req.assignedTo}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="outline">
            Update Status
          </Button>
          <Button size="sm" variant="ghost">
            View Details
          </Button>
        </div>
      </Card>
    );
  };

  // Calculate statistics
  const totalPermits = permits.length;
  const activePermits = permits.filter(p => ['submitted', 'under_review', 'approved', 'issued'].includes(p.status)).length;
  const expiringSoon = permits.filter(p => {
    if (!p.expirationDate) return false;
    const days = Math.ceil((p.expirationDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    return days <= 30 && days > 0;
  }).length;
  const totalFees = permits.reduce((sum, permit) => sum + permit.fees, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Permits & Regulatory Compliance</h2>
          <p className="text-muted-foreground">
            Manage permits, track regulatory requirements, and ensure compliance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Inspection
          </Button>
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            Apply for Permit
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Permits</p>
                <p className="text-2xl font-bold">{totalPermits}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Permits</p>
                <p className="text-2xl font-bold text-green-600">{activePermits}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expiring Soon</p>
                <p className="text-2xl font-bold text-orange-500">{expiringSoon}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Fees</p>
                <p className="text-2xl font-bold">${totalFees.toLocaleString()}</p>
              </div>
              <Building className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <Input
              placeholder="Search permits..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Statuses</option>
              <option value="planning">Planning</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="issued">Issued</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="permits" className="space-y-4">
        <TabsList>
          <TabsTrigger value="permits">Permits</TabsTrigger>
          <TabsTrigger value="inspections">Inspections</TabsTrigger>
          <TabsTrigger value="requirements">Regulatory Requirements</TabsTrigger>
          <TabsTrigger value="calendar">Compliance Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="permits">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPermits.map(renderPermitCard)}
          </div>
        </TabsContent>

        <TabsContent value="inspections">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Inspections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Inspection scheduling and tracking coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requirements">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Regulatory Requirements</h3>
              <Button>Add Requirement</Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {requirements.map(renderRequirementCard)}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Interactive compliance calendar with deadlines and reminders coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};