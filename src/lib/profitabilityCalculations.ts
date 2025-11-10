/**
 * Profitability Calculator Logic
 * Industry-standard formulas and benchmarks for construction project profitability
 */

export interface CalculatorInputs {
  projectType: string;
  laborHours: number;
  materialCost: number;
  crewSize: number;
  projectDuration: number; // days
}

export interface CalculatorResults {
  recommendedBid: number;
  profitMargin: number;
  profitAmount: number;
  hourlyRate: number;
  breakEvenAmount: number;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  materialToLaborRatio: number;
  totalLaborCost: number;
  totalOverhead: number;
  benchmarkComparison: {
    industryAvgMargin: number;
    yourMargin: number;
    difference: number;
    performanceLevel: string;
  };
  costBreakdown: {
    materials: number;
    labor: number;
    overhead: number;
    profit: number;
  };
  recommendations: string[];
  warnings: string[];
}

// Industry benchmarks by project type
export const PROJECT_TYPE_BENCHMARKS: Record<string, {
  avgMargin: number;
  avgLaborRate: number;
  materialLaborRatio: number;
  riskFactor: number;
  typicalMarkup: number;
}> = {
  'Residential Addition': {
    avgMargin: 18,
    avgLaborRate: 65,
    materialLaborRatio: 1.2,
    riskFactor: 2,
    typicalMarkup: 1.35
  },
  'Kitchen Remodel': {
    avgMargin: 22,
    avgLaborRate: 70,
    materialLaborRatio: 1.5,
    riskFactor: 3,
    typicalMarkup: 1.40
  },
  'Bathroom Remodel': {
    avgMargin: 25,
    avgLaborRate: 68,
    materialLaborRatio: 1.3,
    riskFactor: 2,
    typicalMarkup: 1.45
  },
  'Deck/Patio': {
    avgMargin: 28,
    avgLaborRate: 55,
    materialLaborRatio: 0.8,
    riskFactor: 1,
    typicalMarkup: 1.50
  },
  'Roofing': {
    avgMargin: 20,
    avgLaborRate: 60,
    materialLaborRatio: 1.0,
    riskFactor: 3,
    typicalMarkup: 1.38
  },
  'Siding': {
    avgMargin: 24,
    avgLaborRate: 58,
    materialLaborRatio: 1.1,
    riskFactor: 2,
    typicalMarkup: 1.42
  },
  'Basement Finish': {
    avgMargin: 26,
    avgLaborRate: 62,
    materialLaborRatio: 1.0,
    riskFactor: 2,
    typicalMarkup: 1.48
  },
  'New Construction': {
    avgMargin: 15,
    avgLaborRate: 65,
    materialLaborRatio: 1.4,
    riskFactor: 4,
    typicalMarkup: 1.30
  },
  'Commercial TI': {
    avgMargin: 16,
    avgLaborRate: 72,
    materialLaborRatio: 1.2,
    riskFactor: 3,
    typicalMarkup: 1.32
  },
  'Concrete Work': {
    avgMargin: 22,
    avgLaborRate: 58,
    materialLaborRatio: 0.9,
    riskFactor: 2,
    typicalMarkup: 1.40
  },
  'Electrical': {
    avgMargin: 30,
    avgLaborRate: 75,
    materialLaborRatio: 0.6,
    riskFactor: 2,
    typicalMarkup: 1.55
  },
  'Plumbing': {
    avgMargin: 28,
    avgLaborRate: 72,
    materialLaborRatio: 0.7,
    riskFactor: 2,
    typicalMarkup: 1.50
  },
  'HVAC': {
    avgMargin: 32,
    avgLaborRate: 78,
    materialLaborRatio: 0.8,
    riskFactor: 2,
    typicalMarkup: 1.58
  },
  'Landscaping': {
    avgMargin: 35,
    avgLaborRate: 45,
    materialLaborRatio: 0.5,
    riskFactor: 1,
    typicalMarkup: 1.65
  },
  'Painting': {
    avgMargin: 38,
    avgLaborRate: 48,
    materialLaborRatio: 0.4,
    riskFactor: 1,
    typicalMarkup: 1.70
  },
  'Flooring': {
    avgMargin: 32,
    avgLaborRate: 52,
    materialLaborRatio: 1.0,
    riskFactor: 1,
    typicalMarkup: 1.58
  },
  'Custom/Other': {
    avgMargin: 20,
    avgLaborRate: 65,
    materialLaborRatio: 1.0,
    riskFactor: 3,
    typicalMarkup: 1.38
  }
};

