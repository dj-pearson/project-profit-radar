import { Link, Navigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import BreadcrumbsNavigation from "@/components/BreadcrumbsNavigation";
import {
  BLOG_INDEX_PATH,
  CURATED_GUIDES,
  categoryPath,
  getCategory,
  inCategory,
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
 * /resources/category/:category and .../page/:page (US-384). Categories are
 * defined in src/components/blog/blogCategories.json; the sitemap lists one
 * URL per entry there.
 */
const ResourcesCategory = () => {
  const { category: slug, page: pageParam } = useParams<{ category: string; page?: string }>();
  const category = getCategory(slug);
  const requested = parsePageParam(pageParam);
  const { data: posts = [], isLoading, isError } = useBlogListingPosts();

  if (category && pageParam === "1") return <Navigate to={categoryPath(category.slug)} replace />;

  if (!category) {
    return (
      <div className="min-h-screen bg-background">
        <SEOMetaTags title="Topic not found | Brikly" description="This resource topic does not exist." noIndex />
        <Header />
        <main className="container mx-auto px-4 py-16">
          <h1 className="text-3xl font-bold mb-4">Topic not found</h1>
          <p className="text-muted-foreground mb-8">
            There is no resource topic called "{slug}". Pick one of these instead.
          </p>
          <BlogCategoryNav />
        </main>
        <Footer />
      </div>
    );
  }

  const basePath = categoryPath(category.slug);
  const page = requested ?? 1;
  const slice = paginate(inCategory(posts, category.slug), page);
  const guides = page === 1 ? inCategory(CURATED_GUIDES, category.slug) : [];
  const notFound = requested === null || (!isLoading && slice.outOfRange && page > 1);
  const pageSuffix = page === 1 ? "" : ` - Page ${page}`;

  return (
    <div className="min-h-screen bg-background">
      <SEOMetaTags
        title={`${category.name} Articles for Contractors${pageSuffix} | Brikly`}
        description={category.description}
        canonicalUrl={listingPath(basePath, page)}
        noIndex={notFound}
      />
      <RssAlternateLink />
      <Header />

      <main className="container mx-auto px-4 py-8">
        <BreadcrumbsNavigation />

        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            {category.name}
            {page > 1 && <span className="text-muted-foreground font-normal text-2xl"> - page {page}</span>}
          </h1>
          <p className="text-lg text-muted-foreground max-w-[70ch]">{category.description}</p>
        </div>

        <BlogCategoryNav current={category.slug} />

        {guides.length > 0 && (
          <section className="mb-16" aria-labelledby="category-guides">
            <h2 id="category-guides" className="text-2xl font-semibold mb-8">Guides</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {guides.map((guide) => (
                <CuratedGuideCard key={guide.slug} guide={guide} />
              ))}
            </div>
          </section>
        )}

        <section className="mb-16" aria-labelledby="category-articles">
          <h2 id="category-articles" className="text-2xl font-semibold mb-8">Articles</h2>
          {isLoading ? (
            <ArticleGridSkeleton />
          ) : notFound ? (
            <p className="text-muted-foreground">
              There is no page {pageParam} in {category.name}.{" "}
              <Link to={basePath} className="underline">Back to the first page</Link>.
            </p>
          ) : isError ? (
            <p className="text-muted-foreground">Articles could not be loaded right now.</p>
          ) : slice.items.length === 0 ? (
            <p className="text-muted-foreground">
              No articles in this topic yet. <Link to={BLOG_INDEX_PATH} className="underline">See all articles</Link>.
            </p>
          ) : (
            <>
              <ArticleGrid posts={slice.items} />
              <BlogPagination basePath={basePath} page={page} totalPages={slice.totalPages} />
            </>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ResourcesCategory;
