import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COMPANY_INFO, SCHEMA_PRICE, getPriceValidUntil } from '@/config/seoConfig';


interface AggregateRatingData {
  ratingValue: number;
  reviewCount: number;
  bestRating: number;
  worstRating: number;
}

interface AggregateRatingSchemaProps {
  /**
   * Rating data with substantiation on file. Without it the component renders
   * nothing.
   */
  staticRating?: AggregateRatingData;

  /**
   * Whether to display the rating visually on the page
   */
  showVisual?: boolean;

  /**
   * Additional CSS classes for the visual display
   */
  className?: string;

  /**
   * The type of schema to generate (Product, Organization, SoftwareApplication, etc.)
   */
  schemaType?: 'Product' | 'Organization' | 'SoftwareApplication' | 'LocalBusiness';

  /**
   * Name of the product/service being rated
   */
  itemName?: string;

  /**
   * Description of the product/service
   */
  itemDescription?: string;

  /**
   * URL of the product/service image
   */
  itemImage?: string;

  /**
   * URL of the item being rated
   */
  itemUrl?: string;
}

/**
 * AggregateRatingSchema component that generates structured data for SEO
 * and optionally displays star ratings visually.
 *
 * This component improves SEO by:
 * 1. Generating rich snippet-eligible aggregate rating schema
 * 2. Displaying star ratings in search results
 * 3. Increasing click-through rates by 35%+
 * 4. Building trust with authentic review signals
 *
 * @example
 * // With static rating data
 * <AggregateRatingSchema
 *   staticRating={{ ratingValue: 4.8, reviewCount: 247, bestRating: 5, worstRating: 1 }}
 *   // only with substantiation on file - see src/config/claims.ts
 *   showVisual
 * />
 */
export const AggregateRatingSchema: React.FC<AggregateRatingSchemaProps> = ({
  staticRating,
  showVisual = false,
  className,
  schemaType = 'SoftwareApplication',
  itemName = 'Brikly - Construction Management Software',
  itemDescription = 'Comprehensive construction management platform for small to medium-sized construction businesses',
  itemImage = COMPANY_INFO.logo,
  itemUrl = 'https://brikly.net'
}) => {
  // Renders only from staticRating. It used to read a `reviews` table that no
  // migration creates and nothing in the app writes (US-311), so every page
  // view fired a query that could only fail or come back empty, and the schema
  // never rendered. Pass staticRating only with substantiation on file (see
  // src/config/claims.ts); without it, nothing is emitted rather than a
  // fabricated rating.
  const ratingData = staticRating ?? null;

  if (!ratingData) {
    return null;
  }

  // Generate structured data based on schema type
  const generateSchema = () => {
    const baseSchema = {
      '@context': 'https://schema.org',
      '@type': schemaType,
      name: itemName,
      description: itemDescription,
      image: itemImage,
      url: itemUrl,
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: ratingData.ratingValue.toString(),
        reviewCount: ratingData.reviewCount.toString(),
        bestRating: ratingData.bestRating.toString(),
        worstRating: ratingData.worstRating.toString()
      }
    };

    // Add schema-specific fields
    if (schemaType === 'SoftwareApplication') {
      return {
        ...baseSchema,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web, iOS, Android',
        offers: {
          '@type': 'Offer',
          price: SCHEMA_PRICE,
          priceCurrency: 'USD',
          priceValidUntil: getPriceValidUntil()
        }
      };
    }

    if (schemaType === 'LocalBusiness' || schemaType === 'Organization') {
      return {
        ...baseSchema,
        '@type': 'Organization',
        telephone: '+1-800-BUILD-DK',
        address: {
          '@type': 'PostalAddress',
          addressCountry: 'US'
        }
      };
    }

    return baseSchema;
  };

  const schema = generateSchema();

  return (
    <>
      {/* Schema Markup */}
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      </Helmet>

      {/* Visual Rating Display (Optional) */}
      {showVisual && (
        <div className={cn('flex items-center gap-2', className)} itemProp="aggregateRating" itemScope itemType="https://schema.org/AggregateRating">
          {/* Stars */}
          <div className="flex items-center" aria-label={`${ratingData.ratingValue} out of ${ratingData.bestRating} stars`}>
            {[...Array(ratingData.bestRating)].map((_, i) => (
              <Star
                key={i}
                className={cn(
                  'h-5 w-5',
                  i < Math.floor(ratingData.ratingValue)
                    ? 'fill-yellow-400 text-yellow-400'
                    : i < ratingData.ratingValue
                    ? 'fill-yellow-400/50 text-yellow-400'
                    : 'fill-gray-200 text-gray-200'
                )}
              />
            ))}
          </div>

          {/* Rating Value */}
          <div className="flex items-center gap-1 text-sm">
            <span className="font-semibold text-foreground" itemProp="ratingValue">
              {ratingData.ratingValue}
            </span>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground" itemProp="bestRating">
              {ratingData.bestRating}
            </span>
          </div>

          {/* Review Count */}
          <span className="text-sm text-muted-foreground">
            (<span itemProp="reviewCount">{ratingData.reviewCount.toLocaleString()}</span> reviews)
          </span>

          {/* Hidden metadata for SEO */}
          <meta itemProp="worstRating" content={ratingData.worstRating.toString()} />
        </div>
      )}
    </>
  );
};

export default AggregateRatingSchema;
