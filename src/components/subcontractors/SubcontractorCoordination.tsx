import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Shield, Star, Calendar, FileText, AlertTriangle, CheckCircle, Clock, DollarSign, TrendingUp, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, differenceInDays, isBefore } from 'date-fns';

interface Insurance {
  type: 'general_liability' | 'workers_comp' | 'professional' | 'auto' | 'umbrella';
  provider: string;
  policyNumber: string;
  coverageAmount: number;
  effectiveDate: string;
  expirationDate: string;
  status: 'active' | 'expired' | 'expiring_soon';
  certificateUrl?: string;
}

interface License {
  type: string;
  number: string;
  state: string;
  issueDate: string;
  expirationDate: string;
  status: 'active' | 'expired' | 'expiring_soon';
  verificationDate?: string;
}

interface PerformanceMetrics {
  overallRating: number;
  qualityScore: number;
  timelinessScore: number;
  safetyScore: number;
  communicationScore: number;
  totalProjects: number;
  completedOnTime: number;
  onTimePercentage: number;
  averageQualityRating: number;
  safetyIncidents: number;
  changeOrderFrequency: number;
  paymentReliability: number;
  lastEvaluationDate: string;
}

interface ProjectAssignment {
  id: string;
  projectId: string;
  projectName: string;
  workDescription: string;
  startDate: string;
  endDate: string;
  contractAmount: number;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled' | 'delayed';
  completionPercentage: number;
  qualityRating?: number;
  timelinessRating?: number;
  notes?: string;
}

interface Subcontractor {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  trades: string[];
  businessLicense: string;
  taxId: string;
  status: 'active' | 'inactive' | 'blacklisted' | 'pending_approval';
  onboardingDate: string;
  lastActiveDate: string;
  insurances: Insurance[];
  licenses: License[];
  performanceMetrics: PerformanceMetrics;
  currentAssignments: ProjectAssignment[];
  paymentInfo: {
    preferredMethod: 'check' | 'ach' | 'wire';
    paymentTerms: string;
    totalPaid: number;
    outstandingBalance: number;
    lastPaymentDate?: string;
  };
  documents: {
    w9Form?: string;
    contractTemplate?: string;
    safetyManual?: string;
    emergencyContacts?: string;
  };
  portal: {
    hasAccess: boolean;
    lastLogin?: string;
    invitationSent?: string;
    activationStatus: 'pending' | 'active' | 'suspended';
  };
}

interface ScheduleConflict {
  subcontractorId: string;
  projectId: string;
  conflictDate: string;
  type: 'overlap' | 'resource_conflict' | 'availability';
  description: string;
}

