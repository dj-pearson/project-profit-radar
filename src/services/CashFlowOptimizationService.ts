import { supabase } from "@/integrations/supabase/client";

export interface CashFlowForecast {
  forecast_id: string;
  project_id: string;
  forecast_date: Date;
  period_type: "daily" | "weekly" | "monthly";
  cash_inflows: CashFlow[];
  cash_outflows: CashFlow[];
  net_cash_flow: number;
  cumulative_cash_flow: number;
  confidence_level: number;
  risk_factors: RiskFactor[];
}

export interface CashFlow {
  flow_id: string;
  description: string;
  amount: number;
  expected_date: Date;
  probability: number;
  category: "payment" | "expense" | "milestone" | "retention" | "change_order";
  source: string;
  payment_terms?: string;
}

export interface RiskFactor {
  factor_id: string;
  description: string;
  impact_amount: number;
  probability: number;
  mitigation_strategy: string;
  risk_level: "low" | "medium" | "high" | "critical";
}

export interface PaymentOptimization {
  optimization_id: string;
  project_id: string;
  recommended_actions: OptimizationAction[];
  potential_savings: number;
  cash_flow_improvement: number;
  implementation_priority: "low" | "medium" | "high" | "critical";
  estimated_impact_date: Date;
}

export interface OptimizationAction {
  action_id: string;
  action_type:
    | "accelerate_billing"
    | "delay_payment"
    | "negotiate_terms"
    | "factor_invoice"
    | "line_of_credit";
  description: string;
  estimated_impact: number;
  implementation_effort: "low" | "medium" | "high";
  timeline_days: number;
  dependencies: string[];
}

export interface RetainageManagement {
  project_id: string;
  total_retainage_held: number;
  retainage_schedule: RetainageRelease[];
  optimization_opportunities: RetainageOptimization[];
  compliance_status: "compliant" | "at_risk" | "non_compliant";
}

export interface RetainageRelease {
  release_id: string;
  milestone: string;
  amount: number;
  scheduled_release_date: Date;
  actual_release_date?: Date;
  status: "pending" | "released" | "delayed" | "disputed";
  requirements: string[];
}

export interface RetainageOptimization {
  optimization_id: string;
  strategy:
    | "early_release"
    | "milestone_adjustment"
    | "performance_bond"
    | "lien_waiver";
  description: string;
  potential_acceleration: number; // days
  estimated_value: number;
  implementation_complexity: "low" | "medium" | "high";
}

export interface EarnedValueMetrics {
  project_id: string;
  measurement_date: Date;
  planned_value: number; // PV - Budgeted cost of work scheduled
  earned_value: number; // EV - Budgeted cost of work performed
  actual_cost: number; // AC - Actual cost of work performed
  budget_at_completion: number; // BAC - Total project budget
  schedule_performance_index: number; // SPI = EV / PV
  cost_performance_index: number; // CPI = EV / AC
  schedule_variance: number; // SV = EV - PV
  cost_variance: number; // CV = EV - AC
  estimate_at_completion: number; // EAC
  estimate_to_complete: number; // ETC
  variance_at_completion: number; // VAC = BAC - EAC
  to_complete_performance_index: number; // TCPI
}

export interface LienWaiverManagement {
  project_id: string;
  waivers_pending: LienWaiver[];
  waivers_received: LienWaiver[];
  compliance_score: number;
  risk_assessment: LienRiskAssessment;
}

export interface LienWaiver {
  waiver_id: string;
  contractor_name: string;
  waiver_type: "conditional" | "unconditional" | "partial" | "final";
  amount: number;
  through_date: Date;
  status: "pending" | "received" | "verified" | "expired";
  required_by: Date;
  payment_amount: number;
}

export interface LienRiskAssessment {
  overall_risk: "low" | "medium" | "high" | "critical";
  missing_waivers: number;
  overdue_waivers: number;
  total_exposure: number;
  recommendations: string[];
}

export interface BillingOptimization {
  project_id: string;
  billing_efficiency: number;
  optimization_opportunities: BillingOpportunity[];
  automated_billing_rules: BillingRule[];
  payment_acceleration_options: PaymentAcceleration[];
}

export interface BillingOpportunity {
  opportunity_id: string;
  opportunity_type:
    | "progress_billing"
    | "milestone_billing"
    | "front_loaded"
    | "time_materials";
  description: string;
  estimated_acceleration: number; // days
  cash_flow_impact: number;
  implementation_effort: "low" | "medium" | "high";
}

