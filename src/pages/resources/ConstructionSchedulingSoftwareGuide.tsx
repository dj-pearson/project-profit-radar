import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import { ArticleSchema, FAQSchema } from "@/components/seo/EnhancedSchemaMarkup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, AlertTriangle, Calendar, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import BreadcrumbsNavigation from "@/components/BreadcrumbsNavigation";

const ConstructionSchedulingSoftwareGuide = () => {
  const faqData = [
    {
      question: "Why do 77% of construction projects finish late?",
      answer: "Poor scheduling, inadequate resource planning, lack of real-time updates, and no visibility into dependencies. Most contractors rely on outdated methods like Excel or basic calendars that can't handle construction complexity."
    },
    {
      question: "What's the difference between scheduling software and project management software?",
      answer: "Scheduling software focuses specifically on timeline, resource allocation, and dependencies. Project management software includes scheduling plus budgeting, documents, communication, and other features. Most small contractors need integrated project management."
    },
    {
      question: "How can scheduling software prevent project delays?",
      answer: "Real-time updates, automatic conflict detection, resource optimization, weather integration, and dependency tracking. When delays occur, good software automatically adjusts downstream tasks and alerts stakeholders."
    },
    {
      question: "Do I need expensive scheduling software like Primavera P6?",
      answer: "No. P6 costs $1,500+ per user annually and requires dedicated schedulers. Small contractors get better results with construction-focused tools like BuildDesk that cost 80% less and include scheduling as part of complete project management."
    }
  ];

  const commonSchedulingProblems = [
    {
      problem: "Using Excel for project schedules",
      impact: "77% of projects finish late",
      solution: "Use construction-specific software with dependency tracking"
    },
    {
      problem: "Not updating schedules in real-time",
      impact: "Crews work on outdated information",
      solution: "Mobile apps that sync changes instantly to all team members"
    },
    {
      problem: "Poor resource allocation",
      impact: "Crews sitting idle or overbooked",
      solution: "Resource optimization tools that prevent conflicts"
    },
    {
      problem: "Ignoring weather impact",
      impact: "Outdoor work delays cascade through schedule",
      solution: "Weather integration with automatic rescheduling alerts"
    }
  ];

  const schedulingBestPractices = [
    {
      title: "Start with realistic time estimates",
      description: "Use historical data from similar projects, not wishful thinking",
      tip: "Add 15-20% buffer for small projects, 25-30% for complex ones"
    },
    {
      title: "Map dependencies clearly", 
      description: "Identify which tasks must finish before others can start",
      tip: "Use predecessor/successor relationships, not just start dates"
    },
    {
      title: "Account for resource constraints",
      description: "Don't schedule the same crew on multiple projects simultaneously",
      tip: "Level resources across projects to avoid overallocation"
    },
    {
      title: "Build in flexibility",
      description: "Create float time for critical path activities",
      tip: "Schedule high-risk tasks early with backup plans ready"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOMetaTags
        title="Construction Scheduling Software: Stop Project Delays | BuildDesk Guide"
        description="Simple scheduling rules that prevent delays. Learn how small contractors improve project timelines by 40% with the right scheduling software and processes."
        keywords={[
          'construction scheduling software',
          'construction project scheduling',
          'prevent construction delays',
          'construction schedule management',
          'project timeline software construction'
        ]}
        canonicalUrl="/resources/construction-scheduling-software-prevent-delays"
      />
      
      <ArticleSchema
        title="Construction Scheduling Software: Stop Project Delays"
        author="BuildDesk Team"
        datePublished="2025-01-24"
        image="https://builddesk.com/images/construction-scheduling-guide.jpg"
        url="https://builddesk.com/resources/construction-scheduling-software-prevent-delays"
      />
      
      <FAQSchema questions={faqData} />
      
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <BreadcrumbsNavigation />
        
        {/* Hero Section */}
        <div className="mb-12">
          <Badge className="mb-4">Scheduling Guide</Badge>
          <h1 className="text-4xl font-bold tracking-tight mb-6">
            Construction Scheduling Software: Stop Project Delays
          </h1>
          
          {/* TL;DR Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-3">TL;DR - Quick Solutions</h2>
            <p className="text-lg leading-relaxed">
              <strong>77% of construction projects finish late due to poor scheduling.</strong> 
              Simple rules: use construction-specific software (not Excel), update schedules in real-time, 
              map dependencies clearly, and account for weather/resource constraints. 
              Good scheduling software reduces delays by 40%.
            </p>
          </div>

          <div className="text-lg text-muted-foreground mb-8">
            <p>Project delays cost small contractors 15-25% in lost profits annually. 
            This guide covers proven scheduling strategies and software solutions that keep projects on track.</p>
          </div>
        </div>

        {/* Delay Impact Stats */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">The Real Cost of Poor Scheduling</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">77%</div>
                <div className="text-sm text-muted-foreground">Projects finish late (industry average)</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Clock className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">37 days</div>
                <div className="text-sm text-muted-foreground">Average delay on residential projects</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">40%</div>
                <div className="text-sm text-muted-foreground">Delay reduction with proper scheduling</div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Common Problems */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Why Projects Get Delayed (And How to Fix It)</h2>
          <div className="space-y-4">
            {commonSchedulingProblems.map((item, index) => (
              <Card key={index} className="border-orange-200">
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-3 gap-4 items-start">
                    <div>
                      <div className="flex items-start gap-2 mb-2">
                        <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                        <h4 className="font-semibold text-orange-800">{item.problem}</h4>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Result:</div>
                      <div className="font-medium text-red-600">{item.impact}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Solution:</div>
                      <div className="text-sm">{item.solution}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Best Practices */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Simple Scheduling Rules That Work</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {schedulingBestPractices.map((practice, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{practice.title}</CardTitle>
                  <CardDescription>{practice.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-primary/5 rounded-lg p-4">
                    <div className="text-sm font-medium text-primary mb-1">Pro Tip:</div>
                    <div className="text-sm">{practice.tip}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Software Features Checklist */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Essential Features for Construction Scheduling Software</h2>
          <Card>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  "Gantt charts with drag-and-drop editing",
                  "Resource allocation and leveling",
                  "Mobile access for field teams",
                  "Real-time collaboration and updates",
                  "Weather integration for outdoor work",
                  "Critical path method (CPM) analysis", 
                  "Dependency tracking and alerts",
                  "Integration with estimating/job costing",
                  "Automatic schedule conflict detection",
                  "Progress tracking with photo documentation"
                ].map((feature, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Success Example */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Real Example: Scheduling Success</h2>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Company:</h4>
                  <p className="text-muted-foreground">Valley Construction (22 employees, commercial projects)</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Before BuildDesk:</h4>
                  <p className="text-muted-foreground">Excel schedules, 65% projects late, crews often idle or overbooked</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">After 4 months:</h4>
                  <p className="text-muted-foreground"><strong>85% on-time completion</strong>, 30% better resource utilization</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* FAQ Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Scheduling Software FAQ</h2>
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
                <Link to="/construction-scheduling-software" className="font-medium hover:text-primary">
                  BuildDesk Scheduling Features →
                </Link>
                <p className="text-sm text-muted-foreground mt-1">See our scheduling and resource management tools</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <Link to="/resources/job-costing-construction-setup-guide" className="font-medium hover:text-primary">
                  Job Costing Integration →
                </Link>
                <p className="text-sm text-muted-foreground mt-1">Connect scheduling with budget tracking</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <Link to="/construction-field-management" className="font-medium hover:text-primary">
                  Field Management Tools →
                </Link>
                <p className="text-sm text-muted-foreground mt-1">Mobile tools for real-time schedule updates</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <div className="bg-primary/5 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">
            Stop Project Delays Today
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Join 300+ contractors using BuildDesk scheduling to finish projects on time. 
            Real-time updates, resource optimization, and mobile access included.
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

export default ConstructionSchedulingSoftwareGuide;