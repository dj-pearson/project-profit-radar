/**
 * Advanced Analytics Engine
 * Business intelligence and performance metrics with intelligent caching
 */

import { supabase } from '@/integrations/supabase/client';
import { cache, QueryCache, CacheInvalidation } from '@/lib/cache';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ProjectMetrics {
  projectId: string;
  projectName: string;
  totalBudget: number;
  actualCost: number;
  budgetVariance: number;
  budgetVariancePercent: number;
  totalRevenue: number;
  profitMargin: number;
  profitMarginPercent: number;
  daysInProgress: number;
  completionPercent: number;
  estimatedDaysRemaining: number;
  onSchedule: boolean;
  onBudget: boolean;
  riskScore: number;
  efficiency: number;
}

export interface CompanyMetrics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalRevenue: number;
  totalCosts: number;
  averageProfitMargin: number;
  totalProfitMarginPercent: number;
  averageProjectDuration: number;
  projectSuccessRate: number;
  onTimeDeliveryRate: number;
  onBudgetRate: number;
  customerSatisfactionScore?: number;
  teamUtilization: number;
  averageRiskScore: number;
}

export interface TeamPerformance {
  userId: string;
  userName: string;
  role: string;
  totalHours: number;
  billableHours: number;
  utilizationRate: number;
  projectsWorked: number;
  averageProductivity: number;
  tasksCompleted: number;
  averageTaskCompletionTime: number;
  performanceScore: number;
}

export interface TrendData {
  period: string;
  date: Date;
  revenue: number;
  costs: number;
  profit: number;
  projectsStarted: number;
  projectsCompleted: number;
  activeProjects: number;
}

export interface Forecast {
  period: string;
  predictedRevenue: number;
  predictedCosts: number;
  predictedProfit: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
}

export interface KPI {
  name: string;
  value: number;
  unit: string;
  target?: number;
  status: 'good' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
}

export interface AnalyticsDashboard {
  companyMetrics: CompanyMetrics;
  topProjects: ProjectMetrics[];
  bottomProjects: ProjectMetrics[];
  teamPerformance: TeamPerformance[];
  trends: TrendData[];
  forecasts: Forecast[];
  kpis: KPI[];
  generatedAt: Date;
}

export interface AnalyticsFilters {
  companyId: string;
  startDate?: Date;
  endDate?: Date;
  projectIds?: string[];
  userId?: string;
  includeCompleted?: boolean;
}

// ============================================================================
// Analytics Engine Service
// ============================================================================

class AnalyticsEngineService {
  /**
   * Get comprehensive analytics dashboard
   */
  async getDashboard(filters: AnalyticsFilters): Promise<AnalyticsDashboard> {
    const cacheConfig = QueryCache.dashboard(filters.companyId);

    return cache.remember(
      cacheConfig.key,
      async () => {
        const [
          companyMetrics,
          projectMetrics,
          teamPerformance,
          trends,
        ] = await Promise.all([
          this.getCompanyMetrics(filters),
          this.getProjectMetrics(filters),
          this.getTeamPerformance(filters),
          this.getTrendData(filters),
        ]);

        // Sort projects by performance
        const sortedProjects = projectMetrics.sort((a, b) => b.efficiency - a.efficiency);
        const topProjects = sortedProjects.slice(0, 5);
        const bottomProjects = sortedProjects.slice(-5).reverse();

        // Generate forecasts
        const forecasts = this.generateForecasts(trends);

        // Calculate KPIs
        const kpis = this.calculateKPIs(companyMetrics, trends);

        return {
          companyMetrics,
          topProjects,
          bottomProjects,
          teamPerformance,
          trends,
          forecasts,
          kpis,
          generatedAt: new Date(),
        };
      },
      { ttl: 120, tags: ['analytics', `company:${filters.companyId}`] }
    );
  }

