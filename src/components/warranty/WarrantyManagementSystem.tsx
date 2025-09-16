import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, Calendar, AlertTriangle, CheckCircle, Clock, 
  Phone, Mail, FileText, Wrench, User
} from 'lucide-react';

interface Warranty {
  id: string;
  projectId: string;
  projectName: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  warrantyType: 'workmanship' | 'materials' | 'structural' | 'systems' | 'comprehensive';
  category: string;
  description: string;
  startDate: Date;
  endDate: Date;
  durationMonths: number;
  status: 'active' | 'expired' | 'voided' | 'transferred';
  coverage: string[];
  exclusions: string[];
  terms: string;
  responsibleParty: string;
  transferredTo?: string;
  transferDate?: Date;
  notes?: string;
}

interface WarrantyClaim {
  id: string;
  warrantyId: string;
  claimNumber: string;
  claimType: 'defect' | 'failure' | 'damage' | 'malfunction';
  description: string;
  reportedDate: Date;
  reportedBy: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'submitted' | 'investigating' | 'approved' | 'in_progress' | 'completed' | 'rejected';
  assignedTo?: string;
  estimatedCost: number;
  actualCost?: number;
  completionDate?: Date;
  photos: string[];
  documents: string[];
  resolution?: string;
  clientSatisfaction?: number;
  followUpRequired: boolean;
  followUpDate?: Date;
}

interface ServiceCall {
  id: string;
  claimId?: string;
  warrantyId: string;
  serviceType: 'inspection' | 'repair' | 'replacement' | 'maintenance';
  scheduledDate: Date;
  completedDate?: Date;
  technician: string;
  duration: number;
  cost: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  workPerformed: string;
  partsUsed: string[];
  followUpRequired: boolean;
  clientSignature?: string;
  notes?: string;
}