export interface BillingRule {
  rule_id: string;
  trigger_condition: string;
  billing_action: string;
  automation_level: "manual" | "semi_automated" | "fully_automated";
  approval_required: boolean;
}

export interface PaymentAcceleration {
  acceleration_id: string;
  method:
    | "early_payment_discount"
    | "invoice_factoring"
    | "supply_chain_finance"
    | "dynamic_discounting";
  description: string;
  cost_percentage: number;
  acceleration_days: number;
  minimum_amount: number;
}

class CashFlowOptimizationService {
  /**
   * Generate comprehensive cash flow forecast
   */
  async generateCashFlowForecast(
    project_id: string,
    forecast_period_days: number = 90,
    period_type: "daily" | "weekly" | "monthly" = "weekly"
  ): Promise<CashFlowForecast[]> {
    try {
      const forecasts: CashFlowForecast[] = [];
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + forecast_period_days);

      // Get project data
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", project_id)
        .single();

      if (projectError) throw projectError;

      // Get historical cash flow data
      const historicalData = await this.getHistoricalCashFlowData(project_id);

      // Generate forecasts for each period
      let currentDate = new Date(startDate);
      let cumulativeCashFlow = await this.getCurrentCashPosition(project_id);

      while (currentDate <= endDate) {
        const periodEndDate = this.calculatePeriodEndDate(
          currentDate,
          period_type
        );

        // Predict cash inflows
        const cashInflows = await this.predictCashInflows(
          project_id,
          currentDate,
          periodEndDate
        );

        // Predict cash outflows
        const cashOutflows = await this.predictCashOutflows(
          project_id,
          currentDate,
          periodEndDate
        );

        const totalInflows = cashInflows.reduce(
          (sum, flow) => sum + flow.amount * flow.probability,
          0
        );
        const totalOutflows = cashOutflows.reduce(
          (sum, flow) => sum + flow.amount * flow.probability,
          0
        );
        const netCashFlow = totalInflows - totalOutflows;
        cumulativeCashFlow += netCashFlow;

        // Assess risk factors
        const riskFactors = await this.assessRiskFactors(
          project_id,
          currentDate,
          periodEndDate
        );

        // Calculate confidence level based on data quality and historical accuracy
        const confidenceLevel = this.calculateConfidenceLevel(
          historicalData,
          riskFactors
        );

        forecasts.push({
          forecast_id: crypto.randomUUID(),
          project_id,
          forecast_date: new Date(currentDate),
          period_type,
          cash_inflows: cashInflows,
          cash_outflows: cashOutflows,
          net_cash_flow: netCashFlow,
          cumulative_cash_flow: cumulativeCashFlow,
          confidence_level: confidenceLevel,
          risk_factors: riskFactors,
        });

        currentDate = new Date(periodEndDate);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Save forecasts to database
      await this.saveCashFlowForecasts(forecasts);

      return forecasts;
    } catch (error) {
      console.error("Error generating cash flow forecast:", error);
      throw error;
    }
  }

