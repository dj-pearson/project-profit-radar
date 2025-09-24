import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ArrowRight, Clock, Users, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import BreadcrumbsNavigation from "@/components/BreadcrumbsNavigation";

const ConstructionManagementBasics = () => {
  const topicGuides = [
    {
      title: "Best Construction Management Software for Small Business (2025)",
      description: "Complete buyer's guide comparing top options for small contractors",
      readTime: "12 min",
      difficulty: "Beginner",
      slug: "/resources/best-construction-management-software-small-business-2025",
      category: "Software Selection"
    },
    {
      title: "Job Costing in Construction: Setup Guide & Common Mistakes", 
      description: "Master the fundamentals of tracking project costs and improving margins",
      readTime: "8 min",
      difficulty: "Intermediate",
      slug: "/resources/job-costing-construction-setup-guide",
      category: "Financial Management"
    },
    {
      title: "Construction Scheduling Software: Stop Project Delays",
      description: "Simple scheduling rules and software tools that prevent delays",
      readTime: "10 min", 
      difficulty: "Beginner",
      slug: "/resources/construction-scheduling-software-prevent-delays",
      category: "Project Planning"
    },
    {
      title: "Construction Daily Logs: What to Track and Why It Pays",
      description: "Essential documentation practices that reduce rework and legal issues",
      readTime: "9 min",
      difficulty: "Beginner", 
      slug: "/resources/construction-daily-logs-best-practices",
      category: "Documentation"
    }
  ];

  const keyTopics = [
    {
      title: "Project Planning & Estimating",
      description: "Learn to create accurate estimates and realistic project plans that set you up for success.",
      icon: <BookOpen className="h-6 w-6" />,
      topics: ["Estimating basics", "Scope definition", "Timeline planning", "Risk assessment"]
    },
    {
      title: "Cost Control & Job Costing", 
      description: "Master financial controls to track costs in real-time and improve project margins.",
      icon: <DollarSign className="h-6 w-6" />,
      topics: ["Cost code setup", "Budget tracking", "Change order management", "Profit analysis"]
    },
    {
      title: "Team Management",
      description: "Build efficient teams and workflows that deliver consistent quality and stay on schedule.",
      icon: <Users className="h-6 w-6" />,
      topics: ["Crew scheduling", "Communication", "Performance tracking", "Safety protocols"]
    },
    {
      title: "Project Execution",
      description: "Execute projects smoothly with proper documentation, quality control, and client management.", 
      icon: <Clock className="h-6 w-6" />,
      topics: ["Daily reporting", "Quality control", "Client communication", "Issue resolution"]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOMetaTags
        title="Construction Management Basics: Complete Guide for Small Contractors | BuildDesk"
        description="Master construction management fundamentals: project planning, cost control, team management, and execution. Free guides and resources for growing contractors."
        keywords={[
          'construction management basics',
          'construction project management guide',
          'small contractor management', 
          'construction business management',
          'construction management fundamentals'
        ]}
        canonicalUrl="/topics/construction-management-basics"
      />
      
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <BreadcrumbsNavigation />
        
        {/* Hero Section */}
        <div className="text-center mb-12">
          <Badge className="mb-4">Topic Hub</Badge>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Construction Management Basics
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Master the fundamentals of construction management. From project planning to execution, 
            learn the essential skills every successful contractor needs to grow their business.
          </p>
        </div>

        {/* Key Topics Overview */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-8">Core Management Areas</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {keyTopics.map((topic, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      {topic.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{topic.title}</CardTitle>
                      <CardDescription className="mt-2">{topic.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {topic.topics.map((subtopic, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span className="text-sm text-muted-foreground">{subtopic}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Detailed Guides */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-8">Essential Guides</h2>
          <div className="grid lg:grid-cols-2 gap-6">
            {topicGuides.map((guide, index) => (
              <Card key={index} className="h-full flex flex-col">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">{guide.category}</Badge>
                    <Badge variant="outline">{guide.difficulty}</Badge>
                  </div>
                  <CardTitle className="text-lg leading-tight">
                    <Link 
                      to={guide.slug}
                      className="hover:text-primary transition-colors"
                    >
                      {guide.title}
                    </Link>
                  </CardTitle>
                  <CardDescription>{guide.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-end">
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{guide.readTime} read</span>
                    </div>
                  </div>
                  <Button asChild variant="outline" className="w-full">
                    <Link to={guide.slug}>
                      Read Guide <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Quick Start Checklist */}
        <section className="mb-12">
          <Card className="bg-primary/5">
            <CardHeader>
              <CardTitle className="text-xl">Construction Management Quick Start Checklist</CardTitle>
              <CardDescription>
                Essential steps every small contractor should take to improve project outcomes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Week 1: Foundation</h4>
                  <ul className="space-y-2 text-sm">
                    <li>□ Set up project cost codes and budget templates</li>
                    <li>□ Choose construction management software</li>
                    <li>□ Create standardized project workflows</li>
                    <li>□ Establish daily reporting procedures</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Week 2: Implementation</h4>
                  <ul className="space-y-2 text-sm">
                    <li>□ Train team on new processes and tools</li>
                    <li>□ Set up QuickBooks integration for job costing</li>
                    <li>□ Create client communication templates</li>
                    <li>□ Implement safety and compliance procedures</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Success Metrics */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">What Good Management Achieves</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">23%</div>
                <div className="text-sm text-muted-foreground">Average profit increase</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">40%</div>
                <div className="text-sm text-muted-foreground">Fewer project delays</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">6 hrs</div>
                <div className="text-sm text-muted-foreground">Daily time savings</div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Related Topics */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Explore Related Topics</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <Link to="/topics/cost-and-profit-management" className="font-medium hover:text-primary">
                  Cost & Profit Management →
                </Link>
                <p className="text-sm text-muted-foreground mt-1">Advanced financial controls and job costing</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <Link to="/topics/safety-and-osha-compliance" className="font-medium hover:text-primary">
                  Safety & OSHA Compliance →
                </Link>
                <p className="text-sm text-muted-foreground mt-1">Keep your team safe and compliant</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <Link to="/topics/field-tracking-and-management" className="font-medium hover:text-primary">
                  Field Management →
                </Link>
                <p className="text-sm text-muted-foreground mt-1">Mobile tools and field operations</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <div className="bg-primary/5 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">
            Ready to Master Construction Management?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            BuildDesk provides all the tools covered in these guides: project planning, 
            job costing, scheduling, and team management in one integrated platform.
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

export default ConstructionManagementBasics;