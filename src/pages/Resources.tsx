import { Navigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import { QuickAnswerSnippet, LastUpdated } from "@/components/seo/QuickAnswerSnippet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import BreadcrumbsNavigation from "@/components/BreadcrumbsNavigation";
import {
  BLOG_INDEX_PATH,
  CURATED_SECTIONS,
  listingPath,
  paginate,
  parsePageParam,
} from "@/components/blog/blogListing";
import {
  ArticleGrid,
  ArticleGridSkeleton,
  BlogCategoryNav,
  BlogPagination,
  CuratedGuideCard,
  RssAlternateLink,
} from "@/components/blog/BlogListing";
import { useBlogListingPosts } from "@/components/blog/useBlogListingPosts";

/**
 * /resources and /resources/page/:page (US-384). Page 1 carries the hubs and
 * the hand-written guides; every page carries one slice of the published
 * posts, with crawlable rel=prev/next links between pages.
 */
const Resources = () => {
  const { page: pageParam } = useParams<{ page?: string }>();
  const requested = parsePageParam(pageParam);
  const { data: posts = [], isLoading, isError } = useBlogListingPosts();

  if (pageParam === "1") return <Navigate to={BLOG_INDEX_PATH} replace />;

  const page = requested ?? 1;
  const slice = paginate(posts, page);
  const notFound = requested === null || (!isLoading && slice.outOfRange);
  const isFirstPage = page === 1;
  const pageSuffix = isFirstPage ? "" : ` - Page ${page}`;

  return (
    <div className="min-h-screen bg-background">
      <SEOMetaTags
        title={`Construction Management Resources & Guides${pageSuffix} | Brikly`}
        description="Free construction management guides, software comparisons, and best practices for small contractors. Job costing, OSHA compliance, scheduling tips, and more."
        keywords={[
          'construction management resources',
          'construction management guides',
          'job costing guide',
          'OSHA compliance construction',
          'construction scheduling tips',
          'procore alternative comparison',
          'buildertrend alternative',
          'construction software guide'
        ]}
        canonicalUrl={listingPath(BLOG_INDEX_PATH, page)}
        noIndex={notFound}
      />
      <RssAlternateLink />

      <Header />

      <main className="container mx-auto px-4 py-8">
        <BreadcrumbsNavigation />

        {isFirstPage ? (
          <>
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold tracking-tight mb-4">
                Construction Management Resources
              </h1>
              <LastUpdated date="September 2025" />
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-6">
                Free guides, comparisons, and best practices to help small contractors
                improve project outcomes, reduce costs, and stay compliant.
              </p>
            </div>

            <QuickAnswerSnippet
              question="Where can I find construction management guides and resources?"
              answer="Brikly offers free construction management guides covering job costing, OSHA compliance, scheduling, software comparisons (Procore vs Brikly, Buildertrend alternatives), and best practices specifically for small contractors."
            />

            {/* Topic Hubs Section */}
            <section className="mb-16">
              <h2 className="text-2xl font-semibold mb-8">Topic Hubs</h2>
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <Card className="border-primary">
                  <CardHeader>
                    <Badge className="w-fit mb-2">Hub</Badge>
                    <CardTitle className="text-lg">
                      <Link 
                        to="/topics/construction-management-basics"
                        className="hover:text-primary transition-colors"
                      >
                        Construction Management Basics
                      </Link>
                    </CardTitle>
                    <CardDescription>
                      Master the fundamentals: project planning, cost control, team management, and execution
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild variant="outline" className="w-full">
                      <Link to="/topics/construction-management-basics">
                        Explore Hub <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-orange-200">
                  <CardHeader>
                    <Badge className="w-fit mb-2">Hub</Badge>
                    <CardTitle className="text-lg">
                      <Link 
                        to="/topics/safety-and-osha-compliance"
                        className="hover:text-primary transition-colors"
                      >
                        Safety & OSHA Compliance
                      </Link>
                    </CardTitle>
                    <CardDescription>
                      Keep your team safe and avoid OSHA violations with digital tools and best practices
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild variant="outline" className="w-full">
                      <Link to="/topics/safety-and-osha-compliance">
                        Explore Hub <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </section>
          </>
        ) : (
          <h1 className="text-3xl font-bold tracking-tight mb-8">
            Construction Management Articles <span className="text-muted-foreground font-normal">- page {page}</span>
          </h1>
        )}

        <BlogCategoryNav />

        <section className="mb-16" aria-labelledby="latest-articles">
          <div className="flex items-center justify-between mb-8">
            <h2 id="latest-articles" className="text-2xl font-semibold">
              {isFirstPage ? "Latest Articles" : "Articles"}
            </h2>
            {slice.totalItems > 0 && (
              <Badge variant="outline" className="text-sm">
                {slice.totalItems} article{slice.totalItems !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          {isLoading ? (
            <ArticleGridSkeleton />
          ) : notFound ? (
            <p className="text-muted-foreground">
              There is no page {pageParam} of articles. <Link to={BLOG_INDEX_PATH} className="underline">Back to the latest articles</Link>.
            </p>
          ) : isError ? (
            <p className="text-muted-foreground">Articles could not be loaded right now. The guides below are still available.</p>
          ) : slice.items.length === 0 ? (
            <p className="text-muted-foreground">No articles published yet.</p>
          ) : (
            <>
              <ArticleGrid posts={slice.items} />
              <BlogPagination basePath={BLOG_INDEX_PATH} page={page} totalPages={slice.totalPages} />
            </>
          )}
        </section>

        {isFirstPage &&
          CURATED_SECTIONS.map((section) => (
            <section key={section.title} className="mb-16">
              <h2 className="text-2xl font-semibold mb-8">{section.title}</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {section.guides.map((guide) => (
                  <CuratedGuideCard key={guide.slug} guide={guide} />
                ))}
              </div>
            </section>
          ))}

        {/* CTA Section */}
        <div className="bg-primary/5 rounded-lg p-8 text-center mt-16">
          <h2 className="text-2xl font-semibold mb-4">
            Ready to Improve Your Project Management?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            See how Brikly helps small contractors reduce delays, improve margins, 
            and stay compliant with simple, powerful project management tools.
          </p>
          <Button asChild size="lg">
            <Link to="/auth">Start Free Trial</Link>
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Resources;
