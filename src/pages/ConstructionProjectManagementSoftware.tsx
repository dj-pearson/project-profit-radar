import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Clock, Calendar, AlertTriangle, TrendingUp, ArrowRight, Download, Users, Zap, Target, BarChart3, Layers, Shield, DollarSign, FileText, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SEOMetaTags } from '@/components/SEOMetaTags';
import AISearchOptimization from '@/components/AISearchOptimization';
import { ArticleSchema, FAQSchema } from '@/components/EnhancedSchemaMarkup';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const ConstructionProjectManagementSoftware = () => {
  // FAQ data for schema markup and AI optimization
  const faqData = [
    {
      question: "What is construction project management software?",
      answer: "Construction project management software is a comprehensive platform that helps contractors manage all aspects of construction projects including scheduling, budgeting, document management, team communication, and progress tracking. It centralizes project data and streamlines workflows for better efficiency and profitability."
    },
    {
      question: "How much does construction project management software cost?",
      answer: "Construction project management software typically costs $30-150 per user per month. BuildDesk offers competitive pricing starting at $49/month for small contractors, with enterprise plans for larger operations. The ROI typically pays for itself within 2-3 months through improved efficiency."
    },
    {
      question: "What features should I look for in construction project management software?",
      answer: "Essential features include project scheduling (Gantt charts), budget tracking, document management, mobile access, team communication tools, time tracking, change order management, and integration with accounting software like QuickBooks."
    },
    {
      question: "Can construction project management software work offline?",
      answer: "Modern construction project management software like BuildDesk offers offline mobile capabilities, allowing field teams to update progress, capture photos, and log time even without internet. Data syncs automatically when connection is restored."
    },
    {
      question: "How long does it take to implement construction project management software?",
      answer: "Implementation typically takes 1-4 weeks depending on company size and complexity. BuildDesk provides dedicated onboarding support, data migration assistance, and team training to ensure smooth adoption within 2 weeks for most contractors."
    }
  ];

  // Industry statistics and pain points
  const industryStats = [
    {
      stat: "87%",
      description: "of construction projects finish over budget",
      impact: "Poor project management and cost tracking"
    },
    {
      stat: "73%",
      description: "of construction projects finish late",
      impact: "Inadequate scheduling and progress monitoring"
    },
    {
      stat: "41%",
      description: "of project time wasted on admin tasks",
      impact: "Manual processes and disconnected systems"
    },
    {
      stat: "$1.8M",
      description: "average cost of poor project management per year",
      impact: "Delays, rework, and inefficient resource allocation"
    }
  ];

  // Key software categories and features
  const softwareCategories = [
    {
      title: "All-in-One Project Management",
      description: "Complete project lifecycle management from bid to closeout",
      icon: Layers,
      features: [
        "Project scheduling with Gantt charts",
        "Budget tracking and cost management",
        "Document management and file sharing",
        "Team communication and collaboration",
        "Progress tracking and reporting",
        "Integration with accounting systems"
      ],
      bestFor: "General contractors managing multiple projects",
      examples: ["BuildDesk", "Procore", "Buildertrend"]
    },
    {
      title: "Field Management Solutions",
      description: "Mobile-first tools for field teams and daily operations",
      icon: Smartphone,
      features: [
        "Daily reports and progress updates",
        "Photo documentation and markup",
        "Time tracking and crew management",
        "Safety inspections and checklists",
        "Material tracking and inventory",
        "Real-time communication with office"
      ],
      bestFor: "Field supervisors and project managers",
      examples: ["FieldLens", "PlanGrid", "Raken"]
    },
    {
      title: "Financial Management",
      description: "Specialized tools for construction accounting and cost control",
      icon: DollarSign,
      features: [
        "Job costing and profitability analysis",
        "Change order management",
        "Progress billing and invoicing",
        "Cash flow forecasting",
        "Payroll and labor cost tracking",
        "Financial reporting and analytics"
      ],
      bestFor: "Construction CFOs and accounting teams",
      examples: ["Foundation Software", "Sage 300", "Jonas Premier"]
    },
    {
      title: "Document Management",
      description: "Centralized storage and collaboration for project documents",
      icon: FileText,
      features: [
        "Blueprint and plan management",
        "Version control and revision tracking",
        "Digital markup and collaboration",
        "Submittal and RFI management",
        "Contract and specification storage",
        "Mobile document access"
      ],
      bestFor: "Project managers and document controllers",
      examples: ["Box", "Autodesk Construction Cloud", "SharePoint"]
    }
  ];

  // Detailed feature comparison
  const featureComparison = [
    {
      category: "Project Planning",
      features: [
        { name: "Gantt Chart Scheduling", builddesk: true, procore: true, buildertrend: true, basic: false },
        { name: "Resource Allocation", builddesk: true, procore: true, buildertrend: false, basic: false },
        { name: "Critical Path Analysis", builddesk: true, procore: true, buildertrend: false, basic: false },
        { name: "Weather Integration", builddesk: true, procore: false, buildertrend: false, basic: false }
      ]
    },
    {
      category: "Financial Management",
      features: [
        { name: "Budget Tracking", builddesk: true, procore: true, buildertrend: true, basic: true },
        { name: "Cost Forecasting", builddesk: true, procore: true, buildertrend: false, basic: false },
        { name: "Change Order Management", builddesk: true, procore: true, buildertrend: true, basic: false },
        { name: "Profit Margin Analysis", builddesk: true, procore: false, buildertrend: false, basic: false }
      ]
    },
    {
      category: "Team Collaboration",
      features: [
        { name: "Real-time Messaging", builddesk: true, procore: true, buildertrend: true, basic: false },
        { name: "Document Sharing", builddesk: true, procore: true, buildertrend: true, basic: true },
        { name: "Mobile App", builddesk: true, procore: true, buildertrend: true, basic: false },
        { name: "Client Portal", builddesk: true, procore: true, buildertrend: true, basic: false }
      ]
    }
  ];

  // Customer success stories
  const successStories = [
    {
      company: "Pacific Northwest Construction",
      owner: "David Rodriguez",
      location: "Portland, OR",
      projectSize: "$2M-$8M",
      improvement: "Reduced project delays by 78%",
      savings: "$420,000 annually",
      quote: "BuildDesk transformed how we manage projects. The integrated scheduling and budget tracking caught three potential overruns early, saving us over $150K on a single project.",
      metrics: {
        onTimeCompletion: { before: 58, after: 94 },
        budgetAccuracy: { before: 72, after: 96 },
        adminTime: { before: "25 hours/week", after: "8 hours/week" }
      },
      keyFeatures: ["Integrated scheduling", "Real-time budget alerts", "Mobile progress tracking"]
    },
    {
      company: "Sunrise Commercial Builders",
      owner: "Jennifer Park",
      location: "Phoenix, AZ",
      projectSize: "$1M-$5M",
      improvement: "Increased project capacity by 40%",
      savings: "$280,000 annually",
      quote: "The efficiency gains from BuildDesk allowed us to take on 40% more projects with the same team. Our clients love the transparency and real-time updates.",
      metrics: {
        onTimeCompletion: { before: 65, after: 91 },
        budgetAccuracy: { before: 69, after: 93 },
        adminTime: { before: "30 hours/week", after: "12 hours/week" }
      },
      keyFeatures: ["Client portal", "Automated reporting", "Document management"]
    },
    {
      company: "Heritage Construction Group",
      owner: "Mark Thompson",
      location: "Charlotte, NC",
      projectSize: "$500K-$3M",
      improvement: "Improved profit margins by 32%",
      savings: "$195,000 annually",
      quote: "BuildDesk's cost tracking and change order management helped us identify profit leaks we didn't even know existed. Our margins improved dramatically.",
      metrics: {
        onTimeCompletion: { before: 72, after: 89 },
        budgetAccuracy: { before: 74, after: 95 },
        adminTime: { before: "22 hours/week", after: "7 hours/week" }
      },
      keyFeatures: ["Cost analysis", "Change order tracking", "Profitability reports"]
    }
  ];

  // Implementation best practices
  const implementationSteps = [
    {
      step: 1,
      title: "Assess Current Processes",
      description: "Evaluate existing workflows and identify pain points",
      tasks: [
        "Document current project management workflows",
        "Identify bottlenecks and inefficiencies",
        "Survey team members on daily challenges",
        "Analyze historical project performance data"
      ],
      timeline: "Week 1"
    },
    {
      step: 2,
      title: "Select the Right Software",
      description: "Choose a platform that fits your specific needs and budget",
      tasks: [
        "Define must-have features and nice-to-haves",
        "Request demos from top 3-4 vendors",
        "Test mobile apps and user interfaces",
        "Compare pricing and implementation costs"
      ],
      timeline: "Week 2-3"
    },
    {
      step: 3,
      title: "Plan Implementation",
      description: "Develop a rollout strategy and change management plan",
      tasks: [
        "Create implementation timeline and milestones",
        "Identify project champions and early adopters",
        "Plan data migration from existing systems",
        "Schedule training sessions for all users"
      ],
      timeline: "Week 4"
    },
    {
      step: 4,
      title: "Execute Rollout",
      description: "Deploy software with proper training and support",
      tasks: [
        "Migrate historical project data",
        "Conduct comprehensive user training",
        "Start with pilot project for testing",
        "Gather feedback and make adjustments"
      ],
      timeline: "Week 5-8"
    }
  ];

  // ROI Calculator component
  const ROICalculator = () => {
    const [projectCount, setProjectCount] = React.useState(10);
    const [avgProjectValue, setAvgProjectValue] = React.useState(500000);
    const [currentMargin, setCurrentMargin] = React.useState(8);
    
    const annualRevenue = projectCount * avgProjectValue;
    const currentProfit = annualRevenue * (currentMargin / 100);
    const softwareCost = 49 * 12 * Math.ceil(projectCount / 5); // Assuming 1 user per 5 projects
    
    // Conservative improvement estimates
    const marginImprovement = 2.5; // 2.5% margin improvement
    const newMargin = currentMargin + marginImprovement;
    const newProfit = annualRevenue * (newMargin / 100);
    const annualSavings = newProfit - currentProfit - softwareCost;
    const roi = ((annualSavings + softwareCost) / softwareCost) * 100;
    
    return (
      <Card className="bg-gradient-to-br from-construction-blue/5 to-construction-orange/5 border-construction-blue/20">
        <CardHeader>
          <CardTitle className="text-construction-blue">ROI Calculator</CardTitle>
          <CardDescription>See your potential savings with construction project management software</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Projects per year</label>
                <input
                  type="number"
                  value={projectCount}
                  onChange={(e) => setProjectCount(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Average project value</label>
                <input
                  type="number"
                  value={avgProjectValue}
                  onChange={(e) => setAvgProjectValue(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Current profit margin (%)</label>
                <input
                  type="number"
                  value={currentMargin}
                  onChange={(e) => setCurrentMargin(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border">
                <p className="text-sm text-muted-foreground">Annual Revenue</p>
                <p className="text-2xl font-bold text-construction-blue">
                  ${annualRevenue.toLocaleString()}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <p className="text-sm text-muted-foreground">Annual Savings</p>
                <p className="text-2xl font-bold text-green-600">
                  ${annualSavings.toLocaleString()}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border">
                <p className="text-sm text-muted-foreground">ROI</p>
                <p className="text-2xl font-bold text-construction-orange">
                  {roi.toFixed(0)}%
                </p>
              </div>
            </div>
          </div>
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700">
              <strong>Conservative Estimate:</strong> Based on 2.5% profit margin improvement and reduced administrative time. 
              Actual results may vary based on implementation and usage.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      {/* SEO Meta Tags */}
      <SEOMetaTags
        title="Best Construction Project Management Software 2025 - BuildDesk"
        description="Compare the best construction project management software for contractors. Features, pricing, and ROI analysis. Reduce delays by 78% and increase profits."
        keywords={[
          'construction project management software',
          'construction management software',
          'project management for contractors',
          'construction project management',
          'building project management software',
          'construction management platform',
          'contractor project management',
          'construction project tracking software'
        ]}
        canonicalUrl="/construction-project-management-software"
      />

      {/* Schema Markup */}
      <ArticleSchema
        title="Best Construction Project Management Software 2025 - Complete Guide"
        description="Comprehensive guide to construction project management software, featuring comparisons, ROI analysis, and implementation best practices for contractors."
        publishedDate="2025-01-12"
        url="https://build-desk.com/construction-project-management-software"
        keywords={['construction project management software', 'construction management', 'project management for contractors']}
        wordCount={5200}
        readingTime={21}
      />

      <FAQSchema questions={faqData} />

      <div className="min-h-screen bg-gradient-to-br from-construction-light via-white to-construction-light/30">
        <Header />
        
        <main className="container mx-auto px-4 py-8">
          {/* Hero Section */}
          <div className="max-w-4xl mx-auto text-center mb-12">
            <Badge variant="secondary" className="mb-4">
              Ultimate 2025 Guide
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-construction-dark mb-6">
              Best Construction Project Management Software 2025
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Stop losing money to project delays and cost overruns. The right construction project management software helps contractors reduce delays by 78%, improve profit margins by 32%, and increase project capacity by 40%.
            </p>
            
            {/* Key Statistics */}
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-4 text-center">
                  <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-700">87%</p>
                  <p className="text-sm text-red-600">Projects Over Budget</p>
                </CardContent>
              </Card>
              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="p-4 text-center">
                  <Clock className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-orange-700">73%</p>
                  <p className="text-sm text-orange-600">Projects Finish Late</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4 text-center">
                  <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-700">41%</p>
                  <p className="text-sm text-blue-600">Time on Admin Tasks</p>
                </CardContent>
              </Card>
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-700">$1.8M</p>
                  <p className="text-sm text-green-600">Annual PM Costs</p>
                </CardContent>
              </Card>
            </div>

            {/* Primary CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-construction-orange hover:bg-construction-orange/90">
                Start Free BuildDesk Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline">
                Compare All Options
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              ✓ No Credit Card Required ✓ Full Feature Access ✓ Expert Setup Support
            </p>
          </div>

          {/* Industry Problem Overview */}
          <div className="max-w-5xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-construction-dark text-center mb-8">
              Why Construction Projects Fail (And How Software Fixes It)
            </h2>
            <div className="grid lg:grid-cols-2 gap-8">
              {industryStats.map((stat, index) => (
                <Card key={index} className="border-red-200 bg-red-50/50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-4xl font-bold text-red-600">{stat.stat}</div>
                      <AlertTriangle className="h-8 w-8 text-red-500" />
                    </div>
                    <p className="font-semibold text-gray-900 mb-2">{stat.description}</p>
                    <p className="text-sm text-red-600">{stat.impact}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Card className="bg-green-50 border-green-200 inline-block">
                <CardContent className="p-6">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-green-700 mb-2">
                    The Solution: Integrated Project Management
                  </h3>
                  <p className="text-green-600">
                    Modern construction project management software addresses all these issues with 
                    real-time tracking, automated workflows, and data-driven insights.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Software Categories */}
          <div className="max-w-5xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-construction-dark text-center mb-8">
              Types of Construction Project Management Software
            </h2>
            <div className="grid lg:grid-cols-2 gap-8">
              {softwareCategories.map((category, index) => {
                const IconComponent = category.icon;
                return (
                  <Card key={index} className="h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center text-construction-blue">
                        <IconComponent className="mr-3 h-6 w-6" />
                        {category.title}
                      </CardTitle>
                      <CardDescription className="text-base">
                        {category.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold mb-2">Key Features:</h4>
                          <ul className="space-y-1">
                            {category.features.map((feature, featureIndex) => (
                              <li key={featureIndex} className="flex items-start text-sm">
                                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-sm"><strong>Best for:</strong> {category.bestFor}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            <strong>Popular options:</strong> {category.examples.join(", ")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Feature Comparison Table */}
          <div className="max-w-5xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-construction-dark text-center mb-8">
              Feature Comparison: Top Construction PM Software
            </h2>
            <div className="space-y-8">
              {featureComparison.map((category, categoryIndex) => (
                <Card key={categoryIndex}>
                  <CardHeader>
                    <CardTitle className="text-construction-blue">{category.category}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 font-medium">Feature</th>
                            <th className="text-center py-2 font-medium text-construction-blue">BuildDesk</th>
                            <th className="text-center py-2 font-medium">Procore</th>
                            <th className="text-center py-2 font-medium">Buildertrend</th>
                            <th className="text-center py-2 font-medium">Basic Tools</th>
                          </tr>
                        </thead>
                        <tbody>
                          {category.features.map((feature, featureIndex) => (
                            <tr key={featureIndex} className="border-b">
                              <td className="py-3 text-sm">{feature.name}</td>
                              <td className="text-center py-3">
                                {feature.builddesk ? (
                                  <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                              <td className="text-center py-3">
                                {feature.procore ? (
                                  <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                              <td className="text-center py-3">
                                {feature.buildertrend ? (
                                  <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                              <td className="text-center py-3">
                                {feature.basic ? (
                                  <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* ROI Calculator */}
          <div className="max-w-4xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-construction-dark text-center mb-8">
              Calculate Your ROI
            </h2>
            <ROICalculator />
          </div>

          {/* Customer Success Stories */}
          <div className="max-w-5xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-construction-dark text-center mb-8">
              Real Results from Construction Project Management Software
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
                    
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 text-center mb-4">
                      <div className="bg-red-50 p-2 rounded text-xs">
                        <p className="text-muted-foreground">Before</p>
                        <p className="font-bold text-red-600">{story.metrics.onTimeCompletion.before}% on-time</p>
                        <p className="font-bold text-red-600">{story.metrics.budgetAccuracy.before}% on-budget</p>
                      </div>
                      <div className="bg-green-50 p-2 rounded text-xs">
                        <p className="text-muted-foreground">After</p>
                        <p className="font-bold text-green-600">{story.metrics.onTimeCompletion.after}% on-time</p>
                        <p className="font-bold text-green-600">{story.metrics.budgetAccuracy.after}% on-budget</p>
                      </div>
                    </div>
                    
                    <div className="text-center mb-4">
                      <p className="text-lg font-bold text-construction-blue">{story.savings}</p>
                      <p className="text-xs text-muted-foreground">in savings</p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <blockquote className="text-sm italic text-gray-700 mb-4">
                      "{story.quote}"
                    </blockquote>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p><strong>Key Improvement:</strong> {story.improvement}</p>
                      <p><strong>Admin Time:</strong> {story.metrics.adminTime.before} → {story.metrics.adminTime.after}</p>
                      <p><strong>Top Features:</strong> {story.keyFeatures.join(", ")}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Implementation Guide */}
          <div className="max-w-5xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-construction-dark text-center mb-8">
              How to Implement Construction Project Management Software
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {implementationSteps.map((step, index) => (
                <Card key={index} className="h-full">
                  <CardHeader>
                    <div className="flex items-center mb-2">
                      <div className="w-8 h-8 bg-construction-blue text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                        {step.step}
                      </div>
                      <CardTitle className="text-construction-blue">{step.title}</CardTitle>
                    </div>
                    <CardDescription className="text-base">
                      {step.description}
                    </CardDescription>
                    <Badge variant="outline" className="w-fit mt-2">
                      {step.timeline}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {step.tasks.map((task, taskIndex) => (
                        <li key={taskIndex} className="flex items-start">
                          <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{task}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Why Choose BuildDesk */}
          <div className="max-w-4xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-construction-dark text-center mb-8">
              Why BuildDesk is the Smart Choice for Contractors
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-construction-blue text-white rounded-lg flex items-center justify-center mr-4">
                    <Layers className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">All-in-One Platform</h3>
                    <p className="text-muted-foreground">Everything you need in one place: scheduling, budgeting, communication, and reporting.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-construction-blue text-white rounded-lg flex items-center justify-center mr-4">
                    <Smartphone className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Mobile-First Design</h3>
                    <p className="text-muted-foreground">Field teams can update progress, capture photos, and communicate in real-time.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-construction-blue text-white rounded-lg flex items-center justify-center mr-4">
                    <Shield className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Built for Construction</h3>
                    <p className="text-muted-foreground">Industry-specific features like weather integration and trade-specific workflows.</p>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-construction-blue text-white rounded-lg flex items-center justify-center mr-4">
                    <DollarSign className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Transparent Pricing</h3>
                    <p className="text-muted-foreground">No hidden fees or surprise charges. Pay only for what you use with clear ROI tracking.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-construction-blue text-white rounded-lg flex items-center justify-center mr-4">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Expert Support</h3>
                    <p className="text-muted-foreground">Dedicated implementation team and ongoing support from construction industry experts.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-construction-blue text-white rounded-lg flex items-center justify-center mr-4">
                    <Zap className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Quick Implementation</h3>
                    <p className="text-muted-foreground">Get started in days, not months. Most contractors see results within 2 weeks.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Search Optimization */}
          <div className="max-w-4xl mx-auto mb-16">
            <AISearchOptimization page="features" primaryKeyword="construction project management software" />
          </div>

          {/* Final CTA Section */}
          <div className="max-w-4xl mx-auto text-center">
            <Card className="bg-construction-light border-construction-blue">
              <CardContent className="p-8">
                <h2 className="text-3xl font-bold text-construction-dark mb-4">
                  Ready to Transform Your Project Management?
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Join thousands of contractors who've reduced delays by 78% and increased profits by 32% 
                  with BuildDesk's comprehensive project management platform.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
                  <Button size="lg" className="bg-construction-orange hover:bg-construction-orange/90">
                    Start Free 30-Day Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button size="lg" variant="outline">
                    Schedule Live Demo
                  </Button>
                </div>

                <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-muted-foreground">
                  <span>✓ No Credit Card Required</span>
                  <span>✓ Full Feature Access</span>
                  <span>✓ Expert Setup Support</span>
                  <span>✓ 30-Day Money Back Guarantee</span>
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

export default ConstructionProjectManagementSoftware;