  /**
   * Get company-wide metrics
   */
  async getCompanyMetrics(filters: AnalyticsFilters): Promise<CompanyMetrics> {
    const cacheKey = cache.generateKey('company-metrics', filters);

    return cache.remember(
      cacheKey,
      async () => {
        // Fetch projects
        let query = supabase
          .from('projects')
          .select('*')
          .eq('company_id', filters.companyId);

        if (!filters.includeCompleted) {
          query = query.neq('status', 'completed');
        }

        if (filters.startDate) {
          query = query.gte('created_at', filters.startDate.toISOString());
        }

        if (filters.endDate) {
          query = query.lte('created_at', filters.endDate.toISOString());
        }

        const { data: projects, error } = await query;

        if (error) throw error;
        if (!projects || projects.length === 0) {
          return this.getEmptyCompanyMetrics();
        }

        // Fetch financial records
        const { data: financialRecords } = await supabase
          .from('financial_records')
          .select('*')
          .in('project_id', projects.map(p => p.id));

        // Calculate metrics
        const activeProjects = projects.filter(p => p.status !== 'completed' && p.status !== 'cancelled');
        const completedProjects = projects.filter(p => p.status === 'completed');

        const totalRevenue = financialRecords
          ?.filter(r => r.type === 'income')
          .reduce((sum, r) => sum + (r.amount || 0), 0) || 0;

        const totalCosts = financialRecords
          ?.filter(r => r.type === 'expense')
          .reduce((sum, r) => sum + (r.amount || 0), 0) || 0;

        const totalProfit = totalRevenue - totalCosts;
        const totalProfitMarginPercent = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

        // Calculate average project duration
        const durations = completedProjects
          .filter(p => p.start_date && p.end_date)
          .map(p => {
            const start = new Date(p.start_date!);
            const end = new Date(p.end_date!);
            return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          });

        const averageProjectDuration = durations.length > 0
          ? durations.reduce((sum, d) => sum + d, 0) / durations.length
          : 0;

        // Calculate success metrics
        const onTimeProjects = completedProjects.filter(p => {
          if (!p.estimated_end_date || !p.end_date) return true;
          return new Date(p.end_date) <= new Date(p.estimated_end_date);
        });

        const onBudgetProjects = completedProjects.filter(p => {
          if (!p.budget) return true;
          const projectCosts = financialRecords
            ?.filter(r => r.project_id === p.id && r.type === 'expense')
            .reduce((sum, r) => sum + (r.amount || 0), 0) || 0;
          return projectCosts <= p.budget;
        });

        const onTimeDeliveryRate = completedProjects.length > 0
          ? (onTimeProjects.length / completedProjects.length) * 100
          : 0;

        const onBudgetRate = completedProjects.length > 0
          ? (onBudgetProjects.length / completedProjects.length) * 100
          : 0;

        const projectSuccessRate = completedProjects.length > 0
          ? ((onTimeProjects.length + onBudgetProjects.length) / (completedProjects.length * 2)) * 100
          : 0;

        // Calculate team utilization
        const { data: timeEntries } = await supabase
          .from('time_entries')
          .select('hours_worked')
          .in('project_id', projects.map(p => p.id));

        const totalHours = timeEntries?.reduce((sum, te) => sum + (te.hours_worked || 0), 0) || 0;
        const workingDays = filters.startDate && filters.endDate
          ? Math.ceil((filters.endDate.getTime() - filters.startDate.getTime()) / (1000 * 60 * 60 * 24))
          : 30;

        // Assuming 8 hour workday and average team size
        const teamUtilization = (totalHours / (workingDays * 8 * 5)) * 100;

        // Calculate average risk score
        const averageRiskScore = projects.reduce((sum, p) => sum + (p.risk_level || 50), 0) / projects.length;

        return {
          totalProjects: projects.length,
          activeProjects: activeProjects.length,
          completedProjects: completedProjects.length,
          totalRevenue,
          totalCosts,
          averageProfitMargin: totalProfit / projects.length,
          totalProfitMarginPercent,
          averageProjectDuration,
          projectSuccessRate,
          onTimeDeliveryRate,
          onBudgetRate,
          teamUtilization: Math.min(teamUtilization, 100),
          averageRiskScore,
        };
      },
      { ttl: 300, tags: ['metrics', `company:${filters.companyId}`] }
    );
  }

