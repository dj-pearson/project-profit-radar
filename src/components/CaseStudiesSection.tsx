import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, Building } from 'lucide-react';
import { Link } from 'react-router-dom';
import { renderableCaseStudies, type CaseStudyClaim } from '@/config/claims';

/**
 * Customer case studies.
 *
 * NOTE: this file previously rendered three fabricated case studies for
 * "Rodriguez Custom Homes" (Mike Rodriguez), "Metro Build Group" (Sarah Chen),
 * and "Thompson Construction LLC" (David Thompson) - the same invented people
 * that appeared in TestimonialsSection - each with an invented challenge,
 * solution, quote, and set of outcome figures, followed by an "Average Results
 * Across All Case Studies" band (22% profit improvement, 47% fewer delays,
 * $78,000 annual savings, 2.1 weeks implementation) computed from nothing.
 * Those are FTC Act Section 5 and FTC Endorsement Guide (16 C.F.R. Part 255)
 * violations and have been removed.
 *
 * Case studies now come from the src/config/claims.ts registry and render only
 * when verified with permission and outcome evidence filed. With the registry
 * empty this section renders nothing.
 */

const CaseStudyCard: React.FC<CaseStudyClaim> = ({
  company,
  industry,
  teamSize,
  challenge,
  solution,
  results,
  quote,
  author,
  title,
  timeframe,
  projectTypes,
  materialConnection,
}) => (
  <Card className="h-full">
    <CardHeader>
      <div className="flex items-start justify-between mb-4">
        <div>
          <CardTitle className="text-xl mb-2">{company}</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{industry}</Badge>
            <Badge variant="outline">{teamSize}</Badge>
          </div>
        </div>
        <Building className="h-8 w-8 text-muted-foreground" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {results.map((result) => (
          <div key={result.metric} className="text-center p-3 bg-green-50 rounded-lg">
            <div className="font-bold text-green-800 text-lg">{result.value}</div>
            <div className="text-xs text-green-600">{result.metric}</div>
          </div>
        ))}
      </div>
    </CardHeader>

    <CardContent className="space-y-6">
      <div>
        <h4 className="font-semibold mb-2 text-red-700">Challenge</h4>
        <p className="text-muted-foreground text-sm">{challenge}</p>
      </div>

      <div>
        <h4 className="font-semibold mb-2 text-blue-700">Brikly Solution</h4>
        <p className="text-muted-foreground text-sm">{solution}</p>
      </div>

      <div className="bg-primary/5 p-4 rounded-lg">
        <blockquote className="text-sm italic mb-3">"{quote}"</blockquote>
        <div className="text-sm">
          <div className="font-medium">{author}</div>
          <div className="text-muted-foreground">{title}, {company}</div>
          {/* 16 C.F.R. 255.5 - material connections are disclosed with the
              endorsement, not in a footnote. */}
          {materialConnection && (
            <Badge variant="secondary" className="mt-2 text-xs font-normal">
              {materialConnection}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <h5 className="font-medium mb-1">Implementation Time</h5>
          <p className="text-muted-foreground">{timeframe}</p>
        </div>
        <div>
          <h5 className="font-medium mb-1">Project Types</h5>
          <p className="text-muted-foreground">{projectTypes.join(', ')}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export const CaseStudiesSection: React.FC = () => {
  const caseStudies = renderableCaseStudies();

  // Nothing substantiated to publish. Render nothing rather than inventing
  // customers or averaging figures that have no underlying data.
  if (caseStudies.length === 0) return null;

  return (
    <section id="case-studies" className="py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Customer case studies</h2>
        </div>

        <div className="grid lg:grid-cols-1 gap-8 mb-12">
          {caseStudies.map((study) => (
            <CaseStudyCard key={study.company} {...study} />
          ))}
        </div>

        <div className="text-center">
          <Button asChild size="lg">
            <Link to="/auth">
              Start a free trial <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};
