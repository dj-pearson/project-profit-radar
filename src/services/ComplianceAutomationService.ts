import { toast } from 'sonner';

export interface ComplianceRequirement {
  id: string;
  name: string;
  description: string;
  category: 'safety' | 'environmental' | 'labor' | 'quality' | 'financial';
  jurisdiction: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'as_needed';
  dueDate?: string;
  status: 'compliant' | 'non_compliant' | 'pending' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'critical';
  automationEnabled: boolean;
  lastCheck?: string;
  nextCheck?: string;
}

export interface ComplianceCheck {
  id: string;
  requirementId: string;
  projectId?: string;
  checkDate: string;
  result: 'pass' | 'fail' | 'warning';
  score?: number;
  findings: ComplianceFinding[];
  evidence: ComplianceEvidence[];
  performedBy: string;
  automatedCheck: boolean;
}

export interface ComplianceFinding {
  id: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
  dueDate?: string;
  resolved: boolean;
  resolvedDate?: string;
}

export interface ComplianceEvidence {
  id: string;
  type: 'document' | 'photo' | 'video' | 'certificate' | 'signature';
  fileUrl?: string;
  description: string;
  uploadedAt: string;
}

export interface OSHACompliance {
  siteInspections: {
    required: boolean;
    frequency: string;
    lastInspection?: string;
    nextDue?: string;
  };
  safetyTraining: {
    required: boolean;
    employees: Array<{
      id: string;
      name: string;
      lastTraining?: string;
      certificationsExpiring: string[];
    }>;
  };
  incidentReporting: {
    required: boolean;
    reportingDeadline: number;
    recentIncidents: number;
  };
  hazardCommunication: {
    sdsSheets: boolean;
    labelingCompliant: boolean;
    trainingCurrent: boolean;
  };
}

class ComplianceAutomationService {
  async initializeProjectCompliance(
    projectId: string, 
    projectType: string, 
    location: { state: string; city: string }
  ): Promise<void> {
    try {
      const requirements = await this.getApplicableRequirements(projectType, location);
      
      toast.success(`Compliance monitoring active for ${requirements.length} requirements`);
    } catch (error: any) {
      console.error('Error initializing compliance:', error);
      toast.error('Failed to initialize compliance monitoring');
      throw new Error(`Failed to initialize compliance: ${error.message}`);
    }
  }

  async performOSHACompliance(projectId: string): Promise<OSHACompliance> {
    try {
      // Mock OSHA compliance data
      const oshaCompliance: OSHACompliance = {
        siteInspections: {
          required: true,
          frequency: 'weekly',
          lastInspection: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          nextDue: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        safetyTraining: {
          required: true,
          employees: [
            {
              id: 'emp1',
              name: 'John Smith',
              lastTraining: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
              certificationsExpiring: ['OSHA 10']
            }
          ]
        },
        incidentReporting: {
          required: true,
          reportingDeadline: 24,
          recentIncidents: 1
        },
        hazardCommunication: {
          sdsSheets: true,
          labelingCompliant: true,
          trainingCurrent: false
        }
      };

      return oshaCompliance;
    } catch (error: any) {
      console.error('Error performing OSHA compliance check:', error);
      toast.error('OSHA compliance check failed');
      throw new Error(`OSHA compliance check failed: ${error.message}`);
    }
  }

  async generateComplianceReport(
    projectId: string,
    reportType: 'safety' | 'environmental' | 'labor' | 'comprehensive',
    period: { startDate: string; endDate: string }
  ): Promise<any> {
    try {
      // Mock compliance report
      const report = {
        reportType,
        period,
        projectId,
        generatedAt: new Date().toISOString(),
        summary: {
          totalChecks: 15,
          passedChecks: 12,
          failedChecks: 2,
          warningChecks: 1,
          complianceRate: 80
        },
        findings: {
          critical: 0,
          high: 2,
          medium: 3,
          low: 1
        },
        recommendations: [
          'Schedule additional safety training',
          'Update safety equipment inventory',
          'Review incident reporting procedures'
        ],
        detailedResults: [
          {
            requirement: 'OSHA Site Safety Inspection',
            checkDate: period.startDate,
            result: 'pass',
            score: 95,
            findings: 0,
            evidence: 3
          }
        ]
      };

      return report;
    } catch (error: any) {
      console.error('Error generating compliance report:', error);
      toast.error('Failed to generate compliance report');
      throw new Error(`Compliance report generation failed: ${error.message}`);
    }
  }

  async monitorPermitCompliance(projectId: string): Promise<any> {
    try {
      // Mock permit compliance data
      const mockPermits = [
        {
          id: 'permit1',
          permit_name: 'Environmental Impact Permit',
          expiration_date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      const alerts = [{
        permitId: 'permit1',
        permitName: 'Environmental Impact Permit',
        type: 'expiring_soon',
        severity: 'high',
        message: 'Permit expires in less than 30 days',
        actionRequired: 'Begin renewal process immediately'
      }];

      return { permits: mockPermits, alerts };
    } catch (error: any) {
      console.error('Error monitoring permit compliance:', error);
      toast.error('Failed to monitor permit compliance');
      throw new Error(`Permit monitoring failed: ${error.message}`);
    }
  }

  async checkSafetyTrainingCompliance(projectId: string): Promise<any> {
    try {
      // Mock safety training compliance
      const mockResult = {
        compliant: false,
        totalEmployees: 5,
        issues: [
          {
            employeeId: 'emp1',
            employeeName: 'John Smith',
            issue: 'expiring_training',
            training: 'OSHA 10',
            severity: 'medium',
            actionRequired: 'Schedule OSHA 10 renewal'
          }
        ],
        complianceRate: 85
      };

      return mockResult;
    } catch (error: any) {
      console.error('Error checking safety training compliance:', error);
      toast.error('Failed to check safety training compliance');
      throw new Error(`Safety training compliance check failed: ${error.message}`);
    }
  }

  private async getApplicableRequirements(
    projectType: string, 
    location: { state: string; city: string }
  ): Promise<ComplianceRequirement[]> {
    const baseRequirements: ComplianceRequirement[] = [
      {
        id: 'osha-safety',
        name: 'OSHA Site Safety Inspection',
        description: 'Regular safety inspections as required by OSHA',
        category: 'safety',
        jurisdiction: 'federal',
        frequency: 'weekly',
        status: 'compliant',
        priority: 'high',
        automationEnabled: true
      },
      {
        id: 'env-impact',
        name: 'Environmental Impact Assessment',
        description: 'Environmental compliance monitoring',
        category: 'environmental',
        jurisdiction: 'state',
        frequency: 'monthly',
        status: 'pending',
        priority: 'medium',
        automationEnabled: true
      }
    ];

    return baseRequirements;
  }
}

export const complianceAutomationService = new ComplianceAutomationService();
export default complianceAutomationService;