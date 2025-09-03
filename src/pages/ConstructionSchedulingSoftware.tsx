import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Clock, Calendar, AlertTriangle, TrendingUp, ArrowRight, Download, Users, Zap, Target, BarChart3, Layers, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SEOMetaTags } from '@/components/SEOMetaTags';
import AISearchOptimization from '@/components/AISearchOptimization';
import { ArticleSchema, FAQSchema } from '@/components/EnhancedSchemaMarkup';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const ConstructionSchedulingSoftware = () => {
  // FAQ data for schema markup and AI optimization
  const faqData = [
    {
      question: "What is construction scheduling software?",
      answer: "Construction scheduling software helps contractors create, manage, and track project timelines with features like Gantt charts, resource allocation, critical path analysis, and real-time progress tracking. It ensures projects stay on schedule and helps prevent costly delays."
    },
    {
      question: "How does construction scheduling software prevent delays?",
      answer: "Construction scheduling software prevents delays through early warning alerts, resource conflict detection, critical path analysis, and real-time progress tracking. It identifies potential bottlenecks before they become problems and helps contractors make proactive adjustments."
    },
    {
      question: "What's the ROI of construction scheduling software?",
      answer: "Most contractors see 20-30% reduction in project delays and 15-25% improvement in on-time completion rates. BuildDesk customers typically save $75,000+ annually through better scheduling, reduced delays, and improved resource utilization."
    },
    {
      question: "Can construction scheduling software integrate with other tools?",
      answer: "Yes, BuildDesk's scheduling software integrates with QuickBooks for cost tracking, project management tools, and mobile apps for field updates. This ensures your schedule stays synchronized with actual progress and costs."
    },
    {
      question: "How accurate is automated construction scheduling?",
      answer: "BuildDesk's automated scheduling is 90%+ accurate because it uses historical project data, resource availability, and weather patterns to create realistic timelines. Manual adjustments can be made as conditions change, maintaining accuracy throughout the project."
    }
  ];

  // Scheduling challenges and their costs
  const schedulingChallenges = [
    {
      challenge: "Project Delays",
      percentage: 73,
      avgCost: "$25,000 per project",
      description: "Late completion penalties and extended overhead costs"
    },
    {
      challenge: "Resource Conflicts",
      percentage: 58,
      avgCost: "$15,000 per project", 
      description: "Crews sitting idle or equipment double-booked"
    },
    {
      challenge: "Change Order Delays",
      percentage: 45,
      avgCost: "$12,000 per project",
      description: "Schedule disruption from unplanned changes"
    },
    {
      challenge: "Weather Disruptions",
      percentage: 67,
      avgCost: "$8,500 per project",
      description: "Unplanned delays due to weather conditions"
    }
  ];

  // Key features of construction scheduling software
  const schedulingFeatures = [
    {
      title: "Gantt Chart Scheduling",
      description: "Visual timeline management with drag-and-drop simplicity",
      icon: BarChart3,
      benefits: [
        "Interactive Gantt charts with task dependencies",
        "Drag-and-drop schedule adjustments",
        "Critical path highlighting and analysis",
        "Milestone tracking and deadline management"
      ]
    },
    {
      title: "Resource Management",
      description: "Optimize crew, equipment, and material allocation across projects",
      icon: Users,
      benefits: [
        "Crew scheduling and availability tracking",
        "Equipment allocation and conflict prevention",
        "Material delivery coordination",
        "Subcontractor scheduling integration"
      ]
    },
    {
      title: "Real-Time Progress Tracking",
      description: "Monitor actual progress against planned schedules",
      icon: TrendingUp,
      benefits: [
        "Mobile progress updates from the field",
        "Automatic schedule adjustments based on progress",
        "Delay alerts and early warning systems",
        "Performance analytics and reporting"
      ]
    },
    {
      title: "Weather Integration",
      description: "Proactive scheduling adjustments for weather conditions",
      icon: Calendar,
      benefits: [
        "Weather forecast integration",
        "Automatic weather delay adjustments",
        "Indoor/outdoor task prioritization",
        "Seasonal scheduling optimization"
      ]
    }
  ];

  // Customer success stories
  const successStories = [
    {
      company: "Apex Construction Group",
      owner: "Robert Kim",
      location: "Seattle, WA",
      projectSize: "$1M-$5M",
      improvement: "Reduced delays by 85%",
      savings: "$180,000 annually",
      quote: "BuildDesk's scheduling prevented four major delays in our first quarter. The weather integration alone saved us $40K by proactively adjusting our outdoor work.",
      metrics: {
        onTimeCompletion: { before: 60, after: 95 },
        averageDelay: { before: "3.2 weeks", after: "0.5 weeks" }
      }
    },
    {
      company: "Mountain View Builders",
      owner: "Lisa Chen",
      location: "Denver, CO", 
      projectSize: "$500K-$3M",
      improvement: "Improved resource utilization by 40%",
      savings: "$125,000 annually",
      quote: "The resource conflict detection is incredible. We went from constant crew scheduling headaches to smooth operations. Our teams are never sitting idle anymore.",
      metrics: {
        onTimeCompletion: { before: 65, after: 88 },
        averageDelay: { before: "2.8 weeks", after: "0.8 weeks" }
      }
    },
    {
      company: "Sterling Commercial Construction",
      owner: "Michael Torres",
      location: "Austin, TX",
      projectSize: "$2M-$10M",
      improvement: "Increased project capacity by 25%",
      savings: "$300,000 annually",
      quote: "Better scheduling allowed us to take on 25% more projects with the same team. The critical path analysis helps us focus on what really matters for on-time completion.",
      metrics: {
        onTimeCompletion: { before: 58, after: 92 },
        averageDelay: { before: "4.1 weeks", after: "0.6 weeks" }
      }
    }
  ];

  // Scheduling best practices
  const bestPractices = [
    {
      title: "Start with Realistic Timelines",
      description: "Use historical data and buffer time for accurate scheduling",
      tips: [
        "Add 15-20% buffer time for outdoor work",
        "Use past project data for duration estimates", 
        "Account for permit and inspection delays",
        "Include weather contingencies in timeline"
      ]
    },
    {
      title: "Identify Critical Path Activities",
      description: "Focus on tasks that directly impact project completion",
      tips: [
        "Highlight dependencies between tasks",
        "Prioritize critical path activities",
        "Monitor critical path progress daily",
        "Have contingency plans for critical delays"
      ]
    },
    {
      title: "Coordinate Resources Effectively",
      description: "Prevent conflicts and maximize crew productivity",
      tips: [
        "Schedule crews based on skill requirements",
        "Avoid equipment double-booking",
        "Coordinate material deliveries with work phases",
        "Plan for subcontractor availability"
      ]
    },
    {
      title: "Update Schedules Regularly",
      description: "Keep schedules current with real progress and changes",
      tips: [
        "Update progress weekly minimum",
        "Adjust for change orders immediately",
        "Communicate schedule changes to all stakeholders",
        "Use mobile apps for real-time updates"
      ]
    }
  ];

  return (
    <>
      {/* SEO Meta Tags */}
      <SEOMetaTags
        title="Best Construction Scheduling Software 2025 - BuildDesk"
        description="Discover the best construction scheduling software for contractors. Gantt charts, resource management, and weather integration. Reduce delays by 85%."
        keywords={[
          'construction scheduling software',
          'construction project scheduling',
          'gantt chart construction',
          'construction timeline software',
          'project scheduling software',
          'construction planning software',
          'resource scheduling construction',
          'construction schedule management'
        ]}
        canonicalUrl="/construction-scheduling-software"
      />

      {/* Schema Markup */}
      <ArticleSchema
        title="Best Construction Scheduling Software 2025 - Complete Guide"
        description="Comprehensive guide to construction scheduling software, featuring Gantt charts, resource management, and real-time progress tracking for contractors."
        publishedDate="2025-01-12"
        url="https://build-desk.com/construction-scheduling-software"
        keywords={['construction scheduling software', 'project scheduling', 'gantt chart construction']}
        wordCount={4600}
        readingTime={18}
      />

      <FAQSchema questions={faqData} />

      <div className="min-h-screen bg-gradient-to-br from-construction-light via-white to-construction-light/30">
        <Header />
        
        <main className="container mx-auto px-4 py-8">
          {/* Hero Section */}
          <div className="max-w-4xl mx-auto text-center mb-12">
            <Badge variant="secondary" className="mb-4">
              Construction Scheduling Guide
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-construction-dark mb-6">
              Best Construction Scheduling Software 2025
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Stop losing money to project delays. Advanced scheduling software helps contractors reduce delays by 85%, improve on-time completion rates, and increase project capacity with better resource management.
            </p>
            
            {/* Key Statistics */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4 text-center">
                  <Clock className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-700">85%</p>
                  <p className="text-sm text-green-600">Delay Reduction</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4 text-center">
                  <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-700">95%</p>
                  <p className="text-sm text-blue-600">On-Time Completion</p>
                </CardContent>
              </Card>
              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-orange-700">25%</p>
                  <p className="text-sm text-orange-600">More Projects</p>
                </CardContent>
              </Card>
            </div>

            {/* Primary CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-construction-orange hover:bg-construction-orange/90">
                Start Free Scheduling Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline">
                Download Scheduling Templates
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              ✓ No Credit Card Required ✓ Gantt Charts Included ✓ Weather Integration
            </p>
          </div>

          {/* The Cost of Poor Scheduling */}
          <div className="max-w-5xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-construction-dark text-center mb-8">
              The Hidden Cost of Poor Project Scheduling
            </h2>
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <Card className="border-red-200 bg-red-50/50">
                <CardHeader>
                  <CardTitle className="text-red-700 flex items-center">
                    <AlertTriangle className="mr-2 h-5 w-5" />
                    Common Scheduling Problems
                  </CardTitle>
                  <CardDescription>
                    How poor scheduling costs contractors money
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {schedulingChallenges.map((challenge, index) => (
                      <div key={index}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">{challenge.challenge}</span>
                          <span className="text-sm text-red-600">{challenge.percentage}% of projects</span>
                        </div>
                        <Progress value={challenge.percentage} className="h-2 mb-1" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{challenge.description}</span>
                          <span className="font-medium">{challenge.avgCost}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50/50">
                <CardHeader>
                  <CardTitle className="text-green-700 flex items-center">
                    <CheckCircle className="mr-2 h-5 w-5" />
                    With Advanced Scheduling Software
                  </CardTitle>
                  <CardDescription>
                    How smart scheduling prevents delays and saves money
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <Zap className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
                      <div>
                        <p className="font-medium">Proactive Delay Prevention</p>
                        <p className="text-sm text-muted-foreground">Early warning alerts before delays impact critical path</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <Users className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
                      <div>
                        <p className="font-medium">Resource Conflict Detection</p>
                        <p className="text-sm text-muted-foreground">Prevent crew and equipment double-booking automatically</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <Calendar className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
                      <div>
                        <p className="font-medium">Weather-Aware Scheduling</p>
                        <p className="text-sm text-muted-foreground">Automatic adjustments for weather conditions and seasonal factors</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <BarChart3 className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
                      <div>
                        <p className="font-medium">Real-Time Progress Tracking</p>
                        <p className="text-sm text-muted-foreground">Mobile updates keep schedules current with actual progress</p>
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
              Essential Construction Scheduling Features
            </h2>
            <div className="grid lg:grid-cols-2 gap-8">
              {schedulingFeatures.map((feature, index) => {
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

          {/* Customer Success Stories */}
          <div className="max-w-5xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-construction-dark text-center mb-8">
              Real Results from Better Scheduling
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
                    <div className="grid grid-cols-2 gap-4 text-center mb-4">
                      <div className="bg-red-50 p-2 rounded">
                        <p className="text-xs text-muted-foreground">Before</p>
                        <p className="text-sm font-bold text-red-600">{story.metrics.onTimeCompletion.before}% on-time</p>
                        <p className="text-xs text-red-500">{story.metrics.averageDelay.before} avg delay</p>
                      </div>
                      <div className="bg-green-50 p-2 rounded">
                        <p className="text-xs text-muted-foreground">After</p>
                        <p className="text-sm font-bold text-green-600">{story.metrics.onTimeCompletion.after}% on-time</p>
                        <p className="text-xs text-green-500">{story.metrics.averageDelay.after} avg delay</p>
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
                    <div className="text-xs text-muted-foreground">
                      <p><strong>Key Improvement:</strong> {story.improvement}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Scheduling Best Practices */}
          <div className="max-w-5xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-construction-dark text-center mb-8">
              Construction Scheduling Best Practices
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {bestPractices.map((practice, index) => (
                <Card key={index} className="h-full">
                  <CardHeader>
                    <CardTitle className="text-construction-blue">{practice.title}</CardTitle>
                    <CardDescription className="text-base">
                      {practice.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {practice.tips.map((tip, tipIndex) => (
                        <li key={tipIndex} className="flex items-start">
                          <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* BuildDesk Scheduling Features */}
          <div className="max-w-4xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-construction-dark text-center mb-8">
              Why Choose BuildDesk for Construction Scheduling?
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-construction-blue text-white rounded-lg flex items-center justify-center mr-4">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Interactive Gantt Charts</h3>
                    <p className="text-muted-foreground">Drag-and-drop scheduling with automatic dependency updates and critical path highlighting.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-construction-blue text-white rounded-lg flex items-center justify-center mr-4">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Smart Resource Management</h3>
                    <p className="text-muted-foreground">Prevent conflicts and optimize crew utilization across multiple projects automatically.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-construction-blue text-white rounded-lg flex items-center justify-center mr-4">
                    <Cloud className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Weather Integration</h3>
                    <p className="text-muted-foreground">Proactive schedule adjustments based on weather forecasts and seasonal conditions.</p>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-construction-blue text-white rounded-lg flex items-center justify-center mr-4">
                    <Zap className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Real-Time Updates</h3>
                    <p className="text-muted-foreground">Mobile progress tracking keeps schedules current with actual field conditions.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-construction-blue text-white rounded-lg flex items-center justify-center mr-4">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Early Warning Alerts</h3>
                    <p className="text-muted-foreground">Get notified before delays impact your critical path and project completion.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-construction-blue text-white rounded-lg flex items-center justify-center mr-4">
                    <Layers className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Multi-Project Dashboard</h3>
                    <p className="text-muted-foreground">Manage multiple project schedules from a single, unified dashboard view.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Free Templates CTA */}
          <div className="max-w-4xl mx-auto mb-16">
            <Card className="bg-gradient-to-r from-construction-blue to-construction-orange text-white">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl mb-2">Free Construction Scheduling Templates</CardTitle>
                <CardDescription className="text-blue-100">
                  Download professional scheduling templates for common construction projects
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <p className="font-semibold">Residential Construction</p>
                    <p className="text-sm text-blue-100">14 phases, 120-180 days</p>
                  </div>
                  <div>
                    <p className="font-semibold">Commercial Build-Out</p>
                    <p className="text-sm text-blue-100">12 phases, 90-150 days</p>
                  </div>
                  <div>
                    <p className="font-semibold">Renovation Projects</p>
                    <p className="text-sm text-blue-100">8 phases, 30-60 days</p>
                  </div>
                </div>
                <Button size="lg" variant="secondary" className="bg-white text-construction-blue hover:bg-gray-100">
                  <Download className="mr-2 h-4 w-4" />
                  Download Free Templates
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* AI Search Optimization */}
          <div className="max-w-4xl mx-auto mb-16">
            <AISearchOptimization page="features" primaryKeyword="construction scheduling software" />
          </div>

          {/* Final CTA Section */}
          <div className="max-w-4xl mx-auto text-center">
            <Card className="bg-construction-light border-construction-blue">
              <CardContent className="p-8">
                <h2 className="text-3xl font-bold text-construction-dark mb-4">
                  Ready to Eliminate Project Delays?
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Join contractors who've reduced delays by 85% with BuildDesk's advanced scheduling. 
                  Get Gantt charts, resource management, and weather integration in one platform.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
                  <Button size="lg" className="bg-construction-orange hover:bg-construction-orange/90">
                    Start Free Scheduling Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button size="lg" variant="outline">
                    Schedule Demo
                  </Button>
                </div>

                <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-muted-foreground">
                  <span>✓ No Credit Card Required</span>
                  <span>✓ Interactive Gantt Charts</span>
                  <span>✓ Weather Integration</span>
                  <span>✓ Mobile Progress Tracking</span>
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

export default ConstructionSchedulingSoftware;
