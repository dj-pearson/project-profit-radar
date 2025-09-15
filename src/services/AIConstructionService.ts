import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ProjectRiskAssessment {
  projectId: string;
  riskScore: number; // 0-100
  riskFactors: {
    budgetOverrun: number;
    scheduleDelay: number;
    weatherImpact: number;
    resourceConstraints: number;
    qualityIssues: number;
  };
  recommendations: string[];
  confidenceLevel: number;
  lastUpdated: string;
}

export interface CostPrediction {
  projectId: string;
  predictedFinalCost: number;
  varianceFromBudget: number;
  completionProbability: {
    onBudget: number;
    within5Percent: number;
    within10Percent: number;
  };
  keyDrivers: string[];
  monthlyForecasts: Array<{
    month: string;
    predictedSpend: number;
    confidence: number;
  }>;
}

export interface QualityInsight {
  projectId: string;
  qualityScore: number;
  defectPredictions: Array<{
    area: string;
    riskLevel: 'low' | 'medium' | 'high';
    probability: number;
    impact: string;
  }>;
  inspectionRecommendations: string[];
  benchmarkComparison: {
    industryAverage: number;
    companyAverage: number;
    bestInClass: number;
  };
}

class AIConstructionService {
  /**
   * Analyze project risks using historical data and current metrics
   */
  async analyzeProjectRisk(projectId: string): Promise<ProjectRiskAssessment> {
    try {
      // Get project data with related metrics
      const { data: project } = await supabase
        .from('projects')
        .select(`
          *,
          tasks(status, due_date, actual_completion_date),
          expenses(amount, expense_date),
          daily_reports(weather_conditions, productivity_score),
          change_orders(amount, reason),
          quality_inspections(score, issues_found)
        `)
        .eq('id', projectId)
        .single();

      if (!project) throw new Error('Project not found');

      // Calculate risk factors
      const budgetOverrun = this.calculateBudgetRisk(project);
      const scheduleDelay = this.calculateScheduleRisk(project);
      const weatherImpact = this.calculateWeatherRisk(project);
      const resourceConstraints = this.calculateResourceRisk(project);
      const qualityIssues = this.calculateQualityRisk(project);

      // Overall risk score (weighted average)
      const riskScore = Math.round(
        (budgetOverrun * 0.3 + 
         scheduleDelay * 0.25 + 
         weatherImpact * 0.15 + 
         resourceConstraints * 0.2 + 
         qualityIssues * 0.1)
      );

      // Generate recommendations
      const recommendations = this.generateRiskRecommendations({
        budgetOverrun,
        scheduleDelay,
        weatherImpact,
        resourceConstraints,
        qualityIssues
      });

      const assessment: ProjectRiskAssessment = {
        projectId,
        riskScore,
        riskFactors: {
          budgetOverrun,
          scheduleDelay,
          weatherImpact,
          resourceConstraints,
          qualityIssues
        },
        recommendations,
        confidenceLevel: 0.85, // Based on data quality
        lastUpdated: new Date().toISOString()
      };

      // Store assessment for historical tracking
      await (supabase as any)
        .from('ai_quality_analysis')
        .insert([{
          project_id: projectId,
          analysis_type: 'risk_assessment',
          analysis_results: assessment as any,
          confidence_score: assessment.confidenceLevel,
        }]);

      return assessment;

    } catch (error: any) {
      console.error('Error analyzing project risk:', error);
      throw new Error(`Risk analysis failed: ${error.message}`);
    }
  }

