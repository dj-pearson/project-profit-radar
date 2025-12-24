import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const Sitemap = () => {
  const [sitemapContent, setSitemapContent] = useState<string>('');

  useEffect(() => {
    const fetchSitemap = async () => {
      try {
        // Call the sitemap generator edge function
        const { data, error } = await supabase.functions.invoke('sitemap-generator');
        
        if (error) {
          console.error('Error fetching sitemap:', error);
          setSitemapContent('<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate sitemap</error>');
          return;
        }
        
        // Set the sitemap content
        setSitemapContent(data);
        
        // Set the correct headers for XML content
        if (typeof document !== 'undefined') {
          const head = document.querySelector('head');
          const existingMeta = head?.querySelector('meta[http-equiv="Content-Type"]');
          if (existingMeta) {
            existingMeta.remove();
          }
          
          const meta = document.createElement('meta');
          meta.setAttribute('http-equiv', 'Content-Type');
          meta.setAttribute('content', 'application/xml; charset=utf-8');
          head?.appendChild(meta);
        }
        
      } catch (error) {
        console.error('Error generating sitemap:', error);
        setSitemapContent('<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate sitemap</error>');
      }
    };
    
    fetchSitemap();
  }, []);

  // Return the XML content as pre-formatted text
  // Security: Using text content instead of dangerouslySetInnerHTML to prevent XSS
  return (
    <pre
      style={{
        fontFamily: 'monospace',
        whiteSpace: 'pre-wrap',
        margin: 0,
        padding: 0,
        background: 'white',
        color: 'black'
      }}
    >
      {sitemapContent}
    </pre>
  );
};

export default Sitemap;