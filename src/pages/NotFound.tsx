import { Link, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useEffect } from "react";

/**
 * The catch-all page.
 *
 * A single-page app answers every URL with HTTP 200, so without the robots tag
 * below a mistyped link, a retired page or a stale sitemap entry gets crawled,
 * found to contain "Page not found", and indexed as a thin page. Google counts
 * that against the whole site, not just the URL. The tag is the only signal a
 * crawler gets here, which is why this page exists rather than the inline div
 * that used to sit in src/routes/index.tsx.
 */
const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <Helmet>
        <title>Page not found | Brikly</title>
        <meta name="robots" content="noindex, follow" />
        <meta name="googlebot" content="noindex, follow" />
      </Helmet>
      <div className="text-center max-w-md">
        <p className="text-sm font-medium text-muted-foreground mb-3">404</p>
        <h1 className="text-3xl font-semibold mb-3">This page doesn't exist</h1>
        <p className="text-muted-foreground mb-8">
          The link may be out of date, or the page may have moved.
        </p>
        <div className="flex items-center justify-center gap-6 text-sm">
          <Link to="/" className="font-medium underline underline-offset-4">
            Go to the homepage
          </Link>
          <Link to="/resources" className="font-medium underline underline-offset-4">
            Browse resources
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
