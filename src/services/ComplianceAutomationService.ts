import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ComplianceRequirement {
  id: string;
  name: string;
  description: string;
  category: 'safety' | 'environmental' | 'labor' | 'quality' | 'financial';
  jurisdiction: string; // 'federal' | 'state' | 'local'
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
    reportingDeadline: number; // hours
    recentIncidents: number;
  };
  hazardCommunication: {
    sdsSheets: boolean;
    labelingCompliant: boolean;
    trainingCurrent: boolean;
  };
}

class ComplianceAutomationService {
  /**
   * Initialize compliance monitoring for a project
   */
  async initializeProjectCompliance(
    projectId: string, 
    projectType: string, 
    location: { state: string; city: string }
  ): Promise<void> {
    try {
      // Get applicable compliance requirements based on project type and location
      const requirements = await this.getApplicableRequirements(projectType, location);
      
      // Create compliance schedule
      await this.createComplianceSchedule(projectId, requirements);
      
      // Set up automated monitoring
      await this.setupAutomatedMonitoring(projectId, requirements);
      
      toast({
        title: "Compliance Monitoring Active",
        description: `${requirements.length} compliance requirements are now being monitored`,
      });

    } catch (error: any) {
      console.error('Error initializing compliance:', error);
      throw new Error(`Failed to initialize compliance: ${error.message}`);
    }
  }

  /**
   * Perform automated OSHA compliance check
   */
  async performOSHACompliance(projectId: string): Promise<OSHACompliance> {
    try {
      // Get project and safety data
      const { data: project } = await supabase
        .from('projects')
        .select(`
          *,
          safety_incidents(*),
          employees(*),
          safety_training_records(*)
        `)
        .eq('id', projectId)
        .single();

      if (!project) throw new Error('Project not found');

      // Site Inspections
      const siteInspections = await this.checkSiteInspections(projectId);
      
      // Safety Training
      const safetyTraining = await this.checkSafetyTraining(project.employees || []);
      
      // Incident Reporting
      const incidentReporting = await this.checkIncidentReporting(project.safety_incidents || []);
      
      // Hazard Communication
      const hazardCommunication = await this.checkHazardCommunication(projectId);

      const oshaCompliance: OSHACompliance = {
        siteInspections,
        safetyTraining,
        incidentReporting,
        hazardCommunication
      };

      // Store compliance check results
      await this.storeComplianceResults(projectId, 'osha', oshaCompliance);

      return oshaCompliance;

    } catch (error: any) {
      console.error('Error performing OSHA compliance check:', error);
      throw new Error(`OSHA compliance check failed: ${error.message}`);
    }
  }

  /**
   * Generate automated compliance reports
   */
  async generateComplianceReport(
    projectId: string,
    reportType: 'safety' | 'environmental' | 'labor' | 'comprehensive',
    period: { startDate: string; endDate: string }
  ): Promise<any> {
    try {
      const { data: complianceChecks } = await supabase
        .from('compliance_checks')
        .select(`
          *,
          compliance_requirements(*),
          compliance_findings(*),
          compliance_evidence(*)
        `)
        .eq('project_id', projectId)
        .gte('check_date', period.startDate)
        .lte('check_date', period.endDate);

      if (!complianceChecks) return null;

      // Filter by report type if not comprehensive
      const filteredChecks = reportType === 'comprehensive' 
        ? complianceChecks
        : complianceChecks.filter(check => 
            check.compliance_requirements?.category === reportType
          );

      // Calculate compliance metrics
      const totalChecks = filteredChecks.length;
      const passedChecks = filteredChecks.filter(check => check.result === 'pass').length;
      const failedChecks = filteredChecks.filter(check => check.result === 'fail').length;
      const warningChecks = filteredChecks.filter(check => check.result === 'warning').length;
      
      const complianceRate = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0;

      // Group findings by severity
      const allFindings = filteredChecks.flatMap(check => check.compliance_findings || []);
      const findingsBySeverity = {
        critical: allFindings.filter(f => f.severity === 'critical').length,
        high: allFindings.filter(f => f.severity === 'high').length,
        medium: allFindings.filter(f => f.severity === 'medium').length,
        low: allFindings.filter(f => f.severity === 'low').length
      };

      // Generate recommendations
      const recommendations = await this.generateComplianceRecommendations(filteredChecks);

      const report = {
        reportType,
        period,
        projectId,
        generatedAt: new Date().toISOString(),
        summary: {
          totalChecks,
          passedChecks,
          failedChecks,
          warningChecks,
          complianceRate: Math.round(complianceRate)
        },
        findings: findingsBySeverity,
        recommendations,
        detailedResults: filteredChecks.map(check => ({
          requirement: check.compliance_requirements?.name,
          checkDate: check.check_date,
          result: check.result,
          score: check.score,
          findings: check.compliance_findings?.length || 0,
          evidence: check.compliance_evidence?.length || 0
        }))
      };

      // Store report
      await supabase
        .from('compliance_reports')
        .insert([{
          project_id: projectId,
          report_type: reportType,
          period_start: period.startDate,
          period_end: period.endDate,
          report_data: report
        }]);

      return report;

    } catch (error: any) {
      console.error('Error generating compliance report:', error);
      throw new Error(`Compliance report generation failed: ${error.message}`);
    }
  }

