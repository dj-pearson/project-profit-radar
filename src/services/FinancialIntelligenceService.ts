import { toast } from 'sonner';

export interface CashFlowForecast {
  projectId?: string;
  companyId: string;
  forecastPeriod: {
    startDate: string;
    endDate: string;
  };
  monthlyForecasts: Array<{
    month: string;
    projectedIncome: number;
    projectedExpenses: number;
    netCashFlow: number;
    cumulativeCashFlow: number;
    confidence: number;
    keyDrivers: string[];
  }>;
  riskFactors: {
    latePayments: number;
    seasonalVariation: number;
    projectDelays: number;
    marketConditions: number;
  };
  recommendations: string[];
  lastUpdated: string;
}

export interface ProfitabilityAnalysis {
  projectId: string;
  projectName: string;
  analysis: {
    budgetedProfit: number;
    actualProfit: number;
    profitMargin: number;
    grossMargin: number;
    netMargin: number;
    returnOnInvestment: number;
  };
  breakdown: {
    revenue: {
      contractValue: number;
      changeOrders: number;
      totalRevenue: number;
    };
    costs: {
      directCosts: number;
      indirectCosts: number;
      overhead: number;
      totalCosts: number;
    };
  };
  trends: Array<{
    period: string;
    profitMargin: number;
    efficiency: number;
  }>;
}

export interface RiskAssessment {
  companyId: string;
  projectId?: string;
  assessmentDate: string;
  overallRiskScore: number;
  riskCategories: {
    financial: {
      score: number;
      factors: string[];
      mitigation: string[];
    };
    operational: {
      score: number;
      factors: string[];
      mitigation: string[];
    };
    market: {
      score: number;
      factors: string[];
      mitigation: string[];
    };
    regulatory: {
      score: number;
      factors: string[];
      mitigation: string[];
    };
  };
  recommendations: string[];
  actionItems: Array<{
    priority: 'high' | 'medium' | 'low';
    description: string;
    owner: string;
    dueDate: string;
  }>;
}

export interface ComplianceReport {
  reportId: string;
  companyId: string;
  reportType: 'tax' | 'audit' | 'regulatory' | 'insurance';
  periodStart: string;
  periodEnd: string;
  overallStatus: 'compliant' | 'non_compliant' | 'partial_compliance';
  complianceScore: number;
  sections: Array<{
    category: string;
    status: 'compliant' | 'non_compliant' | 'needs_review';
    findings: string[];
    recommendations: string[];
    evidence: string[];
  }>;
  criticalIssues: Array<{
    issue: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    deadline: string;
    remediation: string;
  }>;
  generatedAt: string;
}

class FinancialIntelligenceService {
  async generateCashFlowForecast(
    companyId: string,
    projectId?: string,
    months: number = 12
  ): Promise<CashFlowForecast> {
    try {
      // Mock cash flow forecast data
      const monthlyForecasts = [];
      let cumulativeCashFlow = 50000;

      for (let i = 0; i < months; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() + i);
        
        const projectedIncome = 75000 + (Math.random() - 0.5) * 20000;
        const projectedExpenses = 60000 + (Math.random() - 0.5) * 15000;
        const netCashFlow = projectedIncome - projectedExpenses;
        cumulativeCashFlow += netCashFlow;

        monthlyForecasts.push({
          month: date.toISOString().substring(0, 7),
          projectedIncome: Math.round(projectedIncome),
          projectedExpenses: Math.round(projectedExpenses),
          netCashFlow: Math.round(netCashFlow),
          cumulativeCashFlow: Math.round(cumulativeCashFlow),
          confidence: 0.85,
          keyDrivers: ['Project payments', 'Material costs', 'Labor expenses']
        });
      }

      const forecast: CashFlowForecast = {
        projectId,
        companyId,
        forecastPeriod: {
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        monthlyForecasts,
        riskFactors: {
          latePayments: 0.15,
          seasonalVariation: 0.08,
          projectDelays: 0.12,
          marketConditions: 0.1
        },
        recommendations: [
          'Maintain 3-month operating expense reserve',
          'Consider invoice factoring for large outstanding amounts',
          'Monitor material cost inflation closely'
        ],
        lastUpdated: new Date().toISOString()
      };

      return forecast;
    } catch (error: any) {
      console.error('Error generating cash flow forecast:', error);
      toast.error('Failed to generate cash flow forecast');
      throw new Error(`Cash flow forecast failed: ${error.message}`);
    }
  }

