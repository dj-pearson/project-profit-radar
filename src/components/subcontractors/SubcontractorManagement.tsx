import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, Star, Phone, Mail, MapPin, Calendar, 
  DollarSign, CheckCircle, Clock, AlertTriangle, FileText
} from 'lucide-react';

interface Subcontractor {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  specialties: string[];
  rating: number;
  totalProjects: number;
  completedProjects: number;
  status: 'active' | 'inactive' | 'blacklisted';
  insurance: {
    liability: boolean;
    workersComp: boolean;
    expirationDate: Date;
  };
  certifications: string[];
  lastWorked: Date;
  averageRate: number;
}

interface SubcontractorContract {
  id: string;
  subcontractorId: string;
  projectId: string;
  projectName: string;
  workDescription: string;
  contractAmount: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  startDate: Date;
  endDate: Date;
  paymentSchedule: 'milestone' | 'monthly' | 'completion';
  completionPercentage: number;
}

interface Performance {
  subcontractorId: string;
  qualityScore: number;
  timelinessScore: number;
  communicationScore: number;
  safetyScore: number;
  overallRating: number;
  projectsCompleted: number;
  averageDelay: number; // days
}

export const SubcontractorManagement: React.FC = () => {
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([
    {
      id: '1',
      companyName: 'Elite Electrical Solutions',
      contactPerson: 'John Martinez',
      email: 'john@eliteelectrical.com',
      phone: '(555) 234-5678',
      address: '123 Industrial Blvd, City, ST 12345',
      specialties: ['Electrical', 'Low Voltage', 'Solar'],
      rating: 4.8,
      totalProjects: 45,
      completedProjects: 43,
      status: 'active',
      insurance: {
        liability: true,
        workersComp: true,
        expirationDate: new Date('2024-12-31')
      },
      certifications: ['Licensed Electrician', 'OSHA 30', 'Solar Installation'],
      lastWorked: new Date('2024-01-10'),
      averageRate: 85
    },
    {
      id: '2',
      companyName: 'Premier Plumbing Co.',
      contactPerson: 'Sarah Johnson',
      email: 'sarah@premierplumbing.com',
      phone: '(555) 345-6789',
      address: '456 Commerce Dr, City, ST 12345',
      specialties: ['Plumbing', 'HVAC', 'Gas Lines'],
      rating: 4.6,
      totalProjects: 32,
      completedProjects: 30,
      status: 'active',
      insurance: {
        liability: true,
        workersComp: true,
        expirationDate: new Date('2024-06-30')
      },
      certifications: ['Master Plumber', 'HVAC Certified', 'Gas Fitter'],
      lastWorked: new Date('2024-01-08'),
      averageRate: 75
    }
  ]);

  const [contracts, setContracts] = useState<SubcontractorContract[]>([
    {
      id: '1',
      subcontractorId: '1',
      projectId: 'proj-1',
      projectName: 'Downtown Office Complex',
      workDescription: 'Complete electrical installation and panel setup',
      contractAmount: 85000,
      status: 'active',
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-03-15'),
      paymentSchedule: 'milestone',
      completionPercentage: 65
    }
  ]);

  const [performances] = useState<Performance[]>([
    {
      subcontractorId: '1',
      qualityScore: 4.8,
      timelinessScore: 4.5,
      communicationScore: 4.9,
      safetyScore: 4.7,
      overallRating: 4.7,
      projectsCompleted: 43,
      averageDelay: 1.2
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredSubcontractors = subcontractors.filter(sub =>
    sub.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.specialties.some(spec => spec.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusColor = (status: Subcontractor['status']) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'blacklisted': return 'destructive';
      default: return 'outline';
    }
  };

  const renderSubcontractorCard = (sub: Subcontractor) => {
    const performance = performances.find(p => p.subcontractorId === sub.id);
    const insuranceExpiring = sub.insurance.expirationDate < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    return (
      <Card key={sub.id} className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="w-12 h-12">
            <AvatarFallback>
              {sub.companyName.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium">{sub.companyName}</h4>
                <p className="text-sm text-muted-foreground">{sub.contactPerson}</p>
              </div>
              <Badge variant={getStatusColor(sub.status)}>
                {sub.status}
              </Badge>
            </div>
            
            <div className="flex items-center gap-1 mt-1">
              {Array.from({ length: 5 }, (_, i) => (
                <Star 
                  key={i} 
                  className={`h-3 w-3 ${
                    i < Math.floor(sub.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                  }`}
                />
              ))}
              <span className="text-sm text-muted-foreground ml-1">
                {sub.rating} ({sub.completedProjects} projects)
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-3 w-3" />
            <span>{sub.phone}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-3 w-3" />
            <span className="text-xs">{sub.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-3 w-3" />
            <span>${sub.averageRate}/hour average rate</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          {sub.specialties.map(specialty => (
            <Badge key={specialty} variant="outline" className="text-xs">
              {specialty}
            </Badge>
          ))}
        </div>

        {insuranceExpiring && (
          <div className="flex items-center gap-2 text-destructive text-sm mb-3">
            <AlertTriangle className="h-4 w-4" />
            <span>Insurance expiring soon</span>
          </div>
        )}

        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            <Calendar className="h-3 w-3 mr-1" />
            Schedule
          </Button>
          <Button size="sm" variant="ghost">
            <FileText className="h-3 w-3 mr-1" />
            Details
          </Button>
        </div>
      </Card>
    );
  };

  const renderContractCard = (contract: SubcontractorContract) => {
    const subcontractor = subcontractors.find(s => s.id === contract.subcontractorId);
    
    return (
      <Card key={contract.id} className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="font-medium">{contract.projectName}</h4>
            <p className="text-sm text-muted-foreground">{subcontractor?.companyName}</p>
            <p className="text-xs text-muted-foreground">{contract.workDescription}</p>
          </div>
          <Badge variant={
            contract.status === 'completed' ? 'default' :
            contract.status === 'active' ? 'secondary' :
            contract.status === 'cancelled' ? 'destructive' : 'outline'
          }>
            {contract.status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
          <div>
            <span className="text-muted-foreground">Contract Amount:</span>
            <p className="font-medium">${contract.contractAmount.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Progress:</span>
            <p className="font-medium">{contract.completionPercentage}%</p>
          </div>
          <div>
            <span className="text-muted-foreground">Start Date:</span>
            <p className="font-medium">{contract.startDate.toLocaleDateString()}</p>
          </div>
          <div>
            <span className="text-muted-foreground">End Date:</span>
            <p className="font-medium">{contract.endDate.toLocaleDateString()}</p>
          </div>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex justify-between text-xs">
            <span>Completion Progress</span>
            <span>{contract.completionPercentage}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${contract.completionPercentage}%` }}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            <CheckCircle className="h-3 w-3 mr-1" />
            Update Progress
          </Button>
          <Button size="sm" variant="ghost">
            Details
          </Button>
        </div>
      </Card>
    );
  };

  const renderPerformanceCard = (perf: Performance) => {
    const subcontractor = subcontractors.find(s => s.id === perf.subcontractorId);
    
    return (
      <Card key={perf.subcontractorId} className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar>
            <AvatarFallback>
              {subcontractor?.companyName.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <h4 className="font-medium">{subcontractor?.companyName}</h4>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }, (_, i) => (
                <Star 
                  key={i} 
                  className={`h-3 w-3 ${
                    i < Math.floor(perf.overallRating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                  }`}
                />
              ))}
              <span className="text-sm text-muted-foreground ml-1">
                {perf.overallRating.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Quality:</span>
              <p className="font-medium">{perf.qualityScore.toFixed(1)}/5.0</p>
            </div>
            <div>
              <span className="text-muted-foreground">Timeliness:</span>
              <p className="font-medium">{perf.timelinessScore.toFixed(1)}/5.0</p>
            </div>
            <div>
              <span className="text-muted-foreground">Communication:</span>
              <p className="font-medium">{perf.communicationScore.toFixed(1)}/5.0</p>
            </div>
            <div>
              <span className="text-muted-foreground">Safety:</span>
              <p className="font-medium">{perf.safetyScore.toFixed(1)}/5.0</p>
            </div>
          </div>

          <div className="pt-2 border-t">
            <div className="flex justify-between text-sm mb-1">
              <span>Projects Completed:</span>
              <span className="font-medium">{perf.projectsCompleted}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Average Delay:</span>
              <span className={`font-medium ${perf.averageDelay > 3 ? 'text-destructive' : 'text-green-600'}`}>
                {perf.averageDelay} days
              </span>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Subcontractor Management</h2>
          <p className="text-muted-foreground">
            Manage relationships, contracts, and performance tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Create Contract
          </Button>
          <Button>
            <Users className="h-4 w-4 mr-2" />
            Add Subcontractor
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Subs</p>
                <p className="text-2xl font-bold">
                  {subcontractors.filter(s => s.status === 'active').length}
                </p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Contracts</p>
                <p className="text-2xl font-bold">
                  {contracts.filter(c => c.status === 'active').length}
                </p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Rating</p>
                <p className="text-2xl font-bold">
                  {(subcontractors.reduce((sum, s) => sum + s.rating, 0) / subcontractors.length).toFixed(1)}
                </p>
              </div>
              <Star className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Contract Value</p>
                <p className="text-2xl font-bold">
                  ${contracts.reduce((sum, c) => sum + c.contractAmount, 0).toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <Input
            placeholder="Search subcontractors by name or specialty..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </CardContent>
      </Card>

      <Tabs defaultValue="directory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="directory">Directory</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="directory">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredSubcontractors.map(renderSubcontractorCard)}
          </div>
        </TabsContent>

        <TabsContent value="contracts">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Active Contracts</h3>
              <Button>Create New Contract</Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {contracts.map(renderContractCard)}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="performance">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {performances.map(renderPerformanceCard)}
          </div>
        </TabsContent>

        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle>Insurance & Certification Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {subcontractors.map(sub => (
                  <div key={sub.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <span className="font-medium">{sub.companyName}</span>
                      <div className="text-sm text-muted-foreground">
                        Insurance expires: {sub.insurance.expirationDate.toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={sub.insurance.liability ? 'default' : 'destructive'}>
                        Liability: {sub.insurance.liability ? 'Valid' : 'Expired'}
                      </Badge>
                      <Badge variant={sub.insurance.workersComp ? 'default' : 'destructive'}>
                        Workers Comp: {sub.insurance.workersComp ? 'Valid' : 'Expired'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};