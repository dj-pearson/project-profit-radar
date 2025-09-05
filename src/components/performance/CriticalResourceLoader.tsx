import { useEffect } from 'react';

interface CriticalResource {
  href: string;
  as: 'font' | 'image' | 'script' | 'style';
  type?: string;
  crossOrigin?: 'anonymous' | 'use-credentials';
  media?: string;
}

interface CriticalResourceLoaderProps {
  resources: CriticalResource[];
  priority?: 'high' | 'low';
}

export const CriticalResourceLoader = ({ resources, priority = 'high' }: CriticalResourceLoaderProps) => {
  useEffect(() => {
    const loadedResources: HTMLLinkElement[] = [];

    resources.forEach(resource => {
      // Check if resource is already preloaded
      const existing = document.querySelector(`link[href="${resource.href}"]`);
      if (existing) return;

      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource.href;
      link.as = resource.as;
      
      if (resource.type) link.type = resource.type;
      if (resource.crossOrigin) link.crossOrigin = resource.crossOrigin;
      if (resource.media) link.media = resource.media;

      // Add priority hint for modern browsers
      if ('fetchPriority' in link) {
        (link as any).fetchPriority = priority;
      }

      document.head.appendChild(link);
      loadedResources.push(link);
    });

    // Cleanup on unmount
    return () => {
      loadedResources.forEach(link => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      });
    };
  }, [resources, priority]);

  return null; // This component doesn't render anything
};

// Hook for critical resource management
export const useCriticalResources = () => {
  useEffect(() => {
    // Critical fonts for above-the-fold content
    const criticalFonts = [
      {
        href: '/fonts/inter-variable.woff2',
        as: 'font' as const,
        type: 'font/woff2',
        crossOrigin: 'anonymous' as const
      }
    ];

    // Critical images for hero section
    const criticalImages = [
      {
        href: '/images/hero-construction.webp',
        as: 'image' as const
      },
      {
        href: '/BuildDeskLogo.png',
        as: 'image' as const
      }
    ];

    // Preload critical resources
    const allResources = [...criticalFonts, ...criticalImages];
    
    allResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource.href;
      link.as = resource.as;
      
      if ('type' in resource && resource.type) {
        link.type = resource.type;
      }
      if ('crossOrigin' in resource && resource.crossOrigin) {
        link.crossOrigin = resource.crossOrigin;
      }

      document.head.appendChild(link);
    });

    // DNS prefetch for external resources
    const externalDomains = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://www.google-analytics.com',
      'https://www.googletagmanager.com',
      'https://api.supabase.co'
    ];

    externalDomains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = domain;
      document.head.appendChild(link);
    });

  }, []);
};

// Component for preloading page-specific resources
export const PageResourcePreloader = ({ pageType }: { pageType: string }) => {
  useEffect(() => {
    const pageResources: Record<string, CriticalResource[]> = {
      'homepage': [
        { href: '/images/hero-construction.webp', as: 'image' },
        { href: '/images/features-preview.webp', as: 'image' }
      ],
      'pricing': [
        { href: '/images/pricing-comparison.webp', as: 'image' }
      ],
      'features': [
        { href: '/images/dashboard-preview.webp', as: 'image' },
        { href: '/images/mobile-app-preview.webp', as: 'image' }
      ]
    };

    const resources = pageResources[pageType] || [];
    
    resources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource.href;
      link.as = resource.as;
      
      if ('type' in resource && resource.type) {
        link.type = resource.type;
      }
      if ('crossOrigin' in resource && resource.crossOrigin) {
        link.crossOrigin = resource.crossOrigin;
      }

      document.head.appendChild(link);
    });
  }, [pageType]);

  return null;
};

export default CriticalResourceLoader;
