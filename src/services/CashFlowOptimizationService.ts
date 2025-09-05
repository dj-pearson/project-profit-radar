import { supabase } from "@/integrations/supabase/client";

export interface CashFlowPrediction {
  projected_balance: number;
  risk_level: "low" | "medium" | "high";
  critical_dates: Date[];
  optimization_recommendations: string[];
  prediction_confidence: number;
}

export interface PaymentOptimization {
  recommended_payment_date: Date;
  early_payment_discount: number;
  cash_impact: number;
  opportunity_cost: number;
}

export interface RetainageManagement {
  total_retainage_held: number;
  upcoming_releases: RetainageRelease[];
  optimization_score: number;
  release_recommendations: string[];
}

export interface RetainageRelease {
  project_id: string;
  amount: number;
  release_date: Date;
  conditions_met: boolean;
  documentation_complete: boolean;
}

export interface CashFlowScenario {
  scenario_name: string;
  monthly_projections: MonthlyProjection[];
  total_impact: number;
  risk_assessment: string;
}

export interface MonthlyProjection {
  month: string;
  inflow: number;
  outflow: number;
  net_flow: number;
  ending_balance: number;
}

export interface LienWaiverStatus {
  id: string;
  contractor_name: string;
  waiver_type: string;
  amount: number;
  through_date: Date;
  status: "pending" | "received" | "executed";
  required_by: Date;
  payment_amount: number;
}

class CashFlowOptimizationService {
  /**
   * Predict cash flow for upcoming periods
   */
  async predictCashFlow(
    company_id: string,
    periods: number = 12
  ): Promise<CashFlowPrediction> {
    try {
      // Mock implementation - would use ML models in production
      const mockPrediction: CashFlowPrediction = {
        projected_balance: 125000,
        risk_level: "medium",
        critical_dates: [
          new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        ],
        optimization_recommendations: [
          "Accelerate invoicing for Project ABC",
          "Negotiate extended payment terms with Supplier XYZ",
          "Consider factoring receivables over 60 days",
        ],
        prediction_confidence: 0.85,
      };

      return mockPrediction;
    } catch (error) {
      console.error("Error predicting cash flow:", error);
      throw error;
    }
  }

  /**
   * Optimize payment scheduling
   */
  async optimizePaymentSchedule(
    company_id: string
  ): Promise<PaymentOptimization[]> {
    try {
      // Mock implementation
      return [
        {
          recommended_payment_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          early_payment_discount: 2.5,
          cash_impact: -15000,
          opportunity_cost: 375,
        },
        {
          recommended_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          early_payment_discount: 0,
          cash_impact: -25000,
          opportunity_cost: 0,
        },
      ];
    } catch (error) {
      console.error("Error optimizing payment schedule:", error);
      throw error;
    }
  }

  /**
   * Manage retainage and release optimization
   */
  async optimizeRetainageManagement(
    project_id: string
  ): Promise<RetainageManagement> {
    try {
      // Mock retainage data since table doesn't exist
      const retainageData = [
        { project_id: project_id, retained_amount: 50000, release_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        { project_id: project_id, retained_amount: 25000, release_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) }
      ];

      const totalRetainageHeld = retainageData.reduce((sum, r) => sum + r.retained_amount, 0) || 0;

      // Get retainage release schedule
      const retainageSchedule = await this.getRetainageReleaseSchedule(project_id);

      // Calculate optimization score
      const optimizationScore = this.calculateRetainageOptimizationScore(
        retainageData,
        retainageSchedule
      );

      const recommendations = this.generateRetainageRecommendations(
        retainageData,
        retainageSchedule
      );

      return {
        total_retainage_held: totalRetainageHeld,
        upcoming_releases: retainageSchedule,
        optimization_score: optimizationScore,
        release_recommendations: recommendations,
      };
    } catch (error) {
      console.error("Error optimizing retainage management:", error);
      throw error;
    }
  }

  /**
   * Generate cash flow scenarios for planning
   */
  async generateCashFlowScenarios(
    company_id: string
  ): Promise<CashFlowScenario[]> {
    try {
      // Mock scenarios
      return [
        {
          scenario_name: "Conservative",
          monthly_projections: this.generateMonthlyProjections("conservative"),
          total_impact: 250000,
          risk_assessment: "Low risk with steady growth",
        },
        {
          scenario_name: "Optimistic",
          monthly_projections: this.generateMonthlyProjections("optimistic"),
          total_impact: 450000,
          risk_assessment: "Higher growth potential with increased risk",
        },
        {
          scenario_name: "Pessimistic",
          monthly_projections: this.generateMonthlyProjections("pessimistic"),
          total_impact: 150000,
          risk_assessment: "Conservative estimates with risk mitigation",
        },
      ];
    } catch (error) {
      console.error("Error generating cash flow scenarios:", error);
      throw error;
    }
  }

