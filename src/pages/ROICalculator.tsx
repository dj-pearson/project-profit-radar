import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  Calculator,
  DollarSign, 
  TrendingUp, 
  Users, 
  Clock,
  CheckCircle,
  ArrowRight,
  PieChart,
  BarChart3
} from 'lucide-react';

const ROICalculator = () => {
  const [formData, setFormData] = useState({
    companySize: '',
    annualRevenue: '',
    averageProjectValue: '',
    projectsPerYear: '',
    currentOverruns: '15',
    currentDelays: '20',
    adminHoursPerWeek: '15',
    hourlyRate: '25'
  });

  const [results, setResults] = useState<any>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateROI = () => {
    const revenue = parseFloat(formData.annualRevenue) || 0;
    const projectValue = parseFloat(formData.averageProjectValue) || 0;
    const projectsYear = parseFloat(formData.projectsPerYear) || 0;
    const overrunPercent = parseFloat(formData.currentOverruns) || 0;
    const delayPercent = parseFloat(formData.currentDelays) || 0;
    const adminHours = parseFloat(formData.adminHoursPerWeek) || 0;
    const hourlyRate = parseFloat(formData.hourlyRate) || 0;

    // Calculate current losses
    const overrunLoss = (projectValue * projectsYear * overrunPercent) / 100;
    const delayLoss = (projectValue * projectsYear * delayPercent) / 100 * 0.5; // Assume 50% of delay value as loss
    const adminCost = adminHours * 52 * hourlyRate;
    
    // Calculate potential savings with Build Desk
    const overrunReduction = 0.7; // 70% reduction
    const delayReduction = 0.6; // 60% reduction
    const adminEfficiency = 0.5; // 50% time savings
    
    const savedOverruns = overrunLoss * overrunReduction;
    const savedDelays = delayLoss * delayReduction;
    const savedAdmin = adminCost * adminEfficiency;
    
    const totalCurrentLoss = overrunLoss + delayLoss + adminCost;
    const totalSavings = savedOverruns + savedDelays + savedAdmin;
    
    // Build Desk cost estimation
    let monthlyPlan = 149; // Starter
    if (formData.companySize === '5-15') monthlyPlan = 299; // Professional
    if (formData.companySize === '15+') monthlyPlan = 599; // Enterprise
    
    const annualCost = monthlyPlan * 12;
    const netSavings = totalSavings - annualCost;
    const roi = ((netSavings / annualCost) * 100);

    setResults({
      currentLosses: {
        overruns: overrunLoss,
        delays: delayLoss,
        admin: adminCost,
        total: totalCurrentLoss
      },
      savings: {
        overruns: savedOverruns,
        delays: savedDelays,
        admin: savedAdmin,
        total: totalSavings
      },
      buildDeskCost: annualCost,
      netSavings,
      roi,
      monthlyPlan,
      paybackPeriod: annualCost / (totalSavings / 12)
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <DashboardLayout title="ROI Calculator">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="bg-gradient-to-br from-construction-blue to-construction-blue/80 text-white rounded-lg p-8">
          <div className="max-w-3xl mx-auto text-center">
            <Calculator className="h-16 w-16 mx-auto mb-6 opacity-90" />
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              ROI Calculator
            </h2>
            <p className="text-lg opacity-90">
              Calculate your potential savings with Build Desk construction management software
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Input Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Company Information</span>
                </CardTitle>
                <CardDescription>
                  Tell us about your construction business
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company-size">Company Size</Label>
                    <Select value={formData.companySize} onValueChange={(value) => handleInputChange('companySize', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select team size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-5">1-5 employees</SelectItem>
                        <SelectItem value="5-15">5-15 employees</SelectItem>
                        <SelectItem value="15+">15+ employees</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="annual-revenue">Annual Revenue</Label>
                    <Input
                      id="annual-revenue"
                      type="number"
                      placeholder="e.g., 2000000"
                      value={formData.annualRevenue}
                      onChange={(e) => handleInputChange('annualRevenue', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="project-value">Average Project Value</Label>
                    <Input
                      id="project-value"
                      type="number"
                      placeholder="e.g., 150000"
                      value={formData.averageProjectValue}
                      onChange={(e) => handleInputChange('averageProjectValue', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="projects-year">Projects per Year</Label>
                    <Input
                      id="projects-year"
                      type="number"
                      placeholder="e.g., 20"
                      value={formData.projectsPerYear}
                      onChange={(e) => handleInputChange('projectsPerYear', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Current Challenges</span>
                </CardTitle>
                <CardDescription>
                  How much do current inefficiencies cost you?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="overruns">Budget Overruns (%)</Label>
                    <Input
                      id="overruns"
                      type="number"
                      value={formData.currentOverruns}
                      onChange={(e) => handleInputChange('currentOverruns', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Industry average: 15%</p>
                  </div>
                  <div>
                    <Label htmlFor="delays">Project Delays (%)</Label>
                    <Input
                      id="delays"
                      type="number"
                      value={formData.currentDelays}
                      onChange={(e) => handleInputChange('currentDelays', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Industry average: 20%</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="admin-hours">Admin Hours/Week</Label>
                    <Input
                      id="admin-hours"
                      type="number"
                      value={formData.adminHoursPerWeek}
                      onChange={(e) => handleInputChange('adminHoursPerWeek', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Paperwork, scheduling, tracking</p>
                  </div>
                  <div>
                    <Label htmlFor="hourly-rate">Average Hourly Rate</Label>
                    <Input
                      id="hourly-rate"
                      type="number"
                      value={formData.hourlyRate}
                      onChange={(e) => handleInputChange('hourlyRate', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Blended rate for admin work</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button 
              onClick={calculateROI} 
              className="w-full"
              size="lg"
              disabled={!formData.annualRevenue || !formData.averageProjectValue || !formData.projectsPerYear}
            >
              <Calculator className="mr-2 h-5 w-5" />
              Calculate ROI
            </Button>
          </div>

          {/* Results */}
          <div className="space-y-6">
            {results ? (
              <>
                <Card className="border-construction-blue">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-construction-blue">
                      <PieChart className="h-5 w-5" />
                      <span>Your ROI Analysis</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-construction-blue mb-2">
                        {results.roi > 0 ? '+' : ''}{Math.round(results.roi)}%
                      </div>
                      <p className="text-muted-foreground">Annual Return on Investment</p>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(results.savings.total)}
                        </div>
                        <p className="text-sm text-muted-foreground">Annual Savings</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-construction-orange">
                          {formatCurrency(results.buildDeskCost)}
                        </div>
                        <p className="text-sm text-muted-foreground">Build Desk Cost</p>
                      </div>
                    </div>

                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Net Annual Savings: {formatCurrency(results.netSavings)}</strong>
                        <br />
                        Payback period: {Math.round(results.paybackPeriod)} months
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Savings Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Reduced Budget Overruns</span>
                        <span className="font-medium text-green-600">{formatCurrency(results.savings.overruns)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Eliminated Project Delays</span>
                        <span className="font-medium text-green-600">{formatCurrency(results.savings.delays)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Administrative Efficiency</span>
                        <span className="font-medium text-green-600">{formatCurrency(results.savings.admin)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center font-medium">
                        <span>Total Annual Savings</span>
                        <span className="text-green-600">{formatCurrency(results.savings.total)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Current Annual Losses</CardTitle>
                    <CardDescription>What inefficiencies are costing you now</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Budget Overruns</span>
                        <span className="font-medium text-red-600">{formatCurrency(results.currentLosses.overruns)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Project Delays</span>
                        <span className="font-medium text-red-600">{formatCurrency(results.currentLosses.delays)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Administrative Overhead</span>
                        <span className="font-medium text-red-600">{formatCurrency(results.currentLosses.admin)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center font-medium">
                        <span>Total Annual Loss</span>
                        <span className="text-red-600">{formatCurrency(results.currentLosses.total)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-construction-blue text-white">
                  <CardContent className="p-6 text-center">
                    <h3 className="text-xl font-bold mb-4">Ready to Start Saving?</h3>
                    <p className="mb-6 opacity-90">
                      Join hundreds of contractors already saving money with Build Desk
                    </p>
                    <Button 
                      variant="secondary" 
                      size="lg" 
                      className="w-full bg-white text-construction-blue hover:bg-gray-100"
                      asChild
                    >
                      <Link to="/auth">
                        Start Your Free Trial
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calculator className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-construction-dark mb-2">
                    Calculate Your Potential Savings
                  </h3>
                  <p className="text-muted-foreground">
                    Fill out the form to see how much you could save with Build Desk
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ROICalculator;