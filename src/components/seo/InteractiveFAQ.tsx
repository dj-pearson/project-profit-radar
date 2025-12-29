/**
 * InteractiveFAQ Component
 *
 * A beautiful, accessible FAQ component that automatically generates
 * Schema.org FAQPage markup for enhanced SEO.
 *
 * SEO Benefits:
 * 1. Appears in "People also ask" boxes in Google
 * 2. Improves voice search visibility
 * 3. Captures long-tail keyword traffic
 * 4. Increases time on page (user engagement signal)
 * 5. Provides structured data for search engines
 * 6. Can trigger rich snippets in search results
 *
 * Accessibility Features:
 * - Full keyboard navigation support
 * - ARIA labels and roles
 * - Screen reader friendly
 * - Focus management
 *
 * Usage:
 * <InteractiveFAQ
 *   title="Frequently Asked Questions"
 *   faqs={[
 *     {
 *       question: "What is BuildDesk?",
 *       answer: "BuildDesk is construction management software..."
 *     }
 *   ]}
 *   theme="default"
 *   defaultExpanded={0}
 * />
 */

import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SafeHtml } from '@/components/ui/safe-html';

export interface FAQItem {
  /**
   * The question text - should be clear and concise
   * Optimized for "how", "what", "why", "when" questions
   */
  question: string;

  /**
   * The answer text - can include HTML
   * Should be comprehensive but concise (100-300 words ideal)
   */
  answer: string;

  /**
   * Optional category for grouping FAQs
   */
  category?: string;

  /**
   * Optional keywords to help with search
   */
  keywords?: string[];
}

interface InteractiveFAQProps {
  /**
   * Array of FAQ items
   */
  faqs: FAQItem[];

  /**
   * Optional title for the FAQ section
   */
  title?: string;

  /**
   * Optional subtitle/description
   */
  subtitle?: string;

  /**
   * Theme variant
   */
  theme?: 'default' | 'minimal' | 'bordered' | 'gradient';

  /**
   * Which FAQ item should be expanded by default (index)
   * Set to -1 for all collapsed
   * Set to 'all' to expand all
   */
  defaultExpanded?: number | 'all';

  /**
   * Allow multiple items to be open at once
   */
  allowMultiple?: boolean;

  /**
   * Show question numbers
   */
  showNumbers?: boolean;

  /**
   * Custom CSS class
   */
  className?: string;

  /**
   * Include Schema.org markup
   * @default true
   */
  includeSchema?: boolean;

  /**
   * Schema.org page name (for FAQPage schema)
   */
  schemaPageName?: string;
}

