import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, DollarSign, Clock, TrendingUp, Calculator, AlertTriangle, ArrowRight, Download, BarChart3, PieChart, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PageSEO, createArticleSchema, createBreadcrumbSchema, createHowToSchema } from '@/components/seo/PageSEO';
import { GEOOptimizedFAQ, jobCostingFAQs } from '@/components/seo/GEOOptimizedFAQ';
import AISearchOptimization from '@/components/AISearchOptimization';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const JobCostingSoftwareDetailed = () => {
  // FAQ data for schema markup and AI optimization
  const faqData = [
    {
      question: "What is job costing software for construction?",
      answer: "Job costing software tracks all costs associated with construction projects in real-time, including labor, materials, equipment, and overhead. It helps contractors understand project profitability, identify cost overruns early, and make data-driven decisions to improve margins."
    },
    {
      question: "How does BuildDesk's job costing compare to other construction software?",
      answer: "BuildDesk offers real-time job costing with automatic cost allocation, integrated time tracking, and native QuickBooks synchronization. Unlike basic job costing tools, BuildDesk provides detailed variance reporting, profit margin analysis, and predictive cost forecasting to help contractors maximize profitability."
    },
    {
      question: "Can job costing software integrate with QuickBooks?",
      answer: "Yes, BuildDesk has native QuickBooks integration that automatically syncs job costs, invoices, and financial data in real-time. This eliminates double data entry and ensures your job costing data matches your accounting records perfectly."
    },
    {
      question: "What's the ROI of using construction job costing software?",
      answer: "Most contractors see 15-25% improvement in project profitability within 6 months of implementing job costing software. BuildDesk customers typically save $50,000+ annually through better cost control, reduced waste, and improved project margins."
    },
    {
      question: "How accurate is real-time job costing?",
      answer: "BuildDesk's real-time job costing is 95%+ accurate because it automatically captures labor hours, material receipts, and equipment usage as they occur. This eliminates estimation errors and provides contractors with up-to-the-minute project profitability data."
    }
  ];

  // Job costing features and benefits
  const features = [
    {
      title: "Real-Time Cost Tracking",
      description: "Track labor, materials, and equipment costs as they happen",
      icon: Clock,
      benefits: [
        "Automatic time tracking and labor cost allocation",
        "Material receipt scanning and cost capture",
        "Equipment usage tracking and rental cost allocation",
        "Real-time project profitability updates"
      ]
    },
    {
      title: "Advanced Cost Analysis",
      description: "Detailed reporting and variance analysis for better decision making",
      icon: BarChart3,
      benefits: [
        "Budget vs actual cost reporting",
        "Variance analysis by cost category",
        "Profit margin tracking by project phase",
        "Cost trend analysis and forecasting"
      ]
    },
    {
      title: "Integrated Financial Management",
      description: "Seamless integration with accounting systems and financial workflows",
      icon: DollarSign,
      benefits: [
        "Native QuickBooks integration",
        "Automated invoice generation",
        "Accounts payable/receivable tracking",
        "Cash flow management and forecasting"
      ]
    },
    {
      title: "Predictive Cost Forecasting",
      description: "AI-powered predictions to prevent cost overruns before they happen",
      icon: TrendingUp,
      benefits: [
        "Early warning alerts for budget overruns",
        "Completion cost forecasting",
        "Resource allocation optimization",
        "Profitability trend predictions"
      ]
    }
  ];

  // Cost overrun statistics
  const costOverrunStats = [
    { category: "Labor Overruns", percentage: 68, impact: "$15,000 avg per project" },
    { category: "Material Waste", percentage: 45, impact: "$8,500 avg per project" },
    { category: "Equipment Overruns", percentage: 32, impact: "$5,200 avg per project" },
    { category: "Change Order Issues", percentage: 58, impact: "$12,300 avg per project" }
  ];

  // ROI calculation data
  const roiData = {
    averageProjectValue: 500000,
    typicalProfitMargin: 8,
    improvedMarginWithJobCosting: 12,
    monthlyProjects: 3,
    annualSavings: 0
  };

  // Calculate annual savings
  roiData.annualSavings = (
    roiData.averageProjectValue * 
    (roiData.improvedMarginWithJobCosting - roiData.typicalProfitMargin) / 100 * 
    roiData.monthlyProjects * 12
  );

  // Customer success stories
  const successStories = [
    {
      company: "Heritage Construction",
      owner: "Tom Bradley",
      location: "Nashville, TN",
      projectSize: "$2M-$5M",
      improvement: "Increased profit margins from 6% to 14%",
      savings: "$180,000 annually",
      quote: "BuildDesk's job costing showed us exactly where we were losing money. We identified $15K in waste per project and our margins improved dramatically.",
      beforeAfter: {
        before: { margin: 6, visibility: "Monthly estimates" },
        after: { margin: 14, visibility: "Real-time tracking" }
      }
    },
    {
      company: "Precision Contractors",
      owner: "Maria Santos",
      location: "Phoenix, AZ",
      projectSize: "$500K-$2M",
      improvement: "Reduced cost overruns by 75%",
      savings: "$125,000 annually",
      quote: "The real-time alerts prevented three major cost overruns in our first month. The software paid for itself immediately.",
      beforeAfter: {
        before: { margin: 9, visibility: "End-of-project reporting" },
        after: { margin: 15, visibility: "Daily cost updates" }
      }
    },
    {
      company: "Metro Commercial Building",
      owner: "James Wilson",
      location: "Atlanta, GA",
      projectSize: "$1M-$8M",
      improvement: "Improved project profitability by 85%",
      savings: "$250,000 annually",
      quote: "We can now track profitability by phase and make adjustments before it's too late. Game-changing visibility into our costs.",
      beforeAfter: {
        before: { margin: 7, visibility: "Quarterly reviews" },
        after: { margin: 13, visibility: "Hourly cost tracking" }
      }
    }
  ];

  // Create schemas for SEO
  const articleSchema = createArticleSchema(
    "Best Construction Job Costing Software 2025 - Complete Buyer's Guide",
    "Comprehensive guide to construction job costing software, featuring real-time cost tracking, ROI calculations, and comparison of top solutions.",
    "2025-01-12",
    "2025-11-07"
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: "Home", url: "https://builddesk.com" },
    { name: "Job Costing Software", url: "https://builddesk.com/job-costing-software" }
  ]);

  const howToSchema = createHowToSchema(
    "How to Implement Job Costing Software",
    [
      { name: "Set Up Cost Codes", text: "Create standardized cost codes for labor, materials, equipment, and overhead categories." },
      { name: "Configure Project Budgets", text: "Enter estimated costs for each project phase and cost category." },
      { name: "Track Costs in Real-Time", text: "Use mobile apps to capture time entries, material receipts, and equipment usage as they occur." },
      { name: "Monitor Budget vs Actual", text: "Review daily reports comparing actual costs to budgets and identify variances early." },
      { name: "Analyze Profitability", text: "Generate profit margin reports and use insights to improve future project estimates." }
    ]
  );

  return (
    <>
      {/* Enhanced SEO with PageSEO Component */}
      <PageSEO
        title="Job Costing Software for Construction - Real-Time Cost Tracking | BuildDesk"
        description="Construction job costing software with real-time cost tracking, QuickBooks integration, and predictive analytics. Improve profit margins 15-25%. $350/month. Track labor, materials, equipment costs automatically. See ROI calculator."
        keywords={[
          'job costing software construction',
          'construction job costing software',
          'real-time job costing',
          'construction cost tracking software',
          'job costing software',
          'construction project costing',
          'best job costing software',
          'job costing with quickbooks',
          'construction financial management software',
          'contractor job costing'
        ]}
        canonicalUrl="/job-costing-software"
        schema={[articleSchema, breadcrumbSchema, howToSchema]}
        ogType="article"
        articlePublishDate="2025-01-12"
        lastModified="2025-11-07"
      />

      <div className="min-h-screen bg-gradient-to-br from-construction-light via-white to-construction-light/30">
        <Header />
        
        <main className="container mx-auto px-4 py-8">
          {/* Hero Section */}
          <div className="max-w-4xl mx-auto text-center mb-12">
            <Badge variant="secondary" className="mb-4">
              Job Costing Software Guide
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-construction-dark mb-6">
              Best Construction Job Costing Software 2025
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Stop losing money on projects. Real-time job costing software helps contractors improve profit margins by 15-25% through accurate cost tracking, early warning alerts, and predictive analytics.
            </p>
            
            {/* Key Statistics */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-700">25%</p>
                  <p className="text-sm text-green-600">Average Margin Improvement</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4 text-center">
                  <DollarSign className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-700">$50K+</p>
                  <p className="text-sm text-blue-600">Annual Savings Typical</p>
                </CardContent>
              </Card>
              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="p-4 text-center">
                  <Clock className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-orange-700">Real-Time</p>
                  <p className="text-sm text-orange-600">Cost Visibility</p>
                </CardContent>
              </Card>
            </div>

            {/* Primary CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-construction-orange hover:bg-construction-orange/90">
                Start Free Job Costing Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline">
                Calculate Your ROI
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              ✓ No Credit Card Required ✓ Real-Time Cost Tracking ✓ QuickBooks Integration
            </p>
          </div>

          {/* The Cost of Poor Job Costing */}
          <div className="max-w-5xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-construction-dark text-center mb-8">
              The Hidden Cost of Poor Job Costing
            </h2>
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <Card className="border-red-200 bg-red-50/50">
                <CardHeader>
                  <CardTitle className="text-red-700 flex items-center">
                    <AlertTriangle className="mr-2 h-5 w-5" />
                    Industry Cost Overrun Statistics
                  </CardTitle>
                  <CardDescription>
                    How contractors lose money without proper job costing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {costOverrunStats.map((stat, index) => (
                      <div key={index}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">{stat.category}</span>
                          <span className="text-sm text-red-600">{stat.percentage}% of projects</span>
                        </div>
                        <Progress value={stat.percentage} className="h-2 mb-1" />
                        <p className="text-xs text-muted-foreground">{stat.impact}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50/50">
                <CardHeader>
                  <CardTitle className="text-green-700 flex items-center">
                    <Target className="mr-2 h-5 w-5" />
                    With Proper Job Costing Software
                  </CardTitle>
                  <CardDescription>
                    How real-time tracking prevents cost overruns
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
                      <div>
                        <p className="font-medium">Early Warning Alerts</p>
                        <p className="text-sm text-muted-foreground">Get notified when costs approach budget limits</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
                      <div>
                        <p className="font-medium">Real-Time Visibility</p>
                        <p className="text-sm text-muted-foreground">See exact project profitability at any moment</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
                      <div>
                        <p className="font-medium">Predictive Analytics</p>
                        <p className="text-sm text-muted-foreground">Forecast completion costs before overruns occur</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
                      <div>
                        <p className="font-medium">Automated Cost Capture</p>
                        <p className="text-sm text-muted-foreground">Eliminate manual data entry and human errors</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Key Features */}
          <div className="max-w-5xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-construction-dark text-center mb-8">
              Essential Job Costing Software Features
            </h2>
            <div className="grid lg:grid-cols-2 gap-8">
              {features.map((feature, index) => {
                const IconComponent = feature.icon;
                return (
                  <Card key={index} className="h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center text-construction-blue">
                        <IconComponent className="mr-3 h-6 w-6" />
                        {feature.title}
                      </CardTitle>
                      <CardDescription className="text-base">
                        {feature.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {feature.benefits.map((benefit, benefitIndex) => (
                          <li key={benefitIndex} className="flex items-start">
                            <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-700">{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* ROI Calculator */}
          <div className="max-w-4xl mx-auto mb-16">
            <Card className="bg-gradient-to-r from-construction-blue to-construction-orange text-white">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl mb-2">Job Costing Software ROI Calculator</CardTitle>
                <CardDescription className="text-blue-100">
                  See how much you could save with better job costing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-8 mb-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Current Situation</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Average Project Value:</span>
                        <span>${roiData.averageProjectValue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Current Profit Margin:</span>
                        <span>{roiData.typicalProfitMargin}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Monthly Projects:</span>
                        <span>{roiData.monthlyProjects}</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-2">
                        <span>Annual Profit:</span>
                        <span>${((roiData.averageProjectValue * roiData.typicalProfitMargin / 100) * roiData.monthlyProjects * 12).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">With Job Costing Software</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Average Project Value:</span>
                        <span>${roiData.averageProjectValue.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Improved Profit Margin:</span>
                        <span>{roiData.improvedMarginWithJobCosting}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Monthly Projects:</span>
                        <span>{roiData.monthlyProjects}</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-2">
                        <span>Annual Profit:</span>
                        <span>${((roiData.averageProjectValue * roiData.improvedMarginWithJobCosting / 100) * roiData.monthlyProjects * 12).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="bg-white/10 rounded-lg p-4 mb-6">
                    <p className="text-2xl font-bold">Annual Savings: ${roiData.annualSavings.toLocaleString()}</p>
                    <p className="text-lg">ROI: {Math.round((roiData.annualSavings / (149 * 12)) * 100)}% return on investment</p>
                  </div>
                  <Button size="lg" variant="secondary" className="bg-white text-construction-blue hover:bg-gray-100">
                    <Calculator className="mr-2 h-4 w-4" />
                    Calculate Your Custom ROI
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Customer Success Stories */}
          <div className="max-w-5xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-construction-dark text-center mb-8">
              Real Results from Real Contractors
            </h2>
            <div className="grid lg:grid-cols-3 gap-8">
              {successStories.map((story, index) => (
                <Card key={index} className="h-full">
                  <CardHeader>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <CardTitle className="text-lg">{story.company}</CardTitle>
                        <CardDescription>{story.owner}</CardDescription>
                        <p className="text-sm text-muted-foreground">{story.location}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {story.projectSize}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Before:</span>
                        <span className="text-red-600">{story.beforeAfter.before.margin}% margin</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>After:</span>
                        <span className="text-green-600">{story.beforeAfter.after.margin}% margin</span>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-construction-blue">{story.savings}</p>
                        <p className="text-xs text-muted-foreground">in savings</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <blockquote className="text-sm italic text-gray-700 mb-4">
                      "{story.quote}"
                    </blockquote>
                    <div className="text-xs text-muted-foreground">
                      <p><strong>Improvement:</strong> {story.improvement}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* BuildDesk Job Costing Features */}
          <div className="max-w-4xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-construction-dark text-center mb-8">
              Why Choose BuildDesk for Job Costing?
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-construction-blue text-white rounded-lg flex items-center justify-center mr-4">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Real-Time Cost Tracking</h3>
                    <p className="text-muted-foreground">Automatic labor, material, and equipment cost capture with instant profitability updates.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-construction-blue text-white rounded-lg flex items-center justify-center mr-4">
                    <DollarSign className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">QuickBooks Integration</h3>
                    <p className="text-muted-foreground">Native integration eliminates double data entry and ensures perfect financial accuracy.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-construction-blue text-white rounded-lg flex items-center justify-center mr-4">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Predictive Analytics</h3>
                    <p className="text-muted-foreground">AI-powered forecasting prevents cost overruns before they happen.</p>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-construction-blue text-white rounded-lg flex items-center justify-center mr-4">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Advanced Reporting</h3>
                    <p className="text-muted-foreground">Detailed cost analysis, variance reporting, and profitability insights by project phase.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-construction-blue text-white rounded-lg flex items-center justify-center mr-4">
                    <PieChart className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Cost Category Tracking</h3>
                    <p className="text-muted-foreground">Detailed breakdown by labor, materials, equipment, and overhead with automatic allocation.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-construction-blue text-white rounded-lg flex items-center justify-center mr-4">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Budget Alert System</h3>
                    <p className="text-muted-foreground">Automated alerts when costs approach budget limits, preventing overruns.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Search Optimization */}
          <div className="max-w-4xl mx-auto mb-16">
            <AISearchOptimization page="features" primaryKeyword="job costing software construction" />
          </div>

          {/* GEO-Optimized FAQ Section */}
          <div className="max-w-4xl mx-auto mb-16">
            <GEOOptimizedFAQ
              faqs={jobCostingFAQs}
              title="Construction Job Costing Software: Frequently Asked Questions"
              description="Get answers to common questions about job costing software for construction contractors"
            />
          </div>

          {/* Final CTA Section */}
          <div className="max-w-4xl mx-auto text-center">
            <Card className="bg-construction-light border-construction-blue">
              <CardContent className="p-8">
                <h2 className="text-3xl font-bold text-construction-dark mb-4">
                  Start Improving Your Project Margins Today
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Join contractors who've improved their profit margins by 15-25% with BuildDesk's 
                  real-time job costing. See the difference accurate cost tracking makes.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
                  <Button size="lg" className="bg-construction-orange hover:bg-construction-orange/90">
                    Start Free Job Costing Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button size="lg" variant="outline">
                    Schedule Job Costing Demo
                  </Button>
                </div>

                <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-muted-foreground">
                  <span>✓ No Credit Card Required</span>
                  <span>✓ Real-Time Cost Tracking</span>
                  <span>✓ QuickBooks Integration</span>
                  <span>✓ Predictive Analytics</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default JobCostingSoftwareDetailed;