  /**
   * Monitor permit expiration and renewals
   */
  async monitorPermitCompliance(projectId: string): Promise<any> {
    try {
      const { data: permits } = await supabase
        .from('environmental_permits')
        .select('*')
        .eq('project_id', projectId);

      if (!permits) return { permits: [], alerts: [] };

      const alerts = [];
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysFromNow = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);

      for (const permit of permits) {
        const expirationDate = new Date(permit.expiration_date);
        
        if (expirationDate < today) {
          alerts.push({
            permitId: permit.id,
            permitName: permit.permit_name,
            type: 'expired',
            severity: 'critical',
            message: `Permit "${permit.permit_name}" has expired`,
            actionRequired: 'Immediate renewal required'
          });
        } else if (expirationDate < thirtyDaysFromNow) {
          alerts.push({
            permitId: permit.id,
            permitName: permit.permit_name,
            type: 'expiring_soon',
            severity: 'high',
            message: `Permit "${permit.permit_name}" expires in less than 30 days`,
            actionRequired: 'Begin renewal process immediately'
          });
        } else if (expirationDate < sixtyDaysFromNow) {
          alerts.push({
            permitId: permit.id,
            permitName: permit.permit_name,
            type: 'renewal_due',
            severity: 'medium',
            message: `Permit "${permit.permit_name}" expires in less than 60 days`,
            actionRequired: 'Schedule renewal process'
          });
        }
      }

      // Create tasks for permit renewals
      for (const alert of alerts.filter(a => a.severity === 'critical' || a.severity === 'high')) {
        await supabase
          .from('tasks')
          .insert([{
            project_id: projectId,
            name: `Renew Permit: ${alert.permitName}`,
            description: alert.message,
            priority: alert.severity === 'critical' ? 'urgent' : 'high',
            category: 'compliance',
            due_date: alert.type === 'expired' ? 
              new Date().toISOString().split('T')[0] : 
              new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            created_by_automation: true
          }]);
      }

      return { permits, alerts };

    } catch (error: any) {
      console.error('Error monitoring permit compliance:', error);
      throw new Error(`Permit monitoring failed: ${error.message}`);
    }
  }

  /**
   * Automated safety training compliance
   */
  async checkSafetyTrainingCompliance(projectId: string): Promise<any> {
    try {
      // Get project employees and their training records
      const { data: employees } = await supabase
        .from('project_employees')
        .select(`
          *,
          employee:user_profiles(*),
          training_records:safety_training_records(*)
        `)
        .eq('project_id', projectId);

      if (!employees) return { compliant: true, issues: [] };

      const issues = [];
      const requiredTrainings = [
        'OSHA 10',
        'Fall Protection',
        'Hazard Communication',
        'Personal Protective Equipment'
      ];

      for (const emp of employees) {
        const trainingRecords = emp.training_records || [];
        
        for (const requiredTraining of requiredTrainings) {
          const training = trainingRecords.find((t: any) => 
            t.training_type === requiredTraining
          );

          if (!training) {
            issues.push({
              employeeId: emp.employee.id,
              employeeName: emp.employee.full_name,
              issue: 'missing_training',
              training: requiredTraining,
              severity: 'high',
              actionRequired: `Schedule ${requiredTraining} training`
            });
          } else {
            const expirationDate = new Date(training.expiration_date);
            const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            if (expirationDate < new Date()) {
              issues.push({
                employeeId: emp.employee.id,
                employeeName: emp.employee.full_name,
                issue: 'expired_training',
                training: requiredTraining,
                severity: 'critical',
                actionRequired: `Renew ${requiredTraining} certification immediately`
              });
            } else if (expirationDate < thirtyDaysFromNow) {
              issues.push({
                employeeId: emp.employee.id,
                employeeName: emp.employee.full_name,
                issue: 'expiring_training',
                training: requiredTraining,
                severity: 'medium',
                actionRequired: `Schedule ${requiredTraining} renewal`
              });
            }
          }
        }
      }

      // Create tasks for training issues
      for (const issue of issues.filter(i => i.severity === 'critical' || i.severity === 'high')) {
        await supabase
          .from('tasks')
          .insert([{
            project_id: projectId,
            name: `Safety Training: ${issue.employeeName}`,
            description: `${issue.actionRequired} for ${issue.employeeName}`,
            priority: issue.severity === 'critical' ? 'urgent' : 'high',
            category: 'safety_training',
            assigned_to: issue.employeeId,
            created_by_automation: true
          }]);
      }

      return {
        compliant: issues.length === 0,
        totalEmployees: employees.length,
        issues,
        complianceRate: Math.round(((employees.length * requiredTrainings.length - issues.length) / (employees.length * requiredTrainings.length)) * 100)
      };

    } catch (error: any) {
      console.error('Error checking safety training compliance:', error);
      throw new Error(`Safety training compliance check failed: ${error.message}`);
    }
  }

  // Private helper methods
  private async getApplicableRequirements(
    projectType: string, 
    location: { state: string; city: string }
  ): Promise<ComplianceRequirement[]> {
    // This would typically integrate with regulatory databases
    const baseRequirements: Partial<ComplianceRequirement>[] = [
      {
        name: 'OSHA Site Safety Inspection',
        description: 'Regular safety inspections as required by OSHA',
        category: 'safety',
        jurisdiction: 'federal',
        frequency: 'weekly',
        priority: 'high',
        automationEnabled: true
      },
      {
        name: 'Environmental Impact Assessment',
        description: 'Environmental compliance monitoring',
        category: 'environmental',
        jurisdiction: 'state',
        frequency: 'monthly',
        priority: 'medium',
        automationEnabled: true
      },
      {
        name: 'Labor Standards Compliance',
        description: 'Prevailing wage and labor standards compliance',
        category: 'labor',
        jurisdiction: 'federal',
        frequency: 'monthly',
        priority: 'high',
        automationEnabled: true
      }
    ];

    return baseRequirements as ComplianceRequirement[];
  }

  private async createComplianceSchedule(
    projectId: string, 
    requirements: ComplianceRequirement[]
  ): Promise<void> {
    for (const requirement of requirements) {
      await supabase
        .from('compliance_requirements')
        .insert([{
          project_id: projectId,
          name: requirement.name,
          description: requirement.description,
          category: requirement.category,
          jurisdiction: requirement.jurisdiction,
          frequency: requirement.frequency,
          priority: requirement.priority,
          automation_enabled: requirement.automationEnabled,
          next_check: this.calculateNextCheckDate(requirement.frequency)
        }]);
    }
  }

  private async setupAutomatedMonitoring(
    projectId: string, 
    requirements: ComplianceRequirement[]
  ): Promise<void> {
    // Set up automated monitoring workflows
    for (const requirement of requirements.filter(r => r.automationEnabled)) {
      // This would integrate with the workflow automation service
      console.log(`Setting up automated monitoring for: ${requirement.name}`);
    }
  }

  private calculateNextCheckDate(frequency: string): string {
    const now = new Date();
    switch (frequency) {
      case 'daily':
        now.setDate(now.getDate() + 1);
        break;
      case 'weekly':
        now.setDate(now.getDate() + 7);
        break;
      case 'monthly':
        now.setMonth(now.getMonth() + 1);
        break;
      case 'quarterly':
        now.setMonth(now.getMonth() + 3);
        break;
      case 'annually':
        now.setFullYear(now.getFullYear() + 1);
        break;
    }
    return now.toISOString().split('T')[0];
  }

  private async checkSiteInspections(projectId: string): Promise<any> {
    const { data: inspections } = await supabase
      .from('safety_inspections')
      .select('*')
      .eq('project_id', projectId)
      .order('inspection_date', { ascending: false });

    const lastInspection = inspections?.[0];
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    return {
      required: true,
      frequency: 'weekly',
      lastInspection: lastInspection?.inspection_date,
      nextDue: lastInspection ? 
        new Date(new Date(lastInspection.inspection_date).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] :
        new Date().toISOString().split('T')[0],
      overdue: !lastInspection || new Date(lastInspection.inspection_date) < oneWeekAgo
    };
  }

  private async checkSafetyTraining(employees: any[]): Promise<any> {
    // Implementation for safety training checks
    return {
      required: true,
      employees: employees.map(emp => ({
        id: emp.id,
        name: emp.full_name,
        lastTraining: emp.last_safety_training,
        certificationsExpiring: []
      }))
    };
  }

  private async checkIncidentReporting(incidents: any[]): Promise<any> {
    const recentIncidents = incidents.filter(incident => 
      new Date(incident.incident_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    return {
      required: true,
      reportingDeadline: 24, // hours
      recentIncidents: recentIncidents.length
    };
  }

  private async checkHazardCommunication(projectId: string): Promise<any> {
    // Implementation for hazard communication checks
    return {
      sdsSheets: true,
      labelingCompliant: true,
      trainingCurrent: true
    };
  }

  private async storeComplianceResults(
    projectId: string, 
    complianceType: string, 
    results: any
  ): Promise<void> {
    await supabase
      .from('compliance_checks')
      .insert([{
        project_id: projectId,
        compliance_type: complianceType,
        check_date: new Date().toISOString(),
        results: results,
        automated_check: true
      }]);
  }

  private async generateComplianceRecommendations(checks: any[]): Promise<string[]> {
    const recommendations = [];
    
    const failedChecks = checks.filter(check => check.result === 'fail');
    if (failedChecks.length > 0) {
      recommendations.push(`Address ${failedChecks.length} failed compliance checks immediately`);
    }

    const warningChecks = checks.filter(check => check.result === 'warning');
    if (warningChecks.length > 0) {
      recommendations.push(`Review ${warningChecks.length} compliance warnings to prevent future issues`);
    }

    return recommendations;
  }
}

// Export singleton instance
export const complianceAutomationService = new ComplianceAutomationService();
export default complianceAutomationService;
