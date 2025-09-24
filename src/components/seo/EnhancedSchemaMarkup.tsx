import React from 'react';

export const OrganizationSchema = () => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "BuildDesk",
        "url": "https://builddesk.com",
        "logo": "https://builddesk.com/logo.png",
        "address": {
          "@type": "PostalAddress",
          "addressCountry": "US"
        },
        "sameAs": [
          "https://linkedin.com/company/builddesk",
          "https://twitter.com/builddesk"
        ],
        "contactPoint": {
          "@type": "ContactPoint",
          "telephone": "+1-800-BUILD-DESK",
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
      __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "BuildDesk",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web, iOS, Android",
        "url": "https://builddesk.com",
        "description": "Construction management software for small and mid-size contractors in the U.S. with job costing, scheduling, safety logs, and time tracking.",
        "offers": {
          "@type": "Offer",
          "price": "149",
          "priceCurrency": "USD",
          "priceValidUntil": "2025-12-31"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.8",
          "reviewCount": "247"
        }
      })
    }}
  />
);

export const FAQSchema = ({ questions }: { questions: Array<{ question: string; answer: string }> }) => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: JSON.stringify({
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
      __html: JSON.stringify({
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