import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, FileText } from 'lucide-react';

export interface LegalPageLayoutProps {
  title: string;
  metaDescription: string;
  lastUpdated?: string;
  effectiveDate?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  /** Renders related-document links above the back-to-home control. */
  relatedLinks?: Array<{ label: string; href: string }>;
}

/**
 * Shared layout for all legal/policy pages.
 *
 * Goals:
 * - Consistent visual structure and metadata across legal pages
 * - SEO + sharing tags via react-helmet-async
 * - Stable "Last updated" / "Effective" disclosure (FTC/UDAAP)
 * - Accessible landmarks (banner / main / nav)
 */
const LegalPageLayout: React.FC<LegalPageLayoutProps> = ({
  title,
  metaDescription,
  lastUpdated,
  effectiveDate,
  icon,
  children,
  relatedLinks,
}) => {
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      <Helmet>
        <title>{`${title} | Brikly Construction Management`}</title>
        <meta name="description" content={metaDescription} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`https://brikly.net${typeof window !== 'undefined' ? window.location.pathname : ''}`} />
      </Helmet>

      <div className="min-h-screen bg-background">
        <header className="border-b bg-card" role="banner">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/')}
                  aria-label="Back to home"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
                  Back to Home
                </Button>
                <div className="flex items-center space-x-2">
                  {icon ?? <FileText className="h-5 w-5 text-primary" aria-hidden="true" />}
                  <h1 className="text-xl font-semibold">{title}</h1>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8" aria-label={title}>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {effectiveDate && (
                  <>
                    <strong>Effective:</strong> {effectiveDate}
                    {lastUpdated ? ' • ' : ''}
                  </>
                )}
                {lastUpdated && (
                  <>
                    <strong>Last updated:</strong> {lastUpdated}
                  </>
                )}
                {!effectiveDate && !lastUpdated && (
                  <>
                    <strong>Last updated:</strong> {today}
                  </>
                )}
              </p>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none dark:prose-invert">
              {children}

              {relatedLinks && relatedLinks.length > 0 && (
                <nav aria-label="Related legal documents" className="mt-10 not-prose border-t pt-6">
                  <h2 className="text-base font-semibold mb-2">Related documents</h2>
                  <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                    {relatedLinks.map((link) => (
                      <li key={link.href}>
                        <Link to={link.href} className="text-primary underline-offset-2 hover:underline">
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </>
  );
};

export default LegalPageLayout;
