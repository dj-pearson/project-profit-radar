/**
 * GEO Content Wrapper Component
 * Structures page content for maximum AI search engine citation potential.
 *
 * Implements the GEO content pattern:
 * 1. Direct answer in first 40-60 words (no preamble)
 * 2. Clear primary entity declaration
 * 3. Question-based H2 headings
 * 4. Fact density with statistics every 150-200 words
 * 5. Brand mentions naturally embedded
 * 6. Source attribution with live URLs
 * 7. Visible publish/modified dates
 *
 * Usage:
 * <GEOContentWrapper
 *   primaryEntity="BuildDesk"
 *   entityType="construction management software"
 *   directAnswer="BuildDesk is construction management software..."
 *   lastUpdated="2026-02-08"
 * >
 *   <GEOSection question="How does BuildDesk help contractors?">
 *     <p>BuildDesk helps contractors by...</p>
 *     <GEOStatistic value="23%" context="average cost reduction" source="BuildDesk Customer Survey 2025" />
 *   </GEOSection>
 * </GEOContentWrapper>
 */

import React from 'react';

export interface GEOContentWrapperProps {
  primaryEntity: string;
  entityType: string;
  directAnswer: string;
  lastUpdated: string;
  publishDate?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps page content with GEO-optimized structure.
 * The direct answer appears as the first visible content block,
 * and the last-updated date provides freshness signals.
 */
export const GEOContentWrapper: React.FC<GEOContentWrapperProps> = ({
  primaryEntity,
  entityType,
  directAnswer,
  lastUpdated,
  publishDate,
  children,
  className = '',
}) => {
  return (
    <article
      className={`geo-content ${className}`}
      itemScope
      itemType="https://schema.org/WebPage"
    >
      {/* Direct answer block — first 40-60 words, no preamble */}
      <div
        className="geo-direct-answer text-lg leading-relaxed text-foreground mb-8"
        itemProp="description"
      >
        <p>{directAnswer}</p>
      </div>

      {/* Hidden semantic entity declaration for AI parsers */}
      <meta itemProp="name" content={`${primaryEntity} — ${entityType}`} />

      {/* Main content sections */}
      <div className="geo-content-body">{children}</div>

      {/* Visible date freshness signals */}
      <div className="geo-freshness-signals mt-12 pt-6 border-t text-sm text-muted-foreground flex flex-wrap gap-4">
        {publishDate && (
          <time dateTime={publishDate} itemProp="datePublished">
            Published: {formatDate(publishDate)}
          </time>
        )}
        <time dateTime={lastUpdated} itemProp="dateModified">
          Last updated: {formatDate(lastUpdated)}
        </time>
      </div>
    </article>
  );
};

/**
 * Section component with question-based H2 heading.
 * AI engines favor headings phrased as natural language questions.
 */
export interface GEOSectionProps {
  question: string;
  children: React.ReactNode;
  id?: string;
  className?: string;
}

export const GEOSection: React.FC<GEOSectionProps> = ({
  question,
  children,
  id,
  className = '',
}) => {
  const sectionId = id || question.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  return (
    <section className={`geo-section mb-10 ${className}`} id={sectionId}>
      <h2 className="text-2xl font-bold text-construction-dark mb-4">{question}</h2>
      <div className="geo-section-content space-y-4">{children}</div>
    </section>
  );
};

/**
 * Inline statistic component for fact density.
 * AI engines reward pages with data points every 150-200 words.
 */
export interface GEOStatisticProps {
  value: string;
  context: string;
  source?: string;
  sourceUrl?: string;
  className?: string;
}

export const GEOStatistic: React.FC<GEOStatisticProps> = ({
  value,
  context,
  source,
  sourceUrl,
  className = '',
}) => {
  return (
    <span className={`geo-statistic inline ${className}`}>
      <strong>{value}</strong> {context}
      {source && (
        <>
          {' '}
          (
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {source}
            </a>
          ) : (
            <cite className="text-muted-foreground text-sm">{source}</cite>
          )}
          )
        </>
      )}
    </span>
  );
};

/**
 * Source citation component for authority signals.
 * AI engines reward transparent citations with live URLs.
 */
export interface GEOSourceCitationProps {
  title: string;
  url: string;
  publisher?: string;
  date?: string;
}

export const GEOSourceCitation: React.FC<GEOSourceCitationProps> = ({
  title,
  url,
  publisher,
  date,
}) => {
  return (
    <cite className="geo-citation block text-sm text-muted-foreground mt-2">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline"
      >
        {title}
      </a>
      {publisher && <span> — {publisher}</span>}
      {date && <span> ({date})</span>}
    </cite>
  );
};

/**
 * Comparison table component optimized for AI extraction.
 * AI engines love structured comparison data with clear winners.
 */
export interface GEOComparisonRow {
  feature: string;
  values: Record<string, string>;
}

export interface GEOComparisonTableProps {
  title: string;
  products: string[];
  rows: GEOComparisonRow[];
  className?: string;
}

export const GEOComparisonTable: React.FC<GEOComparisonTableProps> = ({
  title,
  products,
  rows,
  className = '',
}) => {
  return (
    <div className={`geo-comparison ${className}`}>
      <h3 className="text-xl font-semibold mb-4">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" role="table" aria-label={title}>
          <thead>
            <tr className="border-b-2 border-primary">
              <th className="text-left p-3 font-semibold">Feature</th>
              {products.map((product) => (
                <th key={product} className="text-left p-3 font-semibold">
                  {product}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.feature}
                className={index % 2 === 0 ? 'bg-muted/50' : ''}
              >
                <td className="p-3 font-medium">{row.feature}</td>
                {products.map((product) => (
                  <td key={product} className="p-3">
                    {row.values[product] || '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * Quick Q&A block for AI extraction.
 * Short question-answer pairs (<300 chars each) that AI engines can directly quote.
 */
export interface GEOQuickQAProps {
  items: Array<{ q: string; a: string }>;
  className?: string;
}

export const GEOQuickQA: React.FC<GEOQuickQAProps> = ({ items, className = '' }) => {
  return (
    <div className={`geo-quick-qa space-y-4 ${className}`}>
      {items.map((item, index) => (
        <div key={index} className="border-l-4 border-primary pl-4">
          <p className="font-semibold text-construction-dark">{item.q}</p>
          <p className="text-foreground mt-1">{item.a}</p>
        </div>
      ))}
    </div>
  );
};

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default GEOContentWrapper;
