/**
 * SaaSProductSchema Component
 *
 * Comprehensive Schema.org markup optimized for B2B SaaS products.
 * Helps achieve rich snippets in search results with:
 * - Product information
 * - Pricing and subscription details
 * - Customer reviews and ratings
 * - Free trial offers
 * - Feature highlights
 * - Support information
 *
 * This component significantly improves SEO by:
 * 1. Enabling rich snippets in Google search results
 * 2. Improving visibility in product searches
 * 3. Displaying star ratings in search results
 * 4. Showing pricing information directly in SERPs
 * 5. Optimizing for voice search queries
 *
 * Usage:
 * <SaaSProductSchema
 *   includeReviews={true}
 *   includeOffers={true}
 * />
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SaaSProductSchemaProps {
  /**
   * Whether to include aggregate rating and review data
   * @default true
   */
  includeReviews?: boolean;

  /**
   * Whether to include pricing and offer information
   * @default true
   */
  includeOffers?: boolean;

  /**
   * Whether to include detailed feature list
   * @default true
   */
  includeFeatures?: boolean;

  /**
   * Custom application category (defaults to BusinessApplication)
   */
  applicationCategory?: string;

  /**
   * Additional schema properties to merge
   */
  additionalProps?: Record<string, unknown>;
}

export const SaaSProductSchema: React.FC<SaaSProductSchemaProps> = ({
  includeReviews = true,
  includeOffers = true,
  includeFeatures = true,
  applicationCategory = 'BusinessApplication',
  additionalProps = {},
}) => {
  const baseSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'BuildDesk',
    applicationCategory: applicationCategory,
    applicationSubCategory: 'Construction Management Software',
    operatingSystem: 'Web, iOS, Android',
    url: 'https://builddesk.com',
    description: 'Comprehensive construction management software for small to medium-sized contractors. Features real-time job costing, project scheduling, mobile crew tracking, OSHA compliance, and QuickBooks integration. Built specifically for the construction industry.',

    // Publisher/Developer Information
    author: {
      '@type': 'Organization',
      name: 'BuildDesk',
      url: 'https://builddesk.com',
      logo: 'https://builddesk.com/logo.png',
    },

    // Download/Access URLs
    downloadUrl: 'https://builddesk.com/get-started',
    installUrl: 'https://builddesk.com/get-started',

    // Screenshots and Media
    screenshot: [
      'https://api.build-desk.com/storage/v1/object/public/site-assets/screenshots/dashboard.png',
      'https://api.build-desk.com/storage/v1/object/public/site-assets/screenshots/job-costing.png',
      'https://api.build-desk.com/storage/v1/object/public/site-assets/screenshots/mobile-app.png',
      'https://api.build-desk.com/storage/v1/object/public/site-assets/screenshots/scheduling.png',
    ],

    // Software metadata
    datePublished: '2024-01-01',
    softwareVersion: '2.0',
    releaseNotes: 'https://builddesk.com/changelog',

    // Support Information
    offers: includeOffers ? {
      '@type': 'Offer',
      price: '350',
      priceCurrency: 'USD',
      priceValidUntil: '2026-12-31',
      availability: 'https://schema.org/InStock',
      url: 'https://builddesk.com/pricing',

      // Subscription Details
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: '350',
        priceCurrency: 'USD',
        unitText: 'MONTH',
        billingIncrement: 1,
        billingDuration: 'P1M',
        referenceQuantity: {
          '@type': 'QuantityValue',
          value: 1,
          unitText: 'Unlimited Users',
        },
      },

      // Free Trial Offer
      eligibleQuantity: {
        '@type': 'QuantityValue',
        value: 14,
        unitText: 'DAY',
      },

      // What's included
      itemOffered: {
        '@type': 'Service',
        name: 'BuildDesk Subscription',
        description: 'Full access to all BuildDesk features including unlimited users, unlimited projects, mobile apps, and customer support.',
      },

      // Seller information
      seller: {
        '@type': 'Organization',
        name: 'BuildDesk',
        url: 'https://builddesk.com',
      },

      // Accepted payment methods
      acceptedPaymentMethod: [
        'http://purl.org/goodrelations/v1#ByBankTransferInAdvance',
        'http://purl.org/goodrelations/v1#ByInvoice',
        'http://purl.org/goodrelations/v1#PayPal',
        'http://purl.org/goodrelations/v1#VISA',
        'http://purl.org/goodrelations/v1#MasterCard',
        'http://purl.org/goodrelations/v1#AmericanExpress',
      ],

      // Valid regions
      areaServed: {
        '@type': 'Country',
        name: 'United States',
      },
    } : undefined,

    // Customer Reviews and Ratings
    aggregateRating: includeReviews ? {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      bestRating: '5',
      worstRating: '1',
      ratingCount: '247',
      reviewCount: '247',
    } : undefined,

    // Feature List - Key selling points
    featureList: includeFeatures ? [
      'Real-time job costing and budget tracking',
      'Mobile apps for iOS and Android',
      'GPS-enabled time tracking with geofencing',
      'Project scheduling with Gantt charts',
      'OSHA compliance and safety management',
      'QuickBooks Online integration',
      'Daily progress reports and photo documentation',
      'Change order management and approvals',
      'Subcontractor and vendor management',
      'Client portal for project updates',
      'Document management and storage',
      'Estimate creation with templates',
      'Unlimited users included',
      'Email and in-app notifications',
      'Offline mobile capability',
      'Custom reporting and analytics',
      'Multi-project dashboard',
      'Invoice generation and tracking',
      'Equipment and inventory tracking',
      'Weather tracking for job sites',
    ] : undefined,

    // Requirements
    memoryRequirements: 'Minimal - Cloud-based application',
    storageRequirements: 'Minimal - Cloud storage included',
    processorRequirements: 'Any modern device',

    // Support and Help
    softwareHelp: {
      '@type': 'CreativeWork',
      url: 'https://builddesk.com/help',
      name: 'BuildDesk Help Center',
    },

    // Customer Service
    provider: {
      '@type': 'Organization',
      name: 'BuildDesk',
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'Customer Service',
        areaServed: 'US',
        availableLanguage: 'English',
        telephone: '+1-800-BUILD-DESK',
        email: 'support@builddesk.com',
      },
    },

    // Merge any additional properties
    ...additionalProps,
  };

  // Clean up undefined values
  const cleanSchema = JSON.parse(JSON.stringify(baseSchema));

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(cleanSchema, null, 2)}
      </script>
    </Helmet>
  );
};

