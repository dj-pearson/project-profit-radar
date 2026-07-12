import { CLAIMS } from '@/config/claims';
import { jsonLdSafe } from '@/lib/security/jsonLd';

/**
 * Helper that returns a JSON-LD aggregateRating block only when the rating
 * claim is verified in src/config/claims.ts. Returns undefined otherwise so
 * the field is omitted from the schema entirely (Google's structured-data
 * policy and FTC §5 prohibit hard-coded star ratings without backing data).
 */
const verifiedAggregateRating = () =>
  CLAIMS.aggregateRating.verified
    ? {
        '@type': 'AggregateRating',
        ratingValue: CLAIMS.aggregateRating.value.ratingValue.toString(),
        reviewCount: CLAIMS.aggregateRating.value.reviewCount.toString(),
      }
    : undefined;

export const OrganizationSchema = () => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: jsonLdSafe({
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Brikly",
        "url": "https://brikly.net",
        "logo": "https://brikly.net/logo.png",
        "address": {
          "@type": "PostalAddress",
          "addressCountry": "US"
        },
        "sameAs": [
          "https://linkedin.com/company/brikly",
          "https://twitter.com/brikly"
        ],
        "contactPoint": {
          "@type": "ContactPoint",
          "telephone": "+1-800-BRIKLY",
          "contactType": "Customer Service"
        }
      })
    }}
  />
);

export const SoftwareSchema = () => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: jsonLdSafe({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Brikly",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web, iOS, Android",
        "url": "https://brikly.net",
        "description": "Construction management software for small and mid-size contractors in the U.S. with job costing, scheduling, safety logs, and time tracking.",
        "offers": {
          "@type": "Offer",
          "price": "350",
          "priceCurrency": "USD",
          "priceValidUntil": "2026-12-31"
        },
        ...(verifiedAggregateRating() ? { aggregateRating: verifiedAggregateRating() } : {})
      })
    }}
  />
);

export const FAQSchema = ({ questions }: { questions: Array<{ question: string; answer: string }> }) => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: jsonLdSafe({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": questions.map(q => ({
          "@type": "Question",
          "name": q.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": q.answer
          }
        }))
      })
    }}
  />
);

export const ArticleSchema = ({ 
  title, 
  author, 
  datePublished, 
  image, 
  url 
}: {
  title: string;
  author: string;
  datePublished: string;
  image: string;
  url: string;
}) => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: jsonLdSafe({
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": title,
        "author": {
          "@type": "Person",
          "name": author
        },
        "datePublished": datePublished,
        "image": image,
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": url
        }
      })
    }}
  />
);

export const HowToSchema = ({ 
  name, 
  description, 
  steps 
}: {
  name: string;
  description: string;
  steps: Array<{ name: string; text: string }>;
}) => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: jsonLdSafe({
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": name,
        "description": description,
        "step": steps.map((step, index) => ({
          "@type": "HowToStep",
          "position": index + 1,
          "name": step.name,
          "text": step.text
        }))
      })
    }}
  />
);

export const ProductSchema = ({ 
  name, 
  description, 
  price, 
  currency = "USD",
  availability = "https://schema.org/InStock"
}: {
  name: string;
  description: string;
  price: string;
  currency?: string;
  availability?: string;
}) => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: jsonLdSafe({
        "@context": "https://schema.org",
        "@type": "Product",
        "name": name,
        "description": description,
        "offers": {
          "@type": "Offer",
          "price": price,
          "priceCurrency": currency,
          "availability": availability,
          "priceValidUntil": "2026-12-31"
        },
        ...(verifiedAggregateRating() ? { aggregateRating: verifiedAggregateRating() } : {})
      })
    }}
  />
);

export const ComparisonSchema = ({ 
  title, 
  products 
}: {
  title: string;
  products: Array<{ name: string; description: string; price: string }>;
}) => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: jsonLdSafe({
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": title,
        "itemListElement": products.map((product, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "item": {
            "@type": "Product",
            "name": product.name,
            "description": product.description,
            "offers": {
              "@type": "Offer",
              "price": product.price,
              "priceCurrency": "USD"
            }
          }
        }))
      })
    }}
  />
);