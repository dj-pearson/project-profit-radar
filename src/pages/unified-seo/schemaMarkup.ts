import type { SEOConfig } from './types';

/** The JSON-LD blocks the "Generate Schema Markup" quick action copies to the clipboard. */
export function buildSchemaMarkup(config: SEOConfig): string {
  // Generate comprehensive schema markup for the construction business
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": config.site_name,
    "description": config.site_description,
    "url": config.canonical_domain,
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "149",
      "priceCurrency": "USD",
      "priceValidUntil": "2025-12-31"
    },
    "publisher": {
      "@type": "Organization",
      "name": config.site_name,
      "url": config.canonical_domain,
      "logo": {
        "@type": "ImageObject",
        "url": config.default_og_image
      }
    }
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": config.canonical_domain
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Features",
        "item": `${config.canonical_domain}/features`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": "Pricing",
        "item": `${config.canonical_domain}/pricing`
      }
    ]
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is Brikly?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Brikly is a construction management platform designed for small to medium-sized construction businesses, providing real-time project management, financial tracking, and collaborative tools."
        }
      },
      {
        "@type": "Question",
        "name": "How much does Brikly cost?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Brikly offers tiered pricing starting at $149/month for unlimited users, providing comprehensive construction management features without per-user fees."
        }
      },
      {
        "@type": "Question",
        "name": "What industries does Brikly serve?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Brikly serves construction companies, contractors, project managers, and construction professionals across various construction industry sectors."
        }
      }
    ]
  };

  return `<!-- Schema.org JSON-LD markup for ${config.site_name} -->
<script type="application/ld+json">
${JSON.stringify(organizationSchema, null, 2)}
</script>

<script type="application/ld+json">
${JSON.stringify(breadcrumbSchema, null, 2)}
</script>

<script type="application/ld+json">
${JSON.stringify(faqSchema, null, 2)}
</script>`;
}
