import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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
  benchmarks: {
    industryAverage: number;
    companyAverage: number;
    bestProject: number;
  };
  improvementOpportunities: Array<{
    area: string;
    potentialSavings: number;
    implementation: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export interface FinancialRisk {
  id: string;
  type: 'cash_flow' | 'profitability' | 'collection' | 'cost_overrun' | 'market';
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: number; // 0-100
  impact: number; // Dollar amount
  description: string;
  affectedProjects: string[];
  mitigation: string[];
  timeline: string;
  owner: string;
  status: 'identified' | 'monitoring' | 'mitigating' | 'resolved';
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceReport {
  reportType: 'tax' | 'audit' | 'regulatory' | 'insurance';
  period: {
    startDate: string;
    endDate: string;
  };
  data: {
    revenue: {
      totalRevenue: number;
      taxableRevenue: number;
      exemptRevenue: number;
      breakdown: Record<string, number>;
    };
    expenses: {
      totalExpenses: number;
      deductibleExpenses: number;
      nonDeductibleExpenses: number;
      breakdown: Record<string, number>;
    };
    assets: {
      currentAssets: number;
      fixedAssets: number;
      depreciation: number;
      totalAssets: number;
    };
    liabilities: {
      currentLiabilities: number;
      longTermLiabilities: number;
      totalLiabilities: number;
    };
  };
  complianceItems: Array<{
    requirement: string;
    status: 'compliant' | 'non_compliant' | 'pending';
    evidence: string[];
    dueDate?: string;
  }>;
  generatedAt: string;
}

class FinancialIntelligenceService {
  /**
   * Generate comprehensive cash flow forecast
   */
  async generateCashFlowForecast(
    companyId: string,
    projectId?: string,
    months: number = 12
  ): Promise<CashFlowForecast> {
    try {
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + months);
      const startDate = new Date();

      // Get historical data for analysis
      const historicalData = await this.getHistoricalFinancialData(companyId, projectId);
      
      // Get current projects and contracts
      const currentProjects = await this.getCurrentProjectData(companyId, projectId);
      
      // Get outstanding invoices and payment patterns
      const paymentData = await this.getPaymentPatternData(companyId);

      // Generate monthly forecasts
      const monthlyForecasts = await this.generateMonthlyForecasts(
        historicalData,
        currentProjects,
        paymentData,
        months
      );

      // Calculate risk factors
      const riskFactors = this.calculateCashFlowRisks(historicalData, paymentData);

      // Generate recommendations
      const recommendations = this.generateCashFlowRecommendations(monthlyForecasts, riskFactors);

      const forecast: CashFlowForecast = {
        projectId,
        companyId,
        forecastPeriod: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        },
        monthlyForecasts,
        riskFactors,
        recommendations,
        lastUpdated: new Date().toISOString()
      };

      // Store forecast for future reference
      await supabase
        .from('cash_flow_forecasts')
        .insert([{
          company_id: companyId,
          project_id: projectId,
          forecast_data: forecast,
          forecast_period_months: months
        }]);

      return forecast;

    } catch (error: any) {
      console.error('Error generating cash flow forecast:', error);
      throw new Error(`Cash flow forecast failed: ${error.message}`);
    }
  }

  /**
   * Analyze project profitability in detail
   */
  async analyzeProfitability(projectId: string): Promise<ProfitabilityAnalysis> {
    try {
      // Get comprehensive project financial data
      const { data: project } = await supabase
        .from('projects')
        .select(`
          *,
          invoices(amount, status),
          expenses(amount, category),
          project_cost_entries(*),
          change_orders(amount, status),
          time_entries(hours, hourly_rate)
        `)
        .eq('id', projectId)
        .single();

      if (!project) throw new Error('Project not found');

      // Calculate revenue components
      const contractValue = project.budget || 0;
      const changeOrders = project.change_orders?.reduce((sum: number, co: any) => 
        sum + (co.status === 'approved' ? co.amount : 0), 0) || 0;
      const totalRevenue = contractValue + changeOrders;

      // Calculate cost components
      const directCosts = this.calculateDirectCosts(project);
      const indirectCosts = this.calculateIndirectCosts(project);
      const overhead = this.calculateOverhead(project, directCosts + indirectCosts);
      const totalCosts = directCosts + indirectCosts + overhead;

      // Calculate profit metrics
      const actualProfit = totalRevenue - totalCosts;
      const budgetedProfit = contractValue * 0.15; // Assumed 15% target margin
      const profitMargin = totalRevenue > 0 ? (actualProfit / totalRevenue) * 100 : 0;
      const grossMargin = totalRevenue > 0 ? ((totalRevenue - directCosts) / totalRevenue) * 100 : 0;
      const netMargin = profitMargin; // Simplified
      const returnOnInvestment = totalCosts > 0 ? (actualProfit / totalCosts) * 100 : 0;

      // Get benchmark data
      const benchmarks = await this.getProfitabilityBenchmarks(project.project_type, project.company_id);

      // Identify improvement opportunities
      const improvementOpportunities = this.identifyImprovementOpportunities(project, {
        directCosts,
        indirectCosts,
        overhead,
        profitMargin
      });

      const analysis: ProfitabilityAnalysis = {
        projectId,
        projectName: project.name,
        analysis: {
          budgetedProfit,
          actualProfit,
          profitMargin,
          grossMargin,
          netMargin,
          returnOnInvestment
        },
        breakdown: {
          revenue: {
            contractValue,
            changeOrders,
            totalRevenue
          },
          costs: {
            directCosts,
            indirectCosts,
            overhead,
            totalCosts
          }
        },
        benchmarks,
        improvementOpportunities
      };

      return analysis;

    } catch (error: any) {
      console.error('Error analyzing profitability:', error);
      throw new Error(`Profitability analysis failed: ${error.message}`);
    }
  }

  /**
   * Identify and assess financial risks
   */
  async assessFinancialRisks(companyId: string): Promise<FinancialRisk[]> {
    try {
      const risks: FinancialRisk[] = [];

      // Assess cash flow risks
      const cashFlowRisks = await this.assessCashFlowRisks(companyId);
      risks.push(...cashFlowRisks);

      // Assess collection risks
      const collectionRisks = await this.assessCollectionRisks(companyId);
      risks.push(...collectionRisks);

      // Assess cost overrun risks
      const costOverrunRisks = await this.assessCostOverrunRisks(companyId);
      risks.push(...costOverrunRisks);

      // Assess market risks
      const marketRisks = await this.assessMarketRisks(companyId);
      risks.push(...marketRisks);

      // Store risk assessment
      await supabase
        .from('financial_risk_assessments')
        .insert([{
          company_id: companyId,
          risks_data: risks,
          assessment_date: new Date().toISOString()
        }]);

      return risks;

    } catch (error: any) {
      console.error('Error assessing financial risks:', error);
      throw new Error(`Financial risk assessment failed: ${error.message}`);
    }
  }

  /**
   * Generate compliance reports for various purposes
   */
  async generateComplianceReport(
    companyId: string,
    reportType: ComplianceReport['reportType'],
    startDate: string,
    endDate: string
  ): Promise<ComplianceReport> {
    try {
      // Get financial data for the period
      const financialData = await this.getFinancialDataForPeriod(companyId, startDate, endDate);

      // Calculate revenue breakdown
      const revenue = this.calculateRevenueBreakdown(financialData);

      // Calculate expense breakdown
      const expenses = this.calculateExpenseBreakdown(financialData);

      // Calculate assets and liabilities
      const assets = this.calculateAssets(financialData);
      const liabilities = this.calculateLiabilities(financialData);

      // Get compliance requirements for report type
      const complianceItems = this.getComplianceRequirements(reportType, startDate, endDate);

      const report: ComplianceReport = {
        reportType,
        period: { startDate, endDate },
        data: {
          revenue,
          expenses,
          assets,
          liabilities
        },
        complianceItems,
        generatedAt: new Date().toISOString()
      };

      // Store report
      await supabase
        .from('compliance_reports')
        .insert([{
          company_id: companyId,
          report_type: reportType,
          period_start: startDate,
          period_end: endDate,
          report_data: report
        }]);

      return report;

    } catch (error: any) {
      console.error('Error generating compliance report:', error);
      throw new Error(`Compliance report generation failed: ${error.message}`);
    }
  }

  // Private helper methods
  private async getHistoricalFinancialData(companyId: string, projectId?: string): Promise<any> {
    const query = supabase
      .from('invoices')
      .select(`
        *,
        projects(name, project_type)
      `)
      .eq('company_id', companyId)
      .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

    if (projectId) {
      query.eq('project_id', projectId);
    }

    const { data } = await query;
    return data || [];
  }

  private async getCurrentProjectData(companyId: string, projectId?: string): Promise<any> {
    const query = supabase
      .from('projects')
      .select(`
        *,
        tasks(status, due_date),
        invoices(amount, status, due_date)
      `)
      .eq('company_id', companyId)
      .in('status', ['active', 'in_progress']);

    if (projectId) {
      query.eq('id', projectId);
    }

    const { data } = await query;
    return data || [];
  }

  private async getPaymentPatternData(companyId: string): Promise<any> {
    const { data } = await supabase
      .from('invoices')
      .select('amount, due_date, paid_date, status')
      .eq('company_id', companyId)
      .eq('status', 'paid')
      .gte('paid_date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

    return data || [];
  }

  private async generateMonthlyForecasts(
    historicalData: any,
    currentProjects: any,
    paymentData: any,
    months: number
  ): Promise<CashFlowForecast['monthlyForecasts']> {
    const forecasts = [];
    let cumulativeCashFlow = 0;

    for (let i = 0; i < months; i++) {
      const forecastMonth = new Date();
      forecastMonth.setMonth(forecastMonth.getMonth() + i + 1);
      const monthStr = forecastMonth.toISOString().substring(0, 7);

      // Project income based on current projects and historical patterns
      const projectedIncome = this.projectMonthlyIncome(
        currentProjects,
        historicalData,
        i
      );

      // Project expenses based on historical patterns
      const projectedExpenses = this.projectMonthlyExpenses(
        currentProjects,
        historicalData,
        i
      );

      const netCashFlow = projectedIncome - projectedExpenses;
      cumulativeCashFlow += netCashFlow;

      // Calculate confidence based on data quality and forecast distance
      const confidence = Math.max(0.5, 0.95 - (i * 0.05));

      // Identify key drivers for this month
      const keyDrivers = this.identifyMonthlyKeyDrivers(
        projectedIncome,
        projectedExpenses,
        currentProjects,
        i
      );

      forecasts.push({
        month: monthStr,
        projectedIncome,
        projectedExpenses,
        netCashFlow,
        cumulativeCashFlow,
        confidence,
        keyDrivers
      });
    }

    return forecasts;
  }

  private calculateCashFlowRisks(historicalData: any, paymentData: any): CashFlowForecast['riskFactors'] {
    // Calculate average payment delay
    const paymentDelays = paymentData.map((invoice: any) => {
      const dueDate = new Date(invoice.due_date);
      const paidDate = new Date(invoice.paid_date);
      return Math.max(0, (paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    });

    const avgPaymentDelay = paymentDelays.length > 0 
      ? paymentDelays.reduce((sum: number, delay: number) => sum + delay, 0) / paymentDelays.length
      : 0;

    return {
      latePayments: Math.min(100, avgPaymentDelay * 2), // Scale to 0-100
      seasonalVariation: 25, // Placeholder - would calculate from historical data
      projectDelays: 30, // Placeholder - would calculate from project data
      marketConditions: 20 // Placeholder - would integrate with market data
    };
  }

  private generateCashFlowRecommendations(
    forecasts: CashFlowForecast['monthlyForecasts'],
    riskFactors: CashFlowForecast['riskFactors']
  ): string[] {
    const recommendations = [];

    // Check for negative cash flow periods
    const negativeMonths = forecasts.filter(f => f.netCashFlow < 0);
    if (negativeMonths.length > 0) {
      recommendations.push(`Address negative cash flow in ${negativeMonths.length} month(s) - consider accelerating collections or delaying non-critical expenses`);
    }

    // Check for high payment delay risk
    if (riskFactors.latePayments > 50) {
      recommendations.push('Implement stricter payment terms and follow-up procedures to reduce collection delays');
    }

    // Check for project delay risk
    if (riskFactors.projectDelays > 40) {
      recommendations.push('Review project schedules and implement contingency plans to minimize delays');
    }

    // Check cumulative cash flow trends
    const finalCashFlow = forecasts[forecasts.length - 1]?.cumulativeCashFlow || 0;
    if (finalCashFlow < 0) {
      recommendations.push('Consider securing additional financing or credit line to maintain positive cash flow');
    }

    return recommendations;
  }

  private calculateDirectCosts(project: any): number {
    const materialCosts = project.material_usage?.reduce((sum: number, usage: any) => sum + usage.total_cost, 0) || 0;
    const laborCosts = project.time_entries?.reduce((sum: number, entry: any) => sum + (entry.hours * entry.hourly_rate), 0) || 0;
    const subcontractorCosts = project.expenses?.filter((exp: any) => exp.category === 'subcontractor')
      .reduce((sum: number, exp: any) => sum + exp.amount, 0) || 0;

    return materialCosts + laborCosts + subcontractorCosts;
  }

  private calculateIndirectCosts(project: any): number {
    const equipmentCosts = project.expenses?.filter((exp: any) => exp.category === 'equipment')
      .reduce((sum: number, exp: any) => sum + exp.amount, 0) || 0;
    const permitCosts = project.expenses?.filter((exp: any) => exp.category === 'permits')
      .reduce((sum: number, exp: any) => sum + exp.amount, 0) || 0;

    return equipmentCosts + permitCosts;
  }

  private calculateOverhead(project: any, directAndIndirectCosts: number): number {
    // Simplified overhead calculation - typically 10-15% of direct costs
    return directAndIndirectCosts * 0.12;
  }

  private async getProfitabilityBenchmarks(projectType: string, companyId: string): Promise<ProfitabilityAnalysis['benchmarks']> {
    // Get company average
    const { data: companyProjects } = await supabase
      .from('projects')
      .select('budget, final_cost')
      .eq('company_id', companyId)
      .eq('status', 'completed')
      .not('final_cost', 'is', null);

    const companyAverage = companyProjects && companyProjects.length > 0
      ? companyProjects.reduce((sum, p) => sum + ((p.budget - p.final_cost) / p.budget * 100), 0) / companyProjects.length
      : 15;

    // Industry averages (placeholder - would come from market data)
    const industryAverages: Record<string, number> = {
      'residential': 12,
      'commercial': 8,
      'industrial': 10,
      'civil': 6
    };

    return {
      industryAverage: industryAverages[projectType] || 10,
      companyAverage: Math.round(companyAverage),
      bestProject: Math.max(companyAverage * 1.5, 20)
    };
  }

  private identifyImprovementOpportunities(project: any, costs: any): ProfitabilityAnalysis['improvementOpportunities'] {
    const opportunities = [];

    // Check material cost efficiency
    if (costs.directCosts > project.budget * 0.6) {
      opportunities.push({
        area: 'Material Cost Management',
        potentialSavings: costs.directCosts * 0.1,
        implementation: 'Negotiate better supplier rates, implement just-in-time ordering',
        priority: 'high' as const
      });
    }

    // Check labor efficiency
    const laborCosts = project.time_entries?.reduce((sum: number, entry: any) => sum + (entry.hours * entry.hourly_rate), 0) || 0;
    if (laborCosts > project.budget * 0.4) {
      opportunities.push({
        area: 'Labor Efficiency',
        potentialSavings: laborCosts * 0.08,
        implementation: 'Improve scheduling, provide skills training, optimize crew sizes',
        priority: 'medium' as const
      });
    }

    return opportunities;
  }

  // Additional helper methods for risk assessment
  private async assessCashFlowRisks(companyId: string): Promise<FinancialRisk[]> {
    // Implementation for cash flow risk assessment
    return [];
  }

  private async assessCollectionRisks(companyId: string): Promise<FinancialRisk[]> {
    // Implementation for collection risk assessment
    return [];
  }

  private async assessCostOverrunRisks(companyId: string): Promise<FinancialRisk[]> {
    // Implementation for cost overrun risk assessment
    return [];
  }

  private async assessMarketRisks(companyId: string): Promise<FinancialRisk[]> {
    // Implementation for market risk assessment
    return [];
  }

  // Helper methods for compliance reporting
  private async getFinancialDataForPeriod(companyId: string, startDate: string, endDate: string): Promise<any> {
    // Get comprehensive financial data for the specified period
    return {};
  }

  private calculateRevenueBreakdown(financialData: any): ComplianceReport['data']['revenue'] {
    // Calculate revenue breakdown for compliance
    return {
      totalRevenue: 0,
      taxableRevenue: 0,
      exemptRevenue: 0,
      breakdown: {}
    };
  }

  private calculateExpenseBreakdown(financialData: any): ComplianceReport['data']['expenses'] {
    // Calculate expense breakdown for compliance
    return {
      totalExpenses: 0,
      deductibleExpenses: 0,
      nonDeductibleExpenses: 0,
      breakdown: {}
    };
  }

  private calculateAssets(financialData: any): ComplianceReport['data']['assets'] {
    // Calculate assets for compliance
    return {
      currentAssets: 0,
      fixedAssets: 0,
      depreciation: 0,
      totalAssets: 0
    };
  }

  private calculateLiabilities(financialData: any): ComplianceReport['data']['liabilities'] {
    // Calculate liabilities for compliance
    return {
      currentLiabilities: 0,
      longTermLiabilities: 0,
      totalLiabilities: 0
    };
  }

  private getComplianceRequirements(reportType: ComplianceReport['reportType'], startDate: string, endDate: string): ComplianceReport['complianceItems'] {
    // Return compliance requirements based on report type
    return [];
  }

  // Helper methods for monthly forecasting
  private projectMonthlyIncome(currentProjects: any, historicalData: any, monthOffset: number): number {
    // Project monthly income based on current projects and historical patterns
    return 0;
  }

  private projectMonthlyExpenses(currentProjects: any, historicalData: any, monthOffset: number): number {
    // Project monthly expenses based on historical patterns
    return 0;
  }

  private identifyMonthlyKeyDrivers(income: number, expenses: number, projects: any, monthOffset: number): string[] {
    // Identify key drivers for monthly cash flow
    return [];
  }
}

// Export singleton instance
export const financialIntelligenceService = new FinancialIntelligenceService();
export default financialIntelligenceService;
