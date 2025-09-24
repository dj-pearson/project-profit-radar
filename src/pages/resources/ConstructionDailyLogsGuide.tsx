import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import { ArticleSchema, FAQSchema } from "@/components/seo/EnhancedSchemaMarkup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, FileText, Camera, Clock, TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";
import BreadcrumbsNavigation from "@/components/BreadcrumbsNavigation";

const ConstructionDailyLogsGuide = () => {
  const faqData = [
    {
      question: "What should be included in construction daily logs?",
      answer: "Weather conditions, crew attendance, work completed, materials delivered, equipment usage, safety incidents, delays/issues, subcontractor activity, and progress photos. Include specific details like quantities and locations."
    },
    {
      question: "How do daily logs help reduce rework?",
      answer: "Detailed logs create accountability, document quality issues early, track proper procedures, and provide evidence for change orders. When problems arise, you have documentation to identify root causes and prevent recurrence."
    },
    {
      question: "Can I use my phone for daily logs?",
      answer: "Yes. Mobile apps are actually better than paper because they include GPS location, timestamps, photo integration, and automatic sync to the office. Digital logs are also more legible and searchable."
    },
    {
      question: "How long should I keep daily logs?",
      answer: "Keep daily logs for 6+ years minimum. They're often needed for warranty claims, legal disputes, change order justification, and insurance claims. Digital storage makes long-term retention easy and searchable."
    }
  ];

  const dailyLogElements = [
    {
      category: "Weather & Conditions",
      items: ["Temperature (high/low)", "Precipitation", "Wind conditions", "Site conditions", "Work stoppages due to weather"]
    },
    {
      category: "Workforce",
      items: ["Crew attendance by trade", "Hours worked", "Overtime details", "Subcontractor crews on site", "Safety meetings held"]
    },
    {
      category: "Work Progress",
      items: ["Tasks completed", "Quantities installed", "Work locations", "Quality inspections", "Progress photos"]
    },
    {
      category: "Materials & Equipment", 
      items: ["Materials delivered", "Equipment on site", "Equipment hours", "Material waste/damage", "Delivery issues"]
    },
    {
      category: "Issues & Changes",
      items: ["Safety incidents", "Delays and causes", "Change order work", "Rework required", "Coordination problems"]
    }
  ];

  const reworkReductionBenefits = [
    {
      benefit: "Early Issue Detection",
      description: "Daily documentation catches problems before they become expensive failures",
      impact: "Prevents 15-20% of potential rework costs"
    },
    {
      benefit: "Quality Accountability",
      description: "Crews know their work is documented, leading to better initial quality",
      impact: "Reduces quality-related callbacks by 30%"
    },
    {
      benefit: "Process Documentation",
      description: "Logs show what works and what doesn't for future projects",
      impact: "Improves consistency across projects"
    },
    {
      benefit: "Legal Protection",
      description: "Detailed records protect against unfounded claims and disputes",
      impact: "Saves thousands in potential legal costs"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOMetaTags
        title="Construction Daily Logs: What to Track and Why It Pays | BuildDesk"
        description="Essential guide to daily logs that reduce rework and improve project outcomes. Digital templates, best practices, and mobile solutions for construction teams."
        keywords={[
          'construction daily logs',
          'construction log book',
          'daily report construction',
          'construction project documentation',
          'reduce construction rework'
        ]}
        canonicalUrl="/resources/construction-daily-logs-best-practices"
      />
      
      <ArticleSchema
        title="Construction Daily Logs: What to Track and Why It Pays"
        author="BuildDesk Team"
        datePublished="2025-01-24"
        image="https://builddesk.com/images/daily-logs-guide.jpg"
        url="https://builddesk.com/resources/construction-daily-logs-best-practices"
      />
      
      <FAQSchema questions={faqData} />
      
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <BreadcrumbsNavigation />
        
        {/* Hero Section */}
        <div className="mb-12">
          <Badge className="mb-4">Best Practices</Badge>
          <h1 className="text-4xl font-bold tracking-tight mb-6">
            Construction Daily Logs: What to Track and Why It Pays
          </h1>
          
          {/* TL;DR Section */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-3">TL;DR - Key Points</h2>
            <p className="text-lg leading-relaxed">
              <strong>Daily logs reduce rework by 18% and protect against legal claims.</strong> 
              Track weather, crew attendance, work completed, materials, equipment, and issues. 
              Use mobile apps instead of paper for better accuracy, photos, and searchability. 
              5 minutes daily saves hours of problems later.
            </p>
          </div>

          <div className="text-lg text-muted-foreground mb-8">
            <p>Most contractors skip daily logs until problems hit. Smart contractors use them 
            as insurance against rework, disputes, and forgotten details that cost money.</p>
          </div>
        </div>

        {/* Benefits Overview */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Why Daily Logs Pay for Themselves</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <TrendingDown className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">18%</div>
                <div className="text-sm text-muted-foreground">Reduction in rework costs</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <FileText className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">85%</div>
                <div className="text-sm text-muted-foreground">Faster change order approvals</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Clock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">5 min</div>
                <div className="text-sm text-muted-foreground">Daily time investment saves hours</div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* What to Track */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Complete Daily Log Checklist</h2>
          <div className="space-y-6">
            {dailyLogElements.map((section, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{section.category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-2">
                    {section.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Digital vs Paper */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Digital vs Paper: Why Mobile Wins</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-green-200">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-lg text-green-800">Digital Daily Logs</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    "GPS location and timestamps automatic",
                    "Photos integrated with entries",
                    "Weather data auto-populated",
                    "Legible and searchable forever",
                    "Instant sync to office/clients",
                    "Templates prevent missing items",
                    "Backup and security built-in"
                  ].map((benefit, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{benefit}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-200">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-600" />
                  <CardTitle className="text-lg text-gray-800">Paper Daily Logs</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    "Handwriting often illegible",
                    "Easy to lose or damage", 
                    "No photos or timestamps",
                    "Hard to search historical data",
                    "Manual transcription required",
                    "Incomplete entries common",
                    "No backup if lost"
                  ].map((limitation, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500">✗</div>
                      <span className="text-sm text-gray-600">{limitation}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* How Logs Reduce Rework */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">How Daily Logs Reduce Rework</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {reworkReductionBenefits.map((benefit, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{benefit.benefit}</CardTitle>
                  <CardDescription>{benefit.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-sm font-medium text-green-800 mb-1">Impact:</div>
                    <div className="text-sm text-green-700">{benefit.impact}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Success Example */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Real Example: Daily Logs Save Money</h2>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Company:</h4>
                  <p className="text-muted-foreground">Precision Builders (14 employees, residential)</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Situation:</h4>
                  <p className="text-muted-foreground">Client claimed water damage from "poor installation"</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Daily Log Evidence:</h4>
                  <p className="text-muted-foreground"><strong>Proved heavy rain caused damage</strong>, not installation. Saved $12,000 claim.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Mobile App Benefits */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Mobile Daily Log Features That Matter</h2>
          <Card>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Camera className="h-5 w-5 text-primary" />
                    Photo Integration
                  </h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Progress documentation</li>
                    <li>• Issue identification</li>
                    <li>• Before/after comparisons</li>
                    <li>• Automatic geotagging</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Time Tracking
                  </h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Automatic timestamps</li>
                    <li>• GPS location verification</li>
                    <li>• Weather integration</li>
                    <li>• Crew check-in/out</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Smart Templates
                  </h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Pre-filled project info</li>
                    <li>• Required field validation</li>
                    <li>• Consistent format</li>
                    <li>• Quick copy from previous days</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* FAQ Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Daily Log FAQ</h2>
          <div className="space-y-6">
            {faqData.map((faq, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Internal Links */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Related Resources</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <Link to="/construction-field-management" className="font-medium hover:text-primary">
                  Field Management Tools →
                </Link>
                <p className="text-sm text-muted-foreground mt-1">Mobile daily log apps and templates</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <Link to="/resources/osha-safety-logs-digital-playbook" className="font-medium hover:text-primary">
                  OSHA Safety Logs →
                </Link>
                <p className="text-sm text-muted-foreground mt-1">Required safety documentation</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <Link to="/resources/construction-scheduling-software-prevent-delays" className="font-medium hover:text-primary">
                  Project Scheduling →
                </Link>
                <p className="text-sm text-muted-foreground mt-1">Connect daily logs with schedules</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <div className="bg-primary/5 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">
            Start Better Daily Logs Today
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            BuildDesk's mobile daily logs include photos, GPS, weather integration, 
            and templates that prevent missed details. Reduce rework and protect your projects.
          </p>
          <Button asChild size="lg">
            <Link to="/auth">Start Free Trial</Link>
          </Button>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ConstructionDailyLogsGuide;