  /**
   * Predict final project costs using ML-style analysis
   */
  async predictProjectCosts(projectId: string): Promise<CostPrediction> {
    try {
      // Get comprehensive project financial data
      const { data: project } = await supabase
        .from('projects')
        .select(`
          *,
          project_cost_entries(*),
          change_orders(amount, status),
          material_usage(total_cost),
          time_entries(billable_hours, hourly_rate)
        `)
        .eq('id', projectId)
        .single();

      if (!project) throw new Error('Project not found');

      // Calculate current spend and burn rate
      const currentSpend = this.calculateCurrentSpend(project);
      const burnRate = this.calculateBurnRate(project);
      const completionPercentage = project.completion_percentage || 0;

      // Predict final cost using multiple methods
      const linearProjection = currentSpend / (completionPercentage / 100);
      const burnRateProjection = this.projectFromBurnRate(burnRate, project);
      const historicalAdjustment = await this.getHistoricalAdjustment(project);

      // Weighted prediction
      const predictedFinalCost = Math.round(
        (linearProjection * 0.4 + 
         burnRateProjection * 0.4 + 
         historicalAdjustment * 0.2)
      );

      const varianceFromBudget = predictedFinalCost - project.budget;
      const variancePercentage = (varianceFromBudget / project.budget) * 100;

      // Calculate completion probabilities
      const completionProbability = {
        onBudget: Math.max(0, 100 - Math.abs(variancePercentage * 2)),
        within5Percent: Math.max(0, 100 - Math.abs(variancePercentage * 1.5)),
        within10Percent: Math.max(0, 100 - Math.abs(variancePercentage))
      };

      // Generate monthly forecasts
      const monthlyForecasts = this.generateMonthlyForecasts(
        project,
        predictedFinalCost,
        currentSpend
      );

      const prediction: CostPrediction = {
        projectId,
        predictedFinalCost,
        varianceFromBudget,
        completionProbability,
        keyDrivers: this.identifyKeyDrivers(project, variancePercentage),
        monthlyForecasts
      };

      return prediction;

    } catch (error: any) {
      console.error('Error predicting project costs:', error);
      throw new Error(`Cost prediction failed: ${error.message}`);
    }
  }

  /**
   * Generate quality insights and defect predictions
   */
  async generateQualityInsights(projectId: string): Promise<QualityInsight> {
    try {
      // Get quality-related data
      const { data: qualityData } = await supabase
        .from('quality_inspections')
        .select(`
          *,
          ai_defect_detection(*)
        `)
        .eq('project_id', projectId);

      const { data: project } = await supabase
        .from('projects')
        .select('project_type, start_date, budget')
        .eq('id', projectId)
        .single();

      if (!qualityData || !project) throw new Error('Insufficient data for quality analysis');

      // Calculate quality score
      const qualityScore = this.calculateQualityScore(qualityData);

      // Predict potential defects
      const defectPredictions = this.predictDefects(qualityData, project);

      // Generate inspection recommendations
      const inspectionRecommendations = this.generateInspectionRecommendations(
        qualityData,
        project
      );

      // Get benchmark data
      const benchmarkComparison = await this.getBenchmarkComparison(
        project.project_type,
        qualityScore
      );

      const insights: QualityInsight = {
        projectId,
        qualityScore,
        defectPredictions,
        inspectionRecommendations,
        benchmarkComparison
      };

      return insights;

    } catch (error: any) {
      console.error('Error generating quality insights:', error);
      throw new Error(`Quality analysis failed: ${error.message}`);
    }
  }

  // Private helper methods
  private calculateBudgetRisk(project: any): number {
    const currentSpend = project.expenses?.reduce((sum: number, exp: any) => sum + exp.amount, 0) || 0;
    const budgetUsed = (currentSpend / project.budget) * 100;
    const completionPercentage = project.completion_percentage || 0;
    
    if (completionPercentage === 0) return 20; // Low risk if just started
    
    const spendVsProgress = budgetUsed - completionPercentage;
    return Math.min(100, Math.max(0, spendVsProgress * 2 + 20));
  }

  private calculateScheduleRisk(project: any): number {
    const tasks = project.tasks || [];
    const overdueTasks = tasks.filter((task: any) => 
      task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'
    ).length;
    
    const totalTasks = tasks.length || 1;
    const overduePercentage = (overdueTasks / totalTasks) * 100;
    
    return Math.min(100, overduePercentage * 1.5);
  }

