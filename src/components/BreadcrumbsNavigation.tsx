import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
  isActive?: boolean;
}

interface BreadcrumbsNavigationProps {
  items?: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
  includeSchema?: boolean;
}

export const BreadcrumbsNavigation: React.FC<BreadcrumbsNavigationProps> = ({
  items,
  className,
  showHome = true,
  includeSchema = true
}) => {
  const location = useLocation();
  
  // Auto-generate breadcrumbs from URL if not provided
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];
    
    if (showHome) {
      breadcrumbs.push({ label: 'Home', href: '/' });
    }
    
    pathSegments.forEach((segment, index) => {
      const path = '/' + pathSegments.slice(0, index + 1).join('/');
      const isLast = index === pathSegments.length - 1;
      
      // Special cases for better labels
      const specialLabels: { [key: string]: string } = {
        'resources': 'Resources',
        'solutions': 'Solutions',
        'faq': 'FAQ',
        'procore-alternative-detailed': 'Procore Alternative Detailed',
        'best-construction-management-software-small-business-2025': 'Best Construction Management Software 2025',
        'job-costing-construction-setup-guide': 'Job Costing Guide',
        'osha-safety-logs-digital-playbook': 'OSHA Safety Logs Playbook',
        'construction-scheduling-software-prevent-delays': 'Construction Scheduling Guide',
        'construction-daily-logs-best-practices': 'Daily Logs Best Practices',
        'topics': 'Topics',
        'construction-management-basics': 'Construction Management Basics',
        'safety-and-osha-compliance': 'Safety & OSHA Compliance',
        'features': 'Features',
        'pricing': 'Pricing'
      };
      
      // Convert segment to readable label
      const defaultLabel = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      const label = specialLabels[segment] || defaultLabel;
      
      breadcrumbs.push({
        label,
        href: isLast ? undefined : path,
        isActive: isLast
      });
    });
    
    return breadcrumbs;
  };

  const breadcrumbItems = items || generateBreadcrumbs();

  if (breadcrumbItems.length <= 1) return null;

  // Generate structured data for SEO
  const structuredData = generateBreadcrumbStructuredData(breadcrumbItems);

  return (
    <>
      {includeSchema && (
        <Helmet>
          <script type="application/ld+json">
            {JSON.stringify(structuredData)}
          </script>
        </Helmet>
      )}

      <nav
        className={cn("flex items-center space-x-2 text-sm", className)}
        aria-label="Breadcrumb"
      >
        <ol className="flex items-center space-x-2">
          {breadcrumbItems.map((item, index) => (
            <li key={index} className="flex items-center space-x-2">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}

              {item.href ? (
                <Link
                  to={item.href}
                  className="text-muted-foreground hover:text-construction-orange transition-colors"
                >
                  {index === 0 && showHome ? (
                    <div className="flex items-center space-x-1">
                      <Home className="h-4 w-4" />
                      <span>{item.label}</span>
                    </div>
                  ) : (
                    item.label
                  )}
                </Link>
              ) : (
                <span
                  className="text-construction-dark font-medium"
                  aria-current="page"
                >
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
};

// Structured data for breadcrumbs (SEO)
export const generateBreadcrumbStructuredData = (items: BreadcrumbItem[]) => {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.label,
      "item": item.href ? `https://builddesk.com${item.href}` : undefined
    }))
  };
};

export default BreadcrumbsNavigation;