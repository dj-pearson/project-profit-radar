import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import { ArticleSchema, FAQSchema } from "@/components/seo/EnhancedSchemaMarkup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Shield, AlertTriangle, FileText, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import BreadcrumbsNavigation from "@/components/BreadcrumbsNavigation";

const OSHASafetyLogsPlaybook = () => {
  const faqData = [
    {
      question: "What OSHA records are required for construction companies?",
      answer: "Construction companies with 10+ employees must maintain OSHA 300 logs, incident reports (Form 301), and annual summaries. Companies with fewer than 10 employees are generally exempt unless specifically directed by OSHA."
    },
    {
      question: "How long must I keep OSHA safety records?",
      answer: "OSHA requires keeping injury and illness records for 5 years. Safety training records should be kept for the duration of employment plus 30 years for some exposures like asbestos."
    },
    {
      question: "Can I use digital forms for OSHA compliance?",
      answer: "Yes. OSHA accepts digital records as long as they contain the same information as paper forms and can be readily accessible for inspection. Digital forms often improve accuracy and compliance."
    },
    {
      question: "What happens if OSHA inspects my job site?",
      answer: "OSHA can inspect without advance notice. You must provide safety records, employee interviews access, and site walkthrough. Violations can result in fines from $1,000 to $70,000+ per incident."
    }
  ];

  const requiredRecords = [
    {
      form: "OSHA 300 Log",
      description: "Annual log of work-related injuries and illnesses",
      frequency: "Updated within 7 days of incident",
      retention: "5 years"
    },
    {
      form: "OSHA 301 Report", 
      description: "Detailed incident report for each recordable injury",
      frequency: "Within 7 days of incident",
      retention: "5 years"
    },
    {
      form: "OSHA 300A Summary",
      description: "Annual summary posted February-April",
      frequency: "Annually by February 1",
      retention: "5 years"
    },
    {
      form: "Safety Training Records",
      description: "Documentation of safety meetings and training",
      frequency: "Ongoing/as required",
      retention: "Duration of employment + 30 years"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOMetaTags
        title="OSHA Safety Logs: Digital Playbook for Construction Teams | BuildDesk"
        description="Complete guide to OSHA compliance for construction. Digital templates, workflows, and tools to keep your team safe and compliant. Avoid costly violations."
        keywords={[
          'OSHA safety logs construction',
          'OSHA compliance construction',
          'construction safety records',
          'OSHA 300 log construction',
          'construction safety management'
        ]}
        canonicalUrl="/resources/osha-safety-logs-digital-playbook"
      />
      
      <ArticleSchema
        title="OSHA Safety Logs: Digital Playbook for Construction Teams"
        author="BuildDesk Team"
        datePublished="2025-01-24"
        image="https://builddesk.com/images/osha-safety-guide.jpg"
        url="https://builddesk.com/resources/osha-safety-logs-digital-playbook"
      />
      
      <FAQSchema questions={faqData} />
      
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <BreadcrumbsNavigation />
        
        {/* Hero Section */}
        <div className="mb-12">
          <Badge className="mb-4">Safety Compliance</Badge>
          <h1 className="text-4xl font-bold tracking-tight mb-6">
            OSHA Safety Logs: Digital Playbook for Construction Teams
          </h1>
          
          {/* TL;DR Section */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-3">TL;DR - Essential Information</h2>
            <p className="text-lg leading-relaxed">
              <strong>OSHA requires construction companies (10+ employees) to maintain injury logs, incident reports, and safety training records.</strong> 
              Digital tools reduce compliance burden by 60% and help avoid $15,000+ average violation fines. 
              Key: document everything, train regularly, update within 7 days.
            </p>
          </div>

          <div className="text-lg text-muted-foreground mb-8">
            <p>OSHA compliance isn't optional—it's essential for protecting your team and business. 
            This playbook covers required records, digital workflows, and best practices for construction safety management.</p>
          </div>
        </div>

        {/* Compliance Statistics */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Why OSHA Compliance Matters</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">$15,625</div>
                <div className="text-sm text-muted-foreground">Average OSHA violation fine (2024)</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Shield className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">40%</div>
                <div className="text-sm text-muted-foreground">Reduction in workplace injuries with proper programs</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">7 days</div>
                <div className="text-sm text-muted-foreground">Required time to update OSHA logs after incident</div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Required Records */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Required OSHA Records for Construction</h2>
          <div className="space-y-4">
            {requiredRecords.map((record, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{record.form}</CardTitle>
                      <CardDescription>{record.description}</CardDescription>
                    </div>
                    <Badge variant="secondary">{record.retention}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Update Frequency:</div>
                      <div className="font-medium">{record.frequency}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Retention Period:</div>
                      <div className="font-medium">{record.retention}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Digital Workflow Steps */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Digital Safety Management Workflow</h2>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Step 1: Daily Safety Meetings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">Conduct and document daily toolbox talks:</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Required Elements:</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• Date, time, and attendees</li>
                      <li>• Safety topic covered</li>
                      <li>• Hazards identified</li>
                      <li>• Corrective actions taken</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Best Practices:</h4>
                    <ul className="space-y-1 text-sm">
                      <li>• Use mobile forms for easy entry</li>
                      <li>• Include photos of hazards</li>
                      <li>• Get electronic signatures</li>
                      <li>• Auto-sync to central database</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Step 2: Incident Reporting</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">Immediate response to workplace injuries:</p>
                <ol className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">1</span>
                    <span>Provide immediate medical attention</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">2</span>
                    <span>Report fatalities/hospitalizations to OSHA within 24 hours</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">3</span>
                    <span>Complete OSHA 301 form within 7 days</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">4</span>
                    <span>Update OSHA 300 log within 7 days</span>
                  </li>
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Step 3: Regular Safety Inspections</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">Proactive hazard identification and correction:</p>
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Inspection Checklist:</h4>
                  <div className="grid md:grid-cols-2 gap-2">
                    {[
                      "Fall protection systems",
                      "Electrical safety (GFCI, grounding)",
                      "Personal protective equipment",
                      "Tool and equipment condition",
                      "Housekeeping and site organization",
                      "Emergency exits and procedures"
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Digital Tools Benefits */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Benefits of Digital Safety Management</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Time Savings</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                    <span>60% faster form completion</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                    <span>Automated OSHA log updates</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                    <span>Instant report generation</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Compliance Benefits</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                    <span>Automatic deadline reminders</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                    <span>Complete audit trail</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                    <span>Reduced violation risk</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">OSHA Compliance FAQ</h2>
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
          <h2 className="text-2xl font-semibold mb-6">Related Safety Resources</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <Link to="/osha-compliance-software" className="font-medium hover:text-primary">
                  OSHA Compliance Software →
                </Link>
                <p className="text-sm text-muted-foreground mt-1">See BuildDesk's safety management tools</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <Link to="/resources/construction-daily-logs-best-practices" className="font-medium hover:text-primary">
                  Daily Logs Best Practices →
                </Link>
                <p className="text-sm text-muted-foreground mt-1">Document safety meetings effectively</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <Link to="/construction-field-management" className="font-medium hover:text-primary">
                  Field Management Tools →
                </Link>
                <p className="text-sm text-muted-foreground mt-1">Mobile safety forms and reporting</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">
            Simplify OSHA Compliance Today
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Stop struggling with paper forms and spreadsheets. BuildDesk's digital safety 
            management reduces compliance burden by 60% while keeping your team safer.
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

export default OSHASafetyLogsPlaybook;