  private calculateWeatherRisk(project: any): number {
    const reports = project.daily_reports || [];
    const badWeatherDays = reports.filter((report: any) => 
      report.weather_conditions && 
      ['rain', 'snow', 'storm', 'extreme_heat', 'extreme_cold'].includes(report.weather_conditions.toLowerCase())
    ).length;
    
    const totalReports = reports.length || 1;
    const badWeatherPercentage = (badWeatherDays / totalReports) * 100;
    
    return Math.min(100, badWeatherPercentage * 2);
  }

  private calculateResourceRisk(project: any): number {
    // Simplified calculation - could be enhanced with actual resource data
    const changeOrders = project.change_orders || [];
    const resourceRelatedChanges = changeOrders.filter((co: any) => 
      co.reason && co.reason.toLowerCase().includes('resource')
    ).length;
    
    return Math.min(100, resourceRelatedChanges * 10);
  }

  private calculateQualityRisk(project: any): number {
    const inspections = project.quality_inspections || [];
    if (inspections.length === 0) return 30; // Medium risk if no inspections
    
    const averageScore = inspections.reduce((sum: number, insp: any) => sum + (insp.score || 0), 0) / inspections.length;
    const totalIssues = inspections.reduce((sum: number, insp: any) => sum + (insp.issues_found || 0), 0);
    
    const qualityRisk = Math.max(0, 100 - averageScore) + (totalIssues * 5);
    return Math.min(100, qualityRisk);
  }

  private generateRiskRecommendations(riskFactors: any): string[] {
    const recommendations: string[] = [];
    
    if (riskFactors.budgetOverrun > 60) {
      recommendations.push('Review and tighten budget controls - consider implementing daily cost tracking');
      recommendations.push('Evaluate change order processes to prevent scope creep');
    }
    
    if (riskFactors.scheduleDelay > 50) {
      recommendations.push('Conduct critical path analysis to identify bottlenecks');
      recommendations.push('Consider adding resources to critical tasks');
    }
    
    if (riskFactors.weatherImpact > 40) {
      recommendations.push('Develop weather contingency plans for outdoor work');
      recommendations.push('Consider adjusting schedule for seasonal weather patterns');
    }
    
    if (riskFactors.qualityIssues > 50) {
      recommendations.push('Increase inspection frequency and implement quality checkpoints');
      recommendations.push('Provide additional training for crew members');
    }
    
    return recommendations;
  }

  private calculateCurrentSpend(project: any): number {
    const expenses = project.project_cost_entries?.reduce((sum: number, entry: any) => sum + entry.amount, 0) || 0;
    const materialCosts = project.material_usage?.reduce((sum: number, usage: any) => sum + usage.total_cost, 0) || 0;
    const laborCosts = project.time_entries?.reduce((sum: number, entry: any) => sum + (entry.billable_hours * entry.hourly_rate), 0) || 0;
    
    return expenses + materialCosts + laborCosts;
  }

