import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, FileText, Users, CheckCircle, ArrowRight, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import BreadcrumbsNavigation from "@/components/BreadcrumbsNavigation";

const SafetyAndOSHACompliance = () => {
  const safetyGuides = [
    {
      title: "OSHA Safety Logs: Digital Playbook for Construction Teams",
      description: "Complete guide to OSHA compliance with digital templates and workflows",
      readTime: "15 min",
      difficulty: "Essential",
      slug: "/resources/osha-safety-logs-digital-playbook",
      category: "OSHA Compliance"
    },
    {
      title: "Construction Daily Logs: What to Track and Why It Pays", 
      description: "Safety documentation that reduces liability and improves accountability",
      readTime: "9 min",
      difficulty: "Beginner",
      slug: "/resources/construction-daily-logs-best-practices", 
      category: "Documentation"
    }
  ];

  const complianceAreas = [
    {
      title: "OSHA Record Keeping",
      description: "Maintain required injury logs, incident reports, and training records to avoid violations.",
      icon: <FileText className="h-6 w-6" />,
      requirements: ["300 Log maintenance", "301 Incident reports", "Training documentation", "Annual summaries"]
    },
    {
      title: "Fall Protection",
      description: "Implement proper fall protection systems for work at heights over 6 feet.",
      icon: <Shield className="h-6 w-6" />,
      requirements: ["Guardrail systems", "Safety net systems", "Personal fall arrest", "Training requirements"]
    },
    {
      title: "Electrical Safety",
      description: "Protect workers from electrical hazards on construction sites.",
      icon: <AlertTriangle className="h-6 w-6" />,
      requirements: ["GFCI protection", "Equipment grounding", "Lockout/tagout", "Qualified person requirements"]
    },
    {
      title: "Safety Training",
      description: "Provide required safety training and maintain documentation for all workers.",
      icon: <Users className="h-6 w-6" />,
      requirements: ["10-hour training", "Toolbox talks", "Hazard communication", "Equipment training"]
    }
  ];

  const commonViolations = [
    { violation: "Fall protection systems", fine: "$15,625", frequency: "Most common" },
    { violation: "Scaffolding standards", fine: "$12,845", frequency: "Very common" },
    { violation: "Ladder safety", fine: "$10,200", frequency: "Common" },
    { violation: "Electrical wiring", fine: "$14,502", frequency: "Common" },
    { violation: "Personal protective equipment", fine: "$8,900", frequency: "Common" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOMetaTags
        title="Construction Safety & OSHA Compliance Guide | Avoid Violations & Fines"
        description="Complete guide to construction safety and OSHA compliance. Digital tools, required records, and best practices to keep your team safe and avoid costly violations."
        keywords={[
          'construction safety',
          'OSHA compliance construction',
          'construction safety management',
          'OSHA violations construction',
          'construction safety program'
        ]}
        canonicalUrl="/topics/safety-and-osha-compliance"
      />
      
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <BreadcrumbsNavigation />
        
        {/* Hero Section */}
        <div className="text-center mb-12">
          <Badge className="mb-4">Safety Hub</Badge>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Construction Safety & OSHA Compliance
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Keep your team safe and avoid costly OSHA violations. Complete guides, 
            digital tools, and best practices for construction safety management.
          </p>
        </div>

        {/* Key Statistics */}
        <section className="mb-12">
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-6">
              <div className="grid md:grid-cols-4 gap-6 text-center">
                <div>
                  <div className="text-2xl font-bold text-orange-700">$15,625</div>
                  <div className="text-sm text-orange-600">Average OSHA fine (2024)</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-700">1 in 10</div>
                  <div className="text-sm text-orange-600">Construction workers injured annually</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-700">40%</div>
                  <div className="text-sm text-orange-600">Injury reduction with proper programs</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-700">5 years</div>
                  <div className="text-sm text-orange-600">Required record retention period</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Key Compliance Areas */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-8">Essential Compliance Areas</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {complianceAreas.map((area, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="bg-orange-100 p-2 rounded-lg">
                      {area.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{area.title}</CardTitle>
                      <CardDescription className="mt-2">{area.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {area.requirements.map((requirement, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm">{requirement}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Common Violations */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Most Common OSHA Violations & Fines</h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left p-4">Violation Type</th>
                      <th className="text-center p-4">Average Fine</th>
                      <th className="text-center p-4">Frequency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commonViolations.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-4">{item.violation}</td>
                        <td className="p-4 text-center font-semibold text-red-600">{item.fine}</td>
                        <td className="p-4 text-center">
                          <Badge variant={item.frequency === "Most common" ? "destructive" : "secondary"}>
                            {item.frequency}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Safety Guides */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-8">Safety & Compliance Guides</h2>
          <div className="grid lg:grid-cols-2 gap-6">
            {safetyGuides.map((guide, index) => (
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

        {/* Digital Safety Management */}
        <section className="mb-12">
          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-xl">Digital Safety Management Benefits</CardTitle>
              <CardDescription>
                Why smart contractors are switching from paper to digital safety programs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold mb-3 text-green-800">Time Savings</h4>
                  <ul className="space-y-2 text-sm">
                    <li>• 60% faster form completion</li>
                    <li>• Automated OSHA log updates</li>
                    <li>• Instant report generation</li>
                    <li>• Eliminate manual transcription</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3 text-green-800">Better Compliance</h4>
                  <ul className="space-y-2 text-sm">
                    <li>• Automatic deadline reminders</li>
                    <li>• Complete audit trails</li>
                    <li>• Required field validation</li>
                    <li>• Photo documentation</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3 text-green-800">Risk Reduction</h4>
                  <ul className="space-y-2 text-sm">
                    <li>• GPS-verified safety meetings</li>
                    <li>• Real-time incident reporting</li>
                    <li>• Centralized safety data</li>
                    <li>• Backup and recovery</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Safety Checklist */}
        <section className="mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Monthly Safety Compliance Checklist</CardTitle>
              <CardDescription>
                Essential tasks to maintain OSHA compliance and protect your team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Weekly Tasks</h4>
                  <ul className="space-y-2 text-sm">
                    <li>□ Conduct toolbox talks with documentation</li>
                    <li>□ Inspect fall protection equipment</li>
                    <li>□ Review and update daily safety logs</li>
                    <li>□ Check electrical equipment and GFCI protection</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Monthly Tasks</h4>
                  <ul className="space-y-2 text-sm">
                    <li>□ Update OSHA 300 log with any incidents</li>
                    <li>□ Review safety training completion status</li>
                    <li>□ Audit jobsite compliance and hazard controls</li>
                    <li>□ Update emergency contact and procedure info</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Related Topics */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Related Safety Topics</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <Link to="/topics/field-tracking-and-management" className="font-medium hover:text-primary">
                  Field Management →
                </Link>
                <p className="text-sm text-muted-foreground mt-1">Mobile safety forms and GPS tracking</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <Link to="/topics/construction-management-basics" className="font-medium hover:text-primary">
                  Management Basics →
                </Link>
                <p className="text-sm text-muted-foreground mt-1">Integration with project management</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <Link to="/osha-compliance-software" className="font-medium hover:text-primary">
                  OSHA Software →
                </Link>
                <p className="text-sm text-muted-foreground mt-1">Digital compliance tools</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">
            Protect Your Team & Business Today
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            BuildDesk includes comprehensive safety management tools: digital OSHA forms, 
            automated compliance tracking, and mobile incident reporting to keep your team safe.
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

export default SafetyAndOSHACompliance;