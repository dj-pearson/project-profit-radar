/**
 * GEOMetaTags Component
 *
 * Adds Generative Engine Optimization (GEO) meta tags to pages so that
 * AI search engines (Gemini, GPT, Claude, Perplexity) can properly
 * attribute and cite content. Uses Dublin Core and citation_ meta tags
 * that large language models and retrieval-augmented generation systems
 * look for when deciding what to cite.
 *
 * Also adds speakable schema for voice search eligibility.
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

export interface GEOMetaTagsProps {
  title: string;
  description: string;
  author?: string;
  publishDate?: string;
  modifiedDate?: string;
  contentType?: 'article' | 'product' | 'faq' | 'how-to' | 'software';
  speakableSelectors?: string[];
}

export const GEOMetaTags: React.FC<GEOMetaTagsProps> = ({
  title,
  description,
  author = 'Brikly',
  publishDate,
  modifiedDate,
  contentType = 'software',
  speakableSelectors = ['.geo-direct-answer', 'h1', 'h2', '.geo-section-content p:first-child'],
}) => {
  const location = useLocation();
  const fullUrl = `https://brikly.net${location.pathname}`;
  const today = new Date().toISOString().split('T')[0];

  const speakableSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: speakableSelectors,
    },
    url: fullUrl,
  };

  return (
    <Helmet>
      {/* Dublin Core metadata for AI attribution */}
      <meta name="dc.title" content={title} />
      <meta name="dc.creator" content={author} />
      <meta name="dc.publisher" content="Brikly" />
      <meta name="dc.date" content={modifiedDate || today} />
      <meta name="dc.type" content={contentType === 'article' ? 'Text' : 'Software'} />
      <meta name="dc.language" content="en" />
      <meta name="dc.format" content="text/html" />
      <meta name="dc.identifier" content={fullUrl} />
      <meta name="dc.description" content={description} />

      {/* Citation metadata for RAG systems */}
      <meta name="citation_title" content={title} />
      <meta name="citation_author" content={author} />
      <meta name="citation_publisher" content="Brikly" />
      {publishDate && <meta name="citation_date" content={publishDate} />}
      <meta name="citation_online_date" content={modifiedDate || today} />
      <meta name="citation_language" content="en" />
      <meta name="citation_public_url" content={fullUrl} />

      {/* Content freshness signals */}
      <meta name="article:modified_time" content={modifiedDate || today} />
      {publishDate && <meta name="article:published_time" content={publishDate} />}

      {/* Speakable schema for voice search */}
      <script type="application/ld+json">
        {JSON.stringify(speakableSchema)}
      </script>
    </Helmet>
  );
};

export default GEOMetaTags;