  /**
   * Get metrics for all projects
   */
  async getProjectMetrics(filters: AnalyticsFilters): Promise<ProjectMetrics[]> {
    const cacheKey = cache.generateKey('project-metrics', filters);

    return cache.remember(
      cacheKey,
      async () => {
        let query = supabase
          .from('projects')
          .select('*')
          .eq('company_id', filters.companyId);

        if (filters.projectIds && filters.projectIds.length > 0) {
          query = query.in('id', filters.projectIds);
        }

        if (!filters.includeCompleted) {
          query = query.neq('status', 'completed');
        }

        const { data: projects, error } = await query;

        if (error) throw error;
        if (!projects) return [];

        // Fetch financial records for all projects
        const { data: financialRecords } = await supabase
          .from('financial_records')
          .select('*')
          .in('project_id', projects.map(p => p.id));

        return projects.map(project => {
          const projectFinancials = financialRecords?.filter(r => r.project_id === project.id) || [];

          const totalRevenue = projectFinancials
            .filter(r => r.type === 'income')
            .reduce((sum, r) => sum + (r.amount || 0), 0);

          const actualCost = projectFinancials
            .filter(r => r.type === 'expense')
            .reduce((sum, r) => sum + (r.amount || 0), 0);

          const totalBudget = project.budget || 0;
          const budgetVariance = totalBudget - actualCost;
          const budgetVariancePercent = totalBudget > 0 ? (budgetVariance / totalBudget) * 100 : 0;

          const profit = totalRevenue - actualCost;
          const profitMarginPercent = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

          // Calculate project duration
          const startDate = project.start_date ? new Date(project.start_date) : new Date();
          const now = new Date();
          const daysInProgress = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

          const completionPercent = project.completion_percentage || 0;
          const estimatedDaysRemaining = completionPercent > 0
            ? Math.ceil((daysInProgress * (100 - completionPercent)) / completionPercent)
            : 0;

          const estimatedEndDate = project.estimated_end_date ? new Date(project.estimated_end_date) : null;
          const onSchedule = !estimatedEndDate || (now.getTime() + (estimatedDaysRemaining * 24 * 60 * 60 * 1000)) <= estimatedEndDate.getTime();
          const onBudget = budgetVariance >= 0;

          // Calculate risk score (0-100)
          let riskScore = 0;
          if (!onSchedule) riskScore += 25;
          if (!onBudget) riskScore += 25;
          if (profitMarginPercent < 10) riskScore += 25;
          if (completionPercent < 50 && daysInProgress > 30) riskScore += 25;

          // Calculate efficiency (0-100)
          const budgetEfficiency = totalBudget > 0 ? Math.min((totalBudget / actualCost) * 50, 50) : 50;
          const scheduleEfficiency = completionPercent / 2;
          const efficiency = Math.round(budgetEfficiency + scheduleEfficiency);

          return {
            projectId: project.id,
            projectName: project.name,
            totalBudget,
            actualCost,
            budgetVariance,
            budgetVariancePercent,
            totalRevenue,
            profitMargin: profit,
            profitMarginPercent,
            daysInProgress,
            completionPercent,
            estimatedDaysRemaining,
            onSchedule,
            onBudget,
            riskScore,
            efficiency,
          };
        });
      },
      { ttl: 180, tags: ['metrics', 'projects', `company:${filters.companyId}`] }
    );
  }

