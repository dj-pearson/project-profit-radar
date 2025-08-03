import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Calculator, TrendingUp, TrendingDown, Clock, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImpactAnalysis {
  budgetImpact: {
    materialCosts: number;
    laborCosts: number;
    equipmentCosts: number;
    overhead: number;
    total: number;
  };
  scheduleImpact: {
    additionalDays: number;
    criticalPathAffected: boolean;
    delayRisk: 'low' | 'medium' | 'high';
  };
  profitabilityImpact: {
    originalMargin: number;
    newMargin: number;
    marginChange: number;
    profitImpact: number;
  };
  riskFactors: string[];
  recommendations: string[];
}

interface ChangeOrderImpactAnalysisProps {
  projectId: string;
  projectBudget: number;
  currentMargin: number;
}

export const ChangeOrderImpactAnalysis: React.FC<ChangeOrderImpactAnalysisProps> = ({
  projectId,
  projectBudget,
  currentMargin
}) => {
  const [changeOrderData, setChangeOrderData] = useState({
    description: '',
    materialCosts: 0,
    laborHours: 0,
    laborRate: 0,
    equipmentCosts: 0,
    overhead: 0,
    requestedDays: 0
  });
  
  const [impactAnalysis, setImpactAnalysis] = useState<ImpactAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const calculateImpact = async () => {
    setIsAnalyzing(true);
    
    try {
      // Simulate real-time analysis
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const laborCosts = changeOrderData.laborHours * changeOrderData.laborRate;
      const totalCosts = changeOrderData.materialCosts + laborCosts + changeOrderData.equipmentCosts + changeOrderData.overhead;
      
      // Calculate schedule impact
      const scheduleImpact = {
        additionalDays: changeOrderData.requestedDays,
        criticalPathAffected: changeOrderData.requestedDays > 5,
        delayRisk: changeOrderData.requestedDays > 10 ? 'high' as const : 
                   changeOrderData.requestedDays > 5 ? 'medium' as const : 'low' as const
      };
      
      // Calculate profitability impact
      const newProjectTotal = projectBudget + totalCosts;
      const originalProfit = projectBudget * (currentMargin / 100);
      const newMargin = ((newProjectTotal - (projectBudget - originalProfit)) / newProjectTotal) * 100;
      const profitImpact = (newProjectTotal * (newMargin / 100)) - originalProfit;
      
      // Generate risk factors and recommendations
      const riskFactors = [];
      const recommendations = [];
      
      if (totalCosts > projectBudget * 0.1) {
        riskFactors.push('Large cost increase (>10% of original budget)');
        recommendations.push('Consider phased implementation to spread costs');
      }
      
      if (scheduleImpact.additionalDays > 7) {
        riskFactors.push('Significant schedule impact');
        recommendations.push('Evaluate resource allocation and overtime costs');
      }
      
      if (newMargin < currentMargin * 0.8) {
        riskFactors.push('Significant profit margin reduction');
        recommendations.push('Negotiate higher change order pricing');
      }
      
      const analysis: ImpactAnalysis = {
        budgetImpact: {
          materialCosts: changeOrderData.materialCosts,
          laborCosts,
          equipmentCosts: changeOrderData.equipmentCosts,
          overhead: changeOrderData.overhead,
          total: totalCosts
        },
        scheduleImpact,
        profitabilityImpact: {
          originalMargin: currentMargin,
          newMargin,
          marginChange: newMargin - currentMargin,
          profitImpact
        },
        riskFactors,
        recommendations
      };
      
      setImpactAnalysis(analysis);
      
      toast({
        title: "Impact Analysis Complete",
        description: "Change order impact analysis has been calculated.",
      });
      
    } catch (error) {
      toast({
        title: "Analysis Error",
        description: "Failed to analyze change order impact.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Change Order Impact Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="description">Change Order Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the change order..."
                value={changeOrderData.description}
                onChange={(e) => setChangeOrderData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="materialCosts">Material Costs ($)</Label>
                  <Input
                    id="materialCosts"
                    type="number"
                    value={changeOrderData.materialCosts}
                    onChange={(e) => setChangeOrderData(prev => ({ ...prev, materialCosts: Number(e.target.value) }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="equipmentCosts">Equipment Costs ($)</Label>
                  <Input
                    id="equipmentCosts"
                    type="number"
                    value={changeOrderData.equipmentCosts}
                    onChange={(e) => setChangeOrderData(prev => ({ ...prev, equipmentCosts: Number(e.target.value) }))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="laborHours">Labor Hours</Label>
                  <Input
                    id="laborHours"
                    type="number"
                    value={changeOrderData.laborHours}
                    onChange={(e) => setChangeOrderData(prev => ({ ...prev, laborHours: Number(e.target.value) }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="laborRate">Labor Rate ($/hr)</Label>
                  <Input
                    id="laborRate"
                    type="number"
                    value={changeOrderData.laborRate}
                    onChange={(e) => setChangeOrderData(prev => ({ ...prev, laborRate: Number(e.target.value) }))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="overhead">Overhead ($)</Label>
                  <Input
                    id="overhead"
                    type="number"
                    value={changeOrderData.overhead}
                    onChange={(e) => setChangeOrderData(prev => ({ ...prev, overhead: Number(e.target.value) }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="requestedDays">Additional Days</Label>
                  <Input
                    id="requestedDays"
                    type="number"
                    value={changeOrderData.requestedDays}
                    onChange={(e) => setChangeOrderData(prev => ({ ...prev, requestedDays: Number(e.target.value) }))}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <Button 
            onClick={calculateImpact} 
            disabled={isAnalyzing}
            className="w-full"
          >
            {isAnalyzing ? 'Analyzing Impact...' : 'Calculate Impact'}
          </Button>
        </CardContent>
      </Card>

      {impactAnalysis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Budget Impact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Budget Impact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Material Costs:</span>
                  <span>${impactAnalysis.budgetImpact.materialCosts.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Labor Costs:</span>
                  <span>${impactAnalysis.budgetImpact.laborCosts.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Equipment Costs:</span>
                  <span>${impactAnalysis.budgetImpact.equipmentCosts.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Overhead:</span>
                  <span>${impactAnalysis.budgetImpact.overhead.toLocaleString()}</span>
                </div>
                <hr />
                <div className="flex justify-between font-semibold">
                  <span>Total Impact:</span>
                  <span>${impactAnalysis.budgetImpact.total.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule Impact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Schedule Impact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Additional Days:</span>
                  <span>{impactAnalysis.scheduleImpact.additionalDays}</span>
                </div>
                <div className="flex justify-between">
                  <span>Critical Path Affected:</span>
                  <Badge variant={impactAnalysis.scheduleImpact.criticalPathAffected ? "destructive" : "default"}>
                    {impactAnalysis.scheduleImpact.criticalPathAffected ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Delay Risk:</span>
                  <Badge variant={getRiskBadgeVariant(impactAnalysis.scheduleImpact.delayRisk)}>
                    {impactAnalysis.scheduleImpact.delayRisk.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profitability Impact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {impactAnalysis.profitabilityImpact.marginChange >= 0 ? 
                  <TrendingUp className="h-5 w-5 text-green-500" /> : 
                  <TrendingDown className="h-5 w-5 text-red-500" />
                }
                Profitability Impact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Original Margin:</span>
                  <span>{impactAnalysis.profitabilityImpact.originalMargin.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>New Margin:</span>
                  <span className={impactAnalysis.profitabilityImpact.marginChange >= 0 ? "text-green-600" : "text-red-600"}>
                    {impactAnalysis.profitabilityImpact.newMargin.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Margin Change:</span>
                  <span className={impactAnalysis.profitabilityImpact.marginChange >= 0 ? "text-green-600" : "text-red-600"}>
                    {impactAnalysis.profitabilityImpact.marginChange >= 0 ? "+" : ""}
                    {impactAnalysis.profitabilityImpact.marginChange.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Profit Impact:</span>
                  <span className={impactAnalysis.profitabilityImpact.profitImpact >= 0 ? "text-green-600" : "text-red-600"}>
                    {impactAnalysis.profitabilityImpact.profitImpact >= 0 ? "+" : ""}
                    ${impactAnalysis.profitabilityImpact.profitImpact.toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Factors & Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Risk Analysis & Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {impactAnalysis.riskFactors.length > 0 && (
                <div>
                  <h4 className="font-semibold text-red-600 mb-2">Risk Factors:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {impactAnalysis.riskFactors.map((risk, index) => (
                      <li key={index}>{risk}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {impactAnalysis.recommendations.length > 0 && (
                <div>
                  <h4 className="font-semibold text-blue-600 mb-2">Recommendations:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {impactAnalysis.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {impactAnalysis.riskFactors.length === 0 && impactAnalysis.recommendations.length === 0 && (
                <p className="text-green-600 text-sm">No significant risks identified. Change order appears manageable.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};