export const InteractiveFAQ: React.FC<InteractiveFAQProps> = ({
  faqs,
  title = 'Frequently Asked Questions',
  subtitle,
  theme = 'default',
  defaultExpanded = -1,
  allowMultiple = false,
  showNumbers = false,
  className,
  includeSchema = true,
  schemaPageName,
}) => {
  // State to track which FAQ items are expanded
  const [expandedItems, setExpandedItems] = useState<Set<number>>(() => {
    if (defaultExpanded === 'all') {
      return new Set(faqs.map((_, index) => index));
    } else if (typeof defaultExpanded === 'number' && defaultExpanded >= 0) {
      return new Set([defaultExpanded]);
    }
    return new Set();
  });

  const toggleItem = (index: number) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);

      if (newSet.has(index)) {
        // Collapse this item
        newSet.delete(index);
      } else {
        // Expand this item
        if (!allowMultiple) {
          // If only one item can be open, close all others
          newSet.clear();
        }
        newSet.add(index);
      }

      return newSet;
    });
  };

  // Generate FAQ Schema
  const faqSchema = includeSchema
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        ...(schemaPageName && { name: schemaPageName }),
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      }
    : null;

  // Theme styles
  const themeStyles = {
    default: {
      container: 'bg-white dark:bg-gray-800 rounded-lg shadow-md',
      question:
        'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600',
      answer: 'bg-white dark:bg-gray-800',
    },
    minimal: {
      container: 'bg-transparent',
      question: 'hover:bg-gray-50 dark:hover:bg-gray-800',
      answer: 'bg-transparent',
    },
    bordered: {
      container: 'border-2 border-gray-200 dark:border-gray-700 rounded-lg',
      question:
        'border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800',
      answer: 'border-b border-gray-200 dark:border-gray-700',
    },
    gradient: {
      container:
        'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-lg shadow-lg',
      question:
        'bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm hover:bg-white/70 dark:hover:bg-gray-700/70',
      answer: 'bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm',
    },
  };

  const currentTheme = themeStyles[theme];

  return (
    <>
      {/* Schema.org Markup */}
      {includeSchema && faqSchema && (
        <Helmet>
          <script type="application/ld+json">
            {JSON.stringify(faqSchema, null, 2)}
          </script>
        </Helmet>
      )}

      <div className={cn('w-full', className)}>
        {/* Header */}
        {(title || subtitle) && (
          <div className="mb-8 text-center">
            {title && (
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* FAQ Items */}
        <div className={cn('space-y-3', currentTheme.container, 'p-4')}>
          {faqs.map((faq, index) => {
            const isExpanded = expandedItems.has(index);

            return (
              <div
                key={index}
                className="overflow-hidden rounded-md transition-all duration-200"
              >
                {/* Question Button */}
                <button
                  onClick={() => toggleItem(index)}
                  className={cn(
                    'w-full text-left px-6 py-4 flex items-center justify-between gap-4 transition-colors duration-200',
                    currentTheme.question,
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
                  )}
                  aria-expanded={isExpanded}
                  aria-controls={`faq-answer-${index}`}
                  id={`faq-question-${index}`}
                >
                  <div className="flex items-start gap-3 flex-1">
                    {showNumbers && (
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-semibold flex items-center justify-center">
                        {index + 1}
                      </span>
                    )}
                    <span className="font-semibold text-gray-900 dark:text-white text-lg">
                      {faq.question}
                    </span>
                  </div>

                  {/* Chevron Icon */}
                  <ChevronDown
                    className={cn(
                      'w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-200 flex-shrink-0',
                      isExpanded && 'transform rotate-180'
                    )}
                    aria-hidden="true"
                  />
                </button>

                {/* Answer Panel */}
                <div
                  id={`faq-answer-${index}`}
                  role="region"
                  aria-labelledby={`faq-question-${index}`}
                  className={cn(
                    'overflow-hidden transition-all duration-300 ease-in-out',
                    isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                  )}
                >
                  <div
                    className={cn(
                      'px-6 py-4',
                      showNumbers && 'pl-[52px]',
                      currentTheme.answer
                    )}
                  >
                    <SafeHtml
                      content={faq.answer}
                      className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300"
                    />

                    {/* Optional: Show keywords for SEO */}
                    {faq.keywords && faq.keywords.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2" aria-label="Related topics">
                        {faq.keywords.map((keyword, kIndex) => (
                          <span
                            key={kIndex}
                            className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Call to Action (optional) */}
        {faqs.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Still have questions?{' '}
              <a
                href="/contact"
                className="text-primary hover:text-primary/80 font-semibold underline"
              >
                Contact our support team
              </a>
            </p>
          </div>
        )}
      </div>
    </>
  );
};

/**
 * Pre-built FAQ sets for common pages
 */

export const constructionSoftwareFAQs: FAQItem[] = [
  {
    question: 'What is construction management software?',
    answer:
      'Construction management software is a digital platform that helps contractors manage all aspects of their construction projects, including job costing, scheduling, document management, crew tracking, and compliance. BuildDesk provides an all-in-one solution specifically designed for small to medium-sized contractors.',
    keywords: ['construction software', 'project management', 'contractors'],
  },
  {
    question: 'How much does BuildDesk cost?',
    answer:
      'BuildDesk costs $350 per month with unlimited users included. Unlike competitors that charge per user, you can add your entire team at no additional cost. We offer a 14-day free trial with no credit card required, and there are no setup fees or long-term contracts.',
    keywords: ['pricing', 'cost', 'subscription'],
  },
  {
    question: 'Does BuildDesk work on mobile devices?',
    answer:
      'Yes! BuildDesk has native mobile apps for both iOS and Android. Our mobile apps include offline capability, GPS time tracking, photo documentation, daily reports, and real-time project updates. Field workers can access everything they need right from their smartphones or tablets.',
    keywords: ['mobile app', 'iOS', 'Android', 'offline'],
  },
  {
    question: 'Can BuildDesk integrate with QuickBooks?',
    answer:
      'Absolutely. BuildDesk offers seamless 2-way integration with QuickBooks Online. Financial data syncs automatically, including invoices, expenses, payments, and job costing information. This eliminates double-entry and ensures your accounting is always up to date.',
    keywords: ['QuickBooks', 'accounting', 'integration', 'sync'],
  },
  {
    question: 'Is BuildDesk suitable for small contractors?',
    answer:
      'Yes, BuildDesk is specifically designed for small to medium-sized contractors with 1-50 employees. Unlike enterprise solutions that are complex and expensive, BuildDesk provides powerful features without the complexity. You can be up and running in days, not months, with pricing that makes sense for smaller businesses.',
    keywords: ['small contractors', 'SMB', 'affordable'],
  },
  {
    question: 'What kind of support does BuildDesk provide?',
    answer:
      'BuildDesk provides comprehensive support including in-app chat, email support, phone support, and an extensive help center with video tutorials. Our support team has construction industry experience and can help you get the most out of the platform. Support is included with all subscriptions at no extra cost.',
    keywords: ['customer support', 'help', 'training'],
  },
  {
    question: 'How does BuildDesk help with OSHA compliance?',
    answer:
      'BuildDesk includes built-in OSHA compliance tools such as digital safety logs, incident reporting, safety meeting documentation, equipment inspection checklists, and automated compliance reports. You can track safety metrics, manage certifications, and ensure your team stays compliant with current OSHA regulations.',
    keywords: ['OSHA', 'safety', 'compliance', 'regulations'],
  },
  {
    question: 'Can I try BuildDesk before committing?',
    answer:
      'Yes! We offer a 14-day free trial with full access to all features. No credit card is required to start your trial. Our team will help you get set up with your first project, and you can cancel anytime if BuildDesk isn\'t the right fit for your business.',
    keywords: ['free trial', 'demo', 'no commitment'],
  },
];

export const pricingFAQs: FAQItem[] = [
  {
    question: 'Is there a per-user fee?',
    answer:
      'No! BuildDesk includes unlimited users for a flat monthly rate of $350. Whether you have 5 employees or 50, the price remains the same. This is a huge advantage over competitors who charge $50-100 per user per month.',
    keywords: ['unlimited users', 'per user', 'flat rate'],
  },
  {
    question: 'Are there any setup fees or hidden costs?',
    answer:
      'No setup fees, no hidden costs. The $350/month subscription includes everything: unlimited users, unlimited projects, mobile apps, storage, customer support, and all features. The only additional cost would be if you choose to purchase add-on integrations or professional services.',
    keywords: ['no hidden fees', 'setup costs', 'transparent pricing'],
  },
  {
    question: 'Do you offer annual billing discounts?',
    answer:
      'Yes, we offer a 15% discount for annual billing. Instead of $350/month ($4,200/year), annual subscribers pay $3,570/year, saving $630. You can upgrade to annual billing at any time from your account settings.',
    keywords: ['annual billing', 'discount', 'save money'],
  },
  {
    question: 'What happens after the free trial?',
    answer:
      'After your 14-day free trial, you can choose to subscribe to continue using BuildDesk. If you don\'t subscribe, your account will be downgraded to read-only mode where you can view but not edit data. Your data is never deleted, so you can reactivate anytime.',
    keywords: ['trial expiration', 'subscription', 'data retention'],
  },
];

export default InteractiveFAQ;
