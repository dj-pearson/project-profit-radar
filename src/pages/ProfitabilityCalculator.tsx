/**
 * Profitability Calculator Page
 * Free lead magnet tool for BuildDesk.com
 */

import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calculator, TrendingUp, AlertTriangle, Download, Lightbulb, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

// Components
import { ProfitGauge } from '@/components/calculator/ProfitGauge';
import { CostBreakdownChart } from '@/components/calculator/CostBreakdownChart';
import { EmailCaptureModal } from '@/components/calculator/EmailCaptureModal';
import { SocialShare } from '@/components/calculator/SocialShare';
import { UpgradeCTA } from '@/components/calculator/UpgradeCTA';

// Utils
import {
  PROJECT_TYPES,
  calculateProfitability,
  formatCurrency,
  formatPercentage,
  validateInputs,
  generateSessionId,
  type CalculatorInputs,
  type CalculatorResults
} from '@/lib/profitabilityCalculations';

import {
  initializeSession,
  trackPageView,
  trackFormStart,
  trackCalculation,
  trackEmailCapture,
  trackPDFDownload,
  trackSocialShare,
  trackTrialClick,
  trackTimeOnPage
} from '@/lib/calculatorAnalytics';

import { generateAndDownloadPDF } from '@/lib/pdfGenerator';