// Get project types for dropdown
export const PROJECT_TYPES = Object.keys(PROJECT_TYPE_BENCHMARKS);

/**
 * Calculate comprehensive project profitability
 */
export function calculateProfitability(inputs: CalculatorInputs): CalculatorResults {
  const benchmark = PROJECT_TYPE_BENCHMARKS[inputs.projectType] || PROJECT_TYPE_BENCHMARKS['Custom/Other'];

  // Base calculations
  const avgHourlyRate = benchmark.avgLaborRate;
  const totalLaborCost = inputs.laborHours * avgHourlyRate;

  // Overhead calculation (industry standard: 10-15% of direct costs)
  const overheadRate = 0.13; // 13% average
  const directCosts = totalLaborCost + inputs.materialCost;
  const totalOverhead = directCosts * overheadRate;

  // Total cost including overhead
  const totalCost = directCosts + totalOverhead;

  // Break-even (cost to deliver project)
  const breakEvenAmount = totalCost;

  // Recommended bid using industry markup
  const recommendedBid = totalCost * benchmark.typicalMarkup;

  // Profit calculations
  const profitAmount = recommendedBid - totalCost;
  const profitMargin = (profitAmount / recommendedBid) * 100;

  // Effective hourly rate per crew member
  const totalCrewHours = inputs.laborHours;
  const hourlyRate = profitAmount / totalCrewHours;

  // Material to labor ratio
  const materialToLaborRatio = inputs.materialCost / totalLaborCost;

  // Risk score calculation (0-10 scale)
  let riskScore = benchmark.riskFactor;

  // Adjust risk based on project parameters
  if (inputs.projectDuration > 30) riskScore += 1; // Long projects = more risk
  if (inputs.crewSize > 8) riskScore += 1; // Large crews = coordination risk
  if (materialToLaborRatio > 2) riskScore += 1; // Material-heavy = supply chain risk
  if (profitMargin < 10) riskScore += 2; // Low margin = financial risk
  if (profitMargin < 5) riskScore += 2; // Very low margin = high risk

  riskScore = Math.min(10, riskScore); // Cap at 10

  const riskLevel: 'low' | 'medium' | 'high' =
    riskScore <= 3 ? 'low' : riskScore <= 6 ? 'medium' : 'high';

  // Benchmark comparison
  const benchmarkComparison = {
    industryAvgMargin: benchmark.avgMargin,
    yourMargin: profitMargin,
    difference: profitMargin - benchmark.avgMargin,
    performanceLevel: getPerformanceLevel(profitMargin, benchmark.avgMargin)
  };

  // Cost breakdown for pie chart
  const costBreakdown = {
    materials: inputs.materialCost,
    labor: totalLaborCost,
    overhead: totalOverhead,
    profit: profitAmount
  };

  // Generate recommendations
  const recommendations = generateRecommendations(inputs, profitMargin, materialToLaborRatio, benchmark);

  // Generate warnings
  const warnings = generateWarnings(profitMargin, riskScore, materialToLaborRatio, inputs);

  return {
    recommendedBid,
    profitMargin,
    profitAmount,
    hourlyRate,
    breakEvenAmount,
    riskScore,
    riskLevel,
    materialToLaborRatio,
    totalLaborCost,
    totalOverhead,
    benchmarkComparison,
    costBreakdown,
    recommendations,
    warnings
  };
}

/**
 * Determine performance level compared to industry
 */
function getPerformanceLevel(margin: number, industryAvg: number): string {
  const difference = margin - industryAvg;

  if (difference >= 10) return 'Excellent - Well above industry average';
  if (difference >= 5) return 'Good - Above industry average';
  if (difference >= -2) return 'Average - Near industry standard';
  if (difference >= -5) return 'Below Average - Needs improvement';
  return 'Poor - Significantly below industry standard';
}

/**
 * Generate personalized recommendations
 */
function generateRecommendations(
  inputs: CalculatorInputs,
  profitMargin: number,
  materialToLaborRatio: number,
  benchmark: typeof PROJECT_TYPE_BENCHMARKS[string]
): string[] {
  const recommendations: string[] = [];

  // Margin-based recommendations
  if (profitMargin < 10) {
    recommendations.push('Consider increasing your bid to achieve at least 15% profit margin for sustainability');
  } else if (profitMargin > 40) {
    recommendations.push('High profit margin detected - ensure pricing remains competitive in your market');
  }

  // Material to labor ratio recommendations
  if (materialToLaborRatio > benchmark.materialLaborRatio * 1.3) {
    recommendations.push('Material costs are high relative to labor - negotiate bulk discounts with suppliers');
  } else if (materialToLaborRatio < benchmark.materialLaborRatio * 0.7) {
    recommendations.push('Labor costs are high relative to materials - consider efficiency improvements or better crew scheduling');
  }

  // Project duration recommendations
  if (inputs.projectDuration > 60) {
    recommendations.push('Long project duration - include escalation clauses for material price increases');
    recommendations.push('Consider progress billing milestones to maintain cash flow');
  }

  // Crew size recommendations
  if (inputs.crewSize > 10) {
    recommendations.push('Large crew size - ensure you have experienced supervisors to maintain productivity');
  }

  // General best practices
  if (profitMargin >= 15 && profitMargin <= 30) {
    recommendations.push('Profit margin is healthy - use Build-Desk to track actual costs and protect this margin');
  }

  recommendations.push('Add a 10% contingency for unexpected costs and change orders');
  recommendations.push('Track actual costs daily to catch budget overruns early');

  return recommendations;
}

/**
 * Generate warnings for potential issues
 */
function generateWarnings(
  profitMargin: number,
  riskScore: number,
  materialToLaborRatio: number,
  inputs: CalculatorInputs
): string[] {
  const warnings: string[] = [];

  if (profitMargin < 10) {
    warnings.push('⚠️ Profit margin below 10% - This project may not be worth bidding');
  }

  if (profitMargin < 5) {
    warnings.push('🚨 CRITICAL: Profit margin too low - High risk of losing money on this project');
  }

  if (riskScore >= 7) {
    warnings.push('⚠️ High-risk project - Ensure you have detailed scope documentation and change order process');
  }

  if (materialToLaborRatio > 2.5) {
    warnings.push('⚠️ Material-heavy project - Lock in pricing with suppliers before bidding');
  }

  if (inputs.projectDuration > 90) {
    warnings.push('⚠️ Extended timeline - Include price escalation clauses and progress billing');
  }

  if (inputs.laborHours / inputs.crewSize / inputs.projectDuration > 10) {
    warnings.push('⚠️ Labor hours may be underestimated for the project duration and crew size');
  }

  return warnings;
}

/**
 * Calculate what-if scenarios
 */
export function calculateWhatIf(
  baseInputs: CalculatorInputs,
  adjustments: Partial<CalculatorInputs>
): CalculatorResults {
  return calculateProfitability({ ...baseInputs, ...adjustments });
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Get color for profit margin gauge
 */
export function getMarginColor(margin: number): string {
  if (margin < 10) return '#ef4444'; // red
  if (margin < 15) return '#f59e0b'; // amber
  if (margin < 20) return '#eab308'; // yellow
  return '#22c55e'; // green
}

/**
 * Get color for risk level
 */
export function getRiskColor(riskLevel: 'low' | 'medium' | 'high'): string {
  switch (riskLevel) {
    case 'low': return '#22c55e'; // green
    case 'medium': return '#f59e0b'; // amber
    case 'high': return '#ef4444'; // red
  }
}

/**
 * Generate session ID for analytics tracking
 */
export function generateSessionId(): string {
  return `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate calculator inputs
 */
export function validateInputs(inputs: Partial<CalculatorInputs>): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  if (!inputs.projectType) {
    errors.projectType = 'Project type is required';
  }

  if (!inputs.laborHours || inputs.laborHours <= 0) {
    errors.laborHours = 'Labor hours must be greater than 0';
  }

  if (!inputs.materialCost || inputs.materialCost < 0) {
    errors.materialCost = 'Material cost must be 0 or greater';
  }

  if (!inputs.crewSize || inputs.crewSize <= 0) {
    errors.crewSize = 'Crew size must be at least 1';
  }

  if (!inputs.projectDuration || inputs.projectDuration <= 0) {
    errors.projectDuration = 'Project duration must be at least 1 day';
  }

  // Sanity checks
  if (inputs.laborHours && inputs.crewSize && inputs.projectDuration) {
    const hoursPerCrewMemberPerDay = inputs.laborHours / inputs.crewSize / inputs.projectDuration;
    if (hoursPerCrewMemberPerDay > 12) {
      errors.laborHours = 'Labor hours seem too high for crew size and duration (>12 hrs/person/day)';
    }
  }

  if (inputs.materialCost && inputs.materialCost > 1000000) {
    errors.materialCost = 'Material cost seems unusually high - please verify';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}
