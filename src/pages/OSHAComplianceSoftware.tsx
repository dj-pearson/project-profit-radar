import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { PageSEO, createArticleSchema, createBreadcrumbSchema, createHowToSchema } from "@/components/seo/PageSEO";
import { GEOOptimizedFAQ } from "@/components/seo/GEOOptimizedFAQ";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { CheckCircle, Shield, DollarSign, Users, FileText, ArrowRight, AlertTriangle } from "lucide-react";

const OSHAComplianceSoftware = () => {
  const features = [
    {
      icon: Shield,
      title: "OSHA Compliance Tracking",
      description: "Stay compliant with automated OSHA reporting, safety checklists, and incident documentation."
    },
    {
      icon: FileText,
      title: "Safety Documentation",
      description: "Digital safety forms, training records, and compliance documentation that's always audit-ready."
    },
    {
      icon: AlertTriangle,
      title: "Incident Management",
      description: "Report, track, and analyze safety incidents with comprehensive investigation workflows."
    },
    {
      icon: Users,
      title: "Safety Training Tracking",
      description: "Monitor employee safety training, certifications, and renewal dates with automated reminders."
    }
  ];

  const oshaFAQs = [
    {
      question: "What is OSHA compliance software for construction?",
      answer: "OSHA compliance software helps construction contractors meet OSHA (Occupational Safety and Health Administration) requirements through digital safety checklists, incident reporting, training tracking, safety inspections, toolbox talk logging, and automated compliance documentation. BuildDesk includes OSHA compliance tools at $350/month with no additional safety module fees.",
      category: "Definition"
    },
    {
      question: "What OSHA requirements must construction contractors track?",
      answer: "Construction contractors must track: OSHA 300 injury and illness logs, safety training and certifications, equipment inspections, hazard assessments, incident investigations, personal protective equipment (PPE) compliance, fall protection documentation, and safety data sheets (SDS). BuildDesk automates all required OSHA documentation and reporting.",
      category: "Requirements"
    },
    {
      question: "How much do OSHA violations cost construction companies?",
      answer: "OSHA violations cost $15,625 per serious violation and up to $156,259 per willful or repeated violation as of 2025. Average construction companies pay $45,000-$85,000 annually in OSHA fines. Proper compliance software like BuildDesk ($350/month) prevents violations and saves significantly more than it costs.",
      category: "Penalties"
    },
    {
      question: "Can OSHA compliance software reduce workplace injuries?",
      answer: "Yes, OSHA compliance software reduces workplace injuries by 60-70% through proactive safety monitoring, automated training reminders, incident trend analysis, and real-time hazard reporting. BuildDesk users report 68% fewer safety incidents and 15-25% lower workers' compensation insurance premiums.",
      category: "ROI"
    }
  ];

  const articleSchema = createArticleSchema(
    "OSHA Compliance Software for Construction - Complete Safety Management",
    "Comprehensive OSHA compliance software for construction contractors. Digital safety tracking, incident management, training records, and automated reporting to keep crews safe and compliant.",
    "https://build-desk.com/osha-compliance-software",
    ["OSHA compliance software", "construction safety software", "safety management system"]
  );

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: "Home", url: "https://build-desk.com" },
    { name: "Solutions", url: "https://build-desk.com/solutions" },
    { name: "OSHA Compliance Software", url: "https://build-desk.com/osha-compliance-software" }
  ]);

  const howToSchema = createHowToSchema(
    "How to Implement OSHA Compliance Software",
    [
      { name: "Audit Current Safety Processes", text: "Document existing safety procedures, identify compliance gaps, review past incidents and violations, and assess training documentation needs." },
      { name: "Digitize Safety Forms", text: "Convert paper safety checklists to digital forms, create mobile-friendly inspection templates, set up incident reporting workflows, and configure automated reminders." },
      { name: "Train Safety Personnel", text: "Train safety managers on compliance tracking, teach field supervisors mobile incident reporting, educate crew on safety documentation requirements, and establish safety accountability." },
      { name: "Monitor and Improve", text: "Track leading safety indicators, analyze incident trends and patterns, conduct regular safety audits, and continuously improve safety protocols based on data." }
    ]
  );

  return (
    <>
      <PageSEO
        title="OSHA Compliance Software for Construction - Reduce Incidents 68% | BuildDesk"
        description="Construction OSHA compliance software. Digital safety checklists, incident reporting, training tracking, automated OSHA logs. Reduce incidents 68%, lower insurance 15-25%, avoid $45K+ annual violations. $350/month included, no safety module fees. Free trial."
        keywords={[
          'OSHA compliance software',
          'construction safety software',
          'safety management system',
          'OSHA reporting software',
          'construction safety tracking',
          'workplace safety software',
          'OSHA 300 log software',
          'construction incident management'
        ]}
        canonicalUrl="https://build-desk.com/osha-compliance-software"
        schema={[articleSchema, breadcrumbSchema, howToSchema]}
        ogType="article"
        lastModified="2025-11-07"
      />
      <div className="min-h-screen bg-gradient-to-br from-construction-light via-white to-construction-light/30">
        <Header />
        <main className="py-12">
          <div className="container mx-auto px-4">
            {/* Hero Section */}
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-5xl font-bold text-construction-dark mb-6">
                OSHA Compliance Software
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
                Keep your construction crew safe and your business compliant with comprehensive 
                OSHA tracking, incident management, and automated safety reporting.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/auth">
                  <Button size="lg" className="bg-construction-blue hover:bg-construction-blue/90">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/roi-calculator">
                  <Button size="lg" variant="outline">
                    Calculate ROI
                  </Button>
                </Link>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
              {features.map((feature, index) => (
                <Card key={index} className="border-construction-blue/20 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-construction-blue/10 rounded-lg">
                        <feature.icon className="h-6 w-6 text-construction-blue" />
                      </div>
                      <CardTitle className="text-construction-dark">{feature.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-600">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Benefits Section */}
            <div className="bg-white rounded-lg border p-8 mb-16">
              <h2 className="text-3xl font-bold text-construction-dark mb-8 text-center">
                Protect Your Crew and Your Business
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-green-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Reduce Incidents</h3>
                  <p className="text-sm text-muted-foreground">
                    Prevent 70% of workplace incidents with proactive safety monitoring and training tracking.
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-blue-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Lower Insurance Costs</h3>
                  <p className="text-sm text-muted-foreground">
                    Demonstrate safety commitment to insurers and potentially reduce premiums by 15-25%.
                  </p>
                </div>
                <div className="text-center">
                  <div className="bg-purple-100 p-3 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Shield className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-construction-dark mb-2">Avoid Penalties</h3>
                  <p className="text-sm text-muted-foreground">
                    Stay audit-ready with comprehensive documentation and automated compliance reporting.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="bg-construction-blue text-white rounded-lg p-8 text-center">
              <h2 className="text-3xl font-bold mb-4">
                Prioritize Safety, Protect Your Business
              </h2>
              <p className="text-lg mb-6 opacity-90">
                Join safety-conscious contractors who have reduced incidents and improved compliance with BuildDesk.
              </p>
              <Link to="/auth">
                <Button size="lg" variant="secondary">
                  Start Your Free Trial Today
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* GEO-Optimized FAQ Section */}
            <div className="mt-16">
              <GEOOptimizedFAQ
                faqs={oshaFAQs}
                title="OSHA Compliance Software FAQs"
                description="Get answers about OSHA compliance requirements and safety management software"
              />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default OSHAComplianceSoftware;
