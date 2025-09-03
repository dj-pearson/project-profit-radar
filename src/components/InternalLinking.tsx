/**
 * Internal Linking Component for SEO
 * Provides contextual internal links to improve page authority and indexing
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, BookOpen, Calculator, Users } from 'lucide-react';

interface InternalLink {
  title: string;
  description: string;
  url: string;
  icon?: React.ComponentType<any>;
}

interface InternalLinkingProps {
  currentPage: string;
  context?: 'construction' | 'software' | 'management' | 'scheduling' | 'costing';
}

export const InternalLinking: React.FC<InternalLinkingProps> = ({ 
  currentPage, 
  context = 'construction' 
}) => {
  const getRelatedLinks = (): InternalLink[] => {
    const allLinks: Record<string, InternalLink[]> = {
      construction: [
        {
          title: 'Construction Management Software Guide',
          description: 'Complete guide to choosing the right construction management software for your business.',
          url: '/resources/construction-management-software-small-business-guide',
          icon: BookOpen
        },
        {
          title: 'ROI Calculator',
          description: 'Calculate your potential return on investment with construction management software.',
          url: '/roi-calculator',
          icon: Calculator
        },
        {
          title: 'Hidden Costs of Project Delays',
          description: 'Discover 7 hidden costs of construction delays and how to avoid them.',
          url: '/resources/7-hidden-costs-of-construction-project-delays-and-how-to-avoid-them',
          icon: BookOpen
        }
      ],
      software: [
        {
          title: 'Procore Alternative',
          description: 'Why BuildDesk is a better choice than Procore for small-medium contractors.',
          url: '/procore-alternative',
          icon: Users
        },
        {
          title: 'Features Overview',
          description: 'Explore all BuildDesk features designed for construction contractors.',
          url: '/features',
          icon: BookOpen
        },
        {
          title: 'Getting Started Guide',
          description: 'Complete setup guide to get started with BuildDesk quickly.',
          url: '/knowledge-base/article/getting-started-complete-setup-guide',
          icon: BookOpen
        }
      ],
      management: [
        {
          title: 'Material Management Guide',
          description: 'Control costs and reduce waste with effective material management strategies.',
          url: '/resources/construction-material-management-control-costs-reduce-waste-2025',
          icon: BookOpen
        },
        {
          title: 'Project Scheduling Costs',
          description: 'Hidden costs of poor project scheduling and how to avoid them.',
          url: '/resources/7-hidden-costs-of-poor-project-scheduling-and-how-to-avoid-them',
          icon: BookOpen
        },
        {
          title: 'Mobile Field Management',
          description: 'Learn how to use mobile tools for effective field management.',
          url: '/knowledge-base/article/mobile-app-field-guide',
          icon: BookOpen
        }
      ],
      scheduling: [
        {
          title: 'Construction Scheduling Software',
          description: 'How modern scheduling tools prevent delays and reduce costs.',
          url: '/construction-field-management',
          icon: BookOpen
        },
        {
          title: 'Project Delay Costs',
          description: 'The real cost of construction project delays and prevention strategies.',
          url: '/resources/7-hidden-costs-of-construction-project-delays-and-how-to-avoid-them',
          icon: BookOpen
        },
        {
          title: 'Start Free Trial',
          description: 'Try BuildDesk scheduling tools free for 14 days.',
          url: '/auth',
          icon: Users
        }
      ],
      costing: [
        {
          title: 'Job Costing Software',
          description: 'Advanced job costing tools for construction contractors.',
          url: '/job-costing-software',
          icon: Calculator
        },
        {
          title: 'ROI Calculator',
          description: 'Calculate potential savings from better cost tracking.',
          url: '/roi-calculator',
          icon: Calculator
        },
        {
          title: 'Material Cost Control',
          description: 'Strategies to control material costs and reduce waste.',
          url: '/resources/construction-material-management-control-costs-reduce-waste-2025',
          icon: BookOpen
        }
      ]
    };

    // Filter out the current page from suggestions
    return allLinks[context]?.filter(link => link.url !== currentPage) || [];
  };

  const relatedLinks = getRelatedLinks();

  if (relatedLinks.length === 0) return null;

  return (
    <div className="mt-12 pt-8 border-t border-gray-200">
      <h3 className="text-xl font-semibold text-construction-dark mb-6">
        Related Resources
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {relatedLinks.map((link, index) => {
          const IconComponent = link.icon || BookOpen;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <IconComponent className="h-5 w-5 text-construction-blue" />
                  <CardTitle className="text-sm font-medium">
                    {link.title}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-xs mb-3">
                  {link.description}
                </CardDescription>
                <Link 
                  to={link.url}
                  className="inline-flex items-center text-xs text-construction-blue hover:text-construction-orange transition-colors"
                >
                  Learn more
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default InternalLinking;
