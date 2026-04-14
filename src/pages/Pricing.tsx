import React from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { PageSEO, createBreadcrumbSchema, createProductSchema } from "@/components/seo/PageSEO";
import { GEOOptimizedFAQ, pricingFAQs } from "@/components/seo/GEOOptimizedFAQ";
import { QuickAnswerSnippet, LastUpdated } from "@/components/seo/QuickAnswerSnippet";
import Pricing from "@/components/Pricing";
import BreadcrumbsNavigation from "@/components/BreadcrumbsNavigation";
import StickyDemoCTA from "@/components/StickyDemoCTA";
import { SaaSProductSchema } from "@/components/seo/SaaSProductSchema";
import { CLAIMS, ifVerifiedSchema } from "@/config/claims";

const PricingPage = () => {
  // Structured data for pricing page
  const breadcrumbSchema = createBreadcrumbSchema([
    { name: "Home", url: "https://brikly.net" },
    { name: "Pricing", url: "https://brikly.net/pricing" }
  ]);

  // FTC / Google structured-data compliance: the aggregateRating block is
  // ONLY emitted when the underlying review count is verified. Hard-coded
  // ratings are misleading "express claims" and create FTC §5 / state-AG
  // exposure. Toggle CLAIMS.aggregateRating.verified once real review data
  // is plugged in (see src/config/claims.ts).
  const verifiedRating = ifVerifiedSchema(CLAIMS.aggregateRating);
  const productSchema = createProductSchema(
    "Brikly Construction Management Software",
    "Complete construction management platform for small contractors with job costing, scheduling, mobile apps, and OSHA compliance.",
    "350",
    verifiedRating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: verifiedRating.ratingValue.toString(),
            reviewCount: verifiedRating.reviewCount.toString(),
            bestRating: verifiedRating.bestRating.toString(),
            worstRating: verifiedRating.worstRating.toString(),
          },
        }
      : undefined,
  );

  return (
    <>
      <PageSEO
        title="Brikly Pricing - $350/Month Unlimited Users | Construction Software"
        description="Simple, transparent pricing for construction management software. $350/month with unlimited users, job costing, scheduling, mobile apps, OSHA compliance, QuickBooks sync. 14-day free trial. No setup fees."
        keywords={[
          'construction software pricing',
          'construction management software cost',
          'brikly pricing',
          'contractor software pricing',
          'construction project management pricing',
          'job costing software cost',
          'procore alternative pricing',
          'affordable construction software'
        ]}
        canonicalUrl="/pricing"
        schema={[breadcrumbSchema, productSchema]}
        lastModified="2025-11-07"
      />

      {/*
        Enhanced SEO: Comprehensive SaaS Product Schema for Rich Results.
        includeReviews defaults to the verified-claim flag — when no real
        aggregate rating data is available, the reviews block is suppressed
        to avoid emitting unsubstantiated structured data.
      */}
      <SaaSProductSchema
        includeReviews={CLAIMS.aggregateRating.verified}
        includeOffers={true}
        includeFeatures={true}
      />

      <div className="min-h-screen bg-gradient-to-br from-construction-light via-white to-construction-light/30">
        <Header />
        <main className="py-12">
          <div className="container mx-auto px-4">
            {/* Breadcrumbs */}
            <BreadcrumbsNavigation className="mb-6" />

            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-construction-dark mb-4">
                Simple, Transparent Pricing for Small Contractors
              </h1>
              <LastUpdated date="November 2025" />
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-6">
                $350/month with unlimited users. No per-seat fees, no setup charges, no hidden costs. Start your 14-day free trial today.
              </p>
            </div>

            <QuickAnswerSnippet
              question="How much does Brikly construction management software cost?"
              answer="Brikly costs $350/month with unlimited users and all features included. This is 50% less than Procore ($500+/month per user) and includes no hidden fees, no per-seat charges, and no setup costs. A 14-day free trial is available with no credit card required."
            />

            <Pricing />

            {/*
              Auto-renewal disclosure required by FTC Negative Option Rule
              ("click-to-cancel"), ROSCA, and parallel state laws (e.g.,
              California Auto-Renewal Law, Cal. Bus. & Prof. Code §17602).
              Displayed before the FAQ so it appears above the fold on most
              viewports — auto-renewal terms must be "clear and conspicuous"
              before purchase.
            */}
            <section
              aria-labelledby="auto-renewal-disclosure"
              className="mt-12 max-w-3xl mx-auto bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6 text-sm text-construction-dark"
            >
              <h2
                id="auto-renewal-disclosure"
                className="font-semibold text-base mb-2"
              >
                Important subscription terms — please review before subscribing
              </h2>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <strong>Auto-renewal:</strong> Subscriptions automatically renew
                  at the end of each billing period (monthly or annual) at the
                  then-current rate plus applicable taxes, charged to your
                  payment method on file, until you cancel.
                </li>
                <li>
                  <strong>Free trial:</strong> The 14-day free trial converts to
                  a paid subscription at the end of the trial unless cancelled.
                  We email you at least 3 days before any first paid charge.
                </li>
                <li>
                  <strong>Cancel anytime — click to cancel:</strong> Cancel from
                  your{" "}
                  <Link
                    to="/subscription-settings"
                    className="text-construction-orange underline"
                  >
                    Subscription Settings
                  </Link>{" "}
                  in one click, or email{" "}
                  <a
                    href="mailto:billing@brikly.net"
                    className="text-construction-orange underline"
                  >
                    billing@brikly.net
                  </a>
                  . No phone calls, no retention pitches.
                </li>
                <li>
                  <strong>Refunds:</strong> See our{" "}
                  <Link
                    to="/refund-policy"
                    className="text-construction-orange underline"
                  >
                    Refund &amp; Cancellation Policy
                  </Link>{" "}
                  for full terms, including the 30-day satisfaction guarantee
                  and pro-rated annual refunds.
                </li>
                <li>
                  <strong>Taxes:</strong> Prices exclude applicable sales tax,
                  VAT, or GST, calculated at checkout based on your billing
                  address.
                </li>
                <li>
                  By starting a subscription you agree to our{" "}
                  <Link
                    to="/terms-of-service"
                    className="text-construction-orange underline"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    to="/privacy-policy"
                    className="text-construction-orange underline"
                  >
                    Privacy Policy
                  </Link>
                  .
                </li>
              </ul>
            </section>

            {/* GEO-Optimized FAQ Section */}
            <div className="mt-16">
              <GEOOptimizedFAQ
                faqs={pricingFAQs}
                title="Pricing & Billing Questions"
                description="Get answers to common questions about Brikly pricing, billing, and plans"
              />
            </div>
          </div>
        </main>
        <Footer />
        <StickyDemoCTA />
      </div>
    </>
  );
};

export default PricingPage;
