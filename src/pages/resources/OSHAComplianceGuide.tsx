import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import { QuickAnswerSnippet, LastUpdated, QuickFacts } from "@/components/seo/QuickAnswerSnippet";
import { HowToSchema } from "@/components/seo/EnhancedSchemaMarkup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, CheckCircle, FileText, Users, Clock, ArrowRight, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import BreadcrumbsNavigation from "@/components/BreadcrumbsNavigation";

const OSHAComplianceGuide = () => {
  const complianceSteps = [
    {
      name: "Identify OSHA Requirements",
      text: "Determine which OSHA standards apply to your construction projects based on project type, size, and hazards present. Common standards include Fall Protection (1926.501), Scaffolding (1926.451), and Personal Protective Equipment (1926.95)."
    },
    {
      name: "Develop Safety Policies",
      text: "Create written safety policies and procedures specific to your operations. Include emergency response plans, hazard communication programs, and injury/illness prevention protocols."
    },
    {
      name: "Train Your Team", 
      text: "Provide comprehensive safety training to all workers. Document training sessions, maintain training records, and ensure workers understand hazard recognition and safe work practices."
    },
    {
      name: "Implement Safety Reporting",
      text: "Establish digital systems for daily safety logs, incident reporting, and near-miss documentation. Use construction management software to streamline reporting and maintain compliance records."
    },
    {
      name: "Conduct Regular Audits",
      text: "Perform weekly safety inspections and maintain detailed records. Address violations immediately and track corrective actions to demonstrate commitment to workplace safety."
    }
  ];

  const complianceFacts = [
    "OSHA violations cost construction companies $1.2 billion annually",
    "Fall protection violations are the #1 cited OSHA violation (5,260 citations in 2024)",
    "Companies with comprehensive safety programs reduce injury rates by 40%",
    "Digital safety reporting reduces compliance violations by 65%",
    "Average OSHA fine increased 78% from 2015 to 2024"
  ];

  const commonViolations = [
    {
      violation: "Fall Protection (1926.501)",
      description: "Failure to provide fall protection systems for workers at heights of 6 feet or more",
      avgFine: "$15,625",
      prevention: "Use proper guardrails, safety nets, or personal fall arrest systems. Train workers on equipment use and inspect systems daily."
    },
    {
      violation: "Scaffolding (1926.451)",
      description: "Improper scaffolding construction, missing guardrails, or inadequate access",
      avgFine: "$12,896", 
      prevention: "Follow manufacturer instructions, inspect scaffolding daily, ensure proper planking and guardrails are in place."
    },
    {
      violation: "Ladders (1926.1053)",
      description: "Using damaged ladders, improper setup, or failure to maintain three-point contact",
      avgFine: "$8,542",
      prevention: "Inspect ladders before use, maintain proper ladder-to-wall angle (4:1 ratio), and train workers on safe climbing practices."
    },
    {
      violation: "Personal Protective Equipment (1926.95)",
      description: "Not providing or requiring use of appropriate PPE for job hazards",
      avgFine: "$7,318",
      prevention: "Conduct hazard assessments, provide appropriate PPE, train workers on proper use, and enforce PPE policies consistently."
    }
  ];

  const safetyPrograms = [
    {
      title: "Daily Safety Meetings",
      description: "5-minute toolbox talks covering daily hazards and safety procedures",
      frequency: "Daily",
      participants: "All crew members",
      documentation: "Digital attendance and topic tracking"
    },
    {
      title: "Weekly Safety Inspections", 
      description: "Comprehensive site safety audits with corrective action tracking",
      frequency: "Weekly",
      participants: "Safety coordinator and supervisors",
      documentation: "Digital inspection forms and photo evidence"
    },
    {
      title: "Monthly Safety Training",
      description: "Formal training on specific OSHA topics and new safety procedures",
      frequency: "Monthly", 
      participants: "All employees",
      documentation: "Training records and competency verification"
    },
    {
      title: "Incident Investigation",
      description: "Immediate response and investigation of safety incidents and near-misses",
      frequency: "As needed",
      participants: "Safety team and involved workers",
      documentation: "Incident reports and corrective action plans"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOMetaTags
        title="OSHA Compliance Guide for Construction Contractors | BuildDesk"
        description="Complete OSHA compliance guide for construction contractors. Learn safety requirements, avoid violations, implement digital safety programs, and protect your workers and business."
        keywords={[
          'OSHA compliance construction',
          'construction safety requirements',
          'OSHA violations construction',
          'construction safety programs',
          'OSHA safety training',
          'construction safety reporting',
          'digital safety logs construction'
        ]}
        canonicalUrl="/resources/osha-compliance-guide"
      />
      
      <HowToSchema
        name="How to Achieve OSHA Compliance in Construction"
        description="Step-by-step guide to implementing OSHA compliance programs that protect workers and avoid violations"
        steps={complianceSteps}
      />
      
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <BreadcrumbsNavigation />
        
        {/* Hero Section */}
        <div className="mb-12">
          <Badge className="mb-4">Safety & Compliance Guide</Badge>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            OSHA Compliance Guide for Construction Contractors
          </h1>
          <LastUpdated date="September 2025" />
          <p className="text-xl text-muted-foreground max-w-4xl mb-6">
            Protect your workers and avoid costly violations with comprehensive OSHA compliance strategies. 
            Includes digital tools, templates, and proven systems used by successful contractors.
          </p>
        </div>
        
        <QuickAnswerSnippet
          question="How do construction contractors achieve OSHA compliance?"
          answer="Successful OSHA compliance requires identifying applicable standards, developing written safety policies, providing comprehensive worker training, implementing digital safety reporting systems, and conducting regular audits. Digital tools reduce violations by 65% compared to paper-based systems."
        />
        
        <QuickFacts
          title="OSHA Compliance Statistics"
          facts={complianceFacts}
        />

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2 space-y-8">
            
            {/* Why OSHA Compliance Matters */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">Why OSHA Compliance Is Critical for Contractors</h2>
              <div className="prose max-w-none">
                <p className="text-muted-foreground mb-4">
                  OSHA compliance isn't just about avoiding fines—it's about protecting your most valuable asset: your workers. 
                  Construction accounts for 21% of all workplace fatalities despite representing only 7% of the workforce.
                </p>
                <p className="text-muted-foreground mb-6">
                  Beyond the moral imperative, non-compliance carries severe business consequences: OSHA fines, increased 
                  insurance costs, project delays, reputation damage, and potential criminal liability. Conversely, 
                  companies with strong safety programs see 40% fewer injuries and 15% lower insurance premiums.
                </p>
              </div>
            </section>

            {/* Step-by-Step Compliance Process */}
            <section>
              <h2 className="text-2xl font-semibold mb-6">5-Step OSHA Compliance Implementation</h2>
              <div className="space-y-6">
                {complianceSteps.map((step, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-semibold">
                          {index + 1}
                        </div>
                        <CardTitle className="text-lg">{step.name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{step.text}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Common Violations */}
            <section>
              <h2 className="text-2xl font-semibold mb-6">Top 4 OSHA Violations and How to Prevent Them</h2>
              <div className="space-y-6">
                {commonViolations.map((item, index) => (
                  <Card key={index} className="border-orange-200">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-5 w-5 text-orange-600" />
                          <CardTitle className="text-lg text-orange-800">{item.violation}</CardTitle>
                        </div>
                        <Badge variant="destructive" className="bg-red-100 text-red-800">
                          Avg Fine: {item.avgFine}
                        </Badge>
                      </div>
                      <CardDescription>{item.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-green-800 mb-2">Prevention Strategy:</h4>
                        <p className="text-green-700 text-sm">{item.prevention}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Safety Programs */}
            <section>
              <h2 className="text-2xl font-semibold mb-6">Essential Safety Programs for Contractors</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {safetyPrograms.map((program, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Shield className="h-5 w-5 text-blue-600" />
                        {program.title}
                      </CardTitle>
                      <CardDescription>{program.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Frequency:</span>
                          <p className="text-muted-foreground">{program.frequency}</p>
                        </div>
                        <div>
                          <span className="font-medium">Participants:</span>
                          <p className="text-muted-foreground">{program.participants}</p>
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-sm">Documentation:</span>
                        <p className="text-muted-foreground text-sm">{program.documentation}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Digital Safety Solutions */}
            <section>
              <h2 className="text-2xl font-semibold mb-4">Digital OSHA Compliance Tools</h2>
              <div className="prose max-w-none text-muted-foreground">
                <p className="mb-4">
                  Modern construction management software transforms OSHA compliance from a paper-heavy burden 
                  into a streamlined digital process. Key features to look for include:
                </p>
                <ul className="list-disc pl-6 space-y-2 mb-6">
                  <li>Digital daily safety logs with photo documentation</li>
                  <li>Automated incident reporting and investigation workflows</li>
                  <li>Training record management and certification tracking</li>
                  <li>Mobile safety inspection forms with real-time alerts</li>
                  <li>Customizable safety meeting templates and attendance tracking</li>
                  <li>Integration with project management for safety milestone tracking</li>
                </ul>
                <p>
                  Contractors using digital safety systems report 65% fewer OSHA violations and 40% reduction 
                  in safety-related project delays compared to paper-based approaches.
                </p>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Tools */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Safety Resources
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild variant="outline" className="w-full">
                  <Link to="/templates/safety-checklist">
                    Safety Checklist <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/templates/incident-report">
                    Incident Report Template <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/resources/safety-training-guide">
                    Training Guide <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Cost of Non-Compliance */}
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-800">Cost of Non-Compliance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-red-600" />
                  <div>
                    <div className="font-semibold">$15,625</div>
                    <div className="text-sm text-muted-foreground">Average serious violation fine</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <div className="font-semibold">$156,259</div>
                    <div className="text-sm text-muted-foreground">Maximum willful violation penalty</div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Plus: Increased insurance costs, project delays, reputation damage, and potential criminal liability.
                </div>
              </CardContent>
            </Card>

            {/* Related Resources */}
            <Card>
              <CardHeader>
                <CardTitle>Related Guides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to="/resources/fall-protection-guide" className="block p-3 border rounded hover:bg-muted transition-colors">
                  <h4 className="font-medium">Fall Protection Systems</h4>
                  <p className="text-sm text-muted-foreground">Prevent the #1 OSHA violation</p>
                </Link>
                <Link to="/resources/safety-training-program" className="block p-3 border rounded hover:bg-muted transition-colors">
                  <h4 className="font-medium">Safety Training Programs</h4>
                  <p className="text-sm text-muted-foreground">Comprehensive worker education</p>
                </Link>
                <Link to="/resources/incident-investigation" className="block p-3 border rounded hover:bg-muted transition-colors">
                  <h4 className="font-medium">Incident Investigation</h4>
                  <p className="text-sm text-muted-foreground">Proper response procedures</p>
                </Link>
              </CardContent>
            </Card>

            {/* CTA */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Streamline OSHA Compliance</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  See how BuildDesk's digital safety tools help contractors maintain compliance and protect workers.
                </p>
                <Button asChild className="w-full">
                  <Link to="/auth">Start Free Trial</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="bg-primary/5 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">
            Protect Your Workers and Your Business
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            BuildDesk's digital safety tools help contractors reduce OSHA violations by 65% while 
            streamlining compliance reporting and protecting workers on every job site.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/auth">Start Free Trial</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/features">
                View Safety Features <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default OSHAComplianceGuide;