export const SubcontractorCoordination: React.FC = () => {
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [selectedSubcontractor, setSelectedSubcontractor] = useState<Subcontractor | null>(null);
  const [scheduleConflicts, setScheduleConflicts] = useState<ScheduleConflict[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTrade, setFilterTrade] = useState<string>('all');
  const [showPortalForm, setShowPortalForm] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  useEffect(() => {
    loadSubcontractors();
    checkScheduleConflicts();
  }, []);

  const loadSubcontractors = () => {
    // Mock subcontractor data
    const mockSubs: Subcontractor[] = [
      {
        id: '1',
        companyName: 'ABC Electrical Services',
        contactPerson: 'John Smith',
        email: 'john@abcelectrical.com',
        phone: '(555) 123-4567',
        address: '123 Trade St, City, ST 12345',
        trades: ['Electrical', 'Low Voltage'],
        businessLicense: 'BL-12345',
        taxId: '12-3456789',
        status: 'active',
        onboardingDate: '2023-06-15',
        lastActiveDate: '2024-01-28',
        insurances: [
          {
            type: 'general_liability',
            provider: 'State Farm',
            policyNumber: 'GL-123456',
            coverageAmount: 2000000,
            effectiveDate: '2024-01-01',
            expirationDate: '2024-12-31',
            status: 'active'
          },
          {
            type: 'workers_comp',
            provider: 'Workers Comp Inc',
            policyNumber: 'WC-789012',
            coverageAmount: 1000000,
            effectiveDate: '2024-01-01',
            expirationDate: '2024-12-31',
            status: 'active'
          }
        ],
        licenses: [
          {
            type: 'Master Electrician',
            number: 'ME-54321',
            state: 'CA',
            issueDate: '2022-01-15',
            expirationDate: '2024-01-15',
            status: 'expiring_soon',
            verificationDate: '2024-01-01'
          }
        ],
        performanceMetrics: {
          overallRating: 4.2,
          qualityScore: 4.5,
          timelinessScore: 4.0,
          safetyScore: 4.8,
          communicationScore: 3.8,
          totalProjects: 15,
          completedOnTime: 12,
          onTimePercentage: 80,
          averageQualityRating: 4.3,
          safetyIncidents: 0,
          changeOrderFrequency: 15,
          paymentReliability: 95,
          lastEvaluationDate: '2024-01-15'
        },
        currentAssignments: [
          {
            id: '1',
            projectId: 'proj1',
            projectName: 'Downtown Office Complex',
            workDescription: 'Electrical installation - Phase 2',
            startDate: '2024-02-01',
            endDate: '2024-02-28',
            contractAmount: 85000,
            status: 'active',
            completionPercentage: 65
          }
        ],
        paymentInfo: {
          preferredMethod: 'ach',
          paymentTerms: 'Net 30',
          totalPaid: 450000,
          outstandingBalance: 12500,
          lastPaymentDate: '2024-01-15'
        },
        documents: {
          w9Form: '/documents/abc-electrical-w9.pdf',
          contractTemplate: '/documents/abc-electrical-contract.pdf',
          safetyManual: '/documents/abc-electrical-safety.pdf'
        },
        portal: {
          hasAccess: true,
          lastLogin: '2024-01-28T09:00:00Z',
          invitationSent: '2023-06-15T10:00:00Z',
          activationStatus: 'active'
        }
      },
      {
        id: '2',
        companyName: 'Superior Plumbing Co.',
        contactPerson: 'Sarah Johnson',
        email: 'sarah@superiorplumbing.com',
        phone: '(555) 234-5678',
        address: '456 Pipe Ave, City, ST 12345',
        trades: ['Plumbing', 'HVAC'],
        businessLicense: 'BL-67890',
        taxId: '98-7654321',
        status: 'active',
        onboardingDate: '2023-08-20',
        lastActiveDate: '2024-01-25',
        insurances: [
          {
            type: 'general_liability',
            provider: 'Liberty Mutual',
            policyNumber: 'GL-789123',
            coverageAmount: 1500000,
            effectiveDate: '2023-08-01',
            expirationDate: '2024-08-01',
            status: 'active'
          }
        ],
        licenses: [
          {
            type: 'Master Plumber',
            number: 'MP-98765',
            state: 'CA',
            issueDate: '2021-05-10',
            expirationDate: '2025-05-10',
            status: 'active',
            verificationDate: '2024-01-01'
          }
        ],
        performanceMetrics: {
          overallRating: 4.6,
          qualityScore: 4.8,
          timelinessScore: 4.5,
          safetyScore: 4.2,
          communicationScore: 4.8,
          totalProjects: 22,
          completedOnTime: 20,
          onTimePercentage: 91,
          averageQualityRating: 4.7,
          safetyIncidents: 1,
          changeOrderFrequency: 8,
          paymentReliability: 98,
          lastEvaluationDate: '2024-01-20'
        },
        currentAssignments: [
          {
            id: '2',
            projectId: 'proj2',
            projectName: 'Residential Development Phase 2',
            workDescription: 'Plumbing rough-in - Units 10-15',
            startDate: '2024-01-15',
            endDate: '2024-02-15',
            contractAmount: 65000,
            status: 'active',
            completionPercentage: 45
          }
        ],
        paymentInfo: {
          preferredMethod: 'check',
          paymentTerms: 'Net 15',
          totalPaid: 380000,
          outstandingBalance: 8500,
          lastPaymentDate: '2024-01-20'
        },
        documents: {
          w9Form: '/documents/superior-plumbing-w9.pdf',
          contractTemplate: '/documents/superior-plumbing-contract.pdf'
        },
        portal: {
          hasAccess: true,
          lastLogin: '2024-01-25T14:30:00Z',
          invitationSent: '2023-08-20T11:00:00Z',
          activationStatus: 'active'
        }
      },
      {
        id: '3',
        companyName: 'Precision Concrete Works',
        contactPerson: 'Mike Wilson',
        email: 'mike@precisionconcrete.com',
        phone: '(555) 345-6789',
        address: '789 Concrete Rd, City, ST 12345',
        trades: ['Concrete', 'Foundation'],
        businessLicense: 'BL-54321',
        taxId: '55-1234567',
        status: 'pending_approval',
        onboardingDate: '2024-01-30',
        lastActiveDate: '2024-01-30',
        insurances: [
          {
            type: 'general_liability',
            provider: 'Allstate',
            policyNumber: 'GL-456789',
            coverageAmount: 2500000,
            effectiveDate: '2024-01-01',
            expirationDate: '2024-12-31',
            status: 'active'
          }
        ],
        licenses: [
          {
            type: 'Concrete Contractor',
            number: 'CC-13579',
            state: 'CA',
            issueDate: '2023-03-01',
            expirationDate: '2026-03-01',
            status: 'active',
            verificationDate: '2024-01-30'
          }
        ],
        performanceMetrics: {
          overallRating: 0, // New contractor
          qualityScore: 0,
          timelinessScore: 0,
          safetyScore: 0,
          communicationScore: 0,
          totalProjects: 0,
          completedOnTime: 0,
          onTimePercentage: 0,
          averageQualityRating: 0,
          safetyIncidents: 0,
          changeOrderFrequency: 0,
          paymentReliability: 0,
          lastEvaluationDate: '2024-01-30'
        },
        currentAssignments: [],
        paymentInfo: {
          preferredMethod: 'wire',
          paymentTerms: 'Net 30',
          totalPaid: 0,
          outstandingBalance: 0
        },
        documents: {
          w9Form: '/documents/precision-concrete-w9.pdf'
        },
        portal: {
          hasAccess: false,
          invitationSent: '2024-01-30T16:00:00Z',
          activationStatus: 'pending'
        }
      }
    ];

    setSubcontractors(mockSubs);
  };

  const checkScheduleConflicts = () => {
    // Mock schedule conflicts
    const conflicts: ScheduleConflict[] = [
      {
        subcontractorId: '1',
        projectId: 'proj3',
        conflictDate: '2024-02-15',
        type: 'overlap',
        description: 'ABC Electrical has overlapping schedules on this date'
      }
    ];

    setScheduleConflicts(conflicts);
  };

  const approveSubcontractor = async (subcontractorId: string) => {
    setSubcontractors(prev => prev.map(sub =>
      sub.id === subcontractorId
        ? { 
            ...sub, 
            status: 'active',
            portal: { ...sub.portal, hasAccess: true, activationStatus: 'active' }
          }
        : sub
    ));

    toast({
      title: "Subcontractor Approved",
      description: "Subcontractor has been approved and granted portal access.",
    });
  };

  const grantPortalAccess = async (subcontractorId: string) => {
    setSubcontractors(prev => prev.map(sub =>
      sub.id === subcontractorId
        ? { 
            ...sub, 
            portal: { 
              ...sub.portal, 
              hasAccess: true, 
              activationStatus: 'active',
              invitationSent: new Date().toISOString()
            }
          }
        : sub
    ));

    toast({
      title: "Portal Access Granted",
      description: "Portal invitation has been sent to the subcontractor.",
    });
  };

  const updatePerformanceRating = async (subcontractorId: string, category: string, rating: number) => {
    setSubcontractors(prev => prev.map(sub =>
      sub.id === subcontractorId
        ? {
            ...sub,
            performanceMetrics: {
              ...sub.performanceMetrics,
              [category]: rating,
              lastEvaluationDate: new Date().toISOString()
            }
          }
        : sub
    ));

    toast({
      title: "Rating Updated",
      description: `${category} rating has been updated.`,
    });
  };

  const verifyInsurance = async (subcontractorId: string, insuranceType: string) => {
    setSubcontractors(prev => prev.map(sub =>
      sub.id === subcontractorId
        ? {
            ...sub,
            insurances: sub.insurances.map(ins =>
              ins.type === insuranceType
                ? { ...ins, status: 'active' as const }
                : ins
            )
          }
        : sub
    ));

    toast({
      title: "Insurance Verified",
      description: "Insurance certificate has been verified and updated.",
    });
  };

  const getStatusBadgeVariant = (status: Subcontractor['status']) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'blacklisted': return 'destructive';
      case 'pending_approval': return 'secondary';
      default: return 'secondary';
    }
  };

  const getInsuranceStatusVariant = (status: Insurance['status']) => {
    switch (status) {
      case 'active': return 'default';
      case 'expired': return 'destructive';
      case 'expiring_soon': return 'secondary';
      default: return 'secondary';
    }
  };

  const getLicenseStatusVariant = (status: License['status']) => {
    switch (status) {
      case 'active': return 'default';
      case 'expired': return 'destructive';
      case 'expiring_soon': return 'secondary';
      default: return 'secondary';
    }
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < Math.floor(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  const filteredSubcontractors = subcontractors.filter(sub => {
    const statusMatch = filterStatus === 'all' || sub.status === filterStatus;
    const tradeMatch = filterTrade === 'all' || sub.trades.includes(filterTrade);
    return statusMatch && tradeMatch;
  });

  // Calculate summary statistics
  const activeSubcontractors = subcontractors.filter(sub => sub.status === 'active').length;
  const pendingApproval = subcontractors.filter(sub => sub.status === 'pending_approval').length;
  const expiringInsurances = subcontractors.reduce((count, sub) => 
    count + sub.insurances.filter(ins => ins.status === 'expiring_soon').length, 0
  );
  const expiringLicenses = subcontractors.reduce((count, sub) => 
    count + sub.licenses.filter(lic => lic.status === 'expiring_soon').length, 0
  );
  const averageRating = subcontractors.filter(sub => sub.performanceMetrics.totalProjects > 0)
    .reduce((sum, sub) => sum + sub.performanceMetrics.overallRating, 0) / 
    subcontractors.filter(sub => sub.performanceMetrics.totalProjects > 0).length || 0;

  return (
    <div className="space-y-6">
      {/* Summary Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active Subs</p>
                <p className="text-2xl font-bold">{activeSubcontractors}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingApproval}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Expiring Docs</p>
                <p className="text-2xl font-bold">{expiringInsurances + expiringLicenses}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Star className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Rating</p>
                <p className="text-2xl font-bold">{averageRating.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Conflicts</p>
                <p className="text-2xl font-bold">{scheduleConflicts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Conflicts Alert */}
      {scheduleConflicts.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              Schedule Conflicts Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {scheduleConflicts.map((conflict, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div>
                    <p className="font-medium">{conflict.description}</p>
                    <p className="text-sm text-muted-foreground">
                      Date: {format(new Date(conflict.conflictDate), 'PPP')}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {conflict.type.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subcontractor Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Subcontractor Coordination
            </span>
            <Button onClick={() => setShowPortalForm(true)}>
              Add Subcontractor
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="status-filter">Status:</Label>
              <Select onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                  <SelectItem value="blacklisted">Blacklisted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="trade-filter">Trade:</Label>
              <Select onValueChange={setFilterTrade}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All trades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Electrical">Electrical</SelectItem>
                  <SelectItem value="Plumbing">Plumbing</SelectItem>
                  <SelectItem value="HVAC">HVAC</SelectItem>
                  <SelectItem value="Concrete">Concrete</SelectItem>
                  <SelectItem value="Roofing">Roofing</SelectItem>
                  <SelectItem value="Drywall">Drywall</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Subcontractors List */}
          <div className="space-y-4">
            {filteredSubcontractors.map((sub) => (
              <div key={sub.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium">{sub.companyName}</h3>
                    <Badge variant={getStatusBadgeVariant(sub.status)}>
                      {sub.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    {sub.performanceMetrics.totalProjects > 0 && (
                      <div className="flex items-center gap-1">
                        {getRatingStars(sub.performanceMetrics.overallRating)}
                        <span className="text-sm text-muted-foreground ml-1">
                          ({sub.performanceMetrics.overallRating.toFixed(1)})
                        </span>
                      </div>
                    )}
                    {sub.portal.hasAccess && (
                      <Badge variant="default" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Portal Access
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {sub.status === 'pending_approval' && (
                      <Button 
                        size="sm" 
                        onClick={() => approveSubcontractor(sub.id)}
                      >
                        Approve
                      </Button>
                    )}
                    {!sub.portal.hasAccess && sub.status === 'active' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => grantPortalAccess(sub.id)}
                      >
                        Grant Portal Access
                      </Button>
                    )}
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Contact:</span>
                    <div className="font-medium">{sub.contactPerson}</div>
                    <div className="text-sm text-muted-foreground">{sub.phone}</div>
                  </div>
                  
                  <div>
                    <span className="text-sm text-muted-foreground">Trades:</span>
                    <div className="font-medium">{sub.trades.join(', ')}</div>
                    <div className="text-sm text-muted-foreground">
                      License: {sub.businessLicense}
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-sm text-muted-foreground">Performance:</span>
                    <div className="font-medium">
                      {sub.performanceMetrics.totalProjects} projects
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {sub.performanceMetrics.onTimePercentage}% on time
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-sm text-muted-foreground">Payment:</span>
                    <div className="font-medium">${sub.paymentInfo.totalPaid.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">
                      Outstanding: ${sub.paymentInfo.outstandingBalance.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Current Assignments */}
                {sub.currentAssignments.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Current Assignments</h4>
                    <div className="space-y-2">
                      {sub.currentAssignments.map((assignment) => (
                        <div key={assignment.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium">{assignment.projectName}</p>
                            <p className="text-sm text-muted-foreground">
                              {assignment.workDescription} • ${assignment.contractAmount.toLocaleString()}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(assignment.startDate), 'MMM dd')} - 
                              {format(new Date(assignment.endDate), 'MMM dd, yyyy')}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant="default">
                              {assignment.status.toUpperCase()}
                            </Badge>
                            <div className="text-sm text-muted-foreground mt-1">
                              {assignment.completionPercentage}% complete
                            </div>
                            <Progress value={assignment.completionPercentage} className="w-20 mt-1" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Insurance & Licenses Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Insurance Status</h4>
                    <div className="space-y-1">
                      {sub.insurances.map((insurance, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="capitalize">{insurance.type.replace('_', ' ')}</span>
                          <Badge variant={getInsuranceStatusVariant(insurance.status)} className="text-xs">
                            {insurance.status === 'expiring_soon' ? 
                              `Expires ${format(new Date(insurance.expirationDate), 'MMM dd')}` :
                              insurance.status.toUpperCase()
                            }
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">License Status</h4>
                    <div className="space-y-1">
                      {sub.licenses.map((license, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span>{license.type}</span>
                          <Badge variant={getLicenseStatusVariant(license.status)} className="text-xs">
                            {license.status === 'expiring_soon' ? 
                              `Expires ${format(new Date(license.expirationDate), 'MMM dd')}` :
                              license.status.toUpperCase()
                            }
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Portal Access Info */}
                {sub.portal.hasAccess && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-2">Portal Access Active</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-green-600">Status:</span>
                        <div className="font-medium">{sub.portal.activationStatus}</div>
                      </div>
                      <div>
                        <span className="text-green-600">Last Login:</span>
                        <div className="font-medium">
                          {sub.portal.lastLogin ? format(new Date(sub.portal.lastLogin), 'MMM dd, yyyy') : 'Never'}
                        </div>
                      </div>
                      <div>
                        <span className="text-green-600">Invitation Sent:</span>
                        <div className="font-medium">
                          {sub.portal.invitationSent ? format(new Date(sub.portal.invitationSent), 'MMM dd, yyyy') : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {filteredSubcontractors.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No subcontractors found for the selected filters.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};