export default function ProfitabilityCalculator() {
  // Session tracking
  const [sessionId] = useState(() => generateSessionId());
  const [startTime] = useState(() => Date.now());
  const [hasInteracted, setHasInteracted] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [calculationCount, setCalculationCount] = useState(0);

  // Form inputs
  const [projectType, setProjectType] = useState('');
  const [laborHours, setLaborHours] = useState('');
  const [materialCost, setMaterialCost] = useState('');
  const [crewSize, setCrewSize] = useState('');
  const [projectDuration, setProjectDuration] = useState('');

  // Results
  const [results, setResults] = useState<CalculatorResults | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Modals
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Initialize analytics
  useEffect(() => {
    initializeSession(sessionId);
    trackPageView(sessionId);

    // Track time on page when leaving
    const handleBeforeUnload = () => {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      trackTimeOnPage(sessionId, duration);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessionId, startTime]);

  // Track first interaction
  const handleFirstInteraction = (fieldName: string) => {
    if (!hasInteracted) {
      setHasInteracted(true);
      trackFormStart(sessionId, fieldName);
    }
  };

  // Handle calculation
  const handleCalculate = () => {
    const inputs: Partial<CalculatorInputs> = {
      projectType,
      laborHours: parseFloat(laborHours),
      materialCost: parseFloat(materialCost),
      crewSize: parseInt(crewSize),
      projectDuration: parseInt(projectDuration)
    };

    // Validate inputs
    const validation = validateInputs(inputs);
    if (!validation.valid) {
      setErrors(validation.errors);
      toast.error('Please fix the errors in the form');
      return;
    }

    setErrors({});

    // Calculate profitability
    const calculatorResults = calculateProfitability(inputs as CalculatorInputs);
    setResults(calculatorResults);

    // Track calculation
    trackCalculation(sessionId, inputs, calculatorResults, leadId || undefined);

    const newCount = calculationCount + 1;
    setCalculationCount(newCount);

    // Show email modal after first calculation (if not already captured)
    if (newCount === 1 && !leadId) {
      setTimeout(() => setShowEmailModal(true), 2000);
    }

    // Scroll to results
    setTimeout(() => {
      document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Handle email capture
  const handleEmailSubmit = async (data: { email: string; companyName?: string; phone?: string }) => {
    const capturedLeadId = await trackEmailCapture(
      sessionId,
      data.email,
      data.companyName,
      data.phone
    );

    if (capturedLeadId) {
      setLeadId(capturedLeadId);
      toast.success('Email captured! Downloading your report...');

      // Auto-download PDF
      if (results) {
        await handlePDFDownload();
      }
    }
  };

  // Handle PDF download
  const handlePDFDownload = async () => {
    if (!results) return;

    try {
      if (!leadId) {
        // Show email modal if not captured yet
        setShowEmailModal(true);
        return;
      }

      await generateAndDownloadPDF(
        {
          projectType,
          laborHours: parseFloat(laborHours),
          materialCost: parseFloat(materialCost),
          crewSize: parseInt(crewSize),
          projectDuration: parseInt(projectDuration)
        },
        results
      );

      trackPDFDownload(sessionId, leadId);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      toast.error('Failed to generate PDF');
    }
  };

  // Handle social share
  const handleSocialShare = (platform: string) => {
    trackSocialShare(sessionId, platform, leadId || undefined);
    toast.success('Thanks for sharing!');
  };

  // Handle trial click
  const handleTrialClick = () => {
    trackTrialClick(sessionId, leadId || undefined);
  };

  return (
    <>
      <Helmet>
        <title>Free Construction Profitability Calculator - BuildDesk</title>
        <meta name="description" content="Calculate project profit margins instantly. Free tool for contractors to validate bids and protect profits. No signup required." />
        <meta name="keywords" content="construction profit calculator, contractor profitability tool, construction bid calculator, estimate profit margin calculator" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Calculator className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    BuildDesk
                  </h1>
                  <p className="text-sm text-gray-600">Profitability Calculator</p>
                </div>
              </div>
              <Button variant="outline" onClick={handleTrialClick} asChild>
                <a href="/auth?mode=signup">
                  Start Free Trial
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold mb-4">
              Free Construction Profitability Calculator
            </h2>
            <p className="text-xl text-blue-100 mb-2">
              Validate Your Bids in 2 Minutes
            </p>
            <p className="text-blue-200">
              Know if a project is worth bidding before you invest hours in detailed estimates
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Input Form */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    Project Information
                  </CardTitle>
                  <CardDescription>
                    Enter your project details to calculate profitability
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Project Type */}
                  <div>
                    <Label htmlFor="projectType">
                      Project Type <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={projectType}
                      onValueChange={(value) => {
                        setProjectType(value);
                        handleFirstInteraction('projectType');
                      }}
                    >
                      <SelectTrigger id="projectType" className={errors.projectType ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select project type" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROJECT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.projectType && (
                      <p className="text-sm text-red-500 mt-1">{errors.projectType}</p>
                    )}
                  </div>

                  {/* Labor Hours */}
                  <div>
                    <Label htmlFor="laborHours">
                      Estimated Labor Hours <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="laborHours"
                      type="number"
                      placeholder="e.g., 160"
                      value={laborHours}
                      onChange={(e) => {
                        setLaborHours(e.target.value);
                        handleFirstInteraction('laborHours');
                      }}
                      className={errors.laborHours ? 'border-red-500' : ''}
                    />
                    {errors.laborHours && (
                      <p className="text-sm text-red-500 mt-1">{errors.laborHours}</p>
                    )}
                  </div>

                  {/* Material Cost */}
                  <div>
                    <Label htmlFor="materialCost">
                      Material Cost Estimate <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="materialCost"
                      type="number"
                      placeholder="e.g., 15000"
                      value={materialCost}
                      onChange={(e) => {
                        setMaterialCost(e.target.value);
                        handleFirstInteraction('materialCost');
                      }}
                      className={errors.materialCost ? 'border-red-500' : ''}
                    />
                    {errors.materialCost && (
                      <p className="text-sm text-red-500 mt-1">{errors.materialCost}</p>
                    )}
                  </div>

                  {/* Crew Size */}
                  <div>
                    <Label htmlFor="crewSize">
                      Crew Size <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="crewSize"
                      type="number"
                      placeholder="e.g., 4"
                      value={crewSize}
                      onChange={(e) => {
                        setCrewSize(e.target.value);
                        handleFirstInteraction('crewSize');
                      }}
                      className={errors.crewSize ? 'border-red-500' : ''}
                    />
                    {errors.crewSize && (
                      <p className="text-sm text-red-500 mt-1">{errors.crewSize}</p>
                    )}
                  </div>

                  {/* Project Duration */}
                  <div>
                    <Label htmlFor="projectDuration">
                      Project Duration (days) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="projectDuration"
                      type="number"
                      placeholder="e.g., 14"
                      value={projectDuration}
                      onChange={(e) => {
                        setProjectDuration(e.target.value);
                        handleFirstInteraction('projectDuration');
                      }}
                      className={errors.projectDuration ? 'border-red-500' : ''}
                    />
                    {errors.projectDuration && (
                      <p className="text-sm text-red-500 mt-1">{errors.projectDuration}</p>
                    )}
                  </div>

                  <Button
                    onClick={handleCalculate}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
                    size="lg"
                  >
                    <Calculator className="w-5 h-5 mr-2" />
                    Calculate Profitability
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Results */}
            <div id="results">
              {results ? (
                <div className="space-y-6">
                  {/* Profit Gauge */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Profit Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ProfitGauge margin={results.profitMargin} />

                      <div className="grid grid-cols-2 gap-4 mt-6">
                        <div className="bg-green-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600 mb-1">Recommended Bid</p>
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(results.recommendedBid)}
                          </p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-sm text-gray-600 mb-1">Profit Amount</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {formatCurrency(results.profitAmount)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Break-Even:</span>
                          <span className="font-semibold">{formatCurrency(results.breakEvenAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Hourly Rate:</span>
                          <span className="font-semibold">{formatCurrency(results.hourlyRate)}/hr</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Material/Labor Ratio:</span>
                          <span className="font-semibold">{results.materialToLaborRatio.toFixed(2)}</span>
                        </div>
                      </div>

                      {leadId && (
                        <Button
                          onClick={handlePDFDownload}
                          variant="outline"
                          className="w-full mt-4"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download Full Report (PDF)
                        </Button>
                      )}
                    </CardContent>
                  </Card>

                  {/* Cost Breakdown Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Cost Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CostBreakdownChart breakdown={results.costBreakdown} />
                    </CardContent>
                  </Card>

                  {/* Benchmark Comparison */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Industry Benchmark</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Industry Average:</span>
                          <span className="font-semibold">
                            {formatPercentage(results.benchmarkComparison.industryAvgMargin)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Your Margin:</span>
                          <span className="font-semibold text-blue-600">
                            {formatPercentage(results.benchmarkComparison.yourMargin)}
                          </span>
                        </div>
                        <div className="pt-3 border-t">
                          <p className="text-sm font-medium text-gray-900">
                            {results.benchmarkComparison.performanceLevel}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Warnings */}
                  {results.warnings.length > 0 && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <ul className="list-disc list-inside space-y-1">
                          {results.warnings.map((warning, index) => (
                            <li key={index}>{warning}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Recommendations */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="w-5 h-5" />
                        Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {results.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <span className="text-blue-600 font-semibold flex-shrink-0">
                              {index + 1}.
                            </span>
                            <span className="text-gray-700">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Upgrade CTA */}
                  <UpgradeCTA onTrialClick={handleTrialClick} compact />

                  {/* Social Share */}
                  <SocialShare onShare={handleSocialShare} />
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Calculator className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">
                      Enter your project details and click "Calculate Profitability" to see results
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Full Upgrade Section */}
          {results && (
            <div className="mt-12">
              <UpgradeCTA onTrialClick={handleTrialClick} />
            </div>
          )}
        </div>

        {/* Email Capture Modal */}
        <EmailCaptureModal
          open={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          onSubmit={handleEmailSubmit}
          calculationCount={calculationCount}
        />
      </div>
    </>
  );
}
