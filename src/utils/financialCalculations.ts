/**
 * Financial Calculations Utility
 * Centralized financial calculations with configurable rates and proper expense tracking
 */

export interface FinancialSettings {
  defaultProfitMargin: number; // Percentage (e.g., 15 for 15%)
  defaultOverheadRate: number; // Percentage (e.g., 10 for 10%)
  laborBurdenRate: number; // Percentage (e.g., 25 for 25%)
  contingencyRate: number; // Percentage (e.g., 5 for 5%)
  salesTaxRate: number; // Percentage (e.g., 7.5 for 7.5%)
  bondRate: number; // Percentage (e.g., 1.5 for 1.5%)
  insuranceRate: number; // Percentage (e.g., 2 for 2%)
}

export const DEFAULT_FINANCIAL_SETTINGS: FinancialSettings = {
  defaultProfitMargin: 15,
  defaultOverheadRate: 10,
  laborBurdenRate: 25,
  contingencyRate: 5,
  salesTaxRate: 0,
  bondRate: 0,
  insuranceRate: 2,
};

export interface ProjectCosts {
  laborCost: number;
  materialCost: number;
  equipmentCost: number;
  subcontractorCost: number;
  otherDirectCosts: number;
}

export interface CalculatedCosts extends ProjectCosts {
  directCosts: number;
  laborBurden: number;
  overhead: number;
  subtotal: number;
  contingency: number;
  bond: number;
  insurance: number;
  totalCosts: number;
  profit: number;
  totalPrice: number;
  profitMargin: number;
  markupPercentage: number;
}

/**
 * Calculate comprehensive project costs with all multipliers
 */
export function calculateProjectCosts(
  costs: ProjectCosts,
  settings: FinancialSettings = DEFAULT_FINANCIAL_SETTINGS
): CalculatedCosts {
  // Direct costs
  const directCosts = 
    costs.laborCost +
    costs.materialCost +
    costs.equipmentCost +
    costs.subcontractorCost +
    costs.otherDirectCosts;

  // Labor burden (benefits, taxes, insurance on labor)
  const laborBurden = costs.laborCost * (settings.laborBurdenRate / 100);

  // Overhead (general business expenses)
  const overhead = directCosts * (settings.defaultOverheadRate / 100);

  // Subtotal before contingency
  const subtotal = directCosts + laborBurden + overhead;

  // Contingency (risk buffer)
  const contingency = subtotal * (settings.contingencyRate / 100);

  // Bond costs (if required)
  const bond = subtotal * (settings.bondRate / 100);

  // Insurance costs
  const insurance = subtotal * (settings.insuranceRate / 100);

  // Total costs including all factors
  const totalCosts = subtotal + contingency + bond + insurance;

  // Calculate profit based on margin (profit as percentage of final price)
  // If margin is 15%, then profit = totalCosts / (1 - 0.15) - totalCosts
  const profit = totalCosts * (settings.defaultProfitMargin / (100 - settings.defaultProfitMargin));

  // Total price to customer
  const totalPrice = totalCosts + profit;

  // Calculate actual margin and markup
  const profitMargin = (profit / totalPrice) * 100;
  const markupPercentage = (profit / totalCosts) * 100;

  return {
    ...costs,
    directCosts,
    laborBurden,
    overhead,
    subtotal,
    contingency,
    bond,
    insurance,
    totalCosts,
    profit,
    totalPrice,
    profitMargin,
    markupPercentage,
  };
}

/**
 * Calculate variance between budget and actual
 */
export interface CostVariance {
  budgetAmount: number;
  actualAmount: number;
  variance: number;
  variancePercentage: number;
  status: 'under_budget' | 'on_budget' | 'over_budget';
}

export function calculateVariance(
  budgetAmount: number,
  actualAmount: number,
  tolerance: number = 5 // 5% tolerance
): CostVariance {
  const variance = budgetAmount - actualAmount;
  const variancePercentage = budgetAmount > 0 ? (variance / budgetAmount) * 100 : 0;

  let status: CostVariance['status'];
  if (Math.abs(variancePercentage) <= tolerance) {
    status = 'on_budget';
  } else if (variance > 0) {
    status = 'under_budget';
  } else {
    status = 'over_budget';
  }

  return {
    budgetAmount,
    actualAmount,
    variance,
    variancePercentage,
    status,
  };
}

/**
 * Calculate profit margin from revenue and costs
 */