  /**
   * Optimize payment timing and terms
   */
  async optimizePaymentFlow(project_id: string): Promise<PaymentOptimization> {
    try {
      const recommendedActions: OptimizationAction[] = [];
      let potentialSavings = 0;
      let cashFlowImprovement = 0;

      // Analyze current payment patterns
      const paymentPatterns = await this.analyzePaymentPatterns(project_id);

      // Identify billing acceleration opportunities
      const billingOpportunities = await this.identifyBillingAcceleration(
        project_id
      );
      for (const opportunity of billingOpportunities) {
        recommendedActions.push({
          action_id: crypto.randomUUID(),
          action_type: "accelerate_billing",
          description: `Accelerate billing for ${opportunity.description}`,
          estimated_impact: opportunity.cash_flow_impact,
          implementation_effort: opportunity.implementation_effort,
          timeline_days: 5,
          dependencies: [],
        });
        cashFlowImprovement += opportunity.cash_flow_impact;
      }

      // Analyze payment terms optimization
      const paymentTermsOptimization = await this.analyzePaymentTerms(
        project_id
      );
      if (paymentTermsOptimization.potential_improvement > 1000) {
        recommendedActions.push({
          action_id: crypto.randomUUID(),
          action_type: "negotiate_terms",
          description:
            "Negotiate more favorable payment terms with key suppliers",
          estimated_impact: paymentTermsOptimization.potential_improvement,
          implementation_effort: "medium",
          timeline_days: 14,
          dependencies: [],
        });
        potentialSavings += paymentTermsOptimization.potential_improvement;
      }

      // Check invoice factoring opportunities
      const factoringOpportunity = await this.evaluateInvoiceFactoring(
        project_id
      );
      if (factoringOpportunity.recommended) {
        recommendedActions.push({
          action_id: crypto.randomUUID(),
          action_type: "factor_invoice",
          description: "Factor high-value invoices to accelerate cash flow",
          estimated_impact: factoringOpportunity.cash_acceleration,
          implementation_effort: "low",
          timeline_days: 3,
          dependencies: [],
        });
        cashFlowImprovement += factoringOpportunity.cash_acceleration;
      }

      // Assess line of credit needs
      const creditNeed = await this.assessCreditLineNeeds(project_id);
      if (creditNeed.recommended_amount > 0) {
        recommendedActions.push({
          action_id: crypto.randomUUID(),
          action_type: "line_of_credit",
          description: `Establish line of credit for $${creditNeed.recommended_amount.toLocaleString()}`,
          estimated_impact: creditNeed.cash_flow_stability_value,
          implementation_effort: "high",
          timeline_days: 30,
          dependencies: [],
        });
        cashFlowImprovement += creditNeed.cash_flow_stability_value;
      }

      const priority = this.calculateOptimizationPriority(
        potentialSavings,
        cashFlowImprovement
      );

      return {
        optimization_id: crypto.randomUUID(),
        project_id,
        recommended_actions: recommendedActions,
        potential_savings: potentialSavings,
        cash_flow_improvement: cashFlowImprovement,
        implementation_priority: priority,
        estimated_impact_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      };
    } catch (error) {
      console.error("Error optimizing payment flow:", error);
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
      // Get current retainage information
      const { data: retainageData, error } = await supabase
        .from("project_retainage")
        .select("*")
        .eq("project_id", project_id);

      if (error) throw error;

      const totalRetainageHeld =
        retainageData?.reduce((sum, r) => sum + r.amount_held, 0) || 0;

      // Get retainage release schedule
      const retainageSchedule = await this.getRetainageReleaseSchedule(
        project_id
      );

      // Identify optimization opportunities
      const optimizationOpportunities: RetainageOptimization[] = [];

      // Early release opportunities
      const earlyReleaseOpportunity = await this.evaluateEarlyRetainageRelease(
        project_id
      );
      if (earlyReleaseOpportunity.feasible) {
        optimizationOpportunities.push({
          optimization_id: crypto.randomUUID(),
          strategy: "early_release",
          description:
            "Negotiate early retainage release based on performance milestones",
          potential_acceleration: earlyReleaseOpportunity.acceleration_days,
          estimated_value: earlyReleaseOpportunity.value,
          implementation_complexity: "medium",
        });
      }

      // Performance bond substitution
      const performanceBondOption =
        await this.evaluatePerformanceBondSubstitution(project_id);
      if (performanceBondOption.cost_effective) {
        optimizationOpportunities.push({
          optimization_id: crypto.randomUUID(),
          strategy: "performance_bond",
          description:
            "Replace retainage with performance bond to improve cash flow",
          potential_acceleration: performanceBondOption.acceleration_days,
          estimated_value: performanceBondOption.net_benefit,
          implementation_complexity: "high",
        });
      }

      // Milestone adjustment opportunities
      const milestoneAdjustments = await this.evaluateMilestoneAdjustments(
        project_id
      );
      if (milestoneAdjustments.beneficial) {
        optimizationOpportunities.push({
          optimization_id: crypto.randomUUID(),
          strategy: "milestone_adjustment",
          description:
            "Adjust milestone definitions to accelerate retainage release",
          potential_acceleration: milestoneAdjustments.acceleration_days,
          estimated_value: milestoneAdjustments.value,
          implementation_complexity: "low",
        });
      }

      // Assess compliance status
      const complianceStatus =
        this.assessRetainageCompliance(retainageSchedule);

      return {
        project_id,
        total_retainage_held: totalRetainageHeld,
        retainage_schedule: retainageSchedule,
        optimization_opportunities: optimizationOpportunities,
        compliance_status: complianceStatus,
      };
    } catch (error) {
      console.error("Error optimizing retainage management:", error);
      throw error;
    }
  }

