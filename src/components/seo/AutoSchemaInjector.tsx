/**
 * AutoSchemaInjector Component
 *
 * Automatically injects JSON-LD structured data and GEO meta tags
 * for every page based on the centralized SEO configuration.
 *
 * Place this inside the Router so it has access to useLocation().
 * It reads the current path, looks up the SEO config, and renders
 * the appropriate @graph of JSON-LD schemas plus Dublin Core / citation
 * meta tags for AI search engine attribution.
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { useAutoSchema } from '@/hooks/useAutoSchema';
import { getSEOConfig, SITE_URL } from '@/config/seoConfig';

export const AutoSchemaInjector: React.FC = () => {
  const location = useLocation();
  const schemaGraph = useAutoSchema();
  const config = getSEOConfig(location.pathname);

  if (!config || !schemaGraph) return null;

  const fullUrl = `${SITE_URL}${config.path}`;
  const today = new Date().toISOString().split('T')[0];
  const modDate = config.lastModified || today;

  return (
    <Helmet>
      {/* JSON-LD Schema Graph */}
      <script type="application/ld+json">
        {JSON.stringify(schemaGraph)}
      </script>

      {/* GEO: Dublin Core metadata for AI attribution */}
      <meta name="dc.title" content={config.title} />
      <meta name="dc.creator" content="Brikly" />
      <meta name="dc.publisher" content="Brikly" />
      <meta name="dc.date" content={modDate} />
      <meta name="dc.language" content="en" />
      <meta name="dc.format" content="text/html" />
      <meta name="dc.identifier" content={fullUrl} />

      {/* Citation metadata for RAG systems */}
      <meta name="citation_title" content={config.title} />
      <meta name="citation_author" content="Brikly" />
      <meta name="citation_publisher" content="Brikly" />
      <meta name="citation_online_date" content={modDate} />
      <meta name="citation_language" content="en" />
      <meta name="citation_public_url" content={fullUrl} />

      {/* Content freshness signal */}
      <meta name="article:modified_time" content={modDate} />
    </Helmet>
  );
};

export default AutoSchemaInjector;
