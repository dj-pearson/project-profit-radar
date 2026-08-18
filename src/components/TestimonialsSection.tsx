import React from 'react';
import { jsonLdSafe } from '@/lib/security/jsonLd';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Quote, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  CLAIMS,
  renderableClientReferences,
  renderableTestimonials,
  type TestimonialClaim,
} from '@/config/claims';

/**
 * Customer endorsement surfaces.
 *
 * NOTE: this file previously rendered six fabricated customers ("Mike
 * Rodriguez / Rodriguez Custom Homes", "Sarah Chen / Metro Build Group", and
 * four more), each with an invented financial outcome and a "Verified User"
 * badge, plus a JSON-LD aggregateRating of 4.9 from 500 reviews that no
 * reviews supported. ClientLogosSection listed six invented client companies.
 * Those are FTC Act Section 5 and FTC Endorsement Guide (16 C.F.R. Part 255)
 * violations and have been removed. The same cleanup was already applied to
 * SocialProof.tsx; this file was missed in that pass.
 *
 * Everything rendered here now comes from the src/config/claims.ts registry
 * and appears only when the claim is verified and each entry names where its
 * signed permission is filed. With the registry empty, the endorsement grid
 * and the rating JSON-LD render nothing at all.
 *
 * To publish a real testimonial:
 *   1. Get the customer's written permission and file it.
 *   2. Add a TestimonialClaim to CLAIMS.testimonials with permissionSource set.
 *   3. Disclose any material connection (payment, free service, employment)
 *      in materialConnection - 16 C.F.R. 255.5 requires it.
 *   4. Flip CLAIMS.testimonials.verified to true.
 */

interface TestimonialProps extends TestimonialClaim {
  metric?: {
    label: string;
    value: string;
    icon: React.ReactNode;
  };
}

export const TestimonialCard: React.FC<TestimonialProps> = ({
  quote,
  author,
  title,
  company,
  rating,
  date,
  metric,
  materialConnection,
  permissionSource,
}) => {
  // A card without filed permission is never renderable, whatever the caller
  // passes in. This is the last line of defence behind the claims registry.
  if (!permissionSource) return null;

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between mb-3">
          {typeof rating === 'number' && (
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
          )}
          <Quote className="h-6 w-6 text-muted-foreground opacity-50" />
        </div>

        {metric && (
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg mb-4">
            {metric.icon}
            <div>
              <div className="font-semibold text-green-800">{metric.value}</div>
              <div className="text-sm text-green-600">{metric.label}</div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <blockquote className="text-muted-foreground mb-4 leading-relaxed">
          "{quote}"
        </blockquote>

        <div className="border-t pt-4">
          <div className="font-medium">{author}</div>
          <div className="text-sm text-muted-foreground">{title}</div>
          <div className="text-sm text-muted-foreground font-medium">{company}</div>
          {date && <div className="text-xs text-muted-foreground mt-1">{date}</div>}
          {/* 16 C.F.R. 255.5 - a material connection must be disclosed
              clearly and conspicuously alongside the endorsement. */}
          {materialConnection && (
            <Badge variant="secondary" className="mt-2 text-xs font-normal">
              {materialConnection}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const TestimonialsSection: React.FC = () => {
  const testimonials = renderableTestimonials();

  // Nothing substantiated to show yet. Render the section's own value
  // proposition rather than inventing customers to fill the space.
  if (testimonials.length === 0) {
    return (
      <section className="py-12">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">
            See where every project stands
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Real-time job costing, change orders, and daily reports in one place.
            Start a free trial and check the numbers against your own jobs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="lg" asChild>
              <Link to="/auth">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href="/#pricing">View Pricing</a>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">What contractors tell us</h2>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {testimonials.map((testimonial) => (
          <TestimonialCard key={`${testimonial.author}-${testimonial.company}`} {...testimonial} />
        ))}
      </div>

      {/*
        Structured data. Google's structured-data policy and the FTC both
        require the underlying data to be true and visible on the page, so
        aggregateRating is emitted only when that claim is separately
        verified, and reviews only for permissioned endorsements.
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdSafe({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: 'Brikly Construction Management Software',
            ...(CLAIMS.aggregateRating.verified
              ? {
                  aggregateRating: {
                    '@type': 'AggregateRating',
                    ratingValue: String(CLAIMS.aggregateRating.value.ratingValue),
                    reviewCount: String(CLAIMS.aggregateRating.value.reviewCount),
                    bestRating: String(CLAIMS.aggregateRating.value.bestRating),
                  },
                }
              : {}),
            review: testimonials
              .filter((t) => typeof t.rating === 'number')
              .map((t) => ({
                '@type': 'Review',
                author: { '@type': 'Person', name: t.author },
                reviewBody: t.quote,
                reviewRating: {
                  '@type': 'Rating',
                  ratingValue: t.rating,
                  bestRating: 5,
                },
              })),
          }),
        }}
      />

      <div className="text-center mt-12 pt-8 border-t border-border/30">
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="hero" size="lg" asChild>
            <Link to="/auth">
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <a href="/#pricing">View Pricing</a>
          </Button>
        </div>
      </div>
    </section>
  );
};

export const ClientLogosSection: React.FC = () => {
  const clients = renderableClientReferences();

  // No permissioned client names on file - render nothing rather than a
  // "Trusted by N contractors" band over invented company names.
  if (clients.length === 0) return null;

  return (
    <section className="py-12 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-semibold mb-2">Contractors using Brikly</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 items-center opacity-60">
          {clients.map((client) => (
            <div key={client.name} className="text-center">
              <div className="bg-white p-4 rounded-lg shadow-sm mb-2 h-16 flex items-center justify-center">
                <span className="font-semibold text-sm text-gray-600">{client.name}</span>
              </div>
              <Badge variant="secondary" className="text-xs">{client.industry}</Badge>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