  /**
   * Calculate Earned Value Management metrics
   */
  async calculateEarnedValueMetrics(
    project_id: string
  ): Promise<EarnedValueMetrics> {
    try {
      // Get project budget and timeline data
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("budget, start_date, end_date")
        .eq("id", project_id)
        .single();

      if (projectError) throw projectError;

      const budgetAtCompletion = project.budget || 0;
      const projectStartDate = new Date(project.start_date);
      const projectEndDate = new Date(project.end_date);
      const measurementDate = new Date();

      // Calculate Planned Value (PV)
      const totalProjectDays = Math.ceil(
        (projectEndDate.getTime() - projectStartDate.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      const daysElapsed = Math.ceil(
        (measurementDate.getTime() - projectStartDate.getTime()) /
          (1000 * 60 * 60 * 24)
      );
      const plannedValue =
        (daysElapsed / totalProjectDays) * budgetAtCompletion;

      // Calculate Earned Value (EV) based on task completion
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select("budget_allocated, completion_percentage")
        .eq("project_id", project_id);

      if (tasksError) throw tasksError;

      const earnedValue = (tasks || []).reduce((sum, task) => {
        return sum + task.budget_allocated * (task.completion_percentage / 100);
      }, 0);

      // Calculate Actual Cost (AC)
      const { data: expenses, error: expensesError } = await supabase
        .from("project_expenses")
        .select("amount")
        .eq("project_id", project_id);

      if (expensesError) throw expensesError;

      const actualCost = (expenses || []).reduce(
        (sum, expense) => sum + expense.amount,
        0
      );

      // Calculate derived metrics
      const schedulePerformanceIndex =
        plannedValue > 0 ? earnedValue / plannedValue : 0;
      const costPerformanceIndex =
        actualCost > 0 ? earnedValue / actualCost : 0;
      const scheduleVariance = earnedValue - plannedValue;
      const costVariance = earnedValue - actualCost;

      // Estimate at Completion (EAC)
      const estimateAtCompletion =
        costPerformanceIndex > 0
          ? budgetAtCompletion / costPerformanceIndex
          : budgetAtCompletion;

      // Estimate to Complete (ETC)
      const estimateToComplete = estimateAtCompletion - actualCost;

      // Variance at Completion (VAC)
      const varianceAtCompletion = budgetAtCompletion - estimateAtCompletion;

      // To Complete Performance Index (TCPI)
      const workRemaining = budgetAtCompletion - earnedValue;
      const fundsRemaining = budgetAtCompletion - actualCost;
      const toCompletePerformanceIndex =
        fundsRemaining > 0 ? workRemaining / fundsRemaining : 0;

      const metrics: EarnedValueMetrics = {
        project_id,
        measurement_date: measurementDate,
        planned_value: plannedValue,
        earned_value: earnedValue,
        actual_cost: actualCost,
        budget_at_completion: budgetAtCompletion,
        schedule_performance_index: schedulePerformanceIndex,
        cost_performance_index: costPerformanceIndex,
        schedule_variance: scheduleVariance,
        cost_variance: costVariance,
        estimate_at_completion: estimateAtCompletion,
        estimate_to_complete: estimateToComplete,
        variance_at_completion: varianceAtCompletion,
        to_complete_performance_index: toCompletePerformanceIndex,
      };

      // Save metrics to database
      await this.saveEarnedValueMetrics(metrics);

      return metrics;
    } catch (error) {
      console.error("Error calculating earned value metrics:", error);
      throw error;
    }
  }

  /**
   * Manage lien waivers and compliance
   */
  async manageLienWaivers(project_id: string): Promise<LienWaiverManagement> {
    try {
      // Get all lien waivers for the project
      const { data: waivers, error } = await supabase
        .from("lien_waivers")
        .select("*")
        .eq("project_id", project_id)
        .order("required_by");

      if (error) throw error;

      const waiversPending = (waivers || []).filter(
        (w) => w.status === "pending"
      );
      const waiversReceived = (waivers || []).filter(
        (w) => w.status === "received"
      );

      // Calculate compliance score
      const totalWaivers = waivers?.length || 0;
      const receivedWaivers = waiversReceived.length;
      const complianceScore =
        totalWaivers > 0 ? (receivedWaivers / totalWaivers) * 100 : 100;

      // Assess lien risk
      const currentDate = new Date();
      const overdueWaivers = waiversPending.filter(
        (w) => new Date(w.required_by) < currentDate
      );
      const totalExposure = waiversPending.reduce(
        (sum, w) => sum + w.payment_amount,
        0
      );

      let overallRisk: "low" | "medium" | "high" | "critical" = "low";
      if (overdueWaivers.length > 5 || totalExposure > 100000) {
        overallRisk = "critical";
      } else if (overdueWaivers.length > 2 || totalExposure > 50000) {
        overallRisk = "high";
      } else if (overdueWaivers.length > 0 || totalExposure > 10000) {
        overallRisk = "medium";
      }

      const recommendations: string[] = [];
      if (overdueWaivers.length > 0) {
        recommendations.push(
          `Follow up on ${overdueWaivers.length} overdue lien waivers`
        );
      }
      if (complianceScore < 80) {
        recommendations.push("Implement automated lien waiver tracking system");
      }
      if (totalExposure > 25000) {
        recommendations.push("Consider requiring lien waivers before payment");
      }

      const riskAssessment: LienRiskAssessment = {
        overall_risk: overallRisk,
        missing_waivers: waiversPending.length,
        overdue_waivers: overdueWaivers.length,
        total_exposure: totalExposure,
        recommendations,
      };

      return {
        project_id,
        waivers_pending: waiversPending.map((w) => ({
          waiver_id: w.id,
          contractor_name: w.contractor_name,
          waiver_type: w.waiver_type,
          amount: w.amount,
          through_date: new Date(w.through_date),
          status: w.status,
          required_by: new Date(w.required_by),
          payment_amount: w.payment_amount,
        })),
        waivers_received: waiversReceived.map((w) => ({
          waiver_id: w.id,
          contractor_name: w.contractor_name,
          waiver_type: w.waiver_type,
          amount: w.amount,
          through_date: new Date(w.through_date),
          status: w.status,
          required_by: new Date(w.required_by),
          payment_amount: w.payment_amount,
        })),
        compliance_score: complianceScore,
        risk_assessment: riskAssessment,
      };
    } catch (error) {
      console.error("Error managing lien waivers:", error);
      throw error;
    }
  }

  /**
   * Optimize billing processes and automation
   */
  async optimizeBillingProcesses(
    project_id: string
  ): Promise<BillingOptimization> {
    try {
      // Analyze current billing efficiency
      const billingEfficiency = await this.analyzeBillingEfficiency(project_id);

      // Identify billing opportunities
      const opportunities: BillingOpportunity[] = [];

      // Progress billing optimization
      const progressBillingOpportunity = await this.evaluateProgressBilling(
        project_id
      );
      if (progressBillingOpportunity.beneficial) {
        opportunities.push({
          opportunity_id: crypto.randomUUID(),
          opportunity_type: "progress_billing",
          description:
            "Implement automated progress billing based on completion milestones",
          estimated_acceleration: progressBillingOpportunity.acceleration_days,
          cash_flow_impact: progressBillingOpportunity.cash_impact,
          implementation_effort: "medium",
        });
      }

      // Milestone billing optimization
      const milestoneOpportunity = await this.evaluateMilestoneBilling(
        project_id
      );
      if (milestoneOpportunity.beneficial) {
        opportunities.push({
          opportunity_id: crypto.randomUUID(),
          opportunity_type: "milestone_billing",
          description:
            "Restructure billing to align with key project milestones",
          estimated_acceleration: milestoneOpportunity.acceleration_days,
          cash_flow_impact: milestoneOpportunity.cash_impact,
          implementation_effort: "low",
        });
      }

      // Create automated billing rules
      const billingRules: BillingRule[] = [
        {
          rule_id: crypto.randomUUID(),
          trigger_condition: "Task completion >= 100%",
          billing_action: "Generate completion billing",
          automation_level: "semi_automated",
          approval_required: true,
        },
        {
          rule_id: crypto.randomUUID(),
          trigger_condition: "Monthly milestone reached",
          billing_action: "Generate progress billing",
          automation_level: "fully_automated",
          approval_required: false,
        },
        {
          rule_id: crypto.randomUUID(),
          trigger_condition: "Change order approved",
          billing_action: "Add to next billing cycle",
          automation_level: "semi_automated",
          approval_required: true,
        },
      ];

      // Identify payment acceleration options
      const paymentAcceleration: PaymentAcceleration[] = [
        {
          acceleration_id: crypto.randomUUID(),
          method: "early_payment_discount",
          description: "Offer 2% discount for payment within 10 days",
          cost_percentage: 2.0,
          acceleration_days: 20,
          minimum_amount: 5000,
        },
        {
          acceleration_id: crypto.randomUUID(),
          method: "invoice_factoring",
          description: "Factor large invoices for immediate cash",
          cost_percentage: 3.5,
          acceleration_days: 30,
          minimum_amount: 25000,
        },
      ];

      return {
        project_id,
        billing_efficiency: billingEfficiency,
        optimization_opportunities: opportunities,
        automated_billing_rules: billingRules,
        payment_acceleration_options: paymentAcceleration,
      };
    } catch (error) {
      console.error("Error optimizing billing processes:", error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async getHistoricalCashFlowData(project_id: string): Promise<any[]> {
    const { data } = await supabase
      .from("cash_flow_history")
      .select("*")
      .eq("project_id", project_id)
      .order("date");

    return data || [];
  }

  private async getCurrentCashPosition(project_id: string): Promise<number> {
    const { data } = await supabase
      .from("project_financials")
      .select("current_cash_position")
      .eq("project_id", project_id)
      .single();

    return data?.current_cash_position || 0;
  }

  private calculatePeriodEndDate(
    startDate: Date,
    periodType: "daily" | "weekly" | "monthly"
  ): Date {
    const endDate = new Date(startDate);
    switch (periodType) {
      case "daily":
        return endDate;
      case "weekly":
        endDate.setDate(endDate.getDate() + 6);
        return endDate;
      case "monthly":
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(endDate.getDate() - 1);
        return endDate;
    }
  }

  private async predictCashInflows(
    project_id: string,
    startDate: Date,
    endDate: Date
  ): Promise<CashFlow[]> {
    // Implementation would predict cash inflows based on billing schedule, milestones, etc.
    return [
      {
        flow_id: crypto.randomUUID(),
        description: "Progress payment",
        amount: 25000,
        expected_date: new Date(startDate.getTime() + 3 * 24 * 60 * 60 * 1000),
        probability: 0.9,
        category: "payment",
        source: "client_payment",
      },
    ];
  }

  private async predictCashOutflows(
    project_id: string,
    startDate: Date,
    endDate: Date
  ): Promise<CashFlow[]> {
    // Implementation would predict cash outflows based on supplier payments, payroll, etc.
    return [
      {
        flow_id: crypto.randomUUID(),
        description: "Material supplier payment",
        amount: 15000,
        expected_date: new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000),
        probability: 0.95,
        category: "expense",
        source: "supplier_payment",
        payment_terms: "Net 30",
      },
    ];
  }

  private async assessRiskFactors(
    project_id: string,
    startDate: Date,
    endDate: Date
  ): Promise<RiskFactor[]> {
    return [
      {
        factor_id: crypto.randomUUID(),
        description: "Client payment delay risk",
        impact_amount: -10000,
        probability: 0.2,
        mitigation_strategy: "Follow up on overdue invoices",
        risk_level: "medium",
      },
    ];
  }

  private calculateConfidenceLevel(
    historicalData: any[],
    riskFactors: RiskFactor[]
  ): number {
    const baseConfidence = 0.8;
    const dataQualityFactor = Math.min(historicalData.length / 10, 1) * 0.1;
    const riskFactor = riskFactors.reduce(
      (acc, risk) => acc + risk.probability * 0.1,
      0
    );

    return Math.max(
      0.3,
      Math.min(0.95, baseConfidence + dataQualityFactor - riskFactor)
    );
  }

  private async saveCashFlowForecasts(
    forecasts: CashFlowForecast[]
  ): Promise<void> {
    // Implementation would save forecasts to database
    console.log(`Saving ${forecasts.length} cash flow forecasts`);
  }

  private async analyzePaymentPatterns(project_id: string): Promise<any> {
    return { average_payment_days: 35, payment_reliability: 0.85 };
  }

  private async identifyBillingAcceleration(
    project_id: string
  ): Promise<BillingOpportunity[]> {
    return [
      {
        opportunity_id: crypto.randomUUID(),
        opportunity_type: "progress_billing",
        description: "Monthly progress billing",
        estimated_acceleration: 15,
        cash_flow_impact: 20000,
        implementation_effort: "medium",
      },
    ];
  }

  private async analyzePaymentTerms(project_id: string): Promise<any> {
    return { potential_improvement: 5000, current_terms: "Net 30" };
  }

  private async evaluateInvoiceFactoring(project_id: string): Promise<any> {
    return { recommended: true, cash_acceleration: 15000, cost: 1200 };
  }

  private async assessCreditLineNeeds(project_id: string): Promise<any> {
    return {
      recommended_amount: 50000,
      cash_flow_stability_value: 8000,
      monthly_cost: 200,
    };
  }

  private calculateOptimizationPriority(
    savings: number,
    improvement: number
  ): "low" | "medium" | "high" | "critical" {
    const totalBenefit = savings + improvement;
    if (totalBenefit > 50000) return "critical";
    if (totalBenefit > 25000) return "high";
    if (totalBenefit > 10000) return "medium";
    return "low";
  }

  private async getRetainageReleaseSchedule(
    project_id: string
  ): Promise<RetainageRelease[]> {
    const { data } = await supabase
      .from("retainage_releases")
      .select("*")
      .eq("project_id", project_id)
      .order("scheduled_release_date");

    return (data || []).map((r) => ({
      release_id: r.id,
      milestone: r.milestone,
      amount: r.amount,
      scheduled_release_date: new Date(r.scheduled_release_date),
      actual_release_date: r.actual_release_date
        ? new Date(r.actual_release_date)
        : undefined,
      status: r.status,
      requirements: r.requirements || [],
    }));
  }

  private async evaluateEarlyRetainageRelease(
    project_id: string
  ): Promise<any> {
    return { feasible: true, acceleration_days: 30, value: 15000 };
  }

  private async evaluatePerformanceBondSubstitution(
    project_id: string
  ): Promise<any> {
    return { cost_effective: true, acceleration_days: 60, net_benefit: 8000 };
  }

  private async evaluateMilestoneAdjustments(project_id: string): Promise<any> {
    return { beneficial: true, acceleration_days: 14, value: 5000 };
  }

  private assessRetainageCompliance(
    schedule: RetainageRelease[]
  ): "compliant" | "at_risk" | "non_compliant" {
    const overdue = schedule.filter(
      (r) =>
        r.status === "pending" &&
        new Date(r.scheduled_release_date) < new Date()
    );

    if (overdue.length === 0) return "compliant";
    if (overdue.length <= 2) return "at_risk";
    return "non_compliant";
  }

  private async saveEarnedValueMetrics(
    metrics: EarnedValueMetrics
  ): Promise<void> {
    const { error } = await supabase.from("earned_value_metrics").upsert({
      project_id: metrics.project_id,
      measurement_date: metrics.measurement_date.toISOString(),
      planned_value: metrics.planned_value,
      earned_value: metrics.earned_value,
      actual_cost: metrics.actual_cost,
      budget_at_completion: metrics.budget_at_completion,
      schedule_performance_index: metrics.schedule_performance_index,
      cost_performance_index: metrics.cost_performance_index,
      schedule_variance: metrics.schedule_variance,
      cost_variance: metrics.cost_variance,
      estimate_at_completion: metrics.estimate_at_completion,
      estimate_to_complete: metrics.estimate_to_complete,
      variance_at_completion: metrics.variance_at_completion,
      to_complete_performance_index: metrics.to_complete_performance_index,
    });

    if (error) throw error;
  }

  private async analyzeBillingEfficiency(project_id: string): Promise<number> {
    // Calculate billing efficiency based on time from work completion to billing
    return 0.75; // 75% efficiency
  }

  private async evaluateProgressBilling(project_id: string): Promise<any> {
    return { beneficial: true, acceleration_days: 10, cash_impact: 12000 };
  }

  private async evaluateMilestoneBilling(project_id: string): Promise<any> {
    return { beneficial: true, acceleration_days: 7, cash_impact: 8000 };
  }
}

export const cashFlowOptimizationService = new CashFlowOptimizationService();