export function calculateProfitMargin(revenue: number, totalCosts: number): number {
  if (revenue <= 0) return 0;
  const profit = revenue - totalCosts;
  return (profit / revenue) * 100;
}

/**
 * Calculate markup percentage from cost and selling price
 */
export function calculateMarkup(cost: number, sellingPrice: number): number {
  if (cost <= 0) return 0;
  const profit = sellingPrice - cost;
  return (profit / cost) * 100;
}

/**
 * Calculate selling price from cost and desired margin
 */
export function calculateSellingPriceFromMargin(cost: number, marginPercentage: number): number {
  if (marginPercentage >= 100) return cost;
  return cost / (1 - marginPercentage / 100);
}

/**
 * Calculate selling price from cost and markup percentage
 */
export function calculateSellingPriceFromMarkup(cost: number, markupPercentage: number): number {
  return cost * (1 + markupPercentage / 100);
}

/**
 * Calculate break-even point
 */
export interface BreakEvenAnalysis {
  fixedCosts: number;
  variableCostPerUnit: number;
  pricePerUnit: number;
  breakEvenUnits: number;
  breakEvenRevenue: number;
}

export function calculateBreakEven(
  fixedCosts: number,
  variableCostPerUnit: number,
  pricePerUnit: number
): BreakEvenAnalysis {
  const contributionMargin = pricePerUnit - variableCostPerUnit;
  const breakEvenUnits = contributionMargin > 0 ? fixedCosts / contributionMargin : 0;
  const breakEvenRevenue = breakEvenUnits * pricePerUnit;

  return {
    fixedCosts,
    variableCostPerUnit,
    pricePerUnit,
    breakEvenUnits: Math.ceil(breakEvenUnits),
    breakEvenRevenue,
  };
}

/**
 * Calculate cash flow with payment schedule
 */
export interface CashFlowProjection {
  period: string;
  revenue: number;
  costs: number;
  cashFlow: number;
  cumulativeCashFlow: number;
}

export function projectCashFlow(
  monthlyRevenue: number[],
  monthlyCosts: number[]
): CashFlowProjection[] {
  let cumulativeCashFlow = 0;
  
  return monthlyRevenue.map((revenue, index) => {
    const costs = monthlyCosts[index] || 0;
    const cashFlow = revenue - costs;
    cumulativeCashFlow += cashFlow;

    return {
      period: `Month ${index + 1}`,
      revenue,
      costs,
      cashFlow,
      cumulativeCashFlow,
    };
  });
}

/**
 * Calculate cost per square foot
 */
export function calculateCostPerSquareFoot(totalCost: number, squareFootage: number): number {
  if (squareFootage <= 0) return 0;
  return totalCost / squareFootage;
}

/**
 * Calculate earned value metrics
 */
export interface EarnedValueMetrics {
  plannedValue: number; // PV - Budget for work scheduled
  earnedValue: number; // EV - Budget for work completed
  actualCost: number; // AC - Actual cost of work completed
  costVariance: number; // CV = EV - AC
  scheduleVariance: number; // SV = EV - PV
  costPerformanceIndex: number; // CPI = EV / AC
  schedulePerformanceIndex: number; // SPI = EV / PV
  estimateAtCompletion: number; // EAC = Budget / CPI
  estimateToComplete: number; // ETC = EAC - AC
  varianceAtCompletion: number; // VAC = Budget - EAC
}

export function calculateEarnedValue(
  totalBudget: number,
  scheduledCompletion: number, // Percentage (0-100)
  actualCompletion: number, // Percentage (0-100)
  actualCost: number
): EarnedValueMetrics {
  const plannedValue = totalBudget * (scheduledCompletion / 100);
  const earnedValue = totalBudget * (actualCompletion / 100);

  const costVariance = earnedValue - actualCost;
  const scheduleVariance = earnedValue - plannedValue;

  const costPerformanceIndex = actualCost > 0 ? earnedValue / actualCost : 1;
  const schedulePerformanceIndex = plannedValue > 0 ? earnedValue / plannedValue : 1;

  const estimateAtCompletion = costPerformanceIndex > 0 ? totalBudget / costPerformanceIndex : totalBudget;
  const estimateToComplete = estimateAtCompletion - actualCost;
  const varianceAtCompletion = totalBudget - estimateAtCompletion;

  return {
    plannedValue,
    earnedValue,
    actualCost,
    costVariance,
    scheduleVariance,
    costPerformanceIndex,
    schedulePerformanceIndex,
    estimateAtCompletion,
    estimateToComplete,
    varianceAtCompletion,
  };
}
