import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, Check, ChevronRight, Users } from 'lucide-react';
import type { PSEOPage, ContractorPainPageSchema } from '@/types/pseo';

function Breadcrumb({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-6">
      <ol className="flex items-center gap-1 flex-wrap">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3" />}
            {item.href ? (
              <a href={item.href} className="hover:text-foreground transition-colors">
                {item.label}
              </a>
            ) : (
              <span className="text-foreground">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function HeroSection({ hero }: { hero: ContractorPainPageSchema['hero'] }) {
  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-background">
      <div className="container mx-auto px-4 max-w-4xl text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{hero.headline}</h1>
        <p className="text-xl text-muted-foreground mb-4">{hero.subheadline}</p>
        <p className="text-lg mb-3">{hero.intro}</p>
        {hero.proof_point && (
          <p className="text-sm font-medium text-primary mb-8">{hero.proof_point}</p>
        )}
        <div className="flex gap-4 justify-center">
          <Button size="lg" asChild>
            <a href="/demo">{hero.cta_primary} <ArrowRight className="ml-2 h-4 w-4" /></a>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="/pricing">{hero.cta_secondary}</a>
          </Button>
        </div>
      </div>
    </section>
  );
}

function PainSection({ painSection }: { painSection: ContractorPainPageSchema['pain_section'] }) {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4 max-w-6xl">
        <h2 className="text-3xl font-bold text-center mb-12">{painSection.section_title}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {painSection.pain_points.map((pain, i) => (
            <Card key={i} className="border-red-200/50">
              <CardContent className="pt-6">
                <h3 className="font-semibold text-lg mb-2">{pain.title}</h3>
                <p className="text-muted-foreground mb-3">{pain.description}</p>
                <p className="text-sm text-red-600 font-medium">{pain.consequence}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function SolutionSection({ solution }: { solution: ContractorPainPageSchema['solution_section'] }) {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4 max-w-6xl">
        <h2 className="text-3xl font-bold text-center mb-12">{solution.section_title}</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {solution.features.map((feature, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{feature.name}</h3>
                    <p className="text-muted-foreground text-sm mb-2">{feature.description}</p>
                    <p className="text-sm text-primary">{feature.contractor_specific_benefit}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection({ steps, title }: { steps: ContractorPainPageSchema['how_it_works']['steps']; title: string }) {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4 max-w-6xl">
        <h2 className="text-3xl font-bold text-center mb-12">{title}</h2>
        <div className="grid md:grid-cols-4 gap-8">
          {steps.map((step) => (
            <div key={step.step_number} className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4">
                {step.step_number}
              </div>
              <h3 className="font-semibold mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DifferentiationSection({ diff }: { diff: ContractorPainPageSchema['differentiation'] }) {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6 text-center">
            <Users className="h-8 w-8 mx-auto mb-3 text-primary" />
            <h3 className="text-2xl font-bold mb-2">{diff.unlimited_users_callout.headline}</h3>
            <p className="text-muted-foreground">{diff.unlimited_users_callout.description}</p>
          </CardContent>
        </Card>

        {diff.vs_spreadsheets && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4">{diff.vs_spreadsheets.headline}</h3>
            <ul className="space-y-2">
              {diff.vs_spreadsheets.comparison_points.map((point, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="h-4 w-4 mt-1 text-primary flex-shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {diff.vs_competitor && (
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-4">{diff.vs_competitor.headline}</h3>
            <ul className="space-y-2">
              {diff.vs_competitor.key_differences.map((point, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="h-4 w-4 mt-1 text-primary flex-shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function PricingSection({ pricing }: { pricing: ContractorPainPageSchema['pricing'] }) {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4 max-w-4xl text-center">
        <h2 className="text-3xl font-bold mb-6">{pricing.headline}</h2>
        <div className="bg-background rounded-xl border p-8 max-w-lg mx-auto">
          <div className="text-4xl font-bold text-primary mb-2">{pricing.starter_price}<span className="text-lg font-normal text-muted-foreground">/month</span></div>
          <p className="text-muted-foreground mb-2">{pricing.starter_description}</p>
          <p className="text-sm text-muted-foreground mb-4">{pricing.professional_description}</p>
          <Badge variant="secondary" className="text-sm">{pricing.unlimited_users_emphasis}</Badge>
          <div className="mt-6">
            <Button size="lg" className="w-full" asChild>
              <a href="/demo">Request a Demo</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQSection({ faqs }: { faqs: ContractorPainPageSchema['faq'] }) {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <section className="py-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <h2 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h2>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function RelatedPagesSection({ pages }: { pages: ContractorPainPageSchema['related_pages'] }) {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4 max-w-6xl">
        <h2 className="text-2xl font-bold mb-8">Related Resources</h2>
        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
          {pages.map((page, i) => (
            <a
              key={i}
              href={page.url}
              className="block p-4 rounded-lg border bg-background hover:border-primary/50 transition-colors"
            >
              <h3 className="font-medium text-sm mb-1">{page.title}</h3>
              <p className="text-xs text-muted-foreground">{page.relationship}</p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTABlock() {
  return (
    <section className="py-16 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 max-w-4xl text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Take Control of Your Finances?</h2>
        <p className="text-lg opacity-90 mb-8">
          Join contractors who have switched to real-time financial intelligence.
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg" variant="secondary" asChild>
            <a href="/demo">Request a Demo</a>
          </Button>
          <Button size="lg" variant="outline" className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10" asChild>
            <a href="/pricing">See Pricing</a>
          </Button>
        </div>
      </div>
    </section>
  );
}

export default function PSEOPageRenderer() {
  const params = useParams();
  const [page, setPage] = useState<PSEOPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPage();
  }, [params]);

  const loadPage = async () => {
    setIsLoading(true);
    setError(null);

    // Build the canonical URL from params
    const pathSegments = Object.values(params).filter(Boolean);
    const canonicalPath = '/' + window.location.pathname.replace(/^\//, '');

    const { data, error: fetchError } = await supabase
      .from('pseo_pages' as any)
      .select('*')
      .eq('canonical_url', canonicalPath)
      .eq('is_published', true)
      .single();

    if (fetchError || !data) {
      setError('Page not found');
      setIsLoading(false);
      return;
    }

    // Increment view count
    await supabase
      .from('pseo_pages' as any)
      .update({ view_count: ((data as any).view_count || 0) + 1 } as any)
      .eq('id', (data as any).id);

    setPage(data as unknown as PSEOPage);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-16 px-4 space-y-8">
        <Skeleton className="h-12 w-3/4 mx-auto" />
        <Skeleton className="h-6 w-1/2 mx-auto" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="container mx-auto py-16 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
        <p className="text-muted-foreground mb-8">
          The page you're looking for doesn't exist or hasn't been published yet.
        </p>
        <Button asChild>
          <a href="/">Return Home</a>
        </Button>
      </div>
    );
  }

  const schema = page.page_schema as unknown as ContractorPainPageSchema;

  // Build breadcrumb from page type
  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Software', href: '/software' },
  ];
  if (page.page_type === 'comparison') {
    breadcrumbItems[1] = { label: 'Compare', href: '/compare' };
    breadcrumbItems.push({ label: page.seo_title });
  } else {
    breadcrumbItems.push({ label: page.seo_title });
  }

  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Brikly',
    applicationCategory: 'BusinessApplication',
    description: page.seo_description,
    offers: {
      '@type': 'Offer',
      price: '350',
      priceCurrency: 'USD',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        billingDuration: 'P1M',
      },
    },
  };

  return (
    <>
      <Helmet>
        <title>{page.seo_title}</title>
        <meta name="description" content={page.seo_description} />
        <link rel="canonical" href={`https://brikly.net${page.canonical_url}`} />
        {schema.seo?.keywords && (
          <meta name="keywords" content={schema.seo.keywords.join(', ')} />
        )}
        {schema.seo?.og_title && <meta property="og:title" content={schema.seo.og_title} />}
        <meta property="og:description" content={page.seo_description} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(softwareSchema)}</script>
      </Helmet>

      <div className="min-h-screen">
        <div className="container mx-auto px-4 pt-6">
          <Breadcrumb items={breadcrumbItems} />
        </div>

        {schema.hero && <HeroSection hero={schema.hero} />}
        {schema.pain_section && <PainSection painSection={schema.pain_section} />}
        {schema.solution_section && <SolutionSection solution={schema.solution_section} />}
        {schema.how_it_works && (
          <HowItWorksSection
            steps={schema.how_it_works.steps}
            title={schema.how_it_works.section_title}
          />
        )}
        {schema.differentiation && <DifferentiationSection diff={schema.differentiation} />}
        {schema.pricing && <PricingSection pricing={schema.pricing} />}
        {schema.faq && schema.faq.length > 0 && <FAQSection faqs={schema.faq} />}
        {schema.related_pages && schema.related_pages.length > 0 && (
          <RelatedPagesSection pages={schema.related_pages} />
        )}
        <CTABlock />
      </div>
    </>
  );
}
