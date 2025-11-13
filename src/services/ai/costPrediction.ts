/**
 * AI-Powered Cost Prediction Service
 * Uses historical data and machine learning techniques to predict project costs
 * and identify budget risks early
 */

import { supabase } from '@/integrations/supabase/client';

export interface CostPredictionInput {
  projectType: string;
  squareFootage?: number;
  location?: string;
  duration?: number; // in days
  complexity?: 'low' | 'medium' | 'high';
  materials?: string[];
  laborHours?: number;
  historicalProjects?: string[]; // IDs of similar projects
}

export interface CostPrediction {
  estimatedCost: number;
  confidenceLevel: number; // 0-1
  range: {
    low: number;
    high: number;
  };
  breakdown: {
    labor: number;
    materials: number;
    equipment: number;
    overhead: number;
    contingency: number;
  };
  factors: CostFactor[];
  recommendations: string[];
  riskScore: number; // 0-100
  similarProjects: SimilarProject[];
}

export interface CostFactor {
  name: string;
  impact: number; // -1 to 1 (negative = cost saver, positive = cost driver)
  description: string;
  weight: number; // 0-1
}

export interface SimilarProject {
  id: string;
  name: string;
  similarity: number; // 0-1
  actualCost: number;
  variance: number; // percentage from budget
  duration: number;
  lessons?: string[];
}

export interface HistoricalData {
  projectId: string;
  projectType: string;
  squareFootage: number;
  location: string;
  budget: number;
  actualCost: number;
  duration: number;
  variance: number;
  completionDate: string;
  costPerSqFt: number;
}

/**
 * AI Cost Prediction Service
 */
export class CostPredictionService {
  /**
   * Predict project costs using AI and historical data
   */
  async predictCost(input: CostPredictionInput): Promise<CostPrediction> {
    // Fetch historical data for similar projects
    const historicalData = await this.getHistoricalData(input);

    // Calculate base prediction using multiple methods
    const predictions = {
      averageBased: this.calculateAverageBasedPrediction(historicalData),
      regressionBased: this.calculateRegressionPrediction(historicalData, input),
      factorBased: this.calculateFactorBasedPrediction(input, historicalData),
    };

    // Ensemble prediction (weighted average)
    const estimatedCost = this.ensemblePrediction(predictions, historicalData.length);

    // Calculate confidence level
    const confidenceLevel = this.calculateConfidence(historicalData, predictions);

    // Calculate range (confidence interval)
    const range = this.calculateRange(estimatedCost, confidenceLevel, historicalData);

    // Breakdown costs
    const breakdown = this.breakdownCosts(estimatedCost, input);

    // Identify cost factors
    const factors = this.identifyCostFactors(input, historicalData);

    // Generate recommendations
    const recommendations = this.generateRecommendations(factors, historicalData);

    // Calculate risk score
    const riskScore = this.calculateRiskScore(factors, historicalData);

    // Find similar projects
    const similarProjects = await this.findSimilarProjects(input, historicalData);

    return {
      estimatedCost,
      confidenceLevel,
      range,
      breakdown,
      factors,
      recommendations,
      riskScore,
      similarProjects,
    };
  }

  /**
   * Get historical project data for prediction
   */
  private async getHistoricalData(input: CostPredictionInput): Promise<HistoricalData[]> {
    try {
      // Query similar projects from the database
      let query = supabase
        .from('projects')
        .select(`
          id,
          name,
          project_type,
          square_footage,
          location,
          budget,
          actual_cost,
          start_date,
          end_date,
          status
        `)
        .eq('status', 'completed')
        .not('actual_cost', 'is', null)
        .order('end_date', { ascending: false })
        .limit(50);

      // Filter by project type if provided
      if (input.projectType) {
        query = query.eq('project_type', input.projectType);
      }

      // Filter by location if provided
      if (input.location) {
        query = query.eq('location', input.location);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching historical data:', error);
        return [];
      }

      // Transform data
      return (data || []).map(project => {
        const startDate = new Date(project.start_date);
        const endDate = new Date(project.end_date);
        const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const variance = project.budget > 0
          ? ((project.actual_cost - project.budget) / project.budget) * 100
          : 0;
        const costPerSqFt = project.square_footage > 0
          ? project.actual_cost / project.square_footage
          : 0;

        return {
          projectId: project.id,
          projectType: project.project_type,
          squareFootage: project.square_footage,
          location: project.location,
          budget: project.budget,
          actualCost: project.actual_cost,
          duration,
          variance,
          completionDate: project.end_date,
          costPerSqFt,
        };
      });
    } catch (error) {
      console.error('Error in getHistoricalData:', error);
      return [];
    }
  }

  /**
   * Calculate prediction using simple average
   */
  private calculateAverageBasedPrediction(data: HistoricalData[]): number {
    if (data.length === 0) return 0;

    const totalCost = data.reduce((sum, project) => sum + project.actualCost, 0);
    return totalCost / data.length;
  }

  /**
   * Calculate prediction using linear regression on square footage
   */
  private calculateRegressionPrediction(
    data: HistoricalData[],
    input: CostPredictionInput
  ): number {
    if (data.length === 0 || !input.squareFootage) {
      return this.calculateAverageBasedPrediction(data);
    }

    // Simple linear regression: y = mx + b
    const validData = data.filter(p => p.squareFootage > 0);
    if (validData.length === 0) return 0;

    const n = validData.length;
    const sumX = validData.reduce((sum, p) => sum + p.squareFootage, 0);
    const sumY = validData.reduce((sum, p) => sum + p.actualCost, 0);
    const sumXY = validData.reduce((sum, p) => sum + p.squareFootage * p.actualCost, 0);
    const sumX2 = validData.reduce((sum, p) => sum + p.squareFootage * p.squareFootage, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return slope * input.squareFootage + intercept;
  }

  /**
   * Calculate prediction using complexity and duration factors
   */
  private calculateFactorBasedPrediction(
    input: CostPredictionInput,
    data: HistoricalData[]
  ): number {
    const baseCost = this.calculateAverageBasedPrediction(data);
    if (baseCost === 0) return 0;

    let multiplier = 1.0;

    // Complexity factor
    if (input.complexity === 'low') multiplier *= 0.85;
    else if (input.complexity === 'high') multiplier *= 1.25;

    // Duration factor (longer projects tend to cost more)
    if (input.duration) {
      const avgDuration = data.length > 0
        ? data.reduce((sum, p) => sum + p.duration, 0) / data.length
        : 90;

      if (input.duration > avgDuration * 1.5) multiplier *= 1.15;
      else if (input.duration < avgDuration * 0.5) multiplier *= 0.90;
    }

    return baseCost * multiplier;
  }

  /**
   * Combine predictions using weighted ensemble
   */
  private ensemblePrediction(
    predictions: { averageBased: number; regressionBased: number; factorBased: number },
    dataPoints: number
  ): number {
    // Adjust weights based on available data
    const hasGoodData = dataPoints >= 10;

    const weights = hasGoodData
      ? { average: 0.2, regression: 0.5, factor: 0.3 }
      : { average: 0.4, regression: 0.3, factor: 0.3 };

    return (
      predictions.averageBased * weights.average +
      predictions.regressionBased * weights.regression +
      predictions.factorBased * weights.factor
    );
  }

  /**
   * Calculate confidence level based on data quality
   */
  private calculateConfidence(
    data: HistoricalData[],
    predictions: { averageBased: number; regressionBased: number; factorBased: number }
  ): number {
    // Base confidence on number of historical projects
    let confidence = Math.min(data.length / 20, 0.8);

    // Reduce confidence if predictions diverge significantly
    const predictionValues = Object.values(predictions);
    const avg = predictionValues.reduce((sum, val) => sum + val, 0) / predictionValues.length;
    const stdDev = Math.sqrt(
      predictionValues.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / predictionValues.length
    );
    const coefficientOfVariation = avg > 0 ? stdDev / avg : 1;

    if (coefficientOfVariation > 0.3) confidence *= 0.7;
    else if (coefficientOfVariation > 0.15) confidence *= 0.85;

    // Boost confidence if historical data has low variance
    const avgVariance = data.length > 0
      ? Math.abs(data.reduce((sum, p) => sum + p.variance, 0) / data.length)
      : 100;

    if (avgVariance < 5) confidence *= 1.1;
    else if (avgVariance > 20) confidence *= 0.9;

    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Calculate prediction range (confidence interval)
   */
  private calculateRange(
    estimate: number,
    confidence: number,
    data: HistoricalData[]
  ): { low: number; high: number } {
    // Calculate standard deviation of historical costs
    const costs = data.map(p => p.actualCost);
    const avgCost = costs.reduce((sum, cost) => sum + cost, 0) / costs.length || estimate;
    const variance = costs.reduce((sum, cost) => sum + Math.pow(cost - avgCost, 2), 0) / costs.length;
    const stdDev = Math.sqrt(variance);

    // Range widens with lower confidence
    const rangeFactor = (1 - confidence) * 0.5 + 0.1;

    return {
      low: Math.max(0, estimate - stdDev * rangeFactor * 2),
      high: estimate + stdDev * rangeFactor * 2,
    };
  }

  /**
   * Break down estimated costs
   */
  private breakdownCosts(
    totalCost: number,
    input: CostPredictionInput
  ): CostPrediction['breakdown'] {
    // Industry standard ratios (can be customized)
    const ratios = {
      labor: 0.35,
      materials: 0.30,
      equipment: 0.15,
      overhead: 0.15,
      contingency: 0.05,
    };

    // Adjust ratios based on complexity
    if (input.complexity === 'high') {
      ratios.labor += 0.05;
      ratios.contingency += 0.03;
      ratios.materials -= 0.08;
    } else if (input.complexity === 'low') {
      ratios.labor -= 0.05;
      ratios.materials += 0.05;
    }

    return {
      labor: totalCost * ratios.labor,
      materials: totalCost * ratios.materials,
      equipment: totalCost * ratios.equipment,
      overhead: totalCost * ratios.overhead,
      contingency: totalCost * ratios.contingency,
    };
  }

  /**
   * Identify key cost factors
   */
  private identifyCostFactors(
    input: CostPredictionInput,
    data: HistoricalData[]
  ): CostFactor[] {
    const factors: CostFactor[] = [];

    // Complexity factor
    if (input.complexity === 'high') {
      factors.push({
        name: 'High Complexity',
        impact: 0.25,
        description: 'Complex projects typically cost 15-25% more',
        weight: 0.9,
      });
    } else if (input.complexity === 'low') {
      factors.push({
        name: 'Low Complexity',
        impact: -0.15,
        description: 'Simpler projects can save 10-15% on costs',
        weight: 0.7,
      });
    }

    // Duration factor
    if (input.duration && data.length > 0) {
      const avgDuration = data.reduce((sum, p) => sum + p.duration, 0) / data.length;
      if (input.duration > avgDuration * 1.5) {
        factors.push({
          name: 'Extended Timeline',
          impact: 0.15,
          description: 'Longer projects incur higher overhead and labor costs',
          weight: 0.8,
        });
      } else if (input.duration < avgDuration * 0.7) {
        factors.push({
          name: 'Accelerated Schedule',
          impact: 0.20,
          description: 'Rushed timelines require premium labor and expedited materials',
          weight: 0.85,
        });
      }
    }

    // Historical variance factor
    if (data.length > 0) {
      const avgVariance = Math.abs(data.reduce((sum, p) => sum + p.variance, 0) / data.length);
      if (avgVariance > 15) {
        factors.push({
          name: 'High Historical Variance',
          impact: 0.10,
          description: 'Similar projects have experienced significant cost overruns',
          weight: 0.75,
        });
      }
    }

    return factors;
  }

  /**
   * Generate cost-saving recommendations
   */
  private generateRecommendations(
    factors: CostFactor[],
    data: HistoricalData[]
  ): string[] {
    const recommendations: string[] = [];

    // Based on cost factors
    const highImpactFactors = factors.filter(f => f.impact > 0.15);
    if (highImpactFactors.length > 0) {
      recommendations.push(
        `Monitor ${highImpactFactors.map(f => f.name.toLowerCase()).join(', ')} closely to control costs`
      );
    }

    // Based on historical variance
    if (data.length > 0) {
      const highVarianceProjects = data.filter(p => Math.abs(p.variance) > 15);
      if (highVarianceProjects.length / data.length > 0.5) {
        recommendations.push('Add 10-15% contingency buffer due to historical cost volatility');
        recommendations.push('Implement weekly cost tracking to catch overruns early');
      }
    }

    // General best practices
    recommendations.push('Lock in material prices early to avoid market fluctuations');
    recommendations.push('Schedule regular budget reviews every 2 weeks');
    recommendations.push('Maintain detailed change order documentation');

    return recommendations;
  }

  /**
   * Calculate project risk score
   */
  private calculateRiskScore(factors: CostFactor[], data: HistoricalData[]): number {
    let riskScore = 30; // Base risk

    // Add risk from high-impact factors
    factors.forEach(factor => {
      if (factor.impact > 0) {
        riskScore += factor.impact * factor.weight * 50;
      }
    });

    // Add risk from historical variance
    if (data.length > 0) {
      const avgVariance = Math.abs(data.reduce((sum, p) => sum + p.variance, 0) / data.length);
      riskScore += Math.min(avgVariance, 30);
    }

    return Math.min(100, Math.max(0, Math.round(riskScore)));
  }

  /**
   * Find similar completed projects
   */
  private async findSimilarProjects(
    input: CostPredictionInput,
    data: HistoricalData[]
  ): Promise<SimilarProject[]> {
    // Calculate similarity scores for each project
    const scoredProjects = data.map(project => {
      let similarity = 1.0;

      // Type match
      if (input.projectType && project.projectType !== input.projectType) {
        similarity *= 0.5;
      }

      // Location match
      if (input.location && project.location !== input.location) {
        similarity *= 0.8;
      }

      // Size similarity
      if (input.squareFootage && project.squareFootage > 0) {
        const sizeDiff = Math.abs(input.squareFootage - project.squareFootage) / input.squareFootage;
        similarity *= Math.max(0.5, 1 - sizeDiff);
      }

      // Duration similarity
      if (input.duration && project.duration > 0) {
        const durationDiff = Math.abs(input.duration - project.duration) / input.duration;
        similarity *= Math.max(0.7, 1 - durationDiff * 0.5);
      }

      return {
        ...project,
        similarity: Math.max(0, Math.min(1, similarity)),
      };
    });

    // Sort by similarity and take top 5
    return scoredProjects
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5)
      .map(project => ({
        id: project.projectId,
        name: `Project ${project.projectType}`,
        similarity: project.similarity,
        actualCost: project.actualCost,
        variance: project.variance,
        duration: project.duration,
      }));
  }
}

// Export singleton instance
export const costPredictionService = new CostPredictionService();
