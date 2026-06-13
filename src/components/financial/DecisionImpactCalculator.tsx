import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Calculator,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Users,
  Package,
  Wrench
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ProjectState {
  name: string;
  current_budget: number;
  current_costs: number;
  current_revenue: number;
  current_margin: number;
}

interface DecisionScenario {
  type: 'change_order' | 'new_hire' | 'equipment' | 'material_change';
  description: string;
  cost: number;
  additional_revenue?: number;
  time_impact_days?: number;
}

interface ImpactAnalysis {
  new_margin: number;
  margin_change: number;
  new_profit: number;
  profit_change: number;
  recommendation: 'approve' | 'reconsider' | 'reject';
  reasoning: string;
  breakeven_revenue?: number;
}

export const DecisionImpactCalculator = () => {
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [decisionType, setDecisionType] = useState<string>('change_order');
  const [decisionCost, setDecisionCost] = useState<string>('');
  const [additionalRevenue, setAdditionalRevenue] = useState<string>('');
  const [timeDays, setTimeDays] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [analysis, setAnalysis] = useState<ImpactAnalysis | null>(null);

  // Mock project data - in production, this would come from API
  const mockProjects: ProjectState[] = [
    {
      name: 'Downtown Office Renovation',
      current_budget: 485000,
      current_costs: 412500,
      current_revenue: 485000,
      current_margin: 14.9
    },
    {
      name: 'Residential Kitchen Remodel',
      current_budget: 87500,
      current_costs: 79200,
      current_revenue: 87500,
      current_margin: 9.5
    },
    {
      name: 'Warehouse Expansion',
      current_budget: 1250000,
      current_costs: 987500,
      current_revenue: 1250000,
      current_margin: 21.0
    }
  ];

  const currentProject = mockProjects.find(p => p.name === selectedProject);

  const calculateImpact = () => {
    if (!currentProject || !decisionCost) return;

    const cost = parseFloat(decisionCost);
    const revenue = additionalRevenue ? parseFloat(additionalRevenue) : 0;
    const days = timeDays ? parseInt(timeDays) : 0;

    // Calculate new financials
    const newCosts = currentProject.current_costs + cost;
    const newRevenue = currentProject.current_revenue + revenue;
    const newProfit = newRevenue - newCosts;
    const newMargin = ((newRevenue - newCosts) / newRevenue) * 100;

    const currentProfit = currentProject.current_revenue - currentProject.current_costs;
    const marginChange = newMargin - currentProject.current_margin;
    const profitChange = newProfit - currentProfit;

    // Determine recommendation
    let recommendation: 'approve' | 'reconsider' | 'reject' = 'approve';
    let reasoning = '';

    if (newMargin >= 15) {
      recommendation = 'approve';
      reasoning = `Excellent margin of ${newMargin.toFixed(1)}%. This decision maintains healthy profitability.`;
    } else if (newMargin >= 10) {
      recommendation = 'reconsider';
      reasoning = `Margin drops to ${newMargin.toFixed(1)}%, which is acceptable but below your 15% target. Consider negotiating additional revenue or reducing costs.`;
    } else {
      recommendation = 'reject';
      reasoning = `Warning: Margin drops to ${newMargin.toFixed(1)}%, which is below healthy thresholds. This decision significantly impacts profitability. Strong recommendation to reject or restructure.`;
    }

    // Calculate breakeven revenue (what additional revenue needed to maintain current margin)
    const targetProfit = currentProject.current_margin / 100;
    const breakevenRevenue = (newCosts / (1 - targetProfit)) - currentProject.current_revenue;

    setAnalysis({
      new_margin: newMargin,
      margin_change: marginChange,
      new_profit: newProfit,
      profit_change: profitChange,
      recommendation,
      reasoning,
      breakeven_revenue: breakevenRevenue > 0 ? breakevenRevenue : undefined
    });
  };

  const resetCalculator = () => {
    setDecisionCost('');
    setAdditionalRevenue('');
    setTimeDays('');
    setDescription('');
    setAnalysis(null);
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'approve': return 'bg-green-50 text-green-700 border-green-200';
      case 'reconsider': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'reject': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getRecommendationIcon = (rec: string) => {
    switch (rec) {
      case 'approve': return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'reconsider': return <AlertTriangle className="h-6 w-6 text-yellow-600" />;
      case 'reject': return <AlertTriangle className="h-6 w-6 text-red-600" />;
      default: return <Calculator className="h-6 w-6" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const decisionTypes = [
    { value: 'change_order', label: 'Change Order', icon: Package },
    { value: 'new_hire', label: 'New Hire', icon: Users },
    { value: 'equipment', label: 'Equipment Purchase', icon: Wrench },
    { value: 'material_change', label: 'Material Upgrade', icon: Package }
  ];

  return (
    <div className="space-y-6">
      <Card className="border-2 border-construction-orange/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-6 w-6 text-construction-orange" />
            Decision Impact Calculator
          </CardTitle>
          <CardDescription>
            See the financial impact of decisions BEFORE you make them. Know if that change order drops your margin from 18% to 12%.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Project Selection */}
          <div className="space-y-2">
            <Label htmlFor="project">Select Project</Label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger id="project">
                <SelectValue placeholder="Choose a project..." />
              </SelectTrigger>
              <SelectContent>
                {mockProjects.map((project) => (
                  <SelectItem key={project.name} value={project.name}>
                    {project.name} (Current Margin: {project.current_margin.toFixed(1)}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Current Project State */}
          {currentProject && (
            <div className="p-4 bg-secondary/50 rounded-lg space-y-3">
              <h4 className="font-semibold text-sm">Current Project Status</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Budget</p>
                  <p className="font-semibold">{formatCurrency(currentProject.current_budget)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Costs</p>
                  <p className="font-semibold">{formatCurrency(currentProject.current_costs)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Revenue</p>
                  <p className="font-semibold">{formatCurrency(currentProject.current_revenue)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Margin</p>
                  <p className="font-semibold text-construction-orange">
                    {currentProject.current_margin.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Decision Type Tabs */}
          {selectedProject && (
            <Tabs value={decisionType} onValueChange={setDecisionType}>
              <TabsList className="grid grid-cols-4 w-full">
                {decisionTypes.map((type) => (
                  <TabsTrigger key={type.value} value={type.value} className="flex items-center gap-2">
                    <type.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{type.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {decisionTypes.map((type) => (
                <TabsContent key={type.value} value={type.value} className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="description">Description (optional)</Label>
                      <Input
                        id="description"
                        placeholder={`e.g., "Add granite countertops upgrade"`}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cost">Additional Cost *</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="cost"
                            type="number"
                            placeholder="5200"
                            className="pl-9"
                            value={decisionCost}
                            onChange={(e) => setDecisionCost(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="revenue">Additional Revenue</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="revenue"
                            type="number"
                            placeholder="7500"
                            className="pl-9"
                            value={additionalRevenue}
                            onChange={(e) => setAdditionalRevenue(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="days">Time Impact (days)</Label>
                        <Input
                          id="days"
                          type="number"
                          placeholder="3"
                          value={timeDays}
                          onChange={(e) => setTimeDays(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={calculateImpact}
                        disabled={!decisionCost}
                        className="flex-1"
                        variant="hero"
                      >
                        <Calculator className="mr-2 h-4 w-4" />
                        Calculate Impact
                      </Button>
                      <Button onClick={resetCalculator} variant="outline">
                        Reset
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}

          {/* Impact Analysis Results */}
          {analysis && currentProject && (
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-lg">Impact Analysis</h3>

              {/* Recommendation Badge */}
              <Card className={`border-2 ${getRecommendationColor(analysis.recommendation)}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    {getRecommendationIcon(analysis.recommendation)}
                    <div className="flex-1">
                      <h4 className="font-bold text-lg capitalize mb-2">
                        {analysis.recommendation === 'approve' && 'Recommended: Proceed'}
                        {analysis.recommendation === 'reconsider' && 'Caution: Review Carefully'}
                        {analysis.recommendation === 'reject' && 'Not Recommended'}
                      </h4>
                      <p className="text-sm">{analysis.reasoning}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Before & After Comparison */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Before Decision</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Profit Margin:</span>
                      <span className="font-bold">{currentProject.current_margin.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Profit:</span>
                      <span className="font-bold">
                        {formatCurrency(currentProject.current_revenue - currentProject.current_costs)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">After Decision</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Profit Margin:</span>
                      <span className="font-bold flex items-center gap-2">
                        {analysis.new_margin.toFixed(1)}%
                        {analysis.margin_change < 0 ? (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        ) : (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Profit:</span>
                      <span className="font-bold">
                        {formatCurrency(analysis.new_profit)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Change Summary */}
              <Card className="bg-construction-orange/5">
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-3">Impact Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Margin Change:</span>
                      <span className={`font-bold ${analysis.margin_change < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {analysis.margin_change > 0 ? '+' : ''}{analysis.margin_change.toFixed(1)}%
                        ({currentProject.current_margin.toFixed(1)}% → {analysis.new_margin.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Profit Change:</span>
                      <span className={`font-bold ${analysis.profit_change < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {analysis.profit_change > 0 ? '+' : ''}{formatCurrency(analysis.profit_change)}
                      </span>
                    </div>
                    {analysis.breakeven_revenue && (
                      <div className="flex justify-between pt-2 border-t">
                        <span>To maintain {currentProject.current_margin.toFixed(1)}% margin:</span>
                        <span className="font-bold text-construction-orange">
                          Need {formatCurrency(analysis.breakeven_revenue)} more revenue
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Action Items */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">Next Steps</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  {analysis.recommendation === 'approve' && (
                    <>
                      <li>✓ This decision maintains healthy profitability</li>
                      <li>✓ Proceed with standard approval process</li>
                      <li>✓ Update project financials immediately after approval</li>
                    </>
                  )}
                  {analysis.recommendation === 'reconsider' && (
                    <>
                      <li>• Review if additional revenue can be negotiated</li>
                      <li>• Explore cost reduction alternatives</li>
                      <li>• Consider phasing the work to spread costs</li>
                      <li>• Get client approval for increased pricing</li>
                    </>
                  )}
                  {analysis.recommendation === 'reject' && (
                    <>
                      <li>⚠ Margin drops below acceptable thresholds</li>
                      <li>⚠ Negotiate significant additional revenue</li>
                      <li>⚠ Find alternative lower-cost solutions</li>
                      <li>⚠ Consider declining this scope change</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DecisionImpactCalculator;