export const WarrantyManagementSystem: React.FC = () => {
  const [warranties, setWarranties] = useState<Warranty[]>([
    {
      id: '1',
      projectId: 'proj-001',
      projectName: 'Downtown Office Building',
      clientName: 'ABC Corporation',
      clientEmail: 'contact@abc-corp.com',
      clientPhone: '(555) 123-4567',
      warrantyType: 'comprehensive',
      category: 'Commercial Construction',
      description: 'Full building warranty including structural, systems, and workmanship',
      startDate: new Date('2024-01-30'),
      endDate: new Date('2026-01-30'),
      durationMonths: 24,
      status: 'active',
      coverage: [
        'Structural elements',
        'HVAC systems', 
        'Electrical systems',
        'Plumbing systems',
        'Roofing and waterproofing',
        'Workmanship defects'
      ],
      exclusions: [
        'Normal wear and tear',
        'Damage from natural disasters',
        'Modifications by others',
        'Lack of proper maintenance'
      ],
      terms: 'Standard 24-month comprehensive warranty with immediate response for critical issues',
      responsibleParty: 'BuildDesk Construction',
      notes: 'Premium client - priority service required'
    },
    {
      id: '2',
      projectId: 'proj-002',
      projectName: 'Residential Renovation',
      clientName: 'John and Jane Smith',
      clientEmail: 'smith.family@email.com',
      clientPhone: '(555) 234-5678',
      warrantyType: 'workmanship',
      category: 'Residential',
      description: 'Kitchen and bathroom renovation warranty',
      startDate: new Date('2023-12-15'),
      endDate: new Date('2024-12-15'),
      durationMonths: 12,
      status: 'active',
      coverage: [
        'Cabinetry installation',
        'Plumbing fixtures',
        'Tile work',
        'Electrical work',
        'Paint and finishes'
      ],
      exclusions: [
        'Appliance warranties (covered by manufacturer)',
        'Natural stone variations',
        'Normal settling'
      ],
      terms: 'One-year workmanship warranty with 30-day callback guarantee',
      responsibleParty: 'BuildDesk Construction'
    }
  ]);

  const [claims, setClaims] = useState<WarrantyClaim[]>([
    {
      id: '1',
      warrantyId: '1',
      claimNumber: 'WC-2024-001',
      claimType: 'defect',
      description: 'HVAC system not maintaining consistent temperature in conference room',
      reportedDate: new Date('2024-01-20'),
      reportedBy: 'ABC Corporation Facilities Manager',
      priority: 'medium',
      status: 'investigating',
      assignedTo: 'Mike Johnson - HVAC Specialist',
      estimatedCost: 1200,
      photos: ['hvac_issue_1.jpg', 'hvac_issue_2.jpg'],
      documents: ['HVAC_specs.pdf'],
      followUpRequired: true,
      followUpDate: new Date('2024-02-05')
    },
    {
      id: '2',
      warrantyId: '2',
      claimNumber: 'WC-2024-002',
      claimType: 'defect',
      description: 'Kitchen faucet leaking at base connection',
      reportedDate: new Date('2024-01-18'),
      reportedBy: 'Jane Smith',
      priority: 'high',
      status: 'completed',
      assignedTo: 'Tom Wilson - Plumber',
      estimatedCost: 150,
      actualCost: 125,
      completionDate: new Date('2024-01-19'),
      resolution: 'Replaced faulty O-ring and tightened connections',
      clientSatisfaction: 5,
      followUpRequired: false,
      photos: ['faucet_before.jpg', 'faucet_after.jpg'],
      documents: ['warranty_claim_form.pdf']
    }
  ]);

  const [serviceCalls, setServiceCalls] = useState<ServiceCall[]>([
    {
      id: '1',
      claimId: '1',
      warrantyId: '1',
      serviceType: 'inspection',
      scheduledDate: new Date('2024-01-25'),
      technician: 'Mike Johnson',
      duration: 2,
      cost: 0,
      status: 'scheduled',
      workPerformed: 'Initial HVAC system inspection and diagnosis',
      partsUsed: [],
      followUpRequired: true,
      notes: 'Scheduled for detailed system analysis'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredWarranties = warranties.filter(warranty => {
    const matchesSearch = warranty.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         warranty.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || warranty.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: Warranty['status']) => {
    switch (status) {
      case 'active': return 'default';
      case 'expired': return 'secondary';
      case 'voided': return 'destructive';
      case 'transferred': return 'outline';
      default: return 'outline';
    }
  };

  const getClaimStatusColor = (status: WarrantyClaim['status']) => {
    switch (status) {
      case 'submitted': return 'outline';
      case 'investigating': return 'secondary';
      case 'approved': return 'default';
      case 'in_progress': return 'secondary';
      case 'completed': return 'default';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const getPriorityColor = (priority: WarrantyClaim['priority']) => {
    switch (priority) {
      case 'low': return 'outline';
      case 'medium': return 'secondary';
      case 'high': return 'default';
      case 'urgent': return 'destructive';
      default: return 'outline';
    }
  };

  const getDaysRemaining = (endDate: Date) => {
    const now = new Date();
    const days = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
    return Math.max(0, days);
  };

  const getWarrantyProgress = (warranty: Warranty) => {
    const totalDays = Math.ceil((warranty.endDate.getTime() - warranty.startDate.getTime()) / (1000 * 3600 * 24));
    const elapsedDays = Math.ceil((new Date().getTime() - warranty.startDate.getTime()) / (1000 * 3600 * 24));
    return Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
  };

  const renderWarrantyCard = (warranty: Warranty) => {
    const daysRemaining = getDaysRemaining(warranty.endDate);
    const progress = getWarrantyProgress(warranty);
    const isExpiringSoon = daysRemaining <= 30 && warranty.status === 'active';

    return (
      <Card key={warranty.id} className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4" />
              <h4 className="font-medium">{warranty.projectName}</h4>
            </div>
            <p className="text-sm text-muted-foreground">{warranty.clientName}</p>
            <p className="text-xs text-muted-foreground capitalize">{warranty.warrantyType} warranty</p>
          </div>
          
          <div className="flex flex-col items-end gap-1">
            <Badge variant={getStatusColor(warranty.status)}>
              {warranty.status}
            </Badge>
            {isExpiringSoon && (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {daysRemaining}d left
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-3 w-3" />
            <span>Until {warranty.endDate.toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <User className="h-3 w-3" />
            <span>{warranty.responsibleParty}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Coverage:</span>
            <p className="text-xs mt-1">{warranty.coverage.slice(0, 2).join(', ')} 
              {warranty.coverage.length > 2 && ` +${warranty.coverage.length - 2} more`}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Warranty Period</span>
            <span>{daysRemaining} days remaining</span>
          </div>
          <Progress value={progress} className="h-2" />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Started: {warranty.startDate.toLocaleDateString()}</span>
            <span>{warranty.durationMonths} months</span>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="outline">
            <FileText className="h-3 w-3 mr-1" />
            New Claim
          </Button>
          <Button size="sm" variant="ghost">
            Details
          </Button>
        </div>
      </Card>
    );
  };

  const renderClaimCard = (claim: WarrantyClaim) => {
    const warranty = warranties.find(w => w.id === claim.warrantyId);
    
    return (
      <Card key={claim.id} className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Wrench className="h-4 w-4" />
              <h4 className="font-medium">{claim.claimNumber}</h4>
            </div>
            <p className="text-sm text-muted-foreground">{warranty?.projectName}</p>
            <p className="text-xs text-muted-foreground">{claim.description}</p>
          </div>
          
          <div className="flex flex-col items-end gap-1">
            <Badge variant={getClaimStatusColor(claim.status)}>
              {claim.status.replace('_', ' ')}
            </Badge>
            <Badge variant={getPriorityColor(claim.priority)}>
              {claim.priority}
            </Badge>
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-3 w-3" />
            <span>Reported: {claim.reportedDate.toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <User className="h-3 w-3" />
            <span>{claim.reportedBy}</span>
          </div>
          {claim.assignedTo && (
            <div className="flex items-center gap-2 text-sm">
              <Wrench className="h-3 w-3" />
              <span>Assigned: {claim.assignedTo}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Estimated Cost:</span>
            <span className="font-medium">${claim.estimatedCost.toLocaleString()}</span>
          </div>
          {claim.actualCost && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Actual Cost:</span>
              <span className="font-medium">${claim.actualCost.toLocaleString()}</span>
            </div>
          )}
          {claim.clientSatisfaction && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Satisfaction:</span>
              <span className="font-medium">{claim.clientSatisfaction}/5 ⭐</span>
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
  const activeWarranties = warranties.filter(w => w.status === 'active').length;
  const expiringSoon = warranties.filter(w => {
    const days = getDaysRemaining(w.endDate);
    return days <= 60 && w.status === 'active';
  }).length;
  const openClaims = claims.filter(c => !['completed', 'rejected'].includes(c.status)).length;
  const avgResponseTime = 2.5; // This would be calculated from actual data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Warranty Management</h2>
          <p className="text-muted-foreground">
            Track warranties, manage claims, and maintain client relationships
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Service
          </Button>
          <Button>
            <Shield className="h-4 w-4 mr-2" />
            New Warranty
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Warranties</p>
                <p className="text-2xl font-bold">{activeWarranties}</p>
              </div>
              <Shield className="h-8 w-8 text-green-600" />
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
                <p className="text-sm text-muted-foreground">Open Claims</p>
                <p className="text-2xl font-bold">{openClaims}</p>
              </div>
              <Wrench className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Response</p>
                <p className="text-2xl font-bold">{avgResponseTime}d</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <Input
              placeholder="Search warranties..."
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
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="voided">Voided</option>
              <option value="transferred">Transferred</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="warranties" className="space-y-4">
        <TabsList>
          <TabsTrigger value="warranties">Warranties</TabsTrigger>
          <TabsTrigger value="claims">Claims</TabsTrigger>
          <TabsTrigger value="services">Service Calls</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="warranties">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredWarranties.map(renderWarrantyCard)}
          </div>
        </TabsContent>

        <TabsContent value="claims">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Warranty Claims</h3>
              <Button>Create New Claim</Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {claims.map(renderClaimCard)}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="services">
          <Card>
            <CardHeader>
              <CardTitle>Service Calls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Service call scheduling and tracking interface coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Warranty Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Claim Resolution Rate</span>
                    <span className="font-medium">94%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Response Time</span>
                    <span className="font-medium">{avgResponseTime} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Client Satisfaction</span>
                    <span className="font-medium">4.6/5</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Warranty Cost Rate</span>
                    <span className="font-medium">2.1%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Warranty cost trends and analysis coming soon
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};