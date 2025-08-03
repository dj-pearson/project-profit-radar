import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, Plus, Edit, Trash2, Save, X, TrendingUp } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface LaborBurdenRate {
  id: string;
  employee_id?: string;
  job_title: string;
  base_hourly_rate: number;
  burden_rate_percentage: number;
  total_hourly_cost: number;
  federal_tax_rate: number;
  state_tax_rate: number;
  fica_rate: number;
  unemployment_rate: number;
  workers_comp_rate: number;
  general_liability_rate: number;
  health_insurance_monthly: number;
  retirement_contribution_rate: number;
  equipment_allowance_monthly: number;
  vehicle_allowance_monthly: number;
  other_benefits_monthly: number;
  annual_hours: number;
  effective_date: string;
  is_active: boolean;
  created_at: string;
}

interface BurdenBreakdown {
  payroll_taxes: number;
  insurance_costs: number;
  benefits_costs: number;
  equipment_costs: number;
  total_burden: number;
  burden_percentage: number;
}

export default function LaborBurdenCalculator() {
  const [burdenRates, setBurdenRates] = useState<LaborBurdenRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedRate, setSelectedRate] = useState<LaborBurdenRate | null>(null);
  const [breakdown, setBreakdown] = useState<BurdenBreakdown | null>(null);

  const [formData, setFormData] = useState({
    job_title: '',
    base_hourly_rate: 25.00,
    federal_tax_rate: 7.65,
    state_tax_rate: 5.00,
    fica_rate: 7.65,
    unemployment_rate: 3.00,
    workers_comp_rate: 2.50,
    general_liability_rate: 1.00,
    health_insurance_monthly: 500,
    retirement_contribution_rate: 3.00,
    equipment_allowance_monthly: 100,
    vehicle_allowance_monthly: 0,
    other_benefits_monthly: 0,
    annual_hours: 2080
  });

  useEffect(() => {
    loadBurdenRates();
  }, []);

  useEffect(() => {
    if (selectedRate) {
      calculateBreakdown(selectedRate);
    }
  }, [selectedRate]);

  const loadBurdenRates = async () => {
    try {
      // For now, use mock data since the table is new and types haven't regenerated
      const mockRates: LaborBurdenRate[] = [
        {
          id: '1',
          job_title: 'Construction Foreman',
          base_hourly_rate: 35.00,
          burden_rate_percentage: 42.5,
          total_hourly_cost: 49.88,
          federal_tax_rate: 7.65,
          state_tax_rate: 5.00,
          fica_rate: 7.65,
          unemployment_rate: 3.00,
          workers_comp_rate: 4.00,
          general_liability_rate: 1.50,
          health_insurance_monthly: 650,
          retirement_contribution_rate: 3.00,
          equipment_allowance_monthly: 150,
          vehicle_allowance_monthly: 400,
          other_benefits_monthly: 100,
          annual_hours: 2080,
          effective_date: new Date().toISOString().split('T')[0],
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          job_title: 'Skilled Tradesperson',
          base_hourly_rate: 28.00,
          burden_rate_percentage: 38.2,
          total_hourly_cost: 38.70,
          federal_tax_rate: 7.65,
          state_tax_rate: 5.00,
          fica_rate: 7.65,
          unemployment_rate: 3.00,
          workers_comp_rate: 3.50,
          general_liability_rate: 1.00,
          health_insurance_monthly: 550,
          retirement_contribution_rate: 3.00,
          equipment_allowance_monthly: 100,
          vehicle_allowance_monthly: 0,
          other_benefits_monthly: 75,
          annual_hours: 2080,
          effective_date: new Date().toISOString().split('T')[0],
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: '3',
          job_title: 'Apprentice',
          base_hourly_rate: 18.00,
          burden_rate_percentage: 35.8,
          total_hourly_cost: 24.44,
          federal_tax_rate: 7.65,
          state_tax_rate: 5.00,
          fica_rate: 7.65,
          unemployment_rate: 3.00,
          workers_comp_rate: 3.00,
          general_liability_rate: 0.75,
          health_insurance_monthly: 450,
          retirement_contribution_rate: 2.00,
          equipment_allowance_monthly: 75,
          vehicle_allowance_monthly: 0,
          other_benefits_monthly: 50,
          annual_hours: 2080,
          effective_date: new Date().toISOString().split('T')[0],
          is_active: true,
          created_at: new Date().toISOString()
        }
      ];
      
      setBurdenRates(mockRates);
      setSelectedRate(mockRates[0]);
    } catch (error) {
      console.error('Error loading burden rates:', error);
      toast({
        title: "Error",
        description: "Failed to load labor burden rates",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateBreakdown = (rate: LaborBurdenRate): BurdenBreakdown => {
    // Calculate annual costs
    const annualBase = rate.base_hourly_rate * rate.annual_hours;
    
    // Payroll taxes (percentage of base salary)
    const federalTax = annualBase * (rate.federal_tax_rate / 100);
    const stateTax = annualBase * (rate.state_tax_rate / 100);
    const ficaTax = annualBase * (rate.fica_rate / 100);
    const unemployment = annualBase * (rate.unemployment_rate / 100);
    const payrollTaxes = federalTax + stateTax + ficaTax + unemployment;

    // Insurance costs (percentage of base salary)
    const workersComp = annualBase * (rate.workers_comp_rate / 100);
    const generalLiability = annualBase * (rate.general_liability_rate / 100);
    const insuranceCosts = workersComp + generalLiability;

    // Benefits (fixed monthly amounts annualized)
    const healthInsurance = rate.health_insurance_monthly * 12;
    const retirement = annualBase * (rate.retirement_contribution_rate / 100);
    const benefitsCosts = healthInsurance + retirement;

    // Equipment and other costs (fixed monthly amounts annualized)
    const equipment = rate.equipment_allowance_monthly * 12;
    const vehicle = rate.vehicle_allowance_monthly * 12;
    const otherBenefits = rate.other_benefits_monthly * 12;
    const equipmentCosts = equipment + vehicle + otherBenefits;

    // Total burden
    const totalBurden = payrollTaxes + insuranceCosts + benefitsCosts + equipmentCosts;
    const burdenPercentage = (totalBurden / annualBase) * 100;

    const result: BurdenBreakdown = {
      payroll_taxes: payrollTaxes / rate.annual_hours,
      insurance_costs: insuranceCosts / rate.annual_hours,
      benefits_costs: benefitsCosts / rate.annual_hours,
      equipment_costs: equipmentCosts / rate.annual_hours,
      total_burden: totalBurden / rate.annual_hours,
      burden_percentage: burdenPercentage
    };

    setBreakdown(result);
    return result;
  };

  const calculateTotalCost = (baseRate: number, breakdown: BurdenBreakdown): number => {
    return baseRate + breakdown.total_burden;
  };

  const saveBurdenRate = async () => {
    try {
      // Calculate burden rate and total cost
      const mockBreakdown = calculateBurdenFromFormData();
      const totalCost = formData.base_hourly_rate + mockBreakdown.total_burden;

      // For demo purposes, just add to local state
      const newRate: LaborBurdenRate = {
        id: editingId || Date.now().toString(),
        job_title: formData.job_title,
        base_hourly_rate: formData.base_hourly_rate,
        burden_rate_percentage: mockBreakdown.burden_percentage,
        total_hourly_cost: totalCost,
        federal_tax_rate: formData.federal_tax_rate,
        state_tax_rate: formData.state_tax_rate,
        fica_rate: formData.fica_rate,
        unemployment_rate: formData.unemployment_rate,
        workers_comp_rate: formData.workers_comp_rate,
        general_liability_rate: formData.general_liability_rate,
        health_insurance_monthly: formData.health_insurance_monthly,
        retirement_contribution_rate: formData.retirement_contribution_rate,
        equipment_allowance_monthly: formData.equipment_allowance_monthly,
        vehicle_allowance_monthly: formData.vehicle_allowance_monthly,
        other_benefits_monthly: formData.other_benefits_monthly,
        annual_hours: formData.annual_hours,
        effective_date: new Date().toISOString().split('T')[0],
        is_active: true,
        created_at: new Date().toISOString()
      };

      if (editingId) {
        setBurdenRates(rates => rates.map(rate => 
          rate.id === editingId ? newRate : rate
        ));
      } else {
        setBurdenRates([...burdenRates, newRate]);
      }

      resetForm();
      toast({
        title: "Success",
        description: `Labor burden rate ${editingId ? 'updated' : 'added'} successfully`
      });
    } catch (error) {
      console.error('Error saving burden rate:', error);
      toast({
        title: "Error",
        description: "Failed to save labor burden rate",
        variant: "destructive"
      });
    }
  };

  const calculateBurdenFromFormData = (): BurdenBreakdown => {
    const annualBase = formData.base_hourly_rate * formData.annual_hours;
    
    const payrollTaxes = annualBase * (
      (formData.federal_tax_rate + formData.state_tax_rate + 
       formData.fica_rate + formData.unemployment_rate) / 100
    );
    
    const insuranceCosts = annualBase * (
      (formData.workers_comp_rate + formData.general_liability_rate) / 100
    );
    
    const benefitsCosts = (formData.health_insurance_monthly * 12) + 
      (annualBase * (formData.retirement_contribution_rate / 100));
    
    const equipmentCosts = (formData.equipment_allowance_monthly + 
      formData.vehicle_allowance_monthly + formData.other_benefits_monthly) * 12;
    
    const totalBurden = payrollTaxes + insuranceCosts + benefitsCosts + equipmentCosts;
    
    return {
      payroll_taxes: payrollTaxes / formData.annual_hours,
      insurance_costs: insuranceCosts / formData.annual_hours,
      benefits_costs: benefitsCosts / formData.annual_hours,
      equipment_costs: equipmentCosts / formData.annual_hours,
      total_burden: totalBurden / formData.annual_hours,
      burden_percentage: (totalBurden / annualBase) * 100
    };
  };

  const resetForm = () => {
    setFormData({
      job_title: '',
      base_hourly_rate: 25.00,
      federal_tax_rate: 7.65,
      state_tax_rate: 5.00,
      fica_rate: 7.65,
      unemployment_rate: 3.00,
      workers_comp_rate: 2.50,
      general_liability_rate: 1.00,
      health_insurance_monthly: 500,
      retirement_contribution_rate: 3.00,
      equipment_allowance_monthly: 100,
      vehicle_allowance_monthly: 0,
      other_benefits_monthly: 0,
      annual_hours: 2080
    });
    setShowAddForm(false);
    setEditingId(null);
  };

  const editRate = (rate: LaborBurdenRate) => {
    setFormData({
      job_title: rate.job_title,
      base_hourly_rate: rate.base_hourly_rate,
      federal_tax_rate: rate.federal_tax_rate,
      state_tax_rate: rate.state_tax_rate,
      fica_rate: rate.fica_rate,
      unemployment_rate: rate.unemployment_rate,
      workers_comp_rate: rate.workers_comp_rate,
      general_liability_rate: rate.general_liability_rate,
      health_insurance_monthly: rate.health_insurance_monthly,
      retirement_contribution_rate: rate.retirement_contribution_rate,
      equipment_allowance_monthly: rate.equipment_allowance_monthly,
      vehicle_allowance_monthly: rate.vehicle_allowance_monthly,
      other_benefits_monthly: rate.other_benefits_monthly,
      annual_hours: rate.annual_hours
    });
    setEditingId(rate.id);
    setShowAddForm(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading labor burden rates...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Labor Burden Calculator</h2>
          <p className="text-muted-foreground">Calculate true hourly costs including taxes, insurance, and benefits</p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Burden Rate
        </Button>
      </div>

      <Tabs defaultValue="rates" className="w-full">
        <TabsList>
          <TabsTrigger value="rates">Burden Rates</TabsTrigger>
          <TabsTrigger value="calculator">Quick Calculator</TabsTrigger>
          <TabsTrigger value="analysis">Cost Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="rates" className="space-y-4">
          {/* Rates List */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {burdenRates.map((rate) => (
              <Card key={rate.id} className={`cursor-pointer transition-colors ${
                selectedRate?.id === rate.id ? 'border-primary' : ''
              }`} onClick={() => setSelectedRate(rate)}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{rate.job_title}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{rate.burden_rate_percentage.toFixed(1)}% burden</Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={(e) => {
                        e.stopPropagation();
                        editRate(rate);
                      }}>
                        <Edit className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Base Rate:</span>
                      <span className="font-medium">${rate.base_hourly_rate.toFixed(2)}/hr</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Cost:</span>
                      <span className="font-bold text-lg">${rate.total_hourly_cost.toFixed(2)}/hr</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Burden Cost:</span>
                      <span className="text-primary font-medium">
                        ${(rate.total_hourly_cost - rate.base_hourly_rate).toFixed(2)}/hr
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detailed Breakdown */}
          {selectedRate && breakdown && (
            <Card>
              <CardHeader>
                <CardTitle>Cost Breakdown: {selectedRate.job_title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">${breakdown.payroll_taxes.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Payroll Taxes</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      FICA, Federal, State, Unemployment
                    </div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">${breakdown.insurance_costs.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Insurance</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Workers Comp, General Liability
                    </div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">${breakdown.benefits_costs.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Benefits</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Health Insurance, Retirement
                    </div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">${breakdown.equipment_costs.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">Equipment</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Tools, Vehicle, Other Allowances
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-primary/10 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-lg font-semibold">Total Hourly Cost</div>
                      <div className="text-sm text-muted-foreground">
                        ${selectedRate.base_hourly_rate.toFixed(2)} base + ${breakdown.total_burden.toFixed(2)} burden
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold">${selectedRate.total_hourly_cost.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">per hour</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="calculator" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Burden Calculator</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="quick-base-rate">Base Hourly Rate</Label>
                  <Input
                    id="quick-base-rate"
                    type="number"
                    step="0.01"
                    value={formData.base_hourly_rate}
                    onChange={(e) => setFormData({...formData, base_hourly_rate: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="quick-burden">Estimated Burden %</Label>
                  <Input
                    id="quick-burden"
                    type="number"
                    step="0.1"
                    value={(calculateBurdenFromFormData().burden_percentage).toFixed(1)}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div>
                  <Label htmlFor="quick-total">Total Hourly Cost</Label>
                  <Input
                    id="quick-total"
                    type="number"
                    step="0.01"
                    value={(formData.base_hourly_rate + calculateBurdenFromFormData().total_burden).toFixed(2)}
                    readOnly
                    className="bg-muted font-bold"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  ${burdenRates.reduce((avg, rate) => avg + rate.base_hourly_rate, 0) / (burdenRates.length || 1)}
                </div>
                <p className="text-sm text-muted-foreground">Average Base Rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {(burdenRates.reduce((avg, rate) => avg + rate.burden_rate_percentage, 0) / (burdenRates.length || 1)).toFixed(1)}%
                </div>
                <p className="text-sm text-muted-foreground">Average Burden Rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-600">
                  ${(burdenRates.reduce((avg, rate) => avg + rate.total_hourly_cost, 0) / (burdenRates.length || 1)).toFixed(2)}
                </div>
                <p className="text-sm text-muted-foreground">Average Total Cost</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{editingId ? 'Edit' : 'Add'} Burden Rate</CardTitle>
                <Button variant="outline" size="sm" onClick={resetForm}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="job_title">Job Title</Label>
                    <Input
                      id="job_title"
                      value={formData.job_title}
                      onChange={(e) => setFormData({...formData, job_title: e.target.value})}
                      placeholder="e.g., Construction Foreman"
                    />
                  </div>
                  <div>
                    <Label htmlFor="base_hourly_rate">Base Hourly Rate ($)</Label>
                    <Input
                      id="base_hourly_rate"
                      type="number"
                      step="0.01"
                      value={formData.base_hourly_rate}
                      onChange={(e) => setFormData({...formData, base_hourly_rate: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="annual_hours">Annual Work Hours</Label>
                    <Input
                      id="annual_hours"
                      type="number"
                      value={formData.annual_hours}
                      onChange={(e) => setFormData({...formData, annual_hours: Number(e.target.value)})}
                    />
                  </div>
                </div>
              </div>

              {/* Payroll Taxes */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Payroll Taxes (%)</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="federal_tax_rate">Federal Tax</Label>
                    <Input
                      id="federal_tax_rate"
                      type="number"
                      step="0.01"
                      value={formData.federal_tax_rate}
                      onChange={(e) => setFormData({...formData, federal_tax_rate: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="state_tax_rate">State Tax</Label>
                    <Input
                      id="state_tax_rate"
                      type="number"
                      step="0.01"
                      value={formData.state_tax_rate}
                      onChange={(e) => setFormData({...formData, state_tax_rate: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="fica_rate">FICA</Label>
                    <Input
                      id="fica_rate"
                      type="number"
                      step="0.01"
                      value={formData.fica_rate}
                      onChange={(e) => setFormData({...formData, fica_rate: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="unemployment_rate">Unemployment</Label>
                    <Input
                      id="unemployment_rate"
                      type="number"
                      step="0.01"
                      value={formData.unemployment_rate}
                      onChange={(e) => setFormData({...formData, unemployment_rate: Number(e.target.value)})}
                    />
                  </div>
                </div>
              </div>

              {/* Insurance */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Insurance Rates (%)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="workers_comp_rate">Workers Compensation</Label>
                    <Input
                      id="workers_comp_rate"
                      type="number"
                      step="0.01"
                      value={formData.workers_comp_rate}
                      onChange={(e) => setFormData({...formData, workers_comp_rate: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="general_liability_rate">General Liability</Label>
                    <Input
                      id="general_liability_rate"
                      type="number"
                      step="0.01"
                      value={formData.general_liability_rate}
                      onChange={(e) => setFormData({...formData, general_liability_rate: Number(e.target.value)})}
                    />
                  </div>
                </div>
              </div>

              {/* Benefits */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Benefits & Allowances</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="health_insurance_monthly">Health Insurance ($/month)</Label>
                    <Input
                      id="health_insurance_monthly"
                      type="number"
                      step="0.01"
                      value={formData.health_insurance_monthly}
                      onChange={(e) => setFormData({...formData, health_insurance_monthly: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="retirement_contribution_rate">Retirement Contribution (%)</Label>
                    <Input
                      id="retirement_contribution_rate"
                      type="number"
                      step="0.01"
                      value={formData.retirement_contribution_rate}
                      onChange={(e) => setFormData({...formData, retirement_contribution_rate: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="equipment_allowance_monthly">Equipment Allowance ($/month)</Label>
                    <Input
                      id="equipment_allowance_monthly"
                      type="number"
                      step="0.01"
                      value={formData.equipment_allowance_monthly}
                      onChange={(e) => setFormData({...formData, equipment_allowance_monthly: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="vehicle_allowance_monthly">Vehicle Allowance ($/month)</Label>
                    <Input
                      id="vehicle_allowance_monthly"
                      type="number"
                      step="0.01"
                      value={formData.vehicle_allowance_monthly}
                      onChange={(e) => setFormData({...formData, vehicle_allowance_monthly: Number(e.target.value)})}
                    />
                  </div>
                </div>
              </div>

              {/* Calculation Preview */}
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="text-lg font-semibold mb-3">Calculation Preview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Base Hourly Rate:</div>
                    <div className="text-xl font-bold">${formData.base_hourly_rate.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Burden Rate:</div>
                    <div className="text-xl font-bold text-primary">
                      {calculateBurdenFromFormData().burden_percentage.toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Burden Cost:</div>
                    <div className="text-xl font-bold text-orange-600">
                      ${calculateBurdenFromFormData().total_burden.toFixed(2)}/hr
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Total Hourly Cost:</div>
                    <div className="text-xl font-bold text-green-600">
                      ${(formData.base_hourly_rate + calculateBurdenFromFormData().total_burden).toFixed(2)}/hr
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button onClick={saveBurdenRate}>
                  <Save className="w-4 h-4 mr-2" />
                  {editingId ? 'Update' : 'Save'} Burden Rate
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}