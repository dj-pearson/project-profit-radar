import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SEOMetaTags } from "@/components/SEOMetaTags";

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

const faqs = [
  {
    question: "Is BuildDesk a good alternative to Procore for small contractors?",
    answer: "Yes, BuildDesk is specifically designed for small and medium contractors who find Procore too expensive and complex. We offer the same core functionality - project management, job costing, and team collaboration - at a fraction of the cost with unlimited users and simpler workflows."
  },
  {
    question: "How does BuildDesk compare to Buildertrend pricing?",
    answer: "BuildDesk offers transparent, affordable pricing starting at $149/month with unlimited users, while Buildertrend charges per user. Most small contractors save 40-60% switching to BuildDesk while gaining better mobile functionality and QuickBooks integration."
  },
  {
    question: "Does BuildDesk integrate with QuickBooks?",
    answer: "Yes, BuildDesk has native QuickBooks integration that syncs your job costs, invoices, and financial data in real-time. This eliminates double data entry and keeps your books current automatically."
  },
  {
    question: "Can BuildDesk help with OSHA compliance?",
    answer: "Absolutely. BuildDesk includes automated OSHA compliance tools, safety meeting schedulers, incident reporting, and digital safety checklists. We help you stay compliant while reducing paperwork and administrative burden."
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
    answer: "Most contractors are fully operational within 30 days. Our implementation includes data migration, team training, and workflow setup. We guarantee you'll be live in 30 days or get your money back."
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
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQ;