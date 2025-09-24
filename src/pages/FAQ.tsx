import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import { FAQSchema } from "@/components/seo/EnhancedSchemaMarkup";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HelpCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import BreadcrumbsNavigation from "@/components/BreadcrumbsNavigation";

const FAQ = () => {
  const faqCategories = [
    {
      title: "Getting Started",
      questions: [
        {
          question: "How quickly can I get started with BuildDesk?",
          answer: "Most small contractors are live and productive within 1-2 weeks. Our setup wizard guides you through company configuration, team setup, and project templates. No technical expertise required."
        },
        {
          question: "Do I need technical skills to use BuildDesk?",
          answer: "No. BuildDesk is designed for contractors, not IT professionals. If you can use email and text messaging, you can use BuildDesk. Our mobile app is as simple as using your phone's camera."
        },
        {
          question: "Can I import data from my current system?",
          answer: "Yes. We support data import from Excel, QuickBooks, and most construction software. Our team helps with the migration process at no extra cost during onboarding."
        },
        {
          question: "Is there a limit on the number of users?",
          answer: "No user limits on any plan. Add your entire team - office staff, field crews, subcontractors, and even clients to the portal. One flat monthly fee covers everyone."
        }
      ]
    },
    {
      title: "Features & Functionality",
      questions: [
        {
          question: "Does BuildDesk work offline?",
          answer: "Yes. Our mobile apps work fully offline for field teams. When connectivity returns, all data syncs automatically. Critical for job sites with poor cell service."
        },
        {
          question: "How does the QuickBooks integration work?",
          answer: "Two-way sync keeps your books current automatically. Job costs, invoices, expenses, and payments sync in real-time. No double data entry required."
        },
        {
          question: "Can I track OSHA compliance and safety?",
          answer: "Yes. Built-in OSHA forms, safety meeting tracking, incident reporting, and automated compliance reminders. Keep your team safe and avoid costly violations."
        },
        {
          question: "Does it handle change orders?",
          answer: "Yes. Digital change order workflow with client approval, electronic signatures, and automatic budget updates. Track every change with full audit trail."
        }
      ]
    },
    {
      title: "Pricing & Plans",
      questions: [
        {
          question: "How much does BuildDesk cost compared to Procore?",
          answer: "BuildDesk costs 60-70% less than Procore. Our Professional plan ($299/month) includes features that cost $800-1,500+ monthly with Procore. Same core functionality, better price for small contractors."
        },
        {
          question: "Are there setup fees or hidden costs?",
          answer: "No setup fees, no per-user charges, no hidden costs. Your monthly subscription includes everything: software, mobile apps, integrations, support, and data storage."
        },
        {
          question: "Can I cancel anytime?",
          answer: "Yes. Month-to-month billing with no long-term contracts. Cancel anytime. Your data remains accessible for 90 days after cancellation for export."
        },
        {
          question: "Do you offer discounts for annual payment?",
          answer: "Yes. Save 20% with annual billing. Most small contractors see 300-500% ROI in the first year, making the investment easy to justify."
        }
      ]
    },
    {
      title: "Support & Training",
      questions: [
        {
          question: "What kind of support do you provide?",
          answer: "Live chat, phone, and email support during business hours. Real people who understand construction, not overseas call centers. Average response time under 2 hours."
        },
        {
          question: "Do you provide training for my team?",
          answer: "Yes. Free onboarding training for your team included with every plan. We also provide ongoing training webinars and a comprehensive knowledge base."
        },
        {
          question: "How do I get help if I'm stuck?",
          answer: "Multiple ways: in-app help button, phone support, live chat, or email. We also have video tutorials and step-by-step guides for every feature."
        }
      ]
    }
  ];

  // Flatten all questions for FAQ schema
  const allFAQs = faqCategories.flatMap(category => category.questions);

  return (
    <div className="min-h-screen bg-background">
      <SEOMetaTags
        title="Frequently Asked Questions | BuildDesk Construction Management"
        description="Get answers to common questions about BuildDesk construction management software. Setup, features, pricing, support, and more for small contractors."
        keywords={[
          'builddesk faq',
          'construction software questions',
          'builddesk help',
          'construction management software support',
          'builddesk pricing questions'
        ]}
        canonicalUrl="/faq"
      />
      
      <FAQSchema questions={allFAQs} />
      
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <BreadcrumbsNavigation />
        
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Get quick answers to common questions about BuildDesk construction management software.
            Can't find what you're looking for? Our support team is here to help.
          </p>
        </div>

        {/* FAQ Categories */}
        {faqCategories.map((category, categoryIndex) => (
          <section key={categoryIndex} className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <HelpCircle className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-semibold">{category.title}</h2>
            </div>
            <div className="space-y-4">
              {category.questions.map((faq, questionIndex) => (
                <Card key={questionIndex}>
                  <CardHeader>
                    <CardTitle className="text-lg">{faq.question}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))}

        {/* Popular Resources */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-center">Popular Resources</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <Badge className="w-fit mb-2">Setup Guide</Badge>
                <CardTitle className="text-lg">Getting Started</CardTitle>
                <CardDescription>Complete onboarding checklist for new users</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/resources">
                    View Guide <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Badge className="w-fit mb-2">Features</Badge>
                <CardTitle className="text-lg">Feature Overview</CardTitle>
                <CardDescription>Complete list of BuildDesk capabilities</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/features">
                    View Features <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Badge className="w-fit mb-2">Comparison</Badge>
                <CardTitle className="text-lg">vs. Competitors</CardTitle>
                <CardDescription>See how BuildDesk compares to other solutions</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/procore-alternative-detailed">
                    View Comparison <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Contact Support */}
        <div className="bg-primary/5 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">
            Still Have Questions?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Our construction-focused support team is here to help. Get personalized answers 
            to your specific questions about BuildDesk and construction management.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/auth">Start Free Trial</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/support">
                Contact Support <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default FAQ;