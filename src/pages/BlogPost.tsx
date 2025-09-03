import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Calendar, Clock, ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SEOMetaTags } from "@/components/SEOMetaTags";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InternalLinking from "@/components/InternalLinking";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  featured_image_url: string | null;
  published_at: string | null;
  created_at: string;
  seo_title: string | null;
  seo_description: string | null;
}

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const loadPost = async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('slug', slug)
          .eq('status', 'published')
          .single();

        if (error || !data) {
          console.error('Error loading blog post:', error);
          setNotFound(true);
        } else {
          setPost(data);
        }
      } catch (error) {
        console.error('Error loading blog post:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [slug]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getReadingTime = (content: string) => {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / wordsPerMinute);
    return `${readingTime} min read`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-construction-light via-white to-construction-light/30">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mb-8"></div>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-construction-light via-white to-construction-light/30">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl font-bold text-construction-dark mb-4">Article Not Found</h1>
            <p className="text-muted-foreground mb-8">
              The article you're looking for doesn't exist or has been removed.
            </p>
            <Link to="/resources">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Resources
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Create structured data for the blog post
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.seo_description || post.excerpt || post.title,
    "author": {
      "@type": "Organization",
      "name": "BuildDesk",
      "url": "https://build-desk.com"
    },
    "publisher": {
      "@type": "Organization",
      "name": "BuildDesk",
      "logo": {
        "@type": "ImageObject",
        "url": "https://build-desk.com/BuildDeskLogo.png"
      }
    },
    "datePublished": post.published_at || post.created_at,
    "dateModified": post.updated_at || post.created_at,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://build-desk.com/resources/${post.slug}`
    },
    "image": post.featured_image_url || "https://build-desk.com/BuildDeskLogo.png",
    "articleSection": "Construction Management",
    "keywords": "construction management, construction software, project management, contractors"
  };

  return (
    <>
      <SEOMetaTags
        title={post.seo_title || post.title}
        description={post.seo_description || post.excerpt || undefined}
        keywords={['construction management', 'construction software', 'project management', 'contractors']}
        ogTitle={post.seo_title || post.title}
        ogDescription={post.seo_description || post.excerpt || undefined}
        ogImage={post.featured_image_url || undefined}
        canonicalUrl={`/resources/${post.slug}`}
        structuredData={structuredData}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-construction-light via-white to-construction-light/30">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <div className="mb-8">
              <Link to="/resources">
                <Button variant="ghost" className="pl-0">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Resources
                </Button>
              </Link>
            </div>

            {/* Featured Image */}
            {post.featured_image_url && (
              <div className="mb-8 rounded-lg overflow-hidden">
                <img 
                  src={post.featured_image_url} 
                  alt={post.title}
                  className="w-full h-64 md:h-96 object-cover"
                />
              </div>
            )}

            {/* Article Header */}
            <header className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-construction-dark mb-4">
                {post.title}
              </h1>
              <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(post.published_at || post.created_at)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>{getReadingTime(post.body)}</span>
                </div>
              </div>
            </header>

            {/* Article Content */}
            <article className="prose prose-lg max-w-none prose-headings:text-construction-dark prose-a:text-construction-blue hover:prose-a:text-construction-orange prose-strong:text-construction-dark">
              <ReactMarkdown
                components={{
                  h1: () => null, // Skip h1 elements from markdown content
                  h2: ({ children }) => <h2 className="text-2xl font-semibold text-construction-dark mb-3 mt-6">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-xl font-semibold text-construction-dark mb-2 mt-4">{children}</h3>,
                  h4: ({ children }) => <h4 className="text-lg font-semibold text-construction-dark mb-2 mt-3">{children}</h4>,
                  p: ({ children }) => <p className="mb-4 text-gray-700 leading-relaxed">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold text-construction-dark">{children}</strong>,
                  a: ({ href, children }) => (
                    <a 
                      href={href} 
                      className="text-construction-blue hover:text-construction-orange transition-colors underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {children}
                    </a>
                  ),
                  ul: ({ children }) => <ul className="mb-4 space-y-2 list-disc list-inside">{children}</ul>,
                  ol: ({ children }) => <ol className="mb-4 space-y-2 list-decimal list-inside">{children}</ol>,
                  li: ({ children }) => <li className="text-gray-700 ml-4">{children}</li>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-construction-blue pl-4 py-2 my-4 bg-construction-light/30 rounded-r-md">
                      {children}
                    </blockquote>
                  ),
                }}
              >
                {post.body}
              </ReactMarkdown>
            </article>

            {/* Call to Action */}
            <div className="mt-12 p-6 bg-construction-light/50 rounded-lg border border-construction-blue/20">
              <h3 className="text-xl font-semibold text-construction-dark mb-3">
                Ready to Transform Your Construction Business?
              </h3>
              <p className="text-muted-foreground mb-4">
                Discover how BuildDesk can streamline your operations, improve profitability, and keep your projects on track.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/auth">
                  <Button className="bg-construction-blue hover:bg-construction-blue/90">
                    Start Free Trial
                  </Button>
                </Link>
                <Link to="/roi-calculator">
                  <Button variant="outline">
                    Calculate Your ROI
                  </Button>
                </Link>
              </div>
            </div>

            {/* Internal Linking for SEO */}
            <InternalLinking 
              currentPage={`/resources/${post.slug}`}
              context="construction"
            />

            {/* Related Articles Section */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <h3 className="text-xl font-semibold text-construction-dark mb-4">
                Continue Reading
              </h3>
              <Link to="/resources">
                <Button variant="outline" className="mb-4">
                  View All Articles
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
};

export default BlogPost;