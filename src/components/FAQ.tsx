import React from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mail } from "lucide-react";
import { Link } from "react-router-dom";

// FAQ structured data generator
const faqStructuredData = (faqs: Array<{question: string; answer: string}>) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqs.map(faq => ({
    "@type": "Question",
    "name": faq.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": faq.answer
    }
  }))
});

interface FaqItem {
  question: string;
  answer: string;
  richAnswer?: React.ReactNode;
}

const faqs: FaqItem[] = [
  {
    question: "Is BuildDesk a good alternative to Procore for small contractors?",
    answer: "Yes, BuildDesk is specifically designed for small and medium contractors who find Procore too expensive and complex. We offer the same core functionality - project management, job costing, and team collaboration - at a fraction of the cost with unlimited users and simpler workflows.",
    richAnswer: (
      <div className="space-y-2">
        <p>Yes, BuildDesk is specifically designed for small and medium contractors who find Procore too expensive and complex. Key advantages:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li><Link to="/features/job-costing" className="text-construction-orange hover:underline">Real-time job costing</Link> at a fraction of Procore's cost</li>
          <li>Unlimited users included (no per-seat charges)</li>
          <li>Simpler workflows built for SMB contractors</li>
          <li>Same core functionality: project management, team collaboration</li>
        </ul>
      </div>
    ),
  },
  {
    question: "How does BuildDesk compare to Buildertrend pricing?",
    answer: "BuildDesk offers transparent, affordable pricing starting at $149/month with unlimited users, while Buildertrend charges per user. Most small contractors save 40-60% switching to BuildDesk while gaining better mobile functionality and QuickBooks integration.",
    richAnswer: (
      <div className="space-y-2">
        <p>BuildDesk offers transparent, affordable <a href="/#pricing" className="text-construction-orange hover:underline">pricing</a> with major savings over Buildertrend:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Starting at $149/month with unlimited users</li>
          <li>Buildertrend charges per user — costs add up quickly</li>
          <li>Most contractors save 40-60% by switching</li>
          <li>Better mobile functionality and QuickBooks integration included</li>
        </ul>
      </div>
    ),
  },
  {
    question: "Does BuildDesk integrate with QuickBooks?",
    answer: "Yes, BuildDesk has native QuickBooks integration that syncs your job costs, invoices, and financial data in real-time. This eliminates double data entry and keeps your books current automatically.",
    richAnswer: (
      <div className="space-y-2">
        <p>Yes, BuildDesk has native QuickBooks <Link to="/integrations" className="text-construction-orange hover:underline">integration</Link> with full 2-way sync:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Real-time sync of job costs, invoices, and financial data</li>
          <li>Eliminates double data entry completely</li>
          <li>Automatic categorization and reconciliation</li>
          <li>Keeps your books current without manual effort</li>
        </ul>
      </div>
    ),
  },
  {
    question: "Can BuildDesk help with OSHA compliance?",
    answer: "Absolutely. BuildDesk includes automated OSHA compliance tools, safety meeting schedulers, incident reporting, and digital safety checklists. We help you stay compliant while reducing paperwork and administrative burden.",
    richAnswer: (
      <div className="space-y-2">
        <p>Absolutely. BuildDesk includes comprehensive OSHA compliance tools:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Automated compliance tracking and alerts</li>
          <li>Safety meeting schedulers with documentation</li>
          <li>Digital incident reporting and investigation</li>
          <li>Customizable safety checklists for field crews</li>
        </ul>
      </div>
    ),
  },
  {
    question: "Is there a free trial for construction management software?",
    answer: "Yes, BuildDesk offers a 14-day free trial with full access to all features. No credit card required. You can test real-time job costing, mobile field management, and team collaboration risk-free."
  },
  {
    question: "What makes BuildDesk different from other construction software?",
    answer: "BuildDesk is built specifically for small-medium contractors who need enterprise features without enterprise complexity. We offer unlimited users, mobile-first design, real-time job costing, and seamless QuickBooks integration at SMB-friendly pricing."
  },
  {
    question: "Does BuildDesk work on mobile devices for field crews?",
    answer: "Yes, BuildDesk is mobile-first with full offline capabilities. Field crews can track time, update project progress, capture photos, and access project documents even without internet connection. Everything syncs automatically when connected."
  },
  {
    question: "How long does it take to implement BuildDesk?",
    answer: "Most contractors are fully operational within 30 days. Our <a href='/#implementation'>implementation process</a> includes data migration, team training, and workflow setup. We guarantee you'll be live in 30 days or get your money back."
  }
];

const FAQ = () => {
  return (
    <section className="py-20 bg-muted/50">
      <SEOMetaTags structuredData={[faqStructuredData(faqs)]} />
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get answers to common questions about BuildDesk construction management software
          </p>
        </div>
        
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible>
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.richAnswer || faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {/* CTA Section */}
          <div className="text-center mt-12 pt-12 border-t border-border/50">
            <h3 className="text-2xl font-bold mb-2">Still Have Questions?</h3>
            <p className="text-muted-foreground mb-6">
              Our team is here to help you find the right solution for your business.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="lg" asChild>
                <Link to="/auth">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="mailto:support@build-desk.com">
                  <Mail className="mr-2 h-5 w-5" />
                  Contact Sales
                </a>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              14-day free trial. No credit card required.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;