/**
 * Service Schema Component
 *
 * Describes BuildDesk as a service offering for construction management.
 * Helps with local SEO and service-based searches.
 */
export const BuildDeskServiceSchema: React.FC = () => {
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Construction Management Software',
    name: 'BuildDesk Construction Management Platform',
    description: 'Cloud-based construction management software providing job costing, scheduling, compliance, and project management tools for contractors.',

    provider: {
      '@type': 'Organization',
      name: 'BuildDesk',
      url: 'https://builddesk.com',
      logo: 'https://builddesk.com/logo.png',
      telephone: '+1-800-BUILD-DESK',
      email: 'sales@builddesk.com',

      address: {
        '@type': 'PostalAddress',
        addressCountry: 'US',
      },
    },

    areaServed: {
      '@type': 'Country',
      name: 'United States',
    },

    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'BuildDesk Services',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Job Costing Software',
            description: 'Real-time cost tracking and budget management for construction projects',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Project Scheduling',
            description: 'Construction project scheduling with Gantt charts and timeline management',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'OSHA Compliance',
            description: 'Safety management and OSHA compliance tracking for construction sites',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Mobile Crew Tracking',
            description: 'GPS-enabled time tracking and crew management for field workers',
          },
        },
      ],
    },

    offers: {
      '@type': 'Offer',
      price: '350',
      priceCurrency: 'USD',
      url: 'https://builddesk.com/pricing',
    },

    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '247',
    },
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(serviceSchema, null, 2)}
      </script>
    </Helmet>
  );
};

export default SaaSProductSchema;
