import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FileText, Calendar, DollarSign, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface PaymentApplication {
  id: string;
  applicationNumber: string;
  project: {
    id: string;
    name: string;
    contractAmount: number;
    completionPercentage: number;
  };
  billingPeriod: {
    start: string;
    end: string;
  };
  workCompleted: {
    scheduledValue: number;
    completedToDate: number;
    thisApplication: number;
  };
  materialStored: {
    onSite: number;
    offSite: number;
  };
  retention: {
    percentage: number;
    amount: number;
  };
  changeOrders: {
    approved: number;
    pending: number;
  };
  netAmount: number;
  status: 'draft' | 'pending_approval' | 'submitted' | 'approved' | 'paid';
  submittedAt?: string;
  approvedAt?: string;
  paidAt?: string;
}

export const PaymentApplicationAutomation: React.FC = () => {
  const [applications, setApplications] = useState<PaymentApplication[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [projects] = useState([
    {
      id: '1',
      name: 'Downtown Office Complex',
      contractAmount: 2500000,
      completionPercentage: 65,
      lastBillingDate: '2024-01-15'
    },
    {
      id: '2', 
      name: 'Residential Development Phase 2',
      contractAmount: 1800000,
      completionPercentage: 42,
      lastBillingDate: '2024-01-01'
    },
    {
      id: '3',
      name: 'Manufacturing Facility Expansion',
      contractAmount: 3200000,
      completionPercentage: 78,
      lastBillingDate: '2024-01-10'
    }
  ]);
  
  const { toast } = useToast();
  const { userProfile } = useAuth();

  useEffect(() => {
    loadPaymentApplications();
  }, []);

  const loadPaymentApplications = async () => {
    try {
      // For now, keeping mock data since payment_applications table may not exist yet
      setApplications([]);
    } catch (error) {
      console.error('Error loading payment applications:', error);
      setApplications([]);
    }
  };

  const generatePaymentApplication = async () => {
    if (!selectedProject) {
      toast({
        title: "Project Required",
        description: "Please select a project to generate payment application.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const project = projects.find(p => p.id === selectedProject);
      if (!project) return;

      // Simulate automated calculation
      await new Promise(resolve => setTimeout(resolve, 2000));

      const workCompletedValue = project.contractAmount * (project.completionPercentage / 100);
      const previousBillings = workCompletedValue * 0.8; // Assume 80% was previously billed
      const thisApplication = workCompletedValue - previousBillings;
      const retentionAmount = workCompletedValue * 0.1; // 10% retention
      const netAmount = workCompletedValue - retentionAmount;

      const newApplication: PaymentApplication = {
        id: Date.now().toString(),
        applicationNumber: `PA-2024-${String(applications.length + 1).padStart(3, '0')}`,
        project: {
          id: project.id,
          name: project.name,
          contractAmount: project.contractAmount,
          completionPercentage: project.completionPercentage
        },
        billingPeriod: {
          start: new Date().toISOString().split('T')[0],
          end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        workCompleted: {
          scheduledValue: workCompletedValue,
          completedToDate: workCompletedValue,
          thisApplication
        },
        materialStored: {
          onSite: 0,
          offSite: 0
        },
        retention: {
          percentage: 10,
          amount: retentionAmount
        },
        changeOrders: {
          approved: 0,
          pending: 0
        },
        netAmount,
        status: 'draft'
      };

      setApplications(prev => [newApplication, ...prev]);

      toast({
        title: "Payment Application Generated",
        description: `Application ${newApplication.applicationNumber} created successfully.`,
      });

    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate payment application.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const submitApplication = async (applicationId: string) => {
    setApplications(prev => prev.map(app => 
      app.id === applicationId 
        ? { ...app, status: 'submitted', submittedAt: new Date().toISOString() }
        : app
    ));

    toast({
      title: "Application Submitted",
      description: "Payment application has been submitted for approval.",
    });
  };

  const getStatusBadgeVariant = (status: PaymentApplication['status']) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'pending_approval': return 'secondary';
      case 'submitted': return 'default';
      case 'approved': return 'default';
      case 'paid': return 'default';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: PaymentApplication['status']) => {
    switch (status) {
      case 'draft': return <FileText className="h-4 w-4" />;
      case 'pending_approval': return <Clock className="h-4 w-4" />;
      case 'submitted': return <CheckCircle className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'paid': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Generation Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Payment Application
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project">Select Project</Label>
              <Select onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex flex-col">
                        <span>{project.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {project.completionPercentage}% complete - ${project.contractAmount.toLocaleString()}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={generatePaymentApplication}
                disabled={isGenerating || !selectedProject}
                className="w-full"
              >
                {isGenerating ? 'Generating...' : 'Generate Application'}
              </Button>
            </div>
          </div>

          {selectedProject && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Project Summary</h4>
              {(() => {
                const project = projects.find(p => p.id === selectedProject);
                if (!project) return null;
                
                const workCompleted = project.contractAmount * (project.completionPercentage / 100);
                const retention = workCompleted * 0.1;
                
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Contract Amount:</span>
                      <div className="font-medium">${project.contractAmount.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Completion:</span>
                      <div className="font-medium">{project.completionPercentage}%</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Work Completed:</span>
                      <div className="font-medium">${workCompleted.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Est. Retention:</span>
                      <div className="font-medium">${retention.toLocaleString()}</div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Applications List */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {applications.map((application) => (
              <div key={application.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium">{application.applicationNumber}</h3>
                    <Badge variant={getStatusBadgeVariant(application.status)} className="flex items-center gap-1">
                      {getStatusIcon(application.status)}
                      {application.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {application.status === 'draft' && (
                      <Button 
                        size="sm" 
                        onClick={() => submitApplication(application.id)}
                      >
                        Submit Application
                      </Button>
                    )}
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Project:</span>
                    <div className="font-medium">{application.project.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {application.project.completionPercentage}% complete
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-sm text-muted-foreground">Period:</span>
                    <div className="font-medium">
                      {new Date(application.billingPeriod.start).toLocaleDateString()} - 
                      {new Date(application.billingPeriod.end).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-sm text-muted-foreground">Work Completed:</span>
                    <div className="font-medium">${application.workCompleted.completedToDate.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">
                      This Period: ${application.workCompleted.thisApplication.toLocaleString()}
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-sm text-muted-foreground">Net Amount:</span>
                    <div className="font-medium text-green-600">${application.netAmount.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">
                      Retention: ${application.retention.amount.toLocaleString()}
                    </div>
                  </div>
                </div>

                <Progress 
                  value={application.project.completionPercentage} 
                  className="w-full" 
                />
              </div>
            ))}

            {applications.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No payment applications found. Generate your first application above.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};