  /**
   * Get team performance metrics
   */
  async getTeamPerformance(filters: AnalyticsFilters): Promise<TeamPerformance[]> {
    const cacheKey = cache.generateKey('team-performance', filters);

    return cache.remember(
      cacheKey,
      async () => {
        // Fetch users
        let userQuery = supabase
          .from('user_profiles')
          .select('*')
          .eq('company_id', filters.companyId);

        if (filters.userId) {
          userQuery = userQuery.eq('id', filters.userId);
        }

        const { data: users, error: userError } = await userQuery;

        if (userError) throw userError;
        if (!users) return [];

        // Fetch time entries
        const { data: timeEntries } = await supabase
          .from('time_entries')
          .select('*')
          .in('user_id', users.map(u => u.id));

        return users.map(user => {
          const userTimeEntries = timeEntries?.filter(te => te.user_id === user.id) || [];

          const totalHours = userTimeEntries.reduce((sum, te) => sum + (te.hours_worked || 0), 0);
          const billableHours = userTimeEntries
            .filter(te => te.is_billable)
            .reduce((sum, te) => sum + (te.hours_worked || 0), 0);

          const utilizationRate = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;

          // Unique projects worked on
          const projectsWorked = new Set(userTimeEntries.map(te => te.project_id)).size;

          // Mock productivity and task metrics (would come from real task system)
          const averageProductivity = Math.min((billableHours / totalHours) * 100, 100);
          const tasksCompleted = Math.floor(totalHours / 4); // Rough estimate
          const averageTaskCompletionTime = totalHours / Math.max(tasksCompleted, 1);

          // Performance score (0-100)
          const performanceScore = Math.round(
            (utilizationRate * 0.4) +
            (averageProductivity * 0.3) +
            (Math.min(projectsWorked * 10, 30))
          );

          return {
            userId: user.id,
            userName: user.full_name || 'Unknown',
            role: user.role || 'unknown',
            totalHours,
            billableHours,
            utilizationRate,
            projectsWorked,
            averageProductivity,
            tasksCompleted,
            averageTaskCompletionTime,
            performanceScore,
          };
        });
      },
      { ttl: 300, tags: ['metrics', 'team', `company:${filters.companyId}`] }
    );
  }

  /**
   * Get trend data over time
   */
  async getTrendData(filters: AnalyticsFilters): Promise<TrendData[]> {
    const cacheKey = cache.generateKey('trend-data', filters);

    return cache.remember(
      cacheKey,
      async () => {
        const startDate = filters.startDate || new Date(Date.now() - 180 * 24 * 60 * 60 * 1000); // 6 months ago
        const endDate = filters.endDate || new Date();

        // Fetch all financial records in date range
        const { data: financialRecords } = await supabase
          .from('financial_records')
          .select('*, projects!inner(company_id)')
          .eq('projects.company_id', filters.companyId)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());

        // Fetch projects
        const { data: projects } = await supabase
          .from('projects')
          .select('*')
          .eq('company_id', filters.companyId)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());

        // Group by month
        const monthlyData = new Map<string, TrendData>();

        // Initialize months
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          const period = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
          monthlyData.set(period, {
            period,
            date: new Date(currentDate),
            revenue: 0,
            costs: 0,
            profit: 0,
            projectsStarted: 0,
            projectsCompleted: 0,
            activeProjects: 0,
          });
          currentDate.setMonth(currentDate.getMonth() + 1);
        }

        // Aggregate financial data
        financialRecords?.forEach(record => {
          const date = new Date(record.created_at);
          const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const data = monthlyData.get(period);

          if (data) {
            if (record.type === 'income') {
              data.revenue += record.amount || 0;
            } else if (record.type === 'expense') {
              data.costs += record.amount || 0;
            }
          }
        });

        // Aggregate project data
        projects?.forEach(project => {
          const startDate = project.start_date ? new Date(project.start_date) : new Date(project.created_at);
          const startPeriod = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
          const startData = monthlyData.get(startPeriod);
          if (startData) startData.projectsStarted++;

          if (project.status === 'completed' && project.end_date) {
            const endDate = new Date(project.end_date);
            const endPeriod = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;
            const endData = monthlyData.get(endPeriod);
            if (endData) endData.projectsCompleted++;
          }
        });