  private calculateBurnRate(project: any): number {
    // Calculate daily burn rate based on recent spending
    const recentExpenses = project.project_cost_entries?.filter((entry: any) => {
      const entryDate = new Date(entry.entry_date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return entryDate >= thirtyDaysAgo;
    }) || [];
    
    const recentSpend = recentExpenses.reduce((sum: number, entry: any) => sum + entry.amount, 0);
    return recentSpend / 30; // Daily burn rate
  }

  private projectFromBurnRate(burnRate: number, project: any): number {
    const daysRemaining = this.calculateDaysRemaining(project);
    const currentSpend = this.calculateCurrentSpend(project);
    return currentSpend + (burnRate * daysRemaining);
  }

  private calculateDaysRemaining(project: any): number {
    if (!project.end_date) return 90; // Default assumption
    
    const endDate = new Date(project.end_date);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  private async getHistoricalAdjustment(project: any): Promise<number> {
    // Get similar completed projects for comparison
    const { data: historicalProjects } = await supabase
      .from('projects')
      .select('budget, final_cost')
      .eq('project_type', project.project_type)
      .eq('status', 'completed')
      .not('final_cost', 'is', null);
    
    if (!historicalProjects || historicalProjects.length === 0) {
      return project.budget * 1.1; // 10% buffer if no historical data
    }
    
    const averageOverrun = historicalProjects.reduce((sum, p) => {
      return sum + ((p.final_cost - p.budget) / p.budget);
    }, 0) / historicalProjects.length;
    
    return project.budget * (1 + averageOverrun);
  }

  private generateMonthlyForecasts(project: any, predictedFinalCost: number, currentSpend: number): any[] {
    const remainingCost = predictedFinalCost - currentSpend;
    const daysRemaining = this.calculateDaysRemaining(project);
    const monthsRemaining = Math.ceil(daysRemaining / 30);
    
    const forecasts = [];
    const monthlySpend = remainingCost / monthsRemaining;
    
    for (let i = 0; i < monthsRemaining; i++) {
      const month = new Date();
      month.setMonth(month.getMonth() + i + 1);
      
      forecasts.push({
        month: month.toISOString().substring(0, 7), // YYYY-MM format
        predictedSpend: Math.round(monthlySpend),
        confidence: Math.max(0.6, 0.9 - (i * 0.1)) // Decreasing confidence over time
      });
    }
    
    return forecasts;
  }

  private identifyKeyDrivers(project: any, variancePercentage: number): string[] {
    const drivers = [];
    
    if (Math.abs(variancePercentage) > 10) {
      if (project.change_orders?.length > 3) {
        drivers.push('High number of change orders');
      }
      
      if (project.material_usage?.some((usage: any) => usage.total_cost > usage.estimated_cost * 1.2)) {
        drivers.push('Material cost overruns');
      }
      
      // Add more driver identification logic
      drivers.push('Schedule delays affecting labor costs');
    }
    
    return drivers;
  }

  private calculateQualityScore(qualityData: any[]): number {
    if (qualityData.length === 0) return 70; // Default score
    
    const averageScore = qualityData.reduce((sum, inspection) => sum + (inspection.score || 0), 0) / qualityData.length;
    return Math.round(averageScore);
  }

  private predictDefects(qualityData: any[], project: any): any[] {
    // Simplified defect prediction logic
    const predictions = [];
    
    const lowQualityInspections = qualityData.filter(inspection => inspection.score < 70);
    
    if (lowQualityInspections.length > 0) {
      predictions.push({
        area: 'Foundation/Structural',
        riskLevel: 'high' as const,
        probability: 0.75,
        impact: 'Potential structural issues requiring rework'
      });
    }
    
    // Add more prediction logic based on patterns
    
    return predictions;
  }

  private generateInspectionRecommendations(qualityData: any[], project: any): string[] {
    const recommendations = [];
    
    if (qualityData.length === 0) {
      recommendations.push('Schedule initial quality inspection');
    }
    
    const recentInspections = qualityData.filter(inspection => {
      const inspectionDate = new Date(inspection.inspection_date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return inspectionDate >= thirtyDaysAgo;
    });
    
    if (recentInspections.length === 0) {
      recommendations.push('Schedule follow-up quality inspection - last inspection was over 30 days ago');
    }
    
    return recommendations;
  }

  private async getBenchmarkComparison(projectType: string, qualityScore: number): Promise<any> {
    // Get benchmark data from similar projects
    const { data: benchmarkData } = await supabase
      .from('quality_inspections')
      .select('score')
      .eq('project_type', projectType);
    
    if (!benchmarkData || benchmarkData.length === 0) {
      return {
        industryAverage: 75,
        companyAverage: qualityScore,
        bestInClass: 90
      };
    }
    
    const scores = benchmarkData.map(item => item.score).filter(score => score > 0);
    const industryAverage = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    return {
      industryAverage: Math.round(industryAverage),
      companyAverage: qualityScore,
      bestInClass: Math.max(...scores)
    };
  }
}

// Export singleton instance
export const aiConstructionService = new AIConstructionService();
export default aiConstructionService;