  async analyzeProfitability(projectId: string): Promise<ProfitabilityAnalysis> {
    try {
      // Mock profitability analysis
      const analysis: ProfitabilityAnalysis = {
        projectId,
        projectName: 'Sample Project',
        analysis: {
          budgetedProfit: 50000,
          actualProfit: 45000,
          profitMargin: 18,
          grossMargin: 25,
          netMargin: 15,
          returnOnInvestment: 22.5
        },
        breakdown: {
          revenue: {
            contractValue: 250000,
            changeOrders: 15000,
            totalRevenue: 265000
          },
          costs: {
            directCosts: 180000,
            indirectCosts: 25000,
            overhead: 15000,
            totalCosts: 220000
          }
        },
        trends: [
          { period: '2024-01', profitMargin: 16, efficiency: 92 },
          { period: '2024-02', profitMargin: 18, efficiency: 94 },
          { period: '2024-03', profitMargin: 17, efficiency: 91 }
        ]
      };

      return analysis;
    } catch (error: any) {
      console.error('Error analyzing profitability:', error);
      toast.error('Failed to analyze profitability');
      throw new Error(`Profitability analysis failed: ${error.message}`);
    }
  }

  async assessRisks(
    companyId: string,
    projectId?: string
  ): Promise<RiskAssessment> {
    try {
      // Mock risk assessment
      const assessment: RiskAssessment = {
        companyId,
        projectId,
        assessmentDate: new Date().toISOString(),
        overallRiskScore: 6.5,
        riskCategories: {
          financial: {
            score: 7.2,
            factors: ['Cash flow constraints', 'Client payment delays'],
            mitigation: ['Improve payment terms', 'Diversify client base']
          },
          operational: {
            score: 5.8,
            factors: ['Weather delays', 'Skilled labor shortage'],
            mitigation: ['Build schedule buffers', 'Cross-train employees']
          },
          market: {
            score: 6.0,
            factors: ['Material cost inflation', 'Economic uncertainty'],
            mitigation: ['Lock in material prices', 'Monitor market trends']
          },
          regulatory: {
            score: 4.5,
            factors: ['Permit delays', 'Safety compliance'],
            mitigation: ['Early permit applications', 'Regular safety training']
          }
        },
        recommendations: [
          'Increase cash reserves to 4 months operating expenses',
          'Implement stricter credit checks for new clients',
          'Consider material cost escalation clauses in contracts'
        ],
        actionItems: [
          {
            priority: 'high',
            description: 'Update payment terms to net-15',
            owner: 'Finance Manager',
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          }
        ]
      };

      return assessment;
    } catch (error: any) {
      console.error('Error assessing risks:', error);
      toast.error('Failed to assess risks');
      throw new Error(`Risk assessment failed: ${error.message}`);
    }
  }

  async generateComplianceReport(
    companyId: string,
    reportType: 'tax' | 'audit' | 'regulatory' | 'insurance',
    periodStart: string,
    periodEnd: string
  ): Promise<ComplianceReport> {
    try {
      // Mock compliance report
      const report: ComplianceReport = {
        reportId: `report-${Date.now()}`,
        companyId,
        reportType,
        periodStart,
        periodEnd,
        overallStatus: 'partial_compliance',
        complianceScore: 85,
        sections: [
          {
            category: 'Tax Compliance',
            status: 'compliant',
            findings: ['All quarterly filings submitted on time'],
            recommendations: [],
            evidence: ['Tax filing receipts', 'Payment confirmations']
          },
          {
            category: 'Safety Compliance',
            status: 'needs_review',
            findings: ['3 safety training certificates expiring within 30 days'],
            recommendations: ['Schedule renewal training sessions'],
            evidence: ['Training records', 'Certificate database']
          }
        ],
        criticalIssues: [
          {
            issue: 'Workers compensation insurance renewal due',
            severity: 'high',
            deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
            remediation: 'Contact insurance provider to renew policy'
          }
        ],
        generatedAt: new Date().toISOString()
      };

      return report;
    } catch (error: any) {
      console.error('Error generating compliance report:', error);
      toast.error('Failed to generate compliance report');
      throw new Error(`Compliance report generation failed: ${error.message}`);
    }
  }

  async optimizeBudgetAllocation(
    companyId: string,
    totalBudget: number
  ): Promise<{
    currentAllocation: Record<string, number>;
    recommendedAllocation: Record<string, number>;
    savings: number;
    recommendations: string[];
  }> {
    try {
      // Mock budget optimization
      const optimization = {
        currentAllocation: {
          labor: 0.45,
          materials: 0.35,
          equipment: 0.15,
          overhead: 0.05
        },
        recommendedAllocation: {
          labor: 0.42,
          materials: 0.38,
          equipment: 0.15,
          overhead: 0.05
        },
        savings: totalBudget * 0.03,
        recommendations: [
          'Reduce labor costs through automation',
          'Invest in higher quality materials to reduce rework',
          'Optimize equipment utilization schedules'
        ]
      };

      return optimization;
    } catch (error: any) {
      console.error('Error optimizing budget allocation:', error);
      toast.error('Failed to optimize budget allocation');
      throw new Error(`Budget optimization failed: ${error.message}`);
    }
  }
}

export const financialIntelligenceService = new FinancialIntelligenceService();
export default financialIntelligenceService;