        // Calculate profit and active projects
        const trends = Array.from(monthlyData.values());
        trends.forEach((data, index) => {
          data.profit = data.revenue - data.costs;

          // Calculate active projects as cumulative
          const previousActive = index > 0 ? trends[index - 1].activeProjects : 0;
          data.activeProjects = previousActive + data.projectsStarted - data.projectsCompleted;
        });

        return trends.sort((a, b) => a.date.getTime() - b.date.getTime());
      },
      { ttl: 600, tags: ['trends', `company:${filters.companyId}`] }
    );
  }

  /**
   * Generate forecasts based on trend data
   */
  private generateForecasts(trends: TrendData[]): Forecast[] {
    if (trends.length < 3) return [];

    const forecasts: Forecast[] = [];
    const periods = 3; // Forecast 3 months ahead

    // Simple linear regression for forecasting
    const recentTrends = trends.slice(-6); // Last 6 months

    for (let i = 1; i <= periods; i++) {
      const lastTrend = recentTrends[recentTrends.length - 1];
      const lastDate = new Date(lastTrend.date);
      lastDate.setMonth(lastDate.getMonth() + i);

      // Calculate average growth rates
      const revenueGrowth = this.calculateAverageGrowth(recentTrends.map(t => t.revenue));
      const costGrowth = this.calculateAverageGrowth(recentTrends.map(t => t.costs));

      const predictedRevenue = lastTrend.revenue * (1 + revenueGrowth);
      const predictedCosts = lastTrend.costs * (1 + costGrowth);
      const predictedProfit = predictedRevenue - predictedCosts;

      // Calculate confidence based on trend consistency
      const confidence = this.calculateForecastConfidence(recentTrends);

      // Determine trend direction
      const profitTrend = this.determineTrend(recentTrends.map(t => t.profit));

      forecasts.push({
        period: `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, '0')}`,
        predictedRevenue,
        predictedCosts,
        predictedProfit,
        confidence,
        trend: profitTrend,
      });
    }

    return forecasts;
  }

  /**
   * Calculate KPIs
   */
  private calculateKPIs(companyMetrics: CompanyMetrics, trends: TrendData[]): KPI[] {
    const kpis: KPI[] = [];

    if (trends.length < 2) return kpis;

    const currentPeriod = trends[trends.length - 1];
    const previousPeriod = trends[trends.length - 2];

    // Revenue KPI
    const revenueChange = this.calculateChangePercent(currentPeriod.revenue, previousPeriod.revenue);
    kpis.push({
      name: 'Monthly Revenue',
      value: currentPeriod.revenue,
      unit: '$',
      target: previousPeriod.revenue * 1.1, // 10% growth target
      status: this.determineKPIStatus(currentPeriod.revenue, previousPeriod.revenue * 1.1),
      trend: this.determineTrend([previousPeriod.revenue, currentPeriod.revenue]),
      changePercent: revenueChange,
    });

    // Profit Margin KPI
    kpis.push({
      name: 'Profit Margin',
      value: companyMetrics.totalProfitMarginPercent,
      unit: '%',
      target: 20,
      status: this.determineKPIStatus(companyMetrics.totalProfitMarginPercent, 20),
      trend: this.determineTrend(trends.slice(-3).map(t => (t.profit / t.revenue) * 100)),
      changePercent: this.calculateChangePercent(
        companyMetrics.totalProfitMarginPercent,
        ((previousPeriod.profit / previousPeriod.revenue) * 100) || 0
      ),
    });

    // Project Success Rate KPI
    kpis.push({
      name: 'Project Success Rate',
      value: companyMetrics.projectSuccessRate,
      unit: '%',
      target: 80,
      status: this.determineKPIStatus(companyMetrics.projectSuccessRate, 80),
      trend: 'stable',
      changePercent: 0,
    });

    // Team Utilization KPI
    kpis.push({
      name: 'Team Utilization',
      value: companyMetrics.teamUtilization,
      unit: '%',
      target: 75,
      status: this.determineKPIStatus(companyMetrics.teamUtilization, 75),
      trend: 'stable',
      changePercent: 0,
    });

    // Active Projects KPI
    const activeProjectsChange = this.calculateChangePercent(currentPeriod.activeProjects, previousPeriod.activeProjects);
    kpis.push({
      name: 'Active Projects',
      value: currentPeriod.activeProjects,
      unit: '',
      status: 'good',
      trend: this.determineTrend([previousPeriod.activeProjects, currentPeriod.activeProjects]),
      changePercent: activeProjectsChange,
    });

    return kpis;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private calculateAverageGrowth(values: number[]): number {
    if (values.length < 2) return 0;

    let totalGrowth = 0;
    let count = 0;

    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] !== 0) {
        totalGrowth += (values[i] - values[i - 1]) / values[i - 1];
        count++;
      }
    }

    return count > 0 ? totalGrowth / count : 0;
  }

  private calculateForecastConfidence(trends: TrendData[]): number {
    // Calculate coefficient of variation for consistency
    const profits = trends.map(t => t.profit);
    const mean = profits.reduce((sum, p) => sum + p, 0) / profits.length;
    const variance = profits.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / profits.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = mean !== 0 ? stdDev / Math.abs(mean) : 1;

    // Lower CV = higher confidence
    return Math.max(0, Math.min(100, 100 - (coefficientOfVariation * 100)));
  }

  private determineTrend(values: number[]): 'up' | 'down' | 'stable' {
    if (values.length < 2) return 'stable';

    const start = values[0];
    const end = values[values.length - 1];
    const changePercent = start !== 0 ? ((end - start) / start) * 100 : 0;

    if (changePercent > 5) return 'up';
    if (changePercent < -5) return 'down';
    return 'stable';
  }

  private calculateChangePercent(current: number, previous: number): number {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }

  private determineKPIStatus(value: number, target: number): 'good' | 'warning' | 'critical' {
    const ratio = value / target;
    if (ratio >= 0.9) return 'good';
    if (ratio >= 0.7) return 'warning';
    return 'critical';
  }

  private getEmptyCompanyMetrics(): CompanyMetrics {
    return {
      totalProjects: 0,
      activeProjects: 0,
      completedProjects: 0,
      totalRevenue: 0,
      totalCosts: 0,
      averageProfitMargin: 0,
      totalProfitMarginPercent: 0,
      averageProjectDuration: 0,
      projectSuccessRate: 0,
      onTimeDeliveryRate: 0,
      onBudgetRate: 0,
      teamUtilization: 0,
      averageRiskScore: 0,
    };
  }

  /**
   * Invalidate analytics cache
   */
  async invalidateAnalytics(companyId: string): Promise<void> {
    await cache.invalidateTag('analytics');
    await cache.invalidateTag('metrics');
    await cache.invalidateTag('trends');
    await cache.invalidateTag(`company:${companyId}`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return cache.getStats();
  }
}

// Export singleton instance
export const analyticsEngine = new AnalyticsEngineService();

/**
 * Usage example:
 *
 * ```tsx
 * import { analyticsEngine } from '@/services/analytics/analyticsEngine';
 *
 * const filters: AnalyticsFilters = {
 *   companyId: 'company-123',
 *   startDate: new Date('2024-01-01'),
 *   endDate: new Date('2024-12-31'),
 *   includeCompleted: true,
 * };
 *
 * // Get comprehensive dashboard
 * const dashboard = await analyticsEngine.getDashboard(filters);
 *
 * // Get specific metrics
 * const companyMetrics = await analyticsEngine.getCompanyMetrics(filters);
 * const projectMetrics = await analyticsEngine.getProjectMetrics(filters);
 * const teamPerformance = await analyticsEngine.getTeamPerformance(filters);
 *
 * // Invalidate cache when data changes
 * await analyticsEngine.invalidateAnalytics('company-123');
 *
 * // Check cache performance
 * const stats = analyticsEngine.getCacheStats();
 * console.log(`Cache hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);
 * ```
 */