  /**
   * Analyze working capital optimization
   */
  async analyzeWorkingCapital(company_id: string): Promise<{
    current_ratio: number;
    quick_ratio: number;
    working_capital: number;
    optimization_opportunities: string[];
    liquidity_score: number;
  }> {
    try {
      // Mock working capital analysis
      return {
        current_ratio: 2.1,
        quick_ratio: 1.8,
        working_capital: 150000,
        optimization_opportunities: [
          "Reduce inventory holding period by 15 days",
          "Improve collection period from 45 to 35 days",
          "Negotiate 10-day extension on payment terms",
        ],
        liquidity_score: 85,
      };
    } catch (error) {
      console.error("Error analyzing working capital:", error);
      throw error;
    }
  }

  /**
   * Track and manage lien waivers
   */
  async manageLienWaivers(project_id: string): Promise<LienWaiverStatus[]> {
    try {
      // Mock lien waiver data
      return [
        {
          id: "lw1",
          contractor_name: "ABC Construction",
          waiver_type: "Conditional Progress",
          amount: 15000,
          through_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          status: "pending",
          required_by: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          payment_amount: 15000,
        },
        {
          id: "lw2",
          contractor_name: "XYZ Electrical",
          waiver_type: "Unconditional Final",
          amount: 8500,
          through_date: new Date(),
          status: "received",
          required_by: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          payment_amount: 8500,
        },
      ];
    } catch (error) {
      console.error("Error managing lien waivers:", error);
      throw error;
    }
  }

  /**
   * Get cash flow history for analytics
   */
  async getCashFlowHistory(
    company_id: string,
    start_date: Date,
    end_date: Date
  ): Promise<{ date: string; inflow: number; outflow: number; balance: number }[]> {
    try {
      // Mock cash flow history data
      const history = [];
      const days = Math.ceil((end_date.getTime() - start_date.getTime()) / (1000 * 60 * 60 * 24));
      
      for (let i = 0; i < days; i++) {
        const date = new Date(start_date.getTime() + i * 24 * 60 * 60 * 1000);
        history.push({
          date: date.toISOString().split('T')[0],
          inflow: Math.random() * 20000 + 5000,
          outflow: Math.random() * 15000 + 3000,
          balance: 100000 + Math.random() * 50000,
        });
      }

      return history;
    } catch (error) {
      console.error("Error getting cash flow history:", error);
      return [];
    }
  }

  /**
   * Private helper methods
   */
  private async getRetainageReleaseSchedule(project_id: string): Promise<RetainageRelease[]> {
    // Mock implementation
    return [
      {
        project_id,
        amount: 25000,
        release_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        conditions_met: true,
        documentation_complete: false,
      },
      {
        project_id,
        amount: 25000,
        release_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        conditions_met: false,
        documentation_complete: true,
      },
    ];
  }

  private calculateRetainageOptimizationScore(
    retainageData: any[],
    schedule: RetainageRelease[]
  ): number {
    // Mock calculation
    const readyForRelease = schedule.filter(
      (r) => r.conditions_met && r.documentation_complete
    ).length;
    const totalReleases = schedule.length;
    
    return totalReleases > 0 ? (readyForRelease / totalReleases) * 100 : 0;
  }

  private generateRetainageRecommendations(
    retainageData: any[],
    schedule: RetainageRelease[]
  ): string[] {
    const recommendations: string[] = [];
    
    schedule.forEach((release) => {
      if (!release.conditions_met) {
        recommendations.push(`Complete project milestones for ${release.project_id} to unlock $${release.amount.toLocaleString()}`);
      }
      if (!release.documentation_complete) {
        recommendations.push(`Submit required documentation for ${release.project_id} retainage release`);
      }
    });

    return recommendations;
  }

  private generateMonthlyProjections(scenario: string): MonthlyProjection[] {
    const projections: MonthlyProjection[] = [];
    const baseInflow = scenario === "optimistic" ? 100000 : scenario === "conservative" ? 75000 : 50000;
    const baseOutflow = scenario === "optimistic" ? 70000 : scenario === "conservative" ? 60000 : 45000;
    
    let currentBalance = 100000;

    for (let i = 0; i < 12; i++) {
      const month = new Date(Date.now() + i * 30 * 24 * 60 * 60 * 1000).toLocaleString('default', { month: 'long' });
      const inflow = baseInflow + (Math.random() - 0.5) * 20000;
      const outflow = baseOutflow + (Math.random() - 0.5) * 15000;
      const netFlow = inflow - outflow;
      currentBalance += netFlow;

      projections.push({
        month,
        inflow,
        outflow,
        net_flow: netFlow,
        ending_balance: currentBalance,
      });
    }

    return projections;
  }
}

export const cashFlowOptimizationService = new CashFlowOptimizationService();