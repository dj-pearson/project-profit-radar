import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveContainer } from "@/components/layout/ResponsiveContainer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import { SkipLink } from "@/components/accessibility/AccessibilityUtils";
import { Calculator, DollarSign, ArrowLeft, Download, TrendingUp, AlertTriangle } from 'lucide-react';

const ProfitCalculator = () => {
  const [projectBudget, setProjectBudget] = useState('');
  const [materialCosts, setMaterialCosts] = useState('');
  const [laborCosts, setLaborCosts] = useState('');
  const [equipmentCosts, setEquipmentCosts] = useState('');
  const [overheadCosts, setOverheadCosts] = useState('');
  const [contingency, setContingency] = useState('10');

  const calculateResults = () => {
    const budget = parseFloat(projectBudget) || 0;
    const materials = parseFloat(materialCosts) || 0;
    const labor = parseFloat(laborCosts) || 0;
    const equipment = parseFloat(equipmentCosts) || 0;
    const overhead = parseFloat(overheadCosts) || 0;
    const contingencyPercent = parseFloat(contingency) || 0;

    const totalDirectCosts = materials + labor + equipment;
    const contingencyAmount = (totalDirectCosts * contingencyPercent) / 100;
    const totalCosts = totalDirectCosts + overhead + contingencyAmount;
    const grossProfit = budget - totalCosts;
    const profitMargin = budget > 0 ? (grossProfit / budget) * 100 : 0;

    return {
      budget,
      totalDirectCosts,
      overhead,
      contingencyAmount,
      totalCosts,
      grossProfit,
      profitMargin,
      breakdownCosts: {
        materials,
        labor,
        equipment,
        overhead,
        contingency: contingencyAmount
      }
    };
  };

  const results = calculateResults();
  const hasInputs = projectBudget || materialCosts || laborCosts || equipmentCosts || overheadCosts;

  const getProfitMarginStatus = (margin: number) => {
    if (margin >= 20) return { status: 'excellent', color: 'text-green-600', bg: 'bg-green-50' };
    if (margin >= 15) return { status: 'good', color: 'text-green-600', bg: 'bg-green-50' };
    if (margin >= 10) return { status: 'fair', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    if (margin >= 5) return { status: 'poor', color: 'text-orange-600', bg: 'bg-orange-50' };
    return { status: 'loss', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const marginStatus = getProfitMarginStatus(results.profitMargin);

  return (
    <div className="min-h-screen bg-background">
      <SEOMetaTags
        title="Free Construction Profit Calculator | Project Profitability Tool | Build-Desk"
        description="Calculate construction project profitability instantly. Analyze costs, profit margins, and optimize pricing with our free profit calculator tool."
        keywords={[
          'construction profit calculator',
          'project profitability calculator',
          'construction cost calculator',
          'profit margin calculator',
          'construction pricing tool',
          'project cost estimator'
        ]}
        canonicalUrl="/tools/profit-calculator"
      />
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      
      <Header />
      
      <main id="main-content">
        {/* Header */}
        <section className="py-8 bg-gradient-to-b from-construction-light to-background">
          <ResponsiveContainer>
            <div className="flex items-center mb-6">
              <Button variant="ghost" asChild className="mr-4">
                <Link to="/tools" className="flex items-center">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Tools
                </Link>
              </Button>
            </div>
            <div className="max-w-4xl mx-auto text-center">
              <div className="flex items-center justify-center mb-4">
                <Calculator className="h-10 w-10 text-construction-orange mr-3" />
                <h1 className="text-3xl lg:text-4xl font-bold text-construction-dark">
                  Construction Profit Calculator
                </h1>
              </div>
              <p className="text-lg text-construction-dark/70 mb-6">
                Calculate project profitability and optimize your pricing strategy with detailed cost analysis.
              </p>
            </div>
          </ResponsiveContainer>
        </section>

        {/* Calculator Interface */}
        <section className="py-12">
          <ResponsiveContainer>
            <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
              {/* Input Form */}
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="mr-2 h-5 w-5 text-construction-orange" />
                    Project Details
                  </CardTitle>
                  <CardDescription>
                    Enter your project costs to calculate profitability
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="budget">Project Budget ($)</Label>
                    <Input
                      id="budget"
                      type="number"
                      placeholder="150,000"
                      value={projectBudget}
                      onChange={(e) => setProjectBudget(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="materials">Material Costs ($)</Label>
                    <Input
                      id="materials"
                      type="number"
                      placeholder="45,000"
                      value={materialCosts}
                      onChange={(e) => setMaterialCosts(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="labor">Labor Costs ($)</Label>
                    <Input
                      id="labor"
                      type="number"
                      placeholder="60,000"
                      value={laborCosts}
                      onChange={(e) => setLaborCosts(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="equipment">Equipment Costs ($)</Label>
                    <Input
                      id="equipment"
                      type="number"
                      placeholder="8,000"
                      value={equipmentCosts}
                      onChange={(e) => setEquipmentCosts(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="overhead">Overhead Costs ($)</Label>
                    <Input
                      id="overhead"
                      type="number"
                      placeholder="12,000"
                      value={overheadCosts}
                      onChange={(e) => setOverheadCosts(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="contingency">Contingency (%)</Label>
                    <Input
                      id="contingency"
                      type="number"
                      placeholder="10"
                      value={contingency}
                      onChange={(e) => setContingency(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Results */}
              <div className="space-y-6">
                {/* Profit Summary */}
                <Card className={hasInputs ? marginStatus.bg : ''}>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="mr-2 h-5 w-5 text-construction-orange" />
                      Profit Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {hasInputs ? (
                      <>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-construction-dark">
                              ${results.grossProfit.toLocaleString()}
                            </div>
                            <div className="text-sm text-muted-foreground">Gross Profit</div>
                          </div>
                          <div className="text-center">
                            <div className={`text-2xl font-bold ${marginStatus.color}`}>
                              {results.profitMargin.toFixed(1)}%
                            </div>
                            <div className="text-sm text-muted-foreground">Profit Margin</div>
                          </div>
                        </div>

                        {results.profitMargin < 5 && (
                          <div className="flex items-start p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                            <AlertTriangle className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                            <div className="text-sm">
                              <p className="font-medium text-red-800">Low Profit Margin</p>
                              <p className="text-red-700">Consider reviewing costs or adjusting pricing to improve profitability.</p>
                            </div>
                          </div>
                        )}

                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span>Project Budget:</span>
                            <span className="font-medium">${results.budget.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Direct Costs:</span>
                            <span>${results.totalDirectCosts.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Overhead:</span>
                            <span>${results.overhead.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Contingency ({contingency}%):</span>
                            <span>${results.contingencyAmount.toLocaleString()}</span>
                          </div>
                          <div className="border-t pt-3 flex justify-between font-semibold">
                            <span>Total Project Costs:</span>
                            <span>${results.totalCosts.toLocaleString()}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Enter project details to see profit analysis</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Cost Breakdown */}
                {hasInputs && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Cost Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Materials:</span>
                          <span>${results.breakdownCosts.materials.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Labor:</span>
                          <span>${results.breakdownCosts.labor.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Equipment:</span>
                          <span>${results.breakdownCosts.equipment.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Overhead:</span>
                          <span>${results.breakdownCosts.overhead.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Contingency:</span>
                          <span>${results.breakdownCosts.contingency.toLocaleString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </ResponsiveContainer>
        </section>

        {/* Tips Section */}
        <section className="py-12 bg-muted/30">
          <ResponsiveContainer>
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-construction-dark mb-8 text-center">
                Profit Optimization Tips
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Healthy Profit Margins</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li><strong>20%+:</strong> Excellent - Premium projects</li>
                      <li><strong>15-20%:</strong> Good - Standard commercial</li>
                      <li><strong>10-15%:</strong> Fair - Competitive markets</li>
                      <li><strong>5-10%:</strong> Poor - Review costs</li>
                      <li><strong>&lt;5%:</strong> Risk - Reassess pricing</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Cost Control Strategies</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li>• Track actual vs. estimated costs weekly</li>
                      <li>• Negotiate better material pricing</li>
                      <li>• Optimize crew productivity</li>
                      <li>• Minimize equipment idle time</li>
                      <li>• Build 10-15% contingency into bids</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </ResponsiveContainer>
        </section>

        {/* CTA Section */}
        <section className="py-12 bg-construction-orange">
          <ResponsiveContainer>
            <div className="text-center text-white max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold mb-4">
                Need More Advanced Cost Tracking?
              </h2>
              <p className="text-lg mb-6 opacity-90">
                Build-Desk provides real-time job costing, automated QuickBooks sync, and detailed profitability tracking for every project.
              </p>
              <Button variant="secondary" size="lg" asChild>
                <Link to="/auth">
                  Start Free Trial
                </Link>
              </Button>
            </div>
          </ResponsiveContainer>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ProfitCalculator; 