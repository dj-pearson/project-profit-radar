import { describe, it, expect } from 'vitest';
import {
  calculateProjectCosts,
  calculateVariance,
  calculateProfitMargin,
  calculateMarkup,
  calculateSellingPriceFromMargin,
  calculateSellingPriceFromMarkup,
  calculateBreakEven,
  projectCashFlow,
  calculateCostPerSquareFoot,
  calculateEarnedValue,
  DEFAULT_FINANCIAL_SETTINGS,
  type ProjectCosts,
  type FinancialSettings,
} from '../financialCalculations';

const sampleCosts: ProjectCosts = {
  laborCost: 50000,
  materialCost: 30000,
  equipmentCost: 5000,
  subcontractorCost: 10000,
  otherDirectCosts: 2000,
};

describe('Financial Calculations', () => {
  describe('calculateProjectCosts()', () => {
    it('calculates total direct costs correctly', () => {
      const result = calculateProjectCosts(sampleCosts);
      expect(result.directCosts).toBe(97000);
    });

    it('calculates labor burden correctly', () => {
      const result = calculateProjectCosts(sampleCosts);
      // 50000 * 25% = 12500
      expect(result.laborBurden).toBe(12500);
    });

    it('calculates overhead correctly', () => {
      const result = calculateProjectCosts(sampleCosts);
      // 97000 * 10% = 9700
      expect(result.overhead).toBe(9700);
    });

    it('calculates subtotal correctly', () => {
      const result = calculateProjectCosts(sampleCosts);
      // 97000 + 12500 + 9700 = 119200
      expect(result.subtotal).toBe(119200);
    });

    it('calculates contingency correctly', () => {
      const result = calculateProjectCosts(sampleCosts);
      // 119200 * 5% = 5960
      expect(result.contingency).toBe(5960);
    });

    it('calculates insurance correctly', () => {
      const result = calculateProjectCosts(sampleCosts);
      // 119200 * 2% = 2384
      expect(result.insurance).toBe(2384);
    });

    it('calculates profit margin matching the setting', () => {
      const result = calculateProjectCosts(sampleCosts);
      expect(result.profitMargin).toBeCloseTo(15, 0);
    });

    it('totalPrice > totalCosts', () => {
      const result = calculateProjectCosts(sampleCosts);
      expect(result.totalPrice).toBeGreaterThan(result.totalCosts);
    });

    it('markup percentage > 0', () => {
      const result = calculateProjectCosts(sampleCosts);
      expect(result.markupPercentage).toBeGreaterThan(0);
    });

    it('works with zero costs', () => {
      const zeroCosts: ProjectCosts = {
        laborCost: 0,
        materialCost: 0,
        equipmentCost: 0,
        subcontractorCost: 0,
        otherDirectCosts: 0,
      };
      const result = calculateProjectCosts(zeroCosts);
      expect(result.totalPrice).toBe(0);
      expect(result.directCosts).toBe(0);
    });

    it('works with custom financial settings', () => {
      const customSettings: FinancialSettings = {
        ...DEFAULT_FINANCIAL_SETTINGS,
        defaultProfitMargin: 20,
        defaultOverheadRate: 15,
      };
      const result = calculateProjectCosts(sampleCosts, customSettings);
      expect(result.profitMargin).toBeCloseTo(20, 0);
    });

    it('handles very large numbers (>$1M)', () => {
      const largeCosts: ProjectCosts = {
        laborCost: 500000,
        materialCost: 300000,
        equipmentCost: 100000,
        subcontractorCost: 200000,
        otherDirectCosts: 50000,
      };
      const result = calculateProjectCosts(largeCosts);
      expect(result.totalPrice).toBeGreaterThan(1000000);
      expect(Number.isFinite(result.totalPrice)).toBe(true);
    });
  });

  describe('calculateVariance()', () => {
    it('detects under_budget status', () => {
      const result = calculateVariance(100000, 80000);
      expect(result.status).toBe('under_budget');
      expect(result.variance).toBe(20000);
      expect(result.variancePercentage).toBe(20);
    });

    it('detects over_budget status', () => {
      const result = calculateVariance(100000, 120000);
      expect(result.status).toBe('over_budget');
      expect(result.variance).toBe(-20000);
    });

    it('detects on_budget within tolerance', () => {
      const result = calculateVariance(100000, 97000);
      expect(result.status).toBe('on_budget');
    });

    it('respects custom tolerance', () => {
      const result = calculateVariance(100000, 85000, 20);
      expect(result.status).toBe('on_budget');
    });

    it('handles zero budget', () => {
      const result = calculateVariance(0, 5000);
      expect(result.variancePercentage).toBe(0);
    });

    it('handles equal budget and actual', () => {
      const result = calculateVariance(50000, 50000);
      expect(result.status).toBe('on_budget');
      expect(result.variance).toBe(0);
    });
  });

  describe('calculateProfitMargin()', () => {
    it('calculates correct margin', () => {
      expect(calculateProfitMargin(100000, 80000)).toBe(20);
    });

    it('returns 0 for zero revenue', () => {
      expect(calculateProfitMargin(0, 5000)).toBe(0);
    });

    it('returns negative margin when costs exceed revenue', () => {
      expect(calculateProfitMargin(80000, 100000)).toBeLessThan(0);
    });

    it('returns 100 for zero costs', () => {
      expect(calculateProfitMargin(100000, 0)).toBe(100);
    });
  });

  describe('calculateMarkup()', () => {
    it('calculates correct markup', () => {
      // Cost: 80, Sell: 100 → markup = 25%
      expect(calculateMarkup(80000, 100000)).toBe(25);
    });

    it('returns 0 for zero cost', () => {
      expect(calculateMarkup(0, 100)).toBe(0);
    });

    it('returns 100 for double the cost', () => {
      expect(calculateMarkup(50000, 100000)).toBe(100);
    });
  });

  describe('calculateSellingPriceFromMargin()', () => {
    it('calculates correct selling price for 20% margin', () => {
      // cost / (1 - 0.20) = 80000 / 0.80 = 100000
      expect(calculateSellingPriceFromMargin(80000, 20)).toBe(100000);
    });

    it('returns cost for 100% margin (edge case)', () => {
      expect(calculateSellingPriceFromMargin(50000, 100)).toBe(50000);
    });

    it('handles zero cost', () => {
      expect(calculateSellingPriceFromMargin(0, 20)).toBe(0);
    });
  });

  describe('calculateSellingPriceFromMarkup()', () => {
    it('calculates correct selling price for 25% markup', () => {
      expect(calculateSellingPriceFromMarkup(80000, 25)).toBe(100000);
    });

    it('handles zero markup', () => {
      expect(calculateSellingPriceFromMarkup(50000, 0)).toBe(50000);
    });

    it('handles zero cost', () => {
      expect(calculateSellingPriceFromMarkup(0, 25)).toBe(0);
    });
  });

  describe('calculateBreakEven()', () => {
    it('calculates break-even units and revenue', () => {
      const result = calculateBreakEven(50000, 30, 80);
      // Contribution margin = 80 - 30 = 50
      // Break-even units = 50000 / 50 = 1000
      expect(result.breakEvenUnits).toBe(1000);
      expect(result.breakEvenRevenue).toBe(80000);
    });

    it('handles zero contribution margin', () => {
      const result = calculateBreakEven(50000, 80, 80);
      expect(result.breakEvenUnits).toBe(0);
    });

    it('handles negative contribution margin', () => {
      const result = calculateBreakEven(50000, 100, 80);
      expect(result.breakEvenUnits).toBe(0);
    });

    it('rounds break-even units up', () => {
      const result = calculateBreakEven(10000, 10, 17);
      // 10000 / 7 = 1428.57 → should ceil to 1429
      expect(result.breakEvenUnits).toBe(1429);
    });
  });

  describe('projectCashFlow()', () => {
    it('calculates monthly cash flow correctly', () => {
      const revenue = [10000, 20000, 30000];
      const costs = [8000, 15000, 25000];
      const result = projectCashFlow(revenue, costs);

      expect(result).toHaveLength(3);
      expect(result[0].cashFlow).toBe(2000);
      expect(result[1].cashFlow).toBe(5000);
      expect(result[2].cashFlow).toBe(5000);
    });

    it('calculates cumulative cash flow', () => {
      const revenue = [10000, 20000, 30000];
      const costs = [8000, 15000, 25000];
      const result = projectCashFlow(revenue, costs);

      expect(result[0].cumulativeCashFlow).toBe(2000);
      expect(result[1].cumulativeCashFlow).toBe(7000);
      expect(result[2].cumulativeCashFlow).toBe(12000);
    });

    it('labels periods correctly', () => {
      const result = projectCashFlow([100], [50]);
      expect(result[0].period).toBe('Month 1');
    });

    it('handles missing cost entries', () => {
      const revenue = [10000, 20000, 30000];
      const costs = [8000]; // Only one month of costs
      const result = projectCashFlow(revenue, costs);

      expect(result[1].costs).toBe(0);
      expect(result[2].costs).toBe(0);
    });
  });

  describe('calculateCostPerSquareFoot()', () => {
    it('calculates correctly', () => {
      expect(calculateCostPerSquareFoot(200000, 2000)).toBe(100);
    });

    it('returns 0 for zero square footage', () => {
      expect(calculateCostPerSquareFoot(200000, 0)).toBe(0);
    });

    it('handles very small areas', () => {
      const result = calculateCostPerSquareFoot(50000, 100);
      expect(result).toBe(500);
    });
  });

  describe('calculateEarnedValue()', () => {
    it('calculates EV metrics for on-track project', () => {
      const result = calculateEarnedValue(100000, 50, 50, 50000);

      expect(result.plannedValue).toBe(50000);
      expect(result.earnedValue).toBe(50000);
      expect(result.costVariance).toBe(0);
      expect(result.scheduleVariance).toBe(0);
      expect(result.costPerformanceIndex).toBe(1);
      expect(result.schedulePerformanceIndex).toBe(1);
    });

    it('detects over-budget project (CPI < 1)', () => {
      const result = calculateEarnedValue(100000, 50, 50, 60000);

      expect(result.costVariance).toBeLessThan(0);
      expect(result.costPerformanceIndex).toBeLessThan(1);
      expect(result.estimateAtCompletion).toBeGreaterThan(100000);
    });

    it('detects behind-schedule project (SPI < 1)', () => {
      const result = calculateEarnedValue(100000, 50, 30, 30000);

      expect(result.scheduleVariance).toBeLessThan(0);
      expect(result.schedulePerformanceIndex).toBeLessThan(1);
    });

    it('detects ahead-of-schedule project (SPI > 1)', () => {
      const result = calculateEarnedValue(100000, 50, 70, 70000);

      expect(result.scheduleVariance).toBeGreaterThan(0);
      expect(result.schedulePerformanceIndex).toBeGreaterThan(1);
    });

    it('handles zero actual cost', () => {
      const result = calculateEarnedValue(100000, 50, 50, 0);
      expect(result.costPerformanceIndex).toBe(1);
    });

    it('handles zero planned value', () => {
      const result = calculateEarnedValue(100000, 0, 0, 0);
      expect(result.schedulePerformanceIndex).toBe(1);
    });

    it('EAC > budget when over cost', () => {
      const result = calculateEarnedValue(100000, 50, 50, 75000);
      expect(result.estimateAtCompletion).toBeGreaterThan(100000);
      expect(result.varianceAtCompletion).toBeLessThan(0);
